# HendAxis Trust

**HendAxis Trust** is an advanced, production-grade escrow, marketplace trust framework, and payment routing platform engineered for ultimate security and transparency. The platform sits between buyers and sellers, holding funds securely in escrow while dual-path delivery verification, a strict 4-day seller dispatch deadline, and a tiered buyer inspection period (24h to 72h) guarantee fairness before payouts are mathematically settled.

At the core of HendAxis Trust is an immutable, double-entry accounting ledger that tracks every single pesewa (GHS) through intermediate clearing accounts. This guarantees that funds can never be artificially inflated, lost, or misplaced without triggering cryptographic balance violations.

---

## 📜 Master Platform Rules & Terms of Service (Source of Truth)

### 1. Seller Authentication & `🛡️ Verified Seller` Badge Policy
- **Profile & Storefront Setup**: Sellers register and set up their store name, description, and up to **3 product categories**.
- **Manual Identity & License Verification**: Sellers submit their Ghana Card / National ID number, Ghana Card photo, and optional Business Registration license.
- **Strict Verification Rule**: The `🛡️ Verified Seller` badge is **NEVER** granted automatically based on completed transactions alone. Management MUST manually inspect and approve submitted identity documents in the Manager Portal before the badge is displayed. Unverified stores are labeled as `🆕 New Shop`.

### 2. 4-Day Seller Dispatch Deadline & Default Penalty Policy
- **Strict 4-Day (96-Hour) Dispatch Window**: Once payment is confirmed (`PAYMENT_RECEIVED`), the seller has exactly **4 days** to dispatch the order and attach tracking or bus delivery details.
- **Automated Non-Dispatch Cancellation**: If a seller fails to dispatch within 4 days, Celery Beat automatically cancels the order.
- **Buyer 100% Refund Guarantee**: The buyer receives a **100% full refund** (including all gateway charges) returned via their original payment medium so they suffer zero loss.
- **Seller Default Penalty**: The defaulting seller's internal account is charged a **Non-Dispatch Default Penalty** equal to the **Platform Fee + 1.95% Paystack processing charges**.

### 3. Payment Link Generation & Dynamic Fee Handling
- **Link Creation**: Sellers create payment links specifying price, shipping fee, description, and fee preference (`ABSORB_FEE` vs `PASS_TO_BUYER`).
- **Dynamic Fee Transparency**: Platform fees are calculated transparently in GHS and displayed in real-time.

### 4. Dual Logistics Verification Engine
- **WebP Package Evidence**: Sellers attach a WebP-optimized package/waybill photo during dispatch.
- **Path A (Formal Courier API)**: Tracking number assignment with automated webhook status updates.
- **Path B (Informal Station / Bus OTP)**: Driver phone, vehicle number, station details, and a 6-digit Secret OTP sent to the buyer. OTP verification confirms handoff.

### 5. Tiered Buyer Inspection Period & Auto-Delivery
- **Verification Trigger**: Started via Courier API webhooks, Secret Bus OTP handoff, or Buyer Receipt Confirmation.
- **Automated Delivery Escalation**: Celery tasks send SMS/Email reminders at 30h, 36h, and 42h post-dispatch. Unresponsive buyer bus orders auto-deliver at 48h.
- **Tiered Inspection Timeframes**:
  - `< GHS 2,000`: **24 Hours**
  - `GHS 2,000 – 9,999.99`: **48 Hours**
  - `>= GHS 10,000`: **72 Hours**

### 6. Dispute Resolution, 24-Hour Settlement & Manager Extra Fees
- **5-Image Evidence**: Buyers and sellers can upload up to **5 WebP evidence photos** per party.
- **Automated Review Suppression**: Raising a dispute automatically suppresses and clears any review ratings submitted for that transaction.
- **24-Hour Settlement Guarantee**: All dispute rulings execute payouts within **24 hours**:
  - **Buyer Refund**: Returned via the **same payment medium** (Paystack MoMo/Card) used during checkout.
  - **Seller Payout**: Disbursed using registered payout account details on file.
- **Dispute Fund Allocation & Manager Extra Penalty**:
  - **Incurred Shipping**: Non-refundable if item was dispatched (shipping cost incurred).
  - **Platform Retained Fee & Manager Extra Fee**: Managers can specify platform retained fees or levy extra penalty fees for damaged/incorrect items. Any unallocated split funds accrue to platform fee revenue.
- **1MB Image Compression**: Post-resolution evidence images are compressed server-side to $\le 1\text{MB}$ total per transaction.

### 7. Escrow-Gated Reviews & Trustpilot Rating System
- **Verified Buyer Reviews**: Reviews can **ONLY** be submitted by buyers who have completed an escrow purchase.
- **3-Axis Seller Rating**: Speed, Communication, and Overall Satisfaction (1 to 5 stars).
- **Public Storefronts (`/store/:username`)**: Shows seller rating breakdown, verified review history, and seller reply responses.

### 8. Public Marketplace Directory & Paid Advertised Shops (`/shops`)
- Marketplace directory with category filtering and paid shop promotion options (GHS 50 for 7 Days / GHS 150 for 30 Days).

### 9. Superuser Platform Funds & Double-Entry Ledger Audit (`/admin/dashboard`)
- Real-time double-entry account balances (System Bank Assets, Buyer Escrow Deposits, Platform Fee Revenue, Paystack Fee Expenses, Seller Wallet Liabilities).
- Comprehensive ledger filtering, date range queries, and audit trail sorting.

---

## 🏗 Architecture Overview

The repository is structured as a Monorepo:

### Backend (Django Ninja)
- **Framework**: Django 5.x + Django Ninja (FastAPI-style routing and schemas)
- **Database**: PostgreSQL / SQLite (Relational schema and double-entry ledger state)
- **Caching & Queues**: Redis & Celery (Handles 4-day dispatch expiry, 24h settlements, reminders, and auto-deliveries)
- **Authentication**: JWT (`django-ninja-jwt`)

### Frontend (React + Vite)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Views**: Seller Dashboard, Profile & Verification Setup, Public Checkout, Tracking Portal with OTP Modal, Marketplace Directory (`/shops`), Public Seller Storefronts (`/store/:username`), and Manager Operations Center.

---

## 🚀 Local Development Setup

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL 14+** or SQLite
- **Redis Server** (Running on port 6379)

### Master Test Runner
Run all automated checks and unit tests:
```powershell
python run_all_tests.py
```
Or run pytest backend suite directly:
```powershell
$env:DJANGO_SETTINGS_MODULE="hendaxis_trust.settings"; python -m pytest
```
