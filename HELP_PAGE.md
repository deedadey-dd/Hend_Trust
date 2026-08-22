# HendAxis Trust: How It Works & Platform Guide

Welcome to **HendAxis Trust**, the secure bridge between buyers and sellers. We protect your money and your merchandise using state-of-the-art escrow technology, double-entry accounting, and a verified Trustpilot-style seller rating system.

Whether you are an Instagram vendor, a marketplace shopper, or an independent contractor, HendAxis Trust ensures you get what you paid for—or you get paid for what you sent.

---

## 1. Seller Profile, Storefront & Identity Verification
To build trust with buyers, sellers can customize their public store presence and apply for verified status:

- **Store Presentation**: Specify your **Shop Name**, **Shop Description**, and choose **up to 3 Product Categories** (e.g. Electronics, Fashion, Beauty) to display on your public store page (`/store/:username`) and the Marketplace Directory (`/shops`).
- **Identity & Business License Submission**: On your Profile page, upload your **Ghana Card / National ID number**, **Ghana Card photo**, and optional **Business Registration License**.
- **Strict `🛡️ Verified Seller` Badge Rule**: The `🛡️ Verified Seller` badge is **NEVER** granted automatically based on completed escrows alone. Management MUST manually inspect and approve your submitted identity documents in the Manager Portal before your store displays the official Verified badge. Unverified stores are labeled as `🆕 New Shop`.

---

## 2. Creating a Payment Link (For Sellers)
Sellers can create secure Payment Links to send to their buyers.

1. **Log in** to your Seller Dashboard and click **Create Payment Link**.
2. Enter item details: Title, Description, and Price in GHS.
3. **Choose Fee Handling**:
   - **Absorb Fee**: Seller pays the platform fee. The buyer pays only the exact item price.
   - **Pass to Buyer**: The buyer pays the item price + platform fee. Seller receives 100% of their item price.
4. **Share the Link**: Send the unique URL to your buyer via WhatsApp, Instagram, or SMS.

---

## 3. Making a Payment (For Buyers)
1. Buyer opens the Payment Link and reviews item details, shipping costs, and fee breakdown in GHS.
2. Buyer pays securely via **Paystack** (Mobile Money or Card).
3. **Funds are locked in Escrow**: Money is held safely in double-entry clearing accounts while SMS and Email notifications (with direct action links) are sent to both parties.

---

## 4. Dispatch & Logistics Verification
Sellers must dispatch items promptly after receiving payment notification:

- **Optional Package Photo**: Sellers can upload a photo of the packaged item during dispatch for extra delivery assurance.
- **Path A (Formal Courier Delivery)**: Seller enters tracking number. Courier API webhooks notify HendAxis Trust when the package is delivered.
- **Path B (Informal Station / Bus OTP Delivery)**: Seller enters driver phone, vehicle number, and destination station. The buyer receives driver details and a Secret 6-Digit OTP to present at the station. Once the OTP is verified, delivery is confirmed.

---

## 5. Tiered Buyer Inspection Period
Once delivery is confirmed, the buyer inspection timer starts automatically:

- **Inspection Timeframes**:
  - `< GHS 2,000`: **24 Hours**
  - `GHS 2,000 – GHS 9,999.99`: **48 Hours**
  - `>= GHS 10,000`: **72 Hours**
- **Automatic Completion**: If the buyer approves or the inspection timer expires without a dispute, funds are released automatically to the seller's wallet.
- **Navbar Tracking Modal**: Anyone can track order status or check tracking history using the 2-tab OTP / Order ID tracking modal accessible directly from the top navigation bar.

---

## 6. How Disputes & 5-Image Evidence Work
If a buyer receives a damaged or incorrect item during the inspection period:

- **Buyer Claim & Evidence**: Buyers raise a dispute with a claim description and up to **5 evidence photos**.
- **Seller Counter Response**: The seller receives SMS & Email notifications and can submit a counter statement with up to **5 seller evidence photos**.
- **Dispute Review Suppression**: Raising a dispute automatically suppresses and clears any reviews or star ratings submitted for that transaction.
- **Manager Arbitration**: Platform managers inspect evidence in high-resolution lightboxes, upload manager ruling photos, and execute binding rulings (Release to Seller, 100% Refund to Buyer, or Custom Partial Split).

---

## 7. Escrow-Gated Reviews & Trustpilot Rating Framework
- **Escrow-Gated Reviews**: Only buyers who have completed an escrow transaction can rate a seller.
- **3-Axis Ratings**: Speed, Communication, and Overall Satisfaction (1 to 5 stars).
- **Public Storefront (`/store/:username`)**: Shows seller ratings, public review feedback, and seller replies.

---

## 8. Marketplace Directory & Paid Shop Promotion (`/shops`)
- **Public Marketplace**: Buyers can explore seller shops, filter by product categories, and search products.
- **Paid Shop Promotions (`⚡ Featured Ad`)**: Sellers can feature their store at the top of the directory (GHS 50 for 7 Days / GHS 150 for 30 Days).
- **Flexible Ad Payment**:
  - **Wallet Balance**: Fee is debited from available seller wallet funds.
  - **Direct Paystack Checkout**: If wallet balance is insufficient, sellers are seamlessly redirected to Paystack to complete ad payment.

## 9. Superuser Platform Funds & Ledger Audit Studio
Superusers and platform administrators have complete visibility over all financial accounts and double-entry ledger records:

- **Complete Financial Breakdown**: Real-time account balances for System Bank Assets, Buyer Escrow Deposits, Platform Fee Revenue, Paystack Fee Expenses, and total Seller Wallet Liabilities.
- **Ledger Entries Audit & Filtering**:
  - Filter ledger entries by **Entry Type** (`BUYER_DEPOSIT`, `ESCROW_RELEASE`, `AD_PROMOTION_FEE`, `FULL_REFUND`, `PARTIAL_REFUND`, `WITHDRAWAL`), **Account Type** (`ASSET`, `LIABILITY`, `REVENUE`, `EXPENSE`), and **Specific Account**.
  - Query transactions by **Custom Date Ranges** (`From Date` / `To Date`) or search by transaction UUID.
  - Sort ledger entries dynamically by Timestamp, Amount (GHS), Entry Type, or Account Names in ascending or descending order.

---

### Need Help or Escalation?
Contact our operations team at **support@hendaxis.com** for technical assistance or dispute support.
