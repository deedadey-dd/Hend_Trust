import secrets
from decimal import Decimal
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from apps.reviews.models import ShopAdInvoice
from apps.core.tasks import dispatch_email_task

def send_ad_invoice_email(invoice: ShopAdInvoice) -> bool:
    """
    Sends or resends the official ad receipt email for an existing ShopAdInvoice record.
    """
    seller = invoice.seller
    if not seller or not seller.email:
        return False

    default_url = 'https://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
    frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')
    invoice_download_url = f"{frontend_url}/ad-invoice/{invoice.id}"

    inv_num = invoice.invoice_number
    fee_amount = invoice.amount_ghs
    duration_days = invoice.duration_days
    advertised_from = invoice.advertised_from
    advertised_until = invoice.advertised_until

    subject = f"Receipt & Official Invoice #{inv_num} - Marketplace Directory Featured Ad (GHS {fee_amount:.2f})"
    pay_method_label = "HendAxis Trust Wallet Balance" if invoice.payment_method == 'WALLET' else "Paystack Mobile Money / Bank Card"

    msg = f"""Hello {seller.first_name or seller.username},

Thank you for promoting your shop on the HendAxis Trust Marketplace Directory!

OFFICIAL PAYMENT RECEIPT & TAX INVOICE
======================================
Invoice Number: {inv_num}
Date: {invoice.created_at.strftime('%B %d, %Y at %H:%M UTC')}
Shop Name: {seller.username}
Billed To: {seller.email or 'Registered Merchant'}
Phone: {seller.phone_number or 'N/A'}

ITEM DESCRIPTION:
- Marketplace Directory Store Promotion ({duration_days} Days Featured Ad)
- Promotion Period: {advertised_from.strftime('%B %d, %Y')} to {advertised_until.strftime('%B %d, %Y')}
- Payment Method: {pay_method_label}
- Transaction Reference: {invoice.reference_code}
- TOTAL AMOUNT PAID: GHS {fee_amount:.2f}

View or download your official printable invoice at any time using the link below:
{invoice_download_url}

Thank you for choosing HendAxis Trust!
HendAxis Trust Finance & Verification Team
https://trust.hendaxis.com
"""

    html_message = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }}
    .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
    .header {{ text-align: center; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; }}
    .badge {{ display: inline-block; background: #dcfce7; color: #15803d; font-weight: 700; padding: 4px 12px; border-radius: 9999px; font-size: 12px; margin-top: 8px; }}
    .details-table {{ width: 100%; border-collapse: collapse; margin: 24px 0; }}
    .details-table td {{ padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }}
    .details-table td.label {{ color: #64748b; font-weight: 600; }}
    .details-table td.val {{ text-align: right; font-weight: 700; color: #0f172a; }}
    .btn {{ display: block; width: 100%; text-align: center; background: #2563eb; color: #ffffff !important; font-weight: 700; padding: 14px 0; border-radius: 12px; text-decoration: none; margin-top: 24px; box-shadow: 0 4px 12px rgba(37,99,235,0.2); }}
    .footer {{ text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0; color: #0f172a; font-size: 22px;">HendAxis Trust</h2>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Financial Escrow & Verification Platform</div>
      <div class="badge">✓ PAID & VERIFIED INVOICE</div>
    </div>

    <div style="margin-top: 20px;">
      <h3 style="font-size: 16px; margin: 0 0 4px 0; color: #0f172a;">Official Payment Receipt</h3>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Invoice #{inv_num}</p>
    </div>

    <table class="details-table">
      <tr><td class="label">Date & Time</td><td class="val">{invoice.created_at.strftime('%b %d, %Y %H:%M UTC')}</td></tr>
      <tr><td class="label">Billed To Merchant</td><td class="val">{seller.username} ({seller.email})</td></tr>
      <tr><td class="label">Featured Ad Duration</td><td class="val">{duration_days} Days</td></tr>
      <tr><td class="label">Active Window</td><td class="val">{advertised_from.strftime('%b %d, %Y')} – {advertised_until.strftime('%b %d, %Y')}</td></tr>
      <tr><td class="label">Payment Method</td><td class="val">{pay_method_label}</td></tr>
      <tr><td class="label">Transaction Reference</td><td class="val" style="font-family: monospace; font-size: 12px;">{invoice.reference_code}</td></tr>
      <tr style="border-bottom: none;"><td class="label" style="font-size: 16px; color: #0f172a; padding-top: 16px;">Total Amount Paid</td><td class="val" style="font-size: 20px; color: #16a34a; padding-top: 16px;">GHS {fee_amount:.2f}</td></tr>
    </table>

    <a href="{invoice_download_url}" target="_blank" class="btn">📄 Download / Print Official PDF Invoice</a>

    <div class="footer">
      If you have any questions, please contact billing support at support@hendaxistrust.com.<br>
      © {timezone.now().year} HendAxis Trust. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

    dispatch_email_task.delay(
        email=seller.email,
        subject=subject,
        message=msg,
        html_message=html_message
    )
    return True


def create_and_send_ad_invoice(
    seller,
    duration_days: int,
    fee_amount: Decimal,
    payment_method: str,
    reference_code: str,
    advertised_from: datetime,
    advertised_until: datetime
) -> ShopAdInvoice:
    """
    Creates an official ShopAdInvoice record and sends an email receipt + downloadable invoice link to the seller.
    """
    now_str = timezone.now().strftime("%Y%m%d")
    random_code = secrets.token_hex(3).upper()  # 6 char hex
    inv_num = f"INV-AD-{now_str}-{random_code}"

    invoice = ShopAdInvoice.objects.create(
        invoice_number=inv_num,
        seller=seller,
        duration_days=duration_days,
        amount_ghs=fee_amount,
        payment_method=payment_method,
        reference_code=reference_code or f"REF-{inv_num}",
        advertised_from=advertised_from,
        advertised_until=advertised_until
    )

    send_ad_invoice_email(invoice)
    return invoice
