import pyotp
import qrcode
import io
import base64
from typing import Tuple
from django.conf import settings

def generate_totp_secret() -> str:
    """Generate a cryptographically secure Base32 secret for TOTP authenticator app."""
    return pyotp.random_base32()

def get_totp_uri(user_email: str, secret: str) -> str:
    """Generate standardized otpauth:// URI for Google Authenticator / Authy / 1Password."""
    issuer_name = getattr(settings, 'TOTP_ISSUER_NAME', 'HendAxis Trust')
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=user_email, issuer_name=issuer_name)

def generate_qr_code_data_uri(uri: str) -> str:
    """Render otpauth URI as a base64 Data URI PNG for frontend display."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

def verify_totp_code(secret: str, code: str, valid_window: int = 1) -> bool:
    """
    Verify a 6-digit TOTP code against the secret.
    Allows valid_window=1 (30 seconds clock drift flexibility).
    """
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=valid_window)
