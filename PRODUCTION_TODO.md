# Production Readiness Checklist

This document tracks all temporary development shortcuts, mock implementations, and configuration changes that **MUST** be resolved before launching HendAxis Trust to production.

## Outstanding Tasks

- [x] **SMS OTP Integration**
  - **Details:** Replace terminal console logging for OTPs with a production SMS gateway for both the guest checkout and delivery release codes.
  - **Provider:** Integrate with the mnotify bulk SMS service (API Docs: [https://developer.bms.africa/#tag/SMS](https://developer.bms.africa/#tag/SMS)).

- [x] **Paystack Live Keys & Webhook Signatures**
  - **Details:** Switch Paystack API from test mode to live mode. Implement cryptographic signature verification for Paystack webhooks to prevent spoofing of payment confirmation events.

- [x] **Webhook Authentication (Logistics)**
  - **Details:** Secure `POST /api/v1/webhooks/courier-status`. Currently it is unauthenticated for MVP development. Must be updated to validate signature headers or secret tokens provided by the official courier partners.

- [ ] **Environment Security**
  - **Details:** Audit all `.env` variables across the monorepo.
    - Ensure `DEBUG=False` in Django `settings.py`.
    - Generate strong, cryptographically secure unique secrets (Django `SECRET_KEY`, JWT keys).
    - Apply proper CORS settings to strictly restrict origins to `*.hendaxis.com`.

- [ ] **Courier API Integration**
  - **Details:** Wire in real courier APIs (DHL, FedEx, etc.) for automated delivery status updates.
  - **Implementation:** Update the `_check_courier_api_status()` stub function in `backend/apps/escrow/api.py` to route real API calls based on `delivery_log.courier_name`.
