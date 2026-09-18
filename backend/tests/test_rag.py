import asyncio
from backend.app.services.rag_service import rag_service
from backend.app.services.demo_service import demo_service

def test_session_scoped_rag_retrieval():
    async def _run():
        sid = demo_service.seed_demo_session()
        res = await rag_service.retrieve_context(sid, "network firewall perimeter")
        assert len(res["concepts"]) > 0
        assert any("Firewall" in c.name for c in res["concepts"])
        assert len(res["evidence"]) > 0
    asyncio.run(_run())

def test_rag_isolation():
    async def _run():
        sid = demo_service.seed_demo_session()
        res = await rag_service.retrieve_context(sid, "quantum mechanics wave equation")
        for c in res["concepts"]:
            assert "quantum" not in c.name.lower()
    asyncio.run(_run())
