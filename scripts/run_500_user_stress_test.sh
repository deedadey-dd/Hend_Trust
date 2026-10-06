#!/usr/bin/env bash
# ==============================================================================
# HENDAXIS TRUST — 500 CONCURRENT USERS LOAD & STRESS TEST RUNNER
# ==============================================================================
# Target: Production / Staging Server (default: https://trust.hendaxis.com)
# Email Recipient: dev@hendaxis.com
# Concurrency: 500 Concurrent Virtual Users
# ==============================================================================

set -e

# Change to project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

TARGET_URL="${1:-https://trust.hendaxis.com}"
EMAIL_RECIPIENT="dev@hendaxis.com"
MAX_WORKERS=500
STEP_SIZE=50
DURATION=20

echo -e "\n=================================================================="
echo -e "🚀 STARTING 500 CONCURRENT USERS STRESS TEST"
echo -e "=================================================================="
echo -e "🎯 Target URL        : $TARGET_URL"
echo -e "👥 Max Concurrency   : $MAX_WORKERS Concurrent Users"
echo -e "📈 Ramp Step Size    : $STEP_SIZE Users / Tier"
echo -e "⏱️ Step Duration     : $DURATION Seconds"
echo -e "📧 Report Recipient  : $EMAIL_RECIPIENT"
echo -e "==================================================================\n"

# Run Python Stress Test Suite
python3 scripts/hendaxis_stress_test.py \
    --url "$TARGET_URL" \
    --mode breakpoint \
    --max-workers "$MAX_WORKERS" \
    --step-size "$STEP_SIZE" \
    --duration "$DURATION" \
    --email "$EMAIL_RECIPIENT"

echo -e "\n=================================================================="
echo -e "✅ STRESS TEST COMPLETE — Report dispatched to $EMAIL_RECIPIENT"
echo -e "==================================================================\n"
