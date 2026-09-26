import pytest
import asyncio
import time
from backend.app.db.database import DatabaseManager
from backend.app.models.schemas import LearningSession, QuizQuestion, TaskState
from backend.app.services.quiz_service import quiz_service

def test_custom_quiz_size_and_concept():
    session_id = f"test_custom_quiz_{int(time.time() * 1000)}"
    session = LearningSession(
        id=session_id,
        title="Data Structures & Algorithms in Computer Science",
        platform="youtube",
        status=TaskState.COMPLETED
    )
    DatabaseManager.create_session(session)

    try:
        # User requests 4 questions on "Binary Search Trees"
        concept = "Binary Search Trees"
        requested_count = 4
        questions = asyncio.run(
            quiz_service.generate_custom_quiz(
                session_id=session_id,
                concept_name=concept,
                count=requested_count,
                difficulty="HARD"
            )
        )

        assert len(questions) == requested_count
        for q in questions:
            assert q.concept_tested == concept
            assert len(q.options) == 4
            assert 0 <= q.correct_option_index <= 3
            assert q.explanation

        # Verify persisted in database
        db_questions = DatabaseManager.get_quiz_questions(session_id)
        assert len(db_questions) == requested_count
    finally:
        DatabaseManager.delete_session(session_id)

def test_custom_quiz_arbitrary_topic_size_10():
    session_id = f"test_custom_size_10_{int(time.time() * 1000)}"
    session = LearningSession(
        id=session_id,
        title="Astrophysics & Planetary Science",
        platform="Chrome Tab",
        status=TaskState.OBSERVING
    )
    DatabaseManager.create_session(session)

    try:
        concept = "Black Hole Event Horizons"
        requested_count = 7
        questions = asyncio.run(
            quiz_service.generate_custom_quiz(
                session_id=session_id,
                concept_name=concept,
                count=requested_count,
                difficulty="MEDIUM"
            )
        )

        assert len(questions) == requested_count
        assert all(q.concept_tested == concept for q in questions)
    finally:
        DatabaseManager.delete_session(session_id)
