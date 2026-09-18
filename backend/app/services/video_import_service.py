import cv2
import os
import time
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from backend.app.models.schemas import LearningSession, TaskState
from backend.app.db.database import DatabaseManager, get_session_dir
from backend.app.services.screenshot_service import screenshot_service
from backend.app.services.knowledge_service import knowledge_service
from backend.app.providers.transcription_provider import transcription_provider

logger = logging.getLogger(__name__)

class VideoImportService:
    """
    Offline video processor for local MP4, WebM, MKV, MOV files.
    Processes video frames and audio locally without external upload.
    """

    @classmethod
    async def process_video_file(cls, video_path: str, title: Optional[str] = None) -> str:
        path = Path(video_path)
        if not path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        session_title = title or path.stem.replace("_", " ").title()
        session = LearningSession(
            title=f"Video: {session_title}",
            source_platform="Local Offline Video",
            source_url_or_title=path.name,
            status=TaskState.PROCESSING
        )
        DatabaseManager.create_session(session)
        session_id = session.id

        cap = cv2.VideoCapture(str(path))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps if fps > 0 else 0.0

        # Sample 1 frame every 5 seconds
        sample_step = max(1, int(fps * 5))
        curr_frame_idx = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if curr_frame_idx % sample_step == 0:
                sec = curr_frame_idx / fps
                _, buf = cv2.imencode(".jpg", frame)
                frame_capture = await screenshot_service.process_frame_data(
                    session_id=session_id,
                    image_bytes=buf.tobytes(),
                    timestamp_sec=sec
                )
                if frame_capture and frame_capture.ocr_text:
                    await knowledge_service.extract_knowledge_from_chunk(
                        session_id=session_id,
                        transcript_text=frame_capture.ocr_text,
                        timestamp_formatted=frame_capture.timestamp_formatted,
                        frame=frame_capture
                    )

            curr_frame_idx += 1

        cap.release()

        # Update session status
        DatabaseManager.update_session(session_id, {
            "duration_sec": duration_sec,
            "progress_pct": 100,
            "status": TaskState.COMPLETED.value
        })

        return session_id

video_import_service = VideoImportService()
