import asyncio
from src.backend import (
    register_frontend_service,
    register_sam_service,
    register_similarity_search_service,
)

async def setup(server=None):
    await register_frontend_service.setup_service(server)
    await register_sam_service.setup_service(server)
    await register_similarity_search_service.setup_service(server)

if __name__ == "__main__":
    asyncio.run(setup())