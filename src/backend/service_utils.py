import os
import argparse
import dotenv
from hypha_rpc import connect_to_server

def get_token(workspace=None):
    dotenv.load_dotenv()

    token = os.environ.get("WORKSPACE_TOKEN")
    if token is None or workspace is None:
        token = os.environ.get("PERSONAL_TOKEN")

    return token


async def get_server(token, workspace=None, server_url="https://hypha.aicell.io"):
    server = await connect_to_server({
        "server_url": server_url,
        "token": token,
        "method_timeout": 500,
        **({"workspace": workspace} if workspace else {}),
    })

    return server


async def register_service(service, workspace=None, server_url="https://hypha.aicell.io", server=None):
    if server is None:
        token = get_token(workspace)
        server = await get_server(token, workspace, server_url)
    else:
        await server.register_service(service)
        server_url = "0.0.0.0:9000"

    print(f"Service registered at: {server_url}/{server.config.workspace}/services/{service['id']}")


def get_service_args(service_id, default_server_url="https://hypha.aicell.io", default_workspace=None):
    parser = argparse.ArgumentParser(
        description=f"Register {service_id} service on given workspace."
    )
    parser.add_argument(
        "--server_url",
        default=default_server_url,
        help="URL of the Hypha server",
    )
    parser.add_argument(
        "--workspace_name",
        default=default_workspace,
        help="Name of the workspace"
    )

    return parser.parse_args()


async def make_service(service, default_workspace=None, default_server_url="https://hypha.aicell.io", server=None):
    if server is None:
        service_args = get_service_args(service["id"], default_server_url, default_workspace)
        await register_service(
            service,
            service_args.workspace_name,
            service_args.server_url,
            server
        )
    else:
        await register_service(service, server=server)
