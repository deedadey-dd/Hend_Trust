from django.conf import settings
from ninja import Router, Schema
from ninja_jwt.tokens import RefreshToken
from ninja_jwt.schema import TokenRefreshInputSchema
from django.contrib.auth import authenticate
from apps.users.models import User
from ninja.errors import HttpError
from typing import Optional

auth_router = Router(tags=["Authentication"])

class RegisterSchema(Schema):
    username: str
    password: str
    phone_number: str
    role: Optional[str] = 'BUYER'

class LoginSchema(Schema):
    username: str
    password: str

class MessageSchema(Schema):
    message: str

def set_auth_cookies(response, refresh_token):
    access_token = refresh_token.access_token
    
    response.set_cookie(
        key=settings.NINJA_JWT['AUTH_COOKIE'],
        value=str(access_token),
        expires=settings.NINJA_JWT['ACCESS_TOKEN_LIFETIME'],
        secure=settings.NINJA_JWT['AUTH_COOKIE_SECURE'],
        httponly=settings.NINJA_JWT['AUTH_COOKIE_HTTP_ONLY'],
        samesite=settings.NINJA_JWT['AUTH_COOKIE_SAMESITE'],
        domain=settings.NINJA_JWT['AUTH_COOKIE_DOMAIN']
    )
    response.set_cookie(
        key=settings.NINJA_JWT['AUTH_COOKIE_REFRESH'],
        value=str(refresh_token),
        expires=settings.NINJA_JWT['REFRESH_TOKEN_LIFETIME'],
        secure=settings.NINJA_JWT['AUTH_COOKIE_SECURE'],
        httponly=settings.NINJA_JWT['AUTH_COOKIE_HTTP_ONLY'],
        samesite=settings.NINJA_JWT['AUTH_COOKIE_SAMESITE'],
        domain=settings.NINJA_JWT['AUTH_COOKIE_DOMAIN']
    )

@auth_router.post("/register", response=MessageSchema)
def register(request, data: RegisterSchema):
    if User.objects.filter(username=data.username).exists():
        raise HttpError(400, "Username already exists")
    if User.objects.filter(phone_number=data.phone_number).exists():
        raise HttpError(400, "Phone number already exists")
        
    user = User.objects.create_user(
        username=data.username,
        password=data.password,
        phone_number=data.phone_number,
        role=data.role
    )
    return {"message": "User registered successfully"}

@auth_router.post("/login", response=MessageSchema)
def login(request, data: LoginSchema, response):
    user = authenticate(username=data.username, password=data.password)
    if not user:
        raise HttpError(401, "Invalid credentials")
        
    refresh = RefreshToken.for_user(user)
    set_auth_cookies(response, refresh)
    
    return {"message": "Login successful"}

@auth_router.post("/refresh", response=MessageSchema)
def refresh(request, response):
    refresh_token = request.COOKIES.get(settings.NINJA_JWT['AUTH_COOKIE_REFRESH'])
    if not refresh_token:
        raise HttpError(401, "No refresh token provided")
        
    try:
        refresh = RefreshToken(refresh_token)
        set_auth_cookies(response, refresh)
        return {"message": "Tokens refreshed successfully"}
    except Exception as e:
        raise HttpError(401, "Invalid refresh token")

@auth_router.post("/logout", response=MessageSchema)
def logout(request, response):
    response.delete_cookie(settings.NINJA_JWT['AUTH_COOKIE'], domain=settings.NINJA_JWT['AUTH_COOKIE_DOMAIN'])
    response.delete_cookie(settings.NINJA_JWT['AUTH_COOKIE_REFRESH'], domain=settings.NINJA_JWT['AUTH_COOKIE_DOMAIN'])
    return {"message": "Logout successful"}
