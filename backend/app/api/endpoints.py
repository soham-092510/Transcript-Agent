import os
import shutil
import base64
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, JSONResponse

from backend.app.models.schemas import (
    LearningSession, CreateSessionRequest, UpdateSessionRequest,
    TranscriptSegment, FrameCapture, Concept, ChatMessage,
    ChatRequest, CommandRequest, PPTGenerateRequest, PDFGenerateRequest,
    PinItemRequest, SystemStatusResponse, TaskState, TeacherMode
)
from backend.app.db.database import DatabaseManager, get_session_dir
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

@router.get("/frames/{frame_id}/image")
async def get_frame_image(frame_id: str):
    # Find frame in DB
    conn = DatabaseManager.get_session
    import sqlite3
    from backend.app.core.config import settings
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT image_path FROM frames WHERE id = ?", (frame_id,))
    row = cursor.fetchone()
    conn.close()
    if not row or not os.path.exists(row["image_path"]):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(row["image_path"], media_type="image/jpeg")

@router.get("/frames/{frame_id}/thumbnail")
async def get_frame_thumbnail(frame_id: str):
    import sqlite3
    from backend.app.core.config import settings
    conn = sqlite3.connect(settings.DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT thumbnail_path, image_path FROM frames WHERE id = ?", (frame_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    target = row["thumbnail_path"] if row["thumbnail_path"] and os.path.exists(row["thumbnail_path"]) else row["image_path"]
    if not os.path.exists(target):
        raise HTTPException(status_code=404, detail="Image file missing")
    return FileResponse(target, media_type="image/jpeg")

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
    q_list = DatabaseManager.get_quiz_questions(session_id)
    if not q_list:
        q_list = quiz_service.generate_mock_questions_from_concepts(session_id)
    return q_list

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

