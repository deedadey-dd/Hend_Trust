import secrets
import logging
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class PaystackAdapter:
    BASE_URL = "https://api.paystack.co"

    @classmethod
    def initialize_transaction(cls, email: str, amount_ghs: float, reference: str, callback_url: str = None):
        import requests
        url = f"{cls.BASE_URL}/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        # Paystack requires amount in kobo/pesewas (multiply by 100)
        data = {
            "email": email,
            "amount": int(amount_ghs * 100),
            "reference": reference,
            "currency": "GHS"
        }
        if callback_url:
            data['callback_url'] = callback_url

        response = requests.post(url, headers=headers, json=data, timeout=15)
        response.raise_for_status()
        return response.json()['data']

    @classmethod
    def verify_transaction(cls, reference: str):
        import requests
        url = f"{cls.BASE_URL}/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        return response.json()['data']


def initialize_transaction_with_failover(
    email: str,
    amount_ghs: float,
    reference: str,
    callback_url: str = None
) -> dict:
    """
    Initializes a checkout transaction following the platform's configured gateway hierarchy:
    Primary -> Secondary (Failover) -> Tertiary (Last Resort).

    If the primary gateway experiences a network error, downtime, or 5xx, the engine
    automatically falls back to the next ranked gateway in real time.
    """
    from apps.escrow.api import get_platform_settings
    from ninja.errors import HttpError

    cfg = get_platform_settings()
    primary = (cfg.get("primary_payment_gateway") or cfg.get("active_payment_gateway") or "PAYSTACK").upper().strip()
    secondary = (cfg.get("secondary_payment_gateway") or "").upper().strip() or None
    tertiary = (cfg.get("tertiary_payment_gateway") or "").upper().strip() or None
    failover_enabled = bool(cfg.get("gateway_failover_enabled", True))

    candidates = [primary]
    if failover_enabled:
        for gw in [secondary, tertiary]:
            if gw and gw not in candidates:
                candidates.append(gw)

    errors = []
    attempted = []

    for rank, gw in enumerate(candidates, start=1):
        attempted.append(gw)
        try:
            if gw == "PAYSTACK":
                data = PaystackAdapter.initialize_transaction(
                    email=email,
                    amount_ghs=amount_ghs,
                    reference=reference,
                    callback_url=callback_url
                )
                auth_url = data.get("authorization_url")
            elif gw == "APPSNMOBILE":
                from apps.checkout.adapters.appsnmobile import AppsNMobileAdapter
                data = AppsNMobileAdapter.initialize_transaction(
                    email=email,
                    amount_ghs=amount_ghs,
                    reference=reference,
                    callback_url=callback_url
                )
                auth_url = data.get("authorization_url")
            elif gw == "HUBTEL":
                from apps.checkout.adapters.hubtel import HubtelAdapter
                data = HubtelAdapter.initialize_transaction(
                    email=email,
                    amount_ghs=amount_ghs,
                    reference=reference,
                    callback_url=callback_url
                )
                auth_url = data.get("authorization_url")
            else:
                raise ValueError(f"Unknown gateway candidate: {gw}")

            if not auth_url:
                raise ValueError(f"{gw} response did not contain an authorization_url")

            if rank > 1:
                logger.warning(
                    "[GATEWAY FAILOVER SUCCESS] Transaction %s successfully initialized on rank %d (%s) after earlier failures.",
                    reference, rank, gw
                )

            return {
                "authorization_url": auth_url,
                "reference": reference,
                "gateway_used": gw,
                "gateway_rank": rank,
                "failover_attempted": attempted,
                "raw_data": data
            }

        except Exception as exc:
            err_msg = f"{gw} (Rank {rank}): {str(exc)}"
            errors.append(err_msg)
            logger.warning(
                "[GATEWAY FAILOVER ATTEMPT] Payment initialization failed on %s for %s: %s. Candidates remaining: %s",
                gw, reference, exc, candidates[rank:]
            )

    raise HttpError(
        500,
        f"All configured payment engines failed to initialize checkout ({'; '.join(errors)})"
    )



# ─── OTP constants ────────────────────────────────────────────────────────────

_OTP_TTL = 7200          # 2 hours (7200 seconds)
_OTP_SEND_COOLDOWN = 60  # 60 seconds between resends
_OTP_MAX_ATTEMPTS = 5    # auto-invalidate after 5 wrong tries


def _otp_value_key(identifier: str) -> str:
    return f"otp_val:{identifier}"

def _otp_attempts_key(identifier: str) -> str:
    return f"otp_attempts:{identifier}"

def _otp_cooldown_key(identifier: str) -> str:
    return f"otp_cooldown:{identifier}"


def generate_and_send_otp(phone_number: str) -> str:
    """
    Generate a cryptographically secure 6-digit OTP for the given phone number.
    Enforces a 60-second cooldown between sends.
    """
    cooldown_key = _otp_cooldown_key(phone_number)
    if cache.get(cooldown_key):
        # Return silently — don't reveal if there's an active OTP
        return ""

    # Generate using secrets module (cryptographically secure)
    otp = str(secrets.randbelow(900000) + 100000)  # 100000–999999

    # Store OTP value and reset attempt counter
    cache.set(_otp_value_key(phone_number), otp, timeout=_OTP_TTL)
    cache.set(_otp_attempts_key(phone_number), 0, timeout=_OTP_TTL)
    cache.set(cooldown_key, 1, timeout=_OTP_SEND_COOLDOWN)

    if getattr(settings, 'DEBUG', False):
        print("\n" + "="*60, flush=True)
        print(f"🔑 DEV CHECKOUT PHONE OTP: {otp}", flush=True)
        print(f"To Phone: {phone_number}", flush=True)
        print("="*60 + "\n", flush=True)
        logger.info("OTP generated for phone %s*** [DEV OTP: %s]", phone_number[:5], otp)
    else:
        logger.info("OTP generated for phone %s***", phone_number[:5])

    msg = f"Your HendAxis Trust Checkout OTP is {otp}. Valid for 2 hours. Do not share this code."
    from apps.core.tasks import dispatch_sms_task
    dispatch_sms_task.delay(phone_number, msg)
    return otp


def generate_and_send_email_otp(email: str) -> str:
    """
    Generate a cryptographically secure 6-digit OTP for the given email address.
    Enforces a 60-second cooldown between sends.
    """
    cooldown_key = _otp_cooldown_key(email)
    if cache.get(cooldown_key):
        return ""

    otp = str(secrets.randbelow(900000) + 100000)

    cache.set(_otp_value_key(email), otp, timeout=_OTP_TTL)
    cache.set(_otp_attempts_key(email), 0, timeout=_OTP_TTL)
    cache.set(cooldown_key, 1, timeout=_OTP_SEND_COOLDOWN)

    if getattr(settings, 'DEBUG', False):
        print("\n" + "="*60, flush=True)
        print(f"🔑 DEV TRACKING EMAIL OTP: {otp}", flush=True)
        print(f"To Email: {email}", flush=True)
        print("="*60 + "\n", flush=True)
        logger.info("Email OTP generated for %s*** [DEV OTP: %s]", email[:4], otp)
    else:
        logger.info("Email OTP generated for %s***", email[:4])

    msg = f"Your HendAxis Trust Tracking OTP is {otp}. Valid for 2 hours. Do not share this code."
    from apps.core.tasks import dispatch_email_task
    dispatch_email_task.delay(email, "HendAxis Trust - Tracking OTP", msg)
    return otp


def verify_otp(identifier: str, otp_code: str) -> bool:
    """
    Verify an OTP for the given identifier.
    - Single-use: deletes the OTP on success.
    - Brute-force protection: invalidates after _OTP_MAX_ATTEMPTS failed tries.
    """
    val_key = _otp_value_key(identifier)
    attempts_key = _otp_attempts_key(identifier)

    cached_otp = cache.get(val_key)
    if not cached_otp:
        return False

    # Compare using secrets.compare_digest to prevent timing attacks
    if secrets.compare_digest(str(cached_otp), str(otp_code).strip()):
        # Success — delete OTP immediately (single-use)
        cache.delete(val_key)
        cache.delete(attempts_key)
        cache.delete(_otp_cooldown_key(identifier))
        return True

    # Failed attempt — increment counter
    attempts = cache.get(attempts_key, 0) + 1
    if attempts >= _OTP_MAX_ATTEMPTS:
        # Too many failures — invalidate OTP entirely
        cache.delete(val_key)
        cache.delete(attempts_key)
        logger.warning(
            "OTP invalidated after %d failed attempts for identifier %s***",
            _OTP_MAX_ATTEMPTS, identifier[:5]
        )
    else:
        cache.set(attempts_key, attempts, timeout=_OTP_TTL)

    return False
