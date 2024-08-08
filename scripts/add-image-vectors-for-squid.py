import os
import sqlite3
import clip
import torch
from PIL import Image
import numpy as np
import io
from concurrent.futures import ThreadPoolExecutor, as_completed
import shutil

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Create a copy of the database
shutil.copy2('image_vectors-hpa.db', 'image_vectors-hpa-new.db')
conn = sqlite3.connect('image_vectors-hpa-new.db', check_same_thread=False)
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

def process_image(image_path):
    filename = os.path.basename(image_path)
    print(f'Reading: {filename} ')
    parts = filename.split('_')
    if len(parts) >= 4 and 'focus_camera' not in filename:
        image_id = '_'.join(parts[:5])
        fluorescent_channel = parts[5]
    else:
        image_id = filename.split('.')[0]
        fluorescent_channel = 'unknown'
    
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

def store_images(image_folder, max_workers=10):
    images = [os.path.join(dp, f) for dp, dn, filenames in os.walk(image_folder) for f in filenames if os.path.splitext(f)[1].lower() == '.bmp']
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_image = {executor.submit(process_image, image_path): image_path for image_path in images}
        
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
    c.execute('SELECT id, vector, image_path, fluorescent_channel FROM images')
    rows = c.fetchall()
    for row in rows:
        img_id, img_vector, img_path, fluorescent_channel = row
        img_vector = np.frombuffer(img_vector, dtype=np.float32)
        print(f"Retrieved vector shape for {img_id}: {img_vector.shape}")
        print(f"Image path: {img_path}")
        print(f"Fluorescent channel: {fluorescent_channel}")
        print("---")

# The images are from the Human Protein Atlas dataset
store_images('/media/reef/harddisk/96wellplate_scan_2024-05-16_04-43-45.061595/0/')
verify_images()

# Close the database connection
conn.close()