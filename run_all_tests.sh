#!/usr/bin/env bash
# HendAxis Trust - Shell wrapper for Master QA Test Suite Runner

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f "backend/venv/Scripts/python.exe" ]; then
    backend/venv/Scripts/python.exe run_all_tests.py "$@"
elif [ -f "backend/venv/bin/python" ]; then
    backend/venv/bin/python run_all_tests.py "$@"
elif command -v python3 &>/dev/null; then
    python3 run_all_tests.py "$@"
else
    python run_all_tests.py "$@"
fi
