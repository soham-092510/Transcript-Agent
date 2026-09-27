import os
import shutil
import base64
import asyncio
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, JSONResponse, Response

from backend.app.core.config import settings
from backend.app.models.schemas import (
    LearningSession, CreateSessionRequest, UpdateSessionRequest,
    TranscriptSegment, FrameCapture, Concept, ChatMessage,
    ChatRequest, CommandRequest, PPTGenerateRequest, PDFGenerateRequest,
    PinItemRequest, SystemStatusResponse, TaskState, TeacherMode, CustomQuizRequest
)
from backend.app.db.database import DatabaseManager, get_session_dir, resolve_frame_path
from backend.app.services.screenshot_service import screenshot_service
from backend.app.services.knowledge_service import knowledge_service
from backend.app.services.rag_service import rag_service
from backend.app.services.teacher_service import teacher_service
from backend.app.services.task_agent_service import task_agent_service
from backend.app.services.ppt_service import ppt_service
from backend.app.services.pdf_service import pdf_service
from backend.app.services.quiz_service import quiz_service
from backend.app.services.demo_service import demo_service
from backend.app.services.video_import_service import video_import_service
from backend.app.services.hyper_ingest_service import hyper_ingest_service
from backend.app.providers.llm_provider import llm_provider
from backend.app.providers.transcription_provider import transcription_provider
from backend.app.providers.ocr_provider import ocr_provider

router = APIRouter()

# ----------------- SYSTEM STATUS & DEMO -----------------
@router.get("/system/status", response_model=SystemStatusResponse)
async def get_system_status():
    ollama_ok = await llm_provider.is_available()
    models = await llm_provider.get_models() if ollama_ok else []
    whisper_ok = await transcription_provider.is_available()
    ocr_ok = await ocr_provider.is_available()

    return SystemStatusResponse(
        ollama_connected=ollama_ok,
        ollama_models=models,
        whisper_available=whisper_ok,
        ocr_available=ocr_ok,
        active_session_id=None,
        current_task_state=TaskState.IDLE,
        system_load={"cpu": "Normal", "memory": "Available"}
    )

@router.post("/demo/seed")
async def seed_demo():
    session_id = demo_service.seed_demo_session()
    return {"status": "SUCCESS", "session_id": session_id, "message": "High-yield educational demo session loaded!"}

# ----------------- SESSIONS -----------------
@router.post("/sessions", response_model=LearningSession)
async def create_session(req: CreateSessionRequest):
    session = LearningSession(
        title=req.title,
        source_platform=req.source_platform or "Chrome Tab",
        source_url_or_title=req.source_url_or_title or "Authorized Educational Source",
        status=TaskState.OBSERVING
    )
    return DatabaseManager.create_session(session)

@router.get("/sessions", response_model=List[LearningSession])
async def list_sessions(limit: int = 50):
    return DatabaseManager.list_sessions(limit=limit)

@router.get("/sessions/{session_id}", response_model=LearningSession)
async def get_session(session_id: str):
    s = DatabaseManager.get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s

@router.patch("/sessions/{session_id}")
async def update_session(session_id: str, req: UpdateSessionRequest):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    DatabaseManager.update_session(session_id, updates)
    return {"status": "UPDATED"}

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    DatabaseManager.delete_session(session_id)
    return {"status": "DELETED"}

# ----------------- TRANSCRIPTS -----------------
@router.get("/sessions/{session_id}/transcript", response_model=List[TranscriptSegment])
async def get_transcripts(session_id: str):
    return DatabaseManager.get_transcript_segments(session_id)

@router.post("/sessions/{session_id}/transcript")
async def add_transcript(session_id: str, segment: TranscriptSegment):
    segment.session_id = session_id
    DatabaseManager.add_transcript_segment(segment)
    # Extract knowledge
    await knowledge_service.extract_knowledge_from_chunk(
        session_id=session_id,
        transcript_text=segment.text,
        timestamp_formatted=segment.timestamp_formatted
    )
    return {"status": "ADDED", "id": segment.id}

# ----------------- FRAMES & SCREENSHOTS -----------------
@router.get("/sessions/{session_id}/frames", response_model=List[FrameCapture])
async def get_frames(session_id: str):
    return DatabaseManager.get_frames(session_id)

@router.post("/sessions/{session_id}/frames")
async def upload_frame(
    session_id: str,
    timestamp_sec: float = Form(...),
    force: bool = Form(False),
    file: UploadFile = File(...)
):
    content = await file.read()
    frame_capture = await screenshot_service.process_frame_data(
        session_id=session_id,
        image_bytes=content,
        timestamp_sec=timestamp_sec,
        force_capture=force
    )
    if not frame_capture:
        return {"status": "SKIPPED_DUPLICATE"}
    
    # Extract knowledge if frame contains OCR text
    if frame_capture.ocr_text:
        await knowledge_service.extract_knowledge_from_chunk(
            session_id=session_id,
            transcript_text=frame_capture.ocr_text,
            timestamp_formatted=frame_capture.timestamp_formatted,
            frame=frame_capture
        )

    return {"status": "CAPTURED", "frame": frame_capture}

@router.post("/sessions/{session_id}/audio-chunk")
async def upload_audio_chunk(
    session_id: str,
    timestamp_sec: float = Form(...),
    speaker: str = Form("Instructor"),
    file: UploadFile = File(...)
):
    audio_bytes = await file.read()
    from backend.app.providers.transcription_provider import transcription_provider
    segments = await transcription_provider.transcribe_audio_bytes(audio_bytes, speaker_hint=speaker)
    saved_segments = []
    for s in segments:
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
        await knowledge_service.extract_knowledge_from_chunk(
            session_id=session_id,
            transcript_text=seg_text,
            timestamp_formatted=formatted_ts
        )
        saved_segments.append(segment)
    return {"status": "TRANSCRIBED", "count": len(saved_segments), "segments": saved_segments}

def generate_fallback_slide_svg(category: str = "SLIDE", description: str = "Lecture Slide", timestamp_str: str = "00:00") -> bytes:
    """Generates a crisp, dark metallic SVG slide visual when an image file is not on disk."""
    import html
    safe_cat = html.escape(str(category or "SLIDE").upper())
    safe_desc = html.escape(str(description or "Visual Lecture Slide")[:80])
    safe_ts = html.escape(str(timestamp_str or "00:00"))
    
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090d16" />
          <stop offset="50%" stop-color="#111827" />
          <stop offset="100%" stop-color="#090d16" />
        </linearGradient>
        <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#0284c7" stop-opacity="0.05"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect x="30" y="30" width="1220" height="660" rx="20" fill="none" stroke="#334155" stroke-width="2"/>
      <rect x="45" y="45" width="1190" height="630" rx="16" fill="url(#glow)"/>
      
      <!-- Top header bar -->
      <g transform="translate(70, 95)">
        <rect width="160" height="40" rx="8" fill="#0284c7" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="80" y="26" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="1">[{safe_cat}]</text>
        
        <rect x="980" y="0" width="140" height="40" rx="8" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
        <text x="1050" y="26" font-family="monospace" font-size="16" font-weight="600" fill="#94a3b8" text-anchor="middle">{safe_ts}</text>
      </g>
      
      <!-- Center Graphic: Slide Presentation Canvas -->
      <g transform="translate(640, 360)">
        <circle r="60" fill="#1e293b" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6 4"/>
        <path d="M -22 -20 L 28 0 L -22 20 Z" fill="#38bdf8" fill-opacity="0.85"/>
        <text x="0" y="110" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="#f8fafc" text-anchor="middle">{safe_desc}</text>
        <text x="0" y="145" font-family="system-ui, sans-serif" font-size="15" fill="#64748b" text-anchor="middle">LearnLens AI Multimodal Visual Evidence Frame</text>
      </g>
    </svg>"""
    return svg.encode("utf-8")

@router.get("/frames/{frame_id}/image")
async def get_frame_image(frame_id: str):
    from backend.app.db.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT session_id, image_path, thumbnail_path, category, visual_description, timestamp_formatted FROM frames WHERE id = ?", (frame_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        resolved = resolve_frame_path(row["image_path"], row["session_id"])
        if not resolved and row["thumbnail_path"]:
            resolved = resolve_frame_path(row["thumbnail_path"], row["session_id"])
        if resolved and resolved.is_file():
            return FileResponse(str(resolved), media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})
        
        # Return elegant SVG slide visual fallback
        svg_data = generate_fallback_slide_svg(
            category=row["category"] or "SLIDE",
            description=row["visual_description"] or "Lecture Slide Capture",
            timestamp_str=row["timestamp_formatted"] or "00:00"
        )
        return Response(content=svg_data, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=3600"})

    # Even for unknown ID, return graceful generic slide fallback rather than 404
    svg_data = generate_fallback_slide_svg("SLIDE", "Lecture Slide Capture", "00:00")
    return Response(content=svg_data, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=300"})

@router.get("/frames/{frame_id}/thumbnail")
async def get_frame_thumbnail(frame_id: str):
    from backend.app.db.database import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT session_id, thumbnail_path, image_path, category, visual_description, timestamp_formatted FROM frames WHERE id = ?", (frame_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        resolved = None
        if row["thumbnail_path"]:
            resolved = resolve_frame_path(row["thumbnail_path"], row["session_id"])
        if not resolved and row["image_path"]:
            resolved = resolve_frame_path(row["image_path"], row["session_id"])
        if resolved and resolved.is_file():
            return FileResponse(str(resolved), media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})

        # Return elegant SVG slide thumbnail fallback
        svg_data = generate_fallback_slide_svg(
            category=row["category"] or "SLIDE",
            description=row["visual_description"] or "Lecture Slide Capture",
            timestamp_str=row["timestamp_formatted"] or "00:00"
        )
        return Response(content=svg_data, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=3600"})

    svg_data = generate_fallback_slide_svg("SLIDE", "Lecture Slide Capture", "00:00")
    return Response(content=svg_data, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=300"})

# ----------------- CONCEPTS -----------------
@router.get("/sessions/{session_id}/concepts", response_model=List[Concept])
async def get_concepts(session_id: str):
    return DatabaseManager.get_concepts(session_id)

# ----------------- CHAT & AI TEACHER -----------------
@router.get("/sessions/{session_id}/chat", response_model=List[ChatMessage])
async def get_chat_history(session_id: str):
    return DatabaseManager.get_chat_messages(session_id)

@router.post("/sessions/{session_id}/chat", response_model=ChatMessage)
async def chat_with_teacher(session_id: str, req: ChatRequest):
    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        sender="user",
        text=req.message,
        mode=req.mode
    )
    DatabaseManager.add_chat_message(user_msg)

    # Generate teacher response
    assistant_msg = await teacher_service.teach(
        session_id=session_id,
        user_message=req.message,
        mode=req.mode,
        cross_session=req.cross_session
    )
    return assistant_msg

# ----------------- HUMAN CONTROL & COMMANDS -----------------
@router.post("/sessions/{session_id}/command")
async def execute_command(session_id: str, req: CommandRequest):
    return await task_agent_service.handle_user_command(session_id, req.command)

@router.post("/sessions/{session_id}/pause")
async def pause_agent(session_id: str):
    return task_agent_service.pause(session_id)

@router.post("/sessions/{session_id}/resume")
async def resume_agent(session_id: str):
    return task_agent_service.resume(session_id)

@router.post("/sessions/{session_id}/stop")
async def stop_agent(session_id: str):
    return task_agent_service.stop(session_id)

# ----------------- PPT & PDF EXPORTS -----------------
@router.post("/sessions/{session_id}/generate-ppt")
async def generate_ppt(session_id: str, req: PPTGenerateRequest):
    output_path = await ppt_service.generate_presentation(
        session_id=session_id,
        style=req.style,
        slide_count=req.slide_count,
        custom_focus=req.custom_focus
    )
    filename = os.path.basename(output_path)
    return {"status": "SUCCESS", "filename": filename, "download_url": f"/api/exports/{session_id}/{filename}"}

@router.post("/sessions/{session_id}/generate-pdf")
async def generate_pdf(session_id: str, req: PDFGenerateRequest):
    output_path = await pdf_service.generate_pdf(
        session_id=session_id,
        pdf_type=req.pdf_type
    )
    filename = os.path.basename(output_path)
    return {"status": "SUCCESS", "filename": filename, "download_url": f"/api/exports/{session_id}/{filename}"}

@router.get("/exports/{session_id}/{filename}")
async def download_export(session_id: str, filename: str):
    session_dir = get_session_dir(session_id)
    target = session_dir / "exports" / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation" if filename.endswith(".pptx") else "application/pdf"
    return FileResponse(str(target), media_type=media_type, filename=filename)

# ----------------- QUIZ & PRACTICE -----------------
@router.post("/sessions/{session_id}/quiz/import")
async def import_quiz(session_id: str, file: UploadFile = File(...)):
    session_dir = get_session_dir(session_id)
    tmp_path = session_dir / f"uploaded_quiz_{int(time.time())}.pdf"
    with open(tmp_path, "wb") as f:
        f.write(await file.read())
    questions = await quiz_service.import_quiz_pdf(session_id, str(tmp_path))
    return {"status": "IMPORTED", "count": len(questions), "questions": questions}

@router.get("/sessions/{session_id}/quiz")
async def get_quiz(session_id: str):
    return await quiz_service.generate_questions_for_session(session_id, force_refresh=False)

@router.post("/sessions/{session_id}/quiz/generate")
async def generate_quiz(session_id: str):
    questions = await quiz_service.generate_questions_for_session(session_id, force_refresh=True)
    return {"status": "SUCCESS", "count": len(questions), "questions": questions}

@router.post("/sessions/{session_id}/quiz/custom")
async def create_custom_quiz(session_id: str, req: CustomQuizRequest):
    questions = await quiz_service.generate_custom_quiz(
        session_id=session_id,
        concept_name=req.concept_name,
        count=req.num_questions,
        difficulty=req.difficulty or "MEDIUM"
    )
    return {"status": "SUCCESS", "count": len(questions), "questions": questions}

@router.post("/quiz/{question_id}/submit")
async def submit_quiz_answer(question_id: str, answer_data: dict):
    selected_idx = answer_data.get("selected_option_index", 0)
    result = quiz_service.submit_practice_answer(question_id, selected_idx)
    return result

# ----------------- LEARNER PROFILE -----------------
@router.get("/sessions/{session_id}/learner-profile")
async def get_learner_profile(session_id: str):
    return DatabaseManager.get_learner_profile(session_id)

# ----------------- SEARCH & PINNING -----------------
@router.get("/search")
async def search_endpoint(q: str = Query(...), session_id: Optional[str] = Query(None)):
    return DatabaseManager.search_all(query=q, session_id=session_id)

@router.post("/pin")
async def toggle_pin_endpoint(req: PinItemRequest):
    success = DatabaseManager.toggle_pin(req.item_type, req.item_id, req.is_pinned)
    return {"status": "SUCCESS" if success else "FAILED"}

# ----------------- OFFLINE VIDEO IMPORT & HYPERINGEST -----------------
@router.post("/video/import")
async def import_video(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    import time
    from backend.app.core.config import SESSIONS_DIR
    tmp_path = SESSIONS_DIR / f"temp_{int(time.time())}_{file.filename}"
    with open(tmp_path, "wb") as f:
        f.write(await file.read())
    session_id = await video_import_service.process_video_file(str(tmp_path), title=title)
    if tmp_path.exists():
        os.remove(tmp_path)
    return {"status": "PROCESSED", "session_id": session_id}

@router.post("/video/hyper-ingest")
async def hyper_ingest_endpoint(files: List[UploadFile] = File(...), title: Optional[str] = Form(None)):
    """
    HyperIngest Batch Endpoint: Ingests 10-100 videos in parallel/accelerated mode,
    capturing only genuine 16:9 slide transitions at 50x-100x realtime.
    """
    import time
    from backend.app.core.config import SESSIONS_DIR
    batch_dir = SESSIONS_DIR / f"hyper_batch_{int(time.time())}"
    batch_dir.mkdir(parents=True, exist_ok=True)
    
    saved_paths = []
    try:
        for f in files:
            t_path = batch_dir / f.filename
            with open(t_path, "wb") as out_f:
                out_f.write(await f.read())
            saved_paths.append(str(t_path))
            
        session_id = await hyper_ingest_service.ingest_video_batch(saved_paths, course_title=title)
        return {
            "status": "COMPLETED",
            "session_id": session_id,
            "total_videos": len(saved_paths),
            "message": f"Successfully ingested {len(saved_paths)} videos in accelerated mode."
        }
    finally:
        # Cleanup uploaded raw videos
        try:
            shutil.rmtree(batch_dir, ignore_errors=True)
        except Exception:
            pass

@router.get("/video/hyper-ingest/status")
async def get_hyper_ingest_status():
    return hyper_ingest_service.get_status()

class HyperIngestUrlRequest(BaseModel):
    url: str
    title: Optional[str] = None
    max_videos: Optional[int] = 50

@router.post("/video/hyper-ingest-url")
async def hyper_ingest_url_endpoint(req: HyperIngestUrlRequest):
    """
    HyperIngest URL Endpoint: Ingests YouTube playlists, videos, or course web links,
    extracting 16:9 slides and completing courses in accelerated mode.
    """
    session_id = await hyper_ingest_service.ingest_url(
        url=req.url,
        course_title=req.title,
        max_videos=req.max_videos or 50
    )
    return {
        "status": "COMPLETED",
        "session_id": session_id,
        "message": f"Successfully ingested course stream from {req.url}"
    }

@router.post("/sessions/{session_id}/export/slide-pdf")
async def export_slide_only_pdf(session_id: str):
    """
    Generates pure 16:9 widescreen slide deck PDF matching exact video dimensions
    with full-bleed slide images and zero margins.
    """
    output_path = await pdf_service.generate_pdf(session_id, pdf_type="slide_only")
    filename = os.path.basename(output_path)
    return {"status": "SUCCESS", "filename": filename, "download_url": f"/api/exports/{session_id}/{filename}"}

@router.post("/sessions/{session_id}/export/slide-pptx")
async def export_slide_only_pptx(session_id: str):
    """
    Generates pure 16:9 widescreen PowerPoint deck matching exact video dimensions.
    """
    output_path = await ppt_service.generate_slide_only_presentation(session_id)
    filename = os.path.basename(output_path)
    return {"status": "SUCCESS", "filename": filename, "download_url": f"/api/exports/{session_id}/{filename}"}

# ----------------- SYSTEM SETTINGS & RUNTIME CONTROL -----------------
class SystemSettingsUpdate(BaseModel):
    fast_mode: Optional[bool] = None
    default_model: Optional[str] = None
    enable_live_vlm: Optional[bool] = None
    enable_live_whisper: Optional[bool] = None

@router.get("/system/settings")
async def get_system_settings():
    models = await llm_provider.get_models()
    return {
        "fast_mode": settings.FAST_MODE,
        "default_llm_model": settings.DEFAULT_LLM_MODEL,
        "enable_live_vlm": settings.ENABLE_LIVE_VLM,
        "enable_live_whisper": settings.ENABLE_LIVE_WHISPER,
        "ollama_timeout_sec": settings.OLLAMA_TIMEOUT_SEC,
        "installed_models": models
    }

@router.post("/system/settings")
async def update_system_settings(req: SystemSettingsUpdate):
    if req.fast_mode is not None:
        settings.FAST_MODE = req.fast_mode
    if req.default_model:
        settings.DEFAULT_LLM_MODEL = req.default_model
        llm_provider.model = req.default_model
    if req.enable_live_vlm is not None:
        settings.ENABLE_LIVE_VLM = req.enable_live_vlm
    if req.enable_live_whisper is not None:
        settings.ENABLE_LIVE_WHISPER = req.enable_live_whisper
    return {"status": "UPDATED", "settings": await get_system_settings()}


