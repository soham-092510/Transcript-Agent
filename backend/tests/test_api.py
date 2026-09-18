import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "LearnLens AI"
    assert data["status"] == "ONLINE"

def test_system_status():
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert "ollama_connected" in data
    assert "whisper_available" in data

def test_create_and_list_sessions():
    create_payload = {
        "title": "Coursera Machine Learning - Week 1",
        "source_platform": "Coursera",
        "source_url_or_title": "Linear Regression and Gradient Descent"
    }
    create_res = client.post("/api/sessions", json=create_payload)
    assert create_res.status_code == 200
    session_data = create_res.json()
    session_id = session_data["id"]
    assert session_data["title"] == "Coursera Machine Learning - Week 1"

    list_res = client.get("/api/sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    assert any(s["id"] == session_id for s in sessions)

def test_chat_endpoint():
    # Test chat against demo session
    chat_payload = {
        "session_id": "demo_cybersecurity_module_2",
        "message": "What is a firewall?",
        "mode": "simple"
    }
    res = client.post("/api/sessions/demo_cybersecurity_module_2/chat", json=chat_payload)
    assert res.status_code == 200
    msg = res.json()
    assert msg["sender"] == "assistant"
    assert len(msg["text"]) > 10

def test_ppt_and_pdf_generation_endpoints():
    ppt_res = client.post("/api/sessions/demo_cybersecurity_module_2/generate-ppt", json={
        "session_id": "demo_cybersecurity_module_2",
        "style": "teaching",
        "slide_count": 6
    })
    assert ppt_res.status_code == 200
    assert "filename" in ppt_res.json()

    pdf_res = client.post("/api/sessions/demo_cybersecurity_module_2/generate-pdf", json={
        "session_id": "demo_cybersecurity_module_2",
        "pdf_type": "teaching_report"
    })
    assert pdf_res.status_code == 200
    assert "filename" in pdf_res.json()
