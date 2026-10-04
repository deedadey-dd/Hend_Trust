import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total page numbers and render professional headers/footers.
    """
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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "HendAxis Trust — Beta / UAT Testing Strategy & Execution Plan")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 742, letter[0] - 54, 742)

        # Footer (all pages)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_str)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — HENDAXIS TRUST ESCROW PLATFORM")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)

        self.restoreState()


def build_pdf(filename="docs/UAT_BETA_TESTING_EXECUTION_PLAN.pdf"):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Brand Colors
    PRIMARY = colors.HexColor("#0363ff")    # Brand Blue
    SECONDARY = colors.HexColor("#ff6d1d")  # Brand Orange
    DARK = colors.HexColor("#0f172a")       # Slate 900
    TEXT_MUTED = colors.HexColor("#475569") # Slate 600
    BG_LIGHT = colors.HexColor("#f8fafc")   # Slate 50
    BORDER_COLOR = colors.HexColor("#e2e8f0")

    # Typography
    styles.add(ParagraphStyle('DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=22, leading=26, textColor=DARK))
    styles.add(ParagraphStyle('DocSubtitle', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=15, textColor=TEXT_MUTED))
    styles.add(ParagraphStyle('SectionHeading', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=PRIMARY, spaceBefore=14, spaceAfter=6, keepWithNext=True))
    styles.add(ParagraphStyle('SubSectionHeading', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=SECONDARY, spaceBefore=10, spaceAfter=4, keepWithNext=True))
    styles.add(ParagraphStyle('BodyCustom', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=DARK, spaceAfter=6))
    styles.add(ParagraphStyle('BodyBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=DARK))
    styles.add(ParagraphStyle('CalloutText', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8.5, leading=12, textColor=DARK))
    styles.add(ParagraphStyle('TableHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.white, alignment=1))
    styles.add(ParagraphStyle('TableCell', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, textColor=DARK))
    styles.add(ParagraphStyle('TableCellBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=DARK))
    styles.add(ParagraphStyle('TableCellCenter', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=11, textColor=DARK, alignment=1))

    story = []

    # Title Block
    story.append(Paragraph("HendAxis Trust — Beta / UAT Execution Plan", styles['DocTitle']))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Author:</b> Senior QA Engineer, Software Test Manager & Django Specialist &nbsp;|&nbsp; <b>Duration:</b> 12–14 Days &nbsp;|&nbsp; <b>Effort:</b> ~2h/day", styles['DocSubtitle']))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=0, spaceAfter=12))

    # Executive Summary Box
    summary_data = [[
        Paragraph(
            "<b>EXECUTIVE MANDATE & SCOPE:</b><br/>"
            "HendAxis Trust is an immutable double-entry escrow platform managing real financial value in Ghana. "
            "This plan details a structured, WhatsApp-coordinated 12-day User Acceptance Testing (UAT) regime covering "
            "7 testing roles, Paystack Mobile Money/Card sandboxes, dual logistics (Courier vs Bus OTP), tiered inspection periods, "
            "dispute arbitration with item return reverse-OTPs, and non-dispatch penalty governance.",
            styles['CalloutText']
        )
    ]]
    summary_table = Table(summary_data, colWidths=[letter[0]-108])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bfdbfe")),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 12))

    # Section 1: Testing Roles
    story.append(Paragraph("1. Testing Roles & Team Allocation Matrix", styles['SectionHeading']))
    story.append(Paragraph(
        "Testers are divided into specific operational roles to mirror authentic platform personas. "
        "Participants must strictly follow their assigned role permissions during testing sessions.",
        styles['BodyCustom']
    ))

    roles_data = [
        [
            Paragraph("Role Persona", styles['TableHeader']),
            Paragraph("System Scope & Target Features", styles['TableHeader']),
            Paragraph("Min", styles['TableHeader']),
            Paragraph("Rec", styles['TableHeader']),
            Paragraph("Ideal", styles['TableHeader']),
            Paragraph("Safe Combine?", styles['TableHeader'])
        ],
        [
            Paragraph("<b>Role A: Consumer Buyer</b><br/>(Guest & Authenticated)", styles['TableCell']),
            Paragraph("Checkout (<code>/l/:id</code>), MoMo payment, upfront OTP tracking (<code>/track</code>), inspection timers, 1-click release, 3-axis reviews.", styles['TableCell']),
            Paragraph("3", styles['TableCellCenter']),
            Paragraph("5", styles['TableCellCenter']),
            Paragraph("8", styles['TableCellCenter']),
            Paragraph("❌ No", styles['TableCellCenter']),
        ],
        [
            Paragraph("<b>Role B: Store Merchant</b><br/>(Social Commerce Seller)", styles['TableCell']),
            Paragraph("Storefront (<code>/store/:user</code>), KYC upload, link creation, 1-click WhatsApp escrow generator, Paths A & B dispatch, wallet ledger, review replies.", styles['TableCell']),
            Paragraph("2", styles['TableCellCenter']),
            Paragraph("4", styles['TableCellCenter']),
            Paragraph("6", styles['TableCellCenter']),
            Paragraph("❌ No", styles['TableCellCenter']),
        ],
        [
            Paragraph("<b>Role C: Dispute Arbiter</b><br/>(Trust & Legal Arbiter)", styles['TableCell']),
            Paragraph("Arbiter queue (<code>tab=disputes</code>), 360° dossiers, unified chat stream, 4 ruling types (Release, Full Refund, Partial Split, Item Return).", styles['TableCell']),
            Paragraph("1", styles['TableCellCenter']),
            Paragraph("2", styles['TableCellCenter']),
            Paragraph("3", styles['TableCellCenter']),
            Paragraph("⚠️ With Role D", styles['TableCellCenter']),
        ],
        [
            Paragraph("<b>Role D: Compliance Officer</b><br/>(KYC & Risk Manager)", styles['TableCell']),
            Paragraph("Ghana Card / Business License verification (<code>tab=verifications</code>), suspension appeals (<code>tab=appeals</code>), seller non-dispatch rates.", styles['TableCell']),
            Paragraph("1", styles['TableCellCenter']),
            Paragraph("2", styles['TableCellCenter']),
            Paragraph("2", styles['TableCellCenter']),
            Paragraph("⚠️ With Role C", styles['TableCellCenter']),
        ],
        [
            Paragraph("<b>Role E: Finance Admin</b><br/>(Accountant & Ledger Auditor)", styles['TableCell']),
            Paragraph("Double-entry ledger audit (<code>tab=funds</code>), system bank assets, platform revenue vs gateway fee expenses, arbiter payout batches.", styles['TableCell']),
            Paragraph("1", styles['TableCellCenter']),
            Paragraph("1", styles['TableCellCenter']),
            Paragraph("2", styles['TableCellCenter']),
            Paragraph("❌ No", styles['TableCellCenter']),
        ],
        [
            Paragraph("<b>Role F: Support Agent</b><br/>(Customer Helpdesk)", styles['TableCell']),
            Paragraph("Transaction lookup (<code>tab=transactions</code>), buyer intelligence, notification center logs (<code>/notifications</code>), broadcast alerts.", styles['TableCell']),
            Paragraph("1", styles['TableCellCenter']),
            Paragraph("2", styles['TableCellCenter']),
            Paragraph("2", styles['TableCellCenter']),
            Paragraph("⚠️ With Lead QA", styles['TableCellCenter']),
        ],
        [
            Paragraph("<b>Role G: Lead QA / Manager</b><br/>(WhatsApp Coordinator)", styles['TableCell']),
            Paragraph("WhatsApp daily briefing, Celery time-shift triggers, mock webhook events, nightly database backups, defect triage.", styles['TableCell']),
            Paragraph("1", styles['TableCellCenter']),
            Paragraph("1", styles['TableCellCenter']),
            Paragraph("1", styles['TableCellCenter']),
            Paragraph("❌ Dedicated", styles['TableCellCenter']),
        ],
        [
            Paragraph("<b>TOTAL COHORT SIZE</b>", styles['TableCellBold']),
            Paragraph("<b>Comprehensive multi-device & network coverage across Ghana</b>", styles['TableCellBold']),
            Paragraph("<b>9</b>", styles['TableCellCenter']),
            Paragraph("<b>16</b>", styles['TableCellCenter']),
            Paragraph("<b>24</b>", styles['TableCellCenter']),
            Paragraph("—", styles['TableCellCenter']),
        ]
    ]

    roles_table = Table(roles_data, colWidths=[110, 230, 32, 32, 36, 64])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-2), [colors.white, BG_LIGHT]),
        ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor("#f1f5f9")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(roles_table)
    story.append(Spacer(1, 14))

    # Section 2: 12-Day Testing Schedule
    story.append(Paragraph("2. Detailed 12-Day Testing Schedule & Daily Role Matrix", styles['SectionHeading']))
    story.append(Paragraph(
        "Each testing day runs for approximately <b>2 hours per participant</b>. Testers receive daily WhatsApp prompts at 10:00 AM GMT.",
        styles['BodyCustom']
    ))

    days_content = [
        ("Day 1 – Onboarding, Authentication, Security & KYC",
         "Sellers (Heavy), Buyers (Moderate), Compliance (Heavy), Lead QA (Heavy)",
         "User registration, JWT HTTP-only cookies, 2FA TOTP setup, password recovery, Ghana Card KYC photo uploads, Compliance approval/rejection workflows in Admin Portal.",
         "Unverified sellers claiming verified badge, token drops on tab switch, invalid Ghana Card format bypass."),
        
        ("Day 2 – Storefronts, Payment Links & 1-Click WhatsApp Escrow",
         "Sellers (Heavy), Buyers (Moderate), Lead QA (Moderate)",
         "Create links (GHS 150, 3.5k, 12k), dynamic fee calculations (Absorb vs Pass), 1-Click WhatsApp Escrow generator with prefilled parameters, embeddable JS badges.",
         "Fee math rounding errors, suspended sellers generating active links, XSS injection in description."),

        ("Day 3 – Public Checkout, Paystack MoMo Sandboxes & Auth Modes",
         "Buyers (Heavy), Sellers (Light), Lead QA (Heavy)",
         "Guest checkout with post-payment account creation; Authenticated buyer 1-Click Zero-OTP checkout; Sandbox MTN, Telecel, AT MoMo & test cards.",
         "Double transactions from duplicate webhooks, page reload dropping order state, guest unable to track."),

        ("Day 4 – Dual Logistics Verification & Upfront OTP Tracking",
         "Sellers (Heavy), Buyers (Heavy), Lead QA (Moderate)",
         "Path A (Courier tracking + waybill WebP) and Path B (Informal Bus with driver phone/car #/station + waybill photo); Upfront 6-digit OTP tracking portal (/track).",
         "Bus dispatch failing to generate secret OTP, tracking OTP rate-limit bypass, sensitive seller payout leak."),

        ("Day 5 – Tiered Inspection Periods, 1-Click Release & Reviews",
         "Buyers (Heavy), Sellers (Moderate), Finance Admin (Light)",
         "Delivery confirmation handoff; Tiered inspection countdowns (24h for <2k, 48h for 2k-10k, 72h for >=10k); 1-Click escrow payout release; 3-axis verified review.",
         "Wrong inspection tier assigned, unauthenticated review posting, double-clicking release causing double payout."),

        ("Day 6 – Dispute Resolution Engine, 5-Photo Trail & Retraction",
         "Buyers (Heavy), Sellers (Heavy), Arbiters (Heavy)",
         "Buyer raises dispute with category + 2 photos; Subsequent dialogue append (--- [Update] ---); Seller defense; Unified chat timeline; 360° dossiers; Dispute retraction.",
         "Uploading >5 photos per party, images >1MB breaking layout, review stars still showing during dispute."),

        ("Day 7 – Item Return Subsystem, Reverse Pickup OTP & Rulings",
         "Arbiters (Heavy), Buyers (Moderate), Sellers (Moderate), Finance (Light)",
         "Execute 4 rulings (Release, Full Refund, Partial Split, Require Return); Buyer dispatches return via bus; 6-digit Reverse OTP verification; Auto-refund timeout.",
         "Unallocated split funds in partial refund leaking out of ledger, Reverse OTP bypass, return timeout failure."),

        ("Day 8 – Seller Health Governance, Non-Dispatch Expiries & Appeals",
         "Sellers (Heavy), Compliance (Heavy), Lead QA (Heavy)",
         "Celery 4-day non-dispatch timeout trigger; Non-dispatch default penalty deduction; Auto-suspension threshold (>35% default rate); Suspension appeals desk review & clean-slate.",
         "In-flight orders blocked during suspension, reinstated sellers immediately re-suspended, penalty miscalculation."),

        ("Day 9 – Double-Entry Financial Ledger & Payout Mode Audits",
         "Finance Admins (Heavy), Sellers (Moderate), Arbiters (Light)",
         "Audit balance sheet invariant (Assets = Liabilities + Equity); Instant vs Manual withdrawal modes; Bank account name verification; Arbiter payout batch creation.",
         "Unbalanced ledger entries (orphan rows), double-withdrawal race condition, negative wallet balances."),

        ("Day 10 – Promotions, Referral Engine, Cashback & Directory",
         "Buyers (Heavy), Sellers (Heavy), Lead QA (Moderate)",
         "Double-sided referral link rewards (GHS 15 referrer / GHS 10 referee); Promo code fee floor safeguards; Seller payout protection rule; Ballpark multi-token store search.",
         "Promo codes deducting from seller merchandise earnings, self-referral bypass, referral rewards on disputed orders."),

        ("Day 11 – Edge Cases, Concurrency, Interruption & Security",
         "All Roles (Heavy), Lead QA (Heavy Orchestration)",
         "Simultaneous release vs dispute race conditions; Double-click button submissions; Network drop during MoMo; Browser back-button navigation; Privilege escalation checks; Mobile UI.",
         "HTTP 500 unhandled exceptions, database deadlock, infinite loading spinners on token expiry."),

        ("Day 12 – End-to-End Regression, Bug Retesting & Sign-Off",
         "All Roles (Full Participation)",
         "Retest all resolved tickets in Ready for Retest queue; Complete one pristine multi-role golden path transaction; Audit Exit Criteria metrics; Sign UAT Acceptance Certificate.",
         "Regression defects from hotfixes, unverified bug closures, unresolved Critical/High tickets.")
    ]

    for title, roles, desc, watch in days_content:
        day_box = [
            [Paragraph(f"<b>{title}</b>", styles['SubSectionHeading']), Paragraph(f"<b>Active Roles:</b> {roles}", styles['TableCellBold'])],
            [Paragraph(f"<b>Workflows:</b> {desc}", styles['TableCell']), Paragraph(f"<b>Key Risks to Watch:</b> {watch}", styles['TableCell'])]
        ]
        t = Table(day_box, colWidths=[290, 214])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
            ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
            ('PADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t)
        story.append(Spacer(1, 5))

    story.append(Spacer(1, 10))

    # Section 3: Bug Reporting & Severity Matrix
    story.append(Paragraph("3. Bug Reporting Structure & Severity Classification", styles['SectionHeading']))
    story.append(Paragraph(
        "Testers report quick alerts via WhatsApp and submit structured records to the formal tracker. "
        "Severity levels guide developer hotfix SLAs:",
        styles['BodyCustom']
    ))

    sev_data = [
        [Paragraph("Severity", styles['TableHeader']), Paragraph("Non-Technical Definition", styles['TableHeader']), Paragraph("Platform Example", styles['TableHeader']), Paragraph("Fix SLA", styles['TableHeader'])],
        [
            Paragraph("🔴 <b>Critical</b>", styles['TableCellCenter']),
            Paragraph("System crash, financial loss, ledger imbalance, security leak.", styles['TableCell']),
            Paragraph("Double-payout on release; MoMo charged but order missing.", styles['TableCell']),
            Paragraph("&lt; 4 Hours", styles['TableCellCenter'])
        ],
        [
            Paragraph("🟠 <b>High</b>", styles['TableCellCenter']),
            Paragraph("Core workflow blocked with no workaround.", styles['TableCell']),
            Paragraph("Seller cannot submit dispatch waybill; tracking OTP not sending.", styles['TableCell']),
            Paragraph("&lt; 12 Hours", styles['TableCellCenter'])
        ],
        [
            Paragraph("🟡 <b>Medium</b>", styles['TableCellCenter']),
            Paragraph("Feature functions incorrectly but workaround exists.", styles['TableCell']),
            Paragraph("Review star rating off by 1; search filter pill misaligned.", styles['TableCell']),
            Paragraph("&lt; 24 Hours", styles['TableCellCenter'])
        ],
        [
            Paragraph("🔵 <b>Low</b>", styles['TableCellCenter']),
            Paragraph("Minor functional glitch or wording ambiguity.", styles['TableCell']),
            Paragraph("Unclear error message tooltip; secondary button wrapping.", styles['TableCell']),
            Paragraph("&lt; 48 Hours", styles['TableCellCenter'])
        ],
        [
            Paragraph("⚪ <b>Cosmetic</b>", styles['TableCellCenter']),
            Paragraph("Visual styling, dark mode contrast, typo.", styles['TableCell']),
            Paragraph("Spelling typo in FAQ; banner padding mismatch on mobile.", styles['TableCell']),
            Paragraph("Next Sprint", styles['TableCellCenter'])
        ]
    ]

    sev_table = Table(sev_data, colWidths=[65, 175, 195, 69])
    sev_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(sev_table)
    story.append(Spacer(1, 14))

    # Section 4: Production Entry & Exit Criteria
    story.append(Paragraph("4. Production Launch Exit Criteria (Quality Gate)", styles['SectionHeading']))
    
    gate_data = [
        [Paragraph("Quality Dimension", styles['TableHeader']), Paragraph("Acceptable Threshold for Production", styles['TableHeader']), Paragraph("Gatekeeper Status", styles['TableHeader'])],
        [Paragraph("Critical Severity Bugs", styles['TableCell']), Paragraph("<b>0 Open (Zero Tolerance)</b>", styles['TableCellBold']), Paragraph("🔴 Strict Blocker", styles['TableCellCenter'])],
        [Paragraph("High Severity Bugs", styles['TableCell']), Paragraph("<b>0 Open (Zero Tolerance on Financial/Auth)</b>", styles['TableCellBold']), Paragraph("🔴 Strict Blocker", styles['TableCellCenter'])],
        [Paragraph("Double-Entry Ledger Imbalance", styles['TableCell']), Paragraph("<b>GHS 0.00 (Zero math discrepancy)</b>", styles['TableCellBold']), Paragraph("🔴 Strict Blocker", styles['TableCellCenter'])],
        [Paragraph("Core Workflow Success Rate", styles['TableCell']), Paragraph("<b>&ge; 98.5% Completion across all scenarios</b>", styles['TableCellBold']), Paragraph("🔴 Strict Blocker", styles['TableCellCenter'])],
        [Paragraph("Medium Severity Bugs", styles['TableCell']), Paragraph("&le; 2 Open (With documented low-impact workaround)", styles['TableCell']), Paragraph("🟡 Acceptable", styles['TableCellCenter'])],
        [Paragraph("Low / Cosmetic Issues", styles['TableCell']), Paragraph("&le; 5 Open (Scheduled for post-launch sprint)", styles['TableCell']), Paragraph("🟢 Acceptable", styles['TableCellCenter'])],
    ]
    gate_table = Table(gate_data, colWidths=[160, 224, 120])
    gate_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(gate_table)
    story.append(Spacer(1, 16))

    # Sign-off Block
    story.append(Paragraph("<b>UAT EXECUTION SIGN-OFF:</b>", styles['BodyBold']))
    story.append(Spacer(1, 8))
    sign_data = [
        [Paragraph("<b>Prepared by:</b> Lead QA / Test Manager", styles['TableCell']), Paragraph("<b>Reviewed by:</b> Lead Backend & Ledger Architect", styles['TableCell']), Paragraph("<b>Approved by:</b> Platform Founder & Product Lead", styles['TableCell'])],
        [Paragraph("Signature: ____________________", styles['TableCell']), Paragraph("Signature: ____________________", styles['TableCell']), Paragraph("Signature: ____________________", styles['TableCell'])],
        [Paragraph("Date: ________________________", styles['TableCell']), Paragraph("Date: ________________________", styles['TableCell']), Paragraph("Date: ________________________", styles['TableCell'])]
    ]
    sign_table = Table(sign_data, colWidths=[168, 168, 168])
    sign_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
    ]))
    story.append(sign_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF Successfully Generated at: {filename}")


if __name__ == '__main__':
    build_pdf()
