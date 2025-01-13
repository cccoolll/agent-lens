"""
This module provides functionality for registering a frontend service
that serves the frontend application and handles requests for image tiles.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from backend.service_utils import make_service

async def get_frontend_api(artifact_manager):
    """
    Create the FastAPI application for serving the frontend.

    Args:
        artifact_manager (ArtifactManager): The artifact manager instance.

    Returns:
        function: The FastAPI application.
    """
    app = FastAPI()
    frontend_dir = os.path.join(os.path.dirname(__file__), "../frontend")
    dist_dir = os.path.join(frontend_dir, "dist")
    assets_dir = os.path.join(dist_dir, "assets")
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    async def serve_fastapi(args):
        await app(args["scope"], args["receive"], args["send"])

    @app.get("/", response_class=HTMLResponse)
    async def root():
        return FileResponse(os.path.join(dist_dir, "index.html"))

    @app.get("/tiles")
    async def get_tile(user_id, tile): # TODO: move to frontend
        try:
            zip_file = await artifact_manager.get_zip_file(
                user_id,
                "cell-images",
                "tiles.zip",
                tile
            )
            return FileResponse(zip_file)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving tile: {str(e)}") from e

    return serve_fastapi


async def setup_service(server, artifact_manager):
    """
    Set up the frontend service.

    Args:
        server (Server): The server instance.
        artifact_manager (ArtifactManager): The artifact manager instance.
    """
    serve_fastapi = get_frontend_api(artifact_manager)
    service_id = "microscope-control"
    await make_service(
        service={
            "id": service_id,
            "name": "Microscope Control",
            "type": "asgi",
            "serve": serve_fastapi,
            "config": {"visibility": "public"},
        },
        server=server
    )
