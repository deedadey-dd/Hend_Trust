import re
from apps.notifications.models import NotificationLog, WebhookEventLog, NotificationType

def is_otp_message(title: str = "", message: str = "") -> bool:
    """
    Detects whether a notification is an OTP, verification code, or security token.
    OTPs are excluded from in-app notification logs per security requirements.
    """
    text = f"{title} {message}".lower()
    otp_indicators = [
        "verification code",
        "otp",
        "confirmation code",
        "reset code",
        "security code",
        "one-time password",
        "login code",
        "auth code",
        "activation code",
        "2fa code",
    ]
    return any(indicator in text for indicator in otp_indicators)

def derive_action_url(title: str = "", message: str = "") -> str:
    """
    Intelligently extracts or infers the target frontend route from notification content.
    """
    combined = f"{title} {message}"

    # 1. Search for explicit HTTP/HTTPS links
    urls = re.findall(r'https?://[^\s<>"\']+', combined)
    if urls:
        first_url = urls[0]
        # If link is to internal domain/localhost, extract path
        match = re.search(r'https?://[^/]+(/.*)', first_url)
        if match:
            return match.group(1)
        return first_url

    # 2. Check for dispute / arbiter context with order reference
    if "dispute" in combined.lower() or "arbiter" in combined.lower():
        ref_match = re.search(r'(?:Order|Reference|Ref|TRK|ORD)[#:\s]+([A-Za-z0-9\-_]+)', combined, re.IGNORECASE)
        if ref_match:
            return f"/track?code={ref_match.group(1)}"
        return "/dashboard?tab=orders"

    # 3. Check for general tracking / order references
    ref_match = re.search(r'(?:Order|Reference|Ref|TRK|ORD)[#:\s]+([A-Za-z0-9\-_]+)', combined, re.IGNORECASE)
    if ref_match:
        return f"/track?code={ref_match.group(1)}"

    # 4. Check for review / rating context
    if "review" in combined.lower() or "rating" in combined.lower() or "rated" in combined.lower():
        return "/dashboard?tab=seller_reviews"

    # 5. Check for referral / cash rewards context
    if "referral" in combined.lower() or "cash reward" in combined.lower():
        return "/referrals"

    # 6. Default to dashboard
    return "/dashboard"

def create_notification(user, title: str, message: str, notif_type: str = NotificationType.IN_APP, action_url: str = None, metadata: dict = None):
    """
    Helper function to generate a notification record for a user.
    Automatically excludes OTPs and derives action links if not provided.
    """
    if is_otp_message(title, message):
        return None

    if not action_url:
        action_url = derive_action_url(title, message)

    return NotificationLog.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notif_type,
        action_url=action_url,
        metadata=metadata or {}
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
