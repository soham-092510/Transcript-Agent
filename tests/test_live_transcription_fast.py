import io
import wave
import struct
import pytest
from backend.app.providers.transcription_provider import transcription_provider
from backend.app.api.websocket import _deduplicate_overlap

def test_deduplicate_overlap_basic():
    # Word overlap at boundary should be cleanly stripped
    last_tail = "Welcome to this lecture on"
    new_text = "lecture on machine learning algorithms"
    result = _deduplicate_overlap(last_tail, new_text)
    assert result == "machine learning algorithms"

def test_deduplicate_overlap_exact_duplicate():
    # Exact duplicate (e.g. repeated silence/hallucination) should yield empty string
    last_tail = "machine learning"
    new_text = "machine learning"
    result = _deduplicate_overlap(last_tail, new_text)
    assert result == ""

def test_deduplicate_overlap_no_overlap():
    # Independent text should be preserved in full
    last_tail = "First sentence completed."
    new_text = "Next topic begins now."
    result = _deduplicate_overlap(last_tail, new_text)
    assert result == "Next topic begins now."

def test_deduplicate_overlap_punctuation_handling():
    # Punctuation differences should still match words
    last_tail = "Deep learning,"
    new_text = "learning is awesome"
    result = _deduplicate_overlap(last_tail, new_text)
    assert result == "is awesome"

def test_transcribe_audio_bytes_wav_in_memory():
    import asyncio
    # Generate 1.0s of 16kHz mono WAV bytes
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16000)
        wav.writeframes(struct.pack('<' + ('h' * 16000), *[0] * 16000))
    wav_bytes = buf.getvalue()

    # Transcribe directly in memory
    results = asyncio.run(transcription_provider.transcribe_audio_bytes(wav_bytes, speaker_hint="Speaker"))
    # For silence with VAD, results should be a list without raising any exception
    assert isinstance(results, list)
