# HendAxis Trust

**HendAxis Trust** is an advanced, production-grade escrow and payment routing platform engineered for ultimate security and transparency. The platform sits between buyers and sellers, holding funds securely in escrow while dual-path delivery verification and a strict 48-hour buyer inspection period guarantee fairness before payouts are mathematically settled.

At the core of HendAxis Trust is an immutable, double-entry accounting ledger that tracks every single pesewa (GHS) through intermediate clearing accounts. This guarantees that funds can never be artificially inflated, lost, or misplaced without triggering cryptographic imbalances.

## 🏗 Architecture Overview

The repository is structured as a Monorepo:

### Backend (Django Ninja)
- **Framework**: Django 5.x + Django Ninja (FastAPI-style routing and schemas)
- **Database**: PostgreSQL (Relational schema and ledger state)
- **Caching & Queues**: Redis & Celery (Handles automated payouts and delayed tasks)
- **Authentication**: JWT (`django-ninja-jwt`)

**Core Backend Modules**:
- `apps.core`: Foundational configuration, JWT authentication, and admin permissions.
- `apps.users`: Custom user models (`Buyer`, `Seller`, `Admin`) and Role-Based Access Control (RBAC).
- `apps.ledger`: The heart of the platform. A strict double-entry ledger that tracks all movements between Asset, Liability, Revenue, and Expense accounts.
- `apps.checkout`: Secure handling of Paystack checkouts and platform fee algorithms (`ABSORB_FEE` vs `PASS_TO_BUYER`).
- `apps.escrow`: The robust State Machine that transitions transactions from `AWAITING_PAYMENT` -> `DELIVERY_IN_PROGRESS` -> `INSPECTION_PERIOD` -> `COMPLETED`/`DISPUTED`/`REFUNDED`.
- `apps.delivery`: The Dual-Path Logistics engine, allowing seamless transitions via Formal Courier API Webhooks or Informal Station (Bus OTP) SMS handoffs.
- `apps.wallet`: Abstraction layer presenting ledger balances to sellers as spendable wallet balances, enabling secure withdrawal flows.
- `apps.notifications`: Centralized User notification engine and Webhook Event Audit logger for tracking all incoming system triggers.

### Frontend (React + Vite)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State**: React Query / Context API (Implementation pending)

---

## 🚀 Local Development Setup

Follow these instructions to spin up the full HendAxis Trust environment locally.

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL 14+**
- **Redis Server** (Ensure it is running locally on port 6379)

### 1. Database Setup
Ensure PostgreSQL is running and create a database named `hend_trust_db`:
```sql
CREATE DATABASE hend_trust_db;
```

### 2. Backend Installation
Open a terminal and navigate to the `backend` directory:
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
Create a `.env` file in the `backend` folder (you can copy `.env.example` if available). 
Required values:
```env
DEBUG=True
SECRET_KEY=your-super-secret-django-key
DATABASE_URL=postgres://user:password@localhost:5432/hend_trust_db
REDIS_URL=redis://localhost:6379/0
PAYSTACK_SECRET_KEY=sk_test_your_paystack_key
```

### 4. Migrations & Initial Setup
Apply all database migrations and create your superuser:
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 5. Running the Backend Servers
You need to run both the Django API server and the Celery background worker.

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
*(Note: `--pool=solo` is recommended for Windows environments. On Mac/Linux, you can omit it).*

### 6. Frontend Installation
Open a new terminal and navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm run dev
```

The React application will be available at `http://localhost:5173/`, and the API documentation (Swagger) is available at `http://127.0.0.1:8000/api/docs/`.

---

## 🔒 Ledger Integrity & Fee Handling
The system handles fees in two configurable modes when a payment link is created:
1. **ABSORB_FEE**: The seller absorbs the platform fee (1.5% + GHS 10.00). The buyer pays exactly the item price.
2. **PASS_TO_BUYER**: The buyer pays the item price + the platform fee. The seller receives exactly the item price.

Every movement uses **Double-Entry Accounting**. For example, when a buyer pays GHS 100 via Paystack:
- `Debit`: SYSTEM_BANK_ASSET (GHS 100.00)
- `Credit`: BUYER_ESCROW_DEPOSIT (GHS 100.00)

If the transaction is successfully completed:
- `Debit`: BUYER_ESCROW_DEPOSIT (GHS 100.00)
- `Credit`: PLATFORM_FEE_REVENUE (GHS 11.50)
- `Credit`: SELLER_INTERNAL_WALLET (GHS 88.50)

This strict architecture guarantees that the mathematical sum of the ledger always balances and perfectly tracks actual cash held in the platform's bank accounts.
