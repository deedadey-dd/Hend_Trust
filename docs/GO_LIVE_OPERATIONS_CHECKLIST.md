# HendAxis Trust — Production Go-Live Operations Guide & Checklist

This document is your end-to-end operational guide for taking **HendAxis Trust** live in production. It covers payment gateways, webhooks, callback URLs, multi-gateway failover rankings, infrastructure, environment variables, and pre-flight verification.

---

## 1. Callback URL vs. Webhook URL: What's the Difference?

In your payment gateway dashboards (Paystack, Hubtel, AppsNMobile), you will see two distinct URL fields:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PAYMENT GATEWAY (e.g. PAYSTACK)                    │
├────────────────────────────────────┬────────────────────────────────────┤
│           CALLBACK URL             │            WEBHOOK URL             │
│       (Browser-to-Server)          │        (Server-to-Server)          │
│                                    │                                    │
│   Redirects the buyer's browser    │   Direct background POST request   │
│   after payment so they see a      │   carrying the cryptographic proof │
│   "Payment Successful" web page.   │   of payment (HMAC-SHA512).        │
│                                    │                                    │
│  ⚠️ Fragile: fails if user closes  │  🛡️ Bulletproof: fires even if     │
│     tab or mobile network drops.   │     buyer's phone battery dies.    │
└────────────────────────────────────┴────────────────────────────────────┘
```

### Key Differences at a Glance:

| Dimension | Callback URL | Webhook URL |
|---|---|---|
| **Who calls it?** | The buyer's web browser via HTTP 302 Redirect | The payment gateway's server via HTTP POST |
| **Trigger Timing** | Immediately when user clicks "Return to Merchant" | The exact millisecond the bank/telco settles funds |
| **Reliability** | **Medium/Low** (Buyer may close browser, battery dies, network drops) | **100% Guaranteed** (Automated retries if your server is busy) |
| **Security** | Low (Query params like `?trxref=XYZ` can be tampered with) | **Cryptographic** (`X-Paystack-Signature` HMAC hash) |
| **Purpose** | **Visual UX Only**: shows order receipt / tracking screen | **System State Machine**: locks escrow, credits ledger, alerts seller |

> [!IMPORTANT]
> **Dynamic Callback Override in HendAxis:**  
> When HendAxis Trust initializes a checkout, it dynamically injects the exact order URL as the `callback_url` (e.g. `https://trust.hendaxis.com/l/<link_id>`).  
> **Paystack automatically honors the dynamically passed callback URL** over whatever is entered in the dashboard.  
> However, **the Webhook URL MUST be explicitly configured in your dashboard**, because gateways will never guess where to deliver background server notifications.

---

## 2. Multi-Gateway Failover & Priority Ranking

HendAxis Trust supports multiple payment engines (e.g., **Paystack**, **AppsNMobile**, **Hubtel**). To maximize transaction success across Ghana (MTN MoMo, Telecel Cash, AT Money, Visa/Mastercard), gateways can be organized into a **Priority Failover Hierarchy**:

```
                       [ Buyer Clicks "Pay Now" ]
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  PRIMARY GATEWAY (Rank 1)     │  e.g., Paystack (Card + MoMo)
                   │  Lowest fee / Highest uptime  │
                   └───────────────┬───────────────┘
                                   │
                           Initiation Fails? (5xx / Timeout / Telco Down)
                                   ▼
                   ┌───────────────────────────────┐
                   │ SECONDARY GATEWAY (Rank 2)    │  e.g., AppsNMobile (Direct MoMo)
                   │ Automatic fallback attempt    │
                   └───────────────┬───────────────┘
                                   │
                           Initiation Fails?
                                   ▼
                   ┌───────────────────────────────┐
                   │  TERTIARY GATEWAY (Rank 3)    │  e.g., Hubtel (SMS + MoMo)
                   │ Last-resort fallback provider │
                   └───────────────────────────────┘
```

### Dashboard Webhook Endpoints to Register
Each payment provider needs its own dedicated webhook listener so your backend can process events regardless of which gateway the transaction traversed:

| Provider | Webhook URL to configure on Provider Dashboard | HMAC Header Checked |
|---|---|---|
| **Paystack** | `https://api.trust.hendaxis.com/api/v1/escrow/webhooks/paystack` | `X-Paystack-Signature` |
| **AppsNMobile** | `https://api.trust.hendaxis.com/api/v1/escrow/webhooks/appsnmobile` | Provider Secret Token / HMAC |
| **Hubtel** | `https://api.trust.hendaxis.com/api/v1/escrow/webhooks/hubtel` | Basic Auth / Signature Header |

---

## 3. Pre-Flight Go-Live Master Checklist

### Phase 1: Payment Gateway Accounts & Live Keys
- [ ] **Switch from Test to Live Mode** on Paystack:
  - Copy Live Public Key from Paystack Dashboard
  - Copy Live Secret Key from Paystack Dashboard
- [ ] **Configure Paystack Webhook URL**:
  - URL: `https://api.trust.hendaxis.com/api/v1/escrow/webhooks/paystack`
- [ ] **Configure Paystack Callback URL** (Default Fallback):
  - URL: `https://trust.hendaxis.com/tracking`
- [ ] **Enable Transfer / Payout Permissions**:
  - Enable Transfers on Paystack dashboard so instant seller wallet payouts work.
  - Set up Two-Factor Authentication (2FA) or IP Whitelisting for Paystack API transfers.
- [ ] **Register Secondary / Tertiary Gateways** (AppsNMobile, Hubtel):
  - Verify MoMo collection merchant IDs and API keys.
  - Set respective Webhook URLs on their merchant portals.

---

### Phase 2: Environment Variables (`.env`)
Make sure your production `.env` contains live credentials:

```bash
# ─── Django Core ──────────────────────────────────────────────────────────────
DEBUG=False
SECRET_KEY="<generate-a-strong-random-64-char-string>"
ALLOWED_HOSTS="trust.hendaxis.com,api.trust.hendaxis.com"
FRONTEND_URL="https://trust.hendaxis.com"
DJANGO_ADMIN_URL="secure-hend-portal-9472/" # Obfuscated admin path (default honeypot trap active on /admin/)

# ─── Database & Cache ─────────────────────────────────────────────────────────
DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:5432/<db_name>"
DATABASE_CONN_MAX_AGE=60
REDIS_URL="redis://:<redis_password>@<redis_host>:6379/0"

# ─── Payment Gateway Live Credentials ─────────────────────────────────────────
PAYSTACK_PUBLIC_KEY="<your_paystack_live_public_key>"
PAYSTACK_SECRET_KEY="<your_paystack_live_secret_key>"
APPSNMOBILE_API_KEY=""
APPSNMOBILE_MERCHANT_ID=""
HUBTEL_CLIENT_ID=""
HUBTEL_CLIENT_SECRET=""

# ─── Email & SMS ──────────────────────────────────────────────────────────────
DEFAULT_FROM_EMAIL="HendAxis Trust <noreply@hendaxis.com>"
EMAIL_HOST="smtp.example.com"
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER="<smtp_user>"
EMAIL_HOST_PASSWORD="<smtp_password>"
ARKESEL_API_KEY="<your_arkesel_sms_key>"
ARKESEL_SENDER_ID="HendAxis"

# ─── Sentry Error Monitoring ──────────────────────────────────────────────────
SENTRY_DSN="<your_sentry_dsn_url>"
SENTRY_ENVIRONMENT="production"
```

---

### Phase 3: Infrastructure, Workers & Background Tasks
- [ ] **Database Connection Pooling**:
  - `conn_max_age=60` and `conn_health_checks=True` are configured in `settings.py`.
- [ ] **Web Server (Gunicorn / Uvicorn)**:
  - Run with at least 3–4 workers: `gunicorn hendaxis_trust.wsgi:application --workers 4 --bind 0.0.0.0:8000`.
- [ ] **Celery Worker**:
  - Must run continuously in the background to handle emails, SMS, and asynchronous notifications:
    ```bash
    celery -A hendaxis_trust worker --loglevel=INFO --concurrency=4
    ```
- [ ] **Celery Beat (Scheduler)**:
  - Must run continuously to evaluate automatic delivery confirmations, dispatch timeout cancellations, and inspection period completions:
    ```bash
    celery -A hendaxis_trust beat --loglevel=INFO
    ```
- [ ] **Systemd / Supervisor / Docker Compose**:
  - Ensure processes restart automatically on crash or server reboot.

---

### Phase 4: Domain, HTTPS & Security Headers
- [ ] **DNS Records**:
  - `A` / `CNAME` records pointing to your server / load balancer.
- [ ] **SSL / TLS Certificate**:
  - Valid Let's Encrypt / Cloudflare certificate with automatic renewal.
- [ ] **Security Settings Verified in `settings.py`**:
  - `SECURE_SSL_REDIRECT = True`
  - `SESSION_COOKIE_SECURE = True`
  - `SECURE_HSTS_SECONDS = 31536000`
  - `SECURE_HSTS_PRELOAD = True`
  - `SECURE_CONTENT_TYPE_NOSNIFF = True`
- [ ] **Honeypot Trap Verification**:
  - Navigating to `/admin/` displays the decoy honeypot trap, while your real administration portal lives at `DJANGO_ADMIN_URL`.

---

### Phase 5: The "1 GHS" Live Pre-Flight Test
Before announcing the platform to public merchants, run a full live transaction end-to-end:

1. **Create Link**: As a seller, generate a payment link for **GH₵ 1.00**.
2. **Pay with MoMo**: As a buyer (using a real phone), approve the payment on MTN or Telecel.
3. **Inspect Webhook**: Verify that Paystack’s webhook fires, hits `/api/v1/escrow/webhooks/paystack`, and returns `HTTP 200`.
4. **Inspect State**: Verify the transaction updates from `AWAITING_PAYMENT` to `PAYMENT_RECEIVED`.
5. **Dispatch & Deliver**:
   - Seller clicks "Dispatch Order".
   - Buyer enters OTP code or clicks "Approve & Release".
6. **Verify Payout**: Verify that the GH₵ 1.00 is credited to the seller's wallet balance or transferred to their MoMo account via Paystack Transfer.
