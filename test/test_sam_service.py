import asyncio
from imjoy_rpc.hypha import connect_to_server
from PIL import Image
import io
import os

async def main():
    server = await connect_to_server({"server_url": "https://ai.imjoy.io"})

    # Get an existing service
    svc = await server.get_service("interactive-segmentation")
    
    print("Service info:", svc)

if __name__ == "__main__":
    asyncio.run(main())
