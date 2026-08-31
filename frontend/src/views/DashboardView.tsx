import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Filter, Package, CheckCircle, 
  Printer, X, Truck, AlertTriangle, Loader2, XCircle, KeyRound, RefreshCw,
  ShieldAlert, MapPin, Copy
} from 'lucide-react';
import { apiClient } from '../api/client';
import { compressImageToWebP } from '../utils/imageUtils';
import { useEscapeKey } from '../utils/useEscapeKey';

interface SellerTxn {
  id: string;
  status: string;
  total_amount_ghs: number;
  platform_fee_ghs?: number;
  shipping_fee_ghs?: number;
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
  delivered_at?: string;
  waybill_photo_url?: string;
  courier_name?: string;
  carrier_code?: string;
  tracking_number?: string;
  carrier_tracking_url?: string;
  driver_phone?: string;
  driver_car_number?: string;
  destination_station?: string;
  buyer_dispute_reason?: string;
  buyer_dispute_photos?: string[];
  seller_dispute_response?: string;
  seller_dispute_photos?: string[];
  manager_dispute_notes?: string;
  manager_dispute_photos?: string[];
}

import { STATUS_CONFIG } from '../constants/statusConfig';

// ─── Dispatch Modal ─────────────────────────────────────────────────────────

type DeliveryPath = 'COURIER_API' | 'INFORMAL_BUS';

interface DispatchModalProps {
  txn: SellerTxn;
  onClose: () => void;
  onSuccess: () => void;
}

function DispatchModal({ txn, onClose, onSuccess }: DispatchModalProps) {
  useEscapeKey(onClose);
  const [path, setPath] = useState<DeliveryPath>('COURIER_API');
  const [carrierCode, setCarrierCode] = useState<string>('DHL');
  const [courierName, setCourierName] = useState('DHL Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverCar, setDriverCar] = useState('');
  const [station, setStation] = useState('');
  const [waybillPhoto, setWaybillPhoto] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleCarrierChange = (code: string) => {
    setCarrierCode(code);
    if (code === 'DHL') setCourierName('DHL Express');
    else if (code === 'FEDEX') setCourierName('FedEx');
    else if (code === 'UPS') setCourierName('UPS');
    else if (code === 'EMS') setCourierName('EMS Ghana Post');
    else if (code === 'SPEEDAF') setCourierName('Speedaf Express');
    else if (code === 'OTHERS') setCourierName('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    setError('');
    try {
      const webp = await compressImageToWebP(file);
      setWaybillPhoto(webp);
    } catch (err) {
      console.error("Failed to compress package photo:", err);
      setError("Failed to process selected package photo.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: any = { 
        delivery_method: path,
        waybill_photo_url: waybillPhoto || undefined
      };
      if (path === 'COURIER_API') {
        payload.carrier_code = carrierCode;
        payload.courier_name = courierName || carrierCode;
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
          {/* Buyer Delivery Reference Card */}
          <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-3.5 space-y-1.5 text-xs text-blue-950 dark:text-blue-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 dark:text-blue-300 text-xs flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Buyer Delivery Details
              </span>
              {copiedAddress ? (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">Copied!</span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${txn.buyer_name || ''} | ${txn.buyer_phone || ''} | ${txn.shipping_address || 'No address'}`);
                    setCopiedAddress(true);
                    setTimeout(() => setCopiedAddress(false), 2000);
                  }}
                  className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-blue-100/60 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-700/80 px-2 py-0.5 rounded transition flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy Details
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-200/60 dark:border-blue-800/50 font-medium">
              <div>
                <span className="text-gray-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Buyer Name</span>
                <span className="text-gray-900 dark:text-slate-100 font-semibold">{txn.buyer_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Buyer Phone</span>
                <span className="text-gray-900 dark:text-slate-100 font-mono font-semibold">{txn.buyer_phone || 'N/A'}</span>
              </div>
            </div>
            <div className="pt-1">
              <span className="text-gray-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Delivery Address / Destination</span>
              <span className="text-gray-900 dark:text-slate-100 font-semibold block bg-white dark:bg-slate-800 p-2 rounded border border-blue-100 dark:border-slate-700 mt-0.5">
                {txn.shipping_address || 'No specific address specified by buyer'}
              </span>
            </div>
          </div>

          {/* Path Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Delivery Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPath('COURIER_API')}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  path === 'COURIER_API'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                    : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <Truck className={`h-5 w-5 mb-1 ${path === 'COURIER_API' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'}`} />
                <p className={`text-sm font-semibold ${path === 'COURIER_API' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'}`}>
                  Formal Courier
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">FedEx, DHL, API courier</p>
              </button>
              <button
                type="button"
                onClick={() => setPath('INFORMAL_BUS')}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  path === 'INFORMAL_BUS'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50'
                    : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <Package className={`h-5 w-5 mb-1 ${path === 'INFORMAL_BUS' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-slate-500'}`} />
                <p className={`text-sm font-semibold ${path === 'INFORMAL_BUS' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-slate-300'}`}>
                  Informal Bus
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Tro-tro, VIP, station</p>
              </button>
            </div>
          </div>

          {/* Path A Fields */}
          {path === 'COURIER_API' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Select Courier / Shipping Provider *</label>
                <select
                  value={carrierCode}
                  onChange={e => handleCarrierChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="DHL" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">DHL Express</option>
                  <option value="FEDEX" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">FedEx</option>
                  <option value="UPS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">UPS</option>
                  <option value="EMS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">EMS / Ghana Post</option>
                  <option value="SPEEDAF" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Speedaf Express</option>
                  <option value="OTHERS" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">Others (Custom Courier / Local Rider)</option>
                </select>
              </div>

              {carrierCode === 'OTHERS' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Courier Name *</label>
                  <input
                    type="text"
                    required
                    value={courierName}
                    onChange={e => setCourierName(e.target.value)}
                    placeholder="e.g. Speedaf, Yango, Local Dispatch"
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Tracking Number *</label>
                <input
                  type="text"
                  required
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 font-mono bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Path B Fields */}
          {path === 'INFORMAL_BUS' && (
            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
                <strong>What happens next:</strong> The buyer will receive an SMS with the driver info and a Secret OTP. They must present their ID + OTP at pickup. You then verify their OTP here to confirm delivery.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Driver Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={driverPhone}
                  onChange={e => setDriverPhone(e.target.value)}
                  placeholder="e.g. 0244123456"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Car / Vehicle Number <span className="text-gray-400 dark:text-slate-500">(optional)</span></label>
                <input
                  type="text"
                  value={driverCar}
                  onChange={e => setDriverCar(e.target.value)}
                  placeholder="e.g. GR 1234-22"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Destination Station *</label>
                <input
                  type="text"
                  required
                  value={station}
                  onChange={e => setStation(e.target.value)}
                  placeholder="e.g. Accra Central Station, Kumasi Adum"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Package / Waybill Photo Upload */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">Attach Package / Waybill Photo</label>
              {isCompressing && <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-medium">Compressing WebP...</span>}
            </div>
            <input
              type="file"
              accept="image/*"
              disabled={isCompressing}
              onChange={handlePhotoUpload}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs rounded-xl p-2 cursor-pointer disabled:opacity-50"
            />
            {waybillPhoto && (
              <div className="mt-2 relative inline-block">
                <img src={waybillPhoto} alt="Package preview" className="w-16 h-16 object-cover rounded-lg border border-gray-300" />
                <button
                  type="button"
                  onClick={() => setWaybillPhoto('')}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

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
              disabled={loading || isCompressing}
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
  useEscapeKey(onClose);
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

// ─── Seller Dispute Modal ───────────────────────────────────────────────────

interface SellerDisputeModalProps {
  txn: SellerTxn;
  onClose: () => void;
  onSuccess: () => void;
}

function SellerDisputeModal({ txn, onClose, onSuccess }: SellerDisputeModalProps) {
  const [response, setResponse] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      alert("You can upload a maximum of 5 evidence photos.");
      return;
    }
    setIsCompressing(true);
    setError('');
    try {
      const compressedList: string[] = [];
      for (const file of files) {
        const webp = await compressImageToWebP(file);
        compressedList.push(webp);
      }
      setPhotos(prev => [...prev, ...compressedList].slice(0, 5));
    } catch (err) {
      console.error("Failed to compress image:", err);
      setError("Failed to process selected image(s). Please try another image file.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!response.trim()) {
      setError('Please provide your response details.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(`/escrow/${txn.id}/seller-dispute-response`, {
        response: response.trim(),
        photos
      });
      alert('Your dispute response and evidence photos have been submitted successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4">
          <span className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded">
            {txn.paystack_reference}
          </span>
          <h3 className="text-lg font-bold text-gray-900 mt-2">Dispute Evidence & Response</h3>
        </div>

        {/* Buyer Claim */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-xs space-y-2">
          <span className="font-bold text-red-600 block uppercase">Buyer Dispute Claim:</span>
          <p className="text-gray-800">{txn.buyer_dispute_reason || 'No detailed claim provided by buyer.'}</p>
          
          {txn.buyer_dispute_photos && txn.buyer_dispute_photos.length > 0 && (
            <div>
              <span className="text-gray-500 font-medium block mt-2 mb-1">Buyer Evidence Photos ({txn.buyer_dispute_photos.length}/5):</span>
              <div className="flex flex-wrap gap-2">
                {txn.buyer_dispute_photos.map((url: string, idx: number) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Buyer evidence ${idx + 1}`}
                    onClick={() => setPreviewImg(url)}
                    className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:border-red-500 transition cursor-pointer"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Your Counter Response *</label>
            <textarea
              rows={3}
              required
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Explain your side of the dispute (e.g. proof of shipping condition, waybill receipt, item matches link description)..."
              className="w-full rounded-xl border border-gray-300 p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-gray-700 font-semibold">Upload Seller Evidence Photos (Max 5)</label>
              <span className="text-[11px] font-mono text-gray-500">
                {isCompressing ? 'Compressing WebP...' : `${photos.length}/5 photos`}
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={photos.length >= 5 || isCompressing}
              onChange={handlePhotoUpload}
              className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl p-2.5 cursor-pointer disabled:opacity-50"
            />
            {isCompressing && (
              <div className="flex items-center gap-2 mt-2 text-xs text-blue-600 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing photos to lightweight WebP...
              </div>
            )}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photos.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt={`Seller evidence ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isCompressing}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Response"}
            </button>
          </div>
        </form>

        {previewImg && (
          <div onClick={() => setPreviewImg(null)} className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-gray-900/80 cursor-zoom-out">
            <img src={previewImg} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        )}
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
  
  // Parcel tag & transaction detail modal
  const [selectedTxn, setSelectedTxn] = useState<SellerTxn | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'AUDIT' | 'TAG'>('AUDIT');

  // Dispatch modal
  const [dispatchTxn, setDispatchTxn] = useState<SellerTxn | null>(null);

  // Verify OTP modal (Path B)
  const [verifyOtpTxn, setVerifyOtpTxn] = useState<SellerTxn | null>(null);

  // Force courier delivered modal (Path A)
  const [forceCourierTxn, setForceCourierTxn] = useState<SellerTxn | null>(null);

  // Seller dispute modal
  const [sellerDisputeTxn, setSellerDisputeTxn] = useState<SellerTxn | null>(null);

  // Rate Seller modal
  const [rateSellerTxn, setRateSellerTxn] = useState<SellerTxn | null>(null);

  // Escape key listener for all seller dashboard modals
  useEscapeKey(() => {
    setSelectedTxn(null);
    setDispatchTxn(null);
    setVerifyOtpTxn(null);
    setForceCourierTxn(null);
    setSellerDisputeTxn(null);
    setRateSellerTxn(null);
  }, Boolean(selectedTxn || dispatchTxn || verifyOtpTxn || forceCourierTxn || sellerDisputeTxn || rateSellerTxn));

  // Seller dispute response modal
  const [disputeTxn, setDisputeTxn] = useState<SellerTxn | null>(null);

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
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 mb-8 p-4 print:hidden transition-colors">
        <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-end">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              </div>
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                placeholder="Txn ID, phone, email, product..." 
                className="block w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div className="col-span-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Status</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              </div>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
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

          <div className="col-span-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="col-span-1">
            <button 
              type="submit" 
              className="w-full py-2 px-4 bg-gray-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-bold transition shadow-sm h-[38px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5" /> Apply
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
                        {txn.status === 'PAYMENT_RECEIVED' && (
                          (() => {
                            const createdAt = new Date(txn.created_at).getTime();
                            const dispatchDeadline = createdAt + 4 * 24 * 60 * 60 * 1000;
                            const diff = dispatchDeadline - Date.now();
                            if (diff <= 0) {
                              return <div className="text-[11px] text-red-600 font-bold mt-1">⚠ Dispatch Overdue</div>;
                            }
                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            return <div className="text-[11px] text-amber-700 font-semibold mt-1">⏳ {days}d {hours}h to dispatch</div>;
                          })()
                        )}
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
                        ) : txn.status === 'DISPUTED' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedTxn(txn)}
                              className="text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                              title="View Transaction Details & Refund Audit"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => setDisputeTxn(txn)}
                              className="text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 shadow-sm"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Respond
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedTxn(txn)}
                            className="text-gray-700 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
                            title="View Transaction Details & Refund Audit"
                          >
                            Details
                          </button>
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

      {/* ─── MODAL: SELLER TRANSACTION INSPECTION & PARCEL TAG ─────────────────── */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden print:shadow-none print:max-w-none print:w-[10cm] print:border print:border-black print:rounded-none">
            
            {/* Modal Header - Hidden on print */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0 print:hidden">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Transaction Details & Settlement Audit
                </h3>
                <p className="text-xs font-mono text-gray-500">{selectedTxn.paystack_reference}</p>
              </div>
              <button 
                onClick={() => { setSelectedTxn(null); setActiveDetailTab('AUDIT'); }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs - Hidden on print */}
            <div className="flex border-b border-gray-200 bg-gray-100/60 px-6 pt-2 flex-shrink-0 print:hidden">
              <button
                onClick={() => setActiveDetailTab('AUDIT')}
                className={`pb-2.5 px-4 text-xs font-bold font-mono transition-colors border-b-2 ${
                  activeDetailTab === 'AUDIT'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                📋 Audit & Financials
              </button>
              <button
                onClick={() => setActiveDetailTab('TAG')}
                className={`pb-2.5 px-4 text-xs font-bold font-mono transition-colors border-b-2 ${
                  activeDetailTab === 'TAG'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                🏷️ Print Parcel Tag
              </button>
            </div>

            {/* Tab 1: AUDIT & FINANCIAL DETAILS */}
            {activeDetailTab === 'AUDIT' && (
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-700 print:hidden flex-1">
                {/* Financial Overview */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-gray-400 font-mono text-[10px] block">TOTAL BUYER PAID</span>
                    <span className="font-black text-gray-900 text-sm">GHS {Number(selectedTxn.total_amount_ghs).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono text-[10px] block">PLATFORM FEE</span>
                    <span className="font-bold text-gray-700 text-xs">GHS {Number(selectedTxn.platform_fee_ghs || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-mono text-[10px] block">SHIPPING FEE</span>
                    <span className="font-bold text-gray-700 text-xs">GHS {Number(selectedTxn.shipping_fee_ghs || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Status & Milestones */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="font-bold text-gray-700">Order Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      STATUS_CONFIG[selectedTxn.status]?.bg || 'bg-gray-100'
                    } ${STATUS_CONFIG[selectedTxn.status]?.color || 'text-gray-800'}`}>
                      {STATUS_CONFIG[selectedTxn.status]?.label || selectedTxn.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 pt-1 font-mono">
                    <div>Created: {new Date(selectedTxn.created_at).toLocaleString()}</div>
                    <div>Dispatched: {selectedTxn.dispatched_at ? new Date(selectedTxn.dispatched_at).toLocaleString() : 'Not Dispatched'}</div>
                    <div>Delivered: {selectedTxn.delivered_at ? new Date(selectedTxn.delivered_at).toLocaleString() : 'Not Delivered'}</div>
                    <div>Inspection Start: {selectedTxn.inspection_starts_at ? new Date(selectedTxn.inspection_starts_at).toLocaleString() : 'N/A'}</div>
                  </div>
                </div>

                {/* Refund & Dispute Audit Section */}
                {(selectedTxn.status === 'REFUNDED' || selectedTxn.status === 'CANCELLED' || selectedTxn.status === 'DISPUTED') && (
                  <div className="bg-red-50/70 border border-red-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-red-700 font-bold border-b border-red-200 pb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Settlement & Refund Audit Details</span>
                    </div>

                    {selectedTxn.status === 'REFUNDED' && (
                      <div className="space-y-1.5 text-xs text-red-900">
                        <p className="font-semibold">
                          • Dispute Settlement: Payouts executed per arbitration ruling within 24 hours.
                        </p>
                        <p className="text-[11px] text-red-700">
                          • Buyer refund amounts are processed directly to their original payment method (Paystack MoMo/Card).
                        </p>
                      </div>
                    )}

                    {selectedTxn.status === 'CANCELLED' && (
                      <div className="space-y-1.5 text-xs text-red-900">
                        <p className="font-semibold">
                          • Order Cancelled: 100% full refund returned to the buyer via original payment medium.
                        </p>
                        <p className="text-[11px] text-red-700">
                          • Note: Non-dispatch after 4 days automatically incurs platform fee + 1.95% Paystack charges penalty.
                        </p>
                      </div>
                    )}

                    {/* Manager Ruling Notes */}
                    {selectedTxn.manager_dispute_notes && (
                      <div className="bg-white p-3 rounded-lg border border-red-200 text-xs space-y-1">
                        <span className="font-mono text-red-600 font-bold uppercase text-[10px] block">Manager Ruling Notes:</span>
                        <p className="text-gray-800">{selectedTxn.manager_dispute_notes}</p>
                        {selectedTxn.manager_dispute_photos && selectedTxn.manager_dispute_photos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {selectedTxn.manager_dispute_photos.map((url, idx) => (
                              <img key={idx} src={url} alt="Manager ruling proof" className="w-12 h-12 object-cover rounded border" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Buyer Claim */}
                    {selectedTxn.buyer_dispute_reason && (
                      <div className="bg-white p-3 rounded-lg border border-red-200 text-xs space-y-1">
                        <span className="font-mono text-red-600 font-bold uppercase text-[10px] block">Buyer Claim:</span>
                        <p className="text-gray-800">{selectedTxn.buyer_dispute_reason}</p>
                        {selectedTxn.buyer_dispute_photos && selectedTxn.buyer_dispute_photos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {selectedTxn.buyer_dispute_photos.map((url, idx) => (
                              <img key={idx} src={url} alt="Buyer proof" className="w-12 h-12 object-cover rounded border" />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Logistics Details & Waybill Photo */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <span className="font-bold text-gray-800 block">Logistics & Dispatch Proof</span>
                  {selectedTxn.delivery_method ? (
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>Method: <strong className="text-gray-900">{selectedTxn.delivery_method === 'INFORMAL_BUS' ? '🚌 Station / Bus OTP' : '📦 Courier API'}</strong></p>
                      {selectedTxn.courier_name && (
                        <div className="flex items-center justify-between pt-1">
                          <p>Courier: <span className="font-semibold text-gray-900">{selectedTxn.courier_name}</span> ({selectedTxn.tracking_number})</p>
                          {selectedTxn.carrier_tracking_url && (
                            <a
                              href={selectedTxn.carrier_tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                            >
                              Track Package ↗
                            </a>
                          )}
                        </div>
                      )}
                      {selectedTxn.driver_phone && <p>Driver: {selectedTxn.driver_phone} | Car: {selectedTxn.driver_car_number || 'N/A'} | Station: {selectedTxn.destination_station}</p>}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">Not dispatched yet.</p>
                  )}

                  {selectedTxn.waybill_photo_url && (
                    <div className="pt-2">
                      <span className="text-[10px] font-mono font-bold text-gray-500 block mb-1 uppercase">Dispatch Waybill Photo:</span>
                      <img
                        src={selectedTxn.waybill_photo_url}
                        alt="Waybill proof"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                </div>

                {/* Buyer Information */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1 text-xs">
                  <span className="font-bold text-gray-800 block mb-1">Buyer Details</span>
                  <p className="font-semibold text-gray-900">{selectedTxn.buyer_name || 'N/A'}</p>
                  <p className="font-mono text-gray-600">{selectedTxn.buyer_phone}</p>
                  <p className="text-gray-500">{selectedTxn.buyer_email}</p>
                  <p className="text-gray-600 mt-1">{selectedTxn.shipping_address}</p>
                </div>
              </div>
            )}

            {/* Tab 2: PRINT PARCEL TAG */}
            <div className={activeDetailTab === 'TAG' ? 'block' : 'hidden print:block'}>
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
            </div>

            {/* Modal Footer - Hidden on print */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 flex-shrink-0 print:hidden">
              <button 
                onClick={() => { setSelectedTxn(null); setActiveDetailTab('AUDIT'); }}
                className="flex-1 py-2.5 px-4 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
              {activeDetailTab === 'TAG' && (
                <button 
                  onClick={handlePrint}
                  className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Printer className="h-4 w-4" /> Print Tag
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seller Dispute Response Modal */}
      {disputeTxn && (
        <SellerDisputeModal
          txn={disputeTxn}
          onClose={() => setDisputeTxn(null)}
          onSuccess={fetchTransactions}
        />
      )}
    </div>
  );
}
