from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from apps.users.models import User, Role

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'phone_number', 'role', 'is_staff', 'is_superuser', 'payout_mode', 'date_joined')
    list_filter = ('role', 'is_staff', 'is_superuser', 'payout_mode')
    search_fields = ('username', 'email', 'phone_number')
    ordering = ('-date_joined',)

    fieldsets = UserAdmin.fieldsets + (
        ('Custom Profile Info', {'fields': ('role', 'phone_number', 'payout_mode')}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Profile Info', {
            'classes': ('wide',),
            'fields': ('role', 'phone_number', 'payout_mode'),
        }),
    )
