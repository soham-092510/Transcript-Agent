import os
from pathlib import Path

# Base directory for the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
SESSIONS_DIR = DATA_DIR / "sessions"
DOCS_DIR = BASE_DIR / "docs"

# Ensure runtime directories exist
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
DOCS_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "LearnLens AI"
    VERSION: str = "1.0.0"
    TAGLINE: str = "Show your AI what you are learning."
    API_PREFIX: str = "/api"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Model Configurations
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    DEFAULT_LLM_MODEL: str = os.getenv("DEFAULT_LLM_MODEL", "qwen2.5:latest")
    DEFAULT_VLM_MODEL: str = os.getenv("DEFAULT_VLM_MODEL", "qwen2.5-vl:latest")
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    
    # Processing limits & parameters
    FRAME_SAMPLE_INTERVAL_SEC: float = 2.0
    PERCEPTUAL_HASH_DIFF_THRESHOLD: int = 4
    MIN_OCR_CHARS_SIGNIFICANT: int = 15
    MAX_SESSION_FRAMES_IN_PPT: int = 15
    
    # Database
    DB_PATH: Path = DATA_DIR / "learnlens.db"

settings = Settings()
