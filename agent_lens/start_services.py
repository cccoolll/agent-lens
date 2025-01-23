import asyncio
from agent_lens import (
    register_frontend_service,
    register_sam_service,
    register_similarity_search_service,
)

async def setup(server=None):
    """
    Set up the services and connect to the server.

    Args:
        server (Server, optional): The server instance.
    """
    await register_frontend_service.setup_service(server)
    await register_sam_service.setup_service(server)
    await register_similarity_search_service.setup_service(server)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace_name", type=str, required=False, default=None)
    parser.add_argument("--server_url", type=str, required=False, default="https://hypha.aicell.io")
    parser.add_argument("--service_id", type=str, required=False, default="interactive-segmentation")
    sam_args = parser.parse_args()
    
    loop = asyncio.get_event_loop()
    loop.create_task(register_frontend_service.setup(workspace=sam_args.workspace_name, server_url=sam_args.server_url))
    loop.create_task(register_sam_service.register_service(args=sam_args))
    loop.create_task(register_similarity_search_service.setup(workspace=sam_args.workspace_name, server_url=sam_args.server_url))
    loop.run_forever()