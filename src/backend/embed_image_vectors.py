import os
import clip
import torch
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse
from PIL import Image
from src.backend.artifact_manager import ArtifactManager
from src.backend.utils import process_image_tensor, create_collection, get_bmp_paths, get_image_tensor, open_image

# Description:
# This script processes images using OpenAI's CLIP model and stores the embeddings in a SQLite database.
# It supports datasets from both the Human Protein Atlas (HPA) and the 'squid' microscope(see squid microscope software github repo: https://github.com/hongquanli/octopi-research/).
#
# Args:
#   image_folder (str): Path to the folder containing images to process.
#   datatype (str): Type of dataset to process, either 'hpa' for Human Protein Atlas or 'squid' for the squid microscope.
#   max_workers (int): Number of worker threads for parallel processing.
#
# Returns:
#   None

def get_id_fluorescent_channel(image_path, datatype):
    filename = os.path.basename(image_path)
    print(f'Reading: {filename}')
    parts = filename.split('_')

    if datatype == 'hpa':
        if len(parts) >= 4 and 'focus_camera' not in filename:
            image_id = '_'.join(parts[:5])
            fluorescent_channel = parts[5]
        else:
            image_id = filename.split('.')[0]
            fluorescent_channel = 'unknown'
    elif datatype == 'squid':
        # Adjust extraction logic for squid dataset as needed, using parts of the filename.
        image_id = filename.split('.')[0]
        fluorescent_channel = parts[1] if len(parts) > 1 else 'unknown'
    else:
        raise ValueError(f"Invalid datatype: {datatype}")
    
    return image_id, fluorescent_channel

def process_image(image_path, datatype):
    try:
        image = open_image(image_path)
        image_tensor = get_image_tensor(image_path)
        image_features = process_image_tensor(image_tensor)
        image_id, fluorescent_channel = get_id_fluorescent_channel(image_path, datatype)
        
        return (image_id, image, image_features, fluorescent_channel)
    except Exception as e:
        print(f"Failed to process {image_id}: {e}")
        return None

async def store_image(artifact_manager, image_id, image, image_features, fluorescent_channel):
    await artifact_manager.add_vectors("images", {
        "image_id": image_id,
        "vector": image_features.astype(np.float32).tolist(),
        "fluorescent_channel": fluorescent_channel
    })
    await artifact_manager.add_file("images", image_id, image)

async def store_images(image_folder, datatype, artifact_manager, max_workers=10):
    """Processes and stores images from a folder in the database.

    Args:
        image_folder (str): The folder path containing images to be processed.
        datatype (str): The dataset type, either 'hpa' or 'squid'.
        max_workers (int): The number of worker threads for concurrent processing.
    """
    image_paths = get_bmp_paths(image_folder)
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_image = {executor.submit(process_image, image_path, datatype): image_path for image_path in image_paths}
        
        for future in as_completed(future_to_image):
            result = future.result()
            if result:
                image_id, image, image_features, fluorescent_channel = result
                await store_image(artifact_manager, image_id, image, image_features, fluorescent_channel)

def get_vector_fields():
    return [
        {
            "type": "VECTOR",
            "name": "vector",
            "algorithm": "FLAT",
            "attributes": {
                "TYPE": "FLOAT32",
                "DIM": 384, # TODO: Update DIM to match the model output dimension
                "DISTANCE_METRIC": "COSINE",
            },
        },
        {"type": "STRING", "name": "image_id"},
        {"type": "STRING", "name": "fluorescent_channel"},
    ]
    
async def run(artifact_manager, image_folder, datatype, max_workers):
    await create_collection(artifact_manager, "images", "Collection of image embeddings", get_vector_fields())
    await store_images(image_folder, datatype, artifact_manager, max_workers)
    
async def main():
    # Initialize argument parser
    parser = argparse.ArgumentParser(description="Process images and store embeddings in database with CLIP")
    parser.add_argument('--image_folder', type=str, required=True, help='Path to folder containing images')
    parser.add_argument('--datatype', type=str, choices=['hpa', 'squid'], required=True, help="Dataset type: 'hpa' for Human Protein Atlas, 'squid' for squid microscope")
    parser.add_argument('--max_workers', type=int, default=10, help='Number of threads for image processing')
    args = parser.parse_args()
    
    artifact_manager = ArtifactManager()
    await run(artifact_manager, args.image_folder, args.datatype, args.max_workers)
