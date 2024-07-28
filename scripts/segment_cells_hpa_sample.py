import os
import numpy as np
import cv2
from segment_anything import SamPredictor, sam_model_registry
from skimage.measure import label, regionprops
from skimage.transform import resize

model_type = "vit_h"
model_path = "models/sam_vit_h_4b8939.pth"
sam = sam_model_registry[model_type](checkpoint=model_path)
sam.to(device='cuda')

def load_and_preprocess(file_path):
    img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
    img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
    return img

def merge_channels(images):
    return np.stack(images, axis=-1)

def segment_cells(predictor, image):
    image_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    predictor.set_image(image_rgb)
    masks, _, _ = predictor.predict(point_coords=None, point_labels=None, multimask_output=True)
    return masks

def crop_and_resize(image, mask, size=(300, 300)):
    labeled_mask = label(mask)
    regions = regionprops(labeled_mask)
    
    if not regions:
        print(f"No regions found in mask. Mask sum: {np.sum(mask)}")
        return None

    props = regions[0]
    y1, x1, y2, x2 = props.bbox
    cropped = image[y1:y2, x1:x2]
    
    if cropped.shape[0] > size[0] or cropped.shape[1] > size[1]:
        cropped = resize(cropped, size, preserve_range=True).astype(np.uint8)
    else:
        new_img = np.zeros(size + (image.shape[2],), dtype=np.uint8)
        y_offset = (size[0] - cropped.shape[0]) // 2
        x_offset = (size[1] - cropped.shape[1]) // 2
        new_img[y_offset:y_offset+cropped.shape[0], x_offset:x_offset+cropped.shape[1]] = cropped
        cropped = new_img
    
    return cropped

def process_images(input_folder, output_folder):
    predictor = SamPredictor(sam)
    
    for filename in os.listdir(input_folder):
        if 'Fluorescence' in filename and any(channel in filename for channel in ['405', '488', '561']):
            base_name = filename.split('_Fluorescence')[0]
            view_id = '_'.join(filename.split('_')[:4])
            
            print(f"Processing {base_name}")
            
            img_405 = load_and_preprocess(os.path.join(input_folder, f"{base_name}_Fluorescence_405_nm_Ex.bmp"))
            img_488 = load_and_preprocess(os.path.join(input_folder, f"{base_name}_Fluorescence_488_nm_Ex.bmp"))
            img_561 = load_and_preprocess(os.path.join(input_folder, f"{base_name}_Fluorescence_561_nm_Ex.bmp"))
            
            merged_image = merge_channels([img_405, img_488, img_561])
            
            masks = segment_cells(predictor, img_561)
            
            print(f"Number of masks detected: {len(masks)}")
            
            for i, mask in enumerate(masks):
                cell_image = crop_and_resize(merged_image, mask)
                if cell_image is not None:
                    output_filename = f"{view_id}_{i:05d}.png"
                    output_path = os.path.join(output_folder, output_filename)
                    cv2.imwrite(output_path, cell_image)
                else:
                    print(f"Skipping mask {i} due to no valid regions")

input_folder = "/media/reef/harddisk/96wellplate_scan_2024-05-16_04-43-45.061595/0"
output_folder = "/media/reef/harddisk/single_cell_images"

os.makedirs(output_folder, exist_ok=True)

process_images(input_folder, output_folder)