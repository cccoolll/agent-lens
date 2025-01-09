import os
import dotenv
import argparse
from hypha_rpc import connect_to_server
import torch
import clip
from PIL import Image

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL, PREPROCESS = clip.load("ViT-B/32", device=DEVICE)

def get_token(workspace=None):
    dotenv.load_dotenv()
    
    token = os.environ.get("WORKSPACE_TOKEN")
    if token is None or workspace is None:
        token = os.environ.get("PERSONAL_TOKEN")
        
    return token

async def get_server(token, workspace=None, server_url="https://hypha.aicell.io"):
    server = await connect_to_server({
        "server_url": server_url,
        "token": token,
        "method_timeout": 500,
        **({"workspace": workspace} if workspace else {}),
    })
    
    return server

async def register_service(service, workspace=None, server_url="https://hypha.aicell.io", server=None):
    if server is None:
        token = get_token(workspace)
        server = await get_server(token, workspace, server_url)
    else:
        await server.register_service(service)
        server_url = "0.0.0.0:9000"
    
    print(f"Service registered at: {server_url}/{server.config.workspace}/services/{service['id']}")
    
def get_service_args(service_id, default_server_url="https://hypha.aicell.io", default_workspace=None):
    parser = argparse.ArgumentParser(
        description=f"Register {service_id} service on given workspace."
    )
    parser.add_argument(
        "--server_url",
        default=default_server_url,
        help="URL of the Hypha server",
    )
    parser.add_argument(
        "--workspace_name",
        default=default_workspace,
        help="Name of the workspace"
    )
    
    return parser.parse_args()

async def make_service(service, default_workspace=None, default_server_url="https://hypha.aicell.io", server=None):
    if server is None:
        service_args = get_service_args(service["id"], default_server_url, default_workspace)
        await register_service(service, service_args.workspace_name, service_args.server_url, server)
    else:
        await register_service(service, server=server)

def open_image(image_path):
    return Image.open(image_path)

def get_image_tensor(image_path):
    image = open_image(image_path).convert("RGB")
    return PREPROCESS(image).unsqueeze(0).to(DEVICE)

def process_image_tensor(image_tensor):
    """Process image tensor with CLIP model and return image features.
    
    Args:
        image_tensor (torch.Tensor): Image tensor.
        model (CLIP): CLIP model.
        
    Returns:
        np.ndarray: Image features.
    """
    with torch.no_grad():
        image_features = MODEL.encode_image(image_tensor).cpu().numpy().flatten()
        
    return image_features

async def create_collection(artifact_manager, name, desc, vector_fields):
    """Creates a vector collection in the artifact manager for storing image embeddings.
    
    Args:
        artifact_manager (ArtifactManager): The artifact manager instance.
    """
    await artifact_manager.create_vector_collection(
        name=name,
        manifest={
            "name": name,
            "description": desc,
        },
        config={
            "vector_fields": vector_fields,
            "embedding_models": {
                "vector": "fastembed:BAAI/bge-small-en-v1.5",
            },
        },
        overwrite=True
    )

def get_bmp_paths(image_folder):
    return [
        os.path.join(dp, f)
        for dp, dn, filenames in os.walk(image_folder)
        for f in filenames
        if os.path.splitext(f)[1].lower() == '.bmp'
    ]