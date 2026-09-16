#!/usr/bin/env python
"""
HendAxis Trust - Master Comprehensive Automated QA Test Suite Runner
Runs backend Pytest, Django checks, frontend Vitest component tests, TypeScript checks, and Playwright E2E tests.
"""
import sys
import subprocess
import os

def run_step(cmd, cwd, description):
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
    e2e_dir = os.path.join(root_dir, "e2e")

    # Detect python venv executable if available
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    python_bin = venv_python if os.path.exists(venv_python) else "python"

    print("\n==================================================")
    print(" HENDAXIS TRUST - MASTER QA AUTOMATED TEST SUITE")
    print("==================================================")

    # 1. Backend Python Pytest Suite
    backend_success = run_step(
        cmd=f'"{python_bin}" -m pytest',
        cwd=backend_dir,
        description="Backend Pytest Unit & Integration Tests"
    )

    # 2. Backend Django System Check
    check_success = run_step(
        cmd=f'"{python_bin}" manage.py check',
        cwd=backend_dir,
        description="Backend Django System Check"
    )

    # 3. Frontend Vitest Component Suite
    frontend_test_success = run_step(
        cmd="cmd /c npm test",
        cwd=frontend_dir,
        description="Frontend Vitest Component & Store Unit Tests"
    )

    # 4. Frontend TypeScript & Production Build Check
    frontend_build_success = run_step(
        cmd="cmd /c npm run build",
        cwd=frontend_dir,
        description="Frontend TypeScript & Production Build Verification"
    )

    # 5. End-to-End Playwright Suite
    e2e_success = run_step(
        cmd="cmd /c npx playwright test",
        cwd=e2e_dir,
        description="End-to-End Playwright Browser Workflow Tests"
    )

    print("\n==================================================")
    print(" MASTER QA TEST SUITE SUMMARY")
    print("==================================================")
    print(f"1. Backend Pytest Suite:                  {'[OK] PASSED' if backend_success else '[FAIL] FAILED'}")
    print(f"2. Backend Django Check:                  {'[OK] PASSED' if check_success else '[FAIL] FAILED'}")
    print(f"3. Frontend Vitest Suite:                 {'[OK] PASSED' if frontend_test_success else '[FAIL] FAILED'}")
    print(f"4. Frontend TypeScript & Build:           {'[OK] PASSED' if frontend_build_success else '[FAIL] FAILED'}")
    print(f"5. End-to-End Playwright Suite:           {'[OK] PASSED' if e2e_success else '[FAIL] FAILED'}")
    print("==================================================")

    all_passed = all([
        backend_success,
        check_success,
        frontend_test_success,
        frontend_build_success,
        e2e_success
    ])

    if not all_passed:
        sys.exit(1)
    else:
        print("\nALL QA AUTOMATED TESTS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    main()
