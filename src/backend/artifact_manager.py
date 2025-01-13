import io
import requests

class ArtifactManager:
    def __init__(self):
        self._svc = None

    async def connect_server(self, server):
        self._svc = await server.get_service("public/artifact-manager")

    def _artifact_alias(self, name):
        return f"agent-lens-{name}"

    def _workspace_id(self, user_id):
        return f"ws-user-{user_id}"

    def _artifact_id(self, user_id, name):
        return f"{self._workspace_id(user_id)}/{self._artifact_alias(name)}"

    async def create_vector_collection(self, user_id, name, manifest, config, overwrite=False):
        art_id = self._artifact_id(user_id, name)
        try:
            await self._svc.create(
                alias=name,
                type="vector-collection",
                manifest=manifest,
                config=config,
            )
        except Exception:
            if overwrite:
                await self._svc.edit(art_id, manifest)
                await self._svc.commit(art_id)

    async def add_vectors(self, user_id, coll_name, *vectors):
        art_id = self._artifact_id(user_id, coll_name)
        await self._svc.add_vectors(
            artifact_id=art_id,
            vectors=vectors
        )
        await self._svc.commit(art_id)

    async def search_vectors(self, user_id, coll_name, vector, top_k=None):
        art_id = self._artifact_id(user_id, coll_name)
        return await self._svc.search_vectors(
            artifact_id=art_id,
            query={"vector": vector},
            limit=top_k
        )

    async def add_file(self, user_id, coll_name, file_content, file_path):
        art_id = self._artifact_id(user_id, coll_name)
        put_url = await self._svc.put_file(art_id, file_path, download_weight=1.0)
        response = requests.put(put_url, data=file_content, timeout=500)
        assert response.ok, "File upload failed"
        await self._svc.commit(art_id)

    async def get_file(self, user_id, coll_name, file_path):
        art_id = self._artifact_id(user_id, coll_name)
        get_url = await self._svc.get_file(art_id, file_path)
        response = requests.get(get_url, timeout=500)
        assert response.ok, "File download failed"
        return response.content

    async def get_zip_file(self, user_id, coll_name, zip_file_path, file_path):
        workspace = self._workspace_id(user_id)
        artifact_alias = self._artifact_alias(coll_name)
        server_url = "hypha.aicell.io" # TODO: something like self._svc.server.config.server_url
        response = requests.get(
            f"{server_url}/{workspace}/artifacts/{artifact_alias}/zip-files/{zip_file_path}",
            params={"path": file_path},
            stream=True,
            timeout=500
        )

        file_content = io.BytesIO()
        for chunk in response.iter_content(chunk_size=8192):
            file_content.write(chunk)

        file_content.seek(0)
        return file_content
        