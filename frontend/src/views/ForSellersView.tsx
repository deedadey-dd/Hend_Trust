import React from 'react';
import { 
  Store, 
  ShieldCheck, 
  DollarSign, 
  Zap, 
  UserCheck, 
  HelpCircle,
  Truck,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EscrowFeeCalculator } from '../components/EscrowFeeCalculator';
import SEOHead from '../components/SEOHead';

export const ForSellersView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors">
      <SEOHead 
        title="Sell Online with Buyer-Seller Escrow Protection | HendAxis Trust"
        description="Accept online payments with escrow protection. HendAxis Trust helps sellers build buyer confidence while protecting transaction payments."
        canonicalUrl="https://trust.hendaxis.com/for-sellers"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0363ff]/10 via-slate-50 to-transparent dark:from-[#0363ff]/20 dark:via-slate-950 dark:to-slate-950 pt-16 pb-20 px-6 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#ff6d1d] dark:text-orange-400 text-xs font-extrabold uppercase tracking-wider">
            <Store className="h-4 w-4 text-[#ff6d1d]" />
            Empowering Ghanaian Social Commerce Merchants
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-tight">
            Stop Losing Orders to Buyer Hesitation <span className="text-[#ff6d1d]">& Stop Wasting Delivery Fees</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Give your Instagram, TikTok, and WhatsApp customers the confidence to buy immediately. Lock their payment in escrow before you dispatch, and get paid instantly to Mobile Money upon delivery.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              to="/create-link"
              className="w-full sm:w-auto px-8 py-4 bg-[#0363ff] hover:bg-blue-600 text-white font-black text-sm rounded-2xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              <span>Create Free Payment Link</span>
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-extrabold text-sm rounded-2xl transition flex items-center justify-center gap-2"
            >
              <UserCheck className="h-4 w-4 text-[#ff6d1d]" />
              <span>Get Verified Merchant Badge</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Sellers Win With HendAxis Trust */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Built to Eliminate Merchant Headaches
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Everything you need to run a high-converting, scam-proof online store in Ghana.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Zero Payment Defaults (No CoD Losses)",
              desc: "Never send goods on Cash-on-Delivery only to have the buyer switch off their phone. The buyer's money is 100% committed in escrow before you hand over the package to the courier or bus driver.",
              icon: DollarSign,
              color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            },
            {
              title: "Instant Mobile Money & Bank Payouts",
              desc: "Upon delivery confirmation, your money lands in your MoMo wallet (MTN, Telecel, AT) or bank account immediately—no 14-day marketplace lockouts or high commission cuts.",
              icon: Zap,
              color: "text-[#ff6d1d] bg-orange-500/10 border-orange-500/20",
            },
            {
              title: "Custom Branded Storefront & QR Codes",
              desc: "Get a clean, professional web storefront (hendaxistrust.com/store/yourname) with custom product catalogs, QR codes, and automated SMS notifications for your customers.",
              icon: Store,
              color: "text-[#0363ff] bg-blue-500/10 border-blue-500/20",
            },
            {
              title: "Intercity Bus & Courier Waybill Tracking",
              desc: "Integrated dispatch tracking for VIP, STC, OA, and local courier services. Upload waybill photos and driver numbers for instant automated buyer tracking.",
              icon: Truck,
              color: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
            },
            {
              title: "Verified Merchant Trust Badge",
              desc: "Display our 'Verified by HendAxis' badge on your Instagram Bio (Linktree) and WhatsApp business catalog. Buyers purchase 3x faster when they know the deal is escrow-backed.",
              icon: ShieldCheck,
              color: "text-[#ff6d1d] bg-orange-500/10 border-orange-500/20",
            },
            {
              title: "Fair Multi-Arbiter Dispute Defense",
              desc: "Protected from fraudulent buyer claims. Our certified dispute arbiters review dispatch receipts, delivery logs, and photo evidence before any ruling is made.",
              icon: Layers,
              color: "text-[#0363ff] bg-blue-500/10 border-blue-500/20",
            },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#0363ff]/50 transition group">
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl border ${card.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Calculator Section */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <EscrowFeeCalculator />
      </section>

      {/* 3 Steps to Start Selling */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Start Closing Escrow Deals in 60 Seconds
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No complicated integrations. Works directly on WhatsApp and Instagram DM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="w-7 h-7 rounded-xl bg-[#0363ff] text-white font-black flex items-center justify-center text-xs">
                1
              </span>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                Generate Payment Link
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Enter item title, price, and courier/shipping fee. Choose whether buyer pays the fee or you absorb it.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="w-7 h-7 rounded-xl bg-[#ff6d1d] text-white font-black flex items-center justify-center text-xs">
                2
              </span>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                Send Link via WhatsApp / DM
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Your buyer opens the link, reviews the order, and pays securely via MTN MoMo, Telecel Cash, or Card.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                3
              </span>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                Ship & Get Instant Payout
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive SMS alert confirming locked funds. Dispatch the parcel. Buyer confirms delivery OTP and funds hit your wallet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seller FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center">
          Frequently Asked Seller Questions
        </h2>

        <div className="space-y-3 text-xs">
          {[
            {
              q: "Can I choose who pays the platform escrow fee?",
              a: "Yes! When creating a payment link, you can choose 'Pass Fee to Buyer' (adds 1.5% + GHS 10.00 to checkout) or 'Absorb Fee' (deducts 1.5% + GHS 10.00 from your final payout)."
            },
            {
              q: "How am I protected if a buyer refuses to confirm delivery?",
              a: "If the buyer does not confirm or raise a dispute within the inspection window (24–48 hours after courier delivery), our automated system releases your payout automatically."
            },
            {
              q: "What proof do I need when dispatching via VIP or STC intercity bus?",
              a: "Simply enter the driver's phone number, car registration number, and take a quick photo of the bus parcel waybill receipt. Our system sends live tracking SMS to the buyer."
            },
            {
              q: "How do I get the 'Verified Merchant' badge for my Instagram bio?",
              a: "Log into your dashboard, submit your National ID (Ghana Card) or Business Registration document. Once approved by our compliance desk (usually < 2 hours), you unlock verified badges and embed tools."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-sm">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#ff6d1d] shrink-0" />
                {item.q}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="max-w-5xl mx-auto px-6 mt-12">
        <div className="bg-gradient-to-r from-[#0363ff] to-[#0142b3] rounded-3xl p-8 sm:p-12 text-white text-center space-y-5 shadow-2xl shadow-blue-500/20">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Ready to Turn Hesitant Inquiries into Completed Sales?
          </h2>
          <p className="text-blue-100 text-sm max-w-xl mx-auto leading-relaxed">
            Create your free merchant profile in under 2 minutes and start sharing protected escrow payment links today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="py-3.5 px-8 bg-white text-slate-950 hover:bg-slate-100 font-extrabold text-xs rounded-xl transition shadow"
            >
              Sign Up as a Seller
            </Link>
            <Link
              to="/create-link"
              className="py-3.5 px-8 bg-[#ff6d1d] hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition shadow"
            >
              Create a Payment Link
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ForSellersView;
