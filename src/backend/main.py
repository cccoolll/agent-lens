import asyncio
from src.backend import (
    register_frontend_service,
    register_sam_service,
    register_similarity_search_service,
)
from src.backend.artifact_manager import ArtifactManager

async def setup(server=None):
    artifact_manager = ArtifactManager()
    await artifact_manager.connect_server(server)
    await register_frontend_service.setup_service(server, artifact_manager)
    await register_sam_service.setup_service(server)
    await register_similarity_search_service.setup_service(server, artifact_manager)

if __name__ == "__main__":
    asyncio.run(setup())
