from src.backend.utils import process_image_tensor, create_collection

def get_vector_fields():
    return [{
            "type": "VECTOR",
            "name": "image_features",
            "algorithm": "FLAT",
            "attributes": {
                "TYPE": "FLOAT32",
                "DIM": 512,
                "DISTANCE_METRIC": "COSINE",
            },
        },
        {
            "type": "VECTOR",
            "name": "image_tensor",
            "algorithm": "FLAT",
            "attributes": {
                "TYPE": "FLOAT32",
                "DIM": 512,
                "DISTANCE_METRIC": "COSINE",
            },
        },
        {"type": "TAG", "name": "annotation"},
        {"type": "STRING", "name": "timestamp"},
    ]

async def run(artifact_manager):
    await create_collection(
        artifact_manager,
        "cell-images",
        "Collection of cell images",
        get_vector_fields()
    )
    cell_vectors = await artifact_manager.list_vectors("cell-images")
            
    for cell_vector in cell_vectors:
        cell_vector["vector"] = process_image_tensor(cell_vector["image_tensor"])
        
    await artifact_manager.clear_vectors("cell-images")
    await artifact_manager.add_vectors("cell-images", cell_vectors)