"""
This module provides functionality for registering a frontend service
that serves the frontend application.
"""

import os
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from agent_lens.service_utils import make_service

async def get_frontend_api():
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

    async def serve_fastapi(args):
        await app(args["scope"], args["receive"], args["send"])

    @app.get("/", response_class=HTMLResponse)
    async def root():
        return FileResponse(os.path.join(dist_dir, "index.html"))

    return serve_fastapi


async def setup_service(server):
    """
    Set up the frontend service.

    Args:
        server (Server): The server instance.
    """
    serve_fastapi = await get_frontend_api()
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
