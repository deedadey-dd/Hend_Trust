import React, { useState } from 'react';
import { 
  Calculator, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const EscrowFeeCalculator: React.FC<{ 
  compact?: boolean; 
  onClose?: () => void;
  defaultAmount?: number;
  defaultShipping?: number;
}> = ({ 
  compact = false,
  onClose,
  defaultAmount = 500,
  defaultShipping = 30
}) => {
  const [itemPrice, setItemPrice] = useState<number>(defaultAmount);
  const [shippingFee, setShippingFee] = useState<number>(defaultShipping);
  const [feePayer, setFeePayer] = useState<'BUYER' | 'SELLER'>('BUYER');

  const totalAmount = Math.max(0, itemPrice) + Math.max(0, shippingFee);

  // Platform Escrow Fee: 1.5% + GHS 10.00 (Standard HendAxis Trust Fee)
  const rawEscrowFee = totalAmount > 0 ? (totalAmount * 0.015) + 10.00 : 0;
  const escrowFee = Math.round((rawEscrowFee + Number.EPSILON) * 100) / 100;
  
  // Paystack gateway processing fee: 1.95%
  const momoFee = Math.round(((totalAmount * 0.0195) + Number.EPSILON) * 100) / 100;

  const totalBuyerPays = feePayer === 'BUYER' ? totalAmount + escrowFee : totalAmount;
  const netSellerReceives = feePayer === 'SELLER' ? Math.max(0, totalAmount - escrowFee) : totalAmount;

  const presets = [150, 350, 750, 1500, 3500, 8000];

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden ${compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'}`}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[#0363ff] dark:text-blue-400 shrink-0">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              Escrow Fee & Trust Calculator
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live Pricing
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calculate exact escrow protection, shipping escrow, and net MoMo payouts.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-5">
        {/* Left column: Inputs & breakdown */}
        <div className="lg:col-span-7 space-y-5">
          {/* Dual Inputs: Item Price & Delivery Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            <div className="sm:col-span-7">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Item Price (GHS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  GHS
                </span>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="10"
                  value={itemPrice || ''}
                  onChange={(e) => setItemPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full pl-14 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0363ff] transition"
                />
              </div>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Delivery Fee (GHS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  GHS
                </span>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  step="5"
                  value={shippingFee || ''}
                  onChange={(e) => setShippingFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full pl-14 pr-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d1d] transition"
                />
              </div>
            </div>
          </div>

          {/* Quick Presets for Item Value */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Presets:</span>
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setItemPrice(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    itemPrice === val
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-[#0363ff] dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  GHS {val}
                </button>
              ))}
            </div>
          </div>

          {/* Relocated Fee Payer Toggle: Directly Under Presets */}
          <div className="bg-slate-50 dark:bg-slate-950/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                Escrow Fee Responsibility
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose who covers the platform escrow protection fee (1.5% + GHS 10.00).
              </p>
            </div>

            <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setFeePayer('BUYER')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  feePayer === 'BUYER'
                    ? 'bg-[#0363ff] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Buyer Pays
              </button>
              <button
                type="button"
                onClick={() => setFeePayer('SELLER')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  feePayer === 'SELLER'
                    ? 'bg-[#ff6d1d] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Seller Absorbs
              </button>
            </div>
          </div>

          {/* Real-time Math Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-1 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Paid by Buyer
              </span>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                GHS {totalBuyerPays.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {feePayer === 'BUYER' ? `Item + Delivery + GHS ${escrowFee.toFixed(2)} fee` : 'Item + Delivery (No fee added)'}
              </p>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-2xl space-y-1 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                Net Payout to Seller
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                GHS {netSellerReceives.toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">
                {feePayer === 'SELLER' ? `Less GHS ${escrowFee.toFixed(2)} platform fee` : '100% full item + shipping value received'}
              </p>
            </div>
          </div>

          {/* Line item fee breakdown */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Item Principal:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">GHS {itemPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Delivery / Shipping Escrow:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">GHS {shippingFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-semibold pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>Total Escrow Value:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">GHS {totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0363ff]" />
                HendAxis Escrow Fee (1.5% + GHS 10.00):
              </span>
              <span className="font-bold text-[#0363ff] dark:text-blue-400 font-mono">GHS {escrowFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px]">
              <span>Est. Paystack Gateway Processing Fee (1.95%):</span>
              <span className="font-mono">~GHS {momoFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>Buyer Inspection Period:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {totalAmount >= 2000 ? '48 Hours (High Value)' : '24 Hours (Standard)'}
              </span>
            </div>
          </div>
        </div>

        {/* Right column: Interactive Visual Safety Flow */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-900/10 via-slate-900/20 to-orange-900/10 dark:from-slate-950 dark:to-slate-900/90 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#0363ff] dark:text-blue-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#ff6d1d]" />
              What Happens to GHS {totalAmount.toFixed(2)}
            </span>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
              Guaranteed Protection Lifecycle
            </h4>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#0363ff] text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">Funds Smart-Locked</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Buyer deposits GHS {totalBuyerPays.toFixed(2)} via MTN MoMo, Telecel, or Card. Funds locked safely in vault.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#ff6d1d] text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">Seller Dispatches Safely</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Seller receives automated SMS confirmation and ships with live courier or intercity bus waybill.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-slate-100 block">Delivery Inspection</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    Buyer inspects the package. Secret OTP code confirms delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  ✓
                </div>
                <div>
                  <strong className="text-emerald-700 dark:text-emerald-300 block">Instant MoMo Payout</strong>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    GHS {netSellerReceives.toFixed(2)} is transferred automatically to the seller's Mobile Money wallet.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row gap-2.5">
            <Link
              to="/create-link"
              className="flex-1 py-3 px-4 bg-[#0363ff] hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/20 text-center flex items-center justify-center gap-1.5"
            >
              <span>Create Link for GHS {totalAmount}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/for-buyers"
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition text-center"
            >
              Buyer Guide
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowFeeCalculator;
