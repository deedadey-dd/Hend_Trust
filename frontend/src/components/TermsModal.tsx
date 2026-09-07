import React, { useState } from 'react';
import { ShieldCheck, X, FileText, Lock, AlertTriangle, Scale, CheckCircle2, Search } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) onAccept();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative transition-colors">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                Terms of Service & User Agreement
              </h2>
              <p className="text-xs text-slate-300">Master Legal Agreement & Platform Protections</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Terms Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search terms (e.g. 'inspection', 'dispute', 'packaging', 'refund')..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
          
          {/* Important Highlight Box */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs sm:text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Important Notice for Buyers & Sellers</span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 text-xs">
              HendAxis Trust acts as a neutral technology provider and escrow intermediary. By transacting on the platform, you agree to thorough pre-transaction communication, safe packaging standards, binding media evidence, and strict inspection timeframe expiration rules.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              1. Platform Role & Limitation of Liability
            </h3>
            <p>
              HendAxis Trust is a neutral financial technology provider and escrow intermediary. HendAxis Trust <strong>is not</strong> the manufacturer, seller, distributor, courier, owner, or insurer of any physical goods or services transacted through Payment Links or the Marketplace Directory.
            </p>
            <p>
              You agree to defend, indemnify, and hold harmless HendAxis Trust and its officers from any claims, liabilities, product defects, courier transit delays, or merchant misrepresentations.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              2. Pre-Transaction Due Diligence
            </h3>
            <p>
              Before initiating payment or dispatching orders, Buyers and Sellers must thoroughly discuss and agree upon all relevant details, including item condition, specifications, size, color, and delivery logistics.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Lock className="h-4 w-4 text-indigo-500" />
              3. Seller Packaging & Dispatch Guarantee
            </h3>
            <p>
              Sellers bear sole responsibility for packaging items securely in protective, tamper-proof packaging suitable for transit. Damage caused by inadequate packaging is the exclusive liability of the Seller.
            </p>
            <p>
              Sellers must dispatch items within the designated dispatch window (typically 4 days). Failure to dispatch on time results in automatic order cancellation, a 100% full refund to the Buyer, and a non-dispatch penalty charged to the Seller.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              4. Inspection Period Expiry & Irreversibility
            </h3>
            <div className="bg-slate-100 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-white">
                CRITICAL RULE: Tiered Inspection Periods (24 Hours, 48 Hours, or 72 Hours based on transaction value).
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Once the Inspection Period expires or the Buyer manually confirms receipt via OTP, funds are <strong>permanently and irreversibly released to the Seller</strong>. No post-inspection disputes, refunds, or chargebacks will be entertained by the platform.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Scale className="h-4 w-4 text-indigo-500" />
              5. Dispute Resolution & Item Returns
            </h3>
            <p>
              If an item arrives damaged or incorrect, Buyers must click <strong>Raise Dispute</strong> on their tracking page before the inspection period expires and upload evidence photos. Our support management issues a final binding ruling within 24 hours.
            </p>
            <p>
              Where a ruling requires returning the item, the Buyer must ship it back via Courier or Bus transport. For bus returns, a secret 6-digit Reverse OTP is issued for the Seller to verify receipt intact prior to refund issuance.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <CheckCircle2 className="h-4 w-4 text-indigo-500" />
              6. Governing Law
            </h3>
            <p>
              These Terms are governed by the laws of the Republic of Ghana. Any legal disputes shall be instituted exclusively in the competent courts of Accra, Ghana.
            </p>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            By transacting on HendAxis Trust, you agree to these Terms of Service.
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            {showAcceptButton ? (
              <button
                onClick={handleAccept}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                I Agree & Accept Terms
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
              >
                Close Terms Window
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TermsModal;
