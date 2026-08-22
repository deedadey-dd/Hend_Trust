from django.contrib import admin
from apps.notifications.models import NotificationLog, WebhookEventLog

@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'user__email', 'title', 'message')
    ordering = ('-created_at',)

@admin.register(WebhookEventLog)
class WebhookEventLogAdmin(admin.ModelAdmin):
    list_display = ('provider', 'event_type', 'response_status_code', 'created_at')
    list_filter = ('provider', 'response_status_code', 'created_at')
    search_fields = ('provider', 'event_type', 'error_message')
    ordering = ('-created_at',)
