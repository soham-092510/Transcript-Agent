import pytest
import asyncio
import time
from backend.app.db.database import DatabaseManager
from backend.app.models.schemas import LearningSession, Concept, QuizQuestion, TaskState
from backend.app.services.quiz_service import quiz_service

def test_quiz_grounded_in_ongoing_concept():
    # 1. Create a test session on an unrelated topic (Air Pollution)
    session_id = f"test_env_pollution_{int(time.time() * 1000)}"
    
    session = LearningSession(
        id=session_id,
        title="Environmental Studies: Air Pollution in New Delhi",
        platform="youtube",
        status=TaskState.COMPLETED
    )
    DatabaseManager.create_session(session)

    try:
        # 2. Add an ongoing concept learned in the lecture
        c1 = Concept(
            session_id=session_id,
            name="Particulate Matter PM2.5",
            definition="Microscopic inhalable air pollutants smaller than 2.5 micrometers that penetrate deep into the lungs.",
            simple_explanation="Tiny toxic dust particles in smog that can cause serious respiratory illnesses.",
            difficulty="MEDIUM",
            evidence_timestamp="04:20"
        )
        DatabaseManager.add_concept(c1)

        # 3. Generate quiz questions
        questions = asyncio.run(quiz_service.generate_questions_for_session(session_id, force_refresh=True))

        assert len(questions) >= 1
        # Verify that NO question is asking about network firewalls!
        for q in questions:
            assert "firewall" not in q.question.lower(), f"Unexpected firewall question found: {q.question}"
            assert q.concept_tested.lower() != "firewall"

        # Verify that the questions are about the actual lecture topic / concepts
        relevant_terms = ["pollution", "particulate", "pm2.5", "air", "environmental"]
        assert any(any(term in q.question.lower() or term in q.concept_tested.lower() for term in relevant_terms) for q in questions)
    finally:
        DatabaseManager.delete_session(session_id)

def test_contaminated_firewall_detection_and_cleanup():
    # Create a session on Quantum Computing contaminated with the old firewall fallback
    session_id = f"test_quantum_physics_{int(time.time() * 1000)}"

    session = LearningSession(
        id=session_id,
        title="Introduction to Quantum Computing & Qubits",
        platform="meet",
        status=TaskState.OBSERVING
    )
    DatabaseManager.create_session(session)

    try:
        # Inject the old contaminated question
        contaminated_q = QuizQuestion(
            session_id=session_id,
            question="What is the primary function of a network firewall?",
            options=["Monitor and filter traffic", "Encrypt hard drive", "Render 3D graphics", "Compile C++ code"],
            correct_option_index=0,
            concept_tested="Firewall",
            explanation="Firewalls filter traffic."
        )
        DatabaseManager.add_quiz_question(contaminated_q)

        # Verify is_contaminated_quiz identifies it
        existing = DatabaseManager.get_quiz_questions(session_id)
        assert quiz_service.is_contaminated_quiz(session_id, existing) is True

        # Call generate_questions_for_session with force_refresh=False
        # It must detect the contamination, clear it, and generate Quantum Computing questions
        cleaned_questions = asyncio.run(quiz_service.generate_questions_for_session(session_id, force_refresh=False))

        for q in cleaned_questions:
            assert "firewall" not in q.question.lower()
            assert q.concept_tested.lower() != "firewall"
        
        assert any("quantum" in q.question.lower() or "qubit" in q.question.lower() or "quantum" in q.concept_tested.lower() for q in cleaned_questions)
    finally:
        DatabaseManager.delete_session(session_id)
