import asyncio
from src.backend import (
    register_frontend_service,
    register_sam_service,
    register_similarity_search_service,
)

def setup(server=None):
    loop = asyncio.get_event_loop()
    loop.create_task(register_frontend_service.setup_service(server))
    loop.create_task(register_sam_service.setup_service(server))
    loop.create_task(register_similarity_search_service.setup_service(server))
    loop.run_forever()

if __name__ == "__main__":
    setup()    