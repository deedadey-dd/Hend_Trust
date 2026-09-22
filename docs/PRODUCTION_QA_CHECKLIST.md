# 📋 Production E2E Quality Assurance (QA) Testing Checklist

This comprehensive testing protocol walks you through verifying your HendAxis Trust deployment end-to-end—from initial public guest browsing to merchant operations, guest buyer checkout, promotions & fee offset engine, support mediation, and superuser security governance.

---

## 🌐 Phase 1: Unauthenticated Guest User (Public Browsing)

### 1.1 Homepage (`/`)
- [ ] **Theme Switcher**: Click the top navbar theme button (`Sun` ☀️ / `Moon` 🌙 / `Laptop` 💻). Confirm smooth background & text transition without visual glitches.
- [ ] **100% Unobstructed Hero Banner**: Confirm hero artwork, headline, and call-to-action buttons (*"Start Selling Free"*, *"Log in"*, *"Platform Guide"*) are fully visible with zero overlays.
- [ ] **Compact Discovery Strip & Category Matrix**: Verify compact search input and the strictly **2-Line Horizontal Category Matrix** displaying all 16 platform categories with smooth horizontal scrolling.
- [ ] **Navbar Hover Contrast**: Hover over navbar links in **Light Mode**. Confirm text turns clear blue/dark (`#2563eb` / `#0f172a`), **not white on white**.
- [ ] **Floating Fee Calculator Widget**: Verify the interactive escrow fee calculator widget calculates transparent buyer & seller payouts in real-time.

### 1.2 Shops Directory & Ballpark Product Search (`/shops`)
- [ ] **Transparent Hero Search Bar**: Confirm search bar and category scroller render over hero artwork with semi-transparent backdrops (`bg-black/40` with `backdrop-blur-md`).
- [ ] **16-Category Horizontal Scroller**: Click various category pills (e.g. *Phones & Tablets*, *Fashion & Apparel*, *Electronics & Appliances*, *Automotive*). Confirm scroller has hidden scrollbars (`.no-scrollbar`), active pills highlight in Brand Blue, and clicking a category clears previous search text to browse the selected category cleanly.
- [ ] **Ballpark Multi-Token Product Search**: Search for multi-word queries (e.g. *"iPhone 15 pro"*, *"straight wig"*, *"solar battery"*). Confirm debounced real-time filtering matches product titles, descriptions, categories, and store names.
- [ ] **Browser URL Synchronization**: Verify typing in the search box updates the browser URL (`/shops?query=...&category=...`) in real-time.
- [ ] **One-Click Clear (`X`) Button**: Test clicking the clear button inside the search box. Confirm query resets and URL parameter is removed.
- [ ] **3-Tier Directory Layout**:
  - [ ] **Tier 1 (Sponsored Stores)**: Verify top row displays featured/promoted merchants with active ad badges.
  - [ ] **Tier 2 (Verified Stores)**: Confirm 6 verified stores render in 2 balanced rows, with a functional *"View All Verified Stores (N)"* toggle.
  - [ ] **Tier 3 (Reviews Carousel & Product Grid)**: Confirm the live verified customer reviews carousel appears above matched product cards when browsing.
- [ ] **Shop Card Visual Balance (Option A)**: Inspect shop cards without active links to confirm the *"Escrow Ready — Accepts custom escrow orders"* fallback container renders cleanly with standardized contact icons (Phone & WhatsApp).
- [ ] **1-Click WhatsApp Product Inquiry**: Click the WhatsApp icon on a product card. Confirm pre-filled message contains item details and an instant 1-click escrow link generator URL (`/create-link?title=...&price=...&category=...&img=...`).

### 1.3 Public Seller Storefront (`/store/:username`)
- [ ] **Store Header**: Verify shop banner, avatar photo, category badges, and description.
- [ ] **Trust Score Breakdown**: Inspect 3-axis ratings (Delivery Speed, Item Accuracy, Communication).
- [ ] **Product Catalog**: Confirm active payment links render with transparent location-based shipping notice (`📦 Shipping cost is based on your location`).
- [ ] **WhatsApp 1-Click Escrow Generator**: Click **"Buy via HendAxis Escrow (WhatsApp)"**. Confirm prefilled inquiry with instant escrow link generator opens WhatsApp.
- [ ] **Customer Reviews**: Verify list of verified buyer reviews and store owner replies.

### 1.4 Reviews & Trust Center (`/reviews`, `/trust-center`)
- [ ] **Brand Theme Color Alignment**: Confirm star rating badges, metrics, and filter buttons use HendAxis Brand Orange (`#ff6d1d`) and Royal Blue (`#0363ff`) with high-contrast light/dark themes.
- [ ] **Filter Reviews by Rating**: Filter by 5★, 4★, 3★, 2★, 1★. Confirm verified purchase badges render on every review.

### 1.5 Referrals & Rewards Hub (`/referrals`)
- [ ] **Guest Referral Link Generator**: Enter a valid Ghana phone number (`0241234567`). Click **"Generate / View My Referral Hub"** (styled in `#ff6d1d` brand orange). Confirm unique referral link and sharing buttons appear.
- [ ] **Reward Rules**: Confirm GH₵ 15 fee credit for referrer and GH₵ 10 welcome credit for friend are documented clearly.

### 1.6 Developer Hub & API Docs (`/developers`)
- [ ] **Code Snippets**: Toggle between **cURL**, **Node.js**, **Python**, and **PHP** tabs.
- [ ] **API Endpoint Table**: Verify REST endpoints (`/api/v1/checkout/initialize`, `/api/v1/links`, `/api/v1/checkout/validate-promo`, `/api/v1/reviews/shops`).
- [ ] **Webhook Signature Guide**: Confirm HMAC-SHA256 signature verification documentation is rendered clearly.

### 1.7 Help & Contact (`/help`, `/contact`)
- [ ] **FAQ Knowledge Base**: Expand FAQ categories (Buyers, Sellers, Logistics, Disputes, Referrals, Developers). Verify FAQs covering 16 categories, product category tagging, 1-click WhatsApp link generation, and location-based shipping.
- [ ] **Contact Form**: Fill out and submit the Contact Us form. Confirm success confirmation toast.

### 1.8 Order Tracking (`/tracking`)
- [ ] **Upfront 2-Step OTP Verification**: Enter Order ID or Phone Number. Confirm 6-digit OTP prompt before accessing full order details.
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

## 💼 Phase 3: Seller Persona (Merchant Dashboard & Rewards)

### 3.1 Merchant Dashboard (`/dashboard`)
- [ ] **Overview Cards**: Verify Total Sales, Pending Escrow Balance, Active Payment Links, and Dispatched Orders. Exclude `AWAITING_PAYMENT` and archived transactions from Pending Escrow Payouts card.
- [ ] **Search & Date Filters**: Filter orders by status (*Pending*, *Dispatched*, *Completed*, *Disputed*).
- [x] **Export Report**: Download transaction reports in PDF (`.pdf`) and Excel (`.xlsx`) formats (available on `/dashboard` and `/admin-portal` tabs).
- [x] **Stale Transaction Verification**: Click **"Check Payment"** on `AWAITING_PAYMENT` orders to manually poll payment status before auto-archiving. Confirm payment auto-restores transaction.
- [x] **Dispute Health & Risk Banners**: Verify Dispute Banners (Yellow Alert ≥20%, Orange Warning ≥30%, Red Suspension ≥40%), Rating Caution (<3.0★), and Non-Dispatch Expiry Warning (≥20% non-dispatch rate).
- [ ] **Merchant Trust Badges (`/dashboard?tab=badges`)**: Test copying embeddable JavaScript widget code (`/badge/:username.js`) and downloading shareable proof cards.

### 3.2 Payment Link Creation (`/create-link`)
- [ ] **Product Category Selection**: Verify dropdown contains all 16 standardized platform categories, pre-defaulting to seller's primary store niche.
- [ ] **1-Click WhatsApp Prefill Flow**: Open `/create-link?title=iPhone%2015&price=6500&category=Phones%20%26%20Tablets`. Confirm title, price, and category are auto-prefilled with an informational banner prompting seller to enter agreed shipping fee.
- [ ] **Authoritative Fee Calculation**: Verify platform fee is calculated transparently as $(\text{Item Price} + \text{Shipping Fee}) \times 1.5\% + \text{GHS } 10.00$.
- [ ] **Fee Preference Toggle**: Test toggling between `PASS_TO_BUYER` and `ABSORB_FEE`.
- [ ] **QR Code Generator**: Click **"Generate QR Poster"**. Download PNG poster.
- [x] **Suspension Modal & Inline Appeal**: Confirm suspended sellers attempting to create links receive the dedicated **Account Suspended Modal** with exact suspension reason and inline justification appeal submission form.

### 3.3 My Payment Links (`/links`)
- [ ] **Link Management**: Copy payment link URL. Verify status toggle (Active / Deactivated) and category badges.

### 3.4 Store & KYC Verification (`/profile`)
- [ ] **16-Category Multi-Selection**: Select up to 3 store categories from the 16 platform categories. Confirm changes save to profile.
- [x] **KYC Document Submission**: Submit Ghana Card (`GHA-XXXXXXXXX-X`) and ID photo. Confirm instant auto-verification via Paystack/NIA API, or fallback to **Pending Approval** for manual manager review.
- [ ] **Payout Configuration**: Toggle between **Instant MoMo Payout** and **Manual Withdrawal**.

### 3.5 Financial Settlement & Wallet (`/ledger`)
- [ ] **Ledger Inspection**: Verify Available Balance vs. Escrow Locked Balance.
- [x] **Withdrawal Request**: Request payout to Mobile Money or Commercial Bank with real-time NIP account resolution, name matching, and immutable transaction audit logging.
- [ ] **Settlement Audit**: Click transaction row to inspect platform fee deduction, courier payout, and net seller payout.

---

## 🛒 Phase 4: Buyer Persona (Public Checkout, Delivery & Promotions)

### 4.1 Public Escrow Checkout & Brand Theme (`/l/:link_code`)
- [ ] **Brand Theme Styling**: Confirm page features Brand Blue (`#0363ff`) gradient header, glowing ambient accents, Brand Orange (`#ff6d1d`) "Continue to Payment" button, and `"Escrow Protected"` badges.
- [ ] **Link Access & Security**: Open seller payment link in incognito or guest browser. Confirm HTTP 403 page if link belongs to a suspended seller.
- [ ] **Authoritative Pricing Breakdown**: Verify Item Price + Delivery Fee + Platform Escrow Fee ($(\text{Item Price} + \text{Shipping Fee}) \times 1.5\% + \text{GHS } 10.00$).
- [ ] **Location-Based Shipping Agreement**: Confirm delivery agreement rules and fee breakdown.
- [ ] **Promotions & Discount Engine**:
  - [ ] **Promo Code Application**: Expand the **"Have a Promo Code or Reward Credit?"** accordion. Enter a valid promo code (e.g. `WELCOME10`).
  - [ ] **Live Simulation (`/api/v1/checkout/validate-promo`)**: Verify real-time calculation shows discounted platform fee and net total. Confirm item price and shipping are untouched.
  - [ ] **Guest Buyer Credit Lookup**: Enter phone number (`024XXXXXXX`) with existing credits. Confirm available credit is detected and can be applied up to `max_promo_discount_cap_ghs` (default GHS 50.00).
- [ ] **Buyer Details Form**: Input delivery address, full name, and mobile number.
- [ ] **OTP Phone Verification Modal**: Verify 6-digit OTP prompt styled with Brand Blue shield and Brand Orange CTA button before redirection to Paystack.
- [ ] **Payment Processing**: Select Payment Method (MoMo / Card via Paystack). Complete test transaction.

### 4.2 Order Tracking & Parcel Handover
- [ ] **SMS Notification**: Verify buyer receives order tracking code via SMS.
- [ ] **Delivery Inspection**: Open Tracking Modal. Verify dispatch proof photo and courier details.
- [x] **Full-Screen Image Lightbox**: Click product photo or delivery proof thumbnail to test full-screen zoom, 90° rotation, and download modal.

### 4.3 Goods Confirmation, OTP Cooldown, Ratings & Post-Payout Rewards
- [ ] **Confirm Delivery**: Enter delivery OTP upon receiving parcel. Confirm escrow status transitions to **Completed**.
- [ ] **Post-Payout Loyalty Reward**: Confirm guest buyer identity automatically accrues 1% loyalty credit (valid for 90 days) on completed transaction.
- [x] **60-Second OTP SMS Cooldown**: Re-click **"Resend Code"** within 60 seconds. Verify countdown timer button (`Resend Code (58s)`), disabled state, and zero duplicate SMS dispatches.
- [x] **Transit Rating Lock**: Verify rating button shows `🔒 Rate Seller (Unlocks upon delivery)` during transit (`DELIVERY_IN_PROGRESS`) and unlocks upon delivery with `#ff6d1d` brand accent.
- [x] **1 Review Per Transaction**: Verify submitting feedback again updates the initial review instead of creating duplicate records.
- [x] **$0-Cost Email Edit Link**: Test `/reviews/request-edit-link` fallback for buyers editing feedback from a new device or browser.
- [ ] **Dispute Flow Test**: On a test order, click **"Raise Dispute"**, select reason (*Damaged / Wrong Item*), upload photo, and submit.
- [ ] **Dispute Retraction Grace Release**: When buyer clicks **"Retract Dispute"** to settle privately, confirm auto-release grace timer (`dispute_retraction_release_hours`, default 24h) is scheduled.

---

## 🛡️ Phase 5: Support & Arbiter Persona (Mediation & Appeals)

### 5.1 Manager Portal Navigation (`/admin-portal/dashboard`)
- [ ] **Support Login**: Sign in as a user with `SUPPORT_AGENT` or `ARBITER` role.
- [ ] **Side Panel Navigation**: Verify categorized side panel (`Operations`, `Finance & Ledger`, `Users & Community`, `System & Config`) renders correctly with collapse toggle and mobile drawer support.
- [ ] **Live Badge Indicators**: Confirm pending disputes, appeals, and KYC counters highlight with alert badges.

### 5.2 Dispute Mediation & Arbiter Workflow
- [ ] **Review Evidence**: Inspect buyer dispute submission, seller dispatch proof images, and dispute chat timeline.
- [ ] **Arbiter Assignment**: In Disputes Center, test assigning an arbiter to an active dispute.
- [ ] **Arbiter Compensation**: Verify arbiter compensation ledger records standard mediation fee (`arbiter_fee_per_dispute`, default GHS 15.00).
- [ ] **Resolution Action**: Execute dispute outcome (e.g. **Refund Buyer** or **Release Escrow Funds to Seller**). Confirm balance ledger adjusts accordingly.

### 5.3 Merchant KYC Approval Queue
- [ ] **Document Review**: Inspect submitted Ghana Card / National ID photos.
- [ ] **Approve / Reject**: Click **Approve**. Confirm seller account status updates to **Verified & Approved** with verified badge.

### 5.4 Suspension Appeals Desk
- [x] **Review Appeal Submissions**: Inspect seller remediation justifications and order history.
- [x] **Approve Appeal & Clean Slate Reinstatement**: Approve appeal. Verify seller account reinstates (`is_suspended = False`), `reinstated_at = timezone.now()` is set, and seller can create payment links again.
- [x] **Reject Appeal**: Provide administrative feedback notes. Verify seller dashboard reflects rejection notes and allows re-submission.

---

## ⚡ Phase 6: Superuser & Admin Persona (System Governance & Promotions Engine)

### 6.1 Promotions & Rewards Management (Tab: `PROMOTIONS`)
- [ ] **Dedicated Tab Access**: Navigate to `Promotions & Rewards` tab in the side panel navigation.
- [ ] **Master Campaign Switch**: Toggle `promotions_active` on and off. Verify live status badge in sidebar (`Active` vs standard).
- [ ] **Campaign Expiry Date**: Set a campaign expiration date (`promotions_expires_at`). Confirm expired campaigns automatically cease granting new rewards.
- [ ] **Reward Rates Configuration**: Update `buyer_reward_rate_percent` (1.0%), `seller_reward_per_completed_order_ghs` (GHS 5.00), and `max_promo_discount_cap_ghs` (GHS 50.00).
- [ ] **Promo Code CRUD**:
  - [ ] Click **"Create Promo Code"**. Enter code (e.g. `LAUNCH2026`), discount type (*Percentage* / *Fixed*), amount, max usage count, and expiry date.
  - [ ] Test deactivating and reactivating a promo code.
- [ ] **Manual Credit Grant Modal**:
  - [ ] Grant manual credit to a guest buyer by phone number (`+233XXXXXXXXX`).
  - [ ] Grant manual bonus credit to an authenticated seller.
  - [ ] Verify ledger entry and updated balance.

### 6.2 Double-Entry Ledger & Platform Funds Audit
- [ ] **Promotions Subsidy Accounting**: Verify that promo discounts create proper ledger entries:
  - `Debit`: `EXPENSE:PROMOTIONS_SUBSIDY`
  - `Credit`: `LIABILITY:BUYER_ESCROW_DEPOSIT` / Platform Fee absorption
  - Verify `is_ledger_balanced` remains `True` (Total Assets = Total Liabilities).
- [ ] **Fee Integrity Audit**: Verify standard platform fee collection retains **1.5% + GHS 10.00** on gross settled volume.
- [ ] **Arbiter Payouts Ledger**: Confirm arbiter payouts reflect in platform expense ledger.

### 6.3 Staff & Role Governance (Tab: `STAFF`)
- [ ] **Role Management**: Promote or adjust staff roles (`ADMIN`, `ARBITER`, `COMPLIANCE_OFFICER`, `FINANCE_ADMIN`, `SUPPORT_AGENT`, `SELLER`).
- [ ] **Role-Based Access Control (RBAC)**: Verify support agents cannot alter financial payout settings; finance admins have access to ledger and promo subsidies; superusers have unrestricted access.

### 6.4 Production Django Admin (`DJANGO_ADMIN_URL`)
- [ ] **Secret Path Access**: Access `DJANGO_ADMIN_URL` path (e.g. `/hendaxis-secure-portal-9472/`).
- [ ] **Decoy Honeypot Verification**: Open `/admin/` in incognito. Confirm decoy login trap renders. Verify intruder IP & attempt logged in backend security logs.
- [ ] **Staff 2FA**: Confirm superuser login requires TOTP authenticator code.
- [x] **Manual Admin Suspend & Clean Slate Reinstate**: Locate seller in Admin Portal directory. Click **"Suspend Seller"** (confirm links deactivate and user status locks to suspended) and **"Reinstate"** (confirm account unlocks and `reinstated_at` timestamp is updated).
- [x] **Dispatch Expiry & Dispute Governance Settings**: In Settings Tab, test adjusting `shipping_timeout_days`, `dispatch_expiry_warning_threshold` (20%), `dispatch_expiry_suspension_threshold` (35%), and `dispute_retraction_release_hours` (24h).
- [ ] **Security Lockout Audit**: Verify failed login attempts counter (`django-axes` / cache) and unlock blocked IPs if required.
- [ ] **Developer Webhook Logs**: Audit outbound HMAC webhook delivery logs and retry statuses.

