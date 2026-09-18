# API Specification
## Project: LearnLens AI
### Protocol: REST (HTTP/1.1) & WebSockets (RFC 6455)
### Base URL: `http://127.0.0.1:8000`

---

## 1. System & Diagnostic Endpoints

### `GET /api/system/status`
Returns runtime connectivity status for Ollama, faster-whisper, and OCR engines.
- **Response**: `200 OK`
```json
{
  "ollama_connected": true,
  "ollama_models": ["qwen2.5:latest", "qwen2.5-vl:latest"],
  "whisper_available": true,
  "ocr_available": true,
  "active_session_id": null,
  "current_task_state": "IDLE",
  "system_load": {"cpu": "Normal", "memory": "Available"}
}
```

### `POST /api/demo/seed`
Seeds a verified educational demo session ("Cybersecurity & Cloud Fundamentals - Module 2: Network Firewalls") with pre-rendered architecture slides and transcripts.
- **Response**: `200 OK`
```json
{
  "status": "SUCCESS",
  "session_id": "demo_cybersecurity_module_2",
  "message": "High-yield educational demo session loaded!"
}
```

---

## 2. Session Management Endpoints

### `POST /api/sessions`
Initializes a new learning session namespace.
- **Request Body**:
```json
{
  "title": "Coursera - Deep Learning Week 1",
  "source_platform": "Coursera",
  "source_url_or_title": "Neural Networks Overview"
}
```
- **Response**: `200 OK` (Returns full `LearningSession` schema)

### `GET /api/sessions`
Lists all active and completed sessions sorted by `updated_at DESC`.

### `DELETE /api/sessions/{session_id}`
Cascading purge of session database records, captured frames, and generated artifacts.

---

## 3. Conversational AI Teacher Endpoints

### `POST /api/sessions/{session_id}/chat`
Sends a student question to the grounded AI Teacher.
- **Request Body**:
```json
{
  "session_id": "demo_cybersecurity_module_2",
  "message": "What is a stateful firewall?",
  "mode": "simple",
  "cross_session": false
}
```
- **Response**: `200 OK`
```json
{
  "id": "msg_9812",
  "session_id": "demo_cybersecurity_module_2",
  "sender": "assistant",
  "text": "Based on your captured lesson at 14:32...",
  "mode": "simple",
  "timestamp": 1789719662.0,
  "evidence": [
    {
      "timestamp": "14:32",
      "frame_id": "frame_demo_02",
      "thumbnail_url": "/api/frames/frame_demo_02/thumbnail",
      "quote": "A stateful firewall tracks the entire lifecycle of a TCP handshake.",
      "concept_name": "Stateful Inspection"
    }
  ]
}
```

---

## 4. Human Control & Interruption Endpoints

### `POST /api/sessions/{session_id}/pause`
Transitions task agent state to `PAUSED`. Suspends frame ingestion.

### `POST /api/sessions/{session_id}/resume`
Transitions task agent state back to `OBSERVING`.

### `POST /api/sessions/{session_id}/command`
Executes natural language commands.
- **Request Body**: `{"session_id": "...", "command": "Generate PPT"}`

---

## 5. Artifact Generation Endpoints

### `POST /api/sessions/{session_id}/generate-ppt`
Builds a 16:9 widescreen PowerPoint presentation.
- **Request Body**: `{"session_id": "...", "style": "teaching", "slide_count": 8}`
- **Response**: `{"status": "SUCCESS", "filename": "LearnLens_...pptx", "download_url": "/api/exports/..."}`

### `POST /api/sessions/{session_id}/generate-pdf`
Builds PDF A (Visual Study Pack) or PDF B (AI Teaching Report).
- **Request Body**: `{"session_id": "...", "pdf_type": "teaching_report"}`

---

## 6. WebSocket Protocol

### `ws://127.0.0.1:8000/ws/session/{session_id}`
- **Client -> Server Events**:
  - `transcript_chunk`: `{"type": "transcript_chunk", "text": "...", "timestamp_sec": 14.2}`
  - `frame_capture`: `{"type": "frame_capture", "image_base64": "data:image/jpeg;base64,...", "timestamp_sec": 14.2}`
- **Server -> Client Events**:
  - `transcript_received`: Broadcasts segment and newly extracted concepts.
  - `frame_analyzed`: Broadcasts deduplicated frame metadata and OCR.
