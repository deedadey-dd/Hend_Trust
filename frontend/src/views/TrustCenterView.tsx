import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Layers, 
  AlertTriangle, 
  PhoneCall, 
  Mail, 
  Scale, 
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

export const TrustCenterView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors">
      <SEOHead 
        title="Trust & Security Center | HendAxis Trust"
        description="Discover how HendAxis Trust guarantees payment security with double-entry ledgers, verified sellers, encryption, and dispute arbitration in Ghana."
        canonicalUrl="https://trust.hendaxis.com/trust-center"
      />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-blue-600/10 via-slate-50 to-transparent dark:from-blue-950/30 dark:via-slate-950 dark:to-slate-950 pt-16 pb-16 px-6 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Institutional Trust & Solvency Standards
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Trust & Security Center
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            How HendAxis Trust secures every Ghana Cedi in escrow, verifies merchant identities, and enforces fair, binding dispute arbitration.
          </p>
        </div>
      </section>

      {/* The 4 Security Pillars */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                1. Double-Entry Escrow Ledger & 100% Solvency
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every Ghana Cedi deposited into HendAxis Trust is logged in an immutable, dual-entry accounting ledger (Assets = Liabilities + Revenue). We never pool, lend, or invest escrow balances. Buyer funds remain 100% backed in regulated bank custody accounts at all times.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ✓ Automated Daily Reconciliation • Zero Fractional Reserves • Instant Payout Liquidity
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <UserCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                2. National ID (Ghana Card) & Business Vetting
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Verified sellers undergo strict identity verification against the National Identification Authority (NIA) Ghana Card database and Registrar General business registrations. Suspicious accounts are flagged and frozen by automated risk monitoring.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ✓ NIA Identity Matching • RGD Business Certificates • Fraud Blacklist Screening
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                3. Bank-Grade Encryption & Paystack Security
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Payment channels are powered by Paystack (PCIDSS Level 1 Certified, licensed by the Bank of Ghana). All web traffic and API calls are secured with 256-bit TLS/SSL encryption, two-factor authentication (2FA), and secure encrypted cookies.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ✓ 256-Bit SSL Encryption • 2FA Authenticator Support • Zero Card Detail Storage
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Scale className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                4. 24-Hour Dispute Resolution SLA
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Disputes are never left unresolved. When a buyer freezes a transaction, our certified arbitration desk reviews unboxing videos, waybill receipts, and chat logs to issue a fair, binding ruling within 24 hours. Refunds are disbursed automatically.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              ✓ 24-Hour Turnaround • Multi-Arbiter Audit Trail • Full Photo Evidence Review
            </div>
          </div>
        </div>
      </section>

      {/* Fraud Reporting & Hotline Desk */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-10 shadow-xl space-y-6 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">Report a Suspicious Store or Scam Activity</h3>
              <p className="text-xs text-slate-300">
                Help protect the Ghanaian digital commerce ecosystem.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            If you encounter an online merchant claiming to use HendAxis Trust falsely, sending fake payment receipts, or refusing legitimate delivery, contact our compliance and fraud desk immediately.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <a
              href="mailto:support@hendaxis.com"
              className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold transition flex items-center gap-3 text-slate-200"
            >
              <Mail className="h-5 w-5 text-blue-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Fraud Support Email</span>
                <span>support@hendaxis.com</span>
              </div>
            </a>

            <a
              href="tel:+233240000000"
              className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold transition flex items-center gap-3 text-slate-200"
            >
              <PhoneCall className="h-5 w-5 text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Emergency Trust Hotline</span>
                <span>+233 (0) 24 000 0000</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Quick Navigation Links */}
      <section className="max-w-4xl mx-auto px-6 mt-8 text-center space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Want to learn more about how escrow works in everyday transactions?
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/how-it-works"
            className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 transition shadow-sm"
          >
            How Escrow Works
          </Link>
          <Link
            to="/for-buyers"
            className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 transition shadow-sm"
          >
            Buyer Protection Guide
          </Link>
          <Link
            to="/for-sellers"
            className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 transition shadow-sm"
          >
            Seller Solutions
          </Link>
        </div>
      </section>
    </div>
  );
};

export default TrustCenterView;
