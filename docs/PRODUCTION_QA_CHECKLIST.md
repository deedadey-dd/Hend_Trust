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
- [ ] **Dual-Mode Tracking Access**:
  - [ ] **Logged-in Buyer**: Open `/tracking` modal while logged in. Confirm active and past orders appear automatically without an SMS lookup OTP.
  - [ ] **Guest Shopper**: Enter Order ID or Phone Number. Confirm 6-digit OTP prompt before accessing full order details.
- [ ] **Parcel Progress Timeline**: Verify courier status milestones (Order Placed ➔ Dispatched ➔ In Transit ➔ Delivered).

### 1.9 Multi-Route Static SEO & Pre-Rendering (`scripts/generate-routes-seo.mjs`)
- [ ] **Static Route Output**: Inspect `dist/` build output to confirm 12 distinct static HTML files exist (`/`, `/for-buyers`, `/for-sellers`, `/how-it-works`, `/trust-center`, `/guides`, `/referrals`, `/developers`, `/help`, `/contact`, `/shops`, `/reviews`).
- [ ] **Canonical URL & Title Verification**: Inspect `<head>` tags of each route to verify independent `<title>`, meta description, OpenGraph/Twitter cards, and canonical link (`<link rel="canonical" href="https://trust.hendaxis.com/..." />`).
- [ ] **Crawler Content Rendering**: Verify curl/raw HTTP request receives full static content rather than an empty blank SPA root.

---

## 🔐 Phase 2: User Onboarding & Authentication

### 2.1 Registration (`/register`)
- [ ] **Persona Toggle**: Verify radio selector toggles cleanly between **"🏪 Merchant / Seller"** and **"🛍️ Buyer / Shopper"**.
- [ ] **Buyer Account Registration**: Register a new account with `role: 'BUYER'`. Confirm instant account creation without email verification lockouts.
- [ ] **Seller Account Registration**: Register a new account with `role: 'SELLER'`. Confirm standard onboarding requirements.
- [ ] **Password Validation**: Test weak password (e.g. "123456") to confirm Django password strength rules trigger.

### 2.2 Post-Checkout Buyer Registration & Dual-Verification (`/l/:id`)
- [ ] **1-Click Password Setup**: Complete a guest checkout on `/l/:id`. On the order confirmation page, enter a password in the **"⚡ Create a 1-Click Buyer Account"** card and click **"Save Password & Verify"**.
- [ ] **Dual Dispatch**: Confirm email activation link is sent to inbox, and a 6-digit SMS OTP is sent to phone number.
- [ ] **Phone OTP Verification & Auto-Login**: Enter the 6-digit SMS OTP on the card. Confirm user is immediately logged in via secure HTTP-only JWT cookies upon entering the valid code.
- [ ] **Unverified Email Banner**: Confirm the `UnverifiedEmailBanner` appears at the top of the application with a 1-click "Resend Link" button until the email link is clicked.
- [ ] **Order Association**: Verify that the current transaction is immediately bound to the newly created buyer profile.

### 2.3 Activation & Phone OTP Verification (`/activate-account` - Sellers)
- [ ] **Email Activation**: Check inbox for activation email. Click the verification link.
- [ ] **SMS OTP**: Enter the 6-digit SMS verification code sent to phone number. Confirm seller account activates.

### 2.4 Login & Two-Factor Authentication (`/login`)
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

### 3.2 Payment Link & Direct In-Platform Escrow Order Creation (`/create-link`)
- [x] **Delivery Mode Switcher**: Toggle between `🌐 Public Social Link` (general shareable link) and `👤 Direct to HendAxis Buyer` (in-platform targeted delivery).
- [x] **Debounced Buyer Search Autocomplete**: In Direct Mode, type `@username`, phone number, or email. Confirm real-time search dropdown (`GET /api/v1/links/search-buyer`), verified user badges, and clear buyer card selection.
- [x] **Product Category Selection**: Verify dropdown contains all 16 standardized platform categories, pre-defaulting to seller's primary store niche.
- [x] **1-Click WhatsApp Prefill Flow**: Open `/create-link?title=iPhone%2015&price=6500&category=Phones%20%26%20Tablets`. Confirm title, price, and category are auto-prefilled with an informational banner prompting seller to enter agreed shipping fee.
- [x] **Dynamic Ready-to-Ship Advisory**: Verify warning badge uses dynamically configured `shipping_timeout_days` from admin settings instead of hardcoded 4-day copy.
- [x] **Authoritative Fee Calculation**: Verify platform fee is calculated transparently as $(\text{Item Price} + \text{Shipping Fee}) \times 1.5\% + \text{GHS } 10.00$.
- [x] **Fee Preference Toggle**: Test toggling between `PASS_TO_BUYER` and `ABSORB_FEE`.
- [x] **QR Code & Direct Dispatch Modal**: When generating a direct order, confirm success modal confirms direct in-app notification dispatch to buyer while still providing WhatsApp and link copying options.
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

## 🛒 Phase 4: Buyer Persona (Public Checkout, Delivery & Purchases Hub)

### 4.1 Public Escrow Checkout & Dual-Flow Initialization (`/l/:link_code`)
- [x] **Pre-filled Contact Info & Default Shipping Address for Registered Buyers**: When authenticated buyer visits `/l/:id`, verify full name, phone number, email, and saved `default_shipping_address` from user profile (or direct order recipient address) are pre-filled automatically with full in-line editability.
- [x] **Authenticated 1-Click Checkout to Paystack (Zero "Invalid OTP" Error)**: When authenticated buyer clicks "Continue to Payment", verify `apiClient` sends auth credentials/Bearer token, bypassing the guest SMS OTP verification and redirecting immediately to Paystack authorization.
- [ ] **Brand Theme Styling**: Confirm page features Brand Blue (`#0363ff`) gradient header, glowing ambient accents, Brand Orange (`#ff6d1d`) "Continue to Payment" button, and `"Escrow Protected"` badges.
- [ ] **Link Access & Security**: Open seller payment link in incognito or guest browser. Confirm HTTP 403 page if link belongs to a suspended seller.
- [ ] **Authoritative Pricing Breakdown**: Verify Item Price + Delivery Fee + Platform Escrow Fee ($(\text{Item Price} + \text{Shipping Fee}) \times 1.5\% + \text{GHS } 10.00$).
- [ ] **Location-Based Shipping Agreement**: Confirm delivery agreement rules and fee breakdown.
- [ ] **Dual-Flow Checkout Verification**:
  - [x] **Authenticated Buyer (1-Click Init)**: Log in as a buyer and open `/l/:id`. Confirm buyer details autofill and clicking "Continue to Payment" immediately launches Paystack checkout **without displaying an SMS OTP modal**.
  - [ ] **Guest Shopper (SMS OTP)**: Open in an incognito window without logging in. Confirm mandatory 6-digit SMS OTP modal appears before Paystack redirection.
- [ ] **Comprehensive Promotions & Discount Engine Verification**:
  - [ ] **Seasonal / Festive Auto-Discount Application**:
    - [ ] Open payment link during an active seasonal campaign (e.g. `WAIVED` 100% or `PERCENTAGE_DISCOUNT` 50%).
    - [ ] Verify festive badge and platform fee discount are automatically deducted without needing a promo code.
    - [ ] Confirm item price and shipping fee are 100% untouched.
  - [ ] **Promo Code Application (`PERCENTAGE` vs `FIXED_GHS`)**:
    - [ ] Expand the **"Have a Promo Code or Reward Credit?"** accordion.
    - [ ] Enter a Percentage promo code (e.g. `PROMO20` for 20% off). Confirm discount calculation respects `max_discount_cap_ghs` (e.g. 20% of fee capped at GHS 25.00).
    - [ ] Enter a Fixed GHS promo code (e.g. `SAVE15` for GHS 15.00 off). Confirm fee is reduced by exactly GHS 15.00.
  - [ ] **Live Simulation & Dynamic Recalculation (`POST /api/v1/checkout/validate-promo`)**:
    - [ ] Verify typing or removing code triggers real-time recalculation of net platform fee and gross checkout total.
    - [ ] Confirm seller payout estimate remains identical to $(Item + Shipping)$ regardless of promo discounts.
  - [ ] **Guest & Authenticated Wallet Credit Lookup**:
    - [ ] Enter phone number (`+233XXXXXXXXX`) or log in with an account that has stored promotional/cashback credits.
    - [ ] Confirm available credit balance is detected and displayed.
    - [ ] Apply credit: confirm deduction is capped at `max_promo_discount_cap_ghs` (default GHS 50.00).
  - [ ] **Discount Stacking & Precedence Validation**:
    - [ ] Test combination of Seasonal Fee Override + Promo Code + Wallet Credit on a single checkout.
    - [ ] Verify precedence: Base Platform Fee $\to$ Seasonal Reduction $\to$ Promo Code $\to$ Wallet Credit.
    - [ ] Verify floor rule: Platform fee cannot drop below `GHS 0.00` (no negative fees or cash extraction).
  - [ ] **Negative & Constraint Error Handlers**:
    - [ ] Enter an expired promo code. Confirm inline error: *"Promo code has expired."*
    - [ ] Enter a code whose `min_order_amount_ghs` is higher than current order total. Confirm inline error: *"Order total must be at least GHS X.XX to use this code."*
    - [ ] Enter a code whose global `usage_limit` is exhausted. Confirm inline error: *"Promo code usage limit has been reached."*
    - [ ] Attempt redeeming a single-use code a second time with the same phone/user. Confirm error: *"You have already reached the redemption limit for this code."*
    - [ ] Test role-restricted promo codes (`BUYER_ONLY` vs `SELLER_ONLY`). Confirm role mismatch is rejected.
- [ ] **Payment Processing**: Select Payment Method (MoMo / Card via Paystack). Complete test transaction.

### 4.2 Buyer Purchases & Orders Hub (`/dashboard?tab=purchases`)
- [x] **Incoming Escrow Orders & Invoices Banner**: When seller creates a direct order targeted at buyer, confirm a highlighted card appears in Buyer Purchases tab (`GET /api/v1/links/incoming-orders`) with **"Review & Pay"** (direct 1-click checkout) and **"Decline"** (with modal confirmation and seller notification).
- [x] **Direct Invoices History Toggle**: Toggle between **"Pending Action"** and **"All Invoices History"** to review past paid and declined direct escrow invoices with real-time status badges.
- [ ] **Dedicated Buyer Hub**: Log in as a buyer and navigate to `/dashboard`. Confirm default view loads **"My Purchases & Orders"** tab.
- [ ] **Order Metrics Cards**: Verify summary counts for *Active In-Flight Orders*, *In Inspection Period*, and *Completed Orders*.
- [ ] **Search & Filter**: Test filtering orders by search query (item title, merchant shop name, reference).
- [ ] **Order Card Details**: Confirm product thumbnail, seller store link, courier tracking link, and live state tags render cleanly.

### 4.3 Seller Payment Links & In-App Invoice History Hub (`/links`)
- [x] **Delivery Type Filter Tabs**: Filter links by **All Links & Invoices**, **🌐 Public Links Only**, and **👤 Direct In-App Invoices**.
- [x] **Direct Invoice Status Badges**: View direct order payment statuses (**⏳ Pending Payment**, **✅ Paid / In Escrow**, **✕ Declined by Buyer**) and recipient `@username` / name.
- [x] **Link Detail & QR Code Modal**: Open link details to view recipient info, fee breakdown, direct link sharing, and instant QR code.

### 4.3 Order Tracking & Parcel Handover
- [ ] **SMS Notification**: Verify buyer receives order tracking code via SMS.
- [ ] **Instant 0-OTP Tracking Modal**: Open Tracking Modal (`/tracking`) as an authenticated buyer. Confirm order history is fetched immediately via `GET /api/v1/checkout/buyer/my-orders` without prompting for a phone lookup OTP.
- [ ] **Delivery Inspection**: Open Tracking Modal. Verify dispatch proof photo and courier details.
- [x] **Full-Screen Image Lightbox**: Click product photo or delivery proof thumbnail to test full-screen zoom, 90° rotation, and download modal.

### 4.4 Goods Confirmation, 1-Click Release, Ratings & Post-Payout Rewards
- [ ] **Dual Delivery Confirmation**:
  - [ ] **Authenticated Buyer (1-Click Confirmation)**: Logged-in buyer clicks **"⚡ Confirm Receipt (1-Click)"** on `/l/:id` or in Buyer Purchases tab. Confirm transaction transitions immediately to `INSPECTION_PERIOD` with **0 OTP codes required**.
  - [ ] **1-Click Approve & Release**: During inspection, logged-in buyer clicks **"✓ Approve & Release Payment"**. Confirm escrow payout releases directly to the seller with **0 OTP codes required**.
  - [ ] **Guest Shopper (SMS Code)**: Guest buyer enters the 6-digit confirmation code from SMS/email to confirm receipt.
- [ ] **Post-Payout Loyalty Reward**: Confirm buyer identity automatically accrues 1% loyalty credit (valid for 90 days) on completed transaction.
- [x] **60-Second OTP SMS Cooldown**: Re-click **"Resend Code"** within 60 seconds. Verify countdown timer button (`Resend Code (58s)`), disabled state, and zero duplicate SMS dispatches.
- [x] **Transit Rating Lock**: Verify rating button shows `🔒 Rate Seller (Unlocks upon delivery)` during transit (`DELIVERY_IN_PROGRESS`) and unlocks upon delivery with `#ff6d1d` brand accent.
- [x] **1 Review Per Transaction**: Verify submitting feedback again updates the initial review instead of creating duplicate records.
- [x] **$0-Cost Email Edit Link**: Test `/reviews/request-edit-link` fallback for buyers editing feedback from a new device or browser.
- [x] **Dispute Reason Categorization & 10-Char Minimum Length**: On a test order, click **"Raise Dispute"**. Verify the 7 standardized category choices (*Item Not Received*, *Item Damaged / Broken*, *Item Different from Description*, *Defective or Non-Functional*, *Wrong Size or Specification*, *Incomplete / Missing Parts*, *Other Violation*). Confirm submission is blocked if explanation is under 10 characters, and verify the live character counter (`{len}/10 min chars`). Upload photo and submit.
- [x] **Request Arbiter Decision Escalation (48h Window)**:
  - [x] Before the configured escalation window (`arbiter_escalation_hours`, default 48h), confirm the dispute timeline shows the mediation countdown banner (*"Mediation Queue Escalation unlocks in X hours"*).
  - [x] After 48 hours elapses (or accelerated test timestamp), verify both Buyer and Seller see the active **"⚡ Request Arbiter Decision"** button.
  - [x] Click the button. Confirm confirmation prompt, immediate status update to `⚡ ARBITER DECISION REQUESTED`, audit log creation, and SMS/Email notification dispatch.
- [ ] **Dispute Retraction Grace Release**: When buyer clicks **"Retract Dispute"** to settle privately, confirm auto-release grace timer (`dispute_retraction_release_hours`, default 24h) is scheduled.

### 4.5 Notification Center & Activity Hub (`/notifications`)
- [x] **Light & Dark Theme Contrast**: Verify page renders with crisp high contrast (`bg-slate-50 dark:bg-slate-950` with high-contrast text and cards).
- [x] **Multi-Channel Filters**: Toggle between **All Channels**, **Emails**, **SMS**, and **In-App Alerts**.
- [x] **Search & Date Range**: Test live search by keyword and filtering by date preset (*Today*, *Last 7 Days*, *Last 30 Days*, *Custom Range*).
- [x] **OTP Filtering**: Confirm one-time passwords and SMS verification codes are strictly omitted from the notification list.
- [x] **Action Deep Linking**: Click notification card action buttons to verify deep navigation to tracking, reviews, or dashboard.
- [x] **Read Management**: Test Mark All as Read, Clear Read, and toggle individual read states.

---

## 🛡️ Phase 5: Support & Arbiter Persona (Mediation & Appeals)

### 5.1 Manager Portal Navigation (`/admin-portal/dashboard`)
- [ ] **Support Login**: Sign in as a user with `SUPPORT_AGENT` or `ARBITER` role.
- [ ] **Side Panel Navigation**: Verify categorized side panel (`Operations`, `Finance & Ledger`, `Users & Community`, `System & Config`) renders correctly with collapse toggle and mobile drawer support.
- [ ] **Live Badge Indicators**: Confirm pending disputes, appeals, and KYC counters highlight with alert badges.

### 5.2 Dispute Mediation & Arbiter Workflow
- [ ] **Review Evidence & Dispute Categories**: Inspect buyer dispute category badge, evidence description, seller dispatch proof images, and dispute chat timeline.
- [x] **Priority Queue Ordering (`⚡ ARBITER DECISION REQUESTED`)**: Verify disputes where either party clicked "Request Arbiter Decision" sort to the top of the Arbiter Dispute List with an active high-priority amber badge.
- [ ] **Arbiter Assignment**: In Disputes Center, test assigning an arbiter to an active dispute.
- [ ] **Arbiter Compensation**: Verify arbiter compensation ledger records standard mediation fee (`arbiter_fee_per_dispute`, default GHS 15.00).
- [x] **Arbiter Non-Resolving Instruction / Notice Flow**:
  - [x] On an active disputed transaction, click **"Post Instruction / Note"**.
  - [x] Submit an instruction note (e.g. *"Seller, please upload courier receipt by tomorrow 5 PM."*) with optional photo attachment.
  - [x] Verify the dispute remains in `DISPUTED` status (not resolved).
  - [x] Confirm the instruction renders immediately in the center of the dispute dialogue trail with distinct purple badge (`⚖️ Arbiter Instruction`), timestamp, and photo previews.
  - [x] Verify automated SMS and Email alerts are dispatched to both the buyer and seller with order reference and instruction summary.
- [ ] **Standard Resolution Action**: Execute standard dispute outcome (e.g. **Refund Buyer** or **Release Escrow Funds to Seller**). Confirm balance ledger adjusts accordingly.
- [x] **External Arbitration Ruling & Platform Indemnity Flow**:
  - [x] In the Admin Resolution Modal, toggle **"External Arbitration / Court Ruling"**.
  - [x] Confirm warning notice displays the legal indemnity disclaimer (*"Parties assume 100% of all legal/arbitration costs. Platform is indemnified and absolved"*).
  - [x] Confirm that resolution submission is blocked until a valid, certified written order document URL / file upload (`external_order_document_url`) is attached by the arbiter.
  - [x] Verify resolution log records the ruling order document URL and notes.

### 5.3 Merchant KYC Approval Queue
- [ ] **Document Review**: Inspect submitted Ghana Card / National ID photos.
- [ ] **Approve / Reject**: Click **Approve**. Confirm seller account status updates to **Verified & Approved** with verified badge.

### 5.4 Suspension Appeals Desk
- [x] **Review Appeal Submissions**: Inspect seller remediation justifications and order history.
- [x] **Approve Appeal & Clean Slate Reinstatement**: Approve appeal. Verify seller account reinstates (`is_suspended = False`), `reinstated_at = timezone.now()` is set, and seller can create payment links again.
- [x] **Reject Appeal**: Provide administrative feedback notes. Verify seller dashboard reflects rejection notes and allows re-submission.

### 5.5 Staff Tasks & Work Assignment Alerts (Tab: `NOTIFICATIONS`)
- [x] **Top Header Dropdown**: Verify bell icon in sticky top header displays live unread counter and quick preview drawer.
- [x] **Work Category Filters**: Test filtering staff alerts by **Disputes & Arbitration**, **KYC Verifications**, **Suspension Appeals**, and **Staff & Roles**.
- [x] **Deep Action Links**: Click quick view buttons to ensure direct transition to the corresponding dispute mediation modal, verification review card, or appeal desk.
- [x] **Automated Triggering**:
  - [x] Verify arbiter assignment generates targeted in-app notification.
  - [x] Verify 48h arbitration queue escalation generates high-priority arbiter alerts.
  - [x] Verify KYC Ghana Card document submission alerts compliance officers.
  - [x] Verify merchant suspension appeal submission alerts compliance officers.

---

## ⚡ Phase 6: Superuser & Admin Persona (System Governance & Promotions Engine)

### 6.1 Promotions, Seasonal Fees, Cashback & Referral Engine (Tab: `PROMOTIONS`)
- [ ] **Navigation & Sub-Tab Architecture**: Confirm seamless switching across all 5 promotion sub-tabs:
  1. `Active Campaigns & Program Settings`
  2. `Promo Code Redemptions Audit`
  3. `Seasonal Fee Reductions & Orders`
  4. `Referral Tracking & Audit`
  5. `Cashback & Fee Offset Ledger`
- [ ] **Master Platform Controls & Expiration**:
  - [ ] Toggle master `promotions_active` switch. Confirm live status indicator changes (`PROMOTIONS ACTIVE` vs `PROMOTIONS DISABLED`).
  - [ ] Set `promotions_expires_at` timestamp. Test clearing expiry back to perpetual.
  - [ ] Update global ceiling cap `max_promo_discount_cap_ghs` (default GHS 50.00). Confirm checkout enforces cap.
- [ ] **Promo Code Engine (CRUD & Rule Limits)**:
  - [ ] **Creation & Parameter Matrix**: Click **"Create Promo Code"** and test creating:
    - `PERCENTAGE` code (e.g. `VIP30` with 30% discount, `max_discount_cap_ghs: 35.00`, `min_order_amount_ghs: 100.00`).
    - `FIXED_GHS` code (e.g. `FLAT10` with GHS 10.00 discount, `per_buyer_limit: 1`, `usage_limit: 50`).
    - Role-targeted code (`BUYER_ONLY` vs `SELLER_ONLY` vs `ALL`).
    - Expiration datetime (`expires_at`).
  - [ ] **Inline Form Validation**: Test invalid submissions (empty code, 0% discount, end date in the past). Confirm clear inline error alert renders inside modal without closing.
  - [ ] **Edit & Status Toggle**: Edit existing promo code (change discount cap, extend expiry). Toggle active/inactive switch and verify immediate status update.
  - [ ] **Delete Protection**: Test delete action with modal confirmation.
  - [ ] **Redemptions History Modal**: Click **"View Redemptions"** on a promo code row. Verify table shows redemption timestamp, order reference, buyer phone/email, and subsidized GHS discount.
- [ ] **Seasonal / Festive Fee Overrides Engine**:
  - [ ] **Campaign Creation Matrix**: Click **"Create Seasonal Fee Campaign"** and verify all 5 rule types:
    1. `WAIVED` (100% Zero Platform Fee)
    2. `PERCENTAGE_DISCOUNT` (e.g. 50% discount on standard fee)
    3. `FIXED_DISCOUNT` (e.g. GHS 5.00 deduction from standard fee)
    4. `REDUCED_PERCENTAGE` (e.g. 0.5% variable rate instead of standard 1.5%)
    5. `REDUCED_FIXED` (e.g. GHS 5.00 base fee instead of standard GHS 10.00)
  - [ ] **Thresholds & Limits**: Configure `min_order_amount_ghs` (e.g. GHS 200.00) and optional `max_discount_cap_ghs` (e.g. GHS 30.00).
  - [ ] **Strict Date Scheduling**: Set start and end datetimes. Test validation rule: end date must be strictly after start date.
  - [ ] **Real-Time Audit & Tracking**: In `Seasonal Fee Reductions & Orders` sub-tab, verify orders benefiting from seasonal fee reductions display campaign name, standard fee vs discount granted, and net fee collected.
- [ ] **Transaction Reward & Automated Cashback Campaigns**:
  - [ ] Click **"Create Transaction Reward Campaign"**. Configure cashback incentives:
    - Target: `ALL`, `BUYER_ONLY`, or `SELLER_ONLY` (merchant platform fee offset credits).
    - Type: `FIXED_GHS` (e.g. GHS 5.00) vs `PERCENTAGE_VOLUME` (e.g. 1.0% volume cashback).
    - Minimum order amount (`min_order_amount_ghs`) and max reward cap (`max_reward_cap_ghs`).
    - Credit validity window (e.g. 90 or 180 days).
  - [ ] Complete an escrow order matching campaign criteria. Verify buyer/seller wallet receives automated credit upon order delivery confirmation.
- [ ] **Referral Program Settings & Double-Sided Tracking**:
  - [ ] In `Referral Tracking & Audit` sub-tab, configure program settings:
    - `referral_program_active` toggle.
    - `referrer_reward_ghs` (default GHS 10.00) and `referee_reward_ghs` (default GHS 5.00).
    - `min_order_amount_for_referral_ghs` (qualifying first order threshold, default GHS 50.00).
    - `max_referrals_per_user` anti-abuse limit (default 50).
  - [ ] Verify referral registration tracking table displays referrer handle, referee name, qualifying order ref, and reward completion timestamps.
- [ ] **Manual Credit Grant Modal (Customer Goodwill & Offsets)**:
  - [ ] Open **"Grant Manual Promotional Credit"** modal.
  - [ ] Grant GHS 20.00 credit to a buyer by phone number (`+233XXXXXXXXX`) with reason notes.
  - [ ] Grant fee offset credit to a merchant store handle with reason notes.
  - [ ] In `Cashback & Fee Offset Ledger` sub-tab, verify credit grant entry, balance addition, and expiry date.

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

### 6.4 Production Django Admin & Dynamic Platform Settings (`DJANGO_ADMIN_URL` & `/admin-portal/settings`)
- [ ] **Secret Path Access**: Access `DJANGO_ADMIN_URL` path (e.g. `/hendaxis-secure-portal-9472/`).
- [ ] **Decoy Honeypot Verification**: Open `/admin/` in incognito. Confirm decoy login trap renders. Verify intruder IP & attempt logged in backend security logs.
- [ ] **Staff 2FA**: Confirm superuser login requires TOTP authenticator code.
- [x] **Manual Admin Suspend & Clean Slate Reinstate**: Locate seller in Admin Portal directory. Click **"Suspend Seller"** (confirm links deactivate and user status locks to suspended) and **"Reinstate"** (confirm account unlocks and `reinstated_at` timestamp is updated).
- [x] **Dispute Escalation & Logistics Governance Settings**: In Settings Tab, test adjusting `arbiter_escalation_hours` (default 48h), `shipping_timeout_days`, `dispatch_expiry_warning_threshold` (20%), `dispatch_expiry_suspension_threshold` (35%), and `dispute_retraction_release_hours` (24h). Confirm adjustments persist and apply globally.
- [ ] **Security Lockout Audit**: Verify failed login attempts counter (`django-axes` / cache) and unlock blocked IPs if required.
- [ ] **Developer Webhook Logs**: Audit outbound HMAC webhook delivery logs and retry statuses.

---

## 📊 Phase 7: Production Health, Observability & Monitoring Verification

### 7.1 Backend API & System Health Endpoint (`/api/health/`)
- [ ] **Healthy State Verification**: Send `GET https://trust.hendaxis.com/api/health/`. Confirm `HTTP 200 OK` with JSON:
  ```json
  { "status": "healthy", "database": "healthy", "redis": "healthy" }
  ```
- [ ] **Database Dependency Check**: Confirm PostgreSQL connectivity is verified via `SELECT 1` without leaking credentials or database names.
- [ ] **Redis Dependency Check**: Confirm Redis cache & broker connectivity is verified via test key ping.
- [ ] **Degraded Fallback Verification**: Confirm that if Database or Redis becomes unavailable, the endpoint returns `HTTP 503 Service Unavailable` with itemized component status.

### 7.2 Celery Beat & Worker Heartbeat Pipeline
- [ ] **Heartbeat Execution**: Confirm `apps.core.tasks.celery_heartbeat_ping` runs every 5 minutes in `CELERY_BEAT_SCHEDULE`.
- [ ] **Redis Timestamp Registration**: Verify key `celery:last_heartbeat_timestamp` is updated in Redis cache on every execution.
- [ ] **Better Stack Heartbeat**: When `BETTERSTACK_CELERY_HEARTBEAT_URL` is set, confirm periodic HTTP ping is received in Better Stack dashboard and status stays **UP**.

### 7.3 Sentry Backend Error Tracking (`TRUST-Backend`)
- [ ] **Exception Capture**: Trigger controlled test exception via Django shell (`sentry_sdk.capture_message(...)`). Confirm issue appears in Sentry `TRUST-Backend` project.
- [ ] **Celery Error Tracking**: Verify failed or retried Celery tasks capture stack traces, task names, and arguments in Sentry.
- [ ] **PII Scrubbing**: Confirm passwords, authorization headers, credit cards, and Ghana card numbers are stripped (`send_default_pii=False`).
- [ ] **Tracing Quota Protection**: Confirm conservative trace sampling is active (`SENTRY_TRACES_SAMPLE_RATE=0.1`).

### 7.4 Sentry Frontend Error Tracking (`TRUST-Frontend`)
- [ ] **React Error Boundary**: Confirm rendering errors in React components trigger the fallback UI and dispatch exception payloads to Sentry `TRUST-Frontend`.
- [ ] **Source Map Resolution**: Confirm production stack traces in Sentry map directly to TypeScript source files via Vite source maps (`sourcemap: true`).
- [ ] **Client PII Sanitization**: Verify `beforeSend` strips `Authorization` headers, `Cookie` headers, passwords, and OTP tokens.

### 7.5 PostgreSQL Database Backup Automation (`scripts/backup_db.sh`)
- [ ] **Dry Run Backup**: Execute `bash /var/www/hendaxis/Hend_Trust/scripts/backup_db.sh`. Confirm `.sql.gz` dump is created in `/var/backups/hendaxis_trust/`.
- [ ] **Retention Pruning**: Verify backups older than 7 days are automatically pruned.
- [ ] **Better Stack Backup Heartbeat**: Confirm `BETTERSTACK_BACKUP_HEARTBEAT_URL` is pinged only after `pg_dump` and gzip compression succeed.
- [ ] **Nightly Cron Registration**: Verify cron job `0 2 * * * /var/www/hendaxis/Hend_Trust/scripts/backup_db.sh` is active on server.

### 7.6 Better Stack External Uptime Monitoring
- [ ] **Website Monitor**: Confirm `https://trust.hendaxis.com` is monitored every 3 minutes (Expected `HTTP 200`).
- [ ] **API Health Monitor**: Confirm `https://trust.hendaxis.com/api/health/` is monitored every 1 minute (Expected `HTTP 200`).
- [ ] **SSL Expiry Monitoring**: Verify SSL certificate validity alerting is enabled.
- [ ] **Incident Routing**: Confirm email/SMS alerts route to on-call engineering team upon downtime.


