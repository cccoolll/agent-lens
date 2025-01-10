import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from backend.service_utils import make_service
from src.backend.artifact_manager import ArtifactManager

def get_frontend_api(server):
    app = FastAPI()
    artifact_manager = ArtifactManager()
    artifact_manager.server = server
    frontend_dir = os.path.join(os.path.dirname(__file__), "../frontend")
    dist_dir = os.path.join(frontend_dir, "dist")
    assets_dir = os.path.join(dist_dir, "assets")
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    async def serve_fastapi(args, context=None):
        await app(args["scope"], args["receive"], args["send"])

    @app.get("/", response_class=HTMLResponse)
    async def root():
        return FileResponse(os.path.join(dist_dir, "index.html"))

    @app.get("/tiles")
    async def get_tile(user_id, tile):
        try:
            # TODO: fix using https://docs.amun.ai/#/artifact-manager?id=zip-file-access-endpoints
            zip_file_path = artifact_manager.get_file(user_id, "cell-images", "tiles.zip")

            with zipfile.ZipFile(zip_file_path, "r") as zf:
                if tile_path in zf.namelist():
                    tile_data = zf.open(tile_path)
                    return StreamingResponse(tile_data, media_type="image/png")

            raise HTTPException(status_code=404, detail="Tile not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error retrieving tile: {str(e)}") from e

    return serve_fastapi
    
async def setup_service(server=None):
    serve_fastapi = get_frontend_api(server)
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
 
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(setup_service())
    loop.run_forever()