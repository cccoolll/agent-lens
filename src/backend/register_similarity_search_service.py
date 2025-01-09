import asyncio
import numpy as np
import traceback
from datetime import datetime
import uuid
import io
import base64
from src.backend.utils import make_service, process_image_tensor, get_image_tensor, open_image
from src.backend import rebuild_cell_db_512


#This code defines a service for performing image similarity searches using CLIP embeddings, FAISS indexing, and a Hypha server connection. 
# The key steps include loading vectors from an SQLite database, separating the vectors by fluorescent channel, building FAISS indices for each channel, and registering a Hypha service to handle similarity search requests. 

def make_thumbnail(image, size=(256, 256)):
    image.thumbnail(size)
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str

async def find_similar_cells(artifact_manager, input_cell_image, top_k=5):
    try:
        image_tensor = get_image_tensor(input_cell_image)
        query_vector = process_image_tensor(image_tensor).reshape(1, -1).astype(np.float32)
        similar_vectors = artifact_manager.search_vectors("cell-images", query_vector, top_k)

        results = [
            {
                "annotation": vector["annotation"],
                "similarity": 0.5, # TODO: Calculate similarity
                "image": make_thumbnail(open_image(artifact_manager.get_file("cell-images", vector["image_id"]))),
            }
            for vector in similar_vectors
        ]
        
        return results

    except Exception as e:
        print(f"Error in find_similar_cells: {e}")
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

def save_cell_image(cell_image, artifact_manager, annotation=""):
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"cell_{timestamp}_{unique_id}.png"
        image_input = get_image_tensor(cell_image)
        image_vector = process_image_tensor(image_input)
        
        vector_to_add = {
            "image_id": filename,
            "vector": image_vector.astype(np.float32).tolist(),
            "annotation": annotation,
            "timestamp": timestamp,
        }
        artifact_manager.add_vectors("cell-images", vector_to_add)
        artifact_manager.add_file("cell-images", filename, cell_image)

        return {"status": "success", "filename": filename}

    except Exception as e:
        print(f"Error saving cell image: {e}")
        traceback.print_exc()
        return {"status": "error", "message": str(e)}
    
async def setup_service(server=None):
    await make_service(
        service={
            "id": "image-embedding-similarity-search",
            "config":{
                "visibility": "public",
                "run_in_executor": True,
                "require_context": False,   
            },
            "type": "echo",
            "find_similar_cells": find_similar_cells,
            "save_cell_image": save_cell_image,
            "setup": rebuild_cell_db_512.run,
        },
        server=server
    )
 
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(setup_service())
    loop.run_forever()
