import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class MNotifyService:
    BASE_URL = "https://api.mnotify.com/api/sms/quick"

    @classmethod
    def send_sms(cls, phone: str, message: str) -> bool:
        """
        Sends an SMS using the mNotify Quick API.
        Returns True if successful, False otherwise.
        """
        from hendaxis_trust.settings import env
        api_key = env('SMS_GATEWAY_API_KEY', default='test_key')
        sender_id = env('SMS_SENDER_ID', default='mNotify')
        
        # During local dev if no key is set or DEBUG is True, we simulate success and print to console
        if getattr(settings, 'DEBUG', False) or api_key == 'test_key':
            print("\n" + "="*60, flush=True)
            print("📱 SIMULATED MNOTIFY SMS (DEV MODE)", flush=True)
            print(f"To: {phone}", flush=True)
            print(f"Message: {message}", flush=True)
            print("="*60 + "\n", flush=True)
            logger.info(f"[SIMULATED MNOTIFY] To: {phone} | Msg: {message}")
            return True

        url = f"{cls.BASE_URL}?key={api_key}"
        
        # Format Ghanaian phone numbers for MNotify (0241234567 -> 233241234567)
        clean_phone = phone.strip().replace(' ', '').replace('+', '')
        if clean_phone.startswith('0') and len(clean_phone) == 10:
            clean_phone = '233' + clean_phone[1:]

        payload = {
            'recipient': [clean_phone],
            'sender': sender_id,
            'message': message,
            'is_schedule': False,
            'schedule_date': ''
        }
        
        try:
            response = requests.post(url, json=payload, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            if data.get('status') == 'success':
                return True
            else:
                logger.error(f"mNotify API Error: {data}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"mNotify Network Error: {str(e)}")
            return False
