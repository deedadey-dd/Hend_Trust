# HendAxis Trust: How It Works

Welcome to **HendAxis Trust**, the secure bridge between buyers and sellers. We protect your money and your merchandise using state-of-the-art escrow technology, guaranteeing fairness for everyone involved. 

Whether you are an Instagram vendor, a marketplace shopper, or an independent contractor, HendAxis Trust ensures you get what you paid for—or you get paid for what you sent.

Here is a quick guide on how our platform works.

---

## 1. Creating a Payment Link (For Sellers)
Sellers can create secure Payment Links to send to their buyers.

1. **Log in** to your Seller Dashboard.
2. Click **Create Payment Link**.
3. Enter the item details: Title, Description, and Price.
4. **Choose your Fee Handling**:
   - **Absorb Fee**: You pay the platform fee (1.5% + GHS 10). The buyer only pays the item price.
   - **Pass to Buyer**: The buyer pays the item price + the platform fee. You receive exactly the amount you asked for.
5. **Share the Link!** Send the generated URL to your buyer via WhatsApp, Instagram, or SMS.

---

## 2. Making a Payment (For Buyers)
When a buyer opens a Payment Link, they are greeted with a secure, transparent checkout page.

1. The buyer reviews the item and the fee breakdown.
2. The buyer pays securely via **Paystack** (Mobile Money or Card).
3. **The funds are held in Escrow.** We *do not* send the money to the seller immediately. The seller is simply notified that the payment has been secured and it's time to ship!

---

## 3. The Dual-Path Logistics Process
Once the item is paid for, the seller must ship it. HendAxis Trust supports two unique delivery verification paths:

### Path A: Formal Courier Delivery
If the seller uses an integrated delivery company (like FedEx or a local API-integrated courier):
- The seller inputs the **Tracking Number**.
- Our system automatically listens to the Courier's webhooks.
- The moment the courier system marks the package as **DELIVERED**, HendAxis Trust is automatically notified and advances the transaction state.

### Path B: Informal Station / Bus Delivery (OTP)
If the seller is using an informal delivery method (like a tro-tro, VIP bus, or sending it to a bus terminal):
- The seller selects **Informal Station Delivery** and inputs the driver's phone number and/or car number, and the destination station.
- HendAxis Trust sends the driver info  and a Secret OTP to the *Buyer*.
- When the buyer goes to the station to collect the package, they must provide their ID and Secret OTP to the driver/agent or to the seller. This OTP must be saved and resent if the Buyer wants to Confirm Receipt.
- If the driver/seller submits this OTP into the system. Once verified, the package is officially marked as Delivered.

---

## 4. The 48-Hour Inspection Period
Once the system registers the item as "Delivered" (either via Courier Webhook or Bus OTP), the **48-Hour Inspection Period** immediately begins.

- **For Buyers**: You have exactly 48 hours to inspect your item, test it, and ensure it matches the seller's description. If there is a problem, you must click **Dispute Transaction** before the timer runs out.
- **For Sellers**: If the buyer is happy (or if they simply forget to do anything), our automated Celery engine will count down the 48 hours. Once the clock hits zero, the transaction is automatically marked as **COMPLETED**, and the funds are instantly released to your seller wallet.

---

## 5. Automated Payouts & Wallet Withdrawals
When a transaction is **COMPLETED**:
- The funds are credited to your **Seller Wallet**.
- You can view your **Available Balance** in real-time.
- You can request a **Withdrawal** to your verified Bank Account or Mobile Money wallet at any time. Our system processes this request and clears the funds instantly.

---

## 6. How Disputes Are Handled
If a buyer clicks **Dispute Transaction** during the 48-hour inspection period, the payout timer is instantly paused.

- **Admin Intervention**: A HendAxis Trust Platform Admin will review the dispute, contact both parties, and request evidence (photos, waybills, etc.).
- **Admin Resolution**: The admin holds absolute authority to resolve the dispute fairly:
  - **Release to Seller**: If the buyer's claim is invalid, the admin forces the transaction to COMPLETED and the seller gets paid.
  - **Full Refund to Buyer**: If the seller sent a faulty item, the admin triggers a 100% refund back to the buyer's payment method. (Note: The defaulting seller's internal wallet will be penalized for the wasted platform fee).
  - **Partial Refund**: Coming soon for negotiated settlements.

---

### Need more help?
Contact our support team directly at support@hendaxis.com for any technical issues or dispute escalations.
