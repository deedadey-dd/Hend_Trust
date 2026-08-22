from django.conf import settings
from ninja import Router, Schema
from ninja_jwt.tokens import RefreshToken
from ninja_jwt.schema import TokenRefreshInputSchema
from django.contrib.auth import authenticate
from django.http import HttpResponse
from apps.users.models import User, PayoutMode
from ninja.errors import HttpError
from typing import Optional
from hendaxis_trust.auth import JWTCookieAuth

auth_router = Router(tags=["Authentication"])
profile_router = Router(tags=["Seller Profile"], auth=JWTCookieAuth())

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

class LoginResponseSchema(Schema):
    message: str
    user_id: str
    username: str
    role: str
    email: str

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

@auth_router.post("/login", response=LoginResponseSchema)
def login(request, data: LoginSchema, response: HttpResponse):
    user = authenticate(username=data.username, password=data.password)
    if not user:
        raise HttpError(401, "Invalid credentials")
        
    refresh = RefreshToken.for_user(user)
    set_auth_cookies(response, refresh)
    
    return {
        "message": "Login successful",
        "user_id": str(user.id),
        "username": user.username,
        "role": user.role if hasattr(user, 'role') else 'SELLER',
        "email": user.email or "",
    }

@auth_router.post("/refresh", response=MessageSchema)
def refresh(request, response: HttpResponse):
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
def logout(request, response: HttpResponse):
    response.delete_cookie(settings.NINJA_JWT['AUTH_COOKIE'], domain=settings.NINJA_JWT['AUTH_COOKIE_DOMAIN'])
    response.delete_cookie(settings.NINJA_JWT['AUTH_COOKIE_REFRESH'], domain=settings.NINJA_JWT['AUTH_COOKIE_DOMAIN'])
    return {"message": "Logout successful"}

# --- Profile Schemas ---
from typing import Optional, List

class ProfileResponse(Schema):
    id: str
    username: str
    email: str
    first_name: str
    last_name: str
    phone_number: str
    payout_mode: str
    preferred_payout_type: Optional[str] = None
    momo_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None
    total_paystack_fees_ghs: Optional[float] = None
    # Shop Details
    shop_name: Optional[str] = ""
    shop_description: Optional[str] = ""
    shop_category: Optional[str] = "General"
    shop_categories: List[str] = []
    # Verification
    verification_status: str
    national_id_number: Optional[str] = ""
    national_id_photo_url: Optional[str] = ""
    business_license_photo_url: Optional[str] = ""
    verification_rejection_reason: Optional[str] = ""
    verified_at: Optional[str] = None

class ProfileUpdateRequest(Schema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    payout_mode: Optional[str] = None
    preferred_payout_type: Optional[str] = None
    momo_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None

class UpdateShopProfileRequest(Schema):
    shop_name: Optional[str] = ""
    shop_description: Optional[str] = ""
    shop_categories: Optional[List[str]] = []

class SubmitVerificationRequest(Schema):
    national_id_number: str
    national_id_photo_url: str
    business_license_photo_url: Optional[str] = ""

class ProfileMessageResponse(Schema):
    message: str

def _build_profile_response(user) -> dict:
    cats = user.shop_categories if isinstance(user.shop_categories, list) else []
    if not cats and user.shop_category:
        cats = [user.shop_category]

    data = {
        "id": str(user.id),
        "username": user.username,
        "email": user.email or "",
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "phone_number": user.phone_number or "",
        "payout_mode": user.payout_mode,
        "preferred_payout_type": None,
        "momo_number": None,
        "bank_account_number": None,
        "bank_name": None,
        "total_paystack_fees_ghs": None,
        "shop_name": user.shop_name or "",
        "shop_description": user.shop_description or "",
        "shop_category": user.shop_category or "General",
        "shop_categories": cats[:3],
        "verification_status": user.verification_status,
        "national_id_number": user.national_id_number or "",
        "national_id_photo_url": user.national_id_photo_url or "",
        "business_license_photo_url": user.business_license_photo_url or "",
        "verification_rejection_reason": user.verification_rejection_reason or "",
        "verified_at": user.verified_at.isoformat() if user.verified_at else None,
    }
    try:
        wallet = user.wallet
        data["preferred_payout_type"] = wallet.preferred_payout_type
        data["momo_number"] = wallet.momo_number
        data["bank_account_number"] = wallet.bank_account_number
        data["bank_name"] = wallet.bank_name
        data["total_paystack_fees_ghs"] = float(wallet.total_paystack_fees_ghs)
    except Exception:
        pass
    return data

@profile_router.get("/", response=ProfileResponse)
def get_profile(request):
    return _build_profile_response(request.user)

@profile_router.patch("/", response=ProfileMessageResponse)
def update_profile(request, data: ProfileUpdateRequest):
    user = request.user
    
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.payout_mode is not None:
        if data.payout_mode not in [PayoutMode.INSTANT, PayoutMode.MANUAL]:
            raise HttpError(400, "Invalid payout_mode. Must be 'INSTANT' or 'MANUAL'.")
        user.payout_mode = data.payout_mode
    user.save()
    
    # Update wallet fields if provided
    wallet_fields = {
        "preferred_payout_type": data.preferred_payout_type,
        "momo_number": data.momo_number,
        "bank_account_number": data.bank_account_number,
        "bank_name": data.bank_name,
    }
    if any(v is not None for v in wallet_fields.values()):
        from apps.wallet.api import get_user_wallet
        wallet = get_user_wallet(user)
        for field, value in wallet_fields.items():
            if value is not None:
                setattr(wallet, field, value)
        wallet.save()
    
    return {"message": "Profile updated successfully."}

@profile_router.put("/shop", response=ProfileMessageResponse)
def update_shop_profile(request, data: UpdateShopProfileRequest):
    user = request.user
    if data.shop_name is not None:
        user.shop_name = data.shop_name.strip()
    if data.shop_description is not None:
        user.shop_description = data.shop_description.strip()
    
    if data.shop_categories is not None:
        if len(data.shop_categories) > 3:
            raise HttpError(400, "You can select at most 3 product categories.")
        user.shop_categories = data.shop_categories
        if len(data.shop_categories) > 0:
            user.shop_category = data.shop_categories[0]

    user.save(update_fields=['shop_name', 'shop_description', 'shop_category', 'shop_categories'])
    return {"message": "Shop details updated successfully."}

@profile_router.post("/submit-verification", response=ProfileMessageResponse)
def submit_verification_documents(request, data: SubmitVerificationRequest):
    user = request.user
    if not data.national_id_number.strip():
        raise HttpError(400, "Please provide your National ID / Ghana Card number.")
    if not data.national_id_photo_url.strip():
        raise HttpError(400, "Please upload a photo of your National ID / Ghana Card.")

    from apps.users.models import VerificationStatus
    user.national_id_number = data.national_id_number.strip()
    user.national_id_photo_url = data.national_id_photo_url.strip()
    user.business_license_photo_url = (data.business_license_photo_url or "").strip()
    user.verification_status = VerificationStatus.PENDING
    user.verification_rejection_reason = ""
    user.save(update_fields=[
        'national_id_number', 'national_id_photo_url', 
        'business_license_photo_url', 'verification_status', 
        'verification_rejection_reason'
    ])

    return {"message": "Verification documents submitted successfully! A manager will review your submission."}

