import pymupdf as fitz
import re
import json
import logging
from typing import List, Dict, Any, Optional
from backend.app.models.schemas import QuizQuestion
from backend.app.db.database import DatabaseManager
from backend.app.providers.llm_provider import llm_provider

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
    def is_contaminated_quiz(cls, session_id: str, questions: List[QuizQuestion]) -> bool:
        """
        Detects if a session has questions contaminated by the old hardcoded firewall fallback.
        """
        session = DatabaseManager.get_session(session_id)
        if not session or not questions:
            return False
        title = session.title.lower()
        # If the session is genuinely about network security or firewalls, it is not contaminated
        if any(k in title for k in ["firewall", "fortinet", "cybersecurity", "nse2", "perimeter", "network security"]):
            return False
        # If the session is about something else (e.g. Pollution in India, TLS 1.3, React, Python),
        # but contains the old fallback "What is the primary function of a network firewall?", it IS contaminated!
        return any(
            ("firewall" in q.question.lower() or q.concept_tested.lower() == "firewall")
            for q in questions
        )

    @classmethod
    def generate_mock_questions_from_concepts(cls, session_id: str) -> List[QuizQuestion]:
        """
        Generates practice questions grounded strictly in the session's actual topic,
        extracted concepts, and recent live transcript. Never falls back to hardcoded firewalls.
        """
        session = DatabaseManager.get_session(session_id)
        topic = session.title if session else "Ongoing Concept"
        concepts = DatabaseManager.get_concepts(session_id)
        segments = DatabaseManager.get_transcript_segments(session_id)
        questions: List[QuizQuestion] = []

        if not concepts:
            # Generate questions dynamically from the session topic and latest transcript
            latest_ts = segments[-1].timestamp_formatted if segments else "00:00"
            q1 = QuizQuestion(
                session_id=session_id,
                question=f"In this ongoing lecture on '{topic}', what is the primary architectural principle or objective being taught?",
                options=[
                    f"Mastering the fundamental mechanisms, definitions, and operational rules of {topic}.",
                    "Configuring legacy BIOS firmware and low-level storage controller drivers.",
                    "Auditing third-party corporate billing records and software procurement invoices.",
                    "Replacing all network routers with unmanaged physical switches."
                ],
                correct_option_index=0,
                concept_tested=topic,
                relevant_timestamp=latest_ts,
                explanation=f"This ongoing lesson focuses on establishing a grounded understanding of {topic}."
            )
            DatabaseManager.add_quiz_question(q1)
            questions.append(q1)

            if segments:
                q2 = QuizQuestion(
                    session_id=session_id,
                    question=f"Regarding the instructor's discussion at [{latest_ts}], which statement reflects the key lesson takeaway?",
                    options=[
                        f"The operational mechanisms presented in the ongoing lecture segment ({topic}).",
                        "Ignoring instructor guidelines in favor of unverified manual settings.",
                        "Disabling all system verification steps to minimize execution latency.",
                        "Operating without predefined protocols or structured validation."
                    ],
                    correct_option_index=0,
                    concept_tested=f"{topic} Mechanisms",
                    relevant_timestamp=latest_ts,
                    explanation=f"Reviewing the lecture segment at [{latest_ts}] reinforces the core principles of {topic}."
                )
                DatabaseManager.add_quiz_question(q2)
                questions.append(q2)

            return questions

        # If concepts exist, generate questions testing the ongoing concepts (prioritizing recent ones)
        for c in concepts[:4]:
            q = QuizQuestion(
                session_id=session_id,
                question=f"According to the lecture on '{topic}', which of the following best defines '{c.name}'?",
                options=[
                    c.definition or c.simple_explanation or f"The core operational mechanism for {c.name}.",
                    f"A secondary configuration unrelated to the core function of {c.name}.",
                    f"A legacy protocol that has been completely deprecated in modern {topic}.",
                    "An automatic hardware diagnostic tool for testing physical cabling."
                ],
                correct_option_index=0,
                concept_tested=c.name,
                relevant_timestamp=c.evidence_timestamp or "Lesson Review",
                explanation=f"In this lecture, '{c.name}' is defined as: {c.definition or c.simple_explanation}"
            )
            DatabaseManager.add_quiz_question(q)
            questions.append(q)

        return questions

    @classmethod
    async def generate_questions_for_session(cls, session_id: str, force_refresh: bool = False) -> List[QuizQuestion]:
        """
        Dynamically generates practice quiz questions for the ongoing lecture using LLM
        grounded in the active concepts and live transcript, with reliable fallback.
        """
        existing = DatabaseManager.get_quiz_questions(session_id)
        if not force_refresh and existing and not cls.is_contaminated_quiz(session_id, existing):
            return existing

        # Clear old / contaminated questions if regenerating
        DatabaseManager.clear_quiz_questions(session_id)

        session = DatabaseManager.get_session(session_id)
        topic = session.title if session else "Ongoing Concept"
        concepts = DatabaseManager.get_concepts(session_id)
        segments = DatabaseManager.get_transcript_segments(session_id)

        concepts_summary = ", ".join([f"{c.name}: {c.definition[:100]}" for c in concepts[:5]]) if concepts else "No specific sub-concepts extracted yet."
        transcript_summary = " ".join([s.text for s in segments[-5:]]) if segments else "Lecture just started."

        system_prompt = (
            "You are an expert exam question creator. Generate 3 high-yield multiple-choice practice quiz questions "
            "grounded strictly in what is being taught in this ongoing lecture. "
            "Return only valid JSON in the exact schema specified."
        )
        prompt = f"""Generate 3 multiple-choice practice questions testing the student on what was taught in this ongoing lecture.
Lecture Title / Topic: {topic}
Concepts taught: {concepts_summary}
Recent lecture transcript: {transcript_summary}

Format your response as a strict JSON list with no markdown surrounding it, like this:
[
  {{
    "question": "Question text here?",
    "options": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"],
    "correct_option_index": 0,
    "concept_tested": "Specific concept name",
    "explanation": "Why the correct answer is right based on the lesson."
  }}
]
"""
        try:
            raw_response = await llm_provider.generate_response(
                prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                timeout=12.0
            )
            json_match = re.search(r'\[.*\]', raw_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                questions = []
                for item in parsed:
                    if isinstance(item, dict) and "question" in item and "options" in item and len(item["options"]) >= 2:
                        q = QuizQuestion(
                            session_id=session_id,
                            question=item["question"],
                            options=item["options"][:4],
                            correct_option_index=item.get("correct_option_index", 0),
                            concept_tested=item.get("concept_tested", topic),
                            relevant_timestamp=segments[-1].timestamp_formatted if segments else "Lesson Review",
                            explanation=item.get("explanation", f"Based on the lecture discussion on {topic}.")
                        )
                        DatabaseManager.add_quiz_question(q)
                        questions.append(q)
                if len(questions) >= 1:
                    return questions
        except Exception as e:
            logger.warning(f"LLM quiz generation exception for {session_id}, falling back: {e}")

        # Fallback to grounded mock generator
        return cls.generate_mock_questions_from_concepts(session_id)

    @classmethod
    def _generate_fallback_custom_questions(
        cls,
        session_id: str,
        concept_name: str,
        needed_count: int,
        start_index: int = 1,
        difficulty: str = "MEDIUM"
    ) -> List[QuizQuestion]:
        templates = [
            (
                f"What is the primary defining principle or core objective of '{concept_name}'?",
                [
                    f"Providing a structured, deterministic approach to solve problems related to {concept_name}.",
                    f"A temporary debug routine intended only for testing non-production systems.",
                    f"A legacy protocol that has been phased out in modern architectural designs.",
                    "An unverified manual override used exclusively for physical hardware maintenance."
                ],
                0,
                f"Understanding the core definition and foundational role of {concept_name} is essential for exam readiness."
            ),
            (
                f"In practical real-world applications, how is '{concept_name}' typically implemented or evaluated?",
                [
                    f"By enforcing strict operational criteria and modular interfaces tailored for {concept_name}.",
                    "By bypassing all validation steps to prioritize short-term execution speed.",
                    "By relying entirely on external unauthenticated network endpoints.",
                    "By hardcoding static values without runtime adaptability."
                ],
                0,
                f"Implementation of {concept_name} relies on systematic boundaries and standard validation best practices."
            ),
            (
                f"Which of the following describes a common anti-pattern or critical pitfall when dealing with '{concept_name}'?",
                [
                    f"Failing to account for edge cases and architectural constraints specific to {concept_name}.",
                    f"Adhering too strictly to validated documentation and best-practice blueprints.",
                    "Maintaining comprehensive audit logs and automated sanity checks.",
                    f"Applying modular abstractions to isolate {concept_name} from unrelated components."
                ],
                0,
                f"A common pitfall with {concept_name} is overlooking architectural constraints or operating assumptions."
            ),
            (
                f"What distinguishes '{concept_name}' from adjacent or alternative methodologies?",
                [
                    f"Its targeted capability to address domain requirements through specialized mechanisms.",
                    "It requires no computational resources and operates without state.",
                    "It is exclusively used for low-level mechanical equipment inspection.",
                    "It has identical operational behavior to generic baseline tools with no differentiation."
                ],
                0,
                f"{concept_name} provides unique domain capabilities tailored specifically for its use-case."
            ),
            (
                f"When conducting an exam or technical assessment on '{concept_name}', what key criteria confirms mastery?",
                [
                    f"The ability to articulate its mechanics, trade-offs, and practical deployment considerations.",
                    "Memorizing obscure hexadecimal memory registers without conceptual context.",
                    "Assuming every implementation has identical resource costs and latency profiles.",
                    "Relying on deprecated legacy patterns without understanding modern adaptations."
                ],
                0,
                f"Mastery of {concept_name} requires understanding both its theoretical mechanics and practical trade-offs."
            ),
        ]

        questions: List[QuizQuestion] = []
        for i in range(needed_count):
            idx = (start_index - 1 + i) % len(templates)
            q_text, opts, c_idx, expl = templates[idx]
            q_num = start_index + i
            q = QuizQuestion(
                session_id=session_id,
                question=f"[{concept_name} Check #{q_num}] {q_text}",
                options=opts,
                correct_option_index=c_idx,
                concept_tested=concept_name,
                relevant_timestamp="Custom Quiz",
                explanation=expl
            )
            questions.append(q)
        return questions

    @classmethod
    async def generate_custom_quiz(
        cls,
        session_id: str,
        concept_name: str,
        count: int = 5,
        difficulty: str = "MEDIUM"
    ) -> List[QuizQuestion]:
        """
        Generates a custom quiz with a user-specified concept name and question count,
        leveraging Ollama LLM with a robust grounded fallback generator.
        """
        target_count = max(1, min(int(count), 20))
        concept_clean = concept_name.strip() if concept_name else "Core Lesson Concept"

        session = DatabaseManager.get_session(session_id)
        topic = session.title if session else concept_clean
        segments = DatabaseManager.get_transcript_segments(session_id)
        concepts = DatabaseManager.get_concepts(session_id)

        matched_concept = next((c for c in concepts if c.name.lower() == concept_clean.lower()), None)
        concept_context = f"Concept Details: {matched_concept.definition}" if matched_concept else ""
        transcript_snippet = " ".join([s.text for s in segments[-8:]]) if segments else ""

        system_prompt = (
            "You are an expert exam designer and university professor. "
            f"Generate exactly {target_count} rigorous, high-yield multiple-choice practice questions "
            f"focusing specifically on the concept: '{concept_clean}'. "
            f"Difficulty Level: {difficulty}. "
            "Every question must have 4 plausible options and a detailed educational explanation of why the correct option is right. "
            "Return only valid JSON in the exact schema specified."
        )

        prompt = f"""Generate exactly {target_count} multiple-choice practice questions testing understanding of '{concept_clean}'.
Session Context: {topic}
{concept_context}
Relevant Lecture Transcript: {transcript_snippet}
Target Difficulty: {difficulty}

Format your response as a strict JSON list with no markdown surrounding it:
[
  {{
    "question": "Clear and conceptual question testing {concept_clean}?",
    "options": ["Correct answer", "Plausible distractor 1", "Plausible distractor 2", "Plausible distractor 3"],
    "correct_option_index": 0,
    "concept_tested": "{concept_clean}",
    "explanation": "Detailed explanation of why the correct answer is right and why this concept matters."
  }}
]
"""
        generated_questions: List[QuizQuestion] = []
        try:
            raw_response = await llm_provider.generate_response(
                prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                timeout=8.0
            )
            json_match = re.search(r'\[.*\]', raw_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                for item in parsed:
                    if isinstance(item, dict) and "question" in item and "options" in item and len(item["options"]) >= 2:
                        q = QuizQuestion(
                            session_id=session_id,
                            question=item["question"],
                            options=item["options"][:4],
                            correct_option_index=item.get("correct_option_index", 0),
                            concept_tested=item.get("concept_tested", concept_clean),
                            relevant_timestamp=segments[-1].timestamp_formatted if segments else "Custom Quiz",
                            explanation=item.get("explanation", f"Comprehensive explanation for {concept_clean}.")
                        )
                        generated_questions.append(q)
                        if len(generated_questions) >= target_count:
                            break
        except Exception as e:
            logger.warning(f"Ollama custom quiz generation exception for '{concept_clean}': {e}")

        # If LLM didn't return enough questions (e.g. offline, timeout, or partial list),
        # fill up to target_count using our dynamic domain question synthesizer
        if len(generated_questions) < target_count:
            needed = target_count - len(generated_questions)
            fallback_qs = cls._generate_fallback_custom_questions(
                session_id=session_id,
                concept_name=concept_clean,
                needed_count=needed,
                start_index=len(generated_questions) + 1,
                difficulty=difficulty
            )
            generated_questions.extend(fallback_qs)

        # Clear existing questions for the session and save the new custom quiz
        DatabaseManager.clear_quiz_questions(session_id)
        for q in generated_questions:
            DatabaseManager.add_quiz_question(q)

        return generated_questions

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
