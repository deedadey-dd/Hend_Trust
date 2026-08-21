from ninja_jwt.authentication import JWTAuth
from django.conf import settings

class JWTCookieAuth(JWTAuth):
    """
    Custom Authentication class that checks for the JWT in the Authorization header first,
    and falls back to checking the HttpOnly cookie.
    """
    def __call__(self, request):
        # 1. Try to get token from header using parent HttpBearer
        token_obj = super().__call__(request)
        if token_obj:
            return token_obj
            
        # 2. Try to get token from cookie
        cookie_name = settings.NINJA_JWT.get('AUTH_COOKIE', 'access_token')
        if cookie_name and cookie_name in request.COOKIES:
            cookie_token = request.COOKIES[cookie_name]
            return self.authenticate(request, cookie_token)
            
        return None
