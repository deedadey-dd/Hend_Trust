from celery import shared_task
from utils.mnotify import MNotifyService
from apps.notifications.services import create_notification
from apps.notifications.models import NotificationType
from apps.users.models import User
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@shared_task
def dispatch_sms_task(phone: str, message: str):
    """
    Asynchronously sends an SMS via MNotify.
    """
    if getattr(settings, 'DEBUG', False):
        print("\n" + "="*50)
        print("DEV MOCKED SMS NOTIFICATION")
        print(f"To: {phone}")
        print(f"Message: {message}")
        print("="*50 + "\n")
        return True
        
    success = MNotifyService.send_sms(phone, message)
    if not success:
        logger.warning(f"Failed to dispatch SMS to {phone}")
    return success

def _build_default_html_email(subject: str, message: str, html_message: str = None) -> str:
    if html_message:
        return html_message
        
    import re
    default_url = 'http://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
    frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')
    
    # Extract any URL in the message body
    urls = re.findall(r'https?://[^\s<>"]+', message)
    target_link = urls[0] if urls else frontend_url
    
    formatted_body = message.replace('\n', '<br>')
    
    button_label = "Review Dispute & Submit Evidence" if "dispute" in subject.lower() or "dispute" in message.lower() else "View Details on HendAxis Trust"
    
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1e293b; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
    .header {{ background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #ffffff; padding: 24px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }}
    .content {{ padding: 32px 28px; font-size: 15px; line-height: 1.6; color: #334155; }}
    .content h2 {{ font-size: 18px; color: #0f172a; margin-top: 0; margin-bottom: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }}
    .btn-container {{ text-align: center; margin: 32px 0 20px 0; }}
    .btn {{ background-color: #2563eb; color: #ffffff !important; padding: 14px 30px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }}
    .footer {{ background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
    .footer a {{ color: #2563eb; text-decoration: underline; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HendAxis Trust</h1>
    </div>
    <div class="content">
      <h2>{subject}</h2>
      <div>{formatted_body}</div>
      <div class="btn-container">
        <a href="{target_link}" class="btn" target="_blank">{button_label}</a>
      </div>
    </div>
    <div class="footer">
      &copy; HendAxis Trust Escrow Platform. All rights reserved.<br>
      <a href="{frontend_url}" target="_blank">Visit HendAxis Trust Platform</a>
    </div>
  </div>
</body>
</html>"""

@shared_task
def dispatch_email_task(email: str, subject: str, message: str, html_message: str = None):
    """
    Asynchronously sends an Email. Guarantees all emails contain clickable action links.
    """
    html_message = _build_default_html_email(subject, message, html_message)

    if getattr(settings, 'DEBUG', False):
        print("\n" + "="*50)
        print("DEV MOCKED EMAIL NOTIFICATION")
        print(f"To: {email}")
        print(f"Subject: {subject}")
        print(f"Message: {message}")
        print(f"HTML Link Included: Yes")
        print("="*50 + "\n")
        return True

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hendaxistrust.com'),
            recipient_list=[email],
            fail_silently=False,
            html_message=html_message
        )
        return True
    except Exception as e:
        logger.error(f"Failed to dispatch Email to {email}: {e}")
        return False

@shared_task
def notify_user_task(user_id, title: str, message: str, notif_type: str = NotificationType.IN_APP):
    """
    Asynchronously creates a notification for a user.
    """
    try:
        user = User.objects.get(id=user_id)
        create_notification(user, title, message, notif_type)
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for notification.")

@shared_task(bind=True)
def process_broadcast_campaign_task(self, campaign_id: str):
    """
    Processes a broadcast campaign in batches with real-time status updates and cancellation checks.
    """
    from apps.notifications.models import BroadcastCampaign, BroadcastCampaignStatus
    from apps.escrow.models import Transaction, TransactionStatus
    from django.db.models import Q
    from django.utils import timezone

    try:
        campaign = BroadcastCampaign.objects.get(id=campaign_id)
    except BroadcastCampaign.DoesNotExist:
        logger.error(f"BroadcastCampaign {campaign_id} not found.")
        return

    if campaign.status == BroadcastCampaignStatus.CANCELLED:
        logger.info(f"BroadcastCampaign {campaign_id} was cancelled before starting.")
        return

    campaign.status = BroadcastCampaignStatus.PROCESSING
    campaign.celery_task_id = getattr(self.request, 'id', None)
    campaign.save(update_fields=['status', 'celery_task_id'])

    phone_numbers = set()
    email_addresses = set()
    target = campaign.target_group

    if target == 'ALL_USERS':
        for u in User.objects.all():
            if u.phone_number: phone_numbers.add(u.phone_number)
            if u.email: email_addresses.add(u.email)
        for t in Transaction.objects.values('buyer_phone', 'buyer_email'):
            if t['buyer_phone']: phone_numbers.add(t['buyer_phone'])
            if t['buyer_email']: email_addresses.add(t['buyer_email'])

    elif target == 'ALL_SELLERS':
        for u in User.objects.filter(Q(role='SELLER') | Q(payment_links__isnull=False)).distinct():
            if u.phone_number: phone_numbers.add(u.phone_number)
            if u.email: email_addresses.add(u.email)

    elif target == 'ALL_BUYERS':
        for t in Transaction.objects.values('buyer_phone', 'buyer_email'):
            if t['buyer_phone']: phone_numbers.add(t['buyer_phone'])
            if t['buyer_email']: email_addresses.add(t['buyer_email'])

    elif target == 'USERS_WITH_ACTIVE_ESCROW':
        active_txns = Transaction.objects.filter(
            status__in=[TransactionStatus.PAYMENT_RECEIVED, TransactionStatus.DELIVERY_IN_PROGRESS, TransactionStatus.INSPECTION_PERIOD]
        ).select_related('link', 'link__seller')
        for t in active_txns:
            if t.buyer_phone: phone_numbers.add(t.buyer_phone)
            if t.buyer_email: email_addresses.add(t.buyer_email)
            s = t.link.seller
            if getattr(s, 'phone_number', None): phone_numbers.add(s.phone_number)
            if getattr(s, 'email', None): email_addresses.add(s.email)

    elif target == 'USERS_WITH_DISPUTES':
        disp_txns = Transaction.objects.filter(status=TransactionStatus.DISPUTED).select_related('link', 'link__seller')
        for t in disp_txns:
            if t.buyer_phone: phone_numbers.add(t.buyer_phone)
            if t.buyer_email: email_addresses.add(t.buyer_email)
            s = t.link.seller
            if getattr(s, 'phone_number', None): phone_numbers.add(s.phone_number)
            if getattr(s, 'email', None): email_addresses.add(s.email)

    elif target == 'CUSTOM' and campaign.custom_recipients:
        raw_list = [r.strip() for r in campaign.custom_recipients.replace(',', '\n').split('\n') if r.strip()]
        for item in raw_list:
            if '@' in item:
                email_addresses.add(item)
            else:
                phone_numbers.add(item)

    total_targets = len(phone_numbers) if campaign.channels in ['SMS', 'BOTH'] else 0
    total_targets += len(email_addresses) if campaign.channels in ['EMAIL', 'BOTH'] else 0

    campaign.total_recipients = total_targets
    campaign.save(update_fields=['total_recipients'])

    sms_sent = 0
    email_sent = 0
    failed = 0

    if campaign.channels in ['SMS', 'BOTH']:
        for phone in phone_numbers:
            campaign.refresh_from_db()
            if campaign.status == BroadcastCampaignStatus.CANCELLED:
                logger.info(f"BroadcastCampaign {campaign_id} cancelled during SMS dispatch.")
                return

            res = dispatch_sms_task(phone, campaign.message)
            if res:
                sms_sent += 1
            else:
                failed += 1

            campaign.sent_sms_count = sms_sent
            campaign.failed_count = failed
            campaign.save(update_fields=['sent_sms_count', 'failed_count'])

    if campaign.channels in ['EMAIL', 'BOTH']:
        sub = campaign.subject or "Notification from HendAxis Trust"
        for email in email_addresses:
            campaign.refresh_from_db()
            if campaign.status == BroadcastCampaignStatus.CANCELLED:
                logger.info(f"BroadcastCampaign {campaign_id} cancelled during Email dispatch.")
                return

            res = dispatch_email_task(email, sub, campaign.message)
            if res:
                email_sent += 1
            else:
                failed += 1

            campaign.sent_email_count = email_sent
            campaign.failed_count = failed
            campaign.save(update_fields=['sent_email_count', 'failed_count'])

    campaign.refresh_from_db()
    if campaign.status != BroadcastCampaignStatus.CANCELLED:
        campaign.status = BroadcastCampaignStatus.COMPLETED
        campaign.completed_at = timezone.now()
        campaign.save(update_fields=['status', 'completed_at'])

@shared_task
def notify_buyer_payment_received_task(transaction_id):
    """
    Sends an SMS and Email to the buyer after successful payment with their tracking details.
    """
    from apps.escrow.models import Transaction
    default_url = 'http://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
    frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')

    try:
        txn = Transaction.objects.get(id=transaction_id)
        
        msg = (
            f"Payment successful for {txn.link.title}! "
            f"Track your order at {frontend_url}/track using Transaction ID: {txn.paystack_reference} and your phone number."
        )
        
        html_msg = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
                <h2 style="color: #3b82f6; margin-top: 0;">Payment Confirmed! 🎉</h2>
                <p>Hello <strong>{txn.buyer_name}</strong>,</p>
                <p>Great news! Your payment for <strong>{txn.link.title}</strong> was successful and your funds are now safely held in escrow.</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <p style="margin: 0 0 10px 0;"><strong>Tracking Reference:</strong> <span style="font-family: monospace; font-size: 16px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">{txn.paystack_reference}</span></p>
                    <p style="margin: 0;"><strong>Amount Paid:</strong> GHS {txn.total_amount_ghs}</p>
                </div>

                <p>You can track your order status and confirm delivery using your phone number and tracking reference.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/track?ref={txn.paystack_reference}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Track Your Order</a>
                </div>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px; text-align: center;">
                    Thank you for using HendAxis Trust Escrow.<br>
                    <a href="{frontend_url}" style="color: #3b82f6;">Visit our website</a>
                </p>
            </div>
        </body>
        </html>
        """
        
        print("\n" + "="*50)
        print("DEV: PAYMENT RECEIVED NOTIFICATION")
        print(f"To: {txn.buyer_phone} / {txn.buyer_email}")
        print(msg)
        print("="*50 + "\n")
        
        if txn.buyer_email:
            dispatch_email_task.delay(
                txn.buyer_email,
                f"Payment Confirmed - Order #{txn.paystack_reference}",
                msg,
                html_message=html_msg
            )
            
        dispatch_sms_task.delay(txn.buyer_phone, msg)
        
    except Transaction.DoesNotExist:
        pass

@shared_task
def send_seller_payment_notification_task(transaction_id: int):
    from apps.escrow.models import Transaction
    default_url = 'http://localhost:5173' if getattr(settings, 'DEBUG', False) else 'https://trust.hendaxis.com'
    frontend_url = getattr(settings, 'FRONTEND_URL', default_url).rstrip('/')

    try:
        txn = Transaction.objects.get(id=transaction_id)
        seller = txn.link.user
        seller_email = getattr(seller, 'email', None)
        
        msg = f"New order received for {txn.link.title}! Amount: GHS {txn.total_amount_ghs}. Log in to dispatch: {frontend_url}/dashboard"
        
        html_msg = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
                <h2 style="color: #10b981; margin-top: 0;">New Order Received! 💰</h2>
                <p>Hello <strong>{seller.username}</strong>,</p>
                <p>You have received a new payment of <strong>GHS {txn.total_amount_ghs}</strong> for <strong>{txn.link.title}</strong>.</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <p style="margin: 0 0 5px 0;"><strong>Transaction ID:</strong> {txn.paystack_reference}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Escrow Amount:</strong> GHS {txn.total_amount_ghs}</p>
                    <h3 style="margin: 0 0 10px 0; color: #444; border-top: 1px solid #eee; padding-top: 15px;">Buyer Information</h3>
                    <p style="margin: 0 0 5px 0;"><strong>Name:</strong> {txn.buyer_name}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Phone:</strong> {txn.buyer_phone}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Email:</strong> {txn.buyer_email or 'Not Provided'}</p>
                    <p style="margin: 0;"><strong>Shipping:</strong> {txn.shipping_address}</p>
                </div>

                <p>Please log in to your dashboard to process and dispatch this order. Once dispatched, the buyer will be notified.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/dashboard" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
                </div>
            </div>
        </body>
        </html>
        """
        
        print("\n" + "="*50)
        print("DEV: SELLER PAYMENT RECEIVED NOTIFICATION")
        print(f"To Seller: {seller_email}")
        print(msg)
        print("="*50 + "\n")
        
        if seller_email:
            subject = f"New Order Received - {txn.link.title}"
            dispatch_email_task.delay(seller_email, subject, msg, html_message=html_msg)
            
        seller_phone = getattr(seller, 'phone_number', None)
        if seller_phone:
            dispatch_sms_task.delay(seller_phone, msg)
            
    except Transaction.DoesNotExist:
        logger.error(f"Transaction {transaction_id} not found for seller notification.")
