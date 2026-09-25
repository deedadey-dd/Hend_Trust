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

- [x] **Production Monitoring & Observability Implementation (Codebase)**
  - **Details:** Integrated full observability pipeline without heavy telemetry overhead:
    - **Django Backend Sentry:** Integrated `sentry-sdk` with Django, Celery & Redis integrations, conservative 10% sampling (`SENTRY_TRACES_SAMPLE_RATE=0.1`), and PII scrubbing (`send_default_pii=False`).
    - **React Frontend Sentry:** Installed `@sentry/react`, sanitized `beforeSend` (strips auth tokens, cookies, passwords), wired into `ErrorBoundary.tsx`, and enabled source maps in `vite.config.ts`.
    - **Health Check Endpoint:** Implemented lightweight `/api/health/` and `/health/` verifying Django app availability, PostgreSQL connection (`SELECT 1`), and Redis cache connectivity (HTTP 200 on healthy, HTTP 503 on degraded).
    - **Celery Heartbeat:** Added `apps.core.tasks.celery_heartbeat_ping` running every 5 minutes on `CELERY_BEAT_SCHEDULE` and pinging `BETTERSTACK_CELERY_HEARTBEAT_URL`.
    - **Database Backup Script:** Created `scripts/backup_db.sh` to run `pg_dump`, gzip compression, prune retention, and ping `BETTERSTACK_BACKUP_HEARTBEAT_URL`.

- [ ] **Production Monitoring Dashboard Setup (Manual Actions)**
  - **Details:**
    - [ ] Create Sentry projects (`TRUST-Backend`, `TRUST-Frontend`) and populate `SENTRY_DSN` & `VITE_SENTRY_DSN` in production `.env`.
    - [ ] Configure Better Stack Uptime monitors for `https://trust.hendaxis.com` and `https://trust.hendaxis.com/api/health/`.
    - [ ] Configure Better Stack Heartbeats for Celery (5m window) and PostgreSQL Backups (24h window) and populate `BETTERSTACK_CELERY_HEARTBEAT_URL` & `BETTERSTACK_BACKUP_HEARTBEAT_URL` in `.env`.
    - [ ] Install nightly cron job on VPS: `0 2 * * * /var/www/hendaxis/Hend_Trust/scripts/backup_db.sh >> /var/log/hendaxis_backup.log 2>&1`.

