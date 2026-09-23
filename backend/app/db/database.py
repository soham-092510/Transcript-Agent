import sqlite3
import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from backend.app.core.config import settings, SESSIONS_DIR
from backend.app.models.schemas import (
    LearningSession, TranscriptSegment, FrameCapture, Concept,
    ChatMessage, QuizQuestion, LearnerProfile, TaskState, VisualCategory, TeacherMode
)

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DB_PATH), timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        conn.execute("PRAGMA synchronous=NORMAL;")
    except Exception:
        pass
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source_platform TEXT DEFAULT 'Chrome Tab',
        source_url_or_title TEXT,
        created_at REAL,
        updated_at REAL,
        duration_sec REAL DEFAULT 0.0,
        progress_pct INTEGER DEFAULT 0,
        status TEXT DEFAULT 'IDLE',
        is_pinned INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        topic_count INTEGER DEFAULT 0,
        concept_count INTEGER DEFAULT 0,
        screenshot_count INTEGER DEFAULT 0,
        question_count INTEGER DEFAULT 0
    )
    """)
    
    # Transcript segments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transcript_segments (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        timestamp_start REAL,
        timestamp_end REAL,
        timestamp_formatted TEXT,
        speaker TEXT,
        text TEXT NOT NULL,
        confidence REAL DEFAULT 0.95,
        topic TEXT,
        associated_frame_id TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)
    
    # Frames table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS frames (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        timestamp_sec REAL,
        timestamp_formatted TEXT,
        image_path TEXT NOT NULL,
        thumbnail_path TEXT,
        p_hash TEXT,
        ocr_text TEXT DEFAULT '',
        visual_description TEXT DEFAULT '',
        category TEXT DEFAULT 'SLIDE',
        importance_score REAL DEFAULT 0.5,
        concepts TEXT DEFAULT '[]',
        is_pinned INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)
    
    # Concepts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS concepts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        definition TEXT NOT NULL,
        simple_explanation TEXT,
        deep_explanation TEXT,
        evidence_timestamp TEXT,
        evidence_frame_id TEXT,
        related_concepts TEXT DEFAULT '[]',
        exam_importance TEXT DEFAULT 'High',
        difficulty TEXT DEFAULT 'Medium',
        confidence REAL DEFAULT 0.9,
        is_pinned INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)
    
    # Chat Messages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        mode TEXT DEFAULT 'simple',
        timestamp REAL,
        evidence TEXT DEFAULT '[]',
        is_pinned INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)
    
    # Quiz Questions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        question TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_option_index INTEGER,
        concept_tested TEXT,
        relevant_timestamp TEXT,
        explanation TEXT,
        user_answer_index INTEGER,
        is_bookmarked INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)
    
    # Learner Profiles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS learner_profiles (
        session_id TEXT PRIMARY KEY,
        concepts_viewed TEXT DEFAULT '[]',
        concepts_grasped TEXT DEFAULT '[]',
        concepts_struggling TEXT DEFAULT '[]',
        questions_asked_count INTEGER DEFAULT 0,
        pinned_count INTEGER DEFAULT 0,
        practice_accuracy REAL DEFAULT 0.0,
        weak_areas TEXT DEFAULT '[]',
        notes_summary TEXT DEFAULT '',
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()

# Session directory management
def get_session_dir(session_id: str) -> Path:
    s_dir = SESSIONS_DIR / session_id
    (s_dir / "screenshots").mkdir(parents=True, exist_ok=True)
    (s_dir / "exports").mkdir(parents=True, exist_ok=True)
    return s_dir

class DatabaseManager:
    @staticmethod
    def create_session(session: LearningSession) -> LearningSession:
        get_session_dir(session.id)
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO sessions (id, title, source_platform, source_url_or_title, created_at, updated_at, duration_sec, progress_pct, status, is_pinned, tags, topic_count, concept_count, screenshot_count, question_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session.id, session.title, session.source_platform, session.source_url_or_title,
            session.created_at, session.updated_at, session.duration_sec, session.progress_pct,
            session.status.value, 1 if session.is_pinned else 0, json.dumps(session.tags),
            session.topic_count, session.concept_count, session.screenshot_count, session.question_count
        ))
        # initialize learner profile
        cursor.execute("""
        INSERT INTO learner_profiles (session_id) VALUES (?)
        """, (session.id,))
        
        conn.commit()
        conn.close()
        return session

    @staticmethod
    def get_session(session_id: str) -> Optional[LearningSession]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return LearningSession(
            id=row["id"],
            title=row["title"],
            source_platform=row["source_platform"],
            source_url_or_title=row["source_url_or_title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            duration_sec=row["duration_sec"],
            progress_pct=row["progress_pct"],
            status=TaskState(row["status"]),
            is_pinned=bool(row["is_pinned"]),
            tags=json.loads(row["tags"] or "[]"),
            topic_count=row["topic_count"],
            concept_count=row["concept_count"],
            screenshot_count=row["screenshot_count"],
            question_count=row["question_count"]
        )

    @staticmethod
    def list_sessions(limit: int = 50) -> List[LearningSession]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        results = []
        for row in rows:
            results.append(LearningSession(
                id=row["id"],
                title=row["title"],
                source_platform=row["source_platform"],
                source_url_or_title=row["source_url_or_title"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                duration_sec=row["duration_sec"],
                progress_pct=row["progress_pct"],
                status=TaskState(row["status"]),
                is_pinned=bool(row["is_pinned"]),
                tags=json.loads(row["tags"] or "[]"),
                topic_count=row["topic_count"],
                concept_count=row["concept_count"],
                screenshot_count=row["screenshot_count"],
                question_count=row["question_count"]
            ))
        return results

    @staticmethod
    def update_session(session_id: str, updates: Dict[str, Any]):
        conn = get_db_connection()
        cursor = conn.cursor()
        set_clauses = []
        values = []
        for k, v in updates.items():
            set_clauses.append(f"{k} = ?")
            if isinstance(v, (dict, list)):
                values.append(json.dumps(v))
            elif isinstance(v, bool):
                values.append(1 if v else 0)
            elif isinstance(v, TaskState):
                values.append(v.value)
            else:
                values.append(v)
        values.append(session_id)
        query = f"UPDATE sessions SET {', '.join(set_clauses)} WHERE id = ?"
        cursor.execute(query, tuple(values))
        conn.commit()
        conn.close()

    @staticmethod
    def delete_session(session_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        cursor.execute("DELETE FROM transcript_segments WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM frames WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM concepts WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM quiz_questions WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM learner_profiles WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
        
        # remove disk files
        s_dir = SESSIONS_DIR / session_id
        if s_dir.exists():
            import shutil
            shutil.rmtree(s_dir, ignore_errors=True)

    @staticmethod
    def add_transcript_segment(segment: TranscriptSegment):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO transcript_segments (id, session_id, timestamp_start, timestamp_end, timestamp_formatted, speaker, text, confidence, topic, associated_frame_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            segment.id, segment.session_id, segment.timestamp_start, segment.timestamp_end,
            segment.timestamp_formatted, segment.speaker, segment.text, segment.confidence,
            segment.topic, segment.associated_frame_id
        ))
        conn.commit()
        conn.close()

    @staticmethod
    def get_transcript_segments(session_id: str) -> List[TranscriptSegment]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM transcript_segments WHERE session_id = ? ORDER BY timestamp_start ASC", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            TranscriptSegment(
                id=r["id"], session_id=r["session_id"], timestamp_start=r["timestamp_start"],
                timestamp_end=r["timestamp_end"], timestamp_formatted=r["timestamp_formatted"],
                speaker=r["speaker"], text=r["text"], confidence=r["confidence"],
                topic=r["topic"], associated_frame_id=r["associated_frame_id"]
            ) for r in rows
        ]

    @staticmethod
    def add_frame(frame: FrameCapture):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO frames (id, session_id, timestamp_sec, timestamp_formatted, image_path, thumbnail_path, p_hash, ocr_text, visual_description, category, importance_score, concepts, is_pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            frame.id, frame.session_id, frame.timestamp_sec, frame.timestamp_formatted,
            frame.image_path, frame.thumbnail_path, frame.p_hash, frame.ocr_text,
            frame.visual_description, frame.category.value, frame.importance_score,
            json.dumps(frame.concepts), 1 if frame.is_pinned else 0
        ))
        # update screenshot count
        cursor.execute("UPDATE sessions SET screenshot_count = screenshot_count + 1 WHERE id = ?", (frame.session_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_frames(session_id: str) -> List[FrameCapture]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM frames WHERE session_id = ? ORDER BY timestamp_sec ASC", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            FrameCapture(
                id=r["id"], session_id=r["session_id"], timestamp_sec=r["timestamp_sec"],
                timestamp_formatted=r["timestamp_formatted"], image_path=r["image_path"],
                thumbnail_path=r["thumbnail_path"], p_hash=r["p_hash"], ocr_text=r["ocr_text"],
                visual_description=r["visual_description"], category=VisualCategory(r["category"]),
                importance_score=r["importance_score"], concepts=json.loads(r["concepts"] or "[]"),
                is_pinned=bool(r["is_pinned"])
            ) for r in rows
        ]

    @staticmethod
    def get_latest_frame(session_id: str) -> Optional[FrameCapture]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM frames WHERE session_id = ? ORDER BY rowid DESC LIMIT 1", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        return FrameCapture(
            id=row["id"], session_id=row["session_id"], timestamp_sec=row["timestamp_sec"],
            timestamp_formatted=row["timestamp_formatted"], image_path=row["image_path"],
            thumbnail_path=row["thumbnail_path"], p_hash=row["p_hash"], ocr_text=row["ocr_text"],
            visual_description=row["visual_description"], category=VisualCategory(row["category"]),
            importance_score=row["importance_score"], concepts=json.loads(row["concepts"] or "[]"),
            is_pinned=bool(row["is_pinned"])
        )

    @staticmethod
    def update_frame_metadata(frame_id: str, updates: Dict[str, Any]):
        conn = get_db_connection()
        cursor = conn.cursor()
        set_clauses = []
        values = []
        for k, v in updates.items():
            set_clauses.append(f"{k} = ?")
            if isinstance(v, (dict, list)):
                values.append(json.dumps(v))
            elif isinstance(v, bool):
                values.append(1 if v else 0)
            elif hasattr(v, "value"):
                values.append(v.value)
            else:
                values.append(v)
        values.append(frame_id)
        query = f"UPDATE frames SET {', '.join(set_clauses)} WHERE id = ?"
        cursor.execute(query, tuple(values))
        conn.commit()
        conn.close()

    @staticmethod
    def add_concept(concept: Concept):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO concepts (id, session_id, name, definition, simple_explanation, deep_explanation, evidence_timestamp, evidence_frame_id, related_concepts, exam_importance, difficulty, confidence, is_pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            concept.id, concept.session_id, concept.name, concept.definition,
            concept.simple_explanation, concept.deep_explanation, concept.evidence_timestamp,
            concept.evidence_frame_id, json.dumps(concept.related_concepts),
            concept.exam_importance, concept.difficulty, concept.confidence,
            1 if concept.is_pinned else 0
        ))
        cursor.execute("UPDATE sessions SET concept_count = concept_count + 1 WHERE id = ?", (concept.session_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_concepts(session_id: str) -> List[Concept]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM concepts WHERE session_id = ? ORDER BY is_pinned DESC, name ASC", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            Concept(
                id=r["id"], session_id=r["session_id"], name=r["name"], definition=r["definition"],
                simple_explanation=r["simple_explanation"], deep_explanation=r["deep_explanation"],
                evidence_timestamp=r["evidence_timestamp"], evidence_frame_id=r["evidence_frame_id"],
                related_concepts=json.loads(r["related_concepts"] or "[]"),
                exam_importance=r["exam_importance"], difficulty=r["difficulty"],
                confidence=r["confidence"], is_pinned=bool(r["is_pinned"])
            ) for r in rows
        ]

    @staticmethod
    def add_chat_message(msg: ChatMessage):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO chat_messages (id, session_id, sender, text, mode, timestamp, evidence, is_pinned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            msg.id, msg.session_id, msg.sender, msg.text,
            msg.mode.value if msg.mode else "simple", msg.timestamp,
            json.dumps([e.dict() for e in msg.evidence]), 1 if msg.is_pinned else 0
        ))
        conn.commit()
        conn.close()

    @staticmethod
    def get_chat_messages(session_id: str) -> List[ChatMessage]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        messages = []
        for r in rows:
            evidence_data = json.loads(r["evidence"] or "[]")
            messages.append(ChatMessage(
                id=r["id"], session_id=r["session_id"], sender=r["sender"],
                text=r["text"], mode=TeacherMode(r["mode"]) if r["mode"] else TeacherMode.SIMPLE,
                timestamp=r["timestamp"], evidence=evidence_data, is_pinned=bool(r["is_pinned"])
            ))
        return messages

    @staticmethod
    def add_quiz_question(q: QuizQuestion):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO quiz_questions (id, session_id, question, options, correct_option_index, concept_tested, relevant_timestamp, explanation, user_answer_index, is_bookmarked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            q.id, q.session_id, q.question, json.dumps(q.options), q.correct_option_index,
            q.concept_tested, q.relevant_timestamp, q.explanation, q.user_answer_index,
            1 if q.is_bookmarked else 0
        ))
        cursor.execute("UPDATE sessions SET question_count = question_count + 1 WHERE id = ?", (q.session_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_quiz_questions(session_id: str) -> List[QuizQuestion]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quiz_questions WHERE session_id = ?", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            QuizQuestion(
                id=r["id"], session_id=r["session_id"], question=r["question"],
                options=json.loads(r["options"] or "[]"), correct_option_index=r["correct_option_index"],
                concept_tested=r["concept_tested"], relevant_timestamp=r["relevant_timestamp"],
                explanation=r["explanation"], user_answer_index=r["user_answer_index"],
                is_bookmarked=bool(r["is_bookmarked"])
            ) for r in rows
        ]

    @staticmethod
    def get_learner_profile(session_id: str) -> LearnerProfile:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM learner_profiles WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return LearnerProfile(session_id=session_id)
        return LearnerProfile(
            session_id=row["session_id"],
            concepts_viewed=json.loads(row["concepts_viewed"] or "[]"),
            concepts_grasped=json.loads(row["concepts_grasped"] or "[]"),
            concepts_struggling=json.loads(row["concepts_struggling"] or "[]"),
            questions_asked_count=row["questions_asked_count"],
            pinned_count=row["pinned_count"],
            practice_accuracy=row["practice_accuracy"],
            weak_areas=json.loads(row["weak_areas"] or "[]"),
            notes_summary=row["notes_summary"] or ""
        )

    @staticmethod
    def update_learner_profile(profile: LearnerProfile):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE learner_profiles SET
            concepts_viewed = ?,
            concepts_grasped = ?,
            concepts_struggling = ?,
            questions_asked_count = ?,
            pinned_count = ?,
            practice_accuracy = ?,
            weak_areas = ?,
            notes_summary = ?
        WHERE session_id = ?
        """, (
            json.dumps(profile.concepts_viewed), json.dumps(profile.concepts_grasped),
            json.dumps(profile.concepts_struggling), profile.questions_asked_count,
            profile.pinned_count, profile.practice_accuracy, json.dumps(profile.weak_areas),
            profile.notes_summary, profile.session_id
        ))
        conn.commit()
        conn.close()

    @staticmethod
    def toggle_pin(item_type: str, item_id: str, is_pinned: bool) -> bool:
        table_map = {
            "session": "sessions",
            "frame": "frames",
            "concept": "concepts",
            "message": "chat_messages",
            "quiz": "quiz_questions"
        }
        table = table_map.get(item_type)
        if not table:
            return False
        col = "is_bookmarked" if item_type == "quiz" else "is_pinned"
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE {table} SET {col} = ? WHERE id = ?", (1 if is_pinned else 0, item_id))
        conn.commit()
        conn.close()
        return True

    @staticmethod
    def search_all(query: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        cursor = conn.cursor()
        q_term = f"%{query}%"
        
        # Concepts search
        if session_id:
            cursor.execute("SELECT * FROM concepts WHERE session_id = ? AND (name LIKE ? OR definition LIKE ? OR simple_explanation LIKE ?)", (session_id, q_term, q_term, q_term))
        else:
            cursor.execute("SELECT * FROM concepts WHERE name LIKE ? OR definition LIKE ? OR simple_explanation LIKE ?", (q_term, q_term, q_term))
        c_rows = cursor.fetchall()
        
        # Transcript search
        if session_id:
            cursor.execute("SELECT * FROM transcript_segments WHERE session_id = ? AND text LIKE ?", (session_id, q_term))
        else:
            cursor.execute("SELECT * FROM transcript_segments WHERE text LIKE ?", (q_term,))
        t_rows = cursor.fetchall()
        
        # Frames search
        if session_id:
            cursor.execute("SELECT * FROM frames WHERE session_id = ? AND (ocr_text LIKE ? OR visual_description LIKE ?)", (session_id, q_term, q_term))
        else:
            cursor.execute("SELECT * FROM frames WHERE ocr_text LIKE ? OR visual_description LIKE ?", (q_term, q_term))
        f_rows = cursor.fetchall()
        
        conn.close()
        return {
            "concepts": [dict(r) for r in c_rows],
            "transcripts": [dict(r) for r in t_rows],
            "frames": [dict(r) for r in f_rows]
        }
