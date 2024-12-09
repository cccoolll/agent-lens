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
        
    async def create_vector_collection(self, name, manifest, overwrite=False):
        art_id = self._artifact_id(name)
        try:
            await self._svc.create(
                alias=name,
                type="vector-collection",
                manifest=manifest
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
        
    async def list_vectors(self, coll_name):
        art_id = self._artifact_id(coll_name)
        return await self._svc.list_vectors(art_id)
        