#!/usr/bin/env python3
"""
================================================================================
HENDAXIS TRUST — 500 CONCURRENT USERS STRESS TEST RUNNER
================================================================================
Executes a 500 concurrent virtual user breakpoint stress test against the
specified target host and automatically emails the generated PDF and HTML
performance reports to dev@hendaxis.com.
================================================================================
"""

import os
import sys
import argparse

# Add repository root to path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from scripts.hendaxis_stress_test import HendAxisStressTester

def main():
    parser = argparse.ArgumentParser(description="500 Concurrent Users Stress Test for HendAxis Trust")
    parser.add_argument("--url", default="https://trust.hendaxis.com", help="Target URL (default: https://trust.hendaxis.com)")
    parser.add_argument("--email", default="dev@hendaxis.com", help="Report recipient email (default: dev@hendaxis.com)")
    parser.add_argument("--duration", type=int, default=20, help="Duration in seconds per concurrency tier (default: 20s)")
    parser.add_argument("--mode", choices=["breakpoint", "load", "spike"], default="breakpoint", help="Test mode (default: breakpoint)")
    parser.add_argument("--serve", action="store_true", help="Launch temporary HTTP download server after completion")
    parser.add_argument("--serve-port", type=int, default=8088, help="Port for temporary HTTP download server (default: 8088)")
    
    args = parser.parse_args()

    print("\n" + "=" * 80)
    print("🚀 HENDAXIS TRUST — 500 CONCURRENT USERS STRESS TEST")
    print("=" * 80)
    print(f"[*] Target Host      : {args.url}")
    print(f"[*] Max Concurrency  : 500 Virtual Users")
    print(f"[*] Ramp Step Size   : 50 Users / Tier (0 -> 50 -> 100 -> ... -> 500)")
    print(f"[*] Step Duration    : {args.duration} Seconds per Tier")
    print(f"[*] Test Mode        : {args.mode.upper()}")
    print(f"[*] Report Recipient : {args.email}")
    print("=" * 80 + "\n")

    tester = HendAxisStressTester(
        target_url=args.url,
        mode=args.mode,
        duration_per_step=args.duration,
        max_workers=500,
        step_size=50,
        timeout=6.0,
        output_dir="reports",
        email_to=args.email,
        serve_http=args.serve,
        serve_port=args.serve_port
    )
    tester.execute()

if __name__ == "__main__":
    main()
