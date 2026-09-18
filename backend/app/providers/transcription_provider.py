import logging
import os
from typing import List, Dict, Any
from backend.app.providers.base import TranscriptionProvider
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class LocalWhisperTranscriptionProvider(TranscriptionProvider):
    def __init__(self, model_size: str = settings.WHISPER_MODEL):
        self.model_size = model_size
        self._model = None
        self._checked = False

    def _load_model(self):
        if self._model is None and not self._checked:
            try:
                from faster_whisper import WhisperModel
                logger.info(f"Loading faster-whisper model ({self.model_size})...")
                self._model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
            except Exception as e:
                logger.warning(f"faster-whisper not available: {e}. Transcripts will be received from stream.")
            self._checked = True
        return self._model

    async def is_available(self) -> bool:
        return self._load_model() is not None

    async def transcribe_audio_file(self, audio_path: str) -> List[Dict[str, Any]]:
        model = self._load_model()
        if model is not None:
            try:
                segments, _ = model.transcribe(audio_path, beam_size=5)
                results = []
                for s in segments:
                    results.append({
                        "start": s.start,
                        "end": s.end,
                        "text": s.text.strip(),
                        "confidence": 0.95
                    })
                return results
            except Exception as e:
                logger.error(f"Whisper transcription failed: {e}")
        return []

transcription_provider = LocalWhisperTranscriptionProvider()
