# HendAxis Trust: How It Works & Platform Guide (Source of Truth)

Welcome to **HendAxis Trust**, the secure bridge between buyers and sellers. We protect your money and your merchandise using state-of-the-art escrow technology, double-entry accounting, strict dispatch guarantees, multi-carrier parcel tracking, and a verified Trustpilot-style seller rating system.

Whether you are an Instagram vendor, a marketplace shopper, or an independent contractor, HendAxis Trust ensures you get what you paid for—or you get paid for what you sent.

---

## 1. Seller Profile, Storefront & Identity Verification
To build trust with buyers, sellers can customize their public store presence and apply for verified status:

- **Store Presentation & 16-Category Taxonomy**: Specify your **Shop Name**, **Shop Description**, and choose **up to 3 Categories** from the 16 platform categories (Phones & Tablets, Computers & Tech, Electronics & Appliances, Fashion & Apparel, Beauty, Hair & Fragrances, Health & Wellness, Home, Furniture & Living, Automotive & Spare Parts, Baby, Kids & Toys, Groceries & Foodstuff, Jewelry & Watches, Sports, Outdoors & Fitness, Industrial, Tools & Hardware, Digital Goods & Gaming, Professional Services, General Marketplace) to display on your public store page (`/store/:username`) and the Marketplace Directory (`/shops`).
- **Identity & Business License Submission**: On your Profile page, upload your **Ghana Card / National ID number**, **Ghana Card photo**, and optional **Business Registration License**.
- **Strict `🛡️ Verified Seller` Badge Rule**: The `🛡️ Verified Seller` badge is **NEVER** granted automatically based on completed escrows alone. Management MUST manually inspect and approve your submitted identity documents in the Manager Portal before your store displays the official Verified badge. Unverified stores are labeled as `🆕 New Shop`.

---

## 2. Creating a Payment Link, Product Category Selection & Configurable Seller Dispatch Rule
Sellers can create secure Payment Links to send to their buyers.

1. **Log in** to your Seller Dashboard and click **Create Payment Link**.
2. **Enter Item Details**: Title, **Product Category** (pre-selected to your shop niche with override options), Description, Price in GHS, and optional Shipping Fee.
3. **Choose Fee Handling**:
   - **Platform Fee Formula**: Calculated transparently as $(\text{Item Price} + \text{Shipping Fee}) \times 1.5\% + \text{GHS } 10.00$.
   - **Absorb Fee**: Seller pays the platform fee. The buyer pays only the exact item price + shipping. The fee is deducted from the seller's final wallet payout.
   - **Pass to Buyer (Default)**: The buyer pays the item price + shipping + platform fee at checkout. Seller receives 100% of their item and shipping amount.
   - *Tip*: Sellers and buyers can use the **Escrow Fee Calculator** on the home page or `/how-it-works` to simulate exact figures anytime.
4. **Location-Based Shipping & WhatsApp 1-Click Escrow Generator**:
   - Because shipping across Ghana varies by destination (e.g. Greater Accra vs. Kumasi or Tamale), buyers inquiring via the marketplace send pre-filled product parameters to the seller on WhatsApp (`/create-link?title=...&price=...&category=...`).
   - When the seller agrees on delivery terms with the customer, tapping the WhatsApp link opens `/create-link` with product details already filled. The seller enters the agreed shipping fee, taps **Create Escrow Payment Link**, and shares the link back to the buyer.
5. **Configurable Seller Dispatch Guarantee & Progressive Reminders**: Once the buyer pays, the seller must dispatch the package within the platform-configured dispatch window (default: **4 days / 96 hours**, managed via **Gateway & Logistics Settings** in the Admin Portal).
   - **Progressive Pre-Expiry Reminders**:
     - At **24 Hours Remaining**: Seller receives an SMS & Email reminder outlining the exact itemized penalty (Platform Fee + 1.95% Gateway Processing Fee) charged if they default.
     - At **6 Hours Remaining**: Seller receives an urgent final warning alert.
   - **Default Cancellation & Non-Dispatch Penalty**: If the seller fails to dispatch within the configured timeframe:
     - The order is automatically cancelled (`auto_cancelled_non_dispatch = True`).
     - The buyer gets an immediate **100% full refund** (including all fees).
     - The defaulting seller is charged the itemized **Non-Dispatch Default Penalty** (Platform Fee + 1.95% gateway charges).
6. **Stale Transaction Management & Manual Payment Check**: Unpaid transaction entries auto-archive after the platform's configured duration (`unpaid_auto_archive_days`, default: 3 days). Sellers can click the **Check Payment** button to manually query gateway completion before archiving. If payment is confirmed, the transaction auto-unarchives (`is_archived = False`).

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

## 5. Upfront 2-Step OTP Tracking & Tiered Buyer Inspection Period
Once delivery is initiated, buyers can track shipments with full privacy and convenience:

- **Upfront 2-Step OTP Package Tracking**:
  - Both **Track by Order ID** (single parcel) and **Full Order History** are protected by a secure 6-digit OTP sent to the buyer's phone number.
  - **2-Hour Token Validity**: Once verified, your tracking session remains unlocked for **2 hours**, allowing instant access to package details and action buttons ("View Full Details & Actions", "+ Add Dispute Details", "Confirm Receipt", "Raise Dispute", "⭐ Rate Seller") without repetitive popups or interruptions.
  - **60-Second SMS Cooldown**: A cost-saving 60-second cooldown prevents spam while keeping the active OTP code valid.
- **Inspection Timeframes**:
  - `< GHS 2,000`: **24 Hours**
  - `GHS 2,000 – GHS 9,999.99`: **48 Hours**
  - `>= GHS 10,000`: **72 Hours**
- **Full-Screen Image Lightbox**: Product, dispatch waybills, and parcel inspection photos feature a full-screen zoom lightbox modal with 90° rotation and download controls.
- **Automatic Completion & Rating Modal**: Once the buyer confirms receipt via their 6-digit confirmation code, payment is released to the seller, and the **3-Axis Rate Seller Modal** automatically launches on screen so the buyer can instantly leave a review.

---

## 6. How Disputes, Dialogue Trail, Retraction & 24-Hour Settlement Work
If a buyer receives a damaged, defective, or incorrect item during the inspection period:

- **Dispute Initiation & Evidence Upload**: Clicking **Raise Dispute** opens an interactive modal where the buyer enters their claim description and uploads up to **5 WebP evidence photos**.
- **Continuous Dialogue & Evidence Appending**: Both buyers and sellers can append ongoing follow-up messages and additional photos to active disputes. Every message is timestamped (`--- [Buyer Update (Timestamp)] ---` and `--- [Seller Response (Timestamp)] ---`), preserving the complete historical record without overwriting previous evidence (up to 5 cumulative photos).
- **WhatsApp-Style Dispute Dialogue Trail**:
  - Displays messages in a conversational timeline across the buyer tracking portal (`/l/:id`), Tracking Modal, Seller Dashboard, and Admin Portal.
  - **Color-Coded Bubbles**: Buyer statements are styled on the left (Rose badge/background), Seller statements on the right (Emerald badge/background), Arbitrator notes in the center (Purple card), and Dispatch Waybill / Retraction cards prominently highlighted.
  - **Interactive Features**: Long statements (> 260 characters) include a clean `Read more / Show less` toggle, and long conversation trails (> 4 messages) collapse neatly with an expandable banner.
- **Dispute Retraction & 24-Hour Private Settlement**:
  - If a buyer and seller resolve their issue amicably outside arbitration (e.g. seller sends a direct replacement or discount), the buyer can click **Retract Dispute / Settle Privately**.
  - **24-Hour Delay Hold**: Upon retraction, escrow funds enter a 24-hour grace period (`RETRACTED_SETTLING`) before releasing to the seller's wallet, ensuring protection against accidental or forced retractions.
  - **Rating Voidance**: Once a dispute has been opened, the rating capability is permanently voided (`rating_voided = True`) to prevent review manipulation or coercive settlement tactics.
- **24-Hour Dispute Settlement (Arbitration)**: Platform support reviews all submitted evidence and dialogue, issuing a binding ruling within **24 hours**:
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
- **Arbitration 360° Buyer & Seller Intelligence Dossiers**:
  - **Buyer Intelligence**: Arbiters can inspect the complete buyer profile by querying their **phone number, email address, or user ID**, retrieving total lifetime orders, GMV spent, active escrow holds, dispute frequency rate %, serial disputer alerts, retracted dispute history, verified Ghana Card KYC status, and known physical delivery destinations.
  - **Seller Intelligence**: Arbiters can inspect the complete merchant store dossier with 1-click, reviewing active payment links, lifetime revenue, wallet balance & payout details, customer review breakdown (speed & communication), and automated escrow health triggers.
- **1MB Image Compression**: Accumulated dispute photos are compressed server-side to $\le 1\text{MB}$ total per transaction post-resolution.

---

## 7. Escrow-Gated Reviews, Edit Auditing & Rating Lock
- **1 Review Per Transaction**: Enforced via a `SellerReview.transaction` `OneToOneField` constraint.
- **Dedicated "Your Verified Review" Card**: Once a buyer rates a seller, the order tracking page (`/l/:id` and Tracking Modal) replaces the generic rating button with a structured card displaying the buyer's overall star score, speed and communication breakdown, review comment, initial submission date, and seller's public reply.
- **Brand Palette (#ff6d1d & #0363ff)**: Star rating cards, verified badges, and active rating chips match the HendAxis Trust brand palette.
- **Transparent Edit Counter & Timestamps (`edit_count`)**:
  - Buyers can click **"✏️ Edit Review"** to update their ratings or comments anytime.
  - Every update increments an internal `edit_count` and updates the timestamp (`updated_at`).
  - The review card and modal transparently display: `Edited X times • Last edited on [Date]` (or `(Edited Xx)` in public store feeds), preventing silent replacement and maintaining review integrity.
- **Transit Rating Lock**: Rating a seller is locked while a package is in transit (`AWAITING_PAYMENT`, `PAYMENT_RECEIVED`, `DELIVERY_IN_PROGRESS`) with a clear tooltip/badge (`🔒 Rate Seller (Unlocks upon delivery)`). Rating unlocks upon delivery and inspection.
- **Cryptographic Review Token (`buyer_review_token`)**: Auto-generated upon purchase and returned strictly in buyer-facing checkout responses. Sellers never receive or see this token, preventing sellers from forging or altering buyer reviews.
- **$0-Cost Email Magic Link Fallback**: Buyers editing a review from a new device can request a free magic link emailed to `buyer_email` (`/reviews/request-edit-link`).
- **Public Storefront (`/store/:username`)**: Shows seller ratings, public review feedback, edit badges, and seller replies.

---

## 8. Marketplace Directory, Ballpark Search & Verified Stores (`/shops`)
- **Ballpark Multi-Token Search Engine**: Search active products across titles, descriptions, categories, and merchant names. Matches ballpark multi-word queries (e.g., *"iphone pro 256"*, *"bluetooth speaker"*).
- **Structured 3-Tier Layout**:
  1. **Verified Escrow Stores**:
     - **Row 1**: Featured Sponsored stores (`⚡ Featured Ad`).
     - **Rows 2 & 3**: Standard verified merchants with direct *"Visit Storefront"* links and WhatsApp/Phone contact icons.
     - Expandable *"View All Verified Stores (N)"* toggle.
  2. **Recent Customer Reviews Carousel**: Displays verified buyer feedback when browsing.
  3. **Matched Products & Escrow Offers**: Product cards displaying price, escrow guarantee badge, category tag, location-based shipping notice, and 1-click WhatsApp inquiry buttons.
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
- **Progressive Pre-Dispatch Expiry Warnings**:
  - **24 Hours Before Expiry**: Sent to seller detailing exact itemized non-dispatch penalty (Platform Fee + 1.95% Gateway Fee).
  - **6 Hours Before Expiry**: Sent to seller as high-priority final warning to prevent automated cancellation.
- **Delivery Reminders & Auto-Confirm**: Automated SMS & Email reminders sent to buyer before auto-confirming delivery.
- **Dispute Notifications**: Instant alert sent to seller when a dispute is opened, and resolution outcome sent to both parties once arbitrated.
- **Return Dispatch & Receipt**: Sent to seller with return courier/bus tracking details + Reverse OTP, and confirmation sent to buyer upon refund completion.
- **Seller Payout Completed**: Sent to seller upon successful disbursement of funds to their wallet or bank account.

---

## 13. Seller Health Governance, Rating Rules, Dispatch Expiry & Suspension Appeals
To protect buyers and ensure high merchant reliability, HendAxis Trust actively monitors seller performance metrics:

1. **Dispute Rate Governance (Multi-Window)**:
   - Evaluates dispute percentages across (1) Last 30 Days, (2) Last 15 Sales, and (3) Lifetime Sales, applying the highest rate among sets with `paid_transactions >= 5`.
   - **Yellow Alert Banner (≥ 20% Dispute Rate)**: Inline caution banner on seller dashboard.
   - **Orange Warning Banner (≥ 30% Dispute Rate)**: High-priority dashboard banner and email warning.
   - **Red Suspension Banner (≥ 40% Dispute Rate)**: Account suspension (`is_suspended = True`).

2. **Customer Rating Governance**:
   - **Rating Warning Banner (< 3.0 Stars)**: Caution alert on seller dashboard.
   - **Rating Auto-Suspension (< 2.0 Stars with ≥ 3 Reviews)**: Automatically suspends account and disables active payment links.

3. **Dispatch Expiry Governance**:
   - **Dispatch Expiry Warning Banner (≥ 20% Non-Dispatch Rate)**: Amber caution banner on seller dashboard.
   - **Dispatch Expiry Auto-Suspension (≥ 35% Non-Dispatch Rate with ≥ 5 Txns)**: Account suspension and link deactivation.

4. **In-Flight Order Continuity**:
   - Suspended sellers retain the ability to fulfill, dispatch, and complete all orders that were already paid prior to suspension.

5. **Payment Link Creation Suspension UX & Appeals**:
   - Attempting to generate a payment link while suspended opens an **Account Suspended Modal** explaining the exact reason and providing an inline appeal submission form.
   - Appeals are routed to **Tab 4 (Suspension Appeals Desk)** in the Admin Portal for management review.

6. **Post-Reinstatement Clean Slate & Immunity Protection**:
   - When an administrator reinstates a seller or approves an appeal, `reinstated_at = timezone.now()` is set.
   - Subsequent health checks only evaluate orders created **after** reinstatement, protecting reinstated merchants from immediate re-suspension and requiring 5 new transactions before threshold evaluation restarts.


