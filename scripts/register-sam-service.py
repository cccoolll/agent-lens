import argparse
import io
import os
from logging import getLogger
from typing import Union
from PIL import Image
import numpy as np
import requests
import torch
from dotenv import find_dotenv, load_dotenv
from imjoy_rpc.hypha import connect_to_server, login
from kaibu_utils import mask_to_features
from segment_anything import SamPredictor, sam_model_registry

ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

MODELS = {
    "vit_b": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth",
    "vit_b_lm": "https://uk1s3.embassy.ebi.ac.uk/public-datasets/bioimage.io/diplomatic-bug/1/files/vit_b.pt",
    "vit_b_em_organelles": "https://uk1s3.embassy.ebi.ac.uk/public-datasets/bioimage.io/noisy-ox/1/files/vit_b.pt",
}
STORAGE = {}

logger = getLogger(__name__)
logger.setLevel("INFO")

def _load_model(model_name: str) -> torch.nn.Module:
    if model_name not in MODELS:
        raise ValueError(
            f"Model {model_name} not found. Available models: {list(MODELS.keys())}"
        )

    model_url = MODELS[model_name]

    # Check cache first
    if model_url in STORAGE:
        logger.info(f"Loading model {model_name} with ID '{model_url}' from cache...")
        return STORAGE[model_url]

    # Download model if not in cache
    logger.info(f"Loading model {model_name} from {model_url}...")
    response = requests.get(model_url)
    if response.status_code != 200:
        raise RuntimeError(f"Failed to download model from {model_url}")
    buffer = io.BytesIO(response.content)

    # Load model state
    device = "cuda" if torch.cuda.is_available() else "cpu"
    ckpt = torch.load(buffer, map_location=device)
    model_type = model_name[:5]
    sam = sam_model_registry[model_type]()
    sam.load_state_dict(ckpt)

    # Cache the model
    logger.info(f"Caching model {model_name} (device={device}) with ID '{model_url}'...")
    STORAGE[model_url] = sam

    return sam

def _to_image(input_: np.ndarray) -> np.ndarray:
    # we require the input to be uint8
    if input_.dtype != np.dtype("uint8"):
        # first normalize the input to [0, 1]
        input_ = input_.astype("float32") - input_.min()
        input_ = input_ / input_.max()
        # then bring to [0, 255] and cast to uint8
        input_ = (input_ * 255).astype("uint8")
    if input_.ndim == 2:
        image = np.concatenate([input_[..., None]] * 3, axis=-1)
    elif input_.ndim == 3 and input_.shape[-1] == 3:
        image = input_
    else:
        raise ValueError(
            f"Invalid input image of shape {input_.shape}. Expect either 2D grayscale or 3D RGB image."
        )
    return image

def compute_embedding_with_initial_segment(model_name: str, image_bytes: bytes, point_coordinates: Union[list, np.ndarray], point_labels: Union[list, np.ndarray]) -> bool:
    # Convert bytes to a numpy array
    image = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))

    # Load model
    sam = _load_model(model_name)
    logger.info(f"Computing embedding of model {model_name} with initial segmentation...")
    predictor = SamPredictor(sam)
    predictor.set_image(_to_image(image))

    # Perform initial segmentation
    if isinstance(point_coordinates, list):
        point_coordinates = np.array(point_coordinates, dtype=np.float32)
    if isinstance(point_labels, list):
        point_labels = np.array(point_labels, dtype=np.float32)
    mask, scores, logits = predictor.predict(
        point_coords=point_coordinates[:, ::-1],  # SAM has reversed XY conventions
        point_labels=point_labels,
        multimask_output=False,
    )

    # Refine embedding based on initial mask if needed
    # (SAM uses the feature embedding internally for improved segmentation)
    
    # Cache the computed embedding and predictor states
    logger.info(f"Caching embedding of model {model_name}...")
    predictor_dict = {
        "model_name": model_name,
        "original_size": predictor.original_size,
        "input_size": predictor.input_size,
        "features": predictor.features,  # embedding
        "is_image_set": predictor.is_image_set,
    }
    STORAGE['current_embedding'] = predictor_dict
    return True



def reset_embedding() -> bool:
    if 'current_embedding' not in STORAGE:
        logger.info("No embedding found in storage.")
        return False
    else:
        logger.info("Resetting embedding...")
        del STORAGE['current_embedding']
        return True

def segment(
    point_coordinates: Union[list, np.ndarray],
    point_labels: Union[list, np.ndarray],
) -> list:
    if 'current_embedding' not in STORAGE:
        logger.info("No embedding found in storage.")
        return []

    logger.info(f"Segmenting with model {STORAGE['current_embedding'].get('model_name')}...")
    # Load the model with the pre-computed embedding
    sam = _load_model(STORAGE['current_embedding'].get('model_name'))
    predictor = SamPredictor(sam)
    for key, value in STORAGE['current_embedding'].items():
        if key != "model_name":
            setattr(predictor, key, value)
    # Run the segmentation
    logger.debug(f"Point coordinates: {point_coordinates}, {point_labels}")
    if isinstance(point_coordinates, list):
        point_coordinates = np.array(point_coordinates, dtype=np.float32)
    if isinstance(point_labels, list):
        point_labels = np.array(point_labels, dtype=np.float32)
    mask, scores, logits = predictor.predict(
        point_coords=point_coordinates[:, ::-1],  # SAM has reversed XY conventions
        point_labels=point_labels,
        multimask_output=False,
    )
    logger.debug(f"Predicted mask of shape {mask.shape}")
    features = mask_to_features(mask[0])
    return features

def segment_with_existing_embedding(image_bytes: bytes, point_coordinates: Union[list, np.ndarray], point_labels: Union[list, np.ndarray]) -> list:
    if 'current_embedding' not in STORAGE:
        logger.info("No embedding found in storage.")
        return []

    # Convert bytes to a numpy array
    image = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))

    logger.info(f"Segmenting with existing embedding from model {STORAGE['current_embedding'].get('model_name')}...")
    # Load the model
    sam = _load_model(STORAGE['current_embedding'].get('model_name'))
    predictor = SamPredictor(sam)
    
    # Set the new image while keeping the old embedding
    predictor.set_image(_to_image(image))  
    for key, value in STORAGE['current_embedding'].items():
        if key not in ["model_name", "is_image_set"]:
            setattr(predictor, key, value)

    # Run the segmentation
    if isinstance(point_coordinates, list):
        point_coordinates = np.array(point_coordinates, dtype=np.float32)
    if isinstance(point_labels, list):
        point_labels = np.array(point_labels, dtype=np.float32)

    mask, scores, logits = predictor.predict(
        point_coords=point_coordinates[:, ::-1],  # SAM uses reversed XY conventions
        point_labels=point_labels,
        multimask_output=False,
    )

    logger.debug(f"Predicted mask of shape {mask.shape}")
    features = mask_to_features(mask[0])
    return features

async def register_service(args: dict) -> None:
    """
    Register the SAM annotation service on the BioImageIO Colab workspace.
    """
    ##token = await login({"server_url": args.server_url})
    server = await connect_to_server(
        {
            "server_url": args.server_url,
            ##"token": token,
        }
    )

    # Register a new service
    service_info = await server.register_service(
        {
            "name": "Interactive Segmentation",
            "id": args.service_id,
            "config": {
                "visibility": "public",
                "require_context": False,
                "run_in_executor": True,
            },
            "type": "echo",
            "compute_embedding_with_initial_segment": compute_embedding_with_initial_segment,
            "segment": segment,
            "segment_with_existing_embedding": segment_with_existing_embedding,
            "reset_embedding": reset_embedding,
        },
        overwrite=True
    )
    logger.info(
        f"Service (service_id={args.service_id}) started successfully, available at {args.server_url}/{server.config.workspace}/services"
    )

if __name__ == "__main__":
    import asyncio

    parser = argparse.ArgumentParser(
        description="Register SAM annotation service on BioImageIO Colab workspace."
    )
    parser.add_argument(
        "--server_url",
        default="https://ai.imjoy.io",
        help="URL of the Hypha server",
    )
    parser.add_argument(
        "--workspace_name", default="bioimageio-colab", help="Name of the workspace"
    )
    parser.add_argument(
        "--client_id",
        default="sam-model-server",
        help="Client ID for registering the service",
    )
    parser.add_argument(
        "--service_id",
        default="interactive-segmentation",
        help="Service ID for registering the service",
    )
    args = parser.parse_args()

    loop = asyncio.get_event_loop()
    loop.create_task(register_service(args=args))
    loop.run_forever()