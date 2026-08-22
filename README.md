# HendAxis Trust

**HendAxis Trust** is an advanced, production-grade escrow, marketplace trust framework, and payment routing platform engineered for ultimate security and transparency. The platform sits between buyers and sellers, holding funds securely in escrow while dual-path delivery verification and a strict tiered buyer inspection period (24h to 72h) guarantee fairness before payouts are mathematically settled.

At the core of HendAxis Trust is an immutable, double-entry accounting ledger that tracks every single pesewa (GHS) through intermediate clearing accounts. This guarantees that funds can never be artificially inflated, lost, or misplaced without triggering cryptographic imbalances.

---

## 🔄 The Complete Escrow, Logistics & Trust Architecture

### 1. Seller Authentication & Document Verification
- **Profile & Storefront Setup**: Sellers register and set up their store name, description, and up to **3 product categories**.
- **Manual Identity & License Verification**: Sellers submit their Ghana Card / National ID number, Ghana Card photo, and optional Business Registration license.
- **Strict `🛡️ Verified Seller` Badge Policy**: The `🛡️ Verified Seller` badge is **NEVER** granted automatically based on completed transactions alone. Management MUST manually inspect and approve submitted documents in the Manager Portal before the badge is displayed across payment links, public storefronts, and directory listings. Unverified sellers are clearly marked as `🆕 New Shop`.

### 2. Payment Link Generation & Dynamic Platform Fee Calculation
- **Link Creation**: Seller creates payment links with price, shipping fee, item description, and fee preference (`ABSORB_FEE` vs `PASS_TO_BUYER`).
- **Dynamic Fee Transparency**: Platform fees are calculated transparently in GHS and displayed in real-time.

### 3. Buyer Checkout & Escrow Locking
- **Paystack Integration**: Buyers enter delivery details and pay via Paystack (Mobile Money / Card).
- **Double-Entry Escrow Ledger**: Funds are securely locked in double-entry escrow clearing accounts. Automated SMS and Email notifications (containing direct transaction action links) are sent to both parties.

### 4. Dispatch & Package Evidence
- **Optional Package Photo**: Sellers can upload a photo of the packaged item during dispatch for verification.
- **Dual Logistics Paths**:
  - **Path A (Formal Courier API)**: Tracking number assignment with automated webhook status updates.
  - **Path B (Informal Bus / Station)**: Driver phone, vehicle number, station details, and a 6-digit Secret OTP sent to the buyer.

### 5. Delivery Verification & Tiered Inspection Period
- **Verification Trigger**: Verified via Courier API webhooks, Secret Bus OTP handoff, or Buyer Receipt Confirmation.
- **Automated Delivery Escalation**: Celery tasks send SMS/Email reminders at 30h, 36h, and 42h post-dispatch. Unresponsive buyer transactions auto-deliver at 48h.
- **Tiered Inspection Timeframes**:
  - `< GHS 2,000`: **24 Hours**
  - `GHS 2,000 – 9,999.99`: **48 Hours**
  - `>= GHS 10,000`: **72 Hours**

### 6. Dispute Resolution & 5-Image Inspection
- **Dispute Uploads**: Buyers can raise disputes with a claim description and up to **5 evidence photos**.
- **Seller Counter Response**: Sellers can submit a counter response with up to **5 seller evidence photos**.
- **Manager Arbitration**: Staff/Admins inspect evidence photos in high-res lightboxes, upload manager ruling photos, and execute binding rulings (Release, Refund, or Custom Partial Split).
- **Automated Review Suppression**: Raising a dispute automatically suppresses and clears any review ratings submitted for that transaction.

### 7. Escrow-Gated Reviews & Trustpilot Rating System
- **Verified Buyer Reviews**: Reviews can **ONLY** be submitted by buyers who have completed an escrow purchase.
- **3-Axis Seller Rating**: Speed, Communication, and Overall Satisfaction (1 to 5 stars).
- **Public Storefronts (`/store/:username`)**: Shows seller rating breakdown, verified review history, and seller reply responses.

### 8. Public Marketplace Directory & Paid Advertised Shops (`/shops`)
### 9. Superuser Platform Funds & Immutable Ledger Audit (`/admin/dashboard`)
- **System-Wide Balances Overview**: Superusers and staff can view complete real-time balances across:
  - 🏦 **System Bank Asset**: Gross bank & Paystack clearing funds.
  - 🔒 **Buyer Escrow Deposit**: Funds locked in escrow for active transactions.
  - 📈 **Platform Fee Revenue**: Cumulative earned commission + paid ad promotions.
  - 💳 **Paystack Fee Expense**: Cumulative gateway fees.
  - 💼 **Seller Wallet Liabilities**: Total balances held in seller spendable wallets.
- **Granular Ledger Filtering & Sorting**:
  - Filter ledger entries by **Entry Type** (`BUYER_DEPOSIT`, `ESCROW_RELEASE`, `AD_PROMOTION_FEE`, `FULL_REFUND`, `PARTIAL_REFUND`, `WITHDRAWAL`), **Account Type** (`ASSET`, `LIABILITY`, `REVENUE`, `EXPENSE`), **Specific Account**, and **Custom Date Ranges** (`From Date` / `To Date`).
  - Search by reference UUID, account names, or type.
  - Flexible multi-column sorting (Date, Amount, Entry Type, Accounts) in ascending or descending order.

---

## 🏗 Architecture Overview

The repository is structured as a Monorepo:

### Backend (Django Ninja)
- **Framework**: Django 5.x + Django Ninja (FastAPI-style routing and schemas)
- **Database**: PostgreSQL (Relational schema and ledger state)
- **Caching & Queues**: Redis & Celery (Handles automated payouts, reminders, and auto-deliveries)
- **Authentication**: JWT (`django-ninja-jwt`)

**Core Backend Modules**:
- `apps.core`: Foundational configuration, JWT authentication, and background notification tasks.
- `apps.users`: Custom user models (`Buyer`, `Seller`, `Admin`), document verification statuses, and Role-Based Access Control (RBAC).
- `apps.ledger`: Strict double-entry ledger tracking all movements between Asset, Liability, Revenue, and Expense accounts.
- `apps.checkout`: Secure handling of Paystack checkouts and platform fee algorithms (`ABSORB_FEE` vs `PASS_TO_BUYER`).
- `apps.escrow`: Robust State Machine managing transaction lifecycles and dispute arbitration.
- `apps.delivery`: Dual-Path Logistics engine for Formal Courier API Webhooks and Informal Bus OTP handoffs.
- `apps.reviews`: Trustpilot-style seller ratings, storefront APIs, and shop promotion payments.
- `apps.wallet`: Wallet abstraction presenting ledger balances with instant MoMo/Bank payout options.
- `apps.notifications`: Centralized User notification engine and Webhook Event Audit logger.

### Frontend (React + Vite)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Views**: Seller Dashboard, Profile & Verification Setup, Public Checkout, Tracking Portal with OTP Modal, Marketplace Directory (`/shops`), Public Seller Storefronts (`/store/:username`), and Manager Operations Center.

---

## 🚀 Local Development Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **Redis Server** (Running on port 6379)

### 1. Database Setup
```sql
CREATE DATABASE hend_trust_db;
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Celery Tasks & Beat
```bash
# Terminal 1: Worker
celery -A hendaxis_trust worker -l info -P solo

# Terminal 2: Beat Scheduler
celery -A hendaxis_trust beat -l info
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security & Verification Controls
- **Manager Portal Restricted Access**: Navbar link and `/admin/dashboard` route are strictly hidden and forbidden to users who are not `is_staff` or `ADMIN`.
- **Double-Entry Accounting Guardrails**: Ledger balances must strictly equal zero (`Assets = Liabilities + Equity`).
- **Dispute Suppression**: Fake or dispute-tainted reviews are automatically purged to protect market integrity.
