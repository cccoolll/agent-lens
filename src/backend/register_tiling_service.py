from src.backend.utils import make_service
import subprocess

async def tile_image(artifact_manager):
    subprocess.run(["vips", "dzsave", "src/frontend/img/example_image.png", "src/frontend/tiles_output", "--layout", "google"], check=True)
    subprocess.run(["mv", "src/frontend/tiles_output/1/1/1.jpg", "src/frontend/tiles_output/1/1/1.bmp"], check=True)
    

async def setup_service(server=None):
    await make_service(
        service={
            "id": "setup-service",
            "config":{
                "visibility": "public",
                "run_in_executor": True,
                "require_context": False,   
            },
            "type": "echo",
            "run": tile_image,
        },
        server=server
    )
