import pytest
import asyncio
from backend.app.services.teacher_service import teacher_service
from backend.app.models.schemas import TeacherMode

def test_teacher_answers_outside_question():
    session_id = "demo_cybersecurity_module_2"
    user_query = "Explain recursion in Python with a clear example"
    
    # Teach in EXAMPLE mode
    msg = asyncio.run(teacher_service.teach(session_id, user_query, TeacherMode.EXAMPLE))
    assert msg is not None
    assert msg.text
    # Should address recursion and python, NOT canned firewall
    assert "recursion" in msg.text.lower() or "python" in msg.text.lower()

def test_teacher_answers_exam_mode():
    session_id = "demo_cybersecurity_module_2"
    user_query = "What is the difference between supervised and unsupervised learning?"
    
    # Teach in EXAM mode
    msg = asyncio.run(teacher_service.teach(session_id, user_query, TeacherMode.EXAM))
    assert msg is not None
    assert msg.text
    assert "supervised" in msg.text.lower() or "learning" in msg.text.lower()
