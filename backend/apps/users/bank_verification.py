import os
import requests
import logging
from typing import List, Dict, Any, Tuple
from django.conf import settings

logger = logging.getLogger(__name__)

# Fallback Ghana Bank & Mobile Money Network Directory Specifications
DEFAULT_GHANA_BANKS = [
  {"name": "GCB Bank Ltd", "code": "040100", "type": "bank"},
  {"name": "Ecobank Ghana Ltd", "code": "030100", "type": "bank"},
  {"name": "Absa Bank Ghana Ltd", "code": "020100", "type": "bank"},
  {"name": "Stanbic Bank Ghana Ltd", "code": "090100", "type": "bank"},
  {"name": "Standard Chartered Bank Ghana", "code": "010100", "type": "bank"},
  {"name": "Fidelity Bank Ghana Ltd", "code": "240100", "type": "bank"},
  {"name": "CalBank PLC", "code": "140100", "type": "bank"},
  {"name": "Zenith Bank Ghana Ltd", "code": "120100", "type": "bank"},
  {"name": "Access Bank Ghana PLC", "code": "280100", "type": "bank"},
  {"name": "Consolidated Bank Ghana (CBG)", "code": "340100", "type": "bank"},
  {"name": "Republic Bank Ghana PLC", "code": "170100", "type": "bank"},
  {"name": "Prudential Bank Ltd", "code": "100100", "type": "bank"},
  {"name": "Guaranty Trust Bank Ghana", "code": "130100", "type": "bank"},
  {"name": "First National Bank Ghana", "code": "330100", "type": "bank"},
  {"name": "United Bank for Africa (UBA)", "code": "180100", "type": "bank"},
  {"name": "Agricultural Development Bank (ADB)", "code": "080100", "type": "bank"},
  {"name": "National Investment Bank (NIB)", "code": "050100", "type": "bank"},
  {"name": "Bank of Africa Ghana", "code": "230100", "type": "bank"},
  {"name": "First Atlantic Bank Ghana", "code": "190100", "type": "bank"},
  {"name": "Societe Generale Ghana", "code": "070100", "type": "bank"},
  {"name": "MTN Mobile Money", "code": "MTN", "type": "momo"},
  {"name": "Telecel / Vodafone Cash", "code": "VOD", "type": "momo"},
  {"name": "AirtelTigo Money", "code": "ATL", "type": "momo"},
]

def get_supported_banks(gateway: str = None) -> List[Dict[str, str]]:
    """
    Fetches the list of supported commercial banks and mobile money networks.
    Queries the active gateway's bank directory API (e.g. Paystack / Hubtel) with fallback.
    """
    if not gateway:
        gateway = getattr(settings, 'ACTIVE_PAYMENT_GATEWAY', 'PAYSTACK')

    paystack_secret = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
    
    if gateway.upper() == 'PAYSTACK' and paystack_secret:
        try:
            url = "https://api.paystack.co/bank?country=ghana"
            headers = {"Authorization": f"Bearer {paystack_secret}"}
            res = requests.get(url, headers=headers, timeout=8)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") is True and isinstance(data.get("data"), list):
                    banks = []
                    for b in data["data"]:
                        banks.append({
                            "name": b.get("name"),
                            "code": b.get("code"),
                            "type": b.get("type", "bank")
                        })
                    if banks:
                        return banks
        except Exception as e:
            logger.warning(f"Paystack bank list API fetch failed: {e}. Using fallback Ghana bank list.")

    return DEFAULT_GHANA_BANKS

def resolve_bank_account(
    bank_code: str,
    account_number: str,
    gateway: str = None
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Resolves a bank account number against the bank code using the active payment gateway's NIP API.
    Returns: (success: bool, account_name_or_error: str, raw_response: dict)
    """
    clean_account = account_number.strip()
    clean_code = bank_code.strip()

    if not clean_account or not clean_code:
        return False, "Bank code and account number are required.", {}

    if not gateway:
        gateway = getattr(settings, 'ACTIVE_PAYMENT_GATEWAY', 'PAYSTACK')

    paystack_secret = getattr(settings, 'PAYSTACK_SECRET_KEY', '')

    # If in dev / test mode or using mock gateway
    if gateway.upper() == 'MOCK' or not paystack_secret:
        return _resolve_mock_bank_account(clean_code, clean_account)

    if gateway.upper() == 'PAYSTACK':
        url = "https://api.paystack.co/bank/resolve"
        headers = {"Authorization": f"Bearer {paystack_secret}"}
        params = {"account_number": clean_account, "bank_code": clean_code}
        try:
            res = requests.get(url, headers=headers, params=params, timeout=10)
            data = res.json()
            if res.status_code == 200 and data.get("status") is True:
                acc_name = data.get("data", {}).get("account_name", "")
                return True, acc_name, data.get("data", {})
            else:
                msg = data.get("message", "Could not resolve bank account with selected bank.")
                return False, msg, data
        except Exception as e:
            logger.error(f"Paystack account resolution error: {e}", exc_info=True)
            return False, f"Gateway connection error: {str(e)}", {}

    # Fallback to mock for local testing
    return _resolve_mock_bank_account(clean_code, clean_account)

def _resolve_mock_bank_account(bank_code: str, account_number: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Mock resolver for testing & development.
    """
    if account_number.endswith("000") or "FAIL" in account_number:
        return False, "Mock Resolution Error: Invalid account number for selected bank.", {}

    return True, "KWAME NKRUMAH ENTERPRISES", {"account_number": account_number, "bank_code": bank_code, "mock": True}

def match_account_name(resolved_name: str, user) -> Tuple[bool, float]:
    """
    Compares resolved bank account holder name against user profile names.
    Returns: (is_matched: bool, match_score: float)
    """
    if not resolved_name or not user:
        return False, 0.0

    target = resolved_name.strip().upper()
    
    candidates = [
        f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip().upper(),
        getattr(user, 'shop_name', '').strip().upper(),
        getattr(user, 'username', '').strip().upper(),
        getattr(user, 'first_name', '').strip().upper(),
        getattr(user, 'last_name', '').strip().upper()
    ]
    candidates = [c for c in candidates if c]

    for cand in candidates:
        if cand in target or target in cand:
            return True, 1.0
        
        # Word overlap check
        target_words = set(target.split())
        cand_words = set(cand.split())
        if target_words and cand_words:
            overlap = len(target_words.intersection(cand_words)) / max(len(target_words), len(cand_words))
            if overlap >= 0.5:
                return True, float(overlap)

    return False, 0.0
