import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        if self._pageNumber > 1:
            self.drawString(54, 750, "HendAxis Trust — Daily UAT WhatsApp Briefing & Role Instruction Handbook")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 742, letter[0] - 54, 742)

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_str)
        self.drawString(54, 36, "CONFIDENTIAL — HENDAXIS TRUST BETA UAT FACILITATOR MANUAL")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)

        self.restoreState()


def build_handbook_pdf(filename="docs/UAT_DAILY_ROLE_INSTRUCTIONS_HANDBOOK.pdf"):
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
    PRIMARY = colors.HexColor("#0363ff")
    SECONDARY = colors.HexColor("#ff6d1d")
    DARK = colors.HexColor("#0f172a")
    TEXT_MUTED = colors.HexColor("#475569")
    BG_LIGHT = colors.HexColor("#f8fafc")
    BORDER_COLOR = colors.HexColor("#e2e8f0")

    styles.add(ParagraphStyle('DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=20, leading=24, textColor=DARK))
    styles.add(ParagraphStyle('DocSubtitle', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=TEXT_MUTED))
    styles.add(ParagraphStyle('DayHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=PRIMARY, spaceBefore=12, spaceAfter=4, keepWithNext=True))
    styles.add(ParagraphStyle('RoleHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=SECONDARY, spaceBefore=6, spaceAfter=2, keepWithNext=True))
    styles.add(ParagraphStyle('BodyCustom', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=DARK, spaceAfter=4))
    styles.add(ParagraphStyle('CodeBlock', parent=styles['Normal'], fontName='Courier', fontSize=7.5, leading=10.5, textColor=DARK))

    story = []

    story.append(Paragraph("HendAxis Trust — Daily UAT WhatsApp Briefing Handbook", styles['DocTitle']))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Facilitator Manual:</b> Ready-to-Copy Daily WhatsApp Broadcasts & Role Checklists (Days 1–12)", styles['DocSubtitle']))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=0, spaceAfter=10))

    # Cheat sheet box
    cheat_content = [
        [Paragraph("<b>📌 MASTER QUICK REFERENCE TEST DATA (Pin in WhatsApp)</b>", styles['RoleHeader'])],
        [Paragraph("<b>Paystack MoMo Test Numbers:</b> MTN: 0244000001 (OTP 123456) | Telecel: 0200000002 | AT: 0270000003 | Failed: 0244000002<br/>"
                   "<b>Paystack Card:</b> 4084 0840 8408 4084 (Exp 12/28, CVV 408, OTP 123456)<br/>"
                   "<b>Seed Promo Codes:</b> 'BETA2026' (20% Fee Discount), 'WELCOME10' (GHS 10 Off)<br/>"
                   "<b>Staff URLs:</b> Verifications: /admin-portal/dashboard?tab=verifications | Disputes: tab=disputes | Funds: tab=funds | Appeals: tab=appeals", styles['BodyCustom'])]
    ]
    t = Table(cheat_content, colWidths=[letter[0]-108])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#bfdbfe")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    days_data = [
        ("Day 1: Onboarding, Account Security & KYC Identity", [
            ("Role B (Sellers)", "1. Register seller at /register & confirm phone OTP + email.\n2. In /profile, upload banner, logo, description, 3 categories, and mock Ghana Card.\n3. Turn ON 2FA TOTP in profile; test login with Google Authenticator."),
            ("Role A (Buyers)", "1. Register buyer at /register & verify OTP.\n2. In /profile, save Default Delivery Address.\n3. Test Forgot Password recovery link at /forgot-password."),
            ("Role D (Compliance)", "1. In /admin-portal/dashboard?tab=verifications, inspect submitted Ghana Cards.\n2. Approve Seller #1 & #2 (verify badge on /store/username); Reject Seller #3 with reason.")
        ]),
        ("Day 2: Storefronts, Payment Links & 1-Click WhatsApp Escrow", [
            ("Role B (Sellers)", "1. In /create-link, generate 3 links: Low (GHS 250, Pass Fee), Mid (GHS 3.8k, Absorb Fee), High (GHS 14.5k, Pass Fee).\n2. Verify real-time fee math. Post Storefront URL (/store/username) in WhatsApp."),
            ("Role A (Buyers)", "1. Open Seller Storefront -> Click 'Buy via HendAxis Escrow (WhatsApp)'.\n2. Verify prefilled WhatsApp inquiry with product title, price, and instant /create-link generator link.\n3. Test opening an inactive link.")
        ]),
        ("Day 3: Public Checkout, Paystack MoMo & Dual-Flow Auth", [
            ("Role A (Buyers)", "1. Test 1 (Guest): Open link in Incognito -> Pay via MoMo (MTN 0244000001, OTP 123456) -> Create account post-checkout.\n2. Test 2 (Logged-in): 1-Click Zero-OTP payment with Telecel test number 0200000002.\n3. Test 3 (Failed): Pay with 0244000002 -> verify friendly error & retry."),
            ("Role B (Sellers)", "1. Check Dashboard (/dashboard) -> Order moves to 'Payment Received'.\n2. Verify instant SMS/Email new order notification with buyer details.\n3. In /ledger, verify funds held in escrow.")
        ]),
        ("Day 4: Dual Logistics (Courier vs Bus OTP) & Upfront Tracking", [
            ("Role B (Sellers)", "1. Order 1 (Path A): Dispatch via Courier (DHL/Speedaf) + tracking number + parcel WebP waybill.\n2. Order 2 (Path B): Dispatch via Informal Bus with driver phone, car reg (GT-4821), station (Circle VIP), and waybill photo."),
            ("Role A (Buyers)", "1. In /track (logged out), query with Tx ID + Phone -> enter 6-digit OTP -> unlock driver & waybill.\n2. In /track (logged in), verify 1-Click query loads orders automatically with 0 OTP prompts.")
        ]),
        ("Day 5: Tiered Inspection Periods, 1-Click Release & Reviews", [
            ("Role A (Buyers)", "1. In /dashboard?tab=purchases, confirm delivery receipt -> verify tiered timer (24h for <2k, 48h for 2k-10k, 72h for >=10k).\n2. Click 'Approve & Release Funds' -> Submit 3-axis review (Speed, Communication, Overall) + unboxing photo."),
            ("Role B (Sellers)", "1. Check SMS/Email 'Payout Completed' alert.\n2. In /ledger, verify Available Balance credited.\n3. On /store/username, see verified review & post merchant reply.")
        ]),
        ("Day 6: Dispute Resolution Engine, 5-Photo Trail & Retraction", [
            ("Role A (Buyers)", "1. In /dashboard?tab=purchases, raise dispute on order in inspection with category + 2 photos.\n2. Test Subsequent Dialogue Append: add extra note ('--- [Update] Charger missing ---') + photo.\n3. On Order 2, test 'Retract Dispute'."),
            ("Role B (Sellers)", "1. Open disputed order -> submit seller defense statement + packaging photo in unified chat timeline."),
            ("Role C (Arbiters)", "1. In /admin-portal/dashboard?tab=disputes, inspect 360° buyer/seller intelligence dossiers.\n2. Post formal Arbiter Instruction ('Submit IMEI photo in 24h').")
        ]),
        ("Day 7: Item Return Subsystem, Reverse Pickup OTP & Rulings", [
            ("Role C (Arbiters)", "1. In /admin-portal/dashboard?tab=disputes, execute 4 rulings: Release to Seller, Full Refund, Partial Split, and Require Return (3-day window)."),
            ("Role A (Buyers)", "1. On Return order, click 'Dispatch Return' -> enter informal bus details -> receive 6-digit Reverse Pickup OTP."),
            ("Role B (Sellers)", "1. Inspect returned parcel -> enter Reverse Pickup OTP -> confirm return receipt -> verify refund is executed.")
        ]),
        ("Day 8: Seller Health Governance, Non-Dispatch & Appeals", [
            ("Role G & Sellers", "1. Lead QA triggers check_expired_dispatches task on backdated order.\n2. Seller verifies auto-cancellation, 100% buyer refund, and non-dispatch penalty deduction in /ledger.\n3. Seller hits auto-suspension (>35% default) -> submits appeal in modal."),
            ("Role D (Compliance)", "1. In /admin-portal/dashboard?tab=appeals, review appeal and approve reinstatement.\n2. Verify Clean-Slate: historical defaults do not re-suspend seller.")
        ]),
        ("Day 9: Double-Entry Financial Ledger & Payout Modes", [
            ("Role E (Finance)", "1. In /admin-portal/dashboard?tab=funds, audit double-entry ledger invariant (Total Debits == Total Credits, Imbalance = 0.00 GHS).\n2. In tab=finance, create Arbiter Payout Batch."),
            ("Role B (Sellers)", "1. In /profile, switch Payout Mode to Manual Withdrawal.\n2. Complete sale -> In /ledger, request manual payout to MoMo/Bank Account.")
        ]),
        ("Day 10: Promo Codes, Referral Engine & Marketplace Directory", [
            ("All Testers", "1. Referrals: Tester 1 shares /ref/code; Tester 2 registers and buys (>=50 GHS) -> Tester 1 gets GHS 15, Tester 2 gets GHS 10.\n2. Promo Codes: Apply 'BETA2026' or 'WELCOME10' on checkout -> verify platform fee discount while seller payout is protected.\n3. Directory: In /shops, filter by 16 categories and test multi-token ballpark search.")
        ]),
        ("Day 11: Edge Cases, Concurrency & Mobile Stress Testing", [
            ("All Testers", "1. Rapid Double-Click: Double-click 'Pay Now' or 'Release' -> verify single execution.\n2. Concurrency: Buyer releases funds while Arbiter issues refund at the same exact second -> verify DB lock prevents double payout.\n3. Network Interruption: Disconnect Wi-Fi during MoMo flow -> reconnect -> verify recovery.\n4. Privilege Escalation: Buyer tries accessing /admin-portal -> verify HTTP 403 Access Denied.\n5. Mobile Keyboard: Test checkout on iOS Safari & Android Chrome.")
        ]),
        ("Day 12: End-to-End Regression & Production Sign-Off", [
            ("All Testers", "1. Bug Retesting: Retest resolved bug tickets in tracker; report 'VERIFIED FIXED' or 'STILL FAILING'.\n2. Golden Path Run: Seller creates link -> Buyer applies promo & pays MoMo -> Seller dispatches via Bus -> Buyer tracks via OTP -> Buyer confirms receipt -> Buyer releases funds -> Buyer leaves 5-star review -> Seller replies -> Finance audits 0.00 GHS ledger balance.\n3. Production Readiness Sign-off.")
        ])
    ]

    for day_title, role_items in days_data:
        story.append(Paragraph(f"<b>{day_title}</b>", styles['DayHeader']))
        table_rows = []
        for role, desc in role_items:
            table_rows.append([
                Paragraph(f"<b>{role}</b>", styles['RoleHeader']),
                Paragraph(desc.replace('\n', '<br/>'), styles['BodyCustom'])
            ])
        dt = Table(table_rows, colWidths=[120, letter[0]-108-120])
        dt.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
            ('BOX', (0,0), (-1,-1), 0.5, BORDER_COLOR),
            ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
            ('PADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(dt)
        story.append(Spacer(1, 4))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Handbook PDF generated at: {filename}")

if __name__ == '__main__':
    build_handbook_pdf()
