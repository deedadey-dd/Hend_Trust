import os
import re
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748b")) # Slate-500
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(45, 805, "HENDAXIS TRUST  •  MASTER TERMS OF SERVICE & USER AGREEMENT")
            self.drawRightString(550, 805, "OCTOBER 2026")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.75)
            self.line(45, 797, 550, 797)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(45, 45, 550, 45)
        
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#94a3b8"))
        self.drawString(45, 32, "CONFIDENTIAL  •  FOR REGULATORY, LEGAL & OPERATIONAL REVIEW")
        
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(550, 32, page_str)
        self.restoreState()


def build_pdf(md_filepath, output_pdf_path):
    with open(md_filepath, "r", encoding="utf-8") as f:
        md_text = f.read()

    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=A4,
        leftMargin=45,
        rightMargin=45,
        topMargin=55,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0363ff")   # HendAxis Brand Blue
    dark_slate = colors.HexColor("#0f172a")      # Slate-900
    subtext_color = colors.HexColor("#475569")   # Slate-600
    alert_bg = colors.HexColor("#fffbeb")        # Amber-50
    alert_border = colors.HexColor("#f59e0b")    # Amber-500
    alert_text = colors.HexColor("#92400e")      # Amber-800

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=subtext_color,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=dark_slate,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_slate,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_slate,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    alert_style = ParagraphStyle(
        'AlertBoxText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=alert_text
    )

    story = []

    lines = md_text.splitlines()
    in_alert = False
    alert_buffer = []

    for line in lines:
        stripped = line.strip()

        # Handle Alert Blockquotes
        if stripped.startswith("> [!IMPORTANT]") or stripped.startswith("> [!WARNING]") or stripped.startswith("> [!NOTE]"):
            in_alert = True
            alert_buffer = []
            continue

        if in_alert:
            if stripped.startswith(">"):
                clean_alert_line = stripped.lstrip(">").strip()
                if clean_alert_line:
                    alert_buffer.append(clean_alert_line)
                continue
            else:
                # Flush alert box
                in_alert = False
                if alert_buffer:
                    alert_content = "<br/>".join(alert_buffer)
                    # Convert markdown formatting
                    alert_content = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', alert_content)
                    alert_content = re.sub(r'\*(.*?)\*', r'<i>\1</i>', alert_content)
                    
                    p = Paragraph(f"⚠️ <b>CRITICAL LEGAL NOTICE:</b><br/>{alert_content}", alert_style)
                    t = Table([[p]], colWidths=[505])
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, -1), alert_bg),
                        ('BOX', (0, 0), (-1, -1), 1.2, alert_border),
                        ('TOPPADDING', (0, 0), (-1, -1), 8),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                        ('LEFTPADDING', (0, 0), (-1, -1), 10),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ]))
                    story.append(Spacer(1, 4))
                    story.append(t)
                    story.append(Spacer(1, 8))
                    alert_buffer = []

        if not stripped or stripped == "---":
            if stripped == "---":
                story.append(Spacer(1, 4))
                story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=8, spaceBefore=4))
            else:
                story.append(Spacer(1, 3))
            continue

        # Convert markdown formatting
        formatted = stripped
        formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', formatted)
        formatted = re.sub(r'\*(.*?)\*', r'<i>\1</i>', formatted)
        formatted = re.sub(r'`(.*?)`', r'<font face="Courier" color="#0363ff"><b>\1</b></font>', formatted)
        formatted = formatted.replace("🛡️", "[Verified]")
        formatted = formatted.replace("🆕", "[New]")
        formatted = formatted.replace("📜", "")
        formatted = formatted.replace("⚖️", "[Legal]")

        if stripped.startswith("# "):
            clean_title = formatted.lstrip("# ").strip()
            story.append(Paragraph("HENDAXIS TRUST", ParagraphStyle('SuperTitle', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor("#ff6d1d"), spaceAfter=2)))
            story.append(Paragraph(clean_title, title_style))
        elif stripped.startswith("## "):
            clean_h1 = formatted.lstrip("# ").strip()
            story.append(Paragraph(clean_h1, h1_style))
        elif stripped.startswith("### "):
            clean_h2 = formatted.lstrip("# ").strip()
            story.append(Paragraph(clean_h2, h2_style))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            bullet_text = formatted[2:].strip()
            story.append(Paragraph(f"• &nbsp; {bullet_text}", bullet_style))
        elif re.match(r'^\d+\.\s', stripped):
            num_match = re.match(r'^(\d+\.)\s(.*)', formatted)
            if num_match:
                num_prefix = num_match.group(1)
                rest = num_match.group(2)
                story.append(Paragraph(f"<b>{num_prefix}</b> &nbsp; {rest}", bullet_style))
            else:
                story.append(Paragraph(formatted, body_style))
        else:
            if "Last Updated:" in stripped or "Effective Date:" in stripped:
                story.append(Paragraph(formatted, subtitle_style))
            else:
                story.append(Paragraph(formatted, body_style))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {output_pdf_path}")


if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    md_path = os.path.join(base_dir, "docs", "TERMS_AND_CONDITIONS.md")
    pdf_path = os.path.join(base_dir, "docs", "HENDAXIS_TRUST_TERMS_AND_CONDITIONS.pdf")
    build_pdf(md_path, pdf_path)
