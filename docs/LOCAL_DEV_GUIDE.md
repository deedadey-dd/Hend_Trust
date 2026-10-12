# HendAxis Trust - Local Development Guide

This guide provides step-by-step instructions for running the complete HendAxis Trust platform outside of Docker on your local Windows/macOS/Linux machine. It also includes instructions for exposing your servers to your Local Area Network (LAN) so you can test on physical mobile devices.

## Prerequisites
- **Python 3.10+** (for the backend)
- **Node.js 18+** (for the frontend)
- **Redis** (running either natively via WSL, or in Docker via `docker-compose up -d redis`)
- **PostgreSQL** (running natively, or in Docker)

---

## 1. Setup & Run the Backend (Django)

1. **Navigate to the backend directory and activate your virtual environment:**
   ```bash
   cd backend
   source venv/Scripts/activate  # On Windows
   # source venv/bin/activate    # On Mac/Linux
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Django Server (LAN Accessible):**
   To make the backend accessible to other devices on your Wi-Fi network, bind it to `0.0.0.0`:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   *Note: If you only want local access, you can just run `python manage.py runserver`.*

---

## 2. Setup & Run the Frontend (React/Vite)

1. **Open a NEW terminal and navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Run the Vite Dev Server (LAN Accessible):**
   The `--host` flag exposes the frontend on your network.
   ```bash
   npm run dev -- --host 0.0.0.0
   ```
   *Vite will print out your Local IP address (e.g., `https://192.168.1.X:5173/`). Use this IP on your mobile phone browser to test the app!*

---

## 3. Run Celery Services (Background Tasks & Schedulers)

Celery requires a message broker. Ensure **Redis** is running (e.g., `sudo service redis-server start` via WSL, or `docker-compose up -d redis`).

### A. Celery Worker
The worker actually executes the tasks (like sending emails/SMS, or executing payouts).

1. **Open a NEW terminal, activate the virtual environment, and run:**
   ```bash
   cd backend
   source venv/Scripts/activate
   
   # For Windows, you MUST use the 'solo' or 'eventlet' pool:
   celery -A hendaxis_trust worker -l info -P solo
   
   # For Mac/Linux:
   # celery -A hendaxis_trust worker -l info
   ```

### B. Celery Beat (Scheduler)
The beat service triggers periodic tasks, such as checking for expired inspection periods every minute.

1. **Open a NEW terminal, activate the virtual environment, and run:**
   ```bash
   cd backend
   source venv/Scripts/activate
   celery -A hendaxis_trust beat -l info
   ```

---

## 4. Dev Testing & State Override Tools

During local testing and demoing, you can simulate state transitions without waiting for real payment webhooks, real couriers, or inspection timers:

### A. Interactive UI State Switcher (Admin Dashboard)
1. Log in as an Admin and navigate to the Manager Portal (`/admin`).
2. Click on any transaction row to open the **Transaction Deep Inspection** modal.
3. Use the **`⚡ Dev & Testing Mode: Override / Advance Status`** panel to advance the transaction to `1. Payment Received`, `2. Dispatched`, `3. Delivered (Inspection)`, or `4. Completed & Paid Out`.

### B. cURL / Postman Endpoint (`POST /api/escrow/admin/transactions/{id}/advance-status`)
```bash
curl -X POST "http://localhost:8000/api/escrow/admin/transactions/<TRANSACTION_UUID>/advance-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{"target_status": "INSPECTION_PERIOD"}'
```

### C. Webhook Simulator Endpoint (`POST /api/delivery/webhooks/courier-status`)
To simulate an incoming webhook from DHL, FedEx, Speedaf, or 17Track:
```bash
curl -X POST "http://localhost:8000/api/delivery/webhooks/courier-status" \
  -H "Content-Type: application/json" \
  -d '{"tracking_number": "DEV123456789", "status": "DELIVERED"}'
```

### D. Developer API & SDK Testing
1. Navigate to `/dashboard/developer` in the frontend to generate a Test API Key (`sk_test_...` and `pk_test_...`).
2. Test the API ping endpoint:
   ```bash
   curl -X GET "http://localhost:8000/api/v1/v1/ping" \
     -H "X-HendAxis-Secret-Key: sk_test_your_secret_key"
   ```
3. Create a test escrow order:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/v1/escrow/create" \
     -H "X-HendAxis-Secret-Key: sk_test_your_secret_key" \
     -H "Content-Type: application/json" \
     -d '{"title": "Test Laptop", "price_ghs": 2500.0, "shipping_fee_ghs": 40.0, "fee_handling": "PASS_TO_BUYER"}'
   ```
4. Run Developer API automated test suite:
   ```bash
   backend/venv/Scripts/pytest backend/apps/developer/tests/test_developer_api.py
   ```

### E. Django Database Admin Portal
The native Django backend administration interface is protected behind a secret URL defined in `.env` (`DJANGO_ADMIN_URL=hendaxis-secure-portal-9472/`).

- **Direct Dev Link**: [http://127.0.0.1:8000/hendaxis-secure-portal-9472/](http://127.0.0.1:8000/hendaxis-secure-portal-9472/)
- **Via Admin UI**: Click the **Django Database Admin ↗** button in the header bar of the Admin Dashboard (`/admin`).

---

## Summary of Running Terminals

To have the full platform running perfectly outside of Docker, you should have **4 active terminal windows**:
1. Django Server (`runserver 0.0.0.0:8000`)
2. Frontend Vite (`npm run dev -- --host`)
3. Celery Worker (`worker -l info -P solo`)
4. Celery Beat (`beat -l info`)

*If you are testing from a mobile phone on the same Wi-Fi, ensure your computer's firewall allows incoming connections on ports `8000` and `5173`.*
