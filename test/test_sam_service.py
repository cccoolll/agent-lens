import asyncio
from imjoy_rpc.hypha import connect_to_server
import numpy as np

async def main():
    try:
        # Connect to the server
        server = await connect_to_server({"server_url": "https://ai.imjoy.io"})

        # Get the existing service
        segment_svc = await server.get_service("interactive-segmentation")

        print("Service info:", segment_svc)

        # Compute embedding
        result = await segment_svc.compute_embedding("vit_b", np.random.rand(256, 256))
        print("Embedding computed:", result)

        # Perform segmentation
        features = await segment_svc.segment([[128, 128]], [1])
        print("Segmentation features:", features)

        # Reset embedding
        reset_result = await segment_svc.reset_embedding()
        print("Embedding reset:", reset_result)

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(main())
