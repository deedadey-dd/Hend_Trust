import secrets
from datetime import timedelta
from typing import Optional, List
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.core.validators import validate_email as django_validate_email
from django.http import HttpResponse

from ninja import Router, Schema
from ninja.errors import HttpError
from ninja_jwt.tokens import RefreshToken
from ninja_jwt.schema import TokenRefreshInputSchema

from apps.users.models import User, PayoutMode
from hendaxis_trust.auth import JWTCookieAuth
from apps.core.ratelimit import rate_limit, lockout_on_failure
from apps.core.tasks import dispatch_sms_task

auth_router = Router(tags=["Authentication"])
profile_router = Router(tags=["Seller Profile"], auth=JWTCookieAuth())

def _send_user_phone_otp(user):
    import random
    code = f"{random.randint(100000, 999999):06d}"
    user.phone_otp_code = code
    user.phone_otp_created_at = timezone.now()
    user.save(update_fields=['phone_otp_code', 'phone_otp_created_at'])

    sms_message = f"Your HendAxis Trust seller verification code is: {code}. Valid for 10 minutes."
    try:
        dispatch_sms_task.delay(user.phone_number, sms_message)
    except Exception as e:
        # Fallback to direct execution if Celery worker is offline
        dispatch_sms_task(user.phone_number, sms_message)
    return code

class RegisterSchema(Schema):
    username: str
    email: str
    password: str
    phone_number: str
    role: Optional[str] = 'SELLER'

class LoginSchema(Schema):
    username: str
    password: str
    remember: Optional[bool] = False

class MessageSchema(Schema):
    message: str

class SendPhoneOtpSchema(Schema):
    uid: Optional[str] = None
    email_or_username: Optional[str] = None

class VerifyPhoneOtpSchema(Schema):
    uid: Optional[str] = None
    email_or_username: Optional[str] = None
    otp_code: str

class LoginResponseSchema(Schema):
    message: str
    user_id: str
    username: str
    role: str
    email: str

class ForgotPasswordSchema(Schema):
    email: str

class ResetPasswordSchema(Schema):
    uid: str
    token: str
    new_password: str

class ActivateAccountSchema(Schema):
    uid: str
    token: str

class ResendActivationSchema(Schema):
    email: str

def set_auth_cookies(response, refresh_token, remember=False):
    if remember:
        access_lifetime = timedelta(days=7)
        refresh_lifetime = timedelta(days=30)
    else:
        access_lifetime = settings.NINJA_JWT.get('ACCESS_TOKEN_LIFETIME', timedelta(hours=2))
        refresh_lifetime = settings.NINJA_JWT.get('REFRESH_TOKEN_LIFETIME', timedelta(days=7))

    refresh_token.set_exp(lifetime=refresh_lifetime)
    access_token = refresh_token.access_token
    access_token.set_exp(lifetime=access_lifetime)
    
    response.set_cookie(
        key=settings.NINJA_JWT['AUTH_COOKIE'],
        value=str(access_token),
        max_age=int(access_lifetime.total_seconds()),
        secure=settings.NINJA_JWT['AUTH_COOKIE_SECURE'],
        httponly=settings.NINJA_JWT['AUTH_COOKIE_HTTP_ONLY'],
        samesite=settings.NINJA_JWT['AUTH_COOKIE_SAMESITE'],
        domain=settings.NINJA_JWT['AUTH_COOKIE_DOMAIN']
    )
    response.set_cookie(
        key=settings.NINJA_JWT['AUTH_COOKIE_REFRESH'],
        value=str(refresh_token),
        max_age=int(refresh_lifetime.total_seconds()),
        secure=settings.NINJA_JWT['AUTH_COOKIE_SECURE'],
        httponly=settings.NINJA_JWT['AUTH_COOKIE_HTTP_ONLY'],
        samesite=settings.NINJA_JWT['AUTH_COOKIE_SAMESITE'],
        domain=settings.NINJA_JWT['AUTH_COOKIE_DOMAIN']
    )

def send_account_activation_email(user, request=None):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    activation_link = f"{frontend_url}/activate-account?uid={uid}&token={token}"
    
    subject = "Activate Your HendAxis Trust Account"
    message = f"Hello {user.username},\n\nThank you for registering on HendAxis Trust! Please click the link below to activate your account:\n\n{activation_link}\n\nIf you did not register, please ignore this email."
    
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #2563eb; margin-top: 0;">Welcome to HendAxis Trust</h2>
      <p style="font-size: 15px; color: #334155;">Hello <strong>{user.username}</strong>,</p>
      <p style="font-size: 15px; color: #334155;">Thank you for creating an account with us. Please click the button below to verify your email address and activate your account:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="{activation_link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 10px; display: inline-block;">Activate My Account</a>
      </p>
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">If the button above does not work, copy and paste this link into your web browser:<br/><a href="{activation_link}" style="color: #2563eb;">{activation_link}</a></p>
    </div>
    """
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False
    )

def send_password_reset_email(user, request=None):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"
    
    subject = "Reset Your HendAxis Trust Password"
    message = f"Hello {user.username},\n\nYou requested to reset your HendAxis Trust password. Click the link below to set a new password:\n\n{reset_link}\n\nIf you did not request a password reset, please ignore this email."
    
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <h2 style="color: #2563eb; margin-top: 0;">Password Reset Request</h2>
      <p style="font-size: 15px; color: #334155;">Hello <strong>{user.username}</strong>,</p>
      <p style="font-size: 15px; color: #334155;">We received a request to reset your password for your HendAxis Trust account. Click the button below to proceed:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="{reset_link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 15px; border-radius: 10px; display: inline-block;">Reset Password</a>
      </p>
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">If you did not request this, your account remains secure and no action is required.</p>
    </div>
    """
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False
    )

@auth_router.post("/register", response=MessageSchema)
@rate_limit('auth_register', max_calls=10, window_seconds=3600)
def register(request, data: RegisterSchema):
    # Validate email format
    try:
        django_validate_email(data.email.strip())
    except DjangoValidationError:
        raise HttpError(400, "Please provide a valid email address.")

    # Validate username: alphanumeric + underscore only
    import re
    if not re.match(r'^[\w]{3,30}$', data.username.strip()):
        raise HttpError(400, "Username must be 3–30 characters: letters, numbers, and underscores only.")

    if User.objects.filter(username__iexact=data.username.strip()).exists():
        raise HttpError(400, "Username already exists")
    if User.objects.filter(email__iexact=data.email.strip()).exists():
        raise HttpError(400, "Email address already registered")
    if User.objects.filter(phone_number=data.phone_number.strip()).exists():
        raise HttpError(400, "Phone number already exists")

    # Validate password strength using Django's full validators
    temp_user = User(username=data.username.strip())
    try:
        validate_password(data.password, user=temp_user)
    except DjangoValidationError as e:
        raise HttpError(400, " ".join(e.messages))

    user = User.objects.create_user(
        username=data.username.strip(),
        email=data.email.strip(),
        password=data.password,
        phone_number=data.phone_number.strip(),
        role=data.role or 'SELLER',
        is_email_verified=False
    )

    try:
        send_account_activation_email(user, request)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error sending activation email to user {user.id}: {e}")

    return {"message": "Account created! Please check your email to activate your account before logging in."}

@auth_router.post("/activate-account", response=dict)
def activate_account(request, data: ActivateAccountSchema):
    try:
        pk = force_str(urlsafe_base64_decode(data.uid))
        user = User.objects.get(pk=pk)
    except Exception:
        raise HttpError(400, "Invalid activation link.")
        
    if not default_token_generator.check_token(user, data.token) and not user.is_email_verified:
        raise HttpError(400, "Activation link is invalid or has expired.")
        
    user.is_email_verified = True
    user.save(update_fields=['is_email_verified'])

    if not user.is_phone_verified:
        _send_user_phone_otp(user)
        return {
            "message": "Email verified successfully! We've sent a 6-digit SMS OTP code to your phone number.",
            "requires_phone_verification": True,
            "uid": data.uid,
            "phone_number": user.phone_number,
            "is_phone_verified": False
        }
        
    return {
        "message": "Account activated successfully! You can now log in.",
        "requires_phone_verification": False,
        "uid": data.uid,
        "is_phone_verified": True
    }

@auth_router.post("/send-phone-otp", response=dict)
@rate_limit('auth_send_phone_otp', max_calls=5, window_seconds=600)
def send_phone_otp(request, data: SendPhoneOtpSchema):
    from django.db.models import Q
    user = None
    if getattr(request, 'user', None) and request.user.is_authenticated:
        user = request.user
    elif data.uid:
        try:
            pk = force_str(urlsafe_base64_decode(data.uid))
            user = User.objects.get(pk=pk)
        except Exception:
            raise HttpError(400, "Invalid user identification.")
    elif data.email_or_username:
        user = User.objects.filter(
            Q(email__iexact=data.email_or_username.strip()) | Q(username__iexact=data.email_or_username.strip())
        ).first()

    if not user:
        raise HttpError(400, "User account not found.")

    if user.is_phone_verified:
        return {"message": "Phone number is already verified.", "is_phone_verified": True}

    _send_user_phone_otp(user)
    masked_phone = f"{user.phone_number[:4]}****{user.phone_number[-2:]}" if len(user.phone_number) >= 6 else user.phone_number
    return {
        "message": f"Verification code sent to {masked_phone}.",
        "phone_number": user.phone_number,
        "is_phone_verified": False
    }

@auth_router.post("/verify-phone-otp", response=dict)
def verify_phone_otp(request, data: VerifyPhoneOtpSchema):
    from django.db.models import Q
    user = None
    if getattr(request, 'user', None) and request.user.is_authenticated:
        user = request.user
    elif data.uid:
        try:
            pk = force_str(urlsafe_base64_decode(data.uid))
            user = User.objects.get(pk=pk)
        except Exception:
            raise HttpError(400, "Invalid user identification.")
    elif data.email_or_username:
        user = User.objects.filter(
            Q(email__iexact=data.email_or_username.strip()) | Q(username__iexact=data.email_or_username.strip())
        ).first()

    if not user:
        raise HttpError(400, "User account not found.")

    if user.is_phone_verified:
        return {"message": "Phone number is already verified.", "is_phone_verified": True}

    if not user.phone_otp_code or not data.otp_code.strip():
        raise HttpError(400, "Please enter the 6-digit verification code sent to your phone.")

    if not user.phone_otp_created_at or (timezone.now() - user.phone_otp_created_at) > timedelta(minutes=10):
        raise HttpError(400, "Verification code has expired. Please request a new code.")

    if data.otp_code.strip() != user.phone_otp_code:
        raise HttpError(400, "Invalid verification code. Please check and try again.")

    user.is_phone_verified = True
    user.phone_otp_code = ""
    user.save(update_fields=['is_phone_verified', 'phone_otp_code'])

    return {
        "message": "Phone number verified successfully! Your account is now fully active.",
        "is_phone_verified": True
    }

@auth_router.post("/resend-activation", response=MessageSchema)
@rate_limit('auth_resend_activation', max_calls=3, window_seconds=600)
def resend_activation(request, data: ResendActivationSchema):
    user = User.objects.filter(email__iexact=data.email.strip()).first()
    if not user:
        return {"message": "If an account exists with that email, an activation link has been sent."}
    if user.is_email_verified:
        return {"message": "Your account is already activated. Please sign in."}

    try:
        send_account_activation_email(user, request)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Activation email error for user {user.id}: {e}")
    return {"message": "Activation email resent. Please check your inbox."}

@auth_router.post("/forgot-password", response=MessageSchema)
@rate_limit('auth_forgot_password', max_calls=5, window_seconds=600)
def forgot_password(request, data: ForgotPasswordSchema):
    user = User.objects.filter(email__iexact=data.email.strip()).first()
    if user:
        try:
            send_password_reset_email(user, request)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Password reset email error for user {user.id}: {e}")
    return {"message": "If an account exists with that email, password reset instructions have been sent."}

@auth_router.post("/reset-password", response=MessageSchema)
def reset_password(request, data: ResetPasswordSchema):
    try:
        pk = force_str(urlsafe_base64_decode(data.uid))
        user = User.objects.get(pk=pk)
    except Exception:
        raise HttpError(400, "Invalid reset link.")

    if not default_token_generator.check_token(user, data.token):
        raise HttpError(400, "Password reset link is invalid or has expired.")

    # Use Django's full password validators instead of a bare length check
    try:
        validate_password(data.new_password, user=user)
    except DjangoValidationError as e:
        raise HttpError(400, " ".join(e.messages))

    user.set_password(data.new_password)
    user.save()
    return {"message": "Password reset successfully! You can now log in with your new password."}

@auth_router.post("/login", response=LoginResponseSchema)
@rate_limit('auth_login', max_calls=20, window_seconds=300)
def login(request, data: LoginSchema, response: HttpResponse):
    # Per-username lockout (5 failures → 15-min lockout)
    lockout_factory = lockout_on_failure('login', max_attempts=5, lockout_seconds=900)
    check_lockout, record_failure, clear_failures = lockout_factory(data.username.strip().lower())
    check_lockout()

    user = authenticate(username=data.username, password=data.password)
    if not user:
        # Fallback check by email if user entered email instead of username
        user_by_email = User.objects.filter(email__iexact=data.username.strip()).first()
        if user_by_email:
            user = authenticate(username=user_by_email.username, password=data.password)

    if not user:
        record_failure()
        raise HttpError(401, "Invalid credentials")

    if not user.is_email_verified:
        raise HttpError(403, "Please check your email and activate your account before logging in.")

    if not user.is_phone_verified:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        if not user.phone_otp_code or not user.phone_otp_created_at or (timezone.now() - user.phone_otp_created_at) > timedelta(minutes=10):
            _send_user_phone_otp(user)
        raise HttpError(403, f"PHONE_VERIFICATION_REQUIRED:{uid}:{user.phone_number}")

    clear_failures()  # Reset lockout counter on successful auth
    refresh = RefreshToken.for_user(user)
    set_auth_cookies(response, refresh, remember=bool(getattr(data, 'remember', False)))
    
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
    profile_picture_url: Optional[str] = ""
    banner_url: Optional[str] = ""
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
    momo_otp: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_name: Optional[str] = None

class UpdateShopProfileRequest(Schema):
    shop_name: Optional[str] = ""
    shop_description: Optional[str] = ""
    shop_categories: Optional[List[str]] = []
    profile_picture_url: Optional[str] = None
    banner_url: Optional[str] = None

class SubmitVerificationRequest(Schema):
    national_id_number: str
    national_id_photo_url: str
    business_license_photo_url: Optional[str] = ""

class ProfileMessageResponse(Schema):
    message: str

class RequestMomoOTPSchema(Schema):
    momo_number: str

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
        "profile_picture_url": user.profile_picture_url or "",
        "banner_url": user.banner_url or "",
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

@profile_router.post("/request-momo-otp", response=ProfileMessageResponse)
@rate_limit('momo_otp_request', max_calls=5, window_seconds=600)
def request_momo_otp(request, data: RequestMomoOTPSchema):
    user = request.user
    momo = data.momo_number.strip()
    if not momo:
        raise HttpError(400, "Mobile money number is required.")

    # Use cryptographically secure OTP
    code = str(secrets.randbelow(900000) + 100000)
    user.pending_momo_number = momo
    user.momo_otp_code = code
    user.momo_otp_created_at = timezone.now()
    user.save(update_fields=['pending_momo_number', 'momo_otp_code', 'momo_otp_created_at'])
    
    sms_sent = MNotifyService.send_sms(
        momo, 
        f"Your HendAxis Trust payout verification code is: {code}. Valid for 10 minutes."
    )
    if not sms_sent:
        raise HttpError(500, "Failed to send SMS verification code. Please try again.")
        
    return {"message": f"Verification code sent to {momo}."}

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
    
    # Check if momo_number is being updated
    if data.momo_number is not None:
        from apps.wallet.api import get_user_wallet
        wallet = get_user_wallet(user)
        # If user is changing or setting a new MoMo number
        if data.momo_number.strip() != (wallet.momo_number or ""):
            # Require OTP verification!
            if not data.momo_otp or not data.momo_otp.strip():
                raise HttpError(400, "OTP verification code is required to update your MoMo payout number.")
                
            if not user.momo_otp_code or user.pending_momo_number != data.momo_number.strip():
                raise HttpError(400, "Please request a verification code for this MoMo number first.")
                
            # Check 10-minute expiry
            if not user.momo_otp_created_at or (timezone.now() - user.momo_otp_created_at) > timedelta(minutes=10):
                raise HttpError(400, "Verification code has expired. Please request a new code.")
                
            if data.momo_otp.strip() != user.momo_otp_code:
                raise HttpError(400, "Invalid verification code.")
                
            # Clear used OTP
            user.momo_otp_code = ""
            user.pending_momo_number = ""
            user.save(update_fields=['momo_otp_code', 'pending_momo_number'])
    
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
    update_fields = []
    if data.shop_name is not None:
        user.shop_name = data.shop_name.strip()
        update_fields.append('shop_name')
    if data.shop_description is not None:
        user.shop_description = data.shop_description.strip()
        update_fields.append('shop_description')
    if data.profile_picture_url is not None:
        user.profile_picture_url = data.profile_picture_url.strip()
        update_fields.append('profile_picture_url')
    if data.banner_url is not None:
        user.banner_url = data.banner_url.strip()
        update_fields.append('banner_url')
    
    if data.shop_categories is not None:
        if len(data.shop_categories) > 3:
            raise HttpError(400, "You can select at most 3 product categories.")
        user.shop_categories = data.shop_categories
        update_fields.append('shop_categories')
        if len(data.shop_categories) > 0:
            user.shop_category = data.shop_categories[0]
            update_fields.append('shop_category')

    if update_fields:
        user.save(update_fields=update_fields)
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
