# HendAxis Trust - Production Deployment Guide

This guide provides end-to-end procedures for deploying **HendAxis Trust** to production across two architecture options:
1. **Hetzner VPS Deployment (Self-Hosted / High Performance & Budget Friendly)**
2. **Free-Tier Managed Cloud Services (Serverless / PaaS)**

---

# Part 1: Hetzner VPS Production Deployment (Self-Hosted)

Self-hosting on a Hetzner Virtual Private Server (VPS) is the most cost-effective and scalable option for HendAxis Trust, providing full control, dedicated CPU/RAM, low latency, and zero artificial request limits.

## 1. Recommended Hetzner VPS Hardware Specifications

| Server Plan | Specs (vCPU / RAM / Disk) | Approx. Cost | Ideal For |
| :--- | :--- | :--- | :--- |
| **Hetzner CAX11** (ARM64) | **2 vCPU**, **4 GB RAM**, **40 GB NVMe** | **~€3.79 / mo** | Starter Production (When in stock) |
| **Hetzner CAX21** (ARM64) | **4 vCPU**, **8 GB RAM**, **80 GB NVMe** | **~€7.19 / mo** | High-performance ARM scaling |
| **Hetzner CX22** (x86 Intel) | **2 vCPU**, **4 GB RAM**, **40 GB SSD** | **~€4.50 / mo** | Starter x86 Alternative |
| **Hetzner CX33** (x86 Shared) | **4 vCPU**, **8 GB RAM**, **80 GB NVMe** | **~€10.90 / mo** | **Recommended Immediate Production Option** (100% In Stock) |

> **Recommendation**: If ARM servers (CAX11/CAX21) are out of stock, **Hetzner CX33 (4 vCPU / 8 GB RAM / 80 GB NVMe)** is the **best immediate choice**. It provides identical 4-vCPU & 8GB RAM headroom for PostgreSQL, Redis, Celery, and Gunicorn on Ubuntu 24.04 LTS.

---

## 2. Server Prerequisites & Initial Security Setup

### A. Server Access & System Updates
```bash
# Connect to server via SSH
ssh root@YOUR_HETZNER_SERVER_IP

# Update system packages
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban nginx certbot python3-certbot-nginx postgresql postgresql-contrib redis-server python3-pip python3-venv build-essential libpq-dev nodejs npm
```

### B. Configure Firewall (UFW)
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 3. Database & Redis Configuration

### A. Configure PostgreSQL
```bash
sudo -u postgres psql

# Inside PostgreSQL prompt:
CREATE DATABASE hendaxis_trust_db;
CREATE USER hendaxis_user WITH PASSWORD 'STRONG_PRODUCTION_DB_PASSWORD';
ALTER ROLE hendaxis_user SET client_encoding TO 'utf8';
ALTER ROLE hendaxis_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE hendaxis_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE hendaxis_trust_db TO hendaxis_user;
\q
```

### B. Verify Redis Server
```bash
systemctl status redis-server
systemctl enable redis-server
```

---

## 4. Deploying the Backend (Django + Gunicorn + Celery)

### A. Clone Repository & Setup Virtual Environment
```bash
mkdir -p /var/www/hendaxis
cd /var/www/hendaxis
git clone https://github.com/YOUR_REPO/Hend_Trust.git .

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt gunicorn
```

### B. Environment Variables (`/var/www/hendaxis/backend/.env`)
Create `/var/www/hendaxis/backend/.env`:
```env
DEBUG=False
SECRET_KEY=YOUR_RARE_50_CHAR_PRODUCTION_SECRET_KEY
ALLOWED_HOSTS=api.yourdomain.com,yourdomain.com,YOUR_HETZNER_SERVER_IP

DATABASE_URL=postgres://hendaxis_user:STRONG_PRODUCTION_DB_PASSWORD@localhost:5432/hendaxis_trust_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=YOUR_SECURE_JWT_SECRET

# Gateway Credentials
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# SMS & Storage
SMS_GATEWAY_API_KEY=POymumfZk1mkHuGrQk5f3nYg6
SMS_SENDER_ID=HENDAXIS

# Courier Tracking
17TRACK_API_KEY=your_production_17track_key
COURIER_WEBHOOK_SECRET=your_production_webhook_secret
```

### C. Run Database Migrations & Collect Static Files
```bash
cd /var/www/hendaxis/backend
source /var/www/hendaxis/venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

---

## 5. Systemd Process Services (Gunicorn, Celery Worker, Celery Beat)

### Service 1: Gunicorn WSGI Server (`/etc/systemd/system/hendaxis-backend.service`)
```ini
[Unit]
Description=HendAxis Trust Gunicorn Daemon (High-Concurrency gthread)
After=network.target postgresql.service redis.service

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/hendaxis/backend
ExecStart=/var/www/hendaxis/venv/bin/gunicorn --worker-class gthread --workers 5 --threads 8 --worker-connections 1000 --max-requests 5000 --max-requests-jitter 500 --bind 127.0.0.1:8000 hendaxis_trust.wsgi:application
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### Service 2: Celery Worker (`/etc/systemd/system/hendaxis-celery-worker.service`)
```ini
[Unit]
Description=HendAxis Trust Celery Worker Service
After=network.target redis.service

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/hendaxis/backend
ExecStart=/var/www/hendaxis/venv/bin/celery -A hendaxis_trust worker -l info
Restart=always

[Install]
WantedBy=multi-user.target
```

### Service 3: Celery Beat Scheduler (`/etc/systemd/system/hendaxis-celery-beat.service`)
```ini
[Unit]
Description=HendAxis Trust Celery Beat Scheduler
After=network.target redis.service

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/hendaxis/backend
ExecStart=/var/www/hendaxis/venv/bin/celery -A hendaxis_trust beat -l info
Restart=always

[Install]
WantedBy=multi-user.target
```

### Enable & Start Services:
```bash
systemctl daemon-reload
systemctl enable --now hendaxis-backend hendaxis-celery-worker hendaxis-celery-beat
```

---

## 6. Build Frontend & Setup Nginx Reverse Proxy

### A. Build Frontend Static Bundle
```bash
cd /var/www/hendaxis/frontend
npm install
npm run build
# The compiled production build will be in /var/www/hendaxis/frontend/dist
```

### B. Configure Nginx (`/etc/nginx/sites-available/hendaxis`)
```nginx
upstream hendaxis_backend {
    server 127.0.0.1:8000;
    keepalive 64;
}

server {
    server_name trust.hendaxis.com pay.hendaxis.com api.hendaxis.com;

    # Frontend Assets
    location / {
        root /var/www/hendaxis/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend Django Static Files
    location /static/ {
        alias /var/www/hendaxis/backend/static/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API Proxy to Gunicorn with HTTP/1.1 Keepalive
    location /api/ {
        proxy_pass http://hendaxis_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Django Native Admin Proxy to Gunicorn
    location /django-admin/ {
        proxy_pass http://hendaxis_backend/admin/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 20M;
}
```

Enable site & test configuration:
```bash
ln -s /etc/nginx/sites-available/hendaxis /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### C. Issue Free SSL HTTPS Certificate (Certbot)
```bash
certbot --nginx -d trust.hendaxis.com -d pay.hendaxis.com -d api.hendaxis.com
```

---
---

# Part 2: Free-Tier Managed Cloud Services Deployment

If you prefer to host without managing Linux servers or paying monthly VPS costs, you can split your deployment across complimentary managed cloud free tiers.

## 1. Architecture Overview (Free Tier Stack)

| Layer | Recommended Managed Service | Free Tier Allocation |
| :--- | :--- | :--- |
| **Frontend (React/Vite)** | **Vercel** or **Netlify** | Unlimited Bandwidth & Global CDN |
| **Backend API (Django)** | **Render.com** (Web Service) | 512 MB RAM, 750 free execution hours/month |
| **Database (PostgreSQL)** | **Supabase** or **Neon.tech** | 500 MB Storage, SSL Postgres Instance |
| **Redis Cache / Celery** | **Upstash Redis** | 10,000 requests / day free |

---

## 2. Step-by-Step Free Tier Deployment

### Step A: Database on Supabase / Neon
1. Create a free account on [Supabase.com](https://supabase.com) or [Neon.tech](https://neon.tech).
2. Create a project named `hendaxis-trust-db`.
3. Copy your Connection String (`DATABASE_URL`), e.g.:
   `postgres://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### Step B: Redis on Upstash
1. Create a free account on [Upstash.com](https://upstash.com).
2. Create a Redis Database and copy the TLS Redis URL (`REDIS_URL`), e.g.:
   `rediss://default:[YOUR_PASSWORD]@[YOUR_HOST].upstash.io:6379`

### Step C: Backend Deployment on Render.com
1. Push your codebase to GitHub.
2. Sign up on [Render.com](https://render.com) and click **New + -> Web Service**.
3. Connect your GitHub repository and set:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput`
   - **Start Command**: `gunicorn hendaxis_trust.wsgi:application`
4. Under **Environment Variables**, add:
   - `DEBUG`: `False`
   - `SECRET_KEY`: `<YOUR_SECRET_KEY>`
   - `DATABASE_URL`: `<YOUR_SUPABASE_OR_NEON_URL>`
   - `REDIS_URL`: `<YOUR_UPSTASH_REDIS_URL>`
   - `ALLOWED_HOSTS`: `.onrender.com,your-custom-domain.com`

### Step D: Frontend Deployment on Vercel
1. Sign up on [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository and select the `frontend` folder as the root.
3. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under Environment Variables:
   - `VITE_API_BASE_URL`: `https://hendaxis-backend.onrender.com/api`
5. Click **Deploy**. Vercel will provide your live URL (e.g. `https://hendaxis-trust.vercel.app`).

---
---

# Part 3: Production Capacity & Stress Testing (Benchmarking Limits)

To measure your production server's real throughput capacity and identify its exact concurrent user breaking point, use the built-in stress-testing suite [`scripts/hendaxis_stress_test.py`](file:///d:/PROJECTS/Hend_Trust/scripts/hendaxis_stress_test.py).

The test simulates realistic shopper behavior across public marketplace directory queries, ballpark searches, platform configuration lookups, category filters, and dynamic promo code validations.

```
+-----------------------------------------------------------------------------------+
|                        STRESS TEST & SIZING PIPELINE                              |
+-----------------------------------------------------------------------------------+
| 1. Execute script with target concurrency & mode                                  |
| 2. Measure RPS, p50, p95, p99 latencies, and error rates                         |
| 3. Automatically detect the Breakpoint (concurrency saturation point)             |
| 4. Generate 3 report formats: Markdown (.md), Interactive HTML (.html), PDF (.pdf)|
| 5. Email PDF report to team & serve 1-click browser download links                |
+-----------------------------------------------------------------------------------+
```

---

## 1. Test Execution Modes & Commands

Run these commands from the project root directory (`/var/www/hendaxis/Hend_Trust`):

### A. Step-Up Breakpoint Test (Find Exact Concurrency Limit)
Gradually ramps up concurrent workers (e.g. 25 -> 50 -> 75 -> 100 -> 150 -> 200 users) and flags the concurrency tier where $p95 > 2,000\text{ms}$ or HTTP 5xx errors begin:
```bash
python scripts/hendaxis_stress_test.py --url https://trust.hendaxis.com --mode breakpoint --max-workers 200 --step-size 25 --duration 15
```

### B. Sustained Peak Load Test
Holds a continuous target concurrency (e.g. 100 concurrent workers for 60 seconds) to test stability and database connection pool saturation:
```bash
python scripts/hendaxis_stress_test.py --url https://trust.hendaxis.com --mode load --max-workers 100 --duration 60
```

### C. Traffic Surge / Spike Test
Simulates an immediate viral spike (jumping from 5 to 150 users in seconds) to verify rate-limiting and connection queue recovery:
```bash
python scripts/hendaxis_stress_test.py --url https://trust.hendaxis.com --mode spike --max-workers 150 --duration 15
```

### D. Fast 15-Second Sanity Check
```bash
python scripts/hendaxis_stress_test.py --url https://trust.hendaxis.com --mode quick
```

---

## 2. Receiving Reports via Email

To automatically email the full performance report to stakeholders when the test finishes:
```bash
python scripts/hendaxis_stress_test.py --url https://trust.hendaxis.com --mode breakpoint --max-workers 200 --email admin@hendaxistrust.com
```

* **How it works**: The script reads your production SMTP configuration from `.env` (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`).
* **What is delivered**:
  1. A rich **HTML summary dashboard** directly in the email body.
  2. The **publication-grade PDF report** attached (`stress_test_report_YYYYMMDD_HHMMSS.pdf`).

---

## 3. Downloading Reports from the Server

All reports are saved in the `reports/` folder. You can retrieve them via three easy methods:

### Method A: One-Click Browser Download (Built-in HTTP Server)
Add `--serve` to launch a temporary download server:
```bash
python scripts/hendaxis_stress_test.py --url https://trust.hendaxis.com --mode breakpoint --serve --serve-port 8088
```
Open `http://YOUR_SERVER_IP:8088/` in your browser to click and download any generated PDF or HTML report. Press `Ctrl+C` in the terminal when you are done.

### Method B: Direct SCP Download to Local Laptop
Download the PDF report directly to your local computer:
```bash
scp user@YOUR_SERVER_IP:/var/www/hendaxis/Hend_Trust/reports/stress_test_report_*.pdf ./
```

### Method C: View HTML Report Locally
```bash
# On your local machine (or forwarded port):
scp user@YOUR_SERVER_IP:/var/www/hendaxis/Hend_Trust/reports/stress_test_report_*.html ./
open stress_test_report_*.html
```

---

## 4. How to Interpret the Capacity Metrics

* **Peak Clean Throughput (RPS)**: The highest sustained requests per second processed with $< 1\%$ errors.
* **$p95$ Latency**: The response time for 95% of requests. Must remain $< 500\text{ms}$ for responsive e-commerce.
* **Server Breakpoint Limit**: The exact worker concurrency where performance degraded.
* **Sizing Calculation**:
  $$\text{Daily Requests Capacity} = \text{Clean RPS} \times 86,400$$
  $$\text{Real-World Concurrent Active Users} = \text{Clean RPS} \times \text{Average Think Time (e.g. 4s)}$$

---
---

# Part 4: Zero-Downtime Deployments & Git Hygiene (`deploy.sh`)

When deploying updates or running stress tests on the production server, use the automated deployment script [`deploy.sh`](file:///d:/PROJECTS/Hend_Trust/deploy.sh).

### 1. Git Ignore & Conflict Prevention
The repository `.gitignore` is pre-configured to ignore all stress test artifacts, runtime logs, and Celery beat schedules:
* `reports/` and `*.report.pdf` / `*.report.html`
* `backend/celerybeat-schedule*`
* `*.log`

This guarantees that generating performance reports on production will **never create untracked file conflicts or require `git stash`** before running updates.

### 2. Running the Deployment Script
```bash
# From anywhere on the server:
bash /var/www/hendaxis/Hend_Trust/deploy.sh

# Or from project root:
cd /var/www/hendaxis/Hend_Trust
./deploy.sh
```

### 3. What `deploy.sh` Executes Automatically
1. Pulls latest code from Git branch `main` without filemode/schedule conflicts.
2. Updates backend dependencies in the virtual environment.
3. Applies pending Django database migrations (`python manage.py migrate`).
4. Collects and compresses production static assets (`python manage.py collectstatic`).
5. Verifies Redis connectivity (`PONG`) and restarts if needed.
6. Gracefully reloads Gunicorn WSGI workers, Celery Worker, and Celery Beat.
7. Builds optimized frontend React/Vite production bundles (`npm run build`).
8. Executes automated system health checks and reports service status.

---

## 5. Post-Deployment Checklist

- [ ] Run `python manage.py createsuperuser` to set up your primary Admin login.
- [ ] Log in to the Admin Dashboard (`/admin`) and verify settings in `⚙️ Gateway & Logistics Settings`.
- [ ] Configure Paystack Webhook URL to point to `https://api.yourdomain.com/api/escrow/paystack-webhook`.
- [ ] Run a quick capacity test: `python scripts/hendaxis_stress_test.py --url https://trust.hendaxis.com --mode quick`.
- [ ] Verify SSL certificates and CORS allowed origins.

