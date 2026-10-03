import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, X, Loader2, ShieldCheck, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/client';
import { useEscapeKey } from '../utils/useEscapeKey';

export interface ApproveReleaseOrder {
  id: string;
  title: string;
  paystack_reference: string;
  buyer_phone?: string;
  buyer_email?: string;
  shop_name?: string;
  seller_username?: string;
  total_amount_ghs?: number;
  platform_fee_ghs?: number;
}

interface ApproveAndReleaseModalProps {
  order: ApproveReleaseOrder;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export default function ApproveAndReleaseModal({
  order,
  onClose,
  onSuccess
}: ApproveAndReleaseModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<HTMLInputElement>(null);

  useEscapeKey(onClose);

  // Send OTP on mount
  useEffect(() => {
    sendOtp();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // 60s cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const sendOtp = async () => {
    setError('');
    setIsSending(true);
    try {
      const res = await apiClient.post(`/escrow/${order.id}/send-release-otp`);
      setSuccessInfo(res.data?.message || 'Release confirmation OTP sent to your phone and email.');
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to send release OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setError('Please enter the complete 6-digit confirmation code.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await apiClient.post(`/escrow/${order.id}/approve-and-release`, {
        confirmation_code: cleanCode
      });
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to approve and release funds. Please verify the 6-digit code.');
    } finally {
      setLoading(false);
    }
  };

  // Mask phone and email
  const formatMaskedPhone = (phone?: string) => {
    if (!phone) return 'your registered phone';
    if (phone.length <= 4) return phone;
    return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
  };

  const formatMaskedEmail = (email?: string) => {
    if (!email) return 'your registered email';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const maskedName = name.length <= 2 ? `${name}*` : `${name[0]}***${name[name.length - 1]}`;
    return `${maskedName}@${parts[1]}`;
  };

  const netSellerPayout = order.total_amount_ghs !== undefined
    ? Math.max(0, Number(order.total_amount_ghs) - Number(order.platform_fee_ghs || 0))
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-auto relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50 cursor-pointer p-1"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Approve & Release Payment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Ref: {order.paystack_reference}
            </p>
          </div>
        </div>

        {/* Critical Warning Alert */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <p className="font-extrabold text-amber-950 dark:text-amber-100 uppercase tracking-wide">
              Critical & Irreversible Step
            </p>
            <p className="text-amber-800 dark:text-amber-300/90">
              Entering your OTP will immediately and permanently release escrow funds of{' '}
              <strong className="text-amber-950 dark:text-white">
                GHS {netSellerPayout !== undefined ? netSellerPayout.toFixed(2) : 'the order'}
              </strong>{' '}
              to the seller ({order.shop_name || `@${order.seller_username || 'Seller'}`}).
            </p>
          </div>
        </div>

        {/* Order Details Brief Summary */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">Item:</span>
          <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
            {order.title}
          </p>
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span>Seller: <strong>{order.shop_name || `@${order.seller_username || 'Seller'}`}</strong></span>
            {order.total_amount_ghs !== undefined && (
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                Total: GHS {Number(order.total_amount_ghs).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-1.5 gap-1">
              <label htmlFor="release-otp-input" className="font-bold text-slate-800 dark:text-slate-200">
                Enter 6-Digit Release OTP
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Sent to {formatMaskedPhone(order.buyer_phone)}{order.buyer_email ? ` & ${formatMaskedEmail(order.buyer_email)}` : ''}
              </span>
            </div>
            
            <input
              id="release-otp-input"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              autoComplete="one-time-code"
              className="w-full text-center tracking-[0.6em] text-2xl font-mono font-black py-3 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>

          {/* Resend OTP Bar */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Didn't receive the code?
            </span>
            <button
              type="button"
              onClick={sendOtp}
              disabled={countdown > 0 || isSending || loading}
              className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:no-underline"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && !error && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              Cancel / Not Yet
            </button>
            <button
              type="submit"
              disabled={loading || code.trim().length !== 6}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Confirm & Release</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
