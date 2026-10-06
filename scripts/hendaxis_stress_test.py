#!/usr/bin/env python3
"""
================================================================================
HENDAXIS TRUST — PRODUCTION CAPACITY & BREAKPOINT STRESS TEST SUITE
================================================================================
Author: Senior SRE & QA Performance Specialist
Features:
  - Step-Up / Breakpoint Testing (finds the exact concurrent user limit)
  - Sustained Load Testing & Burst Spike Testing
  - Detailed Metrics: RPS, p50, p90, p95, p99, Min, Max, Error Rates
  - Multi-Endpoint realistic buyer/shopper simulation
  - Automated Multi-Format Reporting: Terminal, Markdown, HTML & PDF
  - Direct Email Delivery with PDF Attachment
  - Built-in One-Click HTTP Download Server & SCP helpers
================================================================================
"""

import os
import sys
import time
import json
import argparse
import random
import statistics
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib3
import requests

# Disable insecure HTTPS warnings if testing against self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def load_env_configs():
    """
    Parses SMTP and environment configuration from .env files or os.environ.
    """
    env_vars = dict(os.environ)
    possible_paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.getcwd(), "backend", ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend", ".env"),
        "/var/www/hendaxis/Hend_Trust/.env",
        "/var/www/hendaxis/Hend_Trust/backend/.env",
    ]
    
    for p in possible_paths:
        if os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            if k not in env_vars:
                                env_vars[k] = v
            except Exception:
                pass
    return env_vars


class HendAxisStressTester:
    def __init__(self, target_url: str, mode: str = "breakpoint", duration_per_step: int = 15,
                 max_workers: int = 200, step_size: int = 25, timeout: float = 5.0,
                 output_dir: str = "reports", email_to: str = None,
                 serve_http: bool = False, serve_port: int = 8088):
        self.target_url = target_url.rstrip("/")
        self.mode = mode
        self.duration_per_step = duration_per_step
        self.max_workers = max_workers
        self.step_size = step_size
        self.timeout = timeout
        self.output_dir = output_dir
        self.email_to = email_to
        self.serve_http = serve_http
        self.serve_port = serve_port
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(pool_connections=1000, pool_maxsize=1000, max_retries=1)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Test Scenarios definition
        self.scenarios = [
            {"name": "GET /api/v1/reviews/shops (Marketplace)", "method": "GET", "path": "/api/v1/reviews/shops", "payload": None, "weight": 4},
            {"name": "GET /api/v1/reviews/shops?query=phone (Search)", "method": "GET", "path": "/api/v1/reviews/shops?query=phone", "payload": None, "weight": 3},
            {"name": "GET /api/v1/escrow/public-settings (Config)", "method": "GET", "path": "/api/v1/escrow/public-settings", "payload": None, "weight": 3},
            {"name": "GET /api/v1/reviews/recent (Recent Reviews)", "method": "GET", "path": "/api/v1/reviews/recent", "payload": None, "weight": 2},
            {"name": "GET /api/v1/reviews/shops?category=Phones (Category)", "method": "GET", "path": "/api/v1/reviews/shops?category=Phones%20%26%20Tablets", "payload": None, "weight": 2},
            {"name": "POST /api/v1/checkout/validate-promo (Promo)", "method": "POST", "path": "/api/v1/checkout/validate-promo", 
             "payload": {"link_id": "00000000-0000-0000-0000-000000000000", "promo_code": "BETA2026", "apply_buyer_credit": False}, "weight": 1},
        ]
        
        # Expand scenarios according to weight
        self.weighted_pool = []
        for s in self.scenarios:
            self.weighted_pool.extend([s] * s["weight"])
            
        self.step_results = []
        self.overall_latencies = []
        self.overall_statuses = {}
        self.total_requests = 0
        self.total_failures = 0
        self.breakpoint_workers = None
        self.start_time = None
        self.end_time = None

    def _execute_single_request(self, scenario: dict) -> dict:
        url = f"{self.target_url}{scenario['path']}"
        start = time.perf_counter()
        status_code = 0
        success = False
        error_msg = ""
        
        try:
            headers = {
                "User-Agent": "HendAxis-StressTester/1.0",
                "Accept": "application/json"
            }
            if scenario["method"] == "GET":
                resp = self.session.get(url, headers=headers, timeout=self.timeout, verify=False)
            else:
                headers["Content-Type"] = "application/json"
                resp = self.session.post(url, headers=headers, json=scenario.get("payload"), timeout=self.timeout, verify=False)
                
            status_code = resp.status_code
            latency_ms = (time.perf_counter() - start) * 1000.0
            
            if 200 <= status_code < 500:
                success = True
            else:
                error_msg = f"HTTP {status_code}"
                
        except requests.exceptions.Timeout:
            latency_ms = self.timeout * 1000.0
            status_code = 504
            error_msg = "Timeout"
        except requests.exceptions.ConnectionError:
            latency_ms = (time.perf_counter() - start) * 1000.0
            status_code = 502
            error_msg = "Conn Refused"
        except Exception as e:
            latency_ms = (time.perf_counter() - start) * 1000.0
            status_code = 500
            error_msg = str(e)[:30]
            
        return {
            "name": scenario["name"],
            "status_code": status_code,
            "latency_ms": latency_ms,
            "success": success,
            "error": error_msg
        }

    def _worker_loop(self, stop_time: float, scenario_list: list) -> list:
        results = []
        while time.time() < stop_time:
            scenario = random.choice(scenario_list)
            res = self._execute_single_request(scenario)
            results.append(res)
            time.sleep(random.uniform(0.001, 0.005))
        return results

    def run_step(self, worker_count: int) -> dict:
        print(f"\n[>> RUNNING STEP] Concurrency: {worker_count} Workers | Duration: {self.duration_per_step}s ...")
        stop_time = time.time() + self.duration_per_step
        step_start_perf = time.perf_counter()
        
        all_results = []
        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            futures = [
                executor.submit(self._worker_loop, stop_time, self.weighted_pool)
                for _ in range(worker_count)
            ]
            for f in as_completed(futures):
                all_results.extend(f.result())
                
        step_duration = time.perf_counter() - step_start_perf
        total_reqs = len(all_results)
        if total_reqs == 0:
            return {"workers": worker_count, "rps": 0, "p95": 0, "error_rate": 100.0, "total": 0}
            
        latencies = [r["latency_ms"] for r in all_results]
        latencies.sort()
        failures = sum(1 for r in all_results if not r["success"])
        error_rate = (failures / total_reqs) * 100.0
        rps = total_reqs / step_duration
        
        p50 = statistics.median(latencies)
        p90 = latencies[int(0.90 * total_reqs)]
        p95 = latencies[int(0.95 * total_reqs)]
        p99 = latencies[int(0.99 * total_reqs)]
        avg_lat = statistics.mean(latencies)
        
        step_summary = {
            "workers": worker_count,
            "total_requests": total_reqs,
            "failures": failures,
            "error_rate": error_rate,
            "rps": round(rps, 1),
            "avg_ms": round(avg_lat, 1),
            "p50_ms": round(p50, 1),
            "p90_ms": round(p90, 1),
            "p95_ms": round(p95, 1),
            "p99_ms": round(p99, 1),
            "min_ms": round(latencies[0], 1),
            "max_ms": round(latencies[-1], 1),
        }
        
        self.overall_latencies.extend(latencies)
        self.total_requests += total_reqs
        self.total_failures += failures
        for r in all_results:
            sc = str(r["status_code"])
            self.overall_statuses[sc] = self.overall_statuses.get(sc, 0) + 1
            
        print(f"  +-- Results: RPS: {step_summary['rps']} | p50: {step_summary['p50_ms']}ms | p95: {step_summary['p95_ms']}ms | p99: {step_summary['p99_ms']}ms | Error Rate: {step_summary['error_rate']:.2f}%")
        
        return step_summary

    def execute(self):
        print("=" * 80)
        print("  HENDAXIS TRUST - PRODUCTION CAPACITY & BREAKPOINT STRESS TEST")
        print("=" * 80)
        print(f"[*] Target Host       : {self.target_url}")
        print(f"[*] Test Mode         : {self.mode.upper()}")
        print(f"[*] Step Duration     : {self.duration_per_step} seconds per concurrency tier")
        print(f"[*] Max Concurrency   : Up to {self.max_workers} concurrent virtual workers")
        if self.email_to:
            print(f"[*] Report Recipient  : {self.email_to}")
        print("=" * 80)
        
        try:
            print("[?] Verifying target host connectivity...")
            ping = self.session.get(f"{self.target_url}/api/v1/escrow/public-settings", timeout=self.timeout, verify=False)
            print(f"[OK] Host is REACHABLE (HTTP {ping.status_code})\n")
        except Exception as e:
            print(f"[FAIL] ERROR: Cannot reach target host {self.target_url}: {e}")
            print("Please check your target domain or URL and ensure the server is active.")
            return

        self.start_time = datetime.now()
        
        if self.mode == "quick":
            worker_tiers = [10, 25, 50]
        elif self.mode == "load":
            worker_tiers = [self.max_workers]
        elif self.mode == "spike":
            worker_tiers = [5, 10, self.max_workers, 10]
        else: # breakpoint (step-up)
            worker_tiers = list(range(self.step_size, self.max_workers + 1, self.step_size))
            if worker_tiers[0] != 10 and self.step_size > 10:
                worker_tiers.insert(0, 10)

        for w in worker_tiers:
            summary = self.run_step(w)
            self.step_results.append(summary)
            
            if summary["error_rate"] > 5.0 or summary["p95_ms"] > 2500.0:
                if self.breakpoint_workers is None:
                    self.breakpoint_workers = w
                    print(f"\n[!] [BREAKPOINT REACHED] Server started degrading at ~{w} concurrent workers!")
                    print(f"    (Errors: {summary['error_rate']:.1f}%, p95 Latency: {summary['p95_ms']}ms)")
                    
            time.sleep(2)
            
        self.end_time = datetime.now()
        
        if self.breakpoint_workers is None:
            self.breakpoint_workers = self.max_workers
            
        self.generate_reports()

    def generate_reports(self):
        print("\n" + "=" * 80)
        print("[*] GENERATING PERFORMANCE & CAPACITY REPORTS...")
        print("=" * 80)
        
        self.overall_latencies.sort()
        total_reqs = len(self.overall_latencies)
        p50 = statistics.median(self.overall_latencies) if total_reqs else 0
        p95 = self.overall_latencies[int(0.95 * total_reqs)] if total_reqs else 0
        p99 = self.overall_latencies[int(0.99 * total_reqs)] if total_reqs else 0
        
        best_step = max(self.step_results, key=lambda s: s["rps"] if s["error_rate"] < 2.0 else 0)
        max_clean_rps = best_step["rps"]
        
        est_concurrent_users = int(max_clean_rps * 4.0)
        est_daily_pageviews = int(max_clean_rps * 86400)
        
        print("\n" + "-" * 80)
        print("[SUMMARY] FINAL SERVER CAPACITY & SIZING LIMIT")
        print("-" * 80)
        print(f"* Total Requests Tested   : {self.total_requests:,}")
        print(f"* Overall Error Rate      : {(self.total_failures / self.total_requests * 100):.2f}%")
        print(f"* Peak Clean Throughput   : {max_clean_rps:.1f} Requests / Second (RPS)")
        print(f"* Median Response Time    : {p50:.1f} ms")
        print(f"* 95th Percentile Latency : {p95:.1f} ms")
        print(f"* 99th Percentile Latency : {p99:.1f} ms")
        print(f"* Tested Capacity Limit   : ~{self.breakpoint_workers} Concurrent Active Users")
        print(f"* Est. Daily Capacity     : ~{est_daily_pageviews:,} Daily Requests / Day")
        print("-" * 80)

        # 1. Generate Markdown Report
        md_file = os.path.join(self.output_dir, f"stress_test_report_{self.timestamp_str}.md")
        self._write_markdown_report(md_file, max_clean_rps, est_concurrent_users, est_daily_pageviews, p50, p95, p99)
        print(f"[+] Markdown Report Saved : {md_file}")

        # 2. Generate HTML Report
        html_file = os.path.join(self.output_dir, f"stress_test_report_{self.timestamp_str}.html")
        self._write_html_report(html_file, max_clean_rps, est_concurrent_users, est_daily_pageviews, p50, p95, p99)
        print(f"[+] HTML Interactive Saved: {html_file}")

        # 3. Generate PDF Report via ReportLab
        pdf_file = os.path.join(self.output_dir, f"stress_test_report_{self.timestamp_str}.pdf")
        self._write_pdf_report(pdf_file, max_clean_rps, est_concurrent_users, est_daily_pageviews, p50, p95, p99)
        print(f"[+] PDF Report Generated  : {pdf_file}")

        # 4. Dispatch Email if requested
        if self.email_to:
            self._dispatch_email_report(pdf_file, html_file, max_clean_rps, est_concurrent_users, est_daily_pageviews, p50, p95)

        # 5. Print Easy Download Instructions
        print("\n" + "=" * 80)
        print("[DOWNLOAD] HOW TO DOWNLOAD REPORTS FROM PRODUCTION SERVER:")
        print("=" * 80)
        print(f"1. DIRECT SCP DOWNLOAD TO YOUR LOCAL MACHINE:")
        print(f"   scp user@your-server-ip:{os.path.abspath(pdf_file)} ./")
        print(f"\n2. DIRECT CURL DOWNLOAD (if serving locally):")
        print(f"   curl -O http://your-server-ip:{self.serve_port}/{os.path.basename(pdf_file)}")
        print("=" * 80)

        # 6. Launch HTTP Download Server if requested
        if self.serve_http:
            self._serve_http_reports(self.serve_port)

    def _write_markdown_report(self, filepath, max_rps, conc_users, daily_reqs, p50, p95, p99):
        md = f"""# HendAxis Trust — Production Stress & Capacity Test Report

> **Target Host**: `{self.target_url}`  
> **Execution Date**: `{self.start_time.strftime('%Y-%m-%d %H:%M:%S GMT')}`  
> **Test Mode**: `{self.mode.upper()}`  
> **Total Requests Processed**: `{self.total_requests:,}`  

---

## 🎯 Executive Capacity & Sizing Summary

| Key Performance Indicator | Measured Value | Practical Interpretation |
|---|:---:|---|
| **Peak Clean Throughput** | **`{max_rps:.1f} RPS`** | Peak sustainable request volume with zero degradation |
| **Max Concurrent Users** | **`~{conc_users:,} Active Users`** | Simultaneous users actively browsing/clicking (4s think time) |
| **Est. Daily Pageviews Capacity** | **`~{daily_reqs:,} Requests/Day`** | Daily supported traffic before requiring autoscaling |
| **Median Latency ($p50$)** | **`{p50:.1f} ms`** | 50% of all user requests respond within this time |
| **95th Percentile Latency ($p95$)** | **`{p95:.1f} ms`** | 95% of all user requests respond within this time |
| **99th Percentile Latency ($p99$)** | **`{p99:.1f} ms`** | Edge-case latency under peak concurrency |
| **Tested Breakpoint Limit** | **`~{self.breakpoint_workers} Workers`** | Concurrency where saturation/latency inflection occurs |

---

## 📈 Step-by-Step Concurrency Ramp-Up Results

| Concurrency (Workers) | RPS | Error % | Avg Latency | $p50$ (Median) | $p90$ | $p95$ | $p99$ | Min / Max |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
"""
        for s in self.step_results:
            md += f"| **{s['workers']} VUs** | `{s['rps']}` | `{s['error_rate']:.1f}%` | `{s['avg_ms']} ms` | `{s['p50_ms']} ms` | `{s['p90_ms']} ms` | `{s['p95_ms']} ms` | `{s['p99_ms']} ms` | `{s['min_ms']} / {s['max_ms']} ms` |\n"

        md += f"""
---

## 📊 HTTP Status Breakdown

| HTTP Status Code | Description | Total Count | % of Total Traffic |
|:---:|---|:---:|:---:|
"""
        for sc, count in sorted(self.overall_statuses.items()):
            pct = (count / self.total_requests) * 100.0
            desc = "Success (OK)" if sc.startswith("2") else ("Redirect" if sc.startswith("3") else ("Client Error / Validation" if sc.startswith("4") else "Server Error / Timeout"))
            md += f"| **`HTTP {sc}`** | {desc} | {count:,} | `{pct:.2f}%` |\n"

        md += """
---

## 🛠️ Performance Optimization Recommendations

1. **Gunicorn Worker Tuning**: Ensure your production Gunicorn worker count matches `(2 * CPU_cores) + 1` with `--threads 2` or `--threads 4`.
2. **PostgreSQL Connection Pooling**: Keep `CONN_MAX_AGE = 60` in Django settings or deploy **PgBouncer** if concurrent users exceed 500.
3. **Redis Caching**: Ensure public landing endpoints (`/api/v1/shops/` and `/api/v1/escrow/public-settings`) are cached in Redis with a 60-second TTL.
4. **Static Assets**: Offload all images, JS bundles, and CSS to Cloudflare CDN / Nginx to free Django WSGI workers strictly for business logic.
"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(md)

    def _write_html_report(self, filepath, max_rps, conc_users, daily_reqs, p50, p95, p99):
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HendAxis Trust — Capacity & Stress Test Report</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 30px 20px; }}
    .container {{ max-width: 1000px; margin: 0 auto; }}
    .header {{ background: linear-gradient(135deg, #0363ff, #0147c4); padding: 24px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(3,99,255,0.25); }}
    .header h1 {{ margin: 0 0 8px 0; font-size: 24px; }}
    .header p {{ margin: 0; font-size: 13px; opacity: 0.9; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }}
    .card {{ background: #1e293b; border: 1px solid #334155; padding: 18px; border-radius: 12px; }}
    .card .label {{ font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold; margin-bottom: 6px; }}
    .card .value {{ font-size: 22px; font-weight: 800; color: #38bdf8; }}
    .card .sub {{ font-size: 11px; color: #64748b; margin-top: 4px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }}
    th, td {{ padding: 12px 14px; text-align: left; font-size: 12px; border-bottom: 1px solid #334155; }}
    th {{ background: #0f172a; color: #cbd5e1; font-weight: 700; text-transform: uppercase; font-size: 11px; }}
    tr:last-child td {{ border-bottom: none; }}
    .badge-ok {{ background: #065f46; color: #34d399; padding: 2px 8px; border-radius: 6px; font-weight: bold; }}
    .badge-warn {{ background: #92400e; color: #fbbf24; padding: 2px 8px; border-radius: 6px; font-weight: bold; }}
    .badge-err {{ background: #991b1b; color: #f87171; padding: 2px 8px; border-radius: 6px; font-weight: bold; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HendAxis Trust — Performance & Capacity Test Report</h1>
      <p>Target: <b>{self.target_url}</b> &nbsp;|&nbsp; Generated: <b>{self.start_time.strftime('%Y-%m-%d %H:%M:%S GMT')}</b> &nbsp;|&nbsp; Mode: <b>{self.mode.upper()}</b></p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="label">Peak Clean Throughput</div>
        <div class="value">{max_rps:.1f} RPS</div>
        <div class="sub">Sustained request capacity</div>
      </div>
      <div class="card">
        <div class="label">Concurrent Users Capacity</div>
        <div class="value">~{conc_users:,} VUs</div>
        <div class="sub">Simultaneous active shoppers</div>
      </div>
      <div class="card">
        <div class="label">Daily Request Volume</div>
        <div class="value">~{daily_reqs:,} / Day</div>
        <div class="sub">Max daily throughput</div>
      </div>
      <div class="card">
        <div class="label">95th Percentile Latency</div>
        <div class="value">{p95:.1f} ms</div>
        <div class="sub">Median (p50): {p50:.1f} ms</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <div class="label" style="font-size: 13px; color: #f8fafc; margin-bottom: 12px;">Step-Up Concurrency Ramp Results</div>
      <table>
        <thead>
          <tr>
            <th>Workers (VUs)</th>
            <th>Throughput (RPS)</th>
            <th>Avg Latency</th>
            <th>p50 (Median)</th>
            <th>p95</th>
            <th>p99</th>
            <th>Error Rate</th>
          </tr>
        </thead>
        <tbody>
"""
        for s in self.step_results:
            err_class = "badge-ok" if s["error_rate"] < 1.0 else ("badge-warn" if s["error_rate"] < 5.0 else "badge-err")
            html += f"""
          <tr>
            <td><b>{s['workers']} Users</b></td>
            <td><b>{s['rps']} req/s</b></td>
            <td>{s['avg_ms']} ms</td>
            <td>{s['p50_ms']} ms</td>
            <td><b>{s['p95_ms']} ms</b></td>
            <td>{s['p99_ms']} ms</td>
            <td><span class="{err_class}">{s['error_rate']:.1f}%</span></td>
          </tr>
"""
        html += """
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)

    def _write_pdf_report(self, filepath, max_rps, conc_users, daily_reqs, p50, p95, p99):
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

            doc = SimpleDocTemplate(filepath, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
            styles = getSampleStyleSheet()
            
            PRIMARY = colors.HexColor("#0363ff")
            DARK = colors.HexColor("#0f172a")
            BG_LIGHT = colors.HexColor("#f8fafc")
            BORDER = colors.HexColor("#e2e8f0")

            styles.add(ParagraphStyle('DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=DARK))
            styles.add(ParagraphStyle('DocSub', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=colors.HexColor("#64748b")))
            styles.add(ParagraphStyle('SecHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=PRIMARY, spaceBefore=12, spaceAfter=6))
            styles.add(ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white, alignment=1))
            styles.add(ParagraphStyle('TD', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=10, textColor=DARK))
            styles.add(ParagraphStyle('TDCenter', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=10, textColor=DARK, alignment=1))
            styles.add(ParagraphStyle('TDBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=10, textColor=DARK))

            story = [
                Paragraph("HendAxis Trust — Capacity & Stress Test Report", styles['DocTitle']),
                Spacer(1, 4),
                Paragraph(f"<b>Target Host:</b> {self.target_url} &nbsp;|&nbsp; <b>Date:</b> {self.start_time.strftime('%Y-%m-%d %H:%M:%S')} &nbsp;|&nbsp; <b>Mode:</b> {self.mode.upper()}", styles['DocSub']),
                Spacer(1, 6),
                HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=0, spaceAfter=10),
                Paragraph("Executive Capacity Summary", styles['SecHead'])
            ]

            summary_rows = [
                [Paragraph("<b>Metric</b>", styles['TH']), Paragraph("<b>Measured Result</b>", styles['TH']), Paragraph("<b>Sizing Interpretation</b>", styles['TH'])],
                [Paragraph("Peak Throughput", styles['TDBold']), Paragraph(f"<b>{max_rps:.1f} RPS</b>", styles['TDCenter']), Paragraph("Sustainable clean requests per second", styles['TD'])],
                [Paragraph("Concurrent Active Users", styles['TDBold']), Paragraph(f"<b>~{conc_users:,} VUs</b>", styles['TDCenter']), Paragraph("Simultaneous active users (4s think-time)", styles['TD'])],
                [Paragraph("Daily Request Volume", styles['TDBold']), Paragraph(f"<b>~{daily_reqs:,} / Day</b>", styles['TDCenter']), Paragraph("Max daily supported request capacity", styles['TD'])],
                [Paragraph("Response Time (p95)", styles['TDBold']), Paragraph(f"<b>{p95:.1f} ms</b>", styles['TDCenter']), Paragraph("95% of user requests answered under this time", styles['TD'])],
                [Paragraph("Server Breakpoint Limit", styles['TDBold']), Paragraph(f"<b>~{self.breakpoint_workers} Workers</b>", styles['TDCenter']), Paragraph("Concurrency tier where latency inflection begins", styles['TD'])],
            ]
            t_sum = Table(summary_rows, colWidths=[130, 100, 274])
            t_sum.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), PRIMARY),
                ('GRID', (0,0), (-1,-1), 0.5, BORDER),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
                ('PADDING', (0,0), (-1,-1), 4),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(t_sum)
            story.append(Spacer(1, 10))

            story.append(Paragraph("Concurrency Ramp-Up Progression Table", styles['SecHead']))
            step_rows = [[
                Paragraph("Workers", styles['TH']), Paragraph("RPS", styles['TH']), Paragraph("Avg ms", styles['TH']),
                Paragraph("p50 ms", styles['TH']), Paragraph("p95 ms", styles['TH']), Paragraph("p99 ms", styles['TH']), Paragraph("Errors", styles['TH'])
            ]]
            for s in self.step_results:
                step_rows.append([
                    Paragraph(f"<b>{s['workers']} VUs</b>", styles['TDCenter']),
                    Paragraph(f"{s['rps']}", styles['TDCenter']),
                    Paragraph(f"{s['avg_ms']}", styles['TDCenter']),
                    Paragraph(f"{s['p50_ms']}", styles['TDCenter']),
                    Paragraph(f"<b>{s['p95_ms']}</b>", styles['TDCenter']),
                    Paragraph(f"{s['p99_ms']}", styles['TDCenter']),
                    Paragraph(f"{s['error_rate']:.1f}%", styles['TDCenter']),
                ])
            t_steps = Table(step_rows, colWidths=[70, 70, 70, 70, 74, 75, 75])
            t_steps.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), DARK),
                ('GRID', (0,0), (-1,-1), 0.5, BORDER),
                ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
                ('PADDING', (0,0), (-1,-1), 3.5),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(t_steps)

            doc.build(story)
        except Exception as e:
            print(f"Note: Could not compile PDF report: {e}")

    def _dispatch_email_report(self, pdf_file, html_file, max_rps, conc_users, daily_reqs, p50, p95):
        print(f"\n[*] Dispatching Performance Report Email to: {self.email_to} ...")
        env_vars = load_env_configs()
        
        smtp_host = env_vars.get("EMAIL_HOST", "localhost")
        smtp_port = int(env_vars.get("EMAIL_PORT", 587))
        smtp_user = env_vars.get("EMAIL_HOST_USER", "")
        smtp_pass = env_vars.get("EMAIL_HOST_PASSWORD", "")
        smtp_tls = env_vars.get("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
        from_email = env_vars.get("DEFAULT_FROM_EMAIL", f"reports@hendaxistrust.com")

        msg = MIMEMultipart()
        msg["Subject"] = f"HendAxis Trust Server Performance Report — {max_rps:.1f} RPS Peak"
        msg["From"] = from_email
        msg["To"] = self.email_to

        email_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <h2 style="color: #0363ff; margin-top: 0;">HendAxis Trust — Performance & Capacity Report</h2>
            <p style="color: #64748b; font-size: 13px;">Target: <strong>{self.target_url}</strong> | Date: <strong>{self.start_time.strftime('%Y-%m-%d %H:%M:%S')}</strong></p>
            
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 6px 0;">🚀 <strong>Peak Clean Throughput:</strong> {max_rps:.1f} Requests / Sec (RPS)</p>
              <p style="margin: 6px 0;">👥 <strong>Concurrent User Capacity:</strong> ~{conc_users:,} Active Users</p>
              <p style="margin: 6px 0;">📈 <strong>Est. Daily Capacity:</strong> ~{daily_reqs:,} Requests / Day</p>
              <p style="margin: 6px 0;">⚡ <strong>95th Percentile Latency:</strong> {p95:.1f} ms (p50: {p50:.1f} ms)</p>
              <p style="margin: 6px 0;">🛑 <strong>Tested Breakpoint:</strong> ~{self.breakpoint_workers} Concurrent Workers</p>
            </div>
            
            <p style="font-size: 13px; color: #475569;">The full PDF report is attached to this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">Generated automatically by HendAxis Trust SRE Stress Suite</p>
          </div>
        </div>
        """
        msg.attach(MIMEText(email_html, "html"))

        if os.path.isfile(pdf_file):
            try:
                with open(pdf_file, "rb") as f:
                    attach_pdf = MIMEApplication(f.read(), _subtype="pdf")
                    attach_pdf.add_header("Content-Disposition", "attachment", filename=os.path.basename(pdf_file))
                    msg.attach(attach_pdf)
            except Exception as e:
                print(f"[!] Could not attach PDF: {e}")

        try:
            if smtp_host in ("localhost", "127.0.0.1") and not smtp_user:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                server.sendmail(from_email, [self.email_to], msg.as_string())
                server.quit()
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
                if smtp_tls:
                    server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.sendmail(from_email, [self.email_to], msg.as_string())
                server.quit()
            print(f"[OK] Email report successfully delivered to {self.email_to}!")
        except Exception as e:
            print(f"[!] Email dispatch failed ({e}). Check your .env SMTP settings.")

    def _serve_http_reports(self, port: int):
        import http.server
        import socketserver

        class ReportHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=os.path.abspath(self.output_dir), **kwargs)

        print(f"\n[*] Starting Temporary HTTP Report Download Server on port {port}...")
        print(f"[*] Access URL: http://0.0.0.0:{port}/")
        print(f"[*] (Press Ctrl+C to stop the download server when finished)\n")
        try:
            with socketserver.TCPServer(("", port), ReportHandler) as httpd:
                httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[OK] HTTP Download server stopped.")
        except Exception as e:
            print(f"[!] Could not start HTTP download server: {e}")


def main():
    parser = argparse.ArgumentParser(description="HendAxis Trust Production Stress & Capacity Tester")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Target server URL (e.g. https://staging.hendaxistrust.com or http://127.0.0.1:8000)")
    parser.add_argument("--mode", choices=["breakpoint", "load", "spike", "quick"], default="breakpoint", help="Test mode: breakpoint (step-up), load, spike, quick")
    parser.add_argument("--max-workers", "--users", "-u", dest="max_workers", type=int, default=150, help="Maximum concurrent virtual workers/users to test")
    parser.add_argument("--step-size", type=int, default=25, help="Worker increment size per step (breakpoint mode)")
    parser.add_argument("--duration", type=int, default=10, help="Duration in seconds per concurrency tier")
    parser.add_argument("--timeout", type=float, default=5.0, help="HTTP request timeout in seconds")
    parser.add_argument("--output-dir", default="reports", help="Directory to save generated reports")
    parser.add_argument("--email", default=None, help="Recipient email address to automatically receive PDF/HTML reports")
    parser.add_argument("--serve", action="store_true", help="Launch temporary HTTP download server after test completes")
    parser.add_argument("--serve-port", type=int, default=8088, help="Port for temporary HTTP download server (default: 8088)")
    
    args = parser.parse_args()
    
    tester = HendAxisStressTester(
        target_url=args.url,
        mode=args.mode,
        duration_per_step=args.duration,
        max_workers=args.max_workers,
        step_size=args.step_size,
        timeout=args.timeout,
        output_dir=args.output_dir,
        email_to=args.email,
        serve_http=args.serve,
        serve_port=args.serve_port
    )
    tester.execute()


if __name__ == "__main__":
    main()
