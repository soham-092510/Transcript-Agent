import re
import logging
from typing import List, Optional
from backend.app.models.schemas import Concept, TranscriptSegment, FrameCapture
from backend.app.db.database import DatabaseManager
from backend.app.providers.llm_provider import llm_provider

logger = logging.getLogger(__name__)

class KnowledgeExtractionService:
    """
    Transforms raw transcripts and frame visual data into structured knowledge units.
    Grounds definitions and concepts directly in timestamps and frame evidence.
    """

    @classmethod
    async def extract_knowledge_from_chunk(
        cls,
        session_id: str,
        transcript_text: str,
        timestamp_formatted: str,
        frame: Optional[FrameCapture] = None
    ) -> List[Concept]:
        if not transcript_text or len(transcript_text.strip()) < 15:
            return []

        # Heuristic concept discovery
        found_concepts: List[Concept] = []
        
        # Patterns for definitions and key concepts
        def_patterns = [
            r"([A-Z][a-zA-Z0-9\s-]{2,30})\s+(?:is|are|refers to|means|is defined as)\s+([^.\n]+)",
            r"(?:what is|concept of)\s+([A-Z][a-zA-Z0-9\s-]{2,30})\?*\s*([^.\n]+)",
            r"([A-Z][a-zA-Z0-9\s-]{2,30}):\s+([^.\n]+)"
        ]

        extracted_pairs = []
        for pattern in def_patterns:
            matches = re.findall(pattern, transcript_text, re.IGNORECASE)
            for m in matches:
                name = m[0].strip().title()
                definition = m[1].strip()
                if len(name) > 2 and len(name) < 40 and len(definition) > 10:
                    extracted_pairs.append((name, definition))

        # If heuristic didn't find clear definitions, use noun phrases or OCR text
        if not extracted_pairs and frame and frame.ocr_text:
            lines = [l.strip() for l in frame.ocr_text.split("\n") if len(l.strip()) > 3]
            if lines:
                extracted_pairs.append((lines[0].title(), " ".join(lines[1:3]) or transcript_text[:120]))

        # Deduplicate against existing session concepts
        existing = DatabaseManager.get_concepts(session_id)
        existing_names = {c.name.lower(): c for c in existing}

        for name, defn in extracted_pairs:
            low_name = name.lower()
            if low_name in existing_names:
                # Update existing concept with new evidence if needed
                continue

            concept = Concept(
                session_id=session_id,
                name=name,
                definition=defn,
                simple_explanation=f"In simple terms, {name} is {defn.lower()}.",
                deep_explanation=f"{name} plays a critical operational role in system workflows. Grounded in: '{transcript_text[:150]}...'",
                evidence_timestamp=timestamp_formatted,
                evidence_frame_id=frame.id if frame else None,
                related_concepts=[w.strip().title() for w in re.findall(r'\b[A-Z][a-z]{3,}\b', transcript_text)[:3] if w.lower() != low_name],
                exam_importance="High" if any(w in transcript_text.lower() for w in ["important", "exam", "critical", "remember", "key"]) else "Medium",
                difficulty="Intermediate",
                confidence=0.92
            )
            DatabaseManager.add_concept(concept)
            found_concepts.append(concept)

        return found_concepts

knowledge_service = KnowledgeExtractionService()
