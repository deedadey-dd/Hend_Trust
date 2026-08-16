from apps.notifications.models import NotificationLog, WebhookEventLog, NotificationType

def create_notification(user, title: str, message: str, notif_type: str = NotificationType.IN_APP):
    """
    Helper function to generate a notification record for a user.
    """
    return NotificationLog.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notif_type
    )

def log_webhook_event(provider: str, event_type: str, payload: dict, status_code: int, error_message: str = None):
    """
    Helper function to securely record raw webhook events for auditability.
    """
    return WebhookEventLog.objects.create(
        provider=provider,
        event_type=event_type,
        payload=payload,
        response_status_code=status_code,
        error_message=error_message
    )
