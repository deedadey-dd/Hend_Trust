# HendAxis Trust

**HendAxis Trust** is an advanced, production-grade escrow and payment routing platform engineered for ultimate security and transparency. The platform sits between buyers and sellers, holding funds securely in escrow while dual-path delivery verification and a strict tiered buyer inspection period (24h to 72h) guarantee fairness before payouts are mathematically settled.

At the core of HendAxis Trust is an immutable, double-entry accounting ledger that tracks every single pesewa (GHS) through intermediate clearing accounts. This guarantees that funds can never be artificially inflated, lost, or misplaced without triggering cryptographic imbalances.

---

## 🔄 The 8-Step Escrow & Logistics Lifecycle

1. **Seller Authentication & Setup**: Seller registers, logs in, and manages their store profile.
2. **Payment Link Generation**: Seller creates a payment link specifying item title, description, price, shipping fee, and fee handling (`ABSORB_FEE` vs `PASS_TO_BUYER`).
3. **Link Distribution**: Seller shares the unique URL with the buyer.
4. **Buyer Checkout & Payment**: Buyer enters shipping details and pays via Paystack (Mobile Money / Card). Money is locked in double-entry escrow clearing accounts. **Automated SMS + Email notifications** are dispatched to both buyer and seller.
5. **Dispatch & Dual-Path Shipping**:
   - **Path A (Courier API)**: Seller dispatches via integrated courier with tracking number. SMS/Email notification sent to buyer with tracking details.
   - **Path B (Informal Bus / Terminal)**: Seller enters driver phone, vehicle number, and destination station. System dispatches **SMS + Email** to buyer with driver details and a Secret 6-Digit OTP.
6. **Delivery Verification & Inspection Start**:
   - **Courier**: Verified automatically via Courier API webhook or seller 36h force-delivered check.
   - **Informal Bus**: Verified when Buyer confirms receipt on tracking page OR Seller enters buyer's Secret OTP under "Verify Delivery OTP".
   - **Unresponsive Buyer Auto-Delivery**: Automated Celery task sends SMS/Email reminders at 30h, 36h, and 42h post-dispatch. At 48h, the transaction is automatically marked as Delivered, starting the inspection period and notifying the buyer.
7. **Tiered Inspection Period & Release**:
   - `< GHS 2,000`: **24 Hours**
   - `GHS 2,000 – 9,999.99`: **48 Hours**
   - `>= GHS 10,000`: **72 Hours**
   - Upon timer expiry (or manual buyer confirmation), funds are released from escrow to the seller's wallet via double-entry ledger settlement. **SMS + Email notifications** are sent to seller (funds credited) and buyer (transaction completed).
8. **Dispute Resolution & Penalties**: If a buyer disputes within the inspection window, payouts freeze instantly. Platform Admins review evidence and can either release funds to the seller or trigger a 100% full refund to the buyer (charging platform/payout fees to the defaulting seller's internal account).

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
- `apps.users`: Custom user models (`Buyer`, `Seller`, `Admin`) and Role-Based Access Control (RBAC).
- `apps.ledger`: Strict double-entry ledger tracking all movements between Asset, Liability, Revenue, and Expense accounts.
- `apps.checkout`: Secure handling of Paystack checkouts and platform fee algorithms (`ABSORB_FEE` vs `PASS_TO_BUYER`).
- `apps.escrow`: The robust State Machine that transitions transactions from `AWAITING_PAYMENT` -> `DELIVERY_IN_PROGRESS` -> `INSPECTION_PERIOD` -> `COMPLETED`/`DISPUTED`/`REFUNDED`.
- `apps.delivery`: Dual-Path Logistics engine for Formal Courier API Webhooks and Informal Station (Bus OTP) SMS handoffs.
- `apps.wallet`: Abstraction layer presenting ledger balances to sellers as spendable wallet balances with instant withdrawal options.
- `apps.notifications`: Centralized User notification engine and Webhook Event Audit logger.

### Frontend (React + Vite)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Views**: Seller Dashboard, Public Checkout, Tracking Portal, Admin Operations

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

### 2. Backend Installation
```bash
cd backend
python -m venv venv

# Activate Virtual Environment (Windows)
.\venv\Scripts\activate
# Activate Virtual Environment (Mac/Linux)
# source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Variables
Create `.env` in `backend/`:
```env
DEBUG=True
SECRET_KEY=your-super-secret-django-key
DATABASE_URL=postgres://user:password@localhost:5432/hend_trust_db
REDIS_URL=redis://localhost:6379/0
PAYSTACK_SECRET_KEY=sk_test_your_paystack_key
```

### 4. Migrations & Initial Setup
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 5. Running Backend & Celery
**Terminal 1 (Django API):**
```bash
cd backend
.\venv\Scripts\activate
python manage.py runserver
```

**Terminal 2 (Celery Worker):**
```bash
cd backend
.\venv\Scripts\activate
celery -A hendaxis_trust worker --pool=solo -l info
```

**Terminal 3 (Celery Beat for Reminders/Auto-Deliveries):**
```bash
cd backend
.\venv\Scripts\activate
celery -A hendaxis_trust beat -l info
```

### 6. Frontend Installation
```bash
cd frontend
npm install
npm run dev
```

React App: `http://localhost:5173/`  
Swagger API Docs: `http://127.0.0.1:8000/api/docs/`

---

## 🔒 Ledger Integrity & Fee Handling
1. **ABSORB_FEE**: Seller absorbs fee (1.5% + GHS 10). Buyer pays item price + shipping.
2. **PASS_TO_BUYER**: Buyer pays item price + shipping + platform fee. Seller receives full item price + shipping fee.

**Double-Entry Accounting Example (GHS 100 payment)**:
- Payment: `Debit` SYSTEM_BANK_ASSET (GHS 100.00) / `Credit` BUYER_ESCROW_DEPOSIT (GHS 100.00)
- Completion: `Debit` BUYER_ESCROW_DEPOSIT (GHS 100.00) / `Credit` PLATFORM_FEE_REVENUE (GHS 11.50) / `Credit` SELLER_INTERNAL_WALLET (GHS 88.50)

The mathematical sum of the ledger always equals zero and perfectly matches bank balances.
