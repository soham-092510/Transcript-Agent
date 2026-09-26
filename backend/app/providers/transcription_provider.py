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
        if model is None:
            return []

        def _sync_transcribe():
            try:
                lang = getattr(settings, "WHISPER_LANGUAGE", "en")
                segments, _ = model.transcribe(
                    audio_path,
                    beam_size=1,
                    best_of=1,
                    temperature=0.0,
                    language=lang,
                    vad_filter=True,
                    condition_on_previous_text=False,
                    initial_prompt="The following is a clear educational lecture transcript.",
                    vad_parameters=dict(min_silence_duration_ms=250, speech_pad_ms=150),
                    word_timestamps=False,
                    no_speech_threshold=0.6,
                    compression_ratio_threshold=2.4,
                )
                results = []
                for s in segments:
                    seg_text = s.text.strip()
                    if seg_text:
                        results.append({
                            "start": s.start,
                            "end": s.end,
                            "text": seg_text,
                            "confidence": 0.95
                        })
                return results
            except Exception as e:
                logger.error(f"Whisper transcription failed: {e}")
                return []

        import asyncio
        return await asyncio.to_thread(_sync_transcribe)

    async def transcribe_audio_bytes(self, audio_bytes: bytes, speaker_hint: str = "Instructor") -> List[Dict[str, Any]]:
        if not audio_bytes:
            return []

        model = self._load_model()
        if model is None:
            return []

        import io
        import asyncio

        def _sync_transcribe_bytes():
            try:
                lang = getattr(settings, "WHISPER_LANGUAGE", "en")
                
                # If valid WAV (starts with 'RIFF') or WebM, transcribe directly from in-memory BytesIO
                is_wav = audio_bytes[:4] == b'RIFF'
                is_webm = audio_bytes[:4] == b'\x1a\x45\xdf\xa3'

                _transcribe_kwargs = dict(
                    beam_size=1,
                    best_of=1,
                    temperature=0.0,
                    language=lang,
                    vad_filter=True,
                    condition_on_previous_text=False,
                    initial_prompt="The following is a clear educational lecture transcript.",
                    vad_parameters=dict(min_silence_duration_ms=250, speech_pad_ms=150),
                    word_timestamps=False,
                    no_speech_threshold=0.6,
                    compression_ratio_threshold=2.4,
                )

                if is_wav or is_webm:
                    try:
                        audio_stream = io.BytesIO(audio_bytes)
                        segments, _ = model.transcribe(audio_stream, **_transcribe_kwargs)
                        results = []
                        for s in segments:
                            seg_text = s.text.strip()
                            if seg_text:
                                results.append({
                                    "start": s.start,
                                    "end": s.end,
                                    "text": seg_text,
                                    "confidence": 0.95,
                                    "speaker": speaker_hint
                                })
                        return results
                    except Exception as in_mem_err:
                        logger.debug(f"In-memory transcription fallback required: {in_mem_err}")

                # Fallback to temporary file for any legacy formats
                import tempfile
                suffix = ".wav" if is_wav else ".webm"
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name

                try:
                    segments, _ = model.transcribe(tmp_path, **_transcribe_kwargs)
                    results = []
                    for s in segments:
                        seg_text = s.text.strip()
                        if seg_text:
                            results.append({
                                "start": s.start,
                                "end": s.end,
                                "text": seg_text,
                                "confidence": 0.95,
                                "speaker": speaker_hint
                            })
                    return results
                finally:
                    try:
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)
                    except Exception:
                        pass
            except Exception as e:
                logger.error(f"Whisper transcription failed: {e}")
                return []

        return await asyncio.to_thread(_sync_transcribe_bytes)

transcription_provider = LocalWhisperTranscriptionProvider()
