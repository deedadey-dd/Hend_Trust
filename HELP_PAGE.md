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

## 3. Making a Payment & Frictionless Buyer Accounts (For Buyers)
1. **Open the Payment Link**: View the item description, total price, and clear merchant identification showing the **Shop Name** along with the `@username` handle.
2. **Checkout Modes (Authenticated 0-OTP vs. Guest Shopper)**:
   - **Logged-In Buyers (1-Click Init)**: If you have a HendAxis buyer account, your name, phone, and email are filled automatically, and payment initializes in **1 click with zero SMS OTPs**.
   - **Guest Shoppers**: Enter your phone number and verify via a quick 6-digit SMS OTP to initialize payment securely.
3. **Pay via Active Payment Gateway**: Use Mobile Money (MTN MoMo, Telecel Cash, AT Money) or Bank Card (Visa, Mastercard).
   - **Supported Payment Engines**: **Paystack Multi-Channel**, **AppsNMobile (The Orchard API)**, and **Hubtel Ghana PSP**. The active checkout gateway is managed dynamically by platform administration.
4. **Post-Checkout Buyer Account & Dual Verification**: Immediately after checkout on your order page (`/l/:id`), you can create a permanent buyer account simply by choosing a password. The system sends an activation link to your email and an SMS OTP to your phone. Entering the phone OTP confirms phone possession and logs you in instantly, while an unobtrusive reminder banner helps you confirm your email anytime with 1-click resend. Once logged in, you skip all future checkout SMS OTPs.
5. **Escrow Hold**: Your money is held securely in the **HendAxis System Escrow Account**. The seller is notified to dispatch your package within 4 days.

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

## 5. Order Tracking, 1-Click Receipt Confirmation & Tiered Buyer Inspection Period
Once delivery is initiated, buyers can track shipments and confirm orders with complete ease:

- **Order Tracking Options**:
  - **Logged-In Buyers**: Opening the **Track Order** modal (`/tracking`) or visiting **My Purchases** (`/dashboard?tab=purchases`) instantly displays all active and completed orders with **zero OTPs required**.
  - **Guest Shoppers (Upfront 2-Step OTP)**: Unauthenticated visitors enter their phone number or Order Reference and verify via a 6-digit SMS OTP, unlocking a secure 2-hour session.
- **1-Click Delivery Confirmation & Payout Release**:
  - **Logged-In Buyers**: Click **"⚡ Confirm Receipt (1-Click)"** to transition the package to the inspection period, or **"✓ Approve & Release Payment"** to disburse funds to the seller in 1 click without entering SMS codes.
  - **Guest Shoppers**: Enter the 6-digit confirmation code sent to your phone/email to confirm receipt.
- **Inspection Timeframes**:
  - `< GHS 2,000`: **24 Hours**
  - `GHS 2,000 – GHS 9,999.99`: **48 Hours**
  - `>= GHS 10,000`: **72 Hours**
- **Full-Screen Image Lightbox**: Product, dispatch waybills, and parcel inspection photos feature a full-screen zoom lightbox modal with 90° rotation and download controls.
- **Automatic Completion & Rating Modal**: Once delivery is confirmed and funds are released, the **3-Axis Rate Seller Modal** automatically launches so the buyer can leave verified feedback.

---

## 6. How Disputes, Dialogue Trail, Retraction, 48-Hour Arbiter Escalation & Settlement Work
If a buyer receives a damaged, defective, or incorrect item during the inspection period:

- **Standardized Dispute Categories & 10-Character Minimum**:
  - Clicking **Raise Dispute** opens an interactive modal where the buyer selects from **7 Standardized Dispute Categories**:
    1. `ITEM_NOT_RECEIVED` (Item Not Received / Missing Delivery)
    2. `ITEM_DAMAGED` (Item Damaged / Broken during transit or upon receipt)
    3. `ITEM_DIFFERENT_FROM_DESCRIPTION` (Item Significantly Different from Description)
    4. `DEFECTIVE_OR_NON_FUNCTIONAL` (Defective / Counterfeit / Non-Functional)
    5. `WRONG_SIZE_OR_SPEC` (Wrong Size, Color, or Technical Specification)
    6. `INCOMPLETE_MISSING_ITEMS` (Incomplete Package / Missing Accessories)
    7. `OTHER_VIOLATION` (Other Policy or Agreement Violation)
  - **10-Character Minimum Requirement**: The claim explanation requires a strict minimum of 10 characters with a live character counter (`{count}/10 min chars`) to prevent blank or trivial submissions.
  - **Evidence Upload**: The buyer can upload up to **5 WebP evidence photos**.
- **Continuous Dialogue & Evidence Appending**: Both buyers and sellers can append ongoing follow-up messages and additional photos to active disputes. Every message is timestamped (`--- [Buyer Update (Timestamp)] ---` and `--- [Seller Response (Timestamp)] ---`), preserving the complete historical record without overwriting previous evidence (up to 5 cumulative photos).
- **WhatsApp-Style Dispute Dialogue Trail & Center-Aligned Arbiter Notices**:
  - Displays messages in a conversational timeline across the buyer tracking portal (`/l/:id`), Tracking Modal, Seller Dashboard, and Admin Portal.
  - **Color-Coded Bubbles**: Buyer statements are styled on the left (Rose badge/background), Seller statements on the right (Emerald badge/background), Arbitrator notes and instructions in the center (Purple card with scale icon `⚖️`), and Dispatch Waybill / Retraction cards prominently highlighted.
  - **Interactive Features**: Long statements (> 260 characters) include a clean `Read more / Show less` toggle, and long conversation trails (> 4 messages) collapse neatly with an expandable banner.
- **Arbiter Instructions & Notices During Active Dispute (Without Resolving)**:
  - During the mediation process, the assigned Arbiter can post direct instructions, information requests, deadlines, or warnings to both parties without concluding or resolving the dispute.
  - Each instruction appears prominently **center-aligned** in the conversation trail with author attribution and timestamp (e.g. `⚖️ Arbiter Instruction (by Name)`).
  - Both buyer and seller receive automated instant SMS and Email notifications containing the Arbiter's instruction and order link.
- **Request Arbiter Decision (Configurable 48-Hour Escalation Window)**:
  - Both buyers and sellers are initially given a direct negotiation window to communicate and resolve their issue.
  - After **48 hours** (governed by the platform setting `arbiter_escalation_hours`), an interactive **"⚡ Request Arbiter Decision"** button activates on the dispute timeline for **both buyer and seller**.
  - Clicking this button flags the dispute as **Priority Escalation** (`⚡ ARBITER DECISION REQUESTED`), sends automated SMS & Email alerts, and moves the case directly to the top of the Admin / Arbiter Queue for prompt mediation.
- **Dispute Retraction & 24-Hour Private Settlement**:
  - If a buyer and seller resolve their issue amicably outside arbitration (e.g. seller sends a direct replacement or discount), the buyer can click **Retract Dispute / Settle Privately**.
  - **24-Hour Delay Hold**: Upon retraction, escrow funds enter a 24-hour grace period (`RETRACTED_SETTLING`) before releasing to the seller's wallet, ensuring protection against accidental or forced retractions.
  - **Rating Voidance**: Once a dispute has been opened, the rating capability is permanently voided (`rating_voided = True`) to prevent review manipulation or coercive settlement tactics.
- **External Arbitration, 100% Cost Assumption & Platform Indemnity**:
  - **Cost Assumption**: If either party chooses to elevate the dispute to any external arbitration tribunal, statutory arbitration body, or court of law, that party (or both parties mutually) shall **bear 100% of all costs, filing fees, legal fees, and administrative expenses incurred**.
  - **Platform Indemnity**: HendAxis Trust, its parent entity, directors, and agents are fully absolved, indemnified, and held harmless from any liabilities, damages, or legal expenses arising from external proceedings.
  - **Mandatory Written Order Upload**: HendAxis Trust will **NOT** release escrowed funds based on informal demands, telephone requests, or unilateral notifications. Escrow funds will strictly and only be released pursuant to an external ruling upon receipt, verification, and platform arbiter upload of an **authentic, certified, written binding order from the third-party arbitrator or court of competent jurisdiction**.
- **Dispute Settlement (Internal Arbitration)**: Platform support reviews all submitted evidence and dialogue, issuing a binding ruling within **24 hours**:
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

---

## 14. Promotions, Seasonal Fee Overrides, Cashback & Referral Program (`/referrals`)
HendAxis Trust incorporates a promotion, discount, and user loyalty engine designed to reward active buyers and merchants while maintaining double-entry financial integrity:

1. **Promo Codes & Checkout Reductions**:
   - **Supported Code Types**:
     - `PERCENTAGE`: Percentage deduction off the platform fee (e.g., 20% off platform escrow fee, with optional `max_discount_cap_ghs` cap).
     - `FIXED_GHS`: Flat pesewa-level fee deduction (e.g., GHS 10.00 off the platform escrow fee).
   - **Application at Checkout**: Buyers or sellers enter promo codes during checkout on `/l/:id` or payment modal initialization. Codes are validated via `POST /api/v1/escrow/validate-promo-code`.
   - **Eligibility & Usage Caps**:
     - `min_order_amount_ghs`: Minimum transaction value required to apply the code.
     - `usage_limit`: Maximum global redemptions across all users.
     - `per_buyer_limit`: Maximum redemptions permitted per individual user or phone number (e.g., 1 per customer).
     - `eligible_role`: Restrictions targeting `ALL`, `BUYER_ONLY`, or `SELLER_ONLY`.
     - `expires_at`: Automatic expiration timestamp.

2. **Seasonal / Festive Fee Overrides (`SeasonalFeeCampaign`)**:
   - Platform administrators can launch scheduled, site-wide fee relief campaigns during holidays and peak shopping periods (e.g., Black Friday, Christmas, Easter, Independence Day sales).
   - **5 Campaign Rule Types**:
     - `WAIVED`: 100% zero platform escrow fee (100% fee waiver).
     - `PERCENTAGE_DISCOUNT`: Percentage discount applied against the calculated escrow fee (e.g., 50% off standard fee).
     - `FIXED_DISCOUNT`: Flat deduction off the fee (e.g., GHS 5.00 off standard fee).
     - `REDUCED_PERCENTAGE`: Overrides the standard 1.5% variable fee rate to a lower rate (e.g., 0.5%).
     - `REDUCED_FIXED`: Overrides the standard GHS 10.00 base fee to a reduced fixed rate (e.g., GHS 5.00).
   - **Campaign Constraints**: Configurable `min_order_amount_ghs`, `max_discount_cap_ghs`, and active date ranges (`start_date` to `end_date`).
   - **Visual Prominence**: When active, promotional banners and discounted fee breakdowns automatically display across the Escrow Fee Calculator, `/how-it-works`, and checkout pages.

3. **Transaction Cashback & Reward Campaigns (`TransactionRewardCampaign`)**:
   - Automated reward issuance triggered upon delivery confirmation and inspection completion (`TRANSACTION_COMPLETED`).
   - **Reward Modes**: `FIXED_GHS` (flat bonus credit) or `PERCENTAGE_VOLUME` (percentage of escrow transaction GMV).
   - **Target Audiences**: Configurable for `BUYER_ONLY`, `SELLER_ONLY` (merchant platform fee offset credits), or `ALL`.
   - Rewards are automatically credited to the user's HendAxis Trust promotional credit balance.

4. **Double-Sided Referral Program (`/referrals` & `/dashboard?tab=referrals`)**:
   - **Unique Referral Links**: Every registered user receives a unique referral code and shareable invite link (`https://hendaxistrust.com/ref/:code`).
   - **Dual Reward Incentive**:
     - **Referrer Reward**: Default GHS 10.00 credited to the referrer upon successful referee qualification.
     - **Referee Reward**: Default GHS 5.00 welcome fee offset credit applied to the newly registered user.
   - **Qualification Trigger**: Referral rewards are unlocked the moment the invited referee completes their first successful escrow order of $\ge \text{GHS } 50.00$.
   - **Anti-Abuse Controls**: Built-in verification prevents self-referrals (same phone, email, device, or identity document). Users can earn rewards up to a platform maximum of 50 successful referrals.

5. **Manual Promotional Credits & Goodwill Fee Offsets**:
   - Management can issue manual promotional or compensatory credit grants (`CashbackLedgerRecord`) to any user by phone number, email address, or username with itemized audit remarks.
   - Credits can be applied against platform escrow fees on subsequent purchases or merchant sales.

6. **Discount Stacking Precedence & Financial Safety Guarantee**:
   - **Calculation Hierarchy**:
     $$\text{Base Fee} \longrightarrow \text{Seasonal Campaign Override} \longrightarrow \text{Promo Code Deduction} \longrightarrow \text{Wallet Cashback Credit} \longrightarrow \text{Fee Floor } (\ge \text{GHS } 0.00)$$
   - **Zero Negative Fee**: Stacking discounts cannot produce a negative platform fee; the lowest platform fee floor is GHS 0.00.
   - **Seller Payout Inviolability**: Discounts exclusively reduce platform escrow fees or are absorbed by marketing subsidies (`EXPENSE:PROMOTIONS_SUBSIDY`). The seller's agreed merchandise and shipping payout is **100% protected and never reduced by buyer promotions**.

---

## 11. Order Cancellations, 90-Minute Seller Dispatch Grace & 90-Minute Delayed Payout Hold Buffer

### For Buyers: How to Cancel an Order
1. **Locate Your Order**: Open your order tracking link or navigate to **My Purchases** on your dashboard (`/dashboard?tab=purchases`).
2. **Click "Cancel Order"**: If the order has not been dispatched (`PAYMENT_RECEIVED`), click the cancellation button to open the **Live Cancellation Fee Breakdown Modal**.
3. **Transparent Deductions**:
   - The platform transparently displays your gross payment, the deducted non-refundable Platform Escrow Fee, and the payment provider transfer fee (1.95% Paystack processing fee).
   - You can choose to receive your net refund into your **In-App Wallet** ($0 transfer fee) or direct to your **Mobile Money account** (subject to payment provider transfer fee).
4. **90-Minute Seller Verification Grace Window**:
   - Once submitted, the seller is sent an immediate urgent SMS alert with a **90-minute window** to verify if the parcel has already been shipped.
   - If the seller has not shipped, they can accept the cancellation immediately. If unconfirmed after 90 minutes, the platform auto-confirms the cancellation.
5. **90-Minute Delayed Payout Safety Buffer**:
   - Once confirmed, the refund enters a 90-minute safety buffer before final release, protecting both parties against offline logistics delays.
6. **Account Creation Requirement for Guest Shoppers**:
   - Guest shoppers must set a password during cancellation. This automatically creates their verified buyer account so refunded wallet balances can be accessed securely.
7. **Monthly Rate Limit**: Buyers are permitted a maximum of **2 cancellations per rolling 30-day period** to prevent bad-faith cancellation spam.

---

### For Sellers: How to Respond to a Buyer Cancellation Request
1. **Urgent Alert Received**: When a buyer requests cancellation, you receive an immediate SMS & Email notification alerting you of the 90-minute verification grace window.
2. **If You HAVE NOT Shipped Yet**:
   - Open your Seller Dashboard, locate the transaction marked with the amber **"Cancel Grace Period"** tag, and click **"Accept Cancel"**.
   - The cancellation is confirmed, and the buyer is scheduled for their net refund after the 90-minute safety buffer. You will not be penalized.
3. **If You ALREADY Shipped the Item**:
   - Click **"I Already Shipped"** on your dashboard before the 90-minute window expires.
   - Enter the carrier name (e.g. Speedaf, VIP Bus), waybill / tracking number, and dispatch notes.
   - Submitting this immediately halts the cancellation, records your dispatch proof, and advances the order to **In Transit / Delivery In Progress** (`DELIVERY_IN_PROGRESS`).
4. **Reporting Shipped During the 90-Minute Payout Hold Buffer**:
   - If an order was auto-confirmed because you were offline during the 90m window, but you physically shipped prior to cancellation, click **"Report Shipped (Freeze)"** during the 90-minute payout hold.
   - Enter your waybill and tracking evidence to immediately **freeze outbound refund payouts** and escalate the transaction to HendAxis Arbitration for review.
5. **Platform Protection & Legal Indemnity Rule**:
   - **Important**: Sellers must record dispatch details on the platform before handover. HendAxis Trust accepts zero financial liability for offline arrangements not recorded in platform tracking.




