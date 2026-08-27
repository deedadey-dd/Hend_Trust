import os
import requests
import json
import hmac
import hashlib
from typing import Dict, Any, Optional

class AppsNMobileAdapter:
    """
    AppsNMobile (The Orchard API) Adapter for Payin Collections and Payout Disbursements.
    Documentation: https://anmgw.com
    """
    @classmethod
    def get_headers(cls, payload_str: str = "") -> Dict[str, str]:
        client_id = os.getenv('APPSNMOBILE_CLIENT_ID', '')
        secret_key = os.getenv('APPSNMOBILE_SECRET_KEY', '')
        api_key = os.getenv('APPSNMOBILE_API_KEY', '')

        # Generate HMAC signature if secret key is provided
        signature = ""
        if secret_key and payload_str:
            signature = hmac.new(
                secret_key.encode('utf-8'),
                payload_str.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "X-Client-ID": client_id,
            "X-Signature": signature
        }

    @classmethod
    def initialize_transaction(cls, email: str, amount_ghs: float, reference: str, callback_url: str) -> Dict[str, Any]:
        """
        Initiates a mobile money / card collection request via AppsNMobile Orchard API.
        """
        base_url = os.getenv('APPSNMOBILE_BASE_URL', 'https://api.anmgw.com/v1')
        client_id = os.getenv('APPSNMOBILE_CLIENT_ID', '')

        payload = {
            "amount": amount_ghs,
            "exttrid": reference,
            "reference": reference,
            "customer_email": email,
            "callback_url": callback_url,
            "service_id": client_id
        }
        payload_str = json.dumps(payload)

        from django.conf import settings

        # Mock fallback if credentials are not set or are placeholder values
        if not client_id or client_id.startswith('your_') or client_id.startswith('placeholder'):
            print(f"[MOCK APPSNMOBILE PAYIN] Initialized payment reference {reference} for GHS {amount_ghs:.2f}")
            return {
                "authorization_url": f"https://checkout.anmgw.com/pay/{reference}",
                "reference": reference,
                "status": "success"
            }

        try:
            resp = requests.post(
                f"{base_url}/checkout/initialize",
                data=payload_str,
                headers=cls.get_headers(payload_str),
                timeout=15
            )
            data = resp.json()
            if resp.status_code == 200 and data.get("resp_code") == "000":
                return {
                    "authorization_url": data.get("checkout_url"),
                    "reference": reference,
                    "status": "success"
                }
            raise Exception(data.get("resp_desc") or "AppsNMobile initialization failed")
        except Exception as ex:
            print(f"AppsNMobile Payin Error: {ex}")
            if settings.DEBUG or not client_id or client_id.startswith('your_'):
                return {
                    "authorization_url": f"https://checkout.anmgw.com/pay/{reference}",
                    "reference": reference,
                    "status": "success"
                }
            raise ex

    @classmethod
    def disburse_payout(cls, phone_number: str, network: str, amount_ghs: float, reference: str) -> Dict[str, Any]:
        """
        Disburses MoMo payout via AppsNMobile Orchard Bulk Disbursement API.
        network: 'MTN', 'VODAFONE' (Telecel), 'AIRTELTIGO'
        """
        from django.conf import settings
        base_url = os.getenv('APPSNMOBILE_BASE_URL', 'https://api.anmgw.com/v1')
        client_id = os.getenv('APPSNMOBILE_CLIENT_ID', '')

        payload = {
            "amount": amount_ghs,
            "recipient_number": phone_number,
            "nw": network.upper(),
            "exttrid": reference,
            "reference": reference
        }
        payload_str = json.dumps(payload)

        if not client_id or client_id.startswith('your_') or client_id.startswith('placeholder'):
            print(f"[MOCK APPSNMOBILE PAYOUT] Disbursed GHS {amount_ghs:.2f} to {phone_number} ({network}) - Ref: {reference}")
            return {"status": "SUCCESS", "reference": reference, "message": "Mock payout dispatched"}

        try:
            resp = requests.post(
                f"{base_url}/disbursement/send",
                data=payload_str,
                headers=cls.get_headers(payload_str),
                timeout=15
            )
            data = resp.json()
            return {"status": "SUCCESS" if resp.status_code == 200 else "FAILED", "raw": data}
        except Exception as ex:
            print(f"AppsNMobile Payout Error: {ex}")
            if settings.DEBUG or not client_id or client_id.startswith('your_'):
                return {"status": "SUCCESS", "reference": reference, "message": f"Mock sandbox payout (Connection exception: {ex})"}
            return {"status": "FAILED", "error": str(ex)}
