import os
import re
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)

DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"
PDF_OUT_DIR = DOCS_DIR / "pdf"
PDF_OUT_DIR.mkdir(parents=True, exist_ok=True)

COLOR_PRIMARY = colors.HexColor("#0f172a")   # Slate 900
COLOR_SECONDARY = colors.HexColor("#1e293b") # Slate 800
COLOR_ACCENT = colors.HexColor("#16a34a")    # Emerald 600
COLOR_CYAN = colors.HexColor("#0891b2")      # Cyan 600
COLOR_LIGHT_BG = colors.HexColor("#f8fafc")

def markdown_to_pdf(md_path: Path, pdf_path: Path):
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=COLOR_PRIMARY,
        fontName="Helvetica-Bold",
        spaceAfter=10
    )
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontSize=13,
        leading=17,
        textColor=COLOR_ACCENT,
        fontName="Helvetica-Bold",
        spaceBefore=14,
        spaceAfter=6
    )
    h3_style = ParagraphStyle(
        'DocH3',
        parent=styles['Heading3'],
        fontSize=11,
        leading=15,
        textColor=COLOR_SECONDARY,
        fontName="Helvetica-Bold",
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=COLOR_SECONDARY,
        spaceAfter=6
    )
    code_style = ParagraphStyle(
        'DocCode',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
        fontName="Courier",
        backColor=COLOR_LIGHT_BG,
        borderPadding=6,
        spaceAfter=6
    )

    elements = []

    # Parse markdown lines
    lines = md_text.split("\n")
    in_code_block = False
    code_buffer = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("```"):
            if in_code_block:
                # End code block
                in_code_block = False
                elements.append(Paragraph("<br/>".join([c.replace("<", "&lt;").replace(">", "&gt;") for c in code_buffer]), code_style))
                elements.append(Spacer(1, 4))
                code_buffer = []
            else:
                in_code_block = True
            continue

        if in_code_block:
            code_buffer.append(line)
            continue

        if not stripped:
            continue

        # Headings
        if stripped.startswith("# "):
            title_text = stripped[2:].strip().replace("*", "")
            elements.append(Paragraph(title_text, title_style))
            elements.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_ACCENT, spaceAfter=10))
        elif stripped.startswith("## "):
            h2_text = stripped[3:].strip().replace("*", "")
            elements.append(Paragraph(h2_text, h2_style))
        elif stripped.startswith("### "):
            h3_text = stripped[4:].strip().replace("*", "")
            elements.append(Paragraph(h3_text, h3_style))
        elif stripped.startswith("---"):
            elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey, spaceBefore=6, spaceAfter=6))
        else:
            # Bullet point or normal paragraph
            clean_text = stripped
            clean_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', clean_text)
            clean_text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', clean_text)
            clean_text = clean_text.replace("&", "&amp;") if "&lt;" not in clean_text else clean_text
            elements.append(Paragraph(clean_text, body_style))

    doc.build(elements)
    print(f"Generated PDF: {pdf_path.name}")

def main():
    print("Compiling all documentation to PDF format in docs/pdf/ ...")
    md_files = sorted(list(DOCS_DIR.glob("*.md")))
    for md in md_files:
        pdf_name = md.stem + ".pdf"
        out_pdf = PDF_OUT_DIR / pdf_name
        try:
            markdown_to_pdf(md, out_pdf)
        except Exception as e:
            print(f"Failed to compile {md.name}: {e}")
    print("All PDFs successfully compiled!")

if __name__ == "__main__":
    main()
