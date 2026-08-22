#!/usr/bin/env python
"""
HendAxis Trust - Master Test Suite Runner
Runs backend unit tests (Pytest) and frontend build verification.
"""
import sys
import subprocess
import os

def run_command(cmd, cwd, description):
    print(f"\n==================================================")
    print(f"[RUNNING] {description}")
    print(f"Directory: {cwd}")
    print(f"Command: {cmd}")
    print(f"==================================================")
    result = subprocess.run(cmd, cwd=cwd, shell=True)
    if result.returncode != 0:
        print(f"\n[FAIL] {description} (Exit Code: {result.returncode})\n")
        return False
    print(f"\n[OK] {description}\n")
    return True

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("\n==================================================")
    print(" HENDAXIS TRUST - MASTER TEST SUITE")
    print("==================================================")

    # 1. Backend Python Pytest Suite
    backend_success = run_command(
        cmd="python -m pytest",
        cwd=backend_dir,
        description="Backend Pytest Unit Tests"
    )

    # 2. Backend Django System Check
    check_success = run_command(
        cmd="python manage.py check",
        cwd=backend_dir,
        description="Backend Django System Check"
    )

    # 3. Frontend TypeScript & Vite Build Check
    frontend_success = run_command(
        cmd="npm run build",
        cwd=frontend_dir,
        description="Frontend TypeScript & Production Build Verification"
    )

    print("\n==================================================")
    print(" MASTER TEST SUITE SUMMARY")
    print("==================================================")
    print(f"1. Backend Pytest Suite:                  {'[OK] PASSED' if backend_success else '[FAIL] FAILED'}")
    print(f"2. Backend Django Check:                  {'[OK] PASSED' if check_success else '[FAIL] FAILED'}")
    print(f"3. Frontend TypeScript & Build:           {'[OK] PASSED' if frontend_success else '[FAIL] FAILED'}")
    print("==================================================")

    if not (backend_success and check_success and frontend_success):
        sys.exit(1)
    else:
        print("\nALL TESTS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    main()
