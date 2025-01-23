import os
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from agent_lens.service_utils import make_service

async def get_frontend_api():
    """
    Create the FastAPI application for serving the frontend.

    Args:
        artifact_manager (ArtifactManager): The artifact manager instance.

    Returns:
        function: The FastAPI application.
    """
    app = FastAPI()
    frontend_dir = os.path.join(os.path.dirname(__file__), "../frontend")
    tiles_dir = os.path.join(frontend_dir, "tiles_output")
    dist_dir = os.path.join(frontend_dir, "dist")
    assets_dir = os.path.join(dist_dir, "assets")
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    app.mount("/tiles", StaticFiles(directory=tiles_dir), name="tiles_output")

    async def serve_fastapi(args, context=None):
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
        artifact_manager (ArtifactManager): The artifact manager instance.
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
        }
    )
    
async def setup(workspace=None, server_url="https://hypha.aicell.io"):
    token = os.environ.get("WORKSPACE_TOKEN")
    if token is None or workspace is None:
        token = os.environ.get("PERSONAL_TOKEN")
    
    server = await connect_to_server({
        "server_url": server_url,
         "method_timeout": 500,
         "token": token,
         **({"workspace": workspace} if workspace else {}),
    })
    
    await start_hypha_server(server, "microscope-control")
    print(f"Frontend service registered at workspace: {server.config.workspace}")
    print(f"Test it with the HTTP proxy: {server_url}/{server.config.workspace}/apps/microscope-control")
 
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(setup())
    loop.run_forever()