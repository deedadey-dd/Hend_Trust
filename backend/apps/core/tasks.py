from celery import shared_task
from utils.mnotify import MNotifyService
from apps.notifications.services import create_notification
from apps.notifications.models import NotificationType
from apps.users.models import User
import logging

logger = logging.getLogger(__name__)

@shared_task
def dispatch_sms_task(phone: str, message: str):
    """
    Asynchronously sends an SMS via MNotify.
    """
    success = MNotifyService.send_sms(phone, message)
    if not success:
        logger.warning(f"Failed to dispatch SMS to {phone}")
    return success

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
