import { useState, useEffect, useRef } from 'react';
import { 
  X, AlertTriangle, Zap, Clock, Wallet, PhoneCall, 
  Loader2, ArrowRight, Lock, Eye, EyeOff, ShieldCheck
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useModal } from '../context/ModalContext';
import { useAuthStore } from '../store/authStore';

interface BuyerCancelModalProps {
  order: {
    id: string;
    title: string;
    paystack_reference: string;
    total_amount_ghs: number;
    platform_fee_ghs?: number;
    buyer_name?: string;
    buyer_phone?: string;
    buyer_email?: string;
    is_instant_cancel_eligible?: boolean;
    instant_cancel_remaining_minutes?: number;
    seller_cancel_response_window_hours?: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

interface CancelPreviewData {
  transaction_id: string;
  status: string;
  is_undispatched: boolean;
  is_instant_eligible: boolean;
  instant_window_hours: number;
  instant_window_remaining_minutes: number;
  seller_response_window_hours: number;
  cancellation_requested: boolean;
  cancellation_requested_at?: string;
  cancellation_grace_until?: string;
  cancellation_payout_hold_until?: string;
  cancellation_payout_status?: string;
  cancellation_dispatch_grace_minutes?: number;
  cancellation_payout_hold_minutes?: number;
  cancellation_payout_hold_hours?: number;
  cancellation_grace_remaining_minutes?: number;
  cancellation_payout_hold_remaining_minutes?: number;
  cancellation_payout_hold_remaining_hours?: number;
  buyer_monthly_cancellations_count?: number;
  buyer_monthly_cancel_limit?: number;
  seller_response_remaining_minutes?: number;
  gross_amount_ghs: number;
  platform_fee_ghs: number;
  gateway_fee_ghs: number;
  wallet_payout_fee_ghs: number;
  momo_payout_fee_ghs: number;
  payout_transfer_fee_percent?: number;
  wallet_net_refund_ghs: number;
  momo_net_refund_ghs: number;
  buyer_phone: string;
  buyer_email?: string;
  buyer_name?: string;
  has_existing_account?: boolean;
  is_account_mismatch?: boolean;
  logged_in_user_matches?: boolean;
  logged_in_account_identifier?: string;
}

export default function BuyerCancelModal({ order, onClose, onSuccess }: BuyerCancelModalProps) {
  const modal = useModal();
  useEscapeKey(onClose, true);
  const { isAuthenticated, user, logout: authLogout, login: authLogin } = useAuthStore();

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [preview, setPreview] = useState<CancelPreviewData | null>(null);
  const [refundTarget, setRefundTarget] = useState<'WALLET' | 'MOMO_PAYOUT'>('WALLET');
  const [reasonCategory, setReasonCategory] = useState('Changed my mind');
  const [customReason, setCustomReason] = useState('');
  
  // Guest Account Creation / Login / OTP State
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [cancelOtp, setCancelOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const passwordSectionRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const contentBodyRef = useRef<HTMLDivElement>(null);

  const rawBuyerEmail = preview?.buyer_email || order.buyer_email || '';
  const buyerEmail = rawBuyerEmail.trim().toLowerCase();
  const buyerPhone = preview?.buyer_phone || order.buyer_phone || '';
  const buyerName = preview?.buyer_name || order.buyer_name || '';

  const normalizePhone = (phone?: string) => (phone || '').replace(/\D/g, '').slice(-9);
  const buyerPhoneNorm = normalizePhone(buyerPhone);

  const userEmail = (user?.email || '').trim().toLowerCase();
  const userPhone = user?.phone_number || '';
  const userPhoneNorm = normalizePhone(userPhone);

  const isStaffOrAdmin = Boolean(user?.is_superuser || user?.is_staff);

  const emailMatches = Boolean(userEmail && buyerEmail && userEmail === buyerEmail);
  const phoneMatches = Boolean(userPhoneNorm && buyerPhoneNorm && userPhoneNorm.length >= 9 && userPhoneNorm === buyerPhoneNorm);

  // Authenticated user is authorized if staff or email matches or phone matches
  const isAuthorizedBuyer = isAuthenticated && (isStaffOrAdmin || emailMatches || phoneMatches || Boolean(preview?.logged_in_user_matches));

  // Account mismatch occurs when authenticated but neither phone nor email matches (and not staff)
  const isAccountMismatch = isAuthenticated && !isStaffOrAdmin && !isAuthorizedBuyer && (Boolean(preview?.is_account_mismatch) || (!emailMatches && !phoneMatches));

  const isPasswordError = Boolean(
    passwordError || (error && /password|account|credential|code|otp/i.test(error))
  );

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    const fetchPreview = async () => {
      setLoadingPreview(true);
      setError('');
      setPasswordError('');
      try {
        const res = await apiClient.get(`/escrow/${order.id}/cancel-preview`);
        setPreview(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to load cancellation details.');
      } finally {
        setLoadingPreview(false);
      }
    };
    fetchPreview();
  }, [order.id]);

  const isInstant = preview ? preview.is_instant_eligible : Boolean(order.is_instant_cancel_eligible);
  const selectedNetRefund = preview 
    ? (refundTarget === 'WALLET' ? preview.wallet_net_refund_ghs : preview.momo_net_refund_ghs)
    : 0;
  const selectedFeeDeducted = preview
    ? (preview.gross_amount_ghs - selectedNetRefund)
    : 0;

  const handleSendOtp = async () => {
    setError('');
    setPasswordError('');
    setSendingOtp(true);
    setOtpSentMsg('');
    try {
      const res = await apiClient.post(`/escrow/${order.id}/send-cancel-otp`);
      setOtpSentMsg(res.data?.message || 'Verification code sent to your phone and email.');
      setOtpCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmCancel = async () => {
    setError('');
    setPasswordError('');

    if (isAccountMismatch) {
      const msg = `Account mismatch: You are currently signed in as ${user?.email || user?.phone_number || user?.name || 'another account'}, but this order was placed under ${rawBuyerEmail || buyerPhone}. Please switch to the matching account or log out to cancel.`;
      setError(msg);
      return;
    }

    // If guest buyer, require password or OTP
    if (!isAuthenticated) {
      if (authMethod === 'OTP') {
        if (!cancelOtp || cancelOtp.trim().length < 4) {
          const msg = 'Please enter the 6-digit verification code sent to your phone/email.';
          setError(msg);
          setPasswordError(msg);
          passwordSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          return;
        }
      } else {
        if (!password || password.trim().length < 8) {
          const msg = !password.trim()
            ? (preview?.has_existing_account
                ? 'Please enter your account password to verify identity and cancel.'
                : 'Please enter a password with at least 8 characters to create your account.')
            : 'Password must be at least 8 characters long.';
          setError(msg);
          setPasswordError(msg);
          passwordSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          setTimeout(() => passwordInputRef.current?.focus(), 150);
          return;
        }
      }
    }

    const finalReason = reasonCategory === 'Other' 
      ? (customReason.trim() || 'Other reason') 
      : (customReason.trim() ? `${reasonCategory}: ${customReason.trim()}` : reasonCategory);

    const confirmed = await modal.confirm({
      title: isInstant ? 'Confirm Instant Order Cancellation' : 'Submit Cancellation Request',
      message: isInstant
        ? `Are you sure you want to cancel this order? A net refund of GHS ${selectedNetRefund.toFixed(2)} will be credited to your ${refundTarget === 'WALLET' ? 'In-App Wallet' : 'Mobile Money / Bank account'}.`
        : `Submit cancellation request to seller? The seller will have ${preview?.cancellation_dispatch_grace_minutes || 90} minutes to verify dispatch status.`,
      type: 'warning',
      confirmText: isInstant ? 'Yes, Cancel Order' : 'Submit Request',
      cancelText: 'Keep Order'
    });

    if (!confirmed) return;

    setSubmitting(true);
    setError('');
    setPasswordError('');
    try {
      const res = await apiClient.post(`/escrow/${order.id}/buyer-cancel`, {
        refund_target: refundTarget,
        reason: finalReason,
        password: (!isAuthenticated && authMethod === 'PASSWORD') ? password.trim() : undefined,
        otp_code: (!isAuthenticated && authMethod === 'OTP') ? cancelOtp.trim() : undefined
      });

      // If user account was created or logged in from guest mode, log into auth store
      if (res.data?.token && res.data?.user_id) {
        authLogin(res.data.token, {
          id: res.data.user_id,
          role: res.data.role || 'BUYER',
          email: res.data.email || rawBuyerEmail || '',
          name: res.data.name || buyerName || 'Buyer',
          username: res.data.username || '',
          phone_number: res.data.phone_number || buyerPhone || '',
          is_email_verified: Boolean(res.data?.is_email_verified)
        });
      }

      await modal.alert({
        title: isInstant ? 'Order Cancelled' : 'Request Submitted',
        message: res.data?.message || 'Your cancellation request has been processed.',
        type: 'success',
        icon: 'check'
      });
      onSuccess();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || 'Failed to cancel order.';
      setError(errMsg);
      if (/password|account|credential|code|otp/i.test(errMsg)) {
        setPasswordError(errMsg);
        passwordSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        if (authMethod === 'PASSWORD') {
          setTimeout(() => passwordInputRef.current?.focus(), 150);
        }
      } else {
        contentBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isInstant 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
            }`}>
              {isInstant ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {isInstant ? 'Instant Order Cancellation' : 'Request Order Cancellation'}
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isInstant 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {isInstant ? '⚡ Instant Refund' : `⏳ ${preview?.cancellation_dispatch_grace_minutes || 90}m Seller Review`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Ref: {order.paystack_reference}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div ref={contentBodyRef} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300">
          {error && !isPasswordError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Condition Notice Banner */}
          <div className="p-4 rounded-2xl border bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold">90-Minute Seller Dispatch Verification Window</p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  To protect against items already in transit, the seller will receive an immediate SMS alert with a <strong>90-minute window</strong> to confirm dispatch. If the seller does not report dispatch, your cancellation is auto-confirmed into our 90-minute safety payout hold buffer.
                </p>
                <div className="pt-1.5 flex items-center gap-3 text-[10px] font-semibold text-amber-800/90 dark:text-amber-300/90">
                  <span>Monthly cancellations used: {preview?.buyer_monthly_cancellations_count ?? 0} / {preview?.buyer_monthly_cancel_limit ?? 2}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Indemnity Notice */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">⚖️ HendAxis Trust Protection & Indemnity Notice:</span>
            Cancelling an order known to have already been handed over to a courier is strictly prohibited. The platform reserves the right to freeze balances, reverse credits, or invoice the buyer if prior dispatch is confirmed by logistics tracking.
          </div>

          {/* Loading or Breakdown */}
          {loadingPreview ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Calculating live fee deductions & net refund...</span>
            </div>
          ) : preview ? (
            <>
              {/* Fee Breakdown Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <span>Gross Order Amount Paid:</span>
                  <span className="font-mono font-bold">GHS {preview.gross_amount_ghs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-2">
                  <span>• Escrow Platform Service Fee:</span>
                  <span className="font-mono text-red-600 dark:text-red-400">- GHS {preview.platform_fee_ghs.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-2">
                  <span>• Payment Gateway Processing Cost (1.95%):</span>
                  <span className="font-mono text-red-600 dark:text-red-400">- GHS {preview.gateway_fee_ghs.toFixed(2)}</span>
                </div>
                {refundTarget === 'MOMO_PAYOUT' && preview.momo_payout_fee_ghs > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pl-2">
                    <span>• MoMo / Bank Transfer Payout Fee ({preview.payout_transfer_fee_percent ?? 1.95}%):</span>
                    <span className="font-mono text-red-600 dark:text-red-400">- GHS {preview.momo_payout_fee_ghs.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs block">
                      Net Refund to You:
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Total fee deducted: GHS {selectedFeeDeducted.toFixed(2)}
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                    GHS {selectedNetRefund.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Destination Selector: Wallet vs Phone Withdrawal */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Where would you like to receive your refund? *
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: In-App Wallet */}
                  <div 
                    onClick={() => setRefundTarget('WALLET')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between gap-2 ${
                      refundTarget === 'WALLET'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">In-App Wallet</span>
                      </div>
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        FREE PAYOUT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Instant & zero payout fee. Spend immediately on any payment link.
                    </p>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        GHS {preview.wallet_net_refund_ghs.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Option B: Direct MoMo Withdrawal */}
                  <div 
                    onClick={() => setRefundTarget('MOMO_PAYOUT')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between gap-2 ${
                      refundTarget === 'MOMO_PAYOUT'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">Mobile Money / Bank</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Sent to your phone ({preview.buyer_phone || order.buyer_phone}). Deducts {preview.payout_transfer_fee_percent ?? 1.95}% (GHS {preview.momo_payout_fee_ghs.toFixed(2)}) payment provider transfer fee.
                    </p>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                        GHS {preview.momo_net_refund_ghs.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Mismatch Banner */}
              {isAccountMismatch && (
                <div className="p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <AlertTriangle className="w-4 h-4 text-white" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h4 className="font-extrabold text-xs text-amber-950 dark:text-amber-100">
                        Account Mismatch Detected
                      </h4>
                      <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                        You are currently signed in as <strong>{user?.email || user?.phone_number || user?.name || 'another account'}</strong>, but this order was placed under <strong>{buyerName || 'Buyer'} ({rawBuyerEmail || buyerPhone})</strong>.
                      </p>
                      <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                        For customer protection, order cancellation can only be initiated by the account matching the buyer's contact details.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800/60 gap-2 flex-wrap">
                    <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                      Need to cancel as this order's buyer?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        authLogout();
                        setError('');
                        setPasswordError('');
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5"
                    >
                      Log Out to Switch Account
                    </button>
                  </div>
                </div>
              )}

              {/* Verified Owner Banner */}
              {isAuthorizedBuyer && (
                <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 animate-in fade-in">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-emerald-950 dark:text-emerald-100">Verified Order Owner</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                        {isStaffOrAdmin ? 'Staff / Admin' : 'Identity Verified'}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 mt-0.5">
                      Signed in as <strong>{user?.email || user?.phone_number || user?.name}</strong> matching this order. No password or OTP required.
                    </p>
                  </div>
                </div>
              )}

              {/* Guest Buyer Account Creation / Login Section */}
              {!isAuthenticated && (
                <div 
                  ref={passwordSectionRef}
                  className={`p-4 rounded-2xl border-2 transition-all duration-300 space-y-3.5 ${
                    isPasswordError
                      ? 'border-red-500 dark:border-red-500 bg-red-50/70 dark:bg-red-950/40 shadow-lg shadow-red-500/10 ring-4 ring-red-400/20'
                      : 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5 transition-colors ${
                      isPasswordError
                        ? 'bg-red-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}>
                      {isPasswordError ? <AlertTriangle className="w-4 h-4 animate-bounce" /> : <ShieldCheck className="w-4 h-4" />}
                    </div>
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-extrabold text-xs ${
                          isPasswordError ? 'text-red-950 dark:text-red-200' : 'text-indigo-950 dark:text-indigo-200'
                        }`}>
                          {authMethod === 'OTP'
                            ? 'Verify Order Ownership via SMS/Email Code'
                            : preview.has_existing_account 
                              ? 'Account Found – Enter Password to Cancel' 
                              : 'Account Creation Required for Refund'}
                        </h4>
                        {isPasswordError && (
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-100 dark:bg-red-900/60 px-2 py-0.5 rounded-full">
                            {authMethod === 'OTP' ? 'Code Required' : 'Password Required'}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] leading-relaxed ${
                        isPasswordError ? 'text-red-900/90 dark:text-red-300/90 font-medium' : 'text-indigo-800/80 dark:text-indigo-300/80'
                      }`}>
                        {authMethod === 'OTP'
                          ? `We will send a one-time 6-digit verification code to your phone (${buyerPhone || 'on file'}) and email to confirm you own this order.`
                          : preview.has_existing_account 
                            ? 'To verify you are the order owner and secure your refund, please enter your existing account password.'
                            : 'Because you checked out as a guest, please create a password to set up your account. Your In-App Wallet and refund balance will be securely linked to this account.'}
                      </p>
                    </div>
                  </div>

                  {/* Pre-filled Account Details Confirmation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    <div className="truncate">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Name</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{buyerName || 'Buyer'}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{buyerEmail || '—'}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{buyerPhone || '—'}</span>
                    </div>
                  </div>

                  {authMethod === 'PASSWORD' ? (
                    /* Password Input */
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className={`block text-xs font-bold ${
                          isPasswordError ? 'text-red-700 dark:text-red-300' : 'text-indigo-950 dark:text-indigo-200'
                        }`}>
                          {preview.has_existing_account ? 'Account Password *' : 'Create Account Password (min. 8 characters) *'}
                        </label>
                        {!preview.has_existing_account && (
                          <span className={`text-[10px] font-semibold ${
                            password.length >= 8 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : password.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                          }`}>
                            {password.length}/8 characters
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${
                          isPasswordError ? 'text-red-500' : 'text-slate-400'
                        }`}>
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          ref={passwordInputRef}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => {
                            setPassword(e.target.value);
                            if (passwordError) setPasswordError('');
                            if (error && /password|account|credential/i.test(error)) setError('');
                          }}
                          placeholder={preview.has_existing_account ? 'Enter your account password' : 'Create a secure password (min 8 chars)'}
                          className={`w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                            isPasswordError
                              ? 'border-red-500 dark:border-red-500 ring-2 ring-red-400/30 focus:ring-red-500 focus:border-red-500 bg-red-50/20'
                              : 'border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Alternatives: SMS/Email OTP & Forgot Password */}
                      <div className="flex items-center justify-between pt-1 text-[11px] gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMethod('OTP');
                            setPasswordError('');
                            handleSendOtp();
                          }}
                          className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Can't remember password? Verify via SMS/Email code</span>
                        </button>

                        {preview.has_existing_account && (
                          <a
                            href={`/forgot-password?identifier=${encodeURIComponent(buyerEmail || buyerPhone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium hover:underline shrink-0"
                          >
                            Forgot password? ↗
                          </a>
                        )}
                      </div>

                      {/* Inline password error alert directly in this section */}
                      {isPasswordError && (
                        <div className="p-2.5 bg-red-100/90 dark:bg-red-950/70 border border-red-300 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                          <span className="font-semibold leading-snug">
                            {passwordError || error}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* OTP Input Mode */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className={`block text-xs font-bold ${
                          isPasswordError ? 'text-red-700 dark:text-red-300' : 'text-indigo-950 dark:text-indigo-200'
                        }`}>
                          6-Digit Verification Code *
                        </label>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp || otpCooldown > 0}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {sendingOtp 
                            ? 'Sending code...' 
                            : otpCooldown > 0 
                              ? `Resend in ${otpCooldown}s` 
                              : 'Send / Resend Code'}
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={cancelOtp}
                          onChange={e => {
                            setCancelOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                            if (passwordError) setPasswordError('');
                            if (error && /password|account|credential|code|otp/i.test(error)) setError('');
                          }}
                          placeholder="Enter 6-digit code (e.g. 123456)"
                          className={`w-full px-3 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-sm font-mono tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition text-center ${
                            isPasswordError
                              ? 'border-red-500 dark:border-red-500 ring-2 ring-red-400/30 focus:ring-red-500 focus:border-red-500 bg-red-50/20'
                              : 'border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500'
                          }`}
                        />
                      </div>

                      {otpSentMsg && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          ✓ {otpSentMsg}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[11px] gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMethod('PASSWORD');
                            setPasswordError('');
                          }}
                          className="font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:underline cursor-pointer"
                        >
                          ← Use Password instead
                        </button>

                        {preview.has_existing_account && (
                          <a
                            href={`/forgot-password?identifier=${encodeURIComponent(buyerEmail || buyerPhone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium hover:underline shrink-0"
                          >
                            Forgot password? ↗
                          </a>
                        )}
                      </div>

                      {/* Inline OTP error alert */}
                      {isPasswordError && (
                        <div className="p-2.5 bg-red-100/90 dark:bg-red-950/70 border border-red-300 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                          <span className="font-semibold leading-snug">
                            {passwordError || error}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Reason Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Reason for Cancellation *
                </label>
                <select
                  value={reasonCategory}
                  onChange={e => setReasonCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Changed my mind">Changed my mind</option>
                  <option value="Found a better price elsewhere">Found a better price elsewhere</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Shipping address is incorrect">Shipping address is incorrect</option>
                  <option value="Seller unresponsive / delayed">Seller unresponsive / delayed</option>
                  <option value="Other">Other</option>
                </select>

                <textarea
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Additional details (optional)..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex flex-col gap-3">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-start justify-between gap-2.5 text-xs animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <span className="font-bold block">{error}</span>
                  {isPasswordError && (
                    <span className="text-[11px] text-red-600/90 dark:text-red-400/90 block mt-0.5">
                      {authMethod === 'OTP'
                        ? 'Please enter the 6-digit verification code in the highlighted section above.'
                        : 'Please enter your password in the highlighted section above.'}
                    </span>
                  )}
                </div>
              </div>
              {isPasswordError && (
                <button
                  type="button"
                  onClick={() => {
                    passwordSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
                    if (authMethod === 'PASSWORD') {
                      passwordInputRef.current?.focus();
                    }
                  }}
                  className="shrink-0 text-[11px] font-bold text-red-700 dark:text-red-300 hover:underline px-2.5 py-1 bg-red-100 dark:bg-red-900/50 rounded-lg cursor-pointer transition"
                >
                  {authMethod === 'OTP' ? 'Enter Code ↑' : 'Enter Password ↑'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Keep Order
            </button>

            <button
              type="button"
              onClick={handleConfirmCancel}
              disabled={submitting || loadingPreview || !preview || isAccountMismatch}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                isAccountMismatch
                  ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
                  : isInstant
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isAccountMismatch ? (
                <span>Account Mismatch</span>
              ) : (
                <>
                  <span>
                    {!isAuthenticated 
                      ? (authMethod === 'OTP'
                          ? (isInstant ? '⚡ Verify Code & Cancel' : 'Verify Code & Request')
                          : (isInstant 
                              ? (preview?.has_existing_account ? '⚡ Verify & Cancel Order' : '⚡ Create Account & Cancel')
                              : (preview?.has_existing_account ? 'Verify & Request' : 'Create Account & Request')
                            )
                        )
                      : (isInstant ? '⚡ Cancel & Refund' : 'Submit Cancellation Request')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
