import requests

class ArtifactManager:
    def __init__(self):
        self._svc = None
        self.user_id = None
        self.session_id = None

    async def setup(self, server, user_id):
        self._svc = await server.get_service("public/artifact-manager")
        self.user_id = user_id
        
    def _artifact_id(self, name):
        return f"ws-user-{self.user_id}/agent-lens-{name}"
        
    async def create_vector_collection(self, name, manifest, config, overwrite=False):
        art_id = self._artifact_id(name)
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

    async def add_vectors(self, coll_name, *vectors):
        art_id = self._artifact_id(coll_name)
        await self._svc.add_vectors(
            artifact_id=art_id,
            vector=vectors
        )
        await self._svc.commit(art_id)
        
    async def clear_vectors(self, coll_name):
        # TODO: Fix
        art_id = self._artifact_id(coll_name)
        vectors = await self._svc.list_vectors(art_id)
        for vector in vectors:
            await self._svc.delete_vector(art_id, vector["id"])
        await self._svc.commit(art_id)
        
    async def list_vectors(self, coll_name):
        art_id = self._artifact_id(coll_name)
        return await self._svc.list_vectors(art_id)
        
    async def search_vectors(self, coll_name, vector, top_k=None):
        art_id = self._artifact_id(coll_name)
        return await self._svc.search_vectors(artifact_id=art_id, query={"vector": vector}, limit=top_k)
    
    async def add_file(self, coll_name, file_content, file_path):
        art_id = self._artifact_id(coll_name)
        put_url = await self._svc.put_file(art_id, file_path, download_weight=1.0)
        response = requests.put(put_url, data=file_content, timeout=500)
        assert response.ok, "File upload failed"
        await self._svc.commit(art_id)