import json
import base64
import logging
import asyncio
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
            for ws in list(self.active_connections[session_id]):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active_connections[session_id].discard(ws)

manager = ConnectionManager()

# Per-session flag to drop redundant in-flight frames
_session_frame_busy: Dict[str, bool] = {}

async def _process_frame_async(session_id: str, img_bytes: bytes, timestamp_sec: float, force: bool):
    try:
        frame_capture = await screenshot_service.process_frame_data(
            session_id=session_id,
            image_bytes=img_bytes,
            timestamp_sec=timestamp_sec,
            force_capture=force
        )
        if frame_capture:
            await manager.broadcast(session_id, {
                "event": "frame_analyzed",
                "frame": frame_capture.dict()
            })
    except Exception as e:
        logger.error(f"Async frame processing error: {e}")
    finally:
        _session_frame_busy[session_id] = False

async def _process_audio_async(session_id: str, audio_bytes: bytes, speaker: str, timestamp_sec: float):
    try:
        from backend.app.providers.transcription_provider import transcription_provider
        segments = await transcription_provider.transcribe_audio_bytes(audio_bytes, speaker_hint=speaker)
        for s in (segments or []):
            seg_text = s.get("text", "").strip()
            if not seg_text:
                continue
            formatted_ts = screenshot_service.format_timestamp(timestamp_sec)
            segment = TranscriptSegment(
                session_id=session_id,
                timestamp_start=timestamp_sec,
                timestamp_end=timestamp_sec + 5.0,
                timestamp_formatted=formatted_ts,
                speaker=speaker,
                text=seg_text,
                confidence=s.get("confidence", 0.95)
            )
            DatabaseManager.add_transcript_segment(segment)

            # Broadcast immediately
            await manager.broadcast(session_id, {
                "event": "transcript_received",
                "segment": segment.dict(),
                "new_concepts": []
            })

            # Extract concepts asynchronously
            concepts = await knowledge_service.extract_knowledge_from_chunk(
                session_id=session_id,
                transcript_text=seg_text,
                timestamp_formatted=formatted_ts
            )
            if concepts:
                await manager.broadcast(session_id, {
                    "event": "concepts_updated",
                    "new_concepts": [c.dict() for c in concepts]
                })
    except Exception as e:
        logger.error(f"Async audio processing error: {e}")

async def _extract_concepts_async(session_id: str, text: str, formatted_ts: str):
    try:
        concepts = await knowledge_service.extract_knowledge_from_chunk(
            session_id=session_id,
            transcript_text=text,
            timestamp_formatted=formatted_ts
        )
        if concepts:
            await manager.broadcast(session_id, {
                "event": "concepts_updated",
                "new_concepts": [c.dict() for c in concepts]
            })
    except Exception as e:
        logger.debug(f"Async concept extraction note: {e}")

@ws_router.websocket("/ws/session/{session_id}")
async def session_websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    logger.info(f"WebSocket connected for session: {session_id}")
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except Exception:
                continue

            event_type = payload.get("type")

            # 1. Real-time Transcript Chunk from Client Web Speech API (zero latency)
            if event_type == "transcript_chunk":
                text = payload.get("text", "").strip()
                if not text:
                    continue
                speaker = payload.get("speaker", "Instructor").strip() or "Instructor"
                timestamp_sec = float(payload.get("timestamp_sec", 0.0))
                formatted_ts = screenshot_service.format_timestamp(timestamp_sec)
                
                segment = TranscriptSegment(
                    session_id=session_id,
                    timestamp_start=timestamp_sec,
                    timestamp_end=timestamp_sec + 5.0,
                    timestamp_formatted=formatted_ts,
                    speaker=speaker,
                    text=text,
                    confidence=0.98
                )
                DatabaseManager.add_transcript_segment(segment)

                # Broadcast immediately to UI so speech is visible instantaneously
                await manager.broadcast(session_id, {
                    "event": "transcript_received",
                    "segment": segment.dict(),
                    "new_concepts": []
                })

                # Background concept extraction
                asyncio.create_task(_extract_concepts_async(session_id, text, formatted_ts))

            # 2. Real-time Audio Stream Chunk for Whisper STT (background worker)
            elif event_type == "audio_chunk":
                b64_audio = payload.get("audio_base64", "")
                if not b64_audio:
                    continue
                speaker = payload.get("speaker", "Instructor").strip() or "Instructor"
                timestamp_sec = float(payload.get("timestamp_sec", 0.0))
                
                if "," in b64_audio:
                    b64_audio = b64_audio.split(",")[1]
                try:
                    audio_bytes = base64.b64decode(b64_audio)
                    asyncio.create_task(_process_audio_async(session_id, audio_bytes, speaker, timestamp_sec))
                except Exception as b64_err:
                    logger.debug(f"Audio base64 decode note: {b64_err}")

            # 3. Real-time Video Frame Capture (non-blocking with frame drop protection)
            elif event_type == "frame_capture":
                b64_img = payload.get("image_base64", "")
                if not b64_img:
                    continue
                timestamp_sec = float(payload.get("timestamp_sec", 0.0))
                force = bool(payload.get("force", False))
                
                # If a frame is currently writing to disk and this is not a forced capture, drop it
                if _session_frame_busy.get(session_id, False) and not force:
                    continue

                if "," in b64_img:
                    b64_img = b64_img.split(",")[1]

                try:
                    img_bytes = base64.b64decode(b64_img)
                    _session_frame_busy[session_id] = True
                    asyncio.create_task(_process_frame_async(session_id, img_bytes, timestamp_sec, force))
                except Exception as img_err:
                    _session_frame_busy[session_id] = False
                    logger.debug(f"Image decode error: {img_err}")

            # 4. Heartbeat ping
            elif event_type == "ping":
                await websocket.send_json({"event": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
        _session_frame_busy.pop(session_id, None)
        logger.info(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(session_id, websocket)
        _session_frame_busy.pop(session_id, None)
