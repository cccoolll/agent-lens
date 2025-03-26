"""
This module provides functionality for registering a frontend service
that serves the frontend application.
"""

import os
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from agent_lens.artifact_manager import TileManager

ARTIFACT_ALIAS = "microscopy-tiles-complete"
DEFAULT_CHANNEL = "BF_LED_matrix_full"
# Create a global TileManager instance
tile_manager = TileManager()

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

    async def serve_fastapi(args):
        await app(args["scope"], args["receive"], args["send"])

    return serve_fastapi


async def setup_service(server, server_id="microscope-control"):
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
            "name": "Microscope Control",
            "type": "asgi",
            "serve": get_frontend_api(),
            "config": {"visibility": "public"},
        }
    )

    print("Frontend service registered successfully.")
