import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, Package, AlertCircle, CheckCircle, Clock, 
  Printer, X, Truck, AlertTriangle, Loader2, XCircle, KeyRound, RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '../api/client';

interface SellerTxn {
  id: string;
  status: string;
  total_amount_ghs: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  shipping_address: string;
  title: string;
  created_at: string;
  paystack_reference: string;
  link_id: string;
  inspection_starts_at?: string;
  delivery_method?: string;
  dispatched_at?: string;
}

export const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  AWAITING_PAYMENT:    { icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Awaiting Payment' },
  PAYMENT_RECEIVED:    { icon: Package,       color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Awaiting Shipping' },
  DELIVERY_IN_PROGRESS:{ icon: Truck,         color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'In Transit' },
  INSPECTION_PERIOD:   { icon: AlertCircle,   color: 'text-purple-600', bg: 'bg-purple-50', label: 'Inspection' },
  COMPLETED:           { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  label: 'Completed' },
  DISPUTED:            { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50',    label: 'Disputed' },
  CANCELLED:           { icon: AlertTriangle, color: 'text-gray-600',   bg: 'bg-gray-50',   label: 'Cancelled' },
  REFUNDED:            { icon: CheckCircle,   color: 'text-teal-600',   bg: 'bg-teal-50',   label: 'Refunded' },
};

// ─── Dispatch Modal ─────────────────────────────────────────────────────────

type DeliveryPath = 'COURIER_API' | 'INFORMAL_BUS';

interface DispatchModalProps {
  txn: SellerTxn;
  onClose: () => void;
  onSuccess: () => void;
}

function DispatchModal({ txn, onClose, onSuccess }: DispatchModalProps) {
  const [path, setPath] = useState<DeliveryPath>('COURIER_API');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverCar, setDriverCar] = useState('');
  const [station, setStation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: any = { delivery_method: path };
      if (path === 'COURIER_API') {
        payload.courier_name = courierName;
        payload.tracking_number = trackingNumber;
      } else {
        payload.driver_phone = driverPhone;
        payload.driver_car_number = driverCar || undefined;
        payload.destination_station = station;
      }
      await apiClient.post(`/escrow/seller/transactions/${txn.id}/dispatch`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to dispatch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Dispatch Order</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{txn.paystack_reference}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Path Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPath('COURIER_API')}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  path === 'COURIER_API'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Truck className={`h-5 w-5 mb-1 ${path === 'COURIER_API' ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className={`text-sm font-semibold ${path === 'COURIER_API' ? 'text-blue-700' : 'text-gray-700'}`}>
                  Formal Courier
                </p>
                <p className="text-xs text-gray-500">FedEx, DHL, API courier</p>
              </button>
              <button
                type="button"
                onClick={() => setPath('INFORMAL_BUS')}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  path === 'INFORMAL_BUS'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Package className={`h-5 w-5 mb-1 ${path === 'INFORMAL_BUS' ? 'text-amber-600' : 'text-gray-400'}`} />
                <p className={`text-sm font-semibold ${path === 'INFORMAL_BUS' ? 'text-amber-700' : 'text-gray-700'}`}>
                  Informal Bus
                </p>
                <p className="text-xs text-gray-500">Tro-tro, VIP, station</p>
              </button>
            </div>
          </div>

          {/* Path A Fields */}
          {path === 'COURIER_API' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Courier Name *</label>
                <input
                  type="text"
                  required
                  value={courierName}
                  onChange={e => setCourierName(e.target.value)}
                  placeholder="e.g. DHL, FedEx, Zipline"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tracking Number *</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Path B Fields */}
          {path === 'INFORMAL_BUS' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>What happens next:</strong> The buyer will receive an SMS with the driver info and a Secret OTP. They must present their ID + OTP at pickup. You then verify their OTP here to confirm delivery.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Driver Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={driverPhone}
                  onChange={e => setDriverPhone(e.target.value)}
                  placeholder="e.g. 0244123456"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Car / Vehicle Number <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  value={driverCar}
                  onChange={e => setDriverCar(e.target.value)}
                  placeholder="e.g. GR 1234-22"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Destination Station *</label>
                <input
                  type="text"
                  required
                  value={station}
                  onChange={e => setStation(e.target.value)}
                  placeholder="e.g. Accra Central Station, Kumasi Adum"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
              {loading ? 'Dispatching…' : 'Confirm Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Verify Delivery OTP Modal ───────────────────────────────────────────────

interface VerifyOtpModalProps {
  txn: SellerTxn;
  onClose: () => void;
  onSuccess: () => void;
}

function VerifyOtpModal({ txn, onClose, onSuccess }: VerifyOtpModalProps) {
  const [otpCode, setOtpCode] = useState('');
  const [buyerIdPhotoUrl, setBuyerIdPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: any = { otp_code: otpCode.trim() };
      if (buyerIdPhotoUrl.trim()) {
        payload.buyer_id_photo_url = buyerIdPhotoUrl.trim();
      }
      await apiClient.post(`/escrow/seller/transactions/${txn.id}/verify-delivery`, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      await apiClient.post(`/escrow/seller/transactions/${txn.id}/resend-otp`);
      setResendMsg("OTP resent to buyer's phone and email.");
    } catch (err: any) {
      setResendMsg(err.response?.data?.detail || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Verify Delivery OTP</h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{txn.paystack_reference}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            Ask the buyer to show you their Secret OTP from the SMS they received. Enter it below to confirm delivery and start the inspection period.
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Secret OTP (from buyer)</label>
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 482913"
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-center font-mono text-lg tracking-widest focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Buyer ID Photo URL (Optional)</label>
            <input
              type="url"
              value={buyerIdPhotoUrl}
              onChange={e => setBuyerIdPhotoUrl(e.target.value)}
              placeholder="https://link-to-id-image.com/..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">Upload a photo of the buyer's ID for extra security.</p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
          >
            <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Resending…' : "Buyer didn't get the OTP? Resend it"}
          </button>
          {resendMsg && <p className="text-xs text-green-600">{resendMsg}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {loading ? 'Verifying…' : 'Confirm Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Force Courier Delivered Modal (Path A) ──────────────────────────────────

interface ForceCourierDeliveredModalProps {
  txn: SellerTxn;
  onClose: () => void;
  onSuccess: () => void;
}

function ForceCourierDeliveredModal({ txn, onClose, onSuccess }: ForceCourierDeliveredModalProps) {
  // step: 'checking' | 'reason' | 'done'
  const [step, setStep] = useState<'checking' | 'reason' | 'done'>('checking');
  const [courierStatus, setCourierStatus] = useState('');
  const [apiMessage, setApiMessage] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // On mount: fire first API check (no reason)
  const checkApi = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post(`/escrow/seller/transactions/${txn.id}/force-delivered`, {});
      const data = res.data;
      if (data.completed) {
        setStep('done');
        setTimeout(() => { onSuccess(); onClose(); }, 1500);
      } else if (data.requires_reason) {
        setCourierStatus(data.courier_status || 'UNKNOWN');
        setApiMessage(data.message || '');
        setStep('reason');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to check courier status.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fire on mount
  useEffect(() => { checkApi(); }, []);

  const handleSubmitReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    setError('');
    try {
      await apiClient.post(`/escrow/seller/transactions/${txn.id}/force-delivered`, {
        seller_reason: reason.trim(),
      });
      setStep('done');
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to confirm delivery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              Force Delivery Confirmation
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{txn.paystack_reference}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Step: Checking courier API */}
          {step === 'checking' && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
              <p className="text-sm text-gray-600">Checking courier API for latest status…</p>
            </div>
          )}

          {/* Step: API says not delivered — need reason */}
          {step === 'reason' && (
            <form onSubmit={handleSubmitReason} className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-orange-800">Courier API Status: <span className="font-mono">{courierStatus}</span></p>
                <p className="text-xs text-orange-700">{apiMessage}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Why are you marking this as delivered? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Driver confirmed delivery in person. Package was handed to buyer at station at 3pm."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">This note will be logged for dispute resolution.</p>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason.trim()}
                  className="flex-1 py-2.5 px-4 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                  {loading ? 'Confirming…' : 'Override & Mark Delivered'}
                </button>
              </div>
            </form>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-900">Delivery Confirmed!</p>
              <p className="text-xs text-gray-500">Inspection period has started.</p>
            </div>
          )}

          {error && step === 'checking' && (
            <div className="space-y-3">
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2 px-4 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Close</button>
                <button onClick={checkApi} className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition">Retry</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard View ─────────────────────────────────────────────────────

export default function DashboardView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [txns, setTxns] = useState<SellerTxn[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
  
  // Pagination
  const limit = 10;
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  
  // Parcel tag modal
  const [selectedTxn, setSelectedTxn] = useState<SellerTxn | null>(null);

  // Dispatch modal
  const [dispatchTxn, setDispatchTxn] = useState<SellerTxn | null>(null);

  // Verify OTP modal (Path B)
  const [verifyOtpTxn, setVerifyOtpTxn] = useState<SellerTxn | null>(null);

  // Force courier delivered modal (Path A)
  const [forceCourierTxn, setForceCourierTxn] = useState<SellerTxn | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const res = await apiClient.get(`/escrow/seller/transactions?${params.toString()}`);
      setTxns(res.data.items);
      setTotalCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('offset', '0');
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    setSearchParams(params);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this transaction? The platform fee will be charged to you and the buyer will be fully refunded.')) return;
    try {
      await apiClient.post(`/escrow/seller/transactions/${id}/cancel`);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert('Failed to cancel transaction.');
    }
  };

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('offset', newOffset.toString());
    setSearchParams(params);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your escrow sales, print parcel tags, and track deliveries.
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 p-4 print:hidden">
        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder="Txn ID, phone, email, product..." 
                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="AWAITING_PAYMENT">Awaiting Payment</option>
                <option value="PAYMENT_RECEIVED">Awaiting Shipping</option>
                <option value="DELIVERY_IN_PROGRESS">In Transit</option>
                <option value="INSPECTION_PERIOD">Inspection Period</option>
                <option value="COMPLETED">Completed</option>
                <option value="DISPUTED">Disputed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button 
              type="submit" 
              className="mt-5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product & Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Loading transactions...</p>
                  </td>
                </tr>
              ) : txns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No transactions found</p>
                    <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                txns.map((txn) => {
                  const cfg = STATUS_CONFIG[txn.status] || STATUS_CONFIG['AWAITING_PAYMENT'];
                  const Icon = cfg.icon;
                  const isInformalInTransit = txn.status === 'DELIVERY_IN_PROGRESS' && txn.delivery_method === 'INFORMAL_BUS';
                  
                  // Calculate if courier is stuck for > 36 hours
                  let isCourierStuck = false;
                  if (txn.status === 'DELIVERY_IN_PROGRESS' && txn.delivery_method === 'COURIER_API' && txn.dispatched_at) {
                    const dispatched = new Date(txn.dispatched_at).getTime();
                    const hoursPassed = (Date.now() - dispatched) / (1000 * 60 * 60);
                    if (hoursPassed >= 36) {
                      isCourierStuck = true;
                    }
                  }

                  return (
                    <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{new Date(txn.created_at).toLocaleDateString()}</div>
                        <button 
                          onClick={() => setSelectedTxn(txn)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-mono mt-0.5 font-bold transition-colors underline"
                          title="View Parcel Tag"
                        >
                          {txn.paystack_reference}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{txn.buyer_name || 'No Name'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{txn.buyer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 line-clamp-1" title={txn.title}>{txn.title}</div>
                        <div className="text-xs font-bold text-gray-900 mt-0.5">GHS {Number(txn.total_amount_ghs).toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </span>
                        {txn.delivery_method && txn.status === 'DELIVERY_IN_PROGRESS' && (
                          <div className="text-xs text-gray-400 mt-1">
                            {txn.delivery_method === 'INFORMAL_BUS' ? '🚌 Informal Bus' : '📦 Courier'}
                          </div>
                        )}
                        {txn.status === 'INSPECTION_PERIOD' && txn.inspection_starts_at && (
                          (() => {
                            const start = new Date(txn.inspection_starts_at!).getTime();
                            let hoursAllowed = 24;
                            if (txn.total_amount_ghs >= 2000 && txn.total_amount_ghs < 10000) hoursAllowed = 48;
                            else if (txn.total_amount_ghs >= 10000) hoursAllowed = 72;
                            const end = start + hoursAllowed * 60 * 60 * 1000;
                            const diff = end - Date.now();
                            if (diff <= 0) {
                              return <div className="text-xs text-red-600 font-medium mt-1">Expired</div>;
                            }
                            const hours = Math.floor(diff / (1000 * 60 * 60));
                            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            return <div className="text-xs text-gray-500 font-medium mt-1">{hours}h {mins}m left</div>;
                          })()
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {txn.status === 'PAYMENT_RECEIVED' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setDispatchTxn(txn)}
                              className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"
                            >
                              <Truck className="h-4 w-4" />
                              Dispatch
                            </button>
                            <button 
                              onClick={() => handleCancel(txn.id)}
                              title="Cancel Transaction"
                              className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-lg transition-colors"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        ) : isInformalInTransit ? (
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => setVerifyOtpTxn(txn)}
                              className="text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"
                            >
                              <KeyRound className="h-4 w-4" />
                              Verify Delivery OTP
                            </button>
                            <p className="text-xs text-gray-400 text-right">Ask buyer for their OTP at pickup</p>
                          </div>
                        ) : isCourierStuck ? (
                           <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => setForceCourierTxn(txn)}
                              className="text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"
                            >
                              <ShieldAlert className="h-4 w-4" />
                              Force Delivered
                            </button>
                            <p className="text-xs text-orange-500 text-right w-48">Over 36h since dispatch. Check courier status or override with a reason.</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No actions</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        {!loading && totalCount > limit && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{offset + 1}</span> to <span className="font-medium">{Math.min(offset + limit, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(offset + limit)}
                    disabled={offset + limit >= totalCount}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dispatch Modal */}
      {dispatchTxn && (
        <DispatchModal
          txn={dispatchTxn}
          onClose={() => setDispatchTxn(null)}
          onSuccess={fetchTransactions}
        />
      )}

      {/* Verify OTP Modal (Path B - Informal Bus) */}
      {verifyOtpTxn && (
        <VerifyOtpModal
          txn={verifyOtpTxn}
          onClose={() => setVerifyOtpTxn(null)}
          onSuccess={fetchTransactions}
        />
      )}

      {/* Force Courier Delivered Modal (Path A - Courier) */}
      {forceCourierTxn && (
        <ForceCourierDeliveredModal
          txn={forceCourierTxn}
          onClose={() => setForceCourierTxn(null)}
          onSuccess={fetchTransactions}
        />
      )}

      {/* Modal / Parcel Tag for Printing */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden print:shadow-none print:max-w-none print:w-[10cm] print:border print:border-black print:rounded-none">
            
            {/* Modal Header - Hidden on print */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between print:hidden">
              <h3 className="text-lg font-bold text-gray-900">Parcel Tag</h3>
              <button 
                onClick={() => setSelectedTxn(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div className="p-6 print:p-4 space-y-4 font-sans text-black bg-white">
              <div className="border-b-2 border-black pb-4 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 print:text-black mb-1">Transaction ID</p>
                <p className="text-2xl font-black font-mono tracking-tight">{selectedTxn.paystack_reference}</p>
              </div>
              
              <div className="text-center py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 print:text-black mb-1">Contact Phone</p>
                <p className="text-3xl font-black">{selectedTxn.buyer_phone}</p>
              </div>

              <div className="border-t-2 border-black pt-4 space-y-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 print:text-black mb-1">Deliver To:</p>
                  <div className="text-lg font-bold leading-snug">
                    {selectedTxn.buyer_name || 'N/A'}<br />
                    {selectedTxn.buyer_phone}<br />
                    {selectedTxn.buyer_email || 'No email'}<br />
                    {selectedTxn.shipping_address || 'No address provided'}
                  </div>
                </div>
              </div>
              
              <div className="pt-4 text-center">
                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 print:text-black border border-gray-300 print:border-black inline-block px-3 py-1 rounded-full print:rounded-none">
                  HendAxis Trust Secure Escrow
                </p>
              </div>
            </div>

            {/* Modal Footer - Hidden on print */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 print:hidden">
              <button 
                onClick={() => setSelectedTxn(null)}
                className="flex-1 py-2.5 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
              <button 
                onClick={handlePrint}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" /> Print Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
