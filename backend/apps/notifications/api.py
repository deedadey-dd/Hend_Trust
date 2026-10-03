import uuid
import datetime
from typing import Optional, List
from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils.dateparse import parse_datetime, parse_date
from hendaxis_trust.auth import JWTCookieAuth
from apps.notifications.models import NotificationLog

notifications_router = Router(tags=["Notifications"], auth=JWTCookieAuth())

class NotificationSchema(Schema):
    id: uuid.UUID
    title: str
    message: str
    notification_type: str
    action_url: Optional[str] = None
    metadata: dict = {}
    is_read: bool
    created_at: datetime.datetime

class NotificationListResponse(Schema):
    items: List[NotificationSchema]
    total_count: int
    unread_count: int
    limit: int
    offset: int

class UnreadCountResponse(Schema):
    unread_count: int

class MessageResponse(Schema):
    message: str
    unread_count: Optional[int] = None

@notifications_router.get("/", response=NotificationListResponse)
def list_notifications(
    request,
    unread_only: bool = False,
    channel: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
):
    """
    Returns filtered notifications for the authenticated user with total and unread counters.
    """
    user_qs = NotificationLog.objects.filter(user=request.user)
    unread_count = user_qs.filter(is_read=False).count()

    qs = user_qs.order_by('-created_at')

    if unread_only:
        qs = qs.filter(is_read=False)

    if channel and channel.upper() in ['SMS', 'EMAIL', 'IN_APP']:
        qs = qs.filter(notification_type=channel.upper())

    if search and search.strip():
        term = search.strip()
        qs = qs.filter(Q(title__icontains=term) | Q(message__icontains=term))

    if start_date:
        parsed_start = parse_datetime(start_date) or (
            datetime.datetime.combine(parse_date(start_date), datetime.time.min).replace(tzinfo=datetime.timezone.utc)
            if parse_date(start_date) else None
        )
        if parsed_start:
            qs = qs.filter(created_at__gte=parsed_start)

    if end_date:
        parsed_end = parse_datetime(end_date) or (
            datetime.datetime.combine(parse_date(end_date), datetime.time.max).replace(tzinfo=datetime.timezone.utc)
            if parse_date(end_date) else None
        )
        if parsed_end:
            qs = qs.filter(created_at__lte=parsed_end)

    total_count = qs.count()
    items = list(qs[offset : offset + limit])

    return {
        "items": items,
        "total_count": total_count,
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset,
    }

@notifications_router.get("/unread-count", response=UnreadCountResponse)
def get_unread_count(request):
    """
    Lightweight fast endpoint for navbar polling and badge counter updates.
    """
    count = NotificationLog.objects.filter(user=request.user, is_read=False).count()
    return {"unread_count": count}

@notifications_router.post("/mark-all-read", response=MessageResponse)
def mark_all_notifications_read(request):
    """
    Marks all unread notifications for the authenticated user as read.
    """
    updated = NotificationLog.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return {"message": f"{updated} notifications marked as read", "unread_count": 0}

@notifications_router.delete("/clear-read", response=MessageResponse)
def clear_read_notifications(request):
    """
    Deletes all read notifications for the current user.
    """
    deleted_count, _ = NotificationLog.objects.filter(user=request.user, is_read=True).delete()
    unread_count = NotificationLog.objects.filter(user=request.user, is_read=False).count()
    return {"message": f"{deleted_count} read notifications cleared", "unread_count": unread_count}

@notifications_router.patch("/{id}/read", response=MessageResponse)
def mark_notification_read(request, id: uuid.UUID):
    """
    Marks a single notification as read.
    """
    notif = get_object_or_404(NotificationLog, id=id, user=request.user)
    if not notif.is_read:
        notif.is_read = True
        notif.save(update_fields=['is_read'])
    unread_count = NotificationLog.objects.filter(user=request.user, is_read=False).count()
    return {"message": "Notification marked as read", "unread_count": unread_count}

@notifications_router.patch("/{id}/toggle-read", response=MessageResponse)
def toggle_notification_read(request, id: uuid.UUID):
    """
    Toggles read/unread state for a single notification.
    """
    notif = get_object_or_404(NotificationLog, id=id, user=request.user)
    notif.is_read = not not notif.is_read
    notif.save(update_fields=['is_read'])
    unread_count = NotificationLog.objects.filter(user=request.user, is_read=False).count()
    return {"message": f"Notification marked as {'read' if notif.is_read else 'unread'}", "unread_count": unread_count}

@notifications_router.delete("/{id}", response=MessageResponse)
def delete_notification(request, id: uuid.UUID):
    """
    Deletes a specific notification for the authenticated user.
    """
    notif = get_object_or_404(NotificationLog, id=id, user=request.user)
    notif.delete()
    unread_count = NotificationLog.objects.filter(user=request.user, is_read=False).count()
    return {"message": "Notification deleted successfully", "unread_count": unread_count}
