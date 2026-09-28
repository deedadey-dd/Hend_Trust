# HendAxis Trust — Product Requirement Document (PRD) & Technical Specification
**Project Name:** HendAxis Trust — Online Escrow & Payment Link Platform  
**Target Architecture:** Monorepo (Django Ninja API + React/Vite Frontend, Tailwind v3.4)  
**Document Version:** 2.4 (Production MVP & Implementation Spec)  

---

## 1. Technical Stack Architecture

| Layer | Selected Technology | Notes / Implementation Strategy |
| :--- | :--- | :--- |
| **Monorepo Structure** | Unified Repository | Shared scripts, standard directory split (`/backend`, `src`, `/e2e`). |
| **Backend Framework** | Django + Django Ninja | High-performance async/sync REST API with native Pydantic validation & OpenAPI auto-docs. |
| **Frontend Framework** | React (Vite) + Tailwind v3.4 | Single Page Application (SPA), fast client rendering, responsive UI components styled with Tailwind v3.4 and `react-router-dom`. |
| **Database & IDs** | PostgreSQL + UUIDv7 (`uuid6`) | Relational, ACID compliant; UUIDv7 primary keys for time-sortable, secure transaction identifiers. |
| **Task Queue & Timers** | Celery + Redis | Handles background auto-release engine, 24h warning notifications, and payment webhooks. |
| **Primary Payment Gateway** | Paystack API | Live integration via `.env` credentials using an Interface Adapter pattern. |
| **SMS Notifications** | mNotify (BMS Africa) / Terminal Mock | MVP uses terminal console logging for OTP generation, designed for seamless replacement via the `MNotifyService` utility wrapper. |
| **Testing Suite** | Pytest & Freezegun | Automated testing for double-entry ledger mechanics, OTP states, and 24h time-travel validation safeguards. |

---

## 2. Core Module Requirements & Specifications

### Module 1: Core Business Model & Fee Engine
1. **Fee Calculation:**
   * Default Base Fee: **1.5% + GHS 10.00**[cite: 1].
2. **Fee Split Execution:**
   * Handling choice configured per link: `ABSORB_FEE` (seller pays) or `PASS_TO_BUYER` (buyer pays)[cite: 1].
3. **Payment Gateway Pass-Through:** Processing fees charged by payment providers are handled securely via transaction totals[cite: 1].

### Module 2: Seller Payment Links & Dual-Flow Checkout
1. **Single-Use Links (`links` app):** 
   * Bound to a single payment link ID (`/l/{linkId}`). Automatically transitions state once processed.
2. **Dual-Flow Buyer Checkout & 0-OTP Frictionless Experience (`checkout` app):**
   * **Authenticated Buyers (1-Click Init, 0 SMS OTPs)**: System auto-populates buyer name, phone, and email, initializing checkout with Paystack without triggering an SMS OTP modal.
   * **Guest Buyers (SMS OTP Fallback)**: Mandatory SMS phone OTP verification for unauthenticated checkout sessions.
   * **Post-Checkout Buyer Registration & Dual Verification**: On `/l/{linkId}`, guest buyers can set a password in 10 seconds. The system immediately sends an account activation link to their email and an SMS OTP to their phone. Entering the phone OTP verifies their phone and logs them in via HTTP-only JWT cookies, while an unobtrusive header banner prompts email activation with 1-click resend, skipping all future checkout SMS OTPs.
3. **Paystack Integration:** 
   * Backend initializes real Paystack transaction references to handle redirection.

### Module 3: Transaction State Machine & Workflow Rules
1. **Core State Sequence (`escrow` app):**
   $$\text{AWAITING\_PAYMENT} \rightarrow \text{PAYMENT\_RECEIVED} \rightarrow \text{DELIVERY\_IN\_PROGRESS} \rightarrow \text{INSPECTION\_PERIOD} \rightarrow \text{COMPLETED} / \text{DISPUTED}$$
2. **1-Click Delivery Confirmation & Payout Release:**
   * Authenticated buyers can confirm package receipt and approve escrow payout release to the seller in 1 click (`POST /api/v1/escrow/{id}/buyer-confirm-receipt` and `POST /api/v1/escrow/{id}/approve-and-release`) without entering SMS codes.
   * Guest buyers confirm receipt via 6-digit confirmation codes.
3. **Seller Dispatch & Safeguards (`delivery` app):**
   * Sellers have a platform-configured dispatch window (default: 4 days / 96 hours) with progressive pre-expiry SMS/email alerts at 24h and 6h.
   * Defaulting sellers are charged a Non-Dispatch Default Penalty (Platform Fee + 1.95% Gateway Fee) and the buyer receives a 100% full refund.

### Module 4: Dual-Path Logistics Engine
1. **Path A (Formal Courier API):**
   * Seller inputs courier name and tracking number (`POST /api/v1/delivery/dispatch-courier`).
   * Unauthenticated webhook listener (`POST /api/v1/webhooks/courier-status`) triggers the inspection countdown upon a `DELIVERED` status event.
2. **Path B (Informal Bus Transport & Waybill OTP):**
   * Seller inputs bus station details, driver phone, and waybill info (`POST /api/v1/delivery/dispatch-waybill`).
   * System generates a secret `delivery_release_otp` stored in Redis. Buyer verifies this code upon pickup to unlock the inspection window.

### Module 5: Financial Architecture & Ledger
1. **Double-Entry Ledger:** 
   * Atomic accounting transactions ensuring exact matching credits and debits to prevent race conditions or ledger drift.
2. **Payouts:** 
   * Default Direct Auto-Payout via Mobile Money (MoMo) / Bank accounts, or opt-in Seller Wallet balances.

### Module 6: Static Route SEO Pre-Rendering & Dynamic Multi-Role Navigation
1. **Static HTML Multi-Route Pre-Rendering (`scripts/generate-routes-seo.mjs`):**
   * Pre-renders 12 public routes (`/`, `/for-buyers`, `/for-sellers`, `/how-it-works`, `/trust-center`, `/guides`, `/referrals`, `/developers`, `/help`, `/contact`, `/shops`, `/reviews`) into dedicated static HTML files with distinct `<title>`, meta descriptions, canonical URLs, and Schema.org JSON-LD structured data.
2. **Role-Adaptive Navigation:**
   * Desktop and mobile navigation dynamically adapts to `role: 'BUYER'` (My Purchases, Verified Shops, Track Order) vs `role: 'SELLER'` (Dashboard, Create Link, My Links, Shops, Wallet Ledger) vs `ADMIN`.

---

## 3. Production Readiness Tracking (`PRODUCTION_TODO.md`)
Temporary development shortcuts are tracked via `PRODUCTION_TODO.md` at the monorepo root prior to full production deployment to `trust.hendaxis.com`:
1. **SMS Integration:** Swap terminal console OTP logging for live calls via `MNotifyService`.
2. **Webhooks & Security:** Implement strict HMAC / header signature verification for Paystack and courier status webhooks.
3. **Environment Hardening:** Audit environment configs to ensure `DEBUG=False` and strict CORS policies.