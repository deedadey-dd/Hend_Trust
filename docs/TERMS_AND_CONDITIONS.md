# 📜 HendAxis Trust: Terms of Service & Master User Agreement

**Last Updated**: October 10, 2026  
**Effective Date**: Immediate upon account creation, payment link creation, or transaction initialization.

---

## 1. Introduction & Acceptance of Terms

Welcome to **HendAxis Trust** (referred to herein as *"HendAxis Trust"*, *"Platform"*, *"We"*, *"Us"*, or *"Our"*). HendAxis Trust operates an escrow-gated payment, merchant directory, logistics tracing, dispute arbitration, and buyer-seller protection platform designed to facilitate secure commerce between Buyers and Sellers (collectively referred to as *"Users"*, *"You"*, or *"Your"*).

By accessing or using HendAxis Trust (including visiting public storefronts, creating payment links, completing checkout, or registering an account), You explicitly agree to be bound by this Master User Agreement (*"Terms"*). **If You do not agree to all provisions contained herein, You must immediately cease all access and use of the Platform.**

---

## 2. Platform Role & Limitation of Liability (Indemnification)

### 2.1 Neutral Technology & Escrow Facilitator
HendAxis Trust is a neutral financial technology software provider and escrow intermediary. HendAxis Trust **is not** the manufacturer, seller, distributor, courier, owner, or insurer of any physical goods, digital assets, or services transacted through Payment Links or the Marketplace Directory.

### 2.2 Disclaimer of Warranties
All services, escrow functionality, and transactions are provided on an **"AS IS"** and **"AS AVAILABLE"** basis. HendAxis Trust makes no representations or warranties, express or implied, regarding:
- The quality, safety, legality, merchantability, or fitness for a particular purpose of any items listed or sold by merchants.
- The punctuality, performance, or reliability of third-party courier services (such as DHL, Speedaf, FedEx, UPS, EMS, or independent station drivers).

### 2.3 Comprehensive Platform Indemnification
You agree to defend, indemnify, and hold harmless HendAxis Trust, its parent company, subsidiaries, affiliates, officers, directors, employees, software engineers, and agents from and against any and all claims, liabilities, damages, losses, costs, penalties, or legal fees (including attorney fees) arising out of or related to:
1. Your breach of any provision of these Terms.
2. Product defects, counterfeit items, personal injury, property damage, or misrepresentations associated with goods sold or bought via the Platform.
3. Your violation of any third-party rights, including intellectual property, privacy, or consumer protection laws in Ghana or international jurisdictions.
4. Any failure by a Seller to package or ship items safely.
5. Any informal, offline, or unrecorded dispatch arrangements conducted outside of HendAxis Trust tracking systems.

---

## 3. Pre-Transaction Due Diligence, Location-Based Shipping & Direct Communication

### 3.1 Requirement for Thorough Pre-Purchase Discussion
Before initiating an escrow transaction or sending payment, **Buyers and Sellers must thoroughly discuss and agree upon all relevant details**, including but not limited to:
- Precise item condition (brand new, pre-owned, refurbished, minor defects).
- Specific sizing, color, technical specifications, and model numbers.
- **Location-Based Delivery Fees**: Shipping costs in Ghana vary substantially by regional destination, district, and chosen transport method (e.g. Courier or Bus station). Listed marketplace prices exclude destination-specific shipping. Buyers and sellers must agree on the final delivery fee prior to checkout.
- **Inquiry & Tailored Link Generation**: When buyers inquire on WhatsApp via marketplace product cards, prefilled product parameters are transmitted to the seller. The seller is required to confirm location-specific shipping and generate a customized payment link reflecting the agreed terms.

HendAxis Trust provides public merchant profile scorecards, verified ratings, and 16-category listings to assist Buyers, but the primary duty of item specification and delivery fee agreement rests between the transacting parties.

---

## 4. Payment Links, Product Categorization, Escrow Holds & Fee Policies

### 4.1 Accurate Product Categorization
Sellers are required to select the accurate **Product Category** (from the 16 platform categories) when generating payment links. Misrepresenting product categories to circumvent platform policies or mislead buyers constitutes a breach of these Terms.

### 4.2 Escrow Deposits
Upon payment by the Buyer via Mobile Money (MTN, Telecel, AT Money) or Card, 100% of the funds (item price, shipping fees, and applicable platform charges) are deposited into the **HendAxis System Escrow Account**. Funds remain strictly locked and inaccessible to the Seller until delivery confirmation and inspection expiry.

### 4.3 Fee Allocation Options
When creating a Payment Link, the Seller selects how platform fees are handled:
- **Absorb Fee**: Platform fees are deducted from the Seller’s item price upon payout. The Buyer pays only the exact item + shipping cost.
- **Pass to Buyer**: Platform fees are added to the checkout total, resulting in the Buyer paying the item price + shipping + platform fee. The Seller receives 100% of their listed item price upon completion.

---

## 5. Seller Packaging, Shipping & 4-Day Dispatch Guarantee

### 5.1 Seller Responsibility for Safe Packaging
Sellers bear **sole and absolute responsibility** for packaging items in a secure, protective, tamper-proof, and transit-resilient manner:
- Items must be packed with adequate cushioning (bubble wrap, box reinforcement, moisture protection) suitable for rough road transport or handling.
- Damage, breakage, or leakage caused by inadequate packaging is the **exclusive fault of the Seller**. HendAxis Trust will rule in favor of a full refund to the Buyer if item damage is attributable to poor packaging.

### 5.2 Mandatory Seller Dispatch Timeframe, Pre-Expiry Warnings & Default Penalties
Once a Buyer completes payment into escrow, the Seller must dispatch the item within the platform-configured dispatch window (typically **4 days / 96 hours**):
1. **Timely Dispatch & Package Evidence**: The Seller must attach a clear WebP photo of the packaged parcel and provide valid tracking details (Courier Waybill or Station Bus Driver details).
2. **Progressive Pre-Expiry Warning Disclosures**: Sellers receive progressive automated warnings (via SMS & Email) at **24 hours** and **6 hours** prior to expiration, explicitly detailing the calculated non-dispatch default penalty (Platform Fee + 1.95% Gateway Processing Fee) chargeable upon expiration.
3. **Automatic Cancellation on Non-Dispatch**: If the Seller fails to log dispatch within the stipulated window, the transaction is **automatically cancelled by the system** (`auto_cancelled_non_dispatch = True`).
4. **Buyer Full Refund Guarantee**: The Buyer is immediately issued a **100% full refund** (including all item costs, shipping fees, and platform charges) credited back to their original payment medium.
5. **Seller Non-Dispatch Penalty Authorization**: The defaulting Seller explicitly authorizes HendAxis Trust to levy a **Non-Dispatch Default Penalty** equal to the **Platform Fee + 1.95% payment gateway processing fee**. This penalty will be debited from the Seller’s Wallet balance or deducted from future transaction payouts.
6. **Dispatch Expiry Governance & Account Suspension**: Sellers who accumulate a non-dispatch expiry rate of $\ge 20\%$ will receive warning notifications; sellers with an expiry rate of $\ge 35\%$ (with at least 5 paid transactions) will be **automatically suspended** from creating new payment links or accepting new orders.

---

## 6. Buyer Order Cancellations, Seller Dispatch Verification Grace Period & Delayed Payout Safety Buffer

### 6.1 Cancellation Eligibility & Pre-Dispatch Requirement
Buyers may request cancellation only for orders that have not yet been marked dispatched (`PAYMENT_RECEIVED`). Once a transaction has transitioned to `DELIVERY_IN_PROGRESS`, direct buyer cancellation is barred, and the standard delivery/dispute workflow applies.

### 6.2 90-Minute Seller Dispatch Verification Grace Window
To prevent bad-faith cancellations where a seller has physically handed over a package to a transporter but has not yet updated the platform:
1. **Initiation & Status**: Submitting a cancellation request places the transaction into an active **90-Minute Seller Verification Grace Window** (`cancellation_payout_status = 'PENDING_CONFIRMATION'`).
2. **Instant Seller Alert**: The platform immediately dispatches an urgent SMS and Email notification to the Seller prompting verification.
3. **Seller Acceptance**: If the Seller has not shipped, they can accept the cancellation immediately (`accept-cancellation`). The transaction is marked `CANCELLED` and moves into the 90-minute safety payout buffer.
4. **Seller Confirmation of Prior Dispatch**: If the Seller has already handed the parcel to a courier, they can click **"I Already Shipped"** (`reject-cancellation-shipped`) to submit the carrier name, waybill / tracking code, and dispatch notes. This immediately halts the cancellation, records the dispatch proof, and transitions the order to `DELIVERY_IN_PROGRESS`.
5. **Automated Expiry**: If 90 minutes elapse with no seller response, the system auto-confirms the cancellation.

### 6.3 90-Minute Delayed Payout Safety Hold Buffer & Arbitration Freeze
1. **Safety Hold Duration**: Confirmed cancellations enter a **90-minute Delayed Payout Safety Buffer** (`cancellation_payout_status = 'HELD_DELAYED'`) prior to final outbound refund payout.
2. **Seller Emergency Report & Freeze**: If a Seller was offline during the 90-minute grace window but physically shipped the parcel prior to cancellation, they may submit their waybill proof during the 90-minute hold (`report-shipped-freeze`). This **immediately freezes outbound payout disbursement** and escalates the transaction to `DISPUTED` under HendAxis Arbitration.
3. **Automatic Matured Disbursement**: If no seller dispute report is lodged during the 90-minute hold, the delayed refund is automatically processed.

### 6.4 Buyer Account Requirement & Transparent Fee Deductions
1. **Account Creation for Guest Buyers**: Guest buyers must specify an account password during cancellation. Net refunds are credited directly to their In-App Wallet or Mobile Money account, ensuring immediate balance accessibility.
2. **Transparent Deductions**:
   - The non-refundable Platform Escrow Protection Fee is retained by the platform.
   - Payout transfer fees charged by payment providers (1.95% Paystack processing fee) are deducted from direct Mobile Money disbursements ($0 fee for In-App Wallet credits).

### 6.5 Anti-Abuse Rate Limiting
Buyers are strictly restricted to a maximum of **2 cancellations per rolling 30-day period** (`buyer_monthly_cancel_limit = 2`). Excessive cancellation attempts beyond this quota are blocked by the system.

### 6.6 Mandatory Dispatch Recording & Total Platform Indemnity
> [!IMPORTANT]
> **Sellers are legally required to log parcel dispatch on the platform prior to physical handover.**
> HendAxis Trust bears **zero financial liability or obligation** for parcels dispatched offline where the seller failed to record tracking details on the platform before the cancellation grace and safety hold buffers elapsed.

---

## 7. Photo & Media Evidence Policy

### 7.1 Binding Legal Evidence
All photos, images, waybill documents, and media uploaded to HendAxis Trust (including dispatch parcel photos, buyer unboxing photos, and dispute evidence attachments) constitute **binding legal evidence** in platform arbitrations and legal proceedings.

### 7.2 Best Practices for Media Verification
- **Sellers**: Are strongly advised to film the item condition and packaging process prior to sealing the parcel.
- **Buyers**: Are strongly advised to record a continuous unboxing video when opening the received parcel.
- **Dispute Uploads**: In the event of a dispute, Buyers and Sellers may upload up to 5 high-resolution evidence photos. Uploaded images are compressed server-side to $\le 1\text{MB}$ post-resolution for permanent audit trail retention.

---

## 8. Delivery Paths & Inspection Period Expiry

### 8.1 Delivery Verification Paths
- **Path A (Formal Courier)**: Integrated with carrier webhooks (DHL, Speedaf, FedEx, UPS, EMS). Delivery is verified automatically when the carrier updates package status to `DELIVERED`.
- **Path B (Informal Bus / Station)**: Verified when the Buyer presents a Secret 6-Digit OTP to the station driver, or manually confirms receipt.

### 8.2 Tiered Inspection Window
Once delivery is verified, the Buyer Inspection Period commences:
- **Orders < GHS 2,000**: 24 Hours
- **Orders GHS 2,000 – GHS 9,999.99**: 48 Hours
- **Orders $\ge$ GHS 10,000**: 72 Hours

### 8.3 CRITICAL: Irreversibility of Inspection Expiry
> [!IMPORTANT]
> **Upon the expiration of the tiered Inspection Period (or upon the Buyer manually confirming receipt via OTP), the escrow hold is permanently terminated, and funds are automatically transferred into the Seller’s Wallet.**

**AFTER THE INSPECTION PERIOD EXPIRES OR RECEIPT IS CONFIRMED:**
- **No disputes can be opened on the Platform.**
- **No refunds or chargebacks will be processed by HendAxis Trust.**
- **All funds belong unconditionally to the Seller.**
- Buyers explicitly waive all rights to claim platform arbitration once the inspection period has elapsed. Any post-inspection recourse must be pursued independently between the Buyer and Seller outside of HendAxis Trust.

---

## 9. Disputes, Dialogue Trail, Retraction & Item Returns

### 9.1 Dispute Initiation & Subsequent Evidence Appending
If a Buyer receives a damaged, defective, or incorrect item, they must click **Raise Dispute** on their tracking page **before the Inspection Period expires**. Raising a dispute immediately freezes escrow funds and halts automated payouts.
- **Continuous Dialogue & Evidence Trail**: Both Buyers and Sellers can append subsequent statements, clarifications, and photo evidence to active disputes without overwriting existing history.
- **Evidence Limit**: Parties can accumulate up to **5 WebP photographic evidence files** throughout the dispute lifecycle.
- **Transparent Audit**: All statements are recorded with chronological timestamps in the unified WhatsApp-style dispute timeline.

### 9.2 Arbitration & 24-Hour Settlement
HendAxis Trust support management will review all uploaded evidence (photos, description, dispatch proof, and dialogue history) and issue a **final binding ruling within 24 hours**.

### 9.3 Buyer Item Return Obligations (`REQUIRE_RETURN_FROM_BUYER`)
Where a dispute ruling requires the Buyer to return the item to the Seller:
1. **Return Dispatch**: The Buyer must ship the item back within the specified return window via Courier (with waybill & tracking number) or Bus transport (with driver phone, car registration, and station details).
2. **Reverse Pickup OTP**: For bus returns, a **Secret 6-Digit Reverse OTP** is generated. The Seller must inspect the returned parcel and verify the Reverse OTP (or confirm receipt in app) to unlock the full refund payout to the Buyer.
3. **Auto-Refund Window**: If the Seller receives the returned item but fails to object within 48 hours of return delivery, the system will automatically process the Buyer’s refund.

### 9.4 Dispute Retraction & Private Settlement Policy
If a Buyer and Seller resolve their grievances privately (e.g., replacement sent, direct discount, or technical assistance), the Buyer may elect to **Retract Dispute** directly via their tracking portal.
1. **24-Hour Delayed Settlement Window**: Upon dispute retraction, the transaction transitions into `RETRACTED_SETTLING` status. Escrow funds are held for **24 hours** (or the administrative configured settlement period) before releasing to the Seller's wallet. This grace period prevents accidental or coerced retractions.
2. **Rating Permanently Voided**: Once a dispute is raised—even if subsequently retracted—the Buyer forfeits the ability to submit a merchant satisfaction rating (`rating_voided = True`). This prevents coercive settlement deals made under the threat of negative reviews.

---

## 10. Merchant Identity Verification, Health Governance & Suspension Appeals

### 10.1 Verification Rules
- The **Verified Seller 🛡️** badge is granted **exclusively** via manual inspection of Ghana Card / National ID and Business Registration documents by HendAxis Trust administration.
- Completed transactions do not automatically grant Verified status. Unverified stores will display as `🆕 New Shop`.
- Submitting fraudulent identity documents will result in immediate account termination, wallet freezing, and referral to law enforcement agencies (Ghana Police Service / Cyber Security Authority).

### 10.2 Account Suspension, In-Flight Orders & Reinstatement Appeals
- **Suspension Enforcement**: Accounts suspended due to high dispute rates ($\ge 40\%$), low customer ratings ($< 2.0$ stars), or high dispatch expiry rates ($\ge 35\%$) will have active payment links disabled and cannot generate new links.
- **In-Flight Order Continuity**: In-flight orders paid prior to suspension remain active and proceed to normal delivery, inspection, and settlement.
- **Suspension Appeals**: Suspended merchants may submit a formal appeal with remediation steps via their dashboard.
- **Reinstatement & Clean Slate**: When an appeal is approved by platform administrators, the seller is granted a clean slate (`reinstated_at = timezone.now()`). Only subsequent transactions will be evaluated for future health monitoring.

---

## 11. System Enforcement & User Consent Integration

To ensure full compliance across all platform touchpoints:
1. **Merchant Registration**: Users must accept these Terms during account sign-up.
2. **Payment Link Creation**: Sellers must acknowledge fee schedules, dispatch rules, packaging liabilities, and platform indemnity prior to link generation.
3. **Buyer Checkout**: Buyers must explicitly check **"I agree to the HendAxis Trust Terms of Service and Inspection Expiry Rules"** prior to initiating payment.

---

## 12. Governing Law & Dispute Jurisdiction

These Terms are governed by and construed in accordance with the laws of the **Republic of Ghana**. Any legal suit, action, or proceeding arising out of or related to these Terms or the services provided by HendAxis Trust shall be instituted exclusively in the competent courts of Accra, Ghana.
