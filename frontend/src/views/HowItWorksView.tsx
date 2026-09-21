import React, { useState } from 'react';
import { 
  Lock, 
  Truck, 
  Eye, 
  CheckCircle2, 
  RotateCcw, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EscrowFeeCalculator } from '../components/EscrowFeeCalculator';
import SEOHead from '../components/SEOHead';

export const HowItWorksView: React.FC = () => {
  const [activeFlow, setActiveFlow] = useState<'HAPPY_PATH' | 'DISPUTE_PATH'>('HAPPY_PATH');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors">
      <SEOHead 
        title="How Escrow Works — Step-by-Step Protection Guide | HendAxis Trust"
        description="Learn how HendAxis Trust protects buyers and sellers in Ghana across Mobile Money, Courier deliveries, and Dispute resolution."
      />

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-blue-600/10 via-slate-50 to-transparent dark:from-blue-950/30 dark:via-slate-950 dark:to-slate-950 pt-16 pb-12 px-6 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-extrabold uppercase tracking-wider">
            <Layers className="h-4 w-4" />
            Clear, Transparent & Fair
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            How HendAxis Trust Works
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            A step-by-step walkthrough of how escrow protects both parties from the first click to the final Mobile Money payout.
          </p>

          {/* Flow Switcher Toggle */}
          <div className="inline-flex p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mt-4">
            <button
              type="button"
              onClick={() => setActiveFlow('HAPPY_PATH')}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeFlow === 'HAPPY_PATH'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Standard Order & Delivery Flow</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFlow('DISPUTE_PATH')}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 cursor-pointer ${
                activeFlow === 'DISPUTE_PATH'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scale className="h-4 w-4" />
              <span>Dispute & Refund Arbitration Flow</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Interactive Flow Display */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        {activeFlow === 'HAPPY_PATH' ? (
          <div className="space-y-6">
            <div className="text-center space-y-1 mb-8">
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Seamless 5-Step Lifecycle
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                The Standard Completed Transaction
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "1. Agreement & Link Generation",
                  desc: "The seller generates a payment link with title, price, and delivery method, or the buyer requests a custom escrow link. Terms, fees, and inspection hours are crystal clear upfront.",
                  icon: Sparkles,
                  color: "bg-[#0363ff] text-white",
                },
                {
                  step: "2",
                  title: "2. Buyer Deposits Funds into Escrow",
                  desc: "The buyer pays via MTN Mobile Money, Telecel Cash, or Visa/Mastercard. Funds are immediately locked in our double-entry escrow vault. The seller cannot withdraw these funds yet.",
                  icon: Lock,
                  color: "bg-[#ff6d1d] text-white",
                },
                {
                  step: "3",
                  title: "3. Dispatched with Live Tracking",
                  desc: "The seller receives an automated SMS confirming full payment custody and ships the package via courier (DHL, Speedaf, FeDEx) or intercity bus (VIP, STC, OA). Waybill photos and driver details are logged.",
                  icon: Truck,
                  color: "bg-slate-800 dark:bg-slate-700 text-white",
                },
                {
                  step: "4",
                  title: "4. Physical Delivery & OTP Inspection Period",
                  desc: "Upon package arrival, the buyer receives a secret 6-digit OTP and an inspection window (24–48 hours) to verify the item condition and specifications.",
                  icon: Eye,
                  color: "bg-amber-500 text-white",
                },
                {
                  step: "5",
                  title: "5. OTP Verification & Automated MoMo Payout",
                  desc: "Buyer confirms satisfaction with their OTP code. HendAxis Trust automatically transfers the funds directly to the seller's Mobile Money wallet or bank account.",
                  icon: CheckCircle2,
                  color: "bg-emerald-500 text-white",
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-start gap-4 hover:border-blue-500/40 transition">
                    <div className={`w-10 h-10 rounded-2xl ${item.color} flex items-center justify-center font-bold text-sm shrink-0 shadow`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-1 mb-8">
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Fair, 24-Hour Dispute Resolution
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                What Happens If There Is a Dispute?
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "1. Buyer Freezes Payout by Raising a Claim",
                  desc: "If the item is damaged, wrong color, counterfeit, or never delivered, the buyer clicks 'Raise Dispute' during the inspection period. The payout to the seller is instantly frozen.",
                  icon: AlertCircle,
                  color: "bg-rose-500 text-white",
                },
                {
                  step: "2",
                  title: "2. Evidence Upload on Unified Dialogue Timeline",
                  desc: "Both parties upload photos, unboxing videos, courier receipts, and chat on an immutable timestamped timeline visible to platform arbiters.",
                  icon: Layers,
                  color: "bg-amber-500 text-white",
                },
                {
                  step: "3",
                  title: "3. Optional Dispute Retraction or Return Agreement",
                  desc: "If the seller provides a replacement or resolves the misunderstanding amicably, the buyer can retract the dispute, or the seller can request the item be returned before refund.",
                  icon: RotateCcw,
                  color: "bg-blue-500 text-white",
                },
                {
                  step: "4",
                  title: "4. Binding Multi-Arbiter Ruling within 24 Hours",
                  desc: "An accredited dispute arbiter reviews all evidence and issues a binding settlement (100% Buyer Refund, Full Seller Payout, or Custom Split). Funds are disbursed within 24 hours.",
                  icon: Scale,
                  color: "bg-emerald-500 text-white",
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-start gap-4 hover:border-rose-500/40 transition">
                    <div className={`w-10 h-10 rounded-2xl ${item.color} flex items-center justify-center font-bold text-sm shrink-0 shadow`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Interactive Calculator Section */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <EscrowFeeCalculator />
      </section>

      {/* CTA Footer */}
      <section className="max-w-4xl mx-auto px-6 mt-12 text-center space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Experience Safer Online Commerce in Ghana
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/create-link"
            className="py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow"
          >
            Create Protected Payment Link
          </Link>
          <Link
            to="/trust-center"
            className="py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
          >
            Visit Trust & Security Center
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksView;
