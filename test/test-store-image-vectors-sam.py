import os
import sqlite3
import clip
import torch
from PIL import Image
import numpy as np
import io
import cv2
from segment_anything import SamPredictor, sam_model_registry
import matplotlib.pyplot as plt

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Load the SAM model
model_type = "vit_h"
model_path = "models/sam_vit_h_4b8939.pth"
sam = sam_model_registry[model_type](checkpoint=model_path)
sam.to(device=device)

# Set up the database
conn = sqlite3.connect('image_vectors-sam.db')
c = conn.cursor()
c.execute('''
    CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        vector BLOB,
        image BLOB
    )
''')
conn.commit()

def detect_blobs(image):
    gray_image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    params = cv2.SimpleBlobDetector_Params()
    params.filterByArea = True
    params.minArea = 100
    params.filterByCircularity = False
    params.filterByConvexity = False
    params.filterByInertia = False
    detector = cv2.SimpleBlobDetector_create(params)
    keypoints = detector.detect(gray_image)
    point_coords = np.array([kp.pt for kp in keypoints])
    point_labels = np.ones(point_coords.shape[0], dtype=int)
    return point_coords, point_labels

def segment_image(image):
    predictor = SamPredictor(sam)
    predictor.set_image(image)
    point_coords, point_labels = detect_blobs(image)
    masks, _, _ = predictor.predict(
        point_coords=point_coords,
        point_labels=point_labels,
        multimask_output=True
    )
    # Use the first mask
    mask = masks[0]
    # Apply the mask to the image
    segmented_image = image.copy()
    segmented_image[~mask] = 0  # Set background to black
    return Image.fromarray(segmented_image)

def store_images(image_folder):
    images = [os.path.join(dp, f) for dp, dn, filenames in os.walk(image_folder) for f in filenames if os.path.splitext(f)[1].lower() in ['.png', '.jpg', '.jpeg']]
    for image_path in images:
        image_id = os.path.basename(image_path)
        try:
            # Load and segment the image
            original_image = np.array(Image.open(image_path).convert("RGB"))
            segmented_image = segment_image(original_image)
            
            # Preprocess and embed the segmented image
            image_input = preprocess(segmented_image).unsqueeze(0).to(device)
            
            with torch.no_grad():
                image_features = model.encode_image(image_input).cpu().numpy().flatten()
                print(f"Image features shape: {image_features.shape}")
            
            # Convert segmented image to bytes
            image_bytes = io.BytesIO()
            segmented_image.save(image_bytes, format='PNG')
            image_bytes = image_bytes.getvalue()
            
            c.execute('''
                INSERT OR REPLACE INTO images (id, vector, image)
                VALUES (?, ?, ?)
            ''', (image_id, image_features.astype(np.float32).tobytes(), image_bytes))
            conn.commit()
            print(f"Stored {image_id}")
        except Exception as e:
            print(f"Failed to process {image_id}: {e}")

def verify_images():
    c.execute('SELECT id, vector, image FROM images')
    rows = c.fetchall()
    for row in rows:
        img_id, img_vector, img_blob = row
        img_vector = np.frombuffer(img_vector, dtype=np.float32)
        print(f"Retrieved vector shape for {img_id}: {img_vector.shape}")

# The images are from the Stanford Dogs Dataset
store_images('Images')
verify_images()

# Close the database connection
conn.close()