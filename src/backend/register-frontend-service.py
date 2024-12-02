import os
import asyncio
from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from hypha_rpc import connect_to_server, login

async def start_hypha_server(server, service_id):
    app = FastAPI(root_path=f"/agent-lens/apps/{service_id}")
    static_dir = os.path.join(os.path.dirname(__file__), "../frontend/dist")
    app.mount("/dist", StaticFiles(directory=static_dir), name="dist")

    async def serve_fastapi(args, context=None):
        await app(args["scope"], args["receive"], args["send"])

    @app.get("/", response_class=HTMLResponse)
    async def root():
        return FileResponse(os.path.join(static_dir, "index.html"))

    await server.register_service(
        {
            "id": service_id,
            "name": "Microscope Control",
            "type": "asgi",
            "serve": serve_fastapi,
            "config": {"visibility": "public"},
        }
    )
    
async def setup():
    server_url = "https://hypha.aicell.io"
    token = await login({"server_url": server_url})
    server = await connect_to_server({"server_url": server_url, "token": token})
    await start_hypha_server(server, "microscope-control")
    print(f"Image embedding and similarity search service registered at workspace: {server.config.workspace}")
    print(f"Test it with the HTTP proxy: {server_url}/{server.config.workspace}/agent-lens/apps/microscope-control")
 
if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(setup())
    loop.run_forever()