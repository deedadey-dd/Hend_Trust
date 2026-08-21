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

@shared_task
def dispatch_email_task(email: str, subject: str, message: str, html_message: str = None):
    """
    Asynchronously sends an Email. Supports HTML emails.
    """
    if getattr(settings, 'DEBUG', False):
        print("\n" + "="*50)
        print("DEV MOCKED EMAIL NOTIFICATION")
        print(f"To: {email}")
        print(f"Subject: {subject}")
        print(f"Message: {message}")
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

@shared_task
def notify_buyer_payment_received_task(transaction_id):
    """
    Sends an SMS and Email to the buyer after successful payment with their tracking details.
    """
    from apps.escrow.models import Transaction
    try:
        txn = Transaction.objects.get(id=transaction_id)
        
        msg = (
            f"Payment successful for {txn.link.title}! "
            f"Track your order at http://localhost:5173/track using Transaction ID: {txn.paystack_reference} and your phone number."
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
                    <a href="http://localhost:5173/track?ref={txn.paystack_reference}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Track Your Order</a>
                </div>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px; text-align: center;">
                    Thank you for using HendAxis Trust Escrow.<br>
                    <a href="http://localhost:5173" style="color: #3b82f6;">Visit our website</a>
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
        
        dispatch_sms_task.delay(txn.buyer_phone, msg)
        
        if txn.buyer_email:
            subject = f"Payment Confirmed - {txn.link.title}"
            dispatch_email_task.delay(txn.buyer_email, subject, msg, html_message=html_msg)
            
    except Transaction.DoesNotExist:
        logger.error(f"Transaction {transaction_id} not found for payment notification.")

@shared_task
def notify_seller_payment_received_task(transaction_id):
    """
    Sends an Email to the seller after successful payment with order details.
    """
    from apps.escrow.models import Transaction
    try:
        txn = Transaction.objects.get(id=transaction_id)
        seller = txn.link.seller
        seller_email = getattr(seller, 'email', None)
        
        msg = (
            f"Great news! You have a new order ({txn.paystack_reference}) for '{txn.link.title}'. "
            f"Please log in to your dashboard to process and dispatch this order."
        )
        
        html_msg = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
                <h2 style="color: #3b82f6; margin-top: 0;">New Order Received! 📦</h2>
                <p>Hello,</p>
                <p>You have received a new payment for <strong>{txn.link.title}</strong>. The funds are safely secured in escrow.</p>
                
                <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <h3 style="margin-top: 0; color: #444;">Order Details</h3>
                    <p style="margin: 0 0 5px 0;"><strong>Reference:</strong> <span style="font-family: monospace;">{txn.paystack_reference}</span></p>
                    <p style="margin: 0 0 15px 0;"><strong>Amount:</strong> GHS {txn.total_amount_ghs}</p>
                    
                    <h3 style="margin: 0 0 10px 0; color: #444; border-top: 1px solid #eee; padding-top: 15px;">Buyer Information</h3>
                    <p style="margin: 0 0 5px 0;"><strong>Name:</strong> {txn.buyer_name}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Phone:</strong> {txn.buyer_phone}</p>
                    <p style="margin: 0 0 5px 0;"><strong>Email:</strong> {txn.buyer_email or 'Not Provided'}</p>
                    <p style="margin: 0;"><strong>Shipping:</strong> {txn.shipping_address}</p>
                </div>

                <p>Please log in to your dashboard to process and dispatch this order. Once dispatched, the buyer will be notified.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:5173/dashboard" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
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
