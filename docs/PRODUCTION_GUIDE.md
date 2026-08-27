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
| **Hetzner CAX11** (ARM64) | **2 vCPU**, **4 GB RAM**, **40 GB NVMe** | **~€3.79 / mo** | **Starter Production** (Handles up to 10k daily users) |
| **Hetzner CAX21** (ARM64) | **4 vCPU**, **8 GB RAM**, **80 GB NVMe** | **~€7.19 / mo** | **Recommended Scaling** (High concurrency & heavy Celery loads) |
| **Hetzner CX22** (x86 Intel) | **2 vCPU**, **4 GB RAM**, **40 GB SSD** | **~€4.50 / mo** | x86 Architecture alternative |

> **Recommendation**: Choose **CAX11** or **CAX21** running **Ubuntu 24.04 LTS**. Hetzner Ampere ARM servers offer exceptional performance per euro.

---

## 2. Server Prerequisites & Initial Security Setup

### A. Server Access & System Updates
```bash
# Connect to server via SSH
ssh root@YOUR_HETZNER_SERVER_IP

# Update system packages
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban nginx certbot python3-certbot-nginx postgresql postgresql-contrib redis-server python3-pip python3-venv build-essential libpq-dev
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
Description=HendAxis Trust Gunicorn Daemon
After=network.target postgresql.service redis.service

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/hendaxis/backend
ExecStart=/var/www/hendaxis/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:8000 hendaxis_trust.wsgi:application
Restart=always

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
server {
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;

    # Frontend Assets
    location / {
        root /var/www/hendaxis/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend Django Static Files
    location /static/ {
        alias /var/www/hendaxis/backend/staticfiles/;
    }

    # API Proxy to Gunicorn
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
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
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
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

## 3. Post-Deployment Checklist

- [ ] Run `python manage.py createsuperuser` to set up your primary Admin login.
- [ ] Log in to the Admin Dashboard (`/admin`) and verify settings in `⚙️ Gateway & Logistics Settings`.
- [ ] Configure Paystack Webhook URL to point to `https://api.yourdomain.com/api/escrow/paystack-webhook`.
- [ ] Verify SSL certificates and CORS allowed origins.
