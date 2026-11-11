import os
import requests
import json
import base64
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class HubtelAdapter:
    """
    Hubtel Merchant Online Checkout Adapter for Ghana Mobile Money & Card collections.
    Supports dynamic checkout session initialization and transaction status verification.
    """

    @classmethod
    def get_auth_header(cls) -> Dict[str, str]:
        client_id = os.getenv('HUBTEL_CLIENT_ID', '').strip()
        client_secret = os.getenv('HUBTEL_CLIENT_SECRET', '').strip()
        creds = f"{client_id}:{client_secret}".encode('utf-8')
        encoded = base64.b64encode(creds).decode('utf-8')
        return {
            "Content-Type": "application/json",
            "Authorization": f"Basic {encoded}"
        }

    @classmethod
    def initialize_transaction(cls, email: str, amount_ghs: float, reference: str, callback_url: str = None) -> Dict[str, Any]:
        """
        Initiates a payment checkout session with Hubtel.
        Falls back gracefully to mock URL in test/dev mode if live credentials are not provided.
        """
        client_id = os.getenv('HUBTEL_CLIENT_ID', '').strip()
        client_secret = os.getenv('HUBTEL_CLIENT_SECRET', '').strip()
        from django.conf import settings

        # In dev/test or when credentials are dummy/unconfigured, mock the checkout session
        is_mock = (
            not client_id
            or not client_secret
            or client_id.startswith('your_')
            or client_id.startswith('placeholder')
            or getattr(settings, 'DEBUG', False)
        )

        if is_mock and not (client_id and client_secret and not client_id.startswith('your_')):
            logger.info(f"[MOCK HUBTEL PAYIN] Initialized payment reference {reference} for GHS {amount_ghs:.2f}")
            return {
                "authorization_url": f"https://pay.hubtel.com/checkout/{reference}",
                "reference": reference,
                "status": "success",
                "gateway": "HUBTEL"
            }

        base_url = os.getenv('HUBTEL_CHECKOUT_BASE_URL', 'https://api-checkout.hubtel.com/v2').rstrip('/')
        payload = {
            "totalAmount": float(amount_ghs),
            "description": f"HendAxis Trust Order #{reference}",
            "callbackUrl": callback_url or "https://trust.hendaxis.com/tracking",
            "returnUrl": callback_url or "https://trust.hendaxis.com/tracking",
            "cancellationUrl": callback_url or "https://trust.hendaxis.com/tracking",
            "clientReference": reference
        }

        try:
            resp = requests.post(
                f"{base_url}/merchantaccount/merchants/{client_id}/postpaid/checkouts",
                json=payload,
                headers=cls.get_auth_header(),
                timeout=15
            )
            data = resp.json() if resp.content else {}
            checkout_url = data.get("checkoutUrl") or data.get("data", {}).get("checkoutUrl")

            if resp.status_code in [200, 201] and checkout_url:
                return {
                    "authorization_url": checkout_url,
                    "reference": reference,
                    "status": "success",
                    "gateway": "HUBTEL"
                }

            err_msg = data.get("message") or data.get("responseDescription") or f"Hubtel API status {resp.status_code}"
            raise Exception(err_msg)
        except Exception as ex:
            logger.warning(f"Hubtel Payin Error for {reference}: {ex}")
            if getattr(settings, 'DEBUG', False):
                return {
                    "authorization_url": f"https://pay.hubtel.com/checkout/{reference}",
                    "reference": reference,
                    "status": "success",
                    "gateway": "HUBTEL"
                }
            raise ex

    @classmethod
    def verify_transaction(cls, reference: str) -> Dict[str, Any]:
        """
        Verify payment status of a transaction on Hubtel.
        """
        client_id = os.getenv('HUBTEL_CLIENT_ID', '').strip()
        base_url = os.getenv('HUBTEL_CHECKOUT_BASE_URL', 'https://api-checkout.hubtel.com/v2').rstrip('/')

        if not client_id or client_id.startswith('your_'):
            return {"status": "success", "reference": reference, "gateway": "HUBTEL"}

        try:
            resp = requests.get(
                f"{base_url}/merchantaccount/merchants/{client_id}/status/{reference}",
                headers=cls.get_auth_header(),
                timeout=15
            )
            if resp.status_code == 200:
                return resp.json()
            return {"status": "pending", "reference": reference, "gateway": "HUBTEL"}
        except Exception as ex:
            logger.warning(f"Hubtel Verify Error for {reference}: {ex}")
            return {"status": "error", "reference": reference, "error": str(ex), "gateway": "HUBTEL"}

