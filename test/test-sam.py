import torch
from segment_anything import SamPredictor, sam_model_registry
import cv2
import matplotlib.pyplot as plt
from skimage import io
import numpy as np

# Load the SAM model
model_type = "vit_h"  # you can choose from vit_h, vit_l, vit_b
model_path = "models/sam_vit_h_4b8939.pth"
sam = sam_model_registry[model_type](checkpoint=model_path)
sam.to(device='cuda')

# Load the image
image_path = "test/image.png"
image = io.imread(image_path)

# Initialize the predictor
predictor = SamPredictor(sam)
predictor.set_image(image)

# Automatic point detection using blob detection
def detect_blobs(image):
    # Convert image to grayscale
    gray_image = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)

    # Set up the SimpleBlobDetector parameters.
    params = cv2.SimpleBlobDetector_Params()
    params.filterByArea = True
    params.minArea = 100
    params.filterByCircularity = False
    params.filterByConvexity = False
    params.filterByInertia = False

    # Create a detector with the parameters
    detector = cv2.SimpleBlobDetector_create(params)
    
    # Detect blobs
    keypoints = detector.detect(gray_image)
    
    # Convert keypoints to point coordinates
    point_coords = np.array([kp.pt for kp in keypoints])
    point_labels = np.ones(point_coords.shape[0], dtype=int)  # all points are foreground
    
    return point_coords, point_labels

# Detect points automatically
point_coords, point_labels = detect_blobs(image)

# Generate masks using the detected points
masks, _, _ = predictor.predict(
    point_coords=point_coords,
    point_labels=point_labels,
    multimask_output=True  # output multiple masks
)

# Visualize the results
for mask in masks:
    plt.imshow(image, cmap='gray')
    plt.imshow(mask, cmap='jet', alpha=0.5)

    plt.savefig("test/output.png")
    plt.close()
