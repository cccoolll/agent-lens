import asyncio
import numpy as np
from datetime import datetime
import pyvips
import uuid
import io
import base64
import torch
import clip
from PIL import Image
from src.backend.utils import make_service
from src.backend.artifact_manager import ArtifactManager


async def tile_image(artifact_manager):
    input_image = "src/frontend/img/example_image.png"

    vips_image = pyvips.Image.new_from_file(input_image)
    
    dz_buffer = vips_image.dzsave_buffer(layout="google")
    artifact_manager.upload_file("example_image.dzi", dz_buffer)


async def create_collection(artifact_manager):
    """Creates a vector collection in the artifact manager for storing image embeddings.
    
    Args:
        artifact_manager (ArtifactManager): The artifact manager instance.
    """
    await artifact_manager.create_vector_collection(
        name="cell-images",
        manifest={
            "name": "Cell images",
            "description": "Collection of cell images",
        },
        config={
            "vector_fields": [
                {
                    "type": "VECTOR",
                    "name": "image_features",
                    "algorithm": "FLAT",
                    "attributes": {
                        "TYPE": "FLOAT32",
                        "DIM": 512,
                        "DISTANCE_METRIC": "COSINE",
                    },
                },
                {"type": "STRING", "name": "image_id"},
                {"type": "TAG", "name": "annotation"},
                {"type": "STRING", "name": "timestamp"},
                {"type": "STRING", "name": "thumbnail"},
            ],
            "embedding_models": {
                "vector": "fastembed:BAAI/bge-small-en-v1.5",
            },
        },
        overwrite=True
    )


def get_image_tensor(image_path, preprocess, device):
    image = Image.open(image_path).convert("RGB")
    return preprocess(image).unsqueeze(0).to(device)


def process_image_tensor(image_tensor, model):
    with torch.no_grad():
        image_features = model.encode_image(image_tensor).cpu().numpy().flatten()
        
    return image_features


def image_to_vector(input_image, model, preprocess, device, length=512):
    image_tensor = get_image_tensor(input_image, preprocess, device)
    query_vector = process_image_tensor(image_tensor, model).reshape(1, length).astype(np.float32)
    
    return query_vector

def make_thumbnail(image, size=(256, 256)):
    image.thumbnail(size)
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str

def get_partial_methods(server):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = clip.load("ViT-B/32", device=device)
    artifact_manager = ArtifactManager()
    artifact_manager.server = server
    
    def partial_find_similar_cells(cell_image, user_id, top_k=5):
        query_vector = image_to_vector(cell_image, model, preprocess, device)
        artifact_manager.user_id = user_id
        return artifact_manager.search_vectors("cell-images", query_vector, top_k)
    
    def partial_save_cell_image(cell_image, user_id, annotation=""):
        image_vector = image_to_vector(cell_image, model, preprocess, device)
        artifact_manager.user_id = user_id
        artifact_manager.add_vectors("cell-images", {
            "vector": image_vector,
            "annotation": annotation,
            "thumbnail": make_thumbnail(cell_image),
        })
    
    return partial_find_similar_cells, partial_save_cell_image


async def setup_service(server=None):
    partial_find_similar_cells, partial_save_cell_image = get_partial_methods(server)
    
    await make_service(
        service={
            "id": "image-embedding-similarity-search",
            "config":{
                "visibility": "public",
                "run_in_executor": True,
                "require_context": False,   
            },
            "type": "echo",
            "find_similar_cells": partial_find_similar_cells,
            "save_cell_image": partial_save_cell_image,
            "setup": create_collection,
            "tile_image": tile_image,
        },
        server=server
    )


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(setup_service())
    loop.run_forever()
