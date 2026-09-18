import pymupdf as fitz
import re
import logging
from typing import List, Dict, Any, Optional
from backend.app.models.schemas import QuizQuestion
from backend.app.db.database import DatabaseManager

logger = logging.getLogger(__name__)

class QuizPreparationService:
    """
    Educational Assessment Preparation Engine.
    Prepares the human learner for real exams through intelligent Quiz PDF import,
    concept mapping, and interactive Practice Mode.
    Strictly observes ethical boundaries: NEVER auto-submits real graded quizzes.
    """

    @classmethod
    async def import_quiz_pdf(cls, session_id: str, pdf_path: str) -> List[QuizQuestion]:
        extracted_questions: List[QuizQuestion] = []
        try:
            doc = fitz.open(pdf_path)
            full_text = ""
            for page in doc:
                full_text += page.get_text() + "\n"
            doc.close()

            # Parse questions and options
            # Pattern: 1. Question text ... A) ... B) ... C) ... D) ... Answer: B
            q_blocks = re.split(r'\n(?=\d+[\.\)]\s+)', full_text)
            
            concepts = DatabaseManager.get_concepts(session_id)
            concept_names = [c.name for c in concepts]

            for block in q_blocks:
                block = block.strip()
                if not block:
                    continue

                # Match question text
                q_match = re.match(r'^\d+[\.\)]\s+(.*?)(?=\n[A-D][\.\)]|\n\([A-D]\)|$)', block, re.DOTALL)
                if not q_match:
                    continue
                q_text = q_match.group(1).strip().replace("\n", " ")

                # Match options
                opt_matches = re.findall(r'(?:^|\n)[A-D][\.\)]\s*(.*?)(?=\n[A-D][\.\)]|\nAnswer|\nExplanation|$)', block, re.DOTALL)
                options = [o.strip().replace("\n", " ") for o in opt_matches if o.strip()]
                
                if len(options) < 2:
                    # Fallback standard options if not parsed cleanly
                    options = ["True", "False"]

                # Extract answer if provided
                ans_match = re.search(r'Answer:\s*([A-D0-9])', block, re.IGNORECASE)
                correct_idx = 0
                if ans_match:
                    ans_char = ans_match.group(1).upper()
                    if ans_char in ['A', 'B', 'C', 'D']:
                        correct_idx = ord(ans_char) - ord('A')

                # Identify concept tested
                matched_concept = "General Architecture"
                for c_name in concept_names:
                    if c_name.lower() in q_text.lower():
                        matched_concept = c_name
                        break

                explanation = (
                    f"This question tests understanding of '{matched_concept}'. "
                    f"Option {chr(ord('A') + correct_idx)} directly reflects the operational rule taught in the lesson."
                )

                q_obj = QuizQuestion(
                    session_id=session_id,
                    question=q_text,
                    options=options[:4],
                    correct_option_index=min(correct_idx, len(options) - 1),
                    concept_tested=matched_concept,
                    relevant_timestamp="Lesson Review",
                    explanation=explanation
                )
                DatabaseManager.add_quiz_question(q_obj)
                extracted_questions.append(q_obj)

        except Exception as e:
            logger.error(f"Failed to import quiz PDF: {e}")

        # If no questions could be parsed from PDF, create 2 mock questions from concepts
        if not extracted_questions:
            extracted_questions = cls.generate_mock_questions_from_concepts(session_id)

        return extracted_questions

    @classmethod
    def generate_mock_questions_from_concepts(cls, session_id: str) -> List[QuizQuestion]:
        concepts = DatabaseManager.get_concepts(session_id)
        questions = []
        if not concepts:
            # Default question
            q = QuizQuestion(
                session_id=session_id,
                question="What is the primary function of a network firewall?",
                options=[
                    "Monitoring and controlling traffic according to predefined security rules",
                    "Increasing internet broadband bandwidth and download speeds",
                    "Replacing internal routers and DNS servers completely",
                    "Encrypting hard drives against physical theft"
                ],
                correct_option_index=0,
                concept_tested="Firewall",
                relevant_timestamp="14:32",
                explanation="A firewall acts as a boundary inspecting packets and enforcing policy rules."
            )
            DatabaseManager.add_quiz_question(q)
            questions.append(q)
            return questions

        for c in concepts[:3]:
            q = QuizQuestion(
                session_id=session_id,
                question=f"Which of the following best defines '{c.name}' according to the lesson?",
                options=[
                    c.definition,
                    f"A secondary protocol unrelated to {c.name}",
                    "A legacy configuration that has been deprecated",
                    "An automatic software patching tool"
                ],
                correct_option_index=0,
                concept_tested=c.name,
                relevant_timestamp=c.evidence_timestamp,
                explanation=f"{c.name} is defined as: {c.definition}"
            )
            DatabaseManager.add_quiz_question(q)
            questions.append(q)

        return questions

    @classmethod
    def submit_practice_answer(cls, question_id: str, selected_option_index: int) -> Dict[str, Any]:
        conn = DatabaseManager.get_session
        # Update question user answer in DB
        import sqlite3
        from backend.app.core.config import settings
        conn = sqlite3.connect(settings.DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM quiz_questions WHERE id = ?", (question_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"error": "Question not found"}

        correct_idx = row["correct_option_index"]
        is_correct = (selected_option_index == correct_idx)
        session_id = row["session_id"]
        concept_tested = row["concept_tested"]

        cursor.execute("UPDATE quiz_questions SET user_answer_index = ? WHERE id = ?", (selected_option_index, question_id))
        conn.commit()
        conn.close()

        # Update Learner Profile
        profile = DatabaseManager.get_learner_profile(session_id)
        if is_correct:
            if concept_tested not in profile.concepts_grasped:
                profile.concepts_grasped.append(concept_tested)
            if concept_tested in profile.concepts_struggling:
                profile.concepts_struggling.remove(concept_tested)
        else:
            if concept_tested not in profile.concepts_struggling:
                profile.concepts_struggling.append(concept_tested)
            if concept_tested in profile.concepts_grasped:
                profile.concepts_grasped.remove(concept_tested)

        # Recalculate practice accuracy
        all_q = DatabaseManager.get_quiz_questions(session_id)
        answered = [q for q in all_q if q.user_answer_index is not None]
        correct = [q for q in answered if q.user_answer_index == q.correct_option_index]
        profile.practice_accuracy = round(len(correct) / len(answered) if answered else 0.0, 2)
        profile.weak_areas = profile.concepts_struggling
        DatabaseManager.update_learner_profile(profile)

        return {
            "question_id": question_id,
            "is_correct": is_correct,
            "correct_option_index": correct_idx,
            "explanation": row["explanation"],
            "concept_tested": concept_tested,
            "weak_areas": profile.weak_areas
        }

quiz_service = QuizPreparationService()
