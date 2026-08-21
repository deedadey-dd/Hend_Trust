from ninja import Router, Schema
from ninja.pagination import paginate, PageNumberPagination
from ninja_jwt.authentication import JWTAuth
from django.shortcuts import get_object_or_404
from ninja.errors import HttpError
from hendaxis_trust.auth import JWTCookieAuth
from apps.notifications.models import NotificationLog
import uuid
import datetime

notifications_router = Router(tags=["Notifications"], auth=JWTCookieAuth())

class NotificationSchema(Schema):
    id: uuid.UUID
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime.datetime

class MessageResponse(Schema):
    message: str

@notifications_router.get("/", response=list[NotificationSchema])
@paginate(PageNumberPagination, page_size=20)
def get_notifications(request, unread_only: bool = False):
    qs = NotificationLog.objects.filter(user=request.user).order_by('-created_at')
    if unread_only:
        qs = qs.filter(is_read=False)
    return qs

@notifications_router.patch("/{id}/read", response=MessageResponse)
def mark_notification_read(request, id: uuid.UUID):
    notif = get_object_or_404(NotificationLog, id=id, user=request.user)
    if not notif.is_read:
        notif.is_read = True
        notif.save(update_fields=['is_read'])
    return {"message": "Notification marked as read"}
