from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import time
import uuid

class TaskState(str, Enum):
    IDLE = "IDLE"
    OBSERVING = "OBSERVING"
    PROCESSING = "PROCESSING"
    WAITING_FOR_USER = "WAITING_FOR_USER"
    PAUSED = "PAUSED"
    INTERRUPTED = "INTERRUPTED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class VisualCategory(str, Enum):
    TITLE = "TITLE"
    SLIDE = "SLIDE"
    DIAGRAM = "DIAGRAM"
    CODE = "CODE"
    TABLE = "TABLE"
    DEFINITION = "DEFINITION"
    EXAMPLE = "EXAMPLE"
    DEMO = "DEMO"
    CONFIGURATION = "CONFIGURATION"
    IMPORTANT = "IMPORTANT"
    LOW_VALUE = "LOW_VALUE"

class TeacherMode(str, Enum):
    SIMPLE = "simple"
    DETAILED = "detailed"
    EXAM = "exam"
    QUICK_REVISION = "quick_revision"
    EXAMPLE = "example"
    TEACH_FROM_SCRATCH = "teach_from_scratch"
    ACTIVE_RECALL = "active_recall"
    FLASHCARDS = "flashcards"
    PRACTICE_QUIZ = "practice_quiz"
    WEAK_AREAS = "weak_areas"
    COMPARE = "compare"
    ASK_ANYTHING = "ask_anything"

class PPTStyle(str, Enum):
    QUICK = "quick"
    DETAILED = "detailed"
    TEACHING = "teaching"
    EXAM = "exam"
    VISUAL = "visual"

# Transcript Segment
class TranscriptSegment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    timestamp_start: float
    timestamp_end: float
    timestamp_formatted: str
    speaker: Optional[str] = "Instructor"
    text: str
    confidence: float = 0.95
    topic: Optional[str] = "General"
    associated_frame_id: Optional[str] = None

# Frame Capture
class FrameCapture(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    timestamp_sec: float
    timestamp_formatted: str
    image_path: str
    thumbnail_path: Optional[str] = None
    p_hash: Optional[str] = None
    ocr_text: str = ""
    visual_description: str = ""
    category: VisualCategory = VisualCategory.SLIDE
    importance_score: float = 0.5
    concepts: List[str] = []
    is_pinned: bool = False

# Concept
class Concept(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    name: str
    definition: str
    simple_explanation: Optional[str] = None
    deep_explanation: Optional[str] = None
    evidence_timestamp: Optional[str] = None
    evidence_frame_id: Optional[str] = None
    related_concepts: List[str] = []
    exam_importance: str = "High"  # High, Medium, Low
    difficulty: str = "Medium"     # Beginner, Intermediate, Advanced
    confidence: float = 0.9
    is_pinned: bool = False

# Evidence Citation
class EvidenceItem(BaseModel):
    timestamp: str
    timestamp_sec: Optional[float] = None
    frame_id: Optional[str] = None
    thumbnail_url: Optional[str] = None
    quote: Optional[str] = None
    concept_name: Optional[str] = None

# Chat Message
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    sender: str  # "user" | "assistant" | "system"
    text: str
    mode: Optional[TeacherMode] = TeacherMode.SIMPLE
    timestamp: float = Field(default_factory=time.time)
    evidence: List[EvidenceItem] = []
    is_pinned: bool = False

# Quiz Question
class QuizQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    question: str
    options: List[str]
    correct_option_index: int
    concept_tested: str
    relevant_timestamp: Optional[str] = None
    explanation: str
    user_answer_index: Optional[int] = None
    is_bookmarked: bool = False

# Learner Memory
class LearnerProfile(BaseModel):
    session_id: str
    concepts_viewed: List[str] = []
    concepts_grasped: List[str] = []
    concepts_struggling: List[str] = []
    questions_asked_count: int = 0
    pinned_count: int = 0
    practice_accuracy: float = 0.0
    weak_areas: List[str] = []
    notes_summary: str = ""

# Learning Session
class LearningSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    source_platform: str = "Chrome Tab"
    source_url_or_title: str = "Educational Source"
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    duration_sec: float = 0.0
    progress_pct: int = 0
    status: TaskState = TaskState.IDLE
    is_pinned: bool = False
    tags: List[str] = []
    topic_count: int = 0
    concept_count: int = 0
    screenshot_count: int = 0
    question_count: int = 0

# API Request/Response models
class CreateSessionRequest(BaseModel):
    title: str
    source_platform: Optional[str] = "Chrome Tab"
    source_url_or_title: Optional[str] = "Authorized Educational Tab"

class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    tags: Optional[List[str]] = None

class ChatRequest(BaseModel):
    session_id: str
    message: str
    mode: TeacherMode = TeacherMode.SIMPLE
    cross_session: bool = False

class CommandRequest(BaseModel):
    session_id: str
    command: str

class PPTGenerateRequest(BaseModel):
    session_id: str
    style: PPTStyle = PPTStyle.TEACHING
    slide_count: int = 8
    custom_focus: Optional[str] = None

class PDFGenerateRequest(BaseModel):
    session_id: str
    pdf_type: str = "teaching_report"  # "visual_pack" or "teaching_report"

class PinItemRequest(BaseModel):
    item_type: str  # "concept" | "frame" | "message" | "segment"
    item_id: str
    is_pinned: bool = True

class CustomQuizRequest(BaseModel):
    concept_name: str
    num_questions: int = Field(default=5, ge=1, le=20)
    difficulty: Optional[str] = "MEDIUM"

class SystemStatusResponse(BaseModel):
    ollama_connected: bool
    ollama_models: List[str] = []
    whisper_available: bool
    ocr_available: bool
    active_session_id: Optional[str] = None
    current_task_state: TaskState = TaskState.IDLE
    system_load: Dict[str, Any] = {}
