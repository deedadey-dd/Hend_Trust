# 📋 Production E2E Quality Assurance (QA) Testing Checklist

This comprehensive testing protocol walks you through verifying your HendAxis Trust deployment end-to-end—from initial public guest browsing to merchant operations, buyer checkout, support mediation, and superuser security governance.

---

## 🌐 Phase 1: Unauthenticated Guest User (Public Browsing)

### 1.1 Homepage (`/`)
- [ ] **Theme Switcher**: Click the top navbar theme button (`Sun` ☀️ / `Moon` 🌙 / `Laptop` 💻). Confirm smooth background & text transition without visual glitches.
- [ ] **Hero Search Bar**: Type a query (e.g. "electronics" or "accra") and verify search results.
- [ ] **Escrow Trust Guide & CTA**: Verify feature cards, 3-axis escrow breakdown, and action buttons ("Explore Shops", "Create Link", "Track Order").
- [ ] **Navbar Hover Contrast**: Hover over navbar links in **Light Mode**. Confirm text turns clear blue/dark (`#2563eb` / `#0f172a`), **not white on white**.

### 1.2 Shops Directory (`/shops`)
- [ ] **Category Filtering**: Click category pills (e.g., *Fashion*, *Electronics*, *General*). Verify shop cards update accordingly.
- [ ] **Marketplace Search**: Search by merchant shop name or location.
- [ ] **Merchant Cards**: Confirm verified escrow badges, star rating averages, and sponsored advertisement cards render correctly.

### 1.3 Public Seller Storefront (`/store/:username`)
- [ ] **Store Header**: Verify shop banner, avatar photo, category badges, and description.
- [ ] **Trust Score Breakdown**: Inspect 3-axis ratings (Delivery Speed, Item Accuracy, Communication).
- [ ] **Customer Reviews**: Verify list of verified buyer reviews and owner responses.

### 1.4 Developer Hub & API Docs (`/developers`)
- [ ] **Code Snippets**: Toggle between **cURL**, **Node.js**, **Python**, and **PHP** tabs.
- [ ] **API Endpoint Table**: Verify REST endpoints (`/api/v1/checkout/initialize`, `/api/v1/links`, etc.).
- [ ] **Webhook Signature Guide**: Confirm HMAC-SHA256 signature verification documentation is rendered clearly.

### 1.5 Help & Contact (`/help`, `/contact`)
- [ ] **FAQ Accordion**: Expand/collapse FAQ categories.
- [ ] **Contact Form**: Fill out and submit the Contact Us form. Confirm success confirmation toast.

### 1.6 Order Tracking (`Track Order` Modal)
- [ ] **Tracking Search**: Click **"Track Order"** in navbar. Enter a sample or fake tracking code.
- [ ] **Parcel Progress Timeline**: Verify courier status milestones (Order Placed ➔ Dispatched ➔ In Transit ➔ Delivered).

---

## 🔐 Phase 2: User Onboarding & Authentication

### 2.1 Registration (`/register`)
- [ ] **New Account Creation**: Register with a new username, email, phone number, and password.
- [ ] **Password Validation**: Test weak password (e.g. "123456") to confirm Django password strength rules trigger.

### 2.2 Activation & Phone OTP Verification (`/activate-account`)
- [ ] **Email Activation**: Check inbox for activation email. Click the verification link.
- [ ] **SMS OTP**: Enter the 6-digit SMS verification code sent to phone number. Confirm account activates.

### 2.3 Login & Two-Factor Authentication (`/login`)
- [ ] **Login**: Sign in using registered email/username and password.
- [ ] **2FA Setup**: Navigate to Profile ➔ Security. Scan QR code with Google Authenticator / Authy. Enter 6-digit OTP code to enable 2FA.
- [ ] **2FA Login Verification**: Log out and log back in. Confirm system prompts for 2FA OTP before granting access.
- [ ] **Password Reset**: Test `/forgot-password` flow with email token link.

---

## 💼 Phase 3: Seller Persona (Merchant Dashboard)

### 3.1 Merchant Dashboard (`/dashboard`)
- [ ] **Overview Cards**: Verify Total Sales, Pending Escrow Balance, Active Payment Links, and Dispatched Orders.
- [ ] **Search & Date Filters**: Filter orders by status (*Pending*, *Dispatched*, *Completed*, *Disputed*).
- [ ] **Export Report**: Download transaction CSV report.

### 3.2 Payment Link Creation (`/create-link`)
- [ ] **Create Link**: Fill in Item Title, Amount (GHS), Description, and Delivery Fee settings.
- [ ] **Fee Calculator**: Confirm real-time platform fee vs. seller payout calculation.
- [ ] **QR Code Generator**: Click **"Generate QR Poster"**. Download PNG poster.

### 3.3 My Payment Links (`/links`)
- [ ] **Link Management**: Copy payment link URL. Verify status toggle (Active / Deactivated).

### 3.4 Store & KYC Verification (`/profile`)
- [ ] **Profile Updates**: Update shop description, upload banner and profile photo.
- [ ] **KYC Document Submission**: Submit Ghana Card / National ID number and photo. Confirm status updates to **Pending Approval**.
- [ ] **Payout Configuration**: Toggle between **Instant MoMo Payout** and **Manual Withdrawal**.

### 3.5 Financial Settlement & Wallet (`/ledger`)
- [ ] **Ledger Inspection**: Verify Available Balance vs. Escrow Locked Balance.
- [ ] **Withdrawal Request**: Request payout to Mobile Money (MTN / Vodafone / AirtelTigo).
- [ ] **Settlement Audit**: Click transaction row to inspect platform fee deduction, courier payout, and net seller payout.

---

## 🛒 Phase 4: Buyer Persona (Public Checkout & Delivery)

### 4.1 Public Escrow Checkout (`/l/:link_code`)
- [ ] **Link Access**: Open seller payment link in incognito or guest browser.
- [ ] **Order Breakdown**: Confirm item name, image, description, escrow badge, and total price.
- [ ] **Buyer Details Form**: Input delivery address, region, full name, and mobile number.
- [ ] **Payment Processing**: Select Payment Method (MoMo / Card via Paystack). Complete test transaction.

### 4.2 Order Tracking & Parcel Handover
- [ ] **SMS Notification**: Verify buyer receives order tracking code via SMS.
- [ ] **Delivery Inspection**: Open Tracking Modal. Verify dispatch proof photo and courier details.

### 4.3 Goods Confirmation & Ratings
- [ ] **Confirm Delivery**: Enter delivery OTP upon receiving parcel. Confirm escrow status transitions to **Completed**.
- [ ] **Seller Rating**: Rate seller on 3 axes (Delivery, Item Accuracy, Communication) and leave review comment.
- [ ] **Dispute Flow Test**: On a test order, click **"Raise Dispute"**, select reason (*Damaged / Wrong Item*), upload photo, and submit.

---

## 🛡️ Phase 5: Support Agent Persona (Mediation & Verification)

### 5.1 Manager Portal Login (`/admin-portal/dashboard`)
- [ ] **Support Login**: Sign in as a user with `SUPPORT_AGENT` role.
- [ ] **Dashboard Overview**: Access open disputes, pending merchant KYC verifications, and logistics logs.

### 5.2 Dispute Mediation
- [ ] **Review Evidence**: Inspect buyer dispute submission, seller dispatch proof images, and message history.
- [ ] **Resolution Action**: Execute dispute outcome (e.g. **Refund Buyer** or **Release Escrow Funds to Seller**). Confirm balance ledger adjusts accordingly.

### 5.3 Merchant KYC Approval Queue
- [ ] **Document Review**: Inspect submitted Ghana Card / National ID photos.
- [ ] **Approve / Reject**: Click **Approve**. Confirm seller account status updates to **Verified & Approved** with verified badge.

---

## ⚡ Phase 6: Superuser / Admin Persona (System Governance)

### 6.1 Production Django Admin (`DJANGO_ADMIN_URL`)
- [ ] **Secret Path Access**: Access `DJANGO_ADMIN_URL` path (e.g. `/hendaxis-secure-portal-9472/`).
- [ ] **Decoy Honeypot Verification**: Open `/admin/` in incognito. Confirm decoy login trap renders. Verify intruder IP & attempt logged in backend security logs.
- [ ] **Staff 2FA**: Confirm superuser login requires TOTP authenticator code.

### 6.2 Platform System Audits
- [ ] **Financial Balance Audit**: Inspect Platform Escrow Account, Fee Ledger, and Courier Settlement Account balances.
- [ ] **User Role Governance**: Promote or adjust staff roles (`ADMIN`, `SUPPORT_AGENT`, `SELLER`).
- [ ] **Security Lockout Audit**: Verify failed login attempts counter (`django-axes` / cache) and unlock blocked IPs if required.
- [ ] **Developer Webhook Logs**: Audit outbound HMAC webhook delivery logs and retry statuses.
