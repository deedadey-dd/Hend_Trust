import React from 'react';
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
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-extrabold uppercase tracking-wider">
            Institutional Trust & Solvency Standards
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Trust & Security Center
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            How HendAxis Trust secures every Ghana Cedi in protected custody, verifies merchant identities, and enforces fair, binding dispute resolution.
          </p>
        </div>
      </section>

      {/* The 4 Security Pillars */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                1. Dedicated Trust Protection & 100% Solvency
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every Ghana Cedi paid through HendAxis Trust is tracked in a dedicated protected account. We never pool, lend, or invest customer transaction balances. Buyer funds remain 100% reserved for the transaction at all times.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Daily Balance Verification • 100% Reserved Funds • Instant Payout Liquidity
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                2. Merchant Identity & Business Vetting
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Verified sellers undergo strict identity and business verification against official registration records without storing illegal ID photocopies. Suspicious accounts are flagged and frozen by automated risk monitoring.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Official Identity Matching • RGD Business Certificates • Fraud Blacklist Screening
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                3. Bank-Grade Encryption & Payment Security
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Payment channels are powered by licensed payment providers (PCIDSS Level 1 Certified). All web traffic and API calls are secured with 256-bit TLS/SSL encryption, two-factor authentication (2FA), and secure encrypted cookies.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              256-Bit SSL Encryption • 2FA Authenticator Support • Zero Card Detail Storage
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                4. 24-Hour Dispute Resolution Guarantee
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Disputes are never left unresolved. When a buyer freezes a transaction, both parties can submit unboxing videos, waybill receipts, and messages. HendAxis relies on those evidences and the transaction details to make a determination on the outcome of a dispute within 24 hours.
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              24-Hour Turnaround • Evidence & Transaction Review • Automated Disbursal
            </div>
          </div>
        </div>
      </section>

      {/* Fraud Reporting & Hotline Desk */}
      <section className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-10 shadow-xl space-y-6 border border-slate-700">
          <div>
            <h3 className="text-lg font-extrabold">Report a Suspicious Store or Scam Activity</h3>
            <p className="text-xs text-slate-300">
              Help protect the Ghanaian digital commerce ecosystem.
            </p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            If you encounter an online merchant claiming to use HendAxis Trust falsely, sending fake payment receipts, or refusing legitimate delivery, contact our compliance and fraud desk immediately.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <a
              href="mailto:support@hendaxis.com"
              className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold transition flex items-center gap-3 text-slate-200"
            >
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Fraud Support Email</span>
                <span>support@hendaxis.com</span>
              </div>
            </a>

            <a
              href="tel:+233240000000"
              className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold transition flex items-center gap-3 text-slate-200"
            >
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
          Want to learn more about how HendAxis works in everyday transactions?
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/how-it-works"
            className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold hover:text-blue-600 dark:hover:text-blue-400 transition shadow-sm"
          >
            How HendAxis Works
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
