from ninja.errors import HttpError
from apps.users.models import Role

def is_admin_user(request):
    """
    Dependency to check if the authenticated user is an admin.
    Designed to be used alongside ninja_jwt.authentication.JWTAuth
    """
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        raise HttpError(401, "Authentication required")
        
    if request.user.role == Role.ADMIN or request.user.is_superuser or request.user.is_staff:
        return request.user
        
    raise HttpError(403, "Forbidden. Admin access required.")
