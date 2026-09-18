import logging
from typing import Dict, Any, Optional
from backend.app.models.schemas import TaskState, TeacherMode
from backend.app.db.database import DatabaseManager

logger = logging.getLogger(__name__)

class TaskAgentService:
    """
    Orchestrates the Human Control & Task State Machine.
    Ensures that the human can pause, interrupt, redirect, or resume agent activities at any time.
    """
    def __init__(self):
        self._states: Dict[str, TaskState] = {}

    def get_state(self, session_id: str) -> TaskState:
        if session_id in self._states:
            return self._states[session_id]
        session = DatabaseManager.get_session(session_id)
        if session:
            self._states[session_id] = session.status
            return session.status
        return TaskState.IDLE

    def set_state(self, session_id: str, new_state: TaskState):
        self._states[session_id] = new_state
        DatabaseManager.update_session(session_id, {"status": new_state.value})
        logger.info(f"Session {session_id} state changed to {new_state.value}")

    def pause(self, session_id: str) -> Dict[str, Any]:
        self.set_state(session_id, TaskState.PAUSED)
        return {
            "status": "PAUSED",
            "message": "Observation and processing paused. Ready for your questions or commands."
        }

    def resume(self, session_id: str) -> Dict[str, Any]:
        self.set_state(session_id, TaskState.OBSERVING)
        return {
            "status": "OBSERVING",
            "message": "Observation and multimodal processing resumed."
        }

    def stop(self, session_id: str) -> Dict[str, Any]:
        self.set_state(session_id, TaskState.COMPLETED)
        return {
            "status": "COMPLETED",
            "message": "Session observation completed. All extracted knowledge is permanently saved."
        }

    async def handle_user_command(self, session_id: str, command: str) -> Dict[str, Any]:
        """
        Interprets natural language commands and safely executes authorized actions.
        """
        cmd_clean = command.strip().lower()

        if any(w in cmd_clean for w in ["pause", "hold on", "wait", "freeze"]):
            return self.pause(session_id)

        if any(w in cmd_clean for w in ["resume", "continue", "start again", "keep going"]):
            return self.resume(session_id)

        if cmd_clean in ["stop", "finish", "end session"]:
            return self.stop(session_id)

        if "generate ppt" in cmd_clean or "create presentation" in cmd_clean or "make ppt" in cmd_clean:
            from backend.app.services.ppt_service import ppt_service
            ppt_file = await ppt_service.generate_presentation(session_id)
            return {
                "status": "ACTION_COMPLETE",
                "action": "ppt_generated",
                "file_path": ppt_file,
                "message": "Presentation successfully generated from your captured knowledge!"
            }

        if "generate pdf" in cmd_clean or "study pack" in cmd_clean or "visual pdf" in cmd_clean:
            from backend.app.services.pdf_service import pdf_service
            is_visual = "visual" in cmd_clean
            pdf_type = "visual_pack" if is_visual else "teaching_report"
            pdf_file = await pdf_service.generate_pdf(session_id, pdf_type)
            return {
                "status": "ACTION_COMPLETE",
                "action": "pdf_generated",
                "file_path": pdf_file,
                "message": f"{'Visual Study Pack' if is_visual else 'AI Teaching Report'} PDF generated!"
            }

        if "flashcard" in cmd_clean:
            from backend.app.services.teacher_service import teacher_service
            msg = await teacher_service.teach(
                session_id=session_id,
                user_message="Create flashcards for this material",
                mode=TeacherMode.FLASHCARDS
            )
            return {
                "status": "ACTION_COMPLETE",
                "action": "flashcards_created",
                "response": msg.text,
                "message": "Flashcards generated."
            }

        if "quiz" in cmd_clean or "test me" in cmd_clean:
            from backend.app.services.teacher_service import teacher_service
            msg = await teacher_service.teach(
                session_id=session_id,
                user_message="Create a practice quiz to test my understanding",
                mode=TeacherMode.PRACTICE_QUIZ
            )
            return {
                "status": "ACTION_COMPLETE",
                "action": "quiz_generated",
                "response": msg.text,
                "message": "Practice quiz generated."
            }

        # Default: route to AI Teacher
        from backend.app.services.teacher_service import teacher_service
        msg = await teacher_service.teach(
            session_id=session_id,
            user_message=command,
            mode=TeacherMode.SIMPLE
        )
        return {
            "status": "ANSWERED",
            "action": "chat_reply",
            "response": msg.text,
            "evidence": [e.dict() for e in msg.evidence],
            "message": "AI Teacher answered your question."
        }

task_agent_service = TaskAgentService()
