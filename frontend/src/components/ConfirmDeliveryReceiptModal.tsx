import { useState } from 'react';
import { Truck, CheckCircle2, AlertCircle, X, Loader2, ShieldCheck } from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';

export interface ConfirmReceiptOrder {
  id: string;
  title: string;
  paystack_reference: string;
  shop_name?: string;
  seller_username?: string;
  inspection_hours_allowed?: number;
  total_amount_ghs?: number;
}

interface ConfirmDeliveryReceiptModalProps {
  order: ConfirmReceiptOrder;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function ConfirmDeliveryReceiptModal({
  order,
  onClose,
  onConfirm
}: ConfirmDeliveryReceiptModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEscapeKey(onClose);

  const hoursAllowed = order.inspection_hours_allowed || 24;

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to confirm delivery receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-auto relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50 cursor-pointer p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Confirm Delivery Receipt?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Ref: {order.paystack_reference}
            </p>
          </div>
        </div>

        {/* Order Details Brief Summary */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Item Ordered:</span>
          <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
            {order.title}
          </p>
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span>Seller: <strong>{order.shop_name || `@${order.seller_username || 'Seller'}`}</strong></span>
            {order.total_amount_ghs !== undefined && (
              <span className="font-bold text-slate-900 dark:text-white font-mono">GHS {Number(order.total_amount_ghs).toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Essential Confirmation Notes */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl p-4 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-950 dark:text-emerald-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>What happens next:</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed list-disc list-inside">
            <li>
              Your <strong>{hoursAllowed}-hour inspection window</strong> will begin immediately.
            </li>
            <li>
              You will have full access to thoroughly test and verify the item before funds release.
            </li>
            <li>
              If you haven't physically received the package yet, click <strong>Cancel</strong>.
            </li>
          </ul>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
          >
            Not Yet / Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Yes, I Received It</span>
          </button>
        </div>
      </div>
    </div>
  );
}
