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

## 2. Creating a Payment Link & 4-Day Seller Dispatch Rule
Sellers can create secure Payment Links to send to their buyers.

1. **Log in** to your Seller Dashboard and click **Create Payment Link**.
2. Enter item details: Title, Description, Price in GHS, and Shipping Fee.
3. **Choose Fee Handling**:
   - **Absorb Fee**: Seller pays the platform fee. The buyer pays only the exact item price.
   - **Pass to Buyer**: The buyer pays the item price + platform fee. Seller receives 100% of their item price.
4. **4-Day Seller Dispatch Guarantee**: Once the buyer pays, the seller has **4 days (96 hours)** to dispatch the package.
   - If the seller fails to dispatch within 4 days, the order is automatically cancelled.
   - The buyer gets a **100% full refund** (including all fees).
   - The defaulting seller is charged a **Non-Dispatch Default Penalty** (Platform Fee + gateway charges).

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

## 5. Tiered Buyer Inspection Period
Once delivery is confirmed, the buyer inspection timer starts automatically:

- **Inspection Timeframes**:
  - `< GHS 2,000`: **24 Hours**
  - `GHS 2,000 – GHS 9,999.99`: **48 Hours**
  - `>= GHS 10,000`: **72 Hours**
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
- **Dispute Fund Allocation & Extra Fee Rules**:
  - Incurred shipping costs are non-refundable if shipping was performed.
  - Managers can specify platform retained fees or levy custom extra penalty fees for damaged/incorrect items. Any unallocated split funds accrue to platform fee revenue.
- **1MB Image Compression**: Accumulated dispute photos are compressed server-side to $\le 1\text{MB}$ total per transaction post-resolution.

---

## 7. Escrow-Gated Reviews & Trustpilot Rating Framework
- **Escrow-Gated Reviews**: Only buyers who have completed an escrow purchase can rate a seller.
- **3-Axis Ratings**: Speed, Communication, and Overall Satisfaction (1 to 5 stars).
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
Superusers can manage system operations live from the Manager Portal (`/admin`):

- **Active Payment Gateway Switcher**: Switch live checkout payment engine between **Paystack**, **AppsNMobile (Orchard API)**, and **Hubtel Ghana PSP**.
- **Fulfillment Method Toggles**: Enable or disable entire shipping channels (**Formal Courier API** vs. **Informal Bus / Station OTP**).
- **Courier Provider Controls**: Toggle availability of individual courier providers (**DHL**, **FedEx**, **UPS**, **EMS**, **Speedaf**, **Others**) to enforce approved logistics channels.
