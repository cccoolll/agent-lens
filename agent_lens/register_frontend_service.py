"""
This module provides functionality for registering a frontend service
that serves the frontend application.
"""

import os
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from agent_lens.artifact_manager import TileManager
from hypha_rpc import connect_to_server

ARTIFACT_ALIAS = "microscopy-tiles-complete"
DEFAULT_CHANNEL = "BF_LED_matrix_full"
# Create a global TileManager instance
tile_manager = TileManager()

SERVER_URL = "https://hypha.aicell.io"
WORKSPACE_TOKEN = os.getenv("REEF_WORKSPACE_TOKEN")

async def get_artifact_manager():
    """Get a new connection to the artifact manager."""
    api = await connect_to_server(
        {"name": "test-client", "server_url": SERVER_URL, "token": WORKSPACE_TOKEN}
    )
    artifact_manager = await api.get_service("public/artifact-manager")
    return api, artifact_manager

def get_frontend_api():
    """
    Create the FastAPI application for serving the frontend.

    Returns:
        function: The FastAPI application.
    """
    app = FastAPI()
    frontend_dir = os.path.join(os.path.dirname(__file__), "../frontend")
    dist_dir = os.path.join(frontend_dir, "dist")
    assets_dir = os.path.join(dist_dir, "assets")
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", response_class=HTMLResponse)
    async def root():
        return FileResponse(os.path.join(dist_dir, "index.html"))

    # New endpoint to serve tiles from the new TileManager
    @app.get("/tile")
    async def tile_endpoint(channel_name: str = DEFAULT_CHANNEL, z: int = 0, x: int = 0, y: int = 0):
        tile_b64 = await tile_manager.get_tile_base64(channel_name, z, x, y)
        return tile_b64

    @app.get("/datasets")
    async def get_datasets():
        """
        Endpoint to fetch datasets from the artifact manager using the correct collection ID.

        Returns:
            list: A list of datasets.
        """
        _, artifact_manager = await get_artifact_manager()
        datasets = await artifact_manager.list(artifact_id="reef-imaging/u2os-fucci-drug-treatment")
        return datasets

    async def serve_fastapi(args):
        await app(args["scope"], args["receive"], args["send"])

    return serve_fastapi


async def setup_service(server, server_id="agent-lens"):
    """
    Set up the frontend service.

    Args:
        server (Server): The server instance.
    """
    # Ensure tile_manager is connected with the server (with proper token and so on)
    await tile_manager.connect()
    await server.register_service(
        {
            "id": server_id,
            "name": "Agent Lens",
            "type": "asgi",
            "serve": get_frontend_api(),
            "config": {"visibility": "public"},
        }
    )

    print("Frontend service registered successfully.")
