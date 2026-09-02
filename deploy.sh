#!/usr/bin/env bash
# ==============================================================================
# HENDAXIS TRUST PRODUCTION DEPLOYMENT & HEALTH CHECK SCRIPT
# ==============================================================================
# Usage: Run from anywhere on the production server:
#   bash /var/www/hendaxis/Hend_Trust/deploy.sh
# Or from the project root (/var/www/hendaxis/Hend_Trust):
#   ./deploy.sh
# ==============================================================================

set -e

# Color output tokens
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directory definitions
PROJECT_ROOT="/var/www/hendaxis/Hend_Trust"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
VENV_ACTIVATE="/var/www/hendaxis/venv/bin/activate"

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${BLUE}🚀 STARTING HENDAXIS TRUST PRODUCTION DEPLOYMENT${NC}"
echo -e "${BLUE}====================================================${NC}\n"

# 1. PULL LATEST GIT CHANGES
echo -e "${YELLOW}[1/6] Pulling latest code changes from Git...${NC}"
cd "$PROJECT_ROOT"
# Auto-clear runtime schedule file changes that cause git pull conflicts
git checkout -- backend/celerybeat-schedule* 2>/dev/null || true
git rm --cached backend/celerybeat-schedule* 2>/dev/null || true
git pull origin main
echo -e "${GREEN}✓ Git pull completed successfully.${NC}\n"

# 2. BACKEND MIGRATIONS & STATIC ASSETS
echo -e "${YELLOW}[2/6] Applying Django database migrations & static assets...${NC}"
cd "$BACKEND_DIR"
source "$VENV_ACTIVATE"
python manage.py migrate --noinput
python manage.py collectstatic --noinput
echo -e "${GREEN}✓ Database migrations & static assets updated.${NC}\n"

# 3. REDIS HEALTH CHECK
echo -e "${YELLOW}[3/6] Checking Redis server status...${NC}"
if redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✓ Redis server is active and responding (PONG).${NC}\n"
else
    echo -e "${RED}x Redis is not responding! Attempting to restart redis-server...${NC}"
    sudo systemctl restart redis-server || true
    sleep 2
    if redis-cli ping | grep -q "PONG"; then
        echo -e "${GREEN}✓ Redis restarted successfully.${NC}\n"
    else
        echo -e "${RED}x Warning: Redis server is still unavailable. Please check systemctl status redis-server.${NC}\n"
    fi
fi

# 4. RESTART BACKEND SERVICES (Gunicorn, Celery Worker, Celery Beat)
echo -e "${YELLOW}[4/6] Restarting Gunicorn, Celery Worker, and Celery Beat...${NC}"
cd "$BACKEND_DIR"

# Stop existing background processes gracefully
pkill -f "gunicorn" || true
pkill -f "celery" || true
sleep 2

# Launch background processes
nohup celery -A hendaxis_trust worker -l info > celery_worker.log 2>&1 &
echo -e "${GREEN}✓ Celery Worker launched in background.${NC}"

nohup celery -A hendaxis_trust beat -l info > celery_beat.log 2>&1 &
echo -e "${GREEN}✓ Celery Beat launched in background.${NC}"

nohup gunicorn --workers 4 --bind 127.0.0.1:8000 hendaxis_trust.wsgi:application > gunicorn.log 2>&1 &
echo -e "${GREEN}✓ Gunicorn WSGI Server launched in background.${NC}\n"

# 5. BUILD FRONTEND ASSETS
echo -e "${YELLOW}[5/6] Installing dependencies & building frontend production bundle...${NC}"
cd "$FRONTEND_DIR"
npm install --silent
npm run build
echo -e "${GREEN}✓ Frontend production build completed successfully.${NC}\n"

# 6. SYSTEM HEALTH VERIFICATION
echo -e "${YELLOW}[6/6] Running production health checks...${NC}"
sleep 3

# Check Celery node status
cd "$BACKEND_DIR"
if celery -A hendaxis_trust status 2>/dev/null | grep -q "OK"; then
    echo -e "${GREEN}  [OK] Celery Worker node is ONLINE${NC}"
else
    echo -e "${RED}  [FAIL] Celery Worker node is OFFLINE - Inspect backend/celery_worker.log${NC}"
fi

# Check Gunicorn binding HTTP status
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" http://127.0.0.1:8000/api/docs || echo "000")
if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 301 ] || [ "$HTTP_STATUS" -eq 302 ]; then
    echo -e "${GREEN}  [OK] Gunicorn API Server is ONLINE (HTTP ${HTTP_STATUS})${NC}"
else
    echo -e "${RED}  [FAIL] Gunicorn API Server is OFFLINE (HTTP ${HTTP_STATUS}) - Inspect backend/gunicorn.log${NC}"
fi

# Print summary of active processes
echo -e "\n${BLUE}Active Process Table:${NC}"
ps aux | grep -E "gunicorn|celery|redis" | grep -v "grep"

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}🎉 HENDAXIS TRUST DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}====================================================${NC}\n"
