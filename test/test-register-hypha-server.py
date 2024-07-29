import asyncio
from imjoy_rpc.hypha import connect_to_server
import sqlite3
import numpy as np
import clip
import torch
from PIL import Image
import faiss
import io
import traceback
import os
import base64

# Load the CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Connect to the SQLite database
def get_db_connection():
    conn = sqlite3.connect('image_vectors-hpa.db')
    return conn, conn.cursor()

# Load all vectors, their IDs, paths, and channels from the database
conn, c = get_db_connection()
c.execute('SELECT id, vector, image_path, fluorescent_channel FROM images')
rows = c.fetchall()
conn.close()

# Extract vectors, IDs, paths, and channels
image_ids = []
image_vectors = []
image_paths = {}
image_channels = {}

for row in rows:
    img_id, img_vector, img_path, img_channel = row
    img_vector = np.frombuffer(img_vector, dtype=np.float32)
    image_ids.append(img_id)
    image_vectors.append(img_vector)
    image_paths[img_id] = img_path
    image_channels[img_id] = img_channel

# Convert to numpy array
image_vectors = np.array(image_vectors)

# Check the dimension of the image vectors
d = image_vectors.shape[1]  # dimension
print(f"Dimension of image vectors: {d}")

# Build the FAISS index
index = faiss.IndexFlatL2(d)
index.add(image_vectors.astype(np.float32))

from PIL import Image
import io
import base64

def find_similar_images(input_image, top_k=5, context=None):
    conn, c = get_db_connection()
    try:
        # Convert input bytes to an image
        image = Image.open(io.BytesIO(input_image)).convert("RGB")

        # Process the image
        image_input = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            query_vector = model.encode_image(image_input).cpu().numpy().flatten()

        print(f"Query vector shape: {query_vector.shape}")

        # Perform the search
        query_vector = np.expand_dims(query_vector, axis=0).astype(np.float32)
        distances, indices = index.search(query_vector, len(image_ids))  # Search all images

        # Filter results based on the fluorescent channel (assuming we don't have this information for the query image)
        filtered_results = []
        for i, idx in enumerate(indices[0]):
            img_id = image_ids[idx]
            filtered_results.append((img_id, distances[0][i]))

        # Sort filtered results and get top_k
        filtered_results.sort(key=lambda x: x[1])
        top_results = filtered_results[:top_k]

        print(f"Found {len(top_results)} results")
        results = []
        for img_id, distance in top_results:
            sim = 1 - distance  # Convert distance to similarity
            print(f"ID: {img_id}, Score: {sim:.2f}")
            print(f"Image path: {image_paths[img_id]}")
            print(f"Fluorescent channel: {image_channels[img_id]}")
            print("---")
            
            # Open the image, resize it, and convert to base64
            with Image.open(image_paths[img_id]) as img:
                img.thumbnail((512, 512))  # Resize image to max 512x512 while maintaining ase
                # t ratio
                buffered = io.BytesIO()
                img.save(buffered, format="JPEG")
                img_str = base64.b64encode(buffered.getvalue()).decode()
            
            results.append({
                'image': img_str,
                'image_path': image_paths[img_id],
                'fluorescent_channel': image_channels[img_id],
                'similarity': float(sim)
            })
        return results
    except Exception as e:
        print(f"Error processing image: {e}")
        traceback.print_exc()
        return []
    finally:
        conn.close()
        
async def start_hypha_service(server):
    await server.register_service(
        {
            "id": "image-embedding-similarity-search",
            "config":{
                "visibility": "public",
                "run_in_executor": True,
                "require_context": True,   
            },
            "type": "echo",
            "find_similar_images": find_similar_images,
        },
        overwrite=True
    )
 
async def setup():
    server_url = "https://ai.imjoy.io"
    server = await connect_to_server({"server_url": server_url})
    await start_hypha_service(server)
    print(f"Image embedding and similarity search service registered at workspace: {server.config.workspace}")
    print(f"Test it with the HTTP proxy: {server_url}/{server.config.workspace}/services/image-embedding-similarity-search")
 
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(setup())
    loop.run_forever()