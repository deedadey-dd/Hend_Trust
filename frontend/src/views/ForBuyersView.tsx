import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EscrowFeeCalculator } from '../components/EscrowFeeCalculator';
import SEOHead from '../components/SEOHead';

export const ForBuyersView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors">
      <SEOHead 
        title="Secure Online Shopping & Buyer Protection | HendAxis Trust"
        description="Buy online with greater confidence using HendAxis Trust. Your payment is held securely in trust until the transaction conditions are fulfilled."
        canonicalUrl="https://trust.hendaxis.com/for-buyers"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-600/10 via-slate-50 to-transparent dark:from-blue-950/30 dark:via-slate-950 dark:to-slate-950 pt-16 pb-20 px-6 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-extrabold uppercase tracking-wider">
            100% Buyer Protection Guarantee
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-tight">
            Never Send Money to an Unfamiliar Online Seller <span className="text-blue-600 dark:text-blue-400">and Hope for the Best</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Protect your Mobile Money. With HendAxis Trust, your payment is held safely in trust and only released to the seller <strong>after you receive and inspect your package</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              to="/shops"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-2xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <span>Browse Verified Shops</span>
            </Link>
            <Link
              to="/how-it-works"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-extrabold text-sm rounded-2xl transition flex items-center justify-center gap-2"
            >
              <span>See How It Works</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* The 4-Step Buyer Protection Shield */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            How HendAxis Trust Protects Your Money
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            A foolproof transaction protection process designed specifically for Ghanaian social commerce.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: "01",
              title: "Pay with Trust Protection",
              desc: "You pay using MTN MoMo, Telecel Cash, or Visa/Mastercard. Your money is held in a secure trust account—not the seller's personal pocket.",
            },
            {
              step: "02",
              title: "Seller Dispatches Goods",
              desc: "The seller receives automated proof that funds are safely locked, giving them the confidence to dispatch your order via courier or intercity bus.",
            },
            {
              step: "03",
              title: "Inspect With Your Secret OTP",
              desc: "You receive your package and get an inspection period (24–48 hours) to verify the goods. The seller CANNOT claim your money without your confirmation.",
            },
            {
              step: "04",
              title: "Funds Released or Refunded",
              desc: "Once satisfied, your OTP confirmation releases payment to the seller. If wrong/counterfeit goods arrive, you get a 100% full refund.",
            },
          ].map((card, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 relative group hover:border-blue-500/50 transition">
              <div className="space-y-3">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono block">
                  {card.step}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Calculator Section */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <EscrowFeeCalculator />
      </section>

      {/* Buyer Protection Comparison Table */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Direct MoMo vs. HendAxis Trust
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Why smart Ghanaian shoppers never send unverified Mobile Money upfront.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono uppercase">
                  <th className="pb-3 px-3">Shopping Risk Scenario</th>
                  <th className="pb-3 px-3 text-rose-500 font-bold">Direct MoMo / Cash</th>
                  <th className="pb-3 px-3 text-emerald-500 font-bold">With HendAxis Trust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-3 px-3 font-semibold">Seller blocks you after receiving money</td>
                  <td className="py-3 px-3 text-rose-600 dark:text-rose-400 font-medium">100% money lost forever</td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">100% Full Refund Guarantee</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Damaged or counterfeit item delivered</td>
                  <td className="py-3 px-3 text-rose-600 dark:text-rose-400 font-medium">Seller refuses exchange/refund</td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">Return initiated; money held safely</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Package lost by courier / VIP bus</td>
                  <td className="py-3 px-3 text-rose-600 dark:text-rose-400 font-medium">Endless blame games</td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">Waybill tracking & fast refund</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Inspection time before money is released</td>
                  <td className="py-3 px-3 text-rose-600 dark:text-rose-400 font-medium">Zero seconds (paid before seeing)</td>
                  <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">24–48 Hours inspection window</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Buyer FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center">
          Frequently Asked Buyer Questions
        </h2>

        <div className="space-y-3 text-xs">
          {[
            {
              q: "How do I tell an Instagram or WhatsApp seller to use HendAxis Trust?",
              a: "Simply tell the seller: 'I am ready to buy right now, but please send me a HendAxis Trust payment link so my delivery is protected.' Serious, verified sellers love HendAxis because it guarantees them a committed buyer!"
            },
            {
              q: "What if the item delivered is broken, fake, or different from what was advertised?",
              a: "Do NOT share your delivery OTP code with the courier or seller. Log into your transaction link, click 'Raise Dispute', and upload clear photo or video evidence. HendAxis relies on those evidences and the transaction details to make a determination on the outcome of a dispute and refund your money within 24 hours."
            },
            {
              q: "How fast do I get my refund if an order is cancelled?",
              a: "Refunds are processed automatically back to your original Mobile Money wallet or card within 24 hours of dispute resolution."
            },
            {
              q: "Does the seller see my credit card or Mobile Money PIN?",
              a: "Never. All payments are encrypted by our licensed payment partners (PCIDSS Level 1 Certified). The seller only sees confirmation that your payment is verified and locked."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1.5 shadow-sm">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                {item.q}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
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
            Ready to Shop Without the Stress of Online Scams?
          </h2>
          <p className="text-blue-100 text-sm max-w-xl mx-auto leading-relaxed">
            Find accredited, verified Ghanaian shops or request a protected payment link on your next social media purchase.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/shops"
              className="py-3.5 px-8 bg-white text-slate-950 hover:bg-slate-100 font-extrabold text-xs rounded-xl transition shadow"
            >
              Browse Verified Shops
            </Link>
            <Link
              to="/guides"
              className="py-3.5 px-8 bg-[#ff6d1d] hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition shadow"
            >
              Read Scam Prevention Guides
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ForBuyersView;
