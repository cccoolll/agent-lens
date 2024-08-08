import asyncio
from imjoy_rpc.hypha import connect_to_server
from PIL import Image
import io
import os

async def main():
    server = await connect_to_server({"server_url": "http://reef.aicell.io:9520"})

    # Get an existing service
    svc = await server.get_service("image-embedding-similarity-search")
    
    # Open the image and convert it to bytes
    with open("test/n02085620_7.jpg", "rb") as image_file:
        image_bytes = image_file.read()

    ret = await svc.find_similar_images(image_bytes)

    # Process the response images
    for idx, img_data in enumerate(ret):
        img = Image.open(io.BytesIO(img_data))
        
        # Save the image to disk
        img_path = f"result_{idx + 1}.png"
        img.save(img_path)
        print(f"Saved result image {idx + 1} to {img_path}")

        # Open the image with the default image viewer
        os.system(f"xdg-open {img_path}")

if __name__ == "__main__":
    asyncio.run(main())
