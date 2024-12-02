# save as rebuild_db_512.py
import clip
import torch
import sqlite3
import os
from PIL import Image
import numpy as np

# Load the CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)  # Use ViT-B/32 for 512-dim vectors

def rebuild_cell_database():
    conn = sqlite3.connect('cell_vectors_db.db')
    c = conn.cursor()
    
    # Create table if it doesn't exist
    c.execute('''
        CREATE TABLE IF NOT EXISTS cell_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            vector BLOB NOT NULL,
            annotation TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    try:
        # Get existing records
        c.execute('SELECT id, file_name, annotation FROM cell_images')
        rows = c.fetchall()
        print(f"Found {len(rows)} existing records")
        
        # Create new table
        c.execute('DROP TABLE IF EXISTS cell_images_new')
        c.execute('''
            CREATE TABLE cell_images_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                vector BLOB NOT NULL,
                annotation TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Process each record
        for row in rows:
            cell_id, file_name, annotation = row
            file_path = os.path.join('cell_vectors_db', file_name)
            
            if os.path.exists(file_path):
                print(f"Processing {file_path}")
                # Regenerate vector with ViT-B/32 model
                with Image.open(file_path) as img:
                    image_input = preprocess(img.convert("RGB")).unsqueeze(0).to(device)
                    with torch.no_grad():
                        vector = model.encode_image(image_input).cpu().numpy().flatten()
                
                # Verify vector dimension
                if vector.shape[0] != 512:
                    print(f"Warning: Vector dimension is {vector.shape[0]}, expected 512")
                    continue
                
                c.execute(
                    'INSERT INTO cell_images_new (file_name, vector, annotation) VALUES (?, ?, ?)',
                    (file_name, vector.tobytes(), annotation)
                )
            else:
                print(f"Warning: File not found: {file_path}")
        
        # Replace old table with new one
        c.execute('DROP TABLE IF EXISTS cell_images')
        c.execute('ALTER TABLE cell_images_new RENAME TO cell_images')
        conn.commit()
        
        # Verify the rebuild
        c.execute('SELECT COUNT(*) FROM cell_images')
        final_count = c.fetchone()[0]
        print(f"Database rebuilt successfully with {final_count} records")
        
    except Exception as e:
        print(f"Error during rebuild: {e}")
        conn.rollback()
    finally:
        conn.close()

def verify_vectors():
    """Verify vector dimensions in the database"""
    conn = sqlite3.connect('cell_vectors_db.db')
    c = conn.cursor()
    
    c.execute('SELECT id, vector FROM cell_images')
    rows = c.fetchall()
    
    print(f"Verifying {len(rows)} vectors...")
    for row in rows:
        vector = np.frombuffer(row[1], dtype=np.float32)
        if vector.shape[0] != 512:
            print(f"Warning: Vector {row[0]} has dimension {vector.shape[0]}")
    
    conn.close()

if __name__ == "__main__":
    print("Starting database rebuild...")
    rebuild_cell_database()
    print("\nVerifying vector dimensions...")
    verify_vectors()
    print("Done!")