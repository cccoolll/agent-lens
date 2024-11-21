import os
import sqlite3
import clip
import torch
from PIL import Image
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
import shutil
import argparse

# Description:
# This script processes images using OpenAI's CLIP model and stores the embeddings in a SQLite database.
# It supports datasets from both the Human Protein Atlas (HPA) and the 'squid' microscope(see squid microscope software github repo: https://github.com/hongquanli/octopi-research/).
#
# Args:
#   image_folder (str): Path to the folder containing images to process.
#   db_file (str): Path to the SQLite database file where vectors and metadata will be stored.
#   datatype (str): Type of dataset to process, either 'hpa' for Human Protein Atlas or 'squid' for the squid microscope.
#   max_workers (int): Number of worker threads for parallel processing.
#
# Returns:
#   None

# Initialize argument parser
parser = argparse.ArgumentParser(description="Process images and store embeddings in database with CLIP")
parser.add_argument('--image_folder', type=str, required=True, help='Path to folder containing images')
parser.add_argument('--db_file', type=str, default='image_vectors.db', help='Path to the SQLite database file')
parser.add_argument('--datatype', type=str, choices=['hpa', 'squid'], required=True, help="Dataset type: 'hpa' for Human Protein Atlas, 'squid' for squid microscope")
parser.add_argument('--max_workers', type=int, default=10, help='Number of threads for image processing')
args = parser.parse_args()

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Create a copy of the database and establish a connection
shutil.copy2(args.db_file, f"{args.db_file}-new.db")
conn = sqlite3.connect(f"{args.db_file}-new.db", check_same_thread=False)
c = conn.cursor()

# Modify the database schema
c.execute('''
    CREATE TABLE IF NOT EXISTS images (
        id TEXT,
        vector BLOB,
        image_path TEXT,
        fluorescent_channel TEXT,
        PRIMARY KEY (id, fluorescent_channel)
    )
''')
conn.commit()

def process_image(image_path, datatype):
    """Processes a single image to generate an embedding and extract metadata.

    Args:
        image_path (str): The path to the image to be processed.
        datatype (str): Type of dataset ('hpa' or 'squid') to determine metadata extraction.

    Returns:
        tuple or None: A tuple containing image ID, image vector, absolute path, and fluorescent
                       channel if successful; otherwise, None.
    """
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
    
    try:
        image = Image.open(image_path).convert("RGB")
        image_input = preprocess(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            image_features = model.encode_image(image_input).cpu().numpy().flatten()
        
        absolute_path = os.path.abspath(image_path)
        
        return (image_id, image_features, absolute_path, fluorescent_channel)
    except Exception as e:
        print(f"Failed to process {image_id}: {e}")
        return None

def store_images(image_folder, datatype, max_workers=10):
    """Processes and stores images from a folder in the database.

    Args:
        image_folder (str): The folder path containing images to be processed.
        datatype (str): The dataset type, either 'hpa' or 'squid'.
        max_workers (int): The number of worker threads for concurrent processing.
    """
    images = [os.path.join(dp, f) for dp, dn, filenames in os.walk(image_folder) for f in filenames if os.path.splitext(f)[1].lower() == '.bmp']
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_image = {executor.submit(process_image, image_path, datatype): image_path for image_path in images}
        
        for future in as_completed(future_to_image):
            result = future.result()
            if result:
                image_id, image_features, absolute_path, fluorescent_channel = result
                c.execute('''
                    INSERT OR REPLACE INTO images (id, vector, image_path, fluorescent_channel)
                    VALUES (?, ?, ?, ?)
                ''', (image_id, image_features.astype(np.float32).tobytes(), absolute_path, fluorescent_channel))
                conn.commit()
                print(f"Stored {image_id} with fluorescent channel: {fluorescent_channel}")

def verify_images():
    """Retrieves and prints stored image metadata for verification."""
    c.execute('SELECT id, vector, image_path, fluorescent_channel FROM images')
    rows = c.fetchall()
    for row in rows:
        img_id, img_vector, img_path, fluorescent_channel = row
        img_vector = np.frombuffer(img_vector, dtype=np.float32)
        print(f"Retrieved vector shape for {img_id}: {img_vector.shape}")
        print(f"Image path: {img_path}")
        print(f"Fluorescent channel: {fluorescent_channel}")
        print("---")

# Process and store images based on dataset type
store_images(args.image_folder, args.datatype, args.max_workers)

# Verify stored images
verify_images()

# Close the database connection
conn.close()
