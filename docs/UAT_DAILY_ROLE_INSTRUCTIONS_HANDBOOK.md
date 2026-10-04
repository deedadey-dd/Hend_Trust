# HendAxis Trust — Daily UAT Role-by-Role WhatsApp Briefing Handbook

> **Audience**: Test Manager & WhatsApp Group Facilitator  
> **Purpose**: Ready-to-copy-and-paste daily broadcast prompts, role-specific checklists, test data credentials, and reporting requirements for the 12-day UAT testing cohort.

---

## 📋 Master Test Sandbox Cheat Sheet (Pin in WhatsApp Group)

*Send this cheat sheet to the WhatsApp group on Day 0 so testers have it pinned for the entire duration of the test.*

```
================================================================================
           📌 HENDAXIS TRUST BETA TESTING — MASTER QUICK REFERENCE CHEAT SHEET
================================================================================
🌐 Staging URL: https://staging.hendaxistrust.com (or local IP / ngrok URL)
📱 WhatsApp Group: HendAxis Trust UAT Beta Team
⏱️ Testing Window: ~2 Hours / Day (10:00 AM – 8:00 PM GMT Flexible Window)

💳 PAYSTACK TEST NUMBERS (Mobile Money):
- MTN MoMo:     0244000001 (OTP: 123456) -> Simulated Success
- Telecel Cash: 0200000002 (OTP: 123456) -> Simulated Success
- AT Money:     0270000003 (OTP: 123456) -> Simulated Success
- Failed MoMo:  0244000002 -> Simulated Insufficient Funds

💳 PAYSTACK TEST CARD:
- Card Number:  4084 0840 8408 4084
- Expiry Date:  12/28 | CVV: 408 | Card OTP: 123456

🔑 SEED PROMO CODES:
- 'BETA2026' (20% Platform Fee Discount)
- 'WELCOME10' (GHS 10.00 Fixed Platform Fee Discount)

🛡️ ADMIN PORTAL ACCESS (Staff & Arbiters):
- Admin URL: /admin-portal/dashboard
- Compliance Desk: /admin-portal/dashboard?tab=verifications
- Arbiter Desk:    /admin-portal/dashboard?tab=disputes
- Finance Audit:   /admin-portal/dashboard?tab=funds
- Appeals Desk:    /admin-portal/dashboard?tab=appeals
================================================================================
```

---

## 📅 DAY 1: Onboarding, Account Security & KYC Identity

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 1 BRIEFING* 🌅
🎯 *Today's Focus*: User Registration, Account Security (2FA), & Seller KYC Verification
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 🛒 Buyers (Role A)
- 🏬 Sellers (Role B)
- 🛡️ Compliance Officers (Role D)
- 🛠️ Lead QA (Role G)

Welcome to Day 1! Today we lay the foundations. Sellers will set up their shops and submit Ghana Card documents; Compliance Officers will review and approve them; Buyers will set up profiles and test security features.

Please read your role-specific checklist below and share your screenshots in the group as you finish! 🚀
```

---

### 👤 Role-Specific Instruction Cards for Day 1

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 1 CHECKLIST FOR SELLERS (Role B)*:
1. Go to /register -> Create a Seller account using your real Ghanaian phone number.
2. Complete Phone OTP verification (enter the 6-digit code received via SMS/In-App).
3. Check your email inbox -> Click the email verification link to verify your email.
4. Go to /profile:
   - Upload a Shop Banner and Shop Logo/Profile picture.
   - Enter your Shop Name, Business Description, and select 3 Category pills (e.g. Phones, Electronics, Fashion).
   - Scroll to "Identity Verification": Enter a mock Ghana Card Number (format: GHA-123456789-0) and upload a front/back photo of an ID.
5. In Profile Settings, turn ON "Two-Factor Authentication (2FA)":
   - Scan the QR code using Google Authenticator or Authy.
   - Log out, then log back in using your password + 6-digit Authenticator code.
6. 📸 *Post in WhatsApp*: Screenshot of your Storefront (/store/your-username) and confirmation that 2FA works!
```

#### 🛒 Role A: Consumer Buyers
```
📋 *DAY 1 CHECKLIST FOR BUYERS (Role A)*:
1. Go to /register -> Create a Buyer account.
2. Complete Phone OTP verification and confirm your email.
3. Go to /profile -> Add your Default Delivery Address (e.g. "House 14, Ring Road Central, Madina, Accra").
4. Test Password Recovery:
   - Log out -> Click "Forgot Password" on /login.
   - Enter your email -> Open the reset link in your email -> Set a new password and log back in.
5. 📸 *Post in WhatsApp*: Screenshot of your saved profile address.
```

#### 🛡️ Role D: KYC & Compliance Officers
```
📋 *DAY 1 CHECKLIST FOR COMPLIANCE (Role D)*:
1. Log in with your Compliance staff credentials.
2. Navigate to /admin-portal/dashboard?tab=verifications.
3. Inspect all pending Seller Ghana Card submissions:
   - Seller #1 & #2: Click "Approve" -> Verify that the "🛡️ Verified Seller" badge immediately appears on their public shop (/store/seller-username).
   - Seller #3: Click "Reject" with reason: "ID photo blurry / expired" -> Confirm the seller receives an in-app notice and email with the rejection reason.
4. 📸 *Post in WhatsApp*: Screenshot of the approved verifications table.
```

---

## 📅 DAY 2: Storefronts, Payment Links & 1-Click WhatsApp Escrow

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 2 BRIEFING* 🌅
🎯 *Today's Focus*: Payment Link Generation, Dynamic Fees, & 1-Click WhatsApp Escrow Generator
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 🏬 Sellers (Role B - Heavy)
- 🛒 Buyers (Role A - Moderate)

Today Sellers will generate custom escrow payment links with different fee options, and Buyers will test the 1-Click WhatsApp Escrow generator directly from seller storefronts! 📦 Let's test how smooth link creation feels.
```

---

### 👤 Role-Specific Instruction Cards for Day 2

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 2 CHECKLIST FOR SELLERS (Role B)*:
1. Go to /create-link -> Create 3 different payment links:
   - 🔹 Link 1: Low-Value Item (Title: "AirPods Pro", Price: GHS 250, Shipping: GHS 20, Fee: "Pass Fee to Buyer", Category: "Phones & Tablets").
   - 🔹 Link 2: Mid-Value Item (Title: "Sony WH-1000XM5", Price: GHS 3,800, Shipping: GHS 50, Fee: "Absorb Fee (Seller Pays)", Category: "Electronics & Appliances").
   - 🔹 Link 3: High-Value Item (Title: "MacBook Pro M2", Price: GHS 14,500, Shipping: GHS 0, Fee: "Pass Fee to Buyer", Category: "Computing & Accessories").
2. Check the real-time fee calculator on screen:
   - Verify Platform Fee = (Price + Shipping) * 1.5% + GHS 10.00.
   - Verify Gateway Fee = Gross Amount * 1.95%.
3. Go to /links -> Toggle one link to "Inactive" and verify it cannot be opened by buyers; toggle it back to "Active".
4. Copy your Storefront URL (/store/your-username) and post it directly into our WhatsApp testing group!
```

#### 🛒 Role A: Consumer Buyers
```
📋 *DAY 2 CHECKLIST FOR BUYERS (Role A)*:
1. Click any Seller's Storefront link posted in the WhatsApp group (/store/username).
2. Browse their items and click the button: "Buy via HendAxis Escrow (WhatsApp)".
3. Verify this opens WhatsApp with a prefilled inquiry message containing product title, price, category, and prefilled /create-link generator parameters.
4. Try opening an Inactive link shared by a seller -> Verify it shows a friendly "This link is currently inactive" message.
5. 📸 *Post in WhatsApp*: Screenshot of the prefilled WhatsApp inquiry message.
```

---

## 📅 DAY 3: Public Checkout, Paystack MoMo & Dual-Flow Auth

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 3 BRIEFING* 🌅
🎯 *Today's Focus*: Public Checkout, Mobile Money (MTN/Telecel/AT) & Zero-OTP Auth Flows
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 🛒 Buyers (Role A - Heavy)
- 🏬 Sellers (Role B - Moderate)
- 🛠️ Lead QA (Role G)

Today is our first live payment test! We are testing both Guest Shoppers (checkout without account -> create account after) AND Logged-in Buyers (1-Click Zero-OTP payment). Remember to use Paystack Sandbox test numbers! 💳
```

---

### 👤 Role-Specific Instruction Cards for Day 3

#### 🛒 Role A: Consumer Buyers (Guest Flow & Authenticated Flow)
```
📋 *DAY 3 CHECKLIST FOR BUYERS (Role A)*:

🧪 *TEST 1 — GUEST SHOPPER FLOW (Incognito / Logged Out)*:
1. Open a Seller's payment link in a Private/Incognito browser window.
2. Fill in: Full Name, Phone Number, Email, and Delivery Address.
3. Click "Pay with Escrow" -> In the Paystack modal:
   - Select Mobile Money -> Enter MTN number: 0244000001 -> Enter OTP: 123456.
4. After payment success, you will see "Create Account":
   - Enter a password -> Verify Phone OTP -> Confirm you are logged in immediately!

🧪 *TEST 2 — AUTHENTICATED ZERO-OTP FLOW (Logged-in)*:
1. Make sure you are logged in to your Buyer account.
2. Open another payment link -> Click "Proceed to Checkout".
3. Notice your delivery details are prefilled automatically.
4. Click "Pay Now" -> Verify there is NO SMS OTP popup before Paystack initializes.
5. Pay using Telecel test number: 0200000002 (OTP: 123456).

🧪 *TEST 3 — FAILED PAYMENT RECOVERY*:
1. Try paying with MTN number: 0244000002 (Simulates Insufficient Funds).
2. Verify you get a clear error message and the payment link remains open to retry.

📸 *Post in WhatsApp*: Screenshot of your Payment Success Receipt with Transaction ID!
```

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 3 CHECKLIST FOR SELLERS (Role B)*:
1. As buyers pay for your links, check your Dashboard (/dashboard).
2. Verify the order moves immediately from "Awaiting Payment" to "Payment Received".
3. Check your SMS / Email inbox -> Verify you received an instant "New Order Received" notification containing the buyer's name, phone, and delivery address.
4. Go to /ledger -> Verify the order amount is listed as "Held in Escrow" (not yet available for withdrawal).
5. 📸 *Post in WhatsApp*: Screenshot of your Dashboard showing the new "Payment Received" orders.
```

---

## 📅 DAY 4: Dual Logistics (Courier vs Bus OTP) & Upfront Tracking

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 4 BRIEFING* 🌅
🎯 *Today's Focus*: Order Dispatch (Courier Path A vs. Informal Bus Path B) & Upfront 6-Digit Tracking Portal
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 🏬 Sellers (Role B - Heavy)
- 🛒 Buyers (Role A - Heavy)

Fulfillment day! Sellers will dispatch orders via formal Couriers (Path A) and informal Bus Transport (Path B). Buyers will test the secure Upfront OTP Tracking portal (/track) to unlock driver details and waybill photos! 🚚
```

---

### 👤 Role-Specific Instruction Cards for Day 4

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 4 CHECKLIST FOR SELLERS (Role B)*:

📦 *DISPATCH ORDER #1 — PATH A (Formal Courier)*:
1. Open your Dashboard -> Find an order in "Payment Received" -> Click "Dispatch Order".
2. Select "Courier Service" -> Choose carrier (e.g. DHL, FedEx, Speedaf, or Ghana Post).
3. Enter Tracking Number (e.g. "SPDF-GH-998812") and Carrier Tracking URL.
4. Upload a WebP photo of the packaged parcel with waybill sticker -> Click "Confirm Dispatch".

🚌 *DISPATCH ORDER #2 — PATH B (Informal Bus / Station Transport)*:
1. Find your second paid order -> Click "Dispatch Order".
2. Select "Informal Bus Transport".
3. Enter Driver Phone Number (e.g. "0244123456"), Vehicle Number (e.g. "GT 4821-24"), and Destination Station (e.g. "VIP Station, Circle").
4. Upload waybill slip photo -> Click "Confirm Dispatch".
5. Verify order status transitions to "Delivery in Progress".
```

#### 🛒 Role A: Consumer Buyers
```
📋 *DAY 4 CHECKLIST FOR BUYERS (Role A)*:

🔍 *TEST 1 — GUEST UPFRONT OTP TRACKING*:
1. Open /track in a private window (logged out).
2. Enter your Transaction Reference ID + your Phone Number.
3. Click "Request Tracking OTP" -> Enter the 6-digit OTP code received.
4. Verify the order timeline unlocks: driver phone, car registration number, waybill photo, and dispatch timestamp.

🔍 *TEST 2 — LOGGED-IN 1-CLICK TRACKING*:
1. Log in to your Buyer account -> Open /track.
2. Verify all your active in-flight orders load automatically with 0 OTP requests required!
3. Click your informal bus order -> Check that the "Secret Delivery Confirmation Code" is displayed.

📸 *Post in WhatsApp*: Screenshot of the unlocked tracking view showing the waybill photo.
```

---

## 📅 DAY 5: Tiered Inspection Periods, 1-Click Release & Reviews

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 5 BRIEFING* 🌅
🎯 *Today's Focus*: Delivery Confirmation, Tiered Inspection Countdowns (24h/48h/72h), Payout Release & 3-Axis Reviews
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 🛒 Buyers (Role A - Heavy)
- 🏬 Sellers (Role B - Moderate)
- 💰 Finance Admins (Role E - Light)

Today buyers receive packages, confirm delivery, verify their inspection countdown timer, release payouts to merchants, and leave Trustpilot-style 3-axis verified reviews! 🌟
```

---

### 👤 Role-Specific Instruction Cards for Day 5

#### 🛒 Role A: Consumer Buyers
```
📋 *DAY 5 CHECKLIST FOR BUYERS (Role A)*:
1. Go to /dashboard?tab=purchases -> Find your "Delivery in Progress" order.
2. Click "Confirm Delivery Receipt" (For informal bus orders, enter the 6-digit code).
3. Verify the order moves to "Inspection Period":
   - Low-value (< GHS 2k): Verify 24-Hour countdown timer is displayed.
   - Mid-value (GHS 2k - 10k): Verify 48-Hour countdown timer is displayed.
   - High-value (>= GHS 10k): Verify 72-Hour countdown timer is displayed.
4. On Order #1: Click "Approve & Release Funds to Seller" -> Verify order status is "Completed".
5. Leave a Verified Review:
   - Rate Speed (1–5 Stars), Communication (1–5 Stars), Overall Satisfaction (1–5 Stars).
   - Write a detailed review comment and attach an unboxing photo.
6. 📸 *Post in WhatsApp*: Screenshot of your completed order with the review submitted!
```

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 5 CHECKLIST FOR SELLERS (Role B)*:
1. Once the buyer releases funds, check your SMS / Email -> Confirm you received a "Payout Completed" notification.
2. Go to /ledger -> Verify your "Available Wallet Balance" has increased by the net order earnings.
3. Go to your public storefront (/store/your-username) -> Check that the verified buyer review is visible.
4. Click "Reply to Review" -> Post a merchant thank-you response -> Verify your reply displays nested under the review.
5. 📸 *Post in WhatsApp*: Screenshot of your updated wallet balance and your review reply!
```

---

## 📅 DAY 6: Dispute Resolution Engine, 5-Photo Trail & Retraction

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 6 BRIEFING* 🌅
🎯 *Today's Focus*: Raising Disputes, 5-Photo Evidence Trails, Unified Chat Timeline & Retraction
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 🛒 Buyers (Role A - Heavy)
- 🏬 Sellers (Role B - Heavy)
- ⚖️ Dispute Arbiters (Role C - Heavy)

Conflict day! Buyers will raise disputes on defective items; sellers will submit defenses; arbiters will review 360° dossiers; and buyers will test dispute retraction. Let's make sure no evidence gets lost! ⚖️
```

---

### 👤 Role-Specific Instruction Cards for Day 6

#### 🛒 Role A: Consumer Buyers
```
📋 *DAY 6 CHECKLIST FOR BUYERS (Role A)*:
1. Open an order in "Inspection Period" -> Click "Raise Dispute".
2. Select Dispute Category (e.g. "Item Not As Described" or "Damaged on Arrival").
3. Enter your explanation: "The screen has a crack and the color is black instead of blue."
4. Upload 2 clear damage photos -> Submit Dispute.
5. Once submitted, test the Subsequent Dialogue Append:
   - Click "Append Further Evidence" -> Add a note: "--- [Update] Seller also forgot the charger ---" + 1 photo.
   - Verify all evidence stacks chronologically without erasing your initial claim.
6. On a SECOND disputed order: Click "Retract Dispute" -> Verify status shows "Dispute Retracted — Funds scheduled for release in 24h".
```

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 6 CHECKLIST FOR SELLERS (Role B)*:
1. Open your Dashboard -> Notice the order status has moved to "Disputed".
2. Open the dispute details view.
3. Review the buyer's claims and photos in the WhatsApp-style chat timeline.
4. Submit your Seller Defense: "Item was brand new and inspected before dispatch. See packaging photo."
5. Attach your pre-dispatch waybill photo -> Submit Response.
```

#### ⚖️ Role C: Dispute Arbiters
```
📋 *DAY 6 CHECKLIST FOR ARBITERS (Role C)*:
1. Go to /admin-portal/dashboard?tab=disputes.
2. Click on the active dispute -> Open the "Arbitration 360° Intelligence Dossiers":
   - Inspect Buyer Dossier: Check lifetime orders, dispute rate %, and serial disputer flags.
   - Inspect Seller Dossier: Check dispute health score, GMV, and store rating.
3. Read the color-coded unified chat stream between buyer and seller.
4. Click "Post Arbiter Instruction" -> Type: "Both parties please provide clear photo of device IMEI / Serial Number within 24h." -> Send.
5. Verify both parties receive an SMS/Email alert of the arbiter instruction.
6. 📸 *Post in WhatsApp*: Screenshot of the 360° Dossier and chat timeline.
```

---

## 📅 DAY 7: Item Return Subsystem, Reverse Pickup OTP & Rulings

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 7 BRIEFING* 🌅
🎯 *Today's Focus*: Dispute Rulings (4 Types), Return Subsystem & 6-Digit Reverse Pickup OTP
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- ⚖️ Dispute Arbiters (Role C - Heavy)
- 🛒 Buyers (Role A - Moderate)
- 🏬 Sellers (Role B - Moderate)
- 💰 Finance Admins (Role E - Light)

Today Arbiters will rule on disputes! We will test all 4 settlement outcomes: Release to Seller, Full Buyer Refund, Partial Split, and the Item Return Subsystem with Reverse Pickup OTP! 🔄
```

---

### 👤 Role-Specific Instruction Cards for Day 7

#### ⚖️ Role C: Dispute Arbiters
```
📋 *DAY 7 CHECKLIST FOR ARBITERS (Role C)*:
Open /admin-portal/dashboard?tab=disputes and execute these 4 rulings on different test disputes:
1. 🔹 Ruling 1: "Release Funds to Seller" -> Enter ruling notes -> Execute.
2. 🔹 Ruling 2: "Full Refund to Buyer" -> Verify automated refund is queued to buyer's MoMo.
3. 🔹 Ruling 3: "Partial Split Settlement" -> Set: GHS 600 to Seller, GHS 400 to Buyer, GHS 20 Platform Fee -> Execute.
4. 🔹 Ruling 4: "Require Item Return From Buyer" -> Set return window (3 days) -> Execute -> Verify status becomes "Return in Progress".
```

#### 🛒 Role A: Consumer Buyers (Return Flow)
```
📋 *DAY 7 CHECKLIST FOR BUYERS (Role A)*:
1. Open the order where Arbiter ruled "Return in Progress".
2. Click "Dispatch Return Package".
3. Select "Informal Bus Return":
   - Enter Driver Phone, Bus Car Number (e.g. "AS 9912-23"), Destination Station (e.g. "Kaneshie Station"), and Return Waybill photo.
4. Submit -> You will receive a 6-Digit "Reverse Pickup OTP". Save this code!
5. 📸 *Post in WhatsApp*: Screenshot of your Return Dispatch receipt with the Reverse OTP.
```

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 7 CHECKLIST FOR SELLERS (Role B)*:
1. Open the returned order in your Dashboard.
2. Click "Confirm Return Received".
3. Enter the 6-Digit Reverse Pickup OTP provided by the buyer -> Confirm.
4. Verify the order moves to "Refunded" and the buyer receives their refund confirmation!
```

---

## 📅 DAY 8: Seller Health Governance, Non-Dispatch & Appeals

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 8 BRIEFING* 🌅
🎯 *Today's Focus*: 4-Day Non-Dispatch Auto-Cancellation, Default Penalties & Suspension Appeals
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 🏬 Sellers (Role B - Heavy)
- 🛡️ Compliance Officers (Role D - Heavy)
- 🛠️ Lead QA (Role G - Heavy)

Today we test platform discipline! What happens when a seller fails to ship within 4 days? We test the automated 100% buyer refund, the seller non-dispatch penalty, merchant auto-suspension, and the Appeals Desk! ⚖️
```

---

### 👤 Role-Specific Instruction Cards for Day 8

#### 🛠️ Role G: Lead QA / Test Manager
```
📋 *DAY 8 COORDINATOR ACTION*:
1. Run backend task to simulate 4-day dispatch expiration:
   `python manage.py shell -c "from apps.escrow.tasks import check_expired_dispatches; print(check_expired_dispatches())"`
2. Notify Seller #4 that their account is now suspended due to simulated non-dispatch defaults.
```

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 8 CHECKLIST FOR SELLERS (Role B)*:
1. Log in to your seller account that had undispatched orders.
2. Verify order was auto-cancelled with "Auto-Cancelled Non-Dispatch = True".
3. Go to /ledger -> Verify your wallet was charged the Non-Dispatch Default Penalty (Platform Fee + 1.95% Gateway Fee).
4. Notice your account is Suspended:
   - Try to create a new payment link -> Verify you are blocked by the Suspension Notice modal.
5. Click "Submit Suspension Appeal" -> Enter your remediation statement -> Submit appeal.
6. 📸 *Post in WhatsApp*: Screenshot of your Suspension Appeal submission.
```

#### 🛡️ Role D: KYC & Compliance Officers
```
📋 *DAY 8 CHECKLIST FOR COMPLIANCE (Role D)*:
1. Go to /admin-portal/dashboard?tab=appeals.
2. Review the merchant's appeal statement and past performance metrics.
3. Click "Approve & Reinstate Seller".
4. Have the seller refresh their page -> Verify they can create links again immediately!
5. Verify "Clean Slate Reinstatement": Check that historical defaults do not immediately re-suspend them on the next check.
```

---

## 📅 DAY 9: Double-Entry Financial Ledger & Payout Modes

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 9 BRIEFING* 🌅
🎯 *Today's Focus*: Double-Entry Ledger Audit, Instant vs. Manual Payouts, Bank Verification & Arbiter Batches
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 💰 Finance Admins (Role E - Heavy)
- 🏬 Sellers (Role B - Moderate)
- ⚖️ Dispute Arbiters (Role C - Light)

Financial integrity day! Our Finance team will audit the immutable double-entry ledger to verify every pesewa ($Assets = Liabilities + Equity$). Sellers will test Manual Wallet Withdrawals vs. Instant Payouts! 📊
```

---

### 👤 Role-Specific Instruction Cards for Day 9

#### 💰 Role E: Finance Admins & Accountants
```
📋 *DAY 9 CHECKLIST FOR FINANCE ADMINS (Role E)*:
1. Go to /admin-portal/dashboard?tab=funds.
2. Check the real-time double-entry balance sheet:
   - 🏦 System Bank Assets (Paystack clearing account)
   - 🔒 Buyer Escrow Deposits (Liability)
   - 💼 Seller Wallet Liabilities (Liability)
   - 📈 Platform Fee Revenue (Revenue)
   - 📉 Gateway Fee Expenses (Expense)
3. Mathematical Audit Formula:
   Verify that: Total Debits == Total Credits (Difference MUST be GHS 0.00).
4. Go to /admin-portal/dashboard?tab=finance -> Review resolved Arbiter cases:
   - Select pending arbiter earnings -> Click "Create Arbiter Payout Batch" -> Verify batch executes cleanly.
5. 📸 *Post in WhatsApp*: Screenshot of the zero-imbalance ledger audit sheet!
```

#### 🏬 Role B: Store Merchants (Sellers)
```
📋 *DAY 9 CHECKLIST FOR SELLERS (Role B)*:
1. Go to /profile -> Switch "Payout Mode" from "Instant Payout" to "Manual Withdrawal".
2. Complete a test sale -> Verify funds accumulate in your Available Wallet Balance (not paid out instantly).
3. In /ledger -> Click "Request Payout / Withdrawal":
   - Select Mobile Money or Bank Account.
   - Enter your bank name and account number.
   - Confirm withdrawal -> Verify Paystack transfer fee is deducted accurately and transaction reference is logged.
```

---

## 📅 DAY 10: Promo Codes, Referral Engine & Marketplace Directory

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 10 BRIEFING* 🌅
🎯 *Today's Focus*: Promo Codes, Seasonal Fee Overrides, Double-Sided Referrals & Marketplace Search
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 🛒 Buyers (Role A - Heavy)
- 🏬 Sellers (Role B - Heavy)
- 🛠️ Lead QA (Role G)

Growth & Marketing day! We will test promo code fee discounts, double-sided referral bonuses (GHS 15 for referrer / GHS 10 for referee), and the 16-category marketplace search directory! 🎁
```

---

### 👤 Role-Specific Instruction Cards for Day 10

#### 🛒 Role A & 🏬 Role B: All Testers (Referrals & Marketplace)
```
📋 *DAY 10 CHECKLIST (ALL TESTERS)*:

🎁 *TEST 1 — DOUBLE-SIDED REFERRAL ENGINE*:
1. Tester 1: Go to /referrals -> Copy your unique referral link (/ref/YOUR-CODE) -> Send to Tester 2 in WhatsApp.
2. Tester 2: Open referral link in incognito window -> Register a new account -> Complete a qualifying purchase (>= GHS 50).
3. Once order is completed, both check /referrals:
   - Tester 1 (Referrer) receives GHS 15.00 wallet bonus credits!
   - Tester 2 (Referee) receives GHS 10.00 discount credits!
4. Anti-Self Referral Test: Try registering using your own referral link -> Verify system blocks self-referral!

🏷️ *TEST 2 — PROMO CODES ON CHECKOUT*:
1. Open a payment link -> On checkout screen, enter Promo Code: 'BETA2026' (20% Fee Discount) or 'WELCOME10'.
2. Verify platform fee is discounted while the seller's merchandise price remains 100% protected!

🛍️ *TEST 3 — MARKETPLACE DIRECTORY & BALLPARK SEARCH*:
1. Go to /shops -> Filter by 16 category pills (e.g. Phones, Fashion, Gaming, Solar).
2. Test Ballpark Search: Type partial words (e.g. "iph 128", "sneakers") -> Verify matching stores and products appear.
```

---

## 📅 DAY 11: Edge Cases, Concurrency & Mobile Stress Testing

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 11 BRIEFING* 🌅
🎯 *Today's Focus*: Edge Cases, Concurrency Race Conditions, Network Interruptions & Mobile Stress
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 👥 ALL ROLES (A, B, C, D, E, F, G) — Maximum Stress Testing!

Today we try to break the platform! Double-clicks, rapid clicks, network dropouts midway through payments, pressing Back buttons, and unauthorized page access. Put your stress-tester hat on! 💥
```

---

### 👤 Role-Specific Instruction Cards for Day 11

#### 👥 All Testers: Edge Case & Security Attack Checklist
```
📋 *DAY 11 DESTRUCTIVE / EDGE-CASE TESTING MATRIX*:

⚡ *1. RAPID DOUBLE-CLICK TEST*:
- On checkout, rapidly double-click "Pay Now".
- On dispute resolution, rapidly double-click "Approve & Release".
- 👉 Verify: Button disables immediately; NO duplicate transactions or double payouts occur.

⚡ *2. CONCURRENT RELEASE VS DISPUTE RACE*:
- Buyer has order open on phone ready to click "Approve & Release".
- Arbiter has same order open on laptop ready to click "Full Refund".
- Both click at the EXACT same second!
- 👉 Verify: First transaction commits cleanly; second is rejected with "Already Settled". Zero ledger corruption.

⚡ *3. NETWORK DROPOUT / REFRESH TEST*:
- Start Paystack payment -> Turn off Wi-Fi/Mobile Data for 20 seconds -> Turn data back on.
- 👉 Verify: Payment status recovers cleanly without creating a phantom order.

⚡ *4. PERMISSION / PRIVILEGE ESCALATION ATTACK*:
- Log in as a regular Buyer -> Try typing URL: /admin-portal/dashboard.
- 👉 Verify: System redirects you with "Access Denied" (HTTP 403).

⚡ *5. MOBILE BROWSER & KEYBOARD STRESS*:
- Complete full checkout and tracking on Android Chrome & iOS Safari.
- 👉 Verify: Virtual keyboard does not cover OTP boxes; no horizontal scrolling glitches.
```

---

## 📅 DAY 12: End-to-End Regression & Production Sign-Off

### 📢 Daily WhatsApp Broadcast Message (Copy & Paste at 10:00 AM)
```
🌅 *HENDAXIS TRUST UAT — DAY 12 FINAL ROUND* 🌅
🎯 *Today's Focus*: Bug Fix Retesting, Golden Path End-to-End Run, & Production Acceptance Sign-Off
⏱️ *Expected Time*: ~2 Hours
👥 *Active Roles*: 
- 👥 ALL TESTERS (Full Team)

Our final UAT testing day! Today we re-verify all fixed bug tickets, run one pristine Golden Path transaction from start to finish, and complete our production readiness sign-off! 🏆
```

---

### 👤 Role-Specific Instruction Cards for Day 12

#### 👥 All Testers: Final Verification & Sign-Off Checklist
```
📋 *DAY 12 FINAL SIGN-OFF CHECKLIST*:

🔍 *1. BUG VERIFICATION QUEUE (First 45 Mins)*:
- Open the Bug Tracker / Verified Fix list posted in WhatsApp.
- Retest the specific bugs you reported on Days 1–11.
- If fixed -> Reply: "BUG-XXX VERIFIED FIXED ✅".
- If still failing -> Reply: "BUG-XXX STILL FAILING ❌" with new screenshot.

🌟 *2. THE GOLDEN PATH END-TO-END RUN (45 Mins)*:
Execute one complete pristine transaction across all roles:
1. Seller creates payment link (GHS 500 + GHS 30 shipping) with promo code eligible.
2. Buyer applies promo code 'WELCOME10' and pays via MTN MoMo Sandbox.
3. Seller dispatches via Bus Transport with WebP waybill.
4. Buyer tracks upfront on /track using 6-digit OTP.
5. Buyer confirms delivery receipt -> 24h inspection begins.
6. Buyer clicks "Approve & Release Funds" -> Funds hit Seller Wallet instantly.
7. Buyer writes 5-Star verified review -> Seller replies.
8. Finance Admin confirms Ledger shows 0.00 GHS balance discrepancy!

📝 *3. UAT ACCEPTANCE POLL*:
- Complete the final 3-question UAT readiness poll in the WhatsApp group!
```

---

## 🐞 Standard WhatsApp Bug Report Format (Pin in Group)

*When a tester encounters an issue, they copy and fill out this exact message in WhatsApp:*

```
🚨 *BUG REPORT* 🚨
- *Tester*: [Your Name]
- *Role*: [Buyer / Seller / Arbiter / Compliance / Finance]
- *Device & OS*: [e.g. iPhone 13, iOS 17 / Samsung A53, Android 13]
- *Browser*: [e.g. Chrome Mobile / Safari / Firefox Desktop]
- *Feature / URL*: [e.g. /create-link, /track, /l/abc-123]
- *Steps to Reproduce*:
  1. 
  2. 
  3. 
- *Expected Result*: [What should happen]
- *Actual Result*: [What actually happened]
- *Severity*: 🔴 Critical / 🟠 High / 🟡 Medium / 🔵 Low
- *Screenshot / Screen Recording*: [Attach photo/video]
```
