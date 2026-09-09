import re
import os
import requests
import logging
from typing import Tuple, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)

# Standard Ghana Card format: GHA-XXXXXXXXX-X (e.g. GHA-123456789-0)
GHANA_CARD_REGEX = re.compile(r'^GHA-\d{9}-\d$', re.IGNORECASE)

def normalize_ghana_card_number(card_number: str) -> str:
    """
    Cleans and formats a Ghana Card number to standard 'GHA-XXXXXXXXX-X'.
    """
    cleaned = card_number.strip().upper().replace(' ', '')
    digits = re.sub(r'\D', '', cleaned)
    if len(digits) == 10:
        return f"GHA-{digits[:9]}-{digits[9]}"
    if not cleaned.startswith('GHA'):
        cleaned = f"GHA-{cleaned}"
    return cleaned

def validate_ghana_card_format(card_number: str) -> bool:
    """
    Validates if a given string matches standard Ghana Card format (GHA-XXXXXXXXX-X).
    """
    normalized = normalize_ghana_card_number(card_number)
    return bool(GHANA_CARD_REGEX.match(normalized))

def verify_ghana_card(
    card_number: str,
    full_name: str = "",
    dob: str = "",
    phone: str = ""
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Verifies a Ghana Card number against configured National Identity service providers.
    Returns: (is_verified: bool, message: str, raw_response: dict)
    """
    normalized_card = normalize_ghana_card_number(card_number)
    if not validate_ghana_card_format(normalized_card):
        return False, "Invalid Ghana Card format. Must be formatted like GHA-123456789-0.", {}

    auto_verify_enabled = getattr(settings, 'ENABLE_GHANA_CARD_AUTO_VERIFY', True)
    if not auto_verify_enabled:
        return False, "Auto-verification is disabled in system configuration.", {}

    provider = getattr(settings, 'GHANA_CARD_VERIFY_PROVIDER', 'PAYSTACK').upper()

    try:
        if provider == 'PAYSTACK':
            return _verify_via_paystack(normalized_card)
        elif provider == 'NIA_DIRECT':
            return _verify_via_nia_direct(normalized_card, full_name)
        elif provider == 'PREMBLY':
            return _verify_via_prembly(normalized_card)
        elif provider == 'MOCK':
            return _verify_via_mock(normalized_card)
        else:
            # Fallback to Paystack if provider unknown
            return _verify_via_paystack(normalized_card)
    except Exception as e:
        logger.error(f"Error during Ghana Card verification via {provider}: {str(e)}", exc_info=True)
        return False, f"Auto-verification service unreachable: {str(e)}", {}

def _verify_via_paystack(card_number: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Verifies Ghana Card using Paystack's Customer Identity / Ghana Card API.
    Uses PAYSTACK_SECRET_KEY.
    """
    paystack_secret = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
    if not paystack_secret:
        logger.warning("PAYSTACK_SECRET_KEY not set. Falling back to mock verification check.")
        return _verify_via_mock(card_number)

    url = "https://api.paystack.co/identity/ghana_card"
    headers = {
        "Authorization": f"Bearer {paystack_secret}",
        "Content-Type": "application/json"
    }
    params = {"id_number": card_number}

    try:
        res = requests.get(url, headers=headers, params=params, timeout=10)
        data = res.json()
        
        if res.status_code == 200 and data.get("status") is True:
            verify_data = data.get("data", {})
            return True, "Ghana Card verified successfully via Paystack Identity API.", verify_data
        else:
            msg = data.get("message", "Ghana Card could not be verified on Paystack registry.")
            return False, msg, data
    except requests.RequestException as e:
        logger.warning(f"Paystack identity API endpoint error: {e}. Defaulting to manual fallback.")
        return False, f"Paystack identity verification request failed: {str(e)}", {}

def _verify_via_nia_direct(card_number: str, full_name: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Verifies Ghana Card directly via National Identification Authority (NIA) API endpoint.
    Uses NIA_API_URL and NIA_API_KEY.
    """
    nia_url = getattr(settings, 'NIA_API_URL', 'https://api.nia.gov.gh/v1/verify')
    nia_key = getattr(settings, 'NIA_API_KEY', '')
    client_id = getattr(settings, 'NIA_CLIENT_ID', '')

    if not nia_key:
        return False, "NIA_API_KEY is not configured.", {}

    headers = {
        "Authorization": f"Bearer {nia_key}",
        "X-Client-Id": client_id,
        "Content-Type": "application/json"
    }
    payload = {
        "card_number": card_number,
        "full_name": full_name
    }

    res = requests.post(nia_url, json=payload, headers=headers, timeout=10)
    data = res.json()

    if res.status_code == 200 and (data.get("valid") is True or data.get("status") == "VERIFIED"):
        return True, "Ghana Card verified directly with National Identification Authority (NIA).", data
    else:
        return False, data.get("message", "Card record not found or unverified in NIA database."), data

def _verify_via_prembly(card_number: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Verifies Ghana Card via Prembly (Identitypass) API.
    Uses PREMBLY_API_KEY.
    """
    api_key = getattr(settings, 'PREMBLY_API_KEY', '')
    if not api_key:
        return False, "PREMBLY_API_KEY is not configured.", {}

    url = "https://api.prembly.com/identitypass/verification/ghana/card"
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "search_mode": "card_number",
        "id_number": card_number
    }

    res = requests.post(url, json=payload, headers=headers, timeout=10)
    data = res.json()

    if res.status_code == 200 and data.get("status") is True:
        return True, "Ghana Card verified via Prembly Identity Service.", data
    else:
        return False, data.get("detail") or data.get("message", "Ghana Card verification failed."), data

def _verify_via_mock(card_number: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Mock verification for local development & automated test suites.
    Any valid format GHA-XXXXXXXXX-X passes except card numbers containing '999' or 'FAIL'.
    """
    if "999" in card_number or "FAIL" in card_number:
        return False, "Mock Verification Error: Ghana Card record rejected by NIA registry.", {"mock": True}
    
    return True, "Mock Ghana Card verified successfully.", {"mock": True, "card_number": card_number}
