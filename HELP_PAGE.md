# HendAxis Trust: How It Works & Platform Guide (Source of Truth)

Welcome to **HendAxis Trust**, the secure bridge between buyers and sellers. We protect your money and your merchandise using state-of-the-art escrow technology, double-entry accounting, strict dispatch guarantees, multi-carrier parcel tracking, and a verified Trustpilot-style seller rating system.

Whether you are an Instagram vendor, a marketplace shopper, or an independent contractor, HendAxis Trust ensures you get what you paid for—or you get paid for what you sent.

---

## 1. Seller Profile, Storefront & Identity Verification
To build trust with buyers, sellers can customize their public store presence and apply for verified status:

- **Store Presentation**: Specify your **Shop Name**, **Shop Description**, and choose **up to 3 Product Categories** (e.g. Electronics, Fashion, Beauty) to display on your public store page (`/store/:username`) and the Marketplace Directory (`/shops`).
- **Identity & Business License Submission**: On your Profile page, upload your **Ghana Card / National ID number**, **Ghana Card photo**, and optional **Business Registration License**.
- **Strict `🛡️ Verified Seller` Badge Rule**: The `🛡️ Verified Seller` badge is **NEVER** granted automatically based on completed escrows alone. Management MUST manually inspect and approve your submitted identity documents in the Manager Portal before your store displays the official Verified badge. Unverified stores are labeled as `🆕 New Shop`.

---

## 2. Creating a Payment Link & Configurable Seller Dispatch Rule
Sellers can create secure Payment Links to send to their buyers.

1. **Log in** to your Seller Dashboard and click **Create Payment Link**.
2. Enter item details: Title, Description, Price in GHS, and Shipping Fee.
3. **Choose Fee Handling**:
   - **Absorb Fee**: Seller pays the platform fee. The buyer pays only the exact item price.
   - **Pass to Buyer**: The buyer pays the item price + platform fee. Seller receives 100% of their item price.
4. **Configurable Seller Dispatch Guarantee**: Once the buyer pays, the seller must dispatch the package within the platform-configured dispatch window (default: **4 days / 96 hours**, managed via **Gateway & Logistics Settings** in the Admin Portal).
   - If the seller fails to dispatch within the configured timeframe, the order is automatically cancelled.
   - The buyer gets a **100% full refund** (including all fees).
   - The defaulting seller is charged a **Non-Dispatch Default Penalty** (Platform Fee + gateway charges).
5. **Stale Transaction Management & Manual Payment Check**: Unpaid transaction entries auto-archive after the platform's configured duration (`unpaid_auto_archive_days`, default: 3 days). Sellers can click the **Check Payment** button to manually query gateway completion before archiving. If payment is confirmed, the transaction auto-unarchives (`is_archived = False`).

---

## 3. Making a Payment & Multi-Gateway Support (For Buyers)
1. **Open the Payment Link**: View the item description, total price, and clear merchant identification showing the **Shop Name** along with the `@username` handle.
2. **Enter Delivery Details**: Provide your Name, Phone Number, and Shipping Address.
3. **Pay via Active Payment Gateway**: Use Mobile Money (MTN MoMo, Telecel Cash, AT Money) or Bank Card (Visa, Mastercard).
   - **Supported Payment Engines**: **Paystack Multi-Channel**, **AppsNMobile (The Orchard API)**, and **Hubtel Ghana PSP**. The active checkout gateway is managed dynamically by platform administration.
4. **Escrow Hold**: Your money is held securely in the **HendAxis System Escrow Account**. The seller is notified to dispatch your package within 4 days.

---

## 4. Dispatch & Logistics Tracing (DHL, FedEx, UPS, EMS, Speedaf & 17Track)
Sellers must dispatch items promptly after receiving payment notification:

- **WebP Package Photo**: Sellers attach a photo of the packaged item during dispatch for verification.
- **Path A (Formal Courier Delivery)**: Seller selects their courier provider and enters the tracking number:
  - **Supported Couriers**: **DHL Express**, **FedEx Express**, **UPS**, **EMS / Ghana Post**, **Speedaf Express**, and **Others (Custom Local Courier / Rider)**.
  - **Direct Tracking Links**: HendAxis Trust automatically generates live package tracking links (`Track Package ↗`) for both buyer and seller.
  - **Universal Tracking Webhooks (17TRACK & ShipEngine API)**: Automated status webhooks (`/api/delivery/webhooks/...`) notify HendAxis Trust the moment a carrier marks a package as `DELIVERED`, automatically triggering the inspection period.
- **Path B (Informal Station / Bus OTP Delivery)**: Seller enters driver phone, vehicle number, and destination station. The buyer receives driver details and a Secret 6-Digit OTP to present at the station. Once the OTP is verified, delivery is confirmed.

---

## 5. Tiered Buyer Inspection Period, Full-Screen Lightbox & 60s OTP Cooldown
Once delivery is confirmed, the buyer inspection timer starts automatically:

- **Inspection Timeframes**:
  - `< GHS 2,000`: **24 Hours**
  - `GHS 2,000 – GHS 9,999.99`: **48 Hours**
  - `>= GHS 10,000`: **72 Hours**
- **60-Second OTP SMS Cooldown**: Confirmation code requests enforce a 60-second cooldown between SMS dispatches, saving costs while keeping the first generated OTP valid.
- **Full-Screen Image Lightbox**: Product and parcel inspection photos feature a full-screen zoom lightbox modal with 90° rotation and download controls.
- **Automatic Completion & Rating Modal**: Once the buyer confirms receipt via their 6-digit confirmation code, payment is released to the seller, and the **3-Axis Rate Seller Modal** automatically launches on screen so the buyer can instantly leave a review.

---

## 6. How Disputes, 24-Hour Settlement & Manager Extra Fees Work
If a buyer receives a damaged or incorrect item during the inspection period:

- **Buyer Claim & Evidence Modal**: Clicking **Raise Dispute** opens an interactive modal where the buyer enters their claim description and uploads up to **5 evidence photos**.
- **Seller Counter Response**: The seller receives SMS & Email notifications and can submit a counter statement with up to **5 seller evidence photos**.
- **Dispute Review Suppression**: Raising a dispute automatically suppresses and clears any reviews or star ratings submitted for that transaction.
- **24-Hour Dispute Settlement**: Rulings execute payouts within **24 hours**:
  - **Buyer Refund**: Issued via the **same payment medium** (MoMo/Card) used at checkout.
  - **Seller Payout**: Sent to seller's registered payout details or credited to seller's HendAxis Trust wallet.
- **Dispute Rulings & Buyer Item Returns (`REQUIRE_RETURN_FROM_BUYER`)**:
  - Rulings can require the buyer to return the item (`RETURN_IN_PROGRESS`) within the configured return dispatch window (e.g. 3 days).
  - **Buyer Return Dispatch**: Buyers can dispatch returns via **Formal Courier** (Courier name, tracking #, waybill photo) or **Informal Bus** (Driver phone, car registration, destination station, waybill photo).
  - **Reverse Pickup OTP**: Generates a 6-digit Reverse OTP for informal bus returns to ensure safe handoff back to the seller.
  - **Seller Return Verification & Auto-Refund**: The seller verifies return receipt intact (or inputs the Reverse OTP) to release a full refund to the buyer. If the seller does not raise an objection within the configured return auto-refund window (e.g. 48 hours), the system automatically processes the refund payout.
- **Dispute Fund Allocation & Extra Fee Rules**:
  - Incurred shipping costs are non-refundable if shipping was performed.
  - Managers can specify platform retained fees or levy custom extra penalty fees for damaged/incorrect items. Any unallocated split funds accrue to platform fee revenue.
- **1MB Image Compression**: Accumulated dispute photos are compressed server-side to $\le 1\text{MB}$ total per transaction post-resolution.

---

## 7. Escrow-Gated Reviews, Hardened Security & Rating Lock
- **1 Review Per Transaction**: Enforced via a `SellerReview.transaction` `OneToOneField` constraint. Submitting feedback again for an existing order updates the original review.
- **Transit Rating Lock**: Rating a seller is locked while a package is in transit (`AWAITING_PAYMENT`, `PAYMENT_RECEIVED`, `DELIVERY_IN_PROGRESS`) with a clear tooltip/badge (`🔒 Rate Seller (Unlocks upon delivery)`). Rating unlocks upon delivery and inspection.
- **Cryptographic Review Token (`buyer_review_token`)**: Auto-generated upon purchase and returned strictly in buyer-facing checkout responses. Sellers never receive or see this token, preventing sellers from forging or altering buyer reviews.
- **$0-Cost Email Magic Link Fallback**: Buyers editing a review from a new device can request a free magic link emailed to `buyer_email` (`/reviews/request-edit-link`).
- **Public Storefront (`/store/:username`)**: Shows seller ratings, public review feedback, and seller replies.

---

## 8. Marketplace Directory & Paid Shop Promotion (`/shops`)
- **Public Marketplace**: Buyers can explore seller shops, filter by product categories, and search products.
- **Paid Shop Promotions (`⚡ Featured Ad`)**: Sellers can feature their store at the top of the directory (GHS 50 for 7 Days / GHS 150 for 30 Days).

---

## 9. Superuser Platform Funds & Double-Entry Ledger Audit
- Real-time balances across System Bank Assets, Buyer Escrow Deposits, Platform Fee Revenue, Gateway Fee Expenses, and Seller Wallet Liabilities.
- Comprehensive ledger entries audit, date filtering, and multi-column sorting.

---

## 10. Admin Settings & System Controls (`⚙️ Gateway & Logistics Settings`)
Superusers (`is_superuser == True`) can manage system operations and timeline parameters live from the Manager Portal (`/admin`):

- **Active Payment Gateway Switcher**: Switch live checkout payment engine between **Paystack**, **AppsNMobile (Orchard API)**, and **Hubtel Ghana PSP**.
- **Unpaid Auto-Archive Duration**: Configure the number of days (`unpaid_auto_archive_days`, default: 3 days) before uncompleted orders auto-archive.
- **Fulfillment Method Toggles**: Enable or disable entire shipping channels (**Formal Courier API** vs. **Informal Bus / Station OTP**).
- **Courier Provider Controls**: Toggle availability of individual courier providers (**DHL**, **FedEx**, **UPS**, **EMS**, **Speedaf**, **Others**) to enforce approved logistics channels.
- **Order Shipping & Inspection Timelines**: Adjust platform-wide timelines without touching underlying code:
  - **Seller Shipping Deadline**: Default `4` days (96 hours).
  - **Auto-Delivery Window**: Default `48` hours.
  - **Return Dispatch Window**: Default `3` days (72 hours).
  - **Return Auto-Refund Window**: Default `48` hours.
  - **Tiered Buyer Inspection Periods**: Tier 1 (< GHS 2k): 24h, Tier 2 (GHS 2k–10k): 48h, Tier 3 (>= GHS 10k): 72h.
- **Strict Superuser Access**: Access to Gateway & Logistics Settings is strictly restricted to accounts with `is_superuser == True` to maintain system security.

---

## 11. Developer Portal, API Keys & Drop-in SDK (`/developers`)
HendAxis Trust provides a full developer platform for third-party developers, custom web apps, and e-commerce stores (Shopify, WooCommerce, custom React/Node/PHP apps) to integrate escrow services directly into their platforms:

- **Merchant Developer Settings (`/dashboard/developer`)**:
  - Generate **Live** (`pk_live_...` / `sk_live_...`) and **Test** (`pk_test_...` / `sk_test_...`) API Key pairs.
  - **Secret Key Security**: Secret keys are stored using SHA-256 hashes in the database and displayed **only once** upon generation. Use `X-HendAxis-Secret-Key` for server-to-server requests.
- **REST APIs (`/api/v1/v1/`)**:
  - `POST /api/v1/v1/escrow/create`: Programmatically create an escrow order and receive a secure checkout URL.
  - `GET /api/v1/v1/escrow/{transaction_id}`: Query order escrow status, inspection timeline, and courier tracking details.
  - `POST /api/v1/v1/escrow/{transaction_id}/dispatch`: Programmatically mark orders as dispatched.
- **Drop-in JavaScript SDK (`sdk.js`)**:
  - Embed an HendAxis Escrow Modal checkout directly on your storefront using `HendAxis.pay({ publicKey: "pk_live_...", amount: 150.00 })`.
- **HMAC SHA-256 Webhooks**:
  - Register Webhook Endpoint URLs to receive instant, signed POST payloads for events (`escrow.paid`, `escrow.dispatched`, `escrow.completed`, `escrow.disputed`, `escrow.refunded`). All payloads include `X-HendAxis-Signature` headers for payload verification.
- **Interactive Documentation**: Full code snippets in **cURL**, **Node.js**, **Python**, and **PHP** available at `/developers` and `/docs/api`.

---

## 12. Automated SMS & Email Multi-Channel Notification Suite
HendAxis Trust incorporates an event-triggered notification suite powered by Celery, Twilio/Arkesel SMS, and SendGrid Email:

- **Payment Received**: Instant SMS & Email sent to both seller (to dispatch item) and buyer (with order tracking receipt).
- **Package Dispatched**: Sent to buyer with live courier tracking links or informal bus details + Secret Delivery OTP.
- **6-Hour Pre-Dispatch Expiry Warning**: Sent to seller 6 hours before the 4-day dispatch deadline to prevent order cancellation.
- **Delivery Reminders & Auto-Confirm**: Automated SMS & Email reminders sent to buyer before auto-confirming delivery.
- **Dispute Notifications**: Instant alert sent to seller when a dispute is opened, and resolution outcome sent to both parties once arbitrated.
- **Return Dispatch & Receipt**: Sent to seller with return courier/bus tracking details + Reverse OTP, and confirmation sent to buyer upon refund completion.
- **Seller Payout Completed**: Sent to seller upon successful disbursement of funds to their wallet or bank account.

---

## 13. Seller Dispute Health Monitoring & Account Suspension
To protect buyers and platform integrity, HendAxis Trust dynamically monitors seller dispute metrics:

- **Multi-Window Dispute Rate Calculation**: Evaluates dispute percentages across (1) Last 30 Days, (2) Last 15 Sales, and (3) Lifetime Sales. System applies the window with the highest rate among sets with `paid_transactions > 5` to prevent low-volume sample distortion.
- **Tiered Dashboard Banners & Notifications**:
  - **Yellow Alert Banner (20% – 29.9% Dispute Rate)**: Displays an inline caution banner on the seller dashboard.
  - **Orange Warning Banner (30% – 39.9% Dispute Rate)**: Displays a high-priority warning banner and sends an email notification to the seller.
  - **Red Suspension Banner (≥ 40% Dispute Rate or Manual Action)**: Account is suspended (`is_suspended = True`).
- **Enforcement & Admin Controls**:
  - **Link Deactivation**: Active payment links are automatically disabled.
  - **Creation & Checkout Block**: Link creation and checkout access are blocked with HTTP 403.
  - **Manual Admin Controls**: Administrators can manually suspend or reinstate sellers anytime in `/admin-portal`.


