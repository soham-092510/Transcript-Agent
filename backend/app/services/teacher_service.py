import logging
from typing import Dict, Any, List, Optional
from backend.app.models.schemas import ChatMessage, TeacherMode, EvidenceItem
from backend.app.db.database import DatabaseManager
from backend.app.services.rag_service import rag_service
from backend.app.providers.llm_provider import llm_provider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You are LearnLens AI - an elite personal AI Teacher and educational mentor.
Your motto is: "Show your AI what you are learning."
Your core teaching principles:
1. Explain in simple, intuitive language first, followed by clear depth.
2. Use relatable analogies and practical real-world examples.
3. Ground your explanations directly in the student's authorized course material.
4. If a concept was taught in the video, cite the exact timestamp and visual slide.
5. If something is NOT in the captured material, state clearly: "This was not directly covered in your captured session, but here is the general principle..."
6. Avoid useless filler. Make learning fast, empowering, and enjoyable!
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
    TeacherMode.PRACTICE_QUIZ: "Generate 2-3 practice multiple choice questions based strictly on this material with answer explanations.",
    TeacherMode.WEAK_AREAS: "Analyze the student's learning history, highlight concepts that need reinforcement, and offer a remedial lesson.",
    TeacherMode.COMPARE: "Contrast and compare the key concepts, highlighting key similarities, differences, and trade-offs.",
    TeacherMode.ASK_ANYTHING: "Provide a helpful, precise, and supportive answer grounded in the captured lecture."
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
        # 1. Retrieve grounded context from Session RAG
        rag_result = await rag_service.retrieve_context(
            session_id=session_id,
            query=user_message,
            top_k=4,
            cross_session=cross_session
        )

        formatted_context = rag_result.get("formatted_context", "")
        evidence_items: List[EvidenceItem] = rag_result.get("evidence", [])

        # 2. Build mode-specific prompt
        mode_instruction = MODE_PROMPTS.get(mode, MODE_PROMPTS[TeacherMode.SIMPLE])
        
        full_prompt = (
            f"Mode: {mode.value.upper()}\n"
            f"Instruction: {mode_instruction}\n\n"
            f"Student Question: {user_message}\n\n"
            f"=== GROUNDED SOURCE MATERIAL FROM LESSON ===\n"
            f"{formatted_context}\n"
            f"============================================\n\n"
            "Formulate your response as the AI Teacher. Always highlight the relevant timestamps or visual evidence when referring to the lesson."
        )

        # 3. Generate teacher response via LLM provider
        response_text = await llm_provider.generate_response(
            prompt=full_prompt,
            system_prompt=SYSTEM_PROMPT_TEMPLATE
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
