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

#This code defines a service for performing image similarity searches using CLIP embeddings, FAISS indexing, and a Hypha server connection. 
# The key steps include loading vectors from an SQLite database, separating the vectors by fluorescent channel, building FAISS indices for each channel, and registering a Hypha service to handle similarity search requests. 

# Load the CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)

# Connect to the SQLite database
def get_db_connection():
    conn = sqlite3.connect('image_vectors-hpa.db')
    return conn, conn.cursor()

def load_vectors_from_db(channel=None):
    conn, c = get_db_connection()
    query = 'SELECT id, vector, image_path, fluorescent_channel FROM images'
    if channel:
        query += f" WHERE fluorescent_channel = '{channel}'"
    c.execute(query)
    rows = c.fetchall()
    conn.close()

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

    return image_ids, np.array(image_vectors), image_paths, image_channels

def build_faiss_index(vectors):
    d = vectors.shape[1]  # dimension
    index = faiss.IndexFlatL2(d)
    index.add(vectors.astype(np.float32))
    return index


# Load vectors and build FAISS index based on the channel
image_ids, image_vectors, image_paths, image_channels = load_vectors_from_db()
print(f"types: {type(image_ids)}, {type(image_vectors)}, {type(image_paths)}, {type(image_channels)}")

index = build_faiss_index(image_vectors)

"""
Precompute separate FAISS indices for each channel at the time of building the indices.
Use the appropriate index based on the channel extracted from the input image name.
"""

def separate_indices_by_channel(image_vectors, image_channels):
    indices = {}
    image_channel_info= image_channels.values()
    #channel_vectors =
    for channel in set(image_channel_info):
        channel_vectors = [image_vectors[i] for i, c in enumerate(image_channel_info) if c == channel]
        indices[channel] = build_faiss_index(np.array(channel_vectors))
        print(f"Built index for channel: {channel},the legnth of channel_vectors is {len(channel_vectors)}")
    return indices

channel_indices = separate_indices_by_channel(image_vectors, image_channels)

def find_similar_images(input_image,image_data, top_k=5, index=index):
    input_image_name=image_data['name']
    try:
        channel = None
        if '-' in input_image_name:
            'image-green.png'
            ['image','green.png']
            'green.png'
            ['green', 'png']
            'green'
             
            channel = input_image_name.split('-')[1].split('.')[0]

        # Convert input bytes to an image
        image = Image.open(io.BytesIO(input_image)).convert("RGB")

        # Process the image
        image_input = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            query_vector = model.encode_image(image_input).cpu().numpy().flatten()

        print(f"Query vector shape: {query_vector.shape}")
        
        query_vector = np.expand_dims(query_vector, axis=0).astype(np.float32)

        if channel:
            distance, indices = channel_indices[channel].search(query_vector, len(image_ids))
        else:
            distances, indices = index.search(query_vector, len(image_ids))  # Search all images

        # Collect and sort results
        results = []
        for i, idx in enumerate(indices[0]):
            img_id = image_ids[idx]
            distance = distances[0][i]
            sim = 1 - distance  # Convert distance to similarity
            print(f"ID: {img_id}, Score: {sim:.2f}")
            print(f"Image path: {image_paths[img_id]}")
            print(f"Fluorescent channel: {image_channels[img_id]}")
            print("---")
            
            # Open the image, resize it, and convert to base64
            with Image.open(image_paths[img_id]) as img:
                img.thumbnail((512, 512))  # Resize image to max 512x512 while maintaining aspect ratio
                buffered = io.BytesIO()
                img.save(buffered, format="JPEG")
                img_str = base64.b64encode(buffered.getvalue()).decode()
            
            results.append({
                'image': img_str,
                'image_path': image_paths[img_id],
                'fluorescent_channel': image_channels[img_id],
                'similarity': float(sim)
            })
            if len(results) >= top_k:
                break
        
        return results
    except Exception as e:
        print(f"Error processing image: {e}")
        traceback.print_exc()
        return []

async def start_hypha_service(server):
    await server.register_service(
        {
            "id": "image-embedding-similarity-search",
            "config":{
                "visibility": "public",
                "run_in_executor": True,
                "require_context": False,   
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
