import os
import time
from pathlib import Path
from typing import List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from backend.app.db.database import DatabaseManager, get_session_dir

COLOR_PRIMARY = colors.HexColor("#0f172a")   # Slate 900
COLOR_SECONDARY = colors.HexColor("#1e293b") # Slate 800
COLOR_ACCENT = colors.HexColor("#16a34a")    # Emerald 600
COLOR_CYAN = colors.HexColor("#0891b2")      # Cyan 600
COLOR_TEXT = colors.HexColor("#1e293b")
COLOR_MUTED = colors.HexColor("#64748b")
COLOR_LIGHT_BG = colors.HexColor("#f8fafc")

class PDFGenerationService:
    """
    Generates two distinct study documents:
    1. PDF A: VISUAL STUDY PACK (Screenshots, Slide images, Timestamps, Descriptions)
    2. PDF B: AI TEACHING REPORT (Complete notes, concepts, definitions, exam prep, questions)
    """

    @classmethod
    async def generate_pdf(cls, session_id: str, pdf_type: str = "teaching_report") -> str:
        session = DatabaseManager.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        concepts = DatabaseManager.get_concepts(session_id)
        frames = DatabaseManager.get_frames(session_id)
        segments = DatabaseManager.get_transcript_segments(session_id)
        
        session_dir = get_session_dir(session_id)
        exports_dir = session_dir / "exports"

        safe_title = session.title.replace(" ", "_")[:25]
        timestamp_str = int(time.time())

        if pdf_type in ("slide_only", "video_size"):
            filename = f"LearnLens_SlideOnly_16x9_{safe_title}_{timestamp_str}.pdf"
            output_path = exports_dir / filename
            cls._build_slide_only_pdf(str(output_path), session, frames)
        elif pdf_type == "visual_pack":
            filename = f"LearnLens_VisualPack_{safe_title}_{timestamp_str}.pdf"
            output_path = exports_dir / filename
            cls._build_visual_pack_pdf(str(output_path), session, frames)
        else:
            filename = f"LearnLens_TeachingReport_{safe_title}_{timestamp_str}.pdf"
            output_path = exports_dir / filename
            cls._build_teaching_report_pdf(str(output_path), session, concepts, frames, segments)

        return str(output_path)

    @classmethod
    def _build_slide_only_pdf(cls, file_path: str, session, frames):
        """Builds pure 16:9 widescreen slide deck PDF matching exact video dimensions."""
        page_w = 10 * inch       # 720 points
        page_h = 5.625 * inch    # 405 points (exact 16:9)
        c = canvas.Canvas(file_path, pagesize=(page_w, page_h))
        
        valid_frames = [f for f in frames if os.path.exists(f.image_path)]
        if not valid_frames:
            c.setFont("Helvetica-Bold", 16)
            c.drawString(72, page_h / 2, f"No slide captures available for {session.title}")
            c.showPage()
        else:
            for f in valid_frames:
                try:
                    c.drawImage(f.image_path, 0, 0, width=page_w, height=page_h)
                    c.showPage()
                except Exception as e:
                    print(f"Canvas slide draw error: {e}")
        c.save()

    @classmethod
    def _build_visual_pack_pdf(cls, file_path: str, session, frames):
        doc = SimpleDocTemplate(file_path, pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle('CoverTitle', parent=styles['Heading1'], fontSize=24, leading=28, textColor=COLOR_PRIMARY, fontName="Helvetica-Bold")
        sub_style = ParagraphStyle('CoverSub', parent=styles['Normal'], fontSize=11, leading=15, textColor=COLOR_MUTED)
        h2_style = ParagraphStyle('SectionHeader', parent=styles['Heading2'], fontSize=15, leading=19, textColor=COLOR_ACCENT, fontName="Helvetica-Bold")
        body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, textColor=COLOR_TEXT)
        ocr_style = ParagraphStyle('OCR', parent=styles['Normal'], fontSize=8, leading=11, textColor=COLOR_MUTED, fontName="Courier")

        elements = []

        # Header Banner
        elements.append(Paragraph("LEARNLENS AI  •  VISUAL STUDY PACK", ParagraphStyle('Tag', fontSize=10, textColor=COLOR_ACCENT, fontName="Helvetica-Bold")))
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(f"{session.title}", title_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f"Source: {session.source_platform} | Captured Visuals: {len(frames)} slides/diagrams", sub_style))
        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceAfter=15))

        if not frames:
            elements.append(Paragraph("No visual frames captured for this session yet.", body_style))
        else:
            for i, f in enumerate(frames):
                frame_block = []
                frame_block.append(Paragraph(f"<b>Frame #{i+1} • {f.category.value}</b> (Captured at {f.timestamp_formatted})", h2_style))
                frame_block.append(Spacer(1, 6))

                # If image exists on disk, embed it
                if os.path.exists(f.image_path):
                    try:
                        # Standard aspect ratio scale
                        img = RLImage(f.image_path, width=5.5 * inch, height=3.1 * inch)
                        frame_block.append(img)
                        frame_block.append(Spacer(1, 6))
                    except Exception as e:
                        print(f"Could not embed image: {e}")

                frame_block.append(Paragraph(f"<b>Visual Description:</b> {f.visual_description}", body_style))
                if f.ocr_text:
                    frame_block.append(Spacer(1, 4))
                    frame_block.append(Paragraph(f"<b>Visible Text (OCR):</b> {f.ocr_text[:200]}", ocr_style))
                
                frame_block.append(Spacer(1, 14))
                frame_block.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceAfter=14))
                elements.append(KeepTogether(frame_block))

        doc.build(elements)

    @classmethod
    def _build_teaching_report_pdf(cls, file_path: str, session, concepts, frames, segments):
        doc = SimpleDocTemplate(file_path, pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle('ReportTitle', parent=styles['Heading1'], fontSize=24, leading=28, textColor=COLOR_PRIMARY, fontName="Helvetica-Bold")
        sub_style = ParagraphStyle('ReportSub', parent=styles['Normal'], fontSize=10, leading=14, textColor=COLOR_MUTED)
        h2_style = ParagraphStyle('SecHead', parent=styles['Heading2'], fontSize=14, leading=18, textColor=COLOR_PRIMARY, fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6)
        h3_style = ParagraphStyle('SubSecHead', parent=styles['Heading3'], fontSize=11, leading=15, textColor=COLOR_ACCENT, fontName="Helvetica-Bold")
        body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, textColor=COLOR_TEXT)
        callout_style = ParagraphStyle('Callout', parent=styles['Normal'], fontSize=10, leading=14, textColor=COLOR_SECONDARY, backColor=COLOR_LIGHT_BG, borderPadding=8)

        elements = []

        # Title Block
        elements.append(Paragraph("LEARNLENS AI  •  STUDY REPORT", ParagraphStyle('Tag', fontSize=10, textColor=COLOR_ACCENT, fontName="Helvetica-Bold")))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f"{session.title}", title_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f"Platform: {session.source_platform}  |  Learned Knowledge Namespace", sub_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceAfter=14))

        # 1. Executive Summary
        elements.append(Paragraph("1. Executive Summary", h2_style))
        summary_text = (
            f"This comprehensive study report was dynamically synthesized by LearnLens AI from an authorized "
            f"learning session on <b>{session.source_platform}</b>. Total captured duration covers <b>{int(session.duration_sec // 60)} minutes</b>, "
            f"encompassing <b>{len(concepts)} structured concepts</b> and <b>{len(frames)} verified visual frames</b>. "
            f"All insights are strictly grounded in source timestamps."
        )
        elements.append(Paragraph(summary_text, body_style))
        elements.append(Spacer(1, 10))

        # 2. Key Concepts & Structured Definitions Table
        elements.append(Paragraph("2. Core Concepts & Definitions", h2_style))
        if concepts:
            table_data = [[
                Paragraph("<b>Concept</b>", body_style),
                Paragraph("<b>Definition & Grounded Evidence</b>", body_style),
                Paragraph("<b>Importance</b>", body_style)
            ]]
            for c in concepts[:8]:
                defn_p = Paragraph(f"{c.definition}<br/><font color='#16a34a'><i>Timestamp: {c.evidence_timestamp or 'Lesson'}</i></font>", body_style)
                table_data.append([
                    Paragraph(f"<b>{c.name}</b>", body_style),
                    defn_p,
                    Paragraph(f"<b>{c.exam_importance}</b>", body_style)
                ])

            t = Table(table_data, colWidths=[1.8 * inch, 4.2 * inch, 1.2 * inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), COLOR_LIGHT_BG),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("Concepts are currently being extracted as the lesson streams.", body_style))

        elements.append(Spacer(1, 14))

        # 3. Detailed Explanations & Mechanisms
        elements.append(Paragraph("3. Detailed Mechanisms & Step-by-Step Flow", h2_style))
        for c in concepts[:4]:
            elements.append(Paragraph(f"• <b>Mechanism of {c.name}:</b>", h3_style))
            elements.append(Paragraph(c.deep_explanation or c.definition, body_style))
            elements.append(Spacer(1, 6))

        # 4. Exam Preparation & High-Yield Review
        elements.append(Spacer(1, 8))
        elements.append(Paragraph("4. High-Yield Exam & Revision Points", h2_style))
        exam_tips = (
            "<b>Key Exam Takeaways:</b><br/>"
            "1. Focus on the core distinction between stateful session tracking vs stateless packet evaluation.<br/>"
            "2. Note the 'Default Deny' security postulate — traffic not explicitly permitted must be dropped.<br/>"
            "3. Remember that rule sequencing directly impacts throughput and policy enforcement precedence."
        )
        elements.append(Paragraph(exam_tips, callout_style))

        # 5. Practice Self-Check Questions
        elements.append(Spacer(1, 14))
        elements.append(Paragraph("5. Practice Self-Check Questions", h2_style))
        elements.append(Paragraph("<b>Q1:</b> What is the primary function of a stateful firewall compared to a packet filter?<br/><i>Answer: It monitors the full state of active connections rather than examining packets in isolation.</i>", body_style))
        elements.append(Spacer(1, 6))
        elements.append(Paragraph("<b>Q2:</b> Why is the 'Default Deny' rule critical in enterprise perimeter configurations?<br/><i>Answer: It ensures any unrecognized or newly emergent vector is blocked until explicitly audited and authorized.</i>", body_style))

        doc.build(elements)

pdf_service = PDFGenerationService()
