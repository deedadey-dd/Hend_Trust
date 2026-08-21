import random
import uuid
import requests
from django.conf import settings
from django.core.cache import cache

class PaystackAdapter:
    BASE_URL = "https://api.paystack.co"

    @classmethod
    def initialize_transaction(cls, email: str, amount_ghs: float, reference: str, callback_url: str = None):
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
            
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()['data']

    @classmethod
    def verify_transaction(cls, reference: str):
        url = f"{cls.BASE_URL}/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()['data']

def generate_and_send_otp(phone_number: str) -> str:
    # Only generate a new OTP if there isn't a valid one already cached
    existing_otp = cache.get(f"otp_{phone_number}")
    if existing_otp:
        print(f"==================================================")
        print(f"DEV: OTP for {phone_number} already active (not resent).")
        print(f"==================================================")
        return existing_otp
    
    otp = str(random.randint(100000, 999999))
    # Cache OTP for 5 minutes (300 seconds)
    cache.set(f"otp_{phone_number}", otp, timeout=300)
    print(f"==================================================")
    print(f"DEV OTP FOR {phone_number}: {otp}")
    print(f"==================================================")
    msg = f"Your HendAxis Trust Checkout OTP is {otp}. Valid for 5 minutes."
    from apps.core.tasks import dispatch_sms_task
    dispatch_sms_task.delay(phone_number, msg)
    return otp

def generate_and_send_email_otp(email: str) -> str:
    existing_otp = cache.get(f"otp_{email}")
    if existing_otp:
        return existing_otp
    
    otp = str(random.randint(100000, 999999))
    cache.set(f"otp_{email}", otp, timeout=300)
    print(f"==================================================")
    print(f"DEV EMAIL OTP FOR {email}: {otp}")
    print(f"==================================================")
    msg = f"Your HendAxis Trust Tracking OTP is {otp}. Valid for 5 minutes."
    from apps.core.tasks import dispatch_email_task
    dispatch_email_task.delay("HendAxis Trust - Tracking OTP", msg, email)
    return otp

def verify_otp(identifier: str, otp_code: str) -> bool:
    cached_otp = cache.get(f"otp_{identifier}")
    if cached_otp and cached_otp == str(otp_code):
        # We can optionally delete the OTP here if we want single-use, 
        # but the prompt asked for reusable OTPs for a period.
        return True
    return False
