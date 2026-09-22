from ninja.errors import HttpError
from apps.users.models import Role

def require_role(request, *allowed_roles):
    """
    Checks if the authenticated user has one of the allowed roles,
    or is a superuser.
    """
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
        
    user = request.user
    if user.is_superuser:
        return user
        
    if user.role in allowed_roles:
        return user
        
    raise HttpError(403, f"Forbidden. Requires one of roles: {', '.join(allowed_roles)}.")

def is_staff_user(request):
    """
    Dependency for general administrative and staff access.
    Allows ADMIN, ARBITER, COMPLIANCE_OFFICER, FINANCE_ADMIN, SUPPORT_AGENT, or is_staff/superuser.
    """
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
        
    user = request.user
    staff_roles = [Role.ADMIN, Role.ARBITER, Role.COMPLIANCE_OFFICER, Role.FINANCE_ADMIN, Role.SUPPORT_AGENT]
    if user.is_superuser or user.is_staff or user.role in staff_roles:
        return user
        
    raise HttpError(403, "Forbidden. Staff or administrative access required.")

def is_admin_user(request):
    """
    General admin / staff check (backward-compatible alias to is_staff_user).
    """
    return is_staff_user(request)

def is_admin_manager(request):
    """
    Strict Admin Manager / HR role check.
    Allows Role.ADMIN or is_superuser.
    """
    return require_role(request, Role.ADMIN)

def is_arbiter_user(request):
    """
    Dispute Arbiter check.
    Allows Role.ADMIN, Role.ARBITER or is_superuser.
    """
    return require_role(request, Role.ADMIN, Role.ARBITER)

def is_compliance_user(request):
    """
    KYC & Compliance Officer check.
    Allows Role.ADMIN, Role.COMPLIANCE_OFFICER or is_superuser.
    """
    return require_role(request, Role.ADMIN, Role.COMPLIANCE_OFFICER)

def is_finance_user(request):
    """
    Finance Admin / Accountant check.
    Allows Role.ADMIN, Role.FINANCE_ADMIN or is_superuser.
    """
    return require_role(request, Role.ADMIN, Role.FINANCE_ADMIN)

def is_superuser_user(request):
    """
    Strict superuser check.
    """
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
        
    if request.user.is_superuser:
        return request.user
        
    raise HttpError(403, "Forbidden. Superuser access required.")

