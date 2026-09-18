import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.demo_service import demo_service
from backend.app.services.hyper_ingest_service import hyper_ingest_service
from backend.app.services.pdf_service import pdf_service
from backend.app.services.ppt_service import ppt_service

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_demo():
    demo_service.seed_demo_session()

def test_hyper_ingest_status():
    status = hyper_ingest_service.get_status()
    assert isinstance(status, dict)
    assert "is_running" in status
    assert "speed_multiplier" in status
    assert "total_slides_captured" in status

def test_export_slide_only_pdf():
    session_id = "demo_cybersecurity_module_2"
    resp = client.post(f"/api/sessions/{session_id}/export/slide-pdf")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "LearnLens_SlideOnly_16x9" in data["filename"]
    assert data["download_url"].startswith("/api/exports/")

def test_export_slide_only_pptx():
    session_id = "demo_cybersecurity_module_2"
    resp = client.post(f"/api/sessions/{session_id}/export/slide-pptx")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert "LearnLens_SlideDeck_16x9" in data["filename"]
    assert data["download_url"].startswith("/api/exports/")

def test_hyper_ingest_status_endpoint():
    resp = client.get("/api/video/hyper-ingest/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "is_running" in data
