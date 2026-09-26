import logging
from typing import Dict, Any, List, Optional
from backend.app.models.schemas import ChatMessage, TeacherMode, EvidenceItem
from backend.app.db.database import DatabaseManager
from backend.app.services.rag_service import rag_service
from backend.app.providers.llm_provider import llm_provider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are LearnLens AI — an elite, world-class personal AI Teacher and educational mentor operating at the standard of GPT-4o.

Formatting & Readability Standard (Crucial for Human Understanding):
1. EXECUTIVE EXPLANATION (Natural, Engaging Paragraph):
   - Start immediately with a clear, well-written paragraph explaining the topic or directly answering the question in plain, articulate English.
   - Ground the concept with an intuitive, real-world explanation or relatable analogy.
   - Never use robotic boilerplates, throat-clearing, or repetitive templates (e.g. "Think of X like a navigation system").

2. CORE MECHANISMS & KEY DETAILS (Organized Bullet Points with Bold Headers):
   - Break down the underlying logic, components, or mechanisms into structured bullet points.
   - Always bold the lead-in term for instant readability (e.g. • **Core Component**: Explanation...).
   - Explain how each piece works, why it matters, and how it connects to the broader picture.

3. PRACTICAL APPLICATION OR CONCRETE EXAMPLE:
   - Provide a practical walkthrough, code snippet (with syntax highlighting), or real-world use case demonstrating how the concept is applied in practice.

4. KEY TAKEAWAYS (Summary Bullets):
   - Conclude with 2-3 crisp, memorable takeaways for fast revision and exams.

5. SPECIAL REQUESTS (PPT / SLIDES / CODE):
   - If the student requests presentation slides, PPT content, or an outline, generate a complete, ready-to-use slide deck with Slide Titles, High-Impact Bullet Points, Visual Recommendations, and Presenter Talking Points.
   - If code is requested, provide clean, idiomatic, fully-commented code with complexity and edge-case notes.

Universal Scope:
- Answer ANY question on ANY subject (coding, environmental science, mathematics, world governance, history, literature, medicine, current events) with complete depth, accuracy, and zero disclaimers.
"""

MODE_PROMPTS = {
    TeacherMode.SIMPLE: "Teach this concept in simple, beginner-friendly terms using everyday language and an intuitive analogy.",
    TeacherMode.DETAILED: "Provide an in-depth, rigorous explanation detailing the underlying mechanisms, architecture, and step-by-step logic.",
    TeacherMode.EXAM: "Focus on what matters most for exams or certifications: key definitions, crucial rules, bullet points, and common traps.",
    TeacherMode.QUICK_REVISION: "Deliver a lightning-fast 60-second revision recap of the core takeaways.",
    TeacherMode.EXAMPLE: "Explain this primarily through a concrete, step-by-step real-world scenario or walkthrough.",
    TeacherMode.TEACH_FROM_SCRATCH: "Teach this concept from absolute ground zero, assuming zero prior knowledge, building up step by step.",
    TeacherMode.ACTIVE_RECALL: "Explain the concept briefly, then pose an insightful test question to check the student's understanding. Prompt them to answer.",
    TeacherMode.FLASHCARDS: "Structure the response as high-yield Q&A flashcards with Front (Question) and Back (Answer).",
    TeacherMode.PRACTICE_QUIZ: "Generate 2-3 practice multiple choice questions based on this material with answer explanations.",
    TeacherMode.WEAK_AREAS: "Analyze the student's learning history, highlight concepts that need reinforcement, and offer a remedial lesson.",
    TeacherMode.COMPARE: "Contrast and compare the key concepts, highlighting key similarities, differences, and trade-offs.",
    TeacherMode.ASK_ANYTHING: "Provide a comprehensive, authoritative, and encouraging answer to the student's question."
}

class AITeacherService:
    """
    Personal AI Teacher service powering the interactive ChatGPT-like tutor experience.
    """

    @classmethod
    async def teach(
        cls,
        session_id: str,
        user_message: str,
        mode: TeacherMode = TeacherMode.SIMPLE,
        cross_session: bool = False
    ) -> ChatMessage:
        # 1. Fetch recent chat history to maintain conversational context
        chat_history = DatabaseManager.get_chat_messages(session_id)[-8:]

        # 2. Retrieve grounded context from Session RAG
        rag_result = await rag_service.retrieve_context(
            session_id=session_id,
            query=user_message,
            top_k=4,
            cross_session=cross_session
        )

        formatted_context = rag_result.get("formatted_context", "")
        evidence_items: List[EvidenceItem] = rag_result.get("evidence", [])

        # 3. Detect presentation / slide deck request
        is_slide_request = any(k in user_message.lower() for k in ["ppt", "presentation", "slide", "slides", "deck", "powerpoint"])
        if is_slide_request:
            task_instruction = (
                "The student is requesting high-impact PowerPoint / presentation slide deck content. "
                "Structure your response as a professional, ready-to-present slide deck with Slide Numbers, "
                "Catchy Slide Titles, High-Impact Bullet Points, Key Metrics/Statistics, Visual Recommendations, and Presenter Notes."
            )
        else:
            task_instruction = MODE_PROMPTS.get(mode, MODE_PROMPTS[TeacherMode.SIMPLE])

        # 4. Build mode-specific prompt
        full_prompt = (
            f"Mode: {mode.value.upper()}\n"
            f"Instruction: {task_instruction}\n\n"
        )
        if formatted_context and formatted_context.strip():
            full_prompt += (
                f"=== SESSION CONTEXT (Use if relevant; if question is general or outside this lesson, use your full knowledge base) ===\n"
                f"{formatted_context}\n"
                f"===============================================================================================================\n\n"
            )
        full_prompt += (
            f"Student Request: {user_message}\n\n"
            "Formulate your response as LearnLens AI. Deliver an exceptional, comprehensive, beautifully formatted, and engaging response like ChatGPT."
        )

        # 5. Generate teacher response via LLM provider (Ollama prioritized with 60s timeout, chat history included)
        response_text = await llm_provider.generate_response(
            prompt=full_prompt,
            system_prompt=SYSTEM_PROMPT_TEMPLATE,
            chat_history=chat_history,
            force_ollama=True,
            timeout=60.0
        )

        # 4. Save and return ChatMessage
        assistant_message = ChatMessage(
            session_id=session_id,
            sender="assistant",
            text=response_text,
            mode=mode,
            evidence=evidence_items
        )

        DatabaseManager.add_chat_message(assistant_message)

        # 5. Update learner memory
        profile = DatabaseManager.get_learner_profile(session_id)
        profile.questions_asked_count += 1
        for c in rag_result.get("concepts", []):
            if c.name not in profile.concepts_viewed:
                profile.concepts_viewed.append(c.name)
        DatabaseManager.update_learner_profile(profile)

        return assistant_message

teacher_service = AITeacherService()
