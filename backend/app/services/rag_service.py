import re
from typing import List, Dict, Any, Optional
from backend.app.models.schemas import EvidenceItem, Concept, TranscriptSegment, FrameCapture
from backend.app.db.database import DatabaseManager
from backend.app.providers.embedding_provider import embedding_provider

class SessionScopedRAGService:
    """
    Session-Scoped Multimodal RAG Engine.
    Ensures knowledge remains strictly partitioned per session unless cross-session
    is explicitly requested.
    """

    @classmethod
    async def retrieve_context(
        cls,
        session_id: str,
        query: str,
        top_k: int = 4,
        cross_session: bool = False
    ) -> Dict[str, Any]:
        query_vec = await embedding_provider.get_embedding(query)
        raw_terms = re.findall(r'\b[a-zA-Z0-9_-]{2,}\b', query.lower())
        stopwords = {
            "who", "is", "are", "the", "of", "and", "in", "to", "a", "an", "for", 
            "with", "what", "how", "why", "can", "you", "tell", "me", "about", 
            "hi", "hello", "hey", "this", "that", "from", "on", "at", "by"
        }
        meaningful_terms = {t for t in raw_terms if t not in stopwords and len(t) >= 3}

        # If question contains no domain terms (e.g. pure greeting), return empty context immediately
        if not meaningful_terms:
            return {
                "formatted_context": "",
                "evidence": [],
                "concepts": [],
                "transcripts": [],
                "frames": []
            }

        sessions_to_search = [session_id]
        if cross_session:
            all_s = DatabaseManager.list_sessions()
            sessions_to_search = [s.id for s in all_s]

        matched_concepts: List[Dict[str, Any]] = []
        matched_transcripts: List[Dict[str, Any]] = []
        matched_frames: List[Dict[str, Any]] = []
        evidence_citations: List[EvidenceItem] = []

        for sid in sessions_to_search:
            # 1. Search concepts (require term overlap with query)
            concepts = DatabaseManager.get_concepts(sid)
            for c in concepts:
                c_text = f"{c.name} {c.definition} {c.simple_explanation or ''} {' '.join(c.related_concepts)}"
                c_words = set(re.findall(r'\b\w+\b', c_text.lower()))
                overlap = len(c_words.intersection(meaningful_terms))
                if overlap == 0:
                    continue

                c_vec = await embedding_provider.get_embedding(c_text)
                sim = embedding_provider.cosine_similarity(query_vec, c_vec)
                sim += min(0.5, 0.15 * overlap)

                matched_concepts.append({
                    "concept": c,
                    "score": sim,
                    "session_id": sid
                })

            # 2. Search transcripts (require term overlap with query)
            segments = DatabaseManager.get_transcript_segments(sid)
            for seg in segments:
                seg_words = set(re.findall(r'\b\w+\b', seg.text.lower()))
                overlap = len(seg_words.intersection(meaningful_terms))
                if overlap == 0:
                    continue

                s_vec = await embedding_provider.get_embedding(seg.text)
                sim = embedding_provider.cosine_similarity(query_vec, s_vec)
                sim += min(0.5, 0.12 * overlap)

                matched_transcripts.append({
                    "segment": seg,
                    "score": sim,
                    "session_id": sid
                })

            # 3. Search frames (require term overlap with query)
            frames = DatabaseManager.get_frames(sid)
            for f in frames:
                f_text = f"{f.ocr_text} {f.visual_description} {' '.join(f.concepts)}"
                f_words = set(re.findall(r'\b\w+\b', f_text.lower()))
                overlap = len(f_words.intersection(meaningful_terms))
                if overlap == 0:
                    continue

                f_vec = await embedding_provider.get_embedding(f_text)
                sim = embedding_provider.cosine_similarity(query_vec, f_vec)
                sim += min(0.4, 0.1 * overlap)

                matched_frames.append({
                    "frame": f,
                    "score": sim,
                    "session_id": sid
                })

        # Sort and pick top-k
        matched_concepts.sort(key=lambda x: x["score"], reverse=True)
        matched_transcripts.sort(key=lambda x: x["score"], reverse=True)
        matched_frames.sort(key=lambda x: x["score"], reverse=True)

        top_concepts = [item["concept"] for item in matched_concepts[:top_k] if item["score"] >= 0.40]
        top_transcripts = [item["segment"] for item in matched_transcripts[:top_k] if item["score"] >= 0.40]
        top_frames = [item["frame"] for item in matched_frames[:top_k] if item["score"] >= 0.40]

        # Build evidence citations
        seen_ts = set()
        for c in top_concepts:
            if c.evidence_timestamp and c.evidence_timestamp not in seen_ts:
                seen_ts.add(c.evidence_timestamp)
                evidence_citations.append(EvidenceItem(
                    timestamp=c.evidence_timestamp,
                    frame_id=c.evidence_frame_id,
                    thumbnail_url=f"/api/frames/{c.evidence_frame_id}/thumbnail" if c.evidence_frame_id else None,
                    quote=c.definition,
                    concept_name=c.name
                ))

        for seg in top_transcripts:
            if seg.timestamp_formatted not in seen_ts:
                seen_ts.add(seg.timestamp_formatted)
                evidence_citations.append(EvidenceItem(
                    timestamp=seg.timestamp_formatted,
                    timestamp_sec=seg.timestamp_start,
                    frame_id=seg.associated_frame_id,
                    thumbnail_url=f"/api/frames/{seg.associated_frame_id}/thumbnail" if seg.associated_frame_id else None,
                    quote=seg.text[:120] + "..." if len(seg.text) > 120 else seg.text,
                    concept_name=seg.topic or "Topic Discussion"
                ))

        for f in top_frames:
            if f.timestamp_formatted not in seen_ts and len(evidence_citations) < 5:
                seen_ts.add(f.timestamp_formatted)
                evidence_citations.append(EvidenceItem(
                    timestamp=f.timestamp_formatted,
                    timestamp_sec=f.timestamp_sec,
                    frame_id=f.id,
                    thumbnail_url=f"/api/frames/{f.id}/thumbnail",
                    quote=f.visual_description,
                    concept_name=f.category.value
                ))

        # Assemble unified text context
        context_parts = []
        if top_concepts:
            context_parts.append("### Grounded Concepts from Lesson:")
            for c in top_concepts:
                context_parts.append(f"- **{c.name}** (at {c.evidence_timestamp or 'lesson'}): {c.definition}")
                if c.simple_explanation:
                    context_parts.append(f"  *Simple explanation*: {c.simple_explanation}")

        if top_transcripts:
            context_parts.append("\n### Relevant Lesson Transcript Excerpts:")
            for s in top_transcripts:
                context_parts.append(f"[{s.timestamp_formatted}] {s.text}")

        if top_frames:
            context_parts.append("\n### Visual Evidence & Diagrams Shown:")
            for f in top_frames:
                context_parts.append(f"[{f.timestamp_formatted}] Type: {f.category.value} - {f.visual_description}")
                if f.ocr_text:
                    context_parts.append(f"  *Slide Text*: {f.ocr_text[:140]}")

        formatted_context = "\n".join(context_parts) if context_parts else "No specific matching segment found in current session."

        return {
            "formatted_context": formatted_context,
            "concepts": top_concepts,
            "transcripts": top_transcripts,
            "frames": top_frames,
            "evidence": evidence_citations
        }

rag_service = SessionScopedRAGService()
