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
1. You are empowered to answer ANY question on ANY subject (computer science, programming, math, physics, engineering, history, literature, medicine, general knowledge, or creative problem-solving), regardless of whether it was covered in the video or not!
2. Explain in clear, intuitive, and pedagogically rich language, using relatable analogies and practical examples.
3. If the question relates to the recorded session or video material, cite the relevant timestamps, concepts, and slide evidence.
4. If the question is outside the video, answer it directly and comprehensively with full depth, code, or mathematics. Never refuse to answer because a topic is outside the video!
5. Provide code examples, mathematical derivations, or conceptual diagrams whenever helpful.
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
        )
        if formatted_context and formatted_context.strip():
            full_prompt += (
                f"=== SESSION CONTEXT (Use if relevant; if question is general or outside this lesson, use your full knowledge base) ===\n"
                f"{formatted_context}\n"
                f"===============================================================================================================\n\n"
            )
        full_prompt += (
            "Formulate your response as LearnLens AI Teacher. Answer the student's question thoroughly, clearly, and engagingly in accordance with the requested mode."
        )

        # 3. Generate teacher response via LLM provider (Ollama prioritized with 60s timeout)
        response_text = await llm_provider.generate_response(
            prompt=full_prompt,
            system_prompt=SYSTEM_PROMPT_TEMPLATE,
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
