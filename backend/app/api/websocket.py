import json
import base64
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.services.screenshot_service import screenshot_service
from backend.app.services.knowledge_service import knowledge_service
from backend.app.models.schemas import TranscriptSegment
from backend.app.db.database import DatabaseManager

logger = logging.getLogger(__name__)
ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            dead = []
            for ws in self.active_connections[session_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[session_id].discard(ws)

manager = ConnectionManager()

@ws_router.websocket("/ws/session/{session_id}")
async def session_websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    logger.info(f"WebSocket connected for session: {session_id}")
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            event_type = payload.get("type")

            # 1. Real-time Transcript Chunk from Client
            if event_type == "transcript_chunk":
                text = payload.get("text", "").strip()
                timestamp_sec = float(payload.get("timestamp_sec", 0.0))
                formatted_ts = screenshot_service.format_timestamp(timestamp_sec)
                
                segment = TranscriptSegment(
                    session_id=session_id,
                    timestamp_start=timestamp_sec,
                    timestamp_end=timestamp_sec + 5.0,
                    timestamp_formatted=formatted_ts,
                    text=text,
                    confidence=0.98
                )
                DatabaseManager.add_transcript_segment(segment)

                # Extract knowledge
                concepts = await knowledge_service.extract_knowledge_from_chunk(
                    session_id=session_id,
                    transcript_text=text,
                    timestamp_formatted=formatted_ts
                )

                # Broadcast back to UI
                await manager.broadcast(session_id, {
                    "event": "transcript_received",
                    "segment": segment.dict(),
                    "new_concepts": [c.dict() for c in concepts]
                })

            # 2. Real-time Video Frame Capture from Client Canvas/Screen
            elif event_type == "frame_capture":
                b64_img = payload.get("image_base64", "")
                timestamp_sec = float(payload.get("timestamp_sec", 0.0))
                
                if "," in b64_img:
                    b64_img = b64_img.split(",")[1]
                img_bytes = base64.b64decode(b64_img)

                frame_capture = await screenshot_service.process_frame_data(
                    session_id=session_id,
                    image_bytes=img_bytes,
                    timestamp_sec=timestamp_sec
                )

                if frame_capture:
                    # Broadcast smart frame event
                    await manager.broadcast(session_id, {
                        "event": "frame_analyzed",
                        "frame": frame_capture.dict()
                    })

            # 3. Heartbeat ping
            elif event_type == "ping":
                await websocket.send_json({"event": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
        logger.info(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(session_id, websocket)
