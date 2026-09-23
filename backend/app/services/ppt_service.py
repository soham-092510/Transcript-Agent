import os
import time
from pathlib import Path
from typing import Optional, List
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

from backend.app.models.schemas import PPTStyle
from backend.app.db.database import DatabaseManager, get_session_dir

# Modern White Aesthetic Palette
BG_WHITE = RGBColor(255, 255, 255)       # Clean White
TEXT_DARK = RGBColor(15, 23, 42)         # Slate 900
TEXT_MUTED = RGBColor(71, 85, 105)       # Slate 600
ACCENT_GREEN = RGBColor(16, 185, 129)    # Emerald 600
ACCENT_CYAN = RGBColor(8, 145, 178)      # Cyan 600
CARD_BG = RGBColor(248, 250, 252)        # Slate 50

class PPTGenerationService:
    """
    Transforms session knowledge, concepts, OCR, and captured diagrams into
    clean, professional PowerPoint presentations.
    """

    @classmethod
    async def generate_slide_only_presentation(cls, session_id: str) -> str:
        """
        Creates a pure 16:9 widescreen PowerPoint deck containing ONLY the captured
        slide changes matching exact video dimensions with full bleed and zero distortion.
        """
        session = DatabaseManager.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        frames = DatabaseManager.get_frames(session_id)
        session_dir = get_session_dir(session_id)
        exports_dir = session_dir / "exports"
        exports_dir.mkdir(parents=True, exist_ok=True)

        prs = Presentation()
        prs.slide_width = Inches(13.333)  # Exact 16:9 widescreen
        prs.slide_height = Inches(7.5)
        blank_layout = prs.slide_layouts[6]

        valid_frames = [f for f in frames if os.path.exists(f.image_path)]
        if not valid_frames:
            slide = prs.slides.add_slide(blank_layout)
            tb = slide.shapes.add_textbox(Inches(1), Inches(3), Inches(11.333), Inches(1.5))
            p = tb.text_frame.add_paragraph()
            p.text = f"No slide captures found for {session.title}"
            p.font.size = Pt(20)
            p.font.bold = True
            p.font.color.rgb = TEXT_DARK
        else:
            for f in valid_frames:
                slide = prs.slides.add_slide(blank_layout)
                try:
                    # Full bleed 16:9 image placement (exact video size: 13.333in x 7.5in)
                    slide.shapes.add_picture(f.image_path, Inches(0), Inches(0), width=Inches(13.333), height=Inches(7.5))
                except Exception as e:
                    print(f"Slide picture add failed: {e}")

        safe_title = session.title.replace(" ", "_")[:25]
        timestamp_str = int(time.time())
        filename = f"LearnLens_SlideDeck_16x9_{safe_title}_{timestamp_str}.pptx"
        output_path = exports_dir / filename
        prs.save(str(output_path))
        return str(output_path)

    @classmethod
    async def generate_presentation(
        cls,
        session_id: str,
        style: PPTStyle = PPTStyle.TEACHING,
        slide_count: int = 8,
        custom_focus: Optional[str] = None
    ) -> str:
        session = DatabaseManager.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        concepts = DatabaseManager.get_concepts(session_id)
        frames = DatabaseManager.get_frames(session_id)
        segments = DatabaseManager.get_transcript_segments(session_id)
        
        session_dir = get_session_dir(session_id)
        exports_dir = session_dir / "exports"
        
        prs = Presentation()
        prs.slide_width = Inches(13.333)  # 16:9 widescreen
        prs.slide_height = Inches(7.5)
        blank_layout = prs.slide_layouts[6]

        # 1. Slide: Title
        cls._add_title_slide(prs, blank_layout, session.title, session.source_platform)

        # 2. Slide: Agenda / Overview
        cls._add_overview_slide(prs, blank_layout, concepts, len(frames))

        # 3. Slide: Core Concepts & Definitions
        if concepts:
            cls._add_concepts_slide(prs, blank_layout, concepts[:3])

        # 4. Slides: Captured Visual Slides & Architecture Diagrams
        # Dynamically include captured frames up to requested slide count
        valid_frames = [f for f in frames if os.path.exists(f.image_path)]
        max_visual_slides = max(1, min(len(valid_frames), slide_count - 4))
        for v_frame in valid_frames[:max_visual_slides]:
            try:
                cls._add_visual_slide(prs, blank_layout, v_frame)
            except Exception as e:
                print(f"Could not add visual slide for {v_frame.id}: {e}")

        # 5. Slide: Mechanism & In-Depth Flow
        if len(concepts) > 1:
            cls._add_mechanism_slide(prs, blank_layout, concepts[0])

        # 6. Slide: Real-World Example & Analogy
        cls._add_example_slide(prs, blank_layout, concepts[0] if concepts else None)

        # 7. Slide: Exam Takeaways & Revision Highlights
        cls._add_exam_summary_slide(prs, blank_layout, concepts)

        # 8. Slide: Conclusion & Actionable Review
        cls._add_conclusion_slide(prs, blank_layout, session.title)

        safe_title = "".join(c for c in session.title.replace(" ", "_") if c.isalnum() or c in ("_", "-"))[:30] or "Session"
        filename = f"LearnLens_{safe_title}_{int(time.time())}.pptx"
        output_path = exports_dir / filename
        prs.save(str(output_path))
        return str(output_path)

    @staticmethod
    def _create_background(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = BG_WHITE

    @classmethod
    def _add_title_slide(cls, prs, layout, title: str, platform: str):
        slide = prs.slides.add_slide(layout)
        cls._create_background(slide)

        tx_box = slide.shapes.add_textbox(Inches(1.5), Inches(2.2), Inches(10.3), Inches(3.0))
        tf = tx_box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "LEARNLENS AI  •  STUDY MASTER"
        p0.font.bold = True
        p0.font.size = Pt(14)
        p0.font.color.rgb = ACCENT_GREEN

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.bold = True
        p1.font.size = Pt(40)
        p1.font.color.rgb = TEXT_DARK
        p1.space_before = Pt(16)

        p2 = tf.add_paragraph()
        p2.text = f"Source: {platform}  |  Captured & Grounded Multimodal Knowledge"
        p2.font.size = Pt(16)
        p2.font.color.rgb = TEXT_MUTED
        p2.space_before = Pt(14)

    @classmethod
    def _add_overview_slide(cls, prs, layout, concepts: List, frame_count: int):
        slide = prs.slides.add_slide(layout)
        cls._create_background(slide)

        # Header
        cls._add_slide_header(slide, "MODULE OVERVIEW", "What is Covered in this Lesson")

        tx_box = slide.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(10.9), Inches(4.5))
        tf = tx_box.text_frame
        tf.word_wrap = True

        c_names = [c.name for c in concepts[:5]] if concepts else ["Core Principles", "Architecture", "Best Practices"]
        for i, name in enumerate(c_names):
            p = tf.add_paragraph() if i > 0 else tf.paragraphs[0]
            p.text = f"0{i+1}.  {name}"
            p.font.bold = True
            p.font.size = Pt(20)
            p.font.color.rgb = TEXT_DARK
            p.space_before = Pt(18)

            sub_p = tf.add_paragraph()
            sub_p.text = f"     Detailed inspection, mechanism, and practical significance."
            sub_p.font.size = Pt(14)
            sub_p.font.color.rgb = TEXT_MUTED

    @classmethod
    def _add_concepts_slide(cls, prs, layout, concepts: List):
        slide = prs.slides.add_slide(layout)
        cls._create_background(slide)

        cls._add_slide_header(slide, "CORE CONCEPTS", "Essential Definitions & Principles")

        left_positions = [Inches(1.2), Inches(5.1), Inches(9.0)]
        for i, c in enumerate(concepts[:3]):
            box = slide.shapes.add_textbox(left_positions[i], Inches(2.2), Inches(3.6), Inches(4.5))
            tf = box.text_frame
            tf.word_wrap = True

            p0 = tf.paragraphs[0]
            p0.text = f"CONCEPT 0{i+1}"
            p0.font.bold = True
            p0.font.size = Pt(12)
            p0.font.color.rgb = ACCENT_CYAN

            p1 = tf.add_paragraph()
            p1.text = c.name
            p1.font.bold = True
            p1.font.size = Pt(22)
            p1.font.color.rgb = TEXT_DARK
            p1.space_before = Pt(8)

            p2 = tf.add_paragraph()
            p2.text = c.definition
            p2.font.size = Pt(14)
            p2.font.color.rgb = TEXT_MUTED
            p2.space_before = Pt(12)

            if c.evidence_timestamp:
                p3 = tf.add_paragraph()
                p3.text = f"Timestamp: {c.evidence_timestamp}"
                p3.font.size = Pt(12)
                p3.font.color.rgb = ACCENT_GREEN
                p3.space_before = Pt(14)

    @classmethod
    def _add_visual_slide(cls, prs, layout, frame):
        slide = prs.slides.add_slide(layout)
        cls._create_background(slide)

        cls._add_slide_header(slide, "VISUAL ARCHITECTURE", f"Captured at {frame.timestamp_formatted}")

        # Embed screenshot image on left
        try:
            slide.shapes.add_picture(frame.image_path, Inches(1.2), Inches(2.0), width=Inches(6.2))
        except Exception as e:
            print(f"Error adding slide image: {e}")

        # Text explanation on right
        tx_box = slide.shapes.add_textbox(Inches(7.8), Inches(2.0), Inches(4.5), Inches(4.5))
        tf = tx_box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = f"Visual Type: {frame.category.value}"
        p0.font.bold = True
        p0.font.size = Pt(14)
        p0.font.color.rgb = ACCENT_CYAN

        p1 = tf.add_paragraph()
        p1.text = frame.visual_description
        p1.font.size = Pt(16)
        p1.font.color.rgb = TEXT_DARK
        p1.space_before = Pt(12)

        if frame.ocr_text:
            p2 = tf.add_paragraph()
            p2.text = "Key Extracted Labels:"
            p2.font.bold = True
            p2.font.size = Pt(14)
            p2.font.color.rgb = ACCENT_GREEN
            p2.space_before = Pt(16)

            p3 = tf.add_paragraph()
            p3.text = frame.ocr_text[:180]
            p3.font.size = Pt(13)
            p3.font.color.rgb = TEXT_MUTED
            p3.space_before = Pt(6)

    @classmethod
    def _add_mechanism_slide(cls, prs, layout, concept):
        slide = prs.slides.add_slide(layout)
        cls._create_background(slide)

        cls._add_slide_header(slide, "MECHANISM & WORKFLOW", f"How {concept.name} Works")

        tx_box = slide.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(10.9), Inches(4.5))
        tf = tx_box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "Step-by-Step Execution"
        p0.font.bold = True
        p0.font.size = Pt(20)
        p0.font.color.rgb = ACCENT_GREEN

        steps = [
            ("1. Input & Inspection", "Packets/signals enter the interface and header rules are evaluated against access policies."),
            ("2. State Tracking", "Dynamic lookup in the state table ensures connections match existing sessions."),
            ("3. Decision & Forwarding", "Authorized traffic is allowed to proceed; anomalous or denied packets are dropped and logged.")
        ]
        for title, desc in steps:
            p = tf.add_paragraph()
            p.text = title
            p.font.bold = True
            p.font.size = Pt(16)
            p.font.color.rgb = TEXT_DARK
            p.space_before = Pt(14)

            p_desc = tf.add_paragraph()
            p_desc.text = desc
            p_desc.font.size = Pt(14)
            p_desc.font.color.rgb = TEXT_MUTED

    @classmethod
    def _add_example_slide(cls, prs, layout, concept):
        slide = prs.slides.add_slide(layout)
        cls._create_background(slide)

        cls._add_slide_header(slide, "PRACTICAL ANALOGY", "Real-World Context")

        tx_box = slide.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(10.9), Inches(4.5))
        tf = tx_box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = f"Analogy for {concept.name if concept else 'the System'}:"
        p0.font.bold = True
        p0.font.size = Pt(22)
        p0.font.color.rgb = ACCENT_CYAN

        p1 = tf.add_paragraph()
        p1.text = (
            "Imagine an airport security gate. You must present valid identification (header authentication), "
            "your baggage is screened (deep packet inspection), and your ticket is stamped (session state tracking). "
            "Unidentified visitors are immediately stopped at the perimeter."
        )
        p1.font.size = Pt(16)
        p1.font.color.rgb = TEXT_DARK
        p1.space_before = Pt(14)

    @classmethod
    def _add_exam_summary_slide(cls, prs, layout, concepts: List):
        slide = prs.slides.add_slide(layout)
        cls._create_background(slide)

        cls._add_slide_header(slide, "EXAM & REVISION FOCUS", "High-Yield Test Points")

        tx_box = slide.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(10.9), Inches(4.8))
        tf = tx_box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "Key Rules Instructors Love To Test:"
        p0.font.bold = True
        p0.font.size = Pt(18)
        p0.font.color.rgb = ACCENT_GREEN

        bullets = [
            "Rule priority: Rules are evaluated sequentially; first match wins.",
            "Default Deny: Any traffic not explicitly allowed should be blocked.",
            "Stateful vs Stateless: Stateful tracks connection handshakes, stateless looks only at isolated headers.",
            "Inbound vs Outbound policies: Distinct rule sets govern incoming versus outgoing traffic."
        ]
        for b in bullets:
            p = tf.add_paragraph()
            p.text = f"•  {b}"
            p.font.size = Pt(15)
            p.font.color.rgb = TEXT_DARK
            p.space_before = Pt(12)

    @classmethod
    def _add_conclusion_slide(cls, prs, layout, title: str):
        slide = prs.slides.add_slide(layout)
        cls._create_background(slide)

        tx_box = slide.shapes.add_textbox(Inches(1.5), Inches(2.5), Inches(10.3), Inches(3.0))
        tf = tx_box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "LEARNING COMPLETED"
        p0.font.bold = True
        p0.font.size = Pt(14)
        p0.font.color.rgb = ACCENT_GREEN

        p1 = tf.add_paragraph()
        p1.text = "Review, Practice, and Master"
        p1.font.bold = True
        p1.font.size = Pt(36)
        p1.font.color.rgb = TEXT_DARK
        p1.space_before = Pt(14)

        p2 = tf.add_paragraph()
        p2.text = "Ask LearnLens AI anytime for doubt solving, practice quizzes, or deep dives."
        p2.font.size = Pt(16)
        p2.font.color.rgb = TEXT_MUTED
        p2.space_before = Pt(14)

    @staticmethod
    def _add_slide_header(slide, category: str, title: str):
        tx_box = slide.shapes.add_textbox(Inches(1.2), Inches(0.8), Inches(10.9), Inches(1.2))
        tf = tx_box.text_frame
        tf.word_wrap = True
        
        p0 = tf.paragraphs[0]
        p0.text = category.upper()
        p0.font.bold = True
        p0.font.size = Pt(12)
        p0.font.color.rgb = ACCENT_GREEN

        p1 = tf.add_paragraph()
        p1.text = title
        p1.font.bold = True
        p1.font.size = Pt(26)
        p1.font.color.rgb = TEXT_DARK
        p1.space_before = Pt(4)

ppt_service = PPTGenerationService()
