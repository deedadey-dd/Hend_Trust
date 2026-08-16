import random
import uuid
import requests
from django.conf import settings
from django.core.cache import cache

class PaystackAdapter:
    BASE_URL = "https://api.paystack.co"

    @classmethod
    def initialize_transaction(cls, email: str, amount_ghs: float, reference: str):
        url = f"{cls.BASE_URL}/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.env('PAYSTACK_SECRET_KEY')}",
            "Content-Type": "application/json"
        }
        # Paystack requires amount in kobo/pesewas (multiply by 100)
        data = {
            "email": email,
            "amount": int(amount_ghs * 100),
            "reference": reference,
            "currency": "GHS"
        }
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()['data']

def generate_and_send_otp(phone_number: str) -> str:
    otp = str(random.randint(100000, 999999))
    # Cache OTP for 5 minutes (300 seconds)
    cache.set(f"otp_{phone_number}", otp, timeout=300)
    print(f"==================================================")
    msg = f"Your HendAxis Checkout OTP is {otp}. Valid for 5 minutes."
    from apps.core.tasks import dispatch_sms_task
    dispatch_sms_task.delay(phone_number, msg)
    print(f"==================================================")
    return otp

def verify_otp(phone_number: str, otp_code: str) -> bool:
    cached_otp = cache.get(f"otp_{phone_number}")
    if cached_otp and cached_otp == otp_code:
        cache.delete(f"otp_{phone_number}")
        return True
    return False
