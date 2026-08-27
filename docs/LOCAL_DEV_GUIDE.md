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

---

## Summary of Running Terminals

To have the full platform running perfectly outside of Docker, you should have **4 active terminal windows**:
1. Django Server (`runserver 0.0.0.0:8000`)
2. Frontend Vite (`npm run dev -- --host`)
3. Celery Worker (`worker -l info -P solo`)
4. Celery Beat (`beat -l info`)

*If you are testing from a mobile phone on the same Wi-Fi, ensure your computer's firewall allows incoming connections on ports `8000` and `5173`.*
