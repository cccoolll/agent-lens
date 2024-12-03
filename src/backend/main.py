import asyncio
from src.backend import (
    register_frontend_service,
    register_sam_service,
    register_similarity_search_service,
)

class SamArgs:
    def __init__(self, server_url, workspace_name, service_id):
        self.server_url = server_url
        self.workspace_name = workspace_name
        self.service_id = service_id

if __name__ == "__main__":
    sam_args = SamArgs(
        server_url="https://hypha.aicell.io",
        workspace_name="agent-lens",
        service_id="interactive-segmentation"
    )
    
    loop = asyncio.get_event_loop()
    loop.create_task(register_frontend_service.setup())
    loop.create_task(register_sam_service.register_service(args=sam_args))
    loop.create_task(register_similarity_search_service.setup())
    loop.run_forever()