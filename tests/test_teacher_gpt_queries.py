import asyncio
from backend.app.services.teacher_service import teacher_service
from backend.app.models.schemas import TeacherMode

def test_teacher_answers_pm_germany_and_india():
    session_id = "demo_cybersecurity_module_2"
    query = "Who is the Prime Minister of Germany and India?"
    msg = asyncio.run(teacher_service.teach(session_id, query, TeacherMode.SIMPLE))
    assert msg is not None
    assert msg.text
    text_lower = msg.text.lower()
    # Should accurately mention Scholz (or Chancellor) and Modi
    assert "scholz" in text_lower or "chancellor" in text_lower
    assert "modi" in text_lower or "narendra" in text_lower
    # Evidence must NOT contain false lecture slides for an outside question
    assert len(msg.evidence) == 0

def test_teacher_answers_coding_quicksort():
    session_id = "demo_cybersecurity_module_2"
    query = "Write a quicksort function in python"
    msg = asyncio.run(teacher_service.teach(session_id, query, TeacherMode.EXAMPLE))
    assert msg is not None
    assert msg.text
    text_lower = msg.text.lower()
    assert "quicksort" in text_lower or "def " in text_lower or "sort" in text_lower

def test_teacher_generates_ppt_presentation_deck():
    session_id = "demo_cybersecurity_module_2"
    query = "make ppt on pollution in india"
    msg = asyncio.run(teacher_service.teach(session_id, query, TeacherMode.SIMPLE))
    assert msg is not None
    assert msg.text
    text_lower = msg.text.lower()
    # Must provide real slide content, not generic placeholders
    assert "slide" in text_lower
    assert "pollution" in text_lower
    assert "india" in text_lower
    # Evidence must be 0 for outside topic
    assert len(msg.evidence) == 0
