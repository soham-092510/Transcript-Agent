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

def test_minute_transcript_upsert_and_grouping():
    from backend.app.db.database import DatabaseManager
    from backend.app.models.schemas import LearningSession, TaskState
    import time
    
    test_session_id = f"test_min_session_{int(time.time())}"
    sess = LearningSession(id=test_session_id, title="Test Minute Session", source_platform="Chrome")
    DatabaseManager.create_session(sess)

    try:
        # First chunk in minute 0 (04:00 relative or 00:00)
        seg1 = DatabaseManager.upsert_minute_transcript_segment(
            session_id=test_session_id,
            minute_start_sec=0.0,
            timestamp_end=1.2,
            timestamp_formatted="00:00",
            speaker="Instructor",
            new_text="Welcome to the lecture on"
        )
        assert seg1.id == f"{test_session_id}_min_0"
        assert seg1.timestamp_formatted == "00:00"
        assert seg1.text == "Welcome to the lecture on"

        # Second chunk in minute 0 (words arriving in real-time)
        seg2 = DatabaseManager.upsert_minute_transcript_segment(
            session_id=test_session_id,
            minute_start_sec=0.0,
            timestamp_end=2.5,
            timestamp_formatted="00:00",
            speaker="Instructor",
            new_text="on computer architecture and memory."
        )
        assert seg2.id == f"{test_session_id}_min_0"
        assert seg2.text == "Welcome to the lecture on computer architecture and memory."

        # Third chunk in minute 1 (time advances past 60s)
        seg3 = DatabaseManager.upsert_minute_transcript_segment(
            session_id=test_session_id,
            minute_start_sec=60.0,
            timestamp_end=62.0,
            timestamp_formatted="01:00",
            speaker="Instructor",
            new_text="Now let's examine CPU caches."
        )
        assert seg3.id == f"{test_session_id}_min_1"
        assert seg3.timestamp_formatted == "01:00"
        assert seg3.text == "Now let's examine CPU caches."

        # Fetch all transcript segments: exactly 2 minute-blocks!
        all_segs = DatabaseManager.get_transcript_segments(test_session_id)
        assert len(all_segs) == 2
        assert all_segs[0].timestamp_formatted == "00:00"
        assert all_segs[0].text == "Welcome to the lecture on computer architecture and memory."
        assert all_segs[1].timestamp_formatted == "01:00"
        assert all_segs[1].text == "Now let's examine CPU caches."

    finally:
        DatabaseManager.delete_session(test_session_id)

