import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Filter, Package, CheckCircle, 
  X, Truck, AlertTriangle, Loader2, XCircle, KeyRound, RefreshCw,
  ShieldAlert, MapPin, Copy, Lock, ZoomIn, Archive, ArchiveRestore, MessageSquare,
  Gift, Award, Printer, Plus, ShoppingCart, ExternalLink, Sparkles,
  Star, ShieldCheck, Store, Clock
} from 'lucide-react';
import RateSellerModal from '../components/RateSellerModal';
import { apiClient } from '../api/client';
import { compressImageToWebP } from '../utils/imageUtils';
import { useEscapeKey } from '../utils/useEscapeKey';
import { ExportButton } from '../components/ExportButton';
import type { ExportColumn } from '../utils/exportUtils';
import { ImageLightboxModal } from '../components/ImageLightboxModal';
import DisputeChatTimeline from '../components/DisputeChatTimeline';
import ReferralDashboardTab from '../components/ReferralDashboardTab';
import EmbeddableTrustBadge from '../components/EmbeddableTrustBadge';
import BuyerReviewsTab from '../components/BuyerReviewsTab';
import SellerReviewsTab from '../components/SellerReviewsTab';
import ConfirmDeliveryReceiptModal from '../components/ConfirmDeliveryReceiptModal';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../context/ModalContext';

const merchantTxnExportHeaders: ExportColumn[] = [
  { label: 'Transaction ID', key: 'id' },
  { label: 'Paystack Reference', key: 'paystack_reference' },
  { label: 'Date Created', key: 'created_at' },
  { label: 'Item Title', key: 'title' },
  { label: 'Status', key: 'status' },
  { label: 'Total Amount (GHS)', key: 'total_amount_ghs' },
  { label: 'Platform Fee (GHS)', key: 'platform_fee_ghs' },
  { label: 'Shipping Fee (GHS)', key: 'shipping_fee_ghs' },
  { label: 'Buyer Name', key: 'buyer_name' },
  { label: 'Buyer Phone', key: 'buyer_phone' },
  { label: 'Buyer Email', key: 'buyer_email' },
  { label: 'Shipping Address', key: 'shipping_address' },
  { label: 'Delivery Method', key: 'delivery_method' },
  { label: 'Courier Name', key: 'courier_name' },
  { label: 'Tracking Number', key: 'tracking_number' },
];

interface SellerTxn {
  id: string;
  status: string;
  is_archived?: boolean;
  total_amount_ghs: number;
  platform_fee_ghs?: number;
  shipping_fee_ghs?: number;
  shipping_timeout_days?: number;
  inspection_hours_allowed?: number;
  otp_reveal_delay_hours?: number;
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
  dispute_retracted_at?: string;
  buyer_dispute_category?: string;
  disputed_at?: string;
  arbiter_escalated_at?: string;
  arbiter_escalated_role?: string;
  arbiter_escalation_hours?: number;
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

  const [enabledMethods, setEnabledMethods] = useState<string[]>(['COURIER_API', 'INFORMAL_BUS']);
  const [enabledCarriers, setEnabledCarriers] = useState<string[]>(['DHL', 'FEDEX', 'UPS', 'EMS', 'SPEEDAF', 'OTHERS']);

  const handleCarrierChange = (code: string) => {
    setCarrierCode(code);
    if (code === 'DHL') setCourierName('DHL Express');
    else if (code === 'FEDEX') setCourierName('FedEx');
    else if (code === 'UPS') setCourierName('UPS');
    else if (code === 'EMS') setCourierName('EMS Ghana Post');
    else if (code === 'SPEEDAF') setCourierName('Speedaf Express');
    else if (code === 'OTHERS') setCourierName('');
  };

  useEffect(() => {
    apiClient.get('/escrow/public-settings')
      .then(res => {
        if (res.data) {
          const methods = res.data.enabled_delivery_methods || ['COURIER_API', 'INFORMAL_BUS'];
          const carriers = res.data.enabled_carriers || ['DHL', 'FEDEX', 'UPS', 'EMS', 'SPEEDAF', 'OTHERS'];
          setEnabledMethods(methods);
          setEnabledCarriers(carriers);
          
          if (!methods.includes('COURIER_API') && methods.includes('INFORMAL_BUS')) {
            setPath('INFORMAL_BUS');
          }
          if (carriers.length > 0 && !carriers.includes('DHL')) {
            handleCarrierChange(carriers[0]);
          }
        }
      })
      .catch(() => {});
  }, []);

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
    } fontally: {
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

  const ALL_CARRIERS = [
    { code: 'DHL', label: 'DHL Express' },
    { code: 'FEDEX', label: 'FedEx' },
    { code: 'UPS', label: 'UPS' },
    { code: 'EMS', label: 'EMS / Ghana Post' },
    { code: 'SPEEDAF', label: 'Speedaf Express' },
    { code: 'OTHERS', label: 'Others (Custom Courier / Local Rider)' }
  ];

  const filteredCarriers = ALL_CARRIERS.filter(c => enabledCarriers.includes(c.code));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col my-auto">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Dispatch Order</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-mono">{txn.paystack_reference}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
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
                    className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-blue-100/60 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-700/80 px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer"
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
              <div className={`grid gap-3 ${enabledMethods.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {enabledMethods.includes('COURIER_API') && (
                  <button
                    type="button"
                    onClick={() => setPath('COURIER_API')}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
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
                )}
                {enabledMethods.includes('INFORMAL_BUS') && (
                  <button
                    type="button"
                    onClick={() => setPath('INFORMAL_BUS')}
                    className={`p-3 rounded-xl border-2 text-left transition cursor-pointer ${
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
                )}
              </div>
            </div>

            {/* Path A Fields */}
            {path === 'COURIER_API' && enabledMethods.includes('COURIER_API') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Select Courier / Shipping Provider *</label>
                  <select
                    value={carrierCode}
                    onChange={e => handleCarrierChange(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 cursor-pointer"
                  >
                    {filteredCarriers.map(c => (
                      <option key={c.code} value={c.code} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                        {c.label}
                      </option>
                    ))}
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
            {path === 'INFORMAL_BUS' && enabledMethods.includes('INFORMAL_BUS') && (
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
                  <img src={waybillPhoto} alt="Package preview" className="w-16 h-16 object-cover rounded-lg border border-gray-300 dark:border-slate-700" />
                  <button
                    type="button"
                    onClick={() => setWaybillPhoto('')}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3 bg-gray-50/50 dark:bg-slate-900/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-750 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isCompressing}
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
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

  const delayHours = txn.otp_reveal_delay_hours ?? 24;
  const dispatchedMs = txn.dispatched_at ? new Date(txn.dispatched_at).getTime() : Date.now();
  const unlockTimeMs = dispatchedMs + delayHours * 3600 * 1000;
  const isLocked = Date.now() < unlockTimeMs;
  const msRemaining = Math.max(0, unlockTimeMs - Date.now());
  const hoursLeft = Math.floor(msRemaining / (1000 * 3600));
  const minsLeft = Math.floor((msRemaining % (1000 * 3600)) / (1000 * 60));

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto my-auto">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verify Delivery OTP</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-mono">{txn.paystack_reference}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-6 space-y-4">
          {isLocked ? (
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Delivery OTP Verification Locked</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/90">
                To protect buyers from pressure to reveal codes before receipt, OTP verification is locked for <strong>{delayHours} hours</strong> after dispatch.
              </p>
              <div className="text-[11px] font-mono font-bold text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded inline-block">
                ⏳ Unlocks in {hoursLeft}h {minsLeft}m
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
              Ask the buyer to show you their Secret OTP from the SMS they received. Enter it below to confirm delivery and start the inspection period.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Secret OTP (from buyer)</label>
            <input
              type="text"
              required
              maxLength={6}
              disabled={isLocked || loading}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder={isLocked ? "Locked" : "e.g. 482913"}
              className="block w-full px-3 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-sm text-center font-mono text-lg tracking-widest focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Buyer ID Photo URL (Optional)</label>
            <input
              type="url"
              disabled={isLocked || loading}
              value={buyerIdPhotoUrl}
              onChange={e => setBuyerIdPhotoUrl(e.target.value)}
              placeholder="https://link-to-id-image.com/..."
              className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">Upload a photo of the buyer's ID for extra security.</p>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
            {resending ? 'Resending…' : "Buyer didn't get the OTP? Resend it"}
          </button>
          {resendMsg && <p className="text-xs text-green-600 dark:text-emerald-400">{resendMsg}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-750 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLocked || loading || otpCode.length < 6}
              className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden my-auto">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              Force Delivery Confirmation
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-mono">{txn.paystack_reference}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Step: Checking courier API */}
          {step === 'checking' && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
              <p className="text-sm text-gray-600 dark:text-slate-300">Checking courier API for latest status…</p>
            </div>
          )}

          {/* Step: API says not delivered — need reason */}
          {step === 'reason' && (
            <form onSubmit={handleSubmitReason} className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">Courier API Status: <span className="font-mono">{courierStatus}</span></p>
                <p className="text-xs text-orange-700 dark:text-orange-400">{apiMessage}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  Why are you marking this as delivered? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Driver confirmed delivery in person. Package was handed to buyer at station at 3pm."
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">This note will be logged for dispute resolution.</p>
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-750 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason.trim()}
                  className="flex-1 py-2.5 px-4 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Delivery Confirmed!</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Inspection period has started.</p>
            </div>
          )}

          {error && step === 'checking' && (
            <div className="space-y-3">
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{error}</p>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2 px-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-750 transition cursor-pointer">Close</button>
                <button onClick={checkApi} className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition cursor-pointer">Retry</button>
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
  onOpenLightbox: (url: string) => void;
}

function SellerDisputeModal({ txn, onClose, onSuccess, onOpenLightbox }: SellerDisputeModalProps) {
  const modal = useModal();
  const [response, setResponse] = useState('');
  const [photos, setPhotos] = useState<string[]>(txn.seller_dispute_photos || []);
  const [loading, setLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      await modal.alert({
        title: "Photo Limit Exceeded",
        message: "You can upload a maximum of 5 evidence photos in total.",
        type: "warning"
      });
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
      await modal.alert({
        title: "Response Submitted",
        message: "Your dispute response and evidence photos have been submitted successfully. The buyer and arbiter desk have been updated.",
        type: "success",
        icon: "check"
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit response.');
    } finally {
      setLoading(false);
    }
  };

  const [requestingArbiter, setRequestingArbiter] = useState(false);
  const handleRequestArbiter = async () => {
    const confirmed = await modal.confirm({
      title: "Request Official Arbiter Decision",
      message: "Escalate this dispute to the certified Platform Arbiter desk? Your case will be placed in the priority arbitration queue for review and binding ruling.",
      confirmText: "Request Arbiter Decision",
      cancelText: "Keep Direct Chat",
      type: "orange",
      icon: "scale",
      badgeText: "Priority Arbitration"
    });
    if (!confirmed) return;

    setRequestingArbiter(true);
    try {
      const res = await apiClient.post(`/escrow/${txn.id}/request-arbiter-decision`);
      await modal.alert({
        title: "Arbiter Decision Requested",
        message: res.data?.message || 'Arbiter Decision requested successfully. Placed in priority arbitration queue.',
        type: "orange",
        icon: "scale"
      });
      onSuccess();
    } catch (err: any) {
      await modal.alert({
        title: "Escalation Error",
        message: err.response?.data?.message || err.response?.data?.detail || 'Failed to request arbiter decision.',
        type: "danger"
      });
    } finally {
      setRequestingArbiter(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-5 sm:p-6 relative my-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4">
          <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 px-2.5 py-1 rounded">
            {txn.paystack_reference}
          </span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">Dispute Evidence & Response</h3>
        </div>

        {/* WhatsApp-Style Dispute Dialogue Timeline */}
        <div className="mb-4">
          <DisputeChatTimeline
            buyerReason={txn.buyer_dispute_reason}
            buyerPhotos={txn.buyer_dispute_photos}
            buyerName={txn.buyer_name || 'Buyer'}
            buyerCategory={txn.buyer_dispute_category}
            sellerResponse={txn.seller_dispute_response}
            sellerPhotos={txn.seller_dispute_photos}
            sellerName="You (Seller)"
            managerNotes={txn.manager_dispute_notes}
            managerPhotos={txn.manager_dispute_photos}
            disputedAt={txn.disputed_at || txn.created_at}
            arbiterEscalatedAt={txn.arbiter_escalated_at}
            arbiterEscalatedRole={txn.arbiter_escalated_role}
            arbiterEscalationHours={txn.arbiter_escalation_hours || 48}
            onRequestArbiterDecision={handleRequestArbiter}
            isRequestingArbiter={requestingArbiter}
            disputeRetractedAt={txn.dispute_retracted_at}
            waybillPhotoUrl={txn.waybill_photo_url}
          />
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs font-medium border border-red-100 dark:border-red-900/40">
            {error}
          </div>
        )}

        {txn.status === 'DISPUTED' ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 dark:text-slate-300 font-semibold mb-1">
                {txn.seller_dispute_response ? "Add Subsequent Response / Clarification *" : "Your Counter Response *"}
              </label>
              <textarea
                rows={3}
                required
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Explain your side of the dispute (e.g. proof of shipping condition, waybill receipt, item matches link description)..."
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-gray-700 dark:text-slate-300 font-semibold">Upload Seller Evidence Photos (Max 5)</label>
                <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400">
                  {isCompressing ? 'Compressing WebP...' : `${photos.length}/5 photos`}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={photos.length >= 5 || isCompressing}
                onChange={handlePhotoUpload}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 text-xs rounded-xl p-2.5 cursor-pointer disabled:opacity-50"
              />
              {isCompressing && (
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing photos to lightweight WebP...
                </div>
              )}
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((img, idx) => (
                    <div key={idx} className="relative group cursor-pointer" onClick={() => onOpenLightbox(img)}>
                      <img src={img} alt={`Seller evidence ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-700 hover:opacity-90 transition" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPhotos(prev => prev.filter((_, i) => i !== idx)); }}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow cursor-pointer z-10"
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
                className="flex-1 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isCompressing}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Response"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700 text-center text-xs text-gray-600 dark:text-slate-400">
              This dispute is currently closed or settled. The complete historical trail is archived above.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition cursor-pointer"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard View ─────────────────────────────────────────────────────

interface SellerMetrics {
  pending_transactions_count: number;
  pending_gross_amount_ghs: number;
  pending_net_due_seller_ghs: number;
  awaiting_dispatch_count: number;
  awaiting_dispatch_net_ghs: number;
  in_delivery_count: number;
  in_delivery_net_ghs: number;
  in_inspection_count: number;
  in_inspection_net_ghs: number;
  in_dispute_count: number;
  in_dispute_net_ghs: number;
  completed_transactions_count: number;
  completed_total_earned_ghs: number;
  dispute_health?: {
    total_paid_transactions: number;
    disputed_transactions_count: number;
    dispute_rate_pct: number;
    dispute_level: string;
    is_suspended: boolean;
    suspension_reason: string;
    sample_evaluated: string;
    sample_paid_count: number;
    sample_disputed_count: number;
    avg_rating?: number | null;
    total_reviews_count?: number;
    rating_warning?: boolean;
    rating_warning_threshold?: number;
    rating_suspension_threshold?: number;
    dispatch_expiry_count?: number;
    dispatch_expiry_rate_pct?: number;
    dispatch_expiry_level?: string;
    dispatch_expiry_warning_threshold?: number;
    dispatch_expiry_suspension_threshold?: number;
    is_flagged_for_compliance_review?: boolean;
    compliance_review_reasons?: string[];
    compound_warning_count?: number;
  };
}

// ─── Buyer Order Detail Modal ───────────────────────────────────────────────

interface BuyerOrderDetailModalProps {
  order: any;
  onClose: () => void;
  onRefresh: () => void;
  onOpenLightbox: (url: string) => void;
  onOpenRating: (order: any) => void;
  onOpenDispute: (order: any) => void;
  onOpenRetract: (order: any) => void;
  onOpenConfirmReceipt: (order: any) => void;
}

function BuyerOrderDetailModal({
  order,
  onClose,
  onRefresh,
  onOpenLightbox,
  onOpenRating,
  onOpenDispute,
  onOpenRetract,
  onOpenConfirmReceipt
}: BuyerOrderDetailModalProps) {
  const modal = useModal();
  useEscapeKey(onClose);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [requestingArbiter, setRequestingArbiter] = useState(false);

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['PAYMENT_RECEIVED'];
  const StatusIcon = statusCfg.icon;

  const canConfirm = order.status === 'DELIVERY_IN_PROGRESS';
  const isInspection = order.status === 'INSPECTION_PERIOD';
  const isDisputed = order.status === 'DISPUTED';
  const isCompleted = order.status === 'COMPLETED';
  const canDispute = (canConfirm || isInspection) && !order.dispute_retracted_at && !isDisputed;
  const hasDisputeRecord = Boolean(order.buyer_dispute_reason || order.dispute_retracted_at || isDisputed);

  const handleCopyRef = () => {
    navigator.clipboard.writeText(order.paystack_reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handle1ClickConfirm = () => {
    onOpenConfirmReceipt(order);
  };

  const handleApproveRelease = async () => {
    const confirmed = await modal.confirm({
      title: "Approve Order & Release Payment",
      message: "Are you satisfied with your order? Releasing payment will immediately finalize escrow and transfer funds to the seller's wallet.",
      confirmText: "Release Payment",
      cancelText: "Keep In Inspection",
      type: "success",
      icon: "check",
      badgeText: "Escrow Finalization"
    });
    if (!confirmed) return;

    setIsReleasing(true);
    try {
      await apiClient.post(`/escrow/${order.id}/approve-and-release`);
      await modal.alert({
        title: "Order Approved & Completed",
        message: "Escrow payment released to seller. Thank you for using HendAxis Trust!",
        type: "success",
        icon: "check"
      });
      onRefresh();
      onOpenRating(order);
    } catch (err: any) {
      await modal.alert({
        title: "Payment Release Error",
        message: err.response?.data?.message || err.response?.data?.detail || 'Failed to release payment.',
        type: "danger"
      });
    } finally {
      setIsReleasing(false);
    }
  };

  const handleRequestArbiter = async () => {
    const confirmed = await modal.confirm({
      title: "Request Official Arbiter Decision",
      message: "Escalate this dispute to the certified Platform Arbiter desk? Your case will be placed at the top of the priority arbitration queue for a binding ruling.",
      confirmText: "Request Arbiter Decision",
      cancelText: "Keep Direct Chat",
      type: "orange",
      icon: "scale",
      badgeText: "Priority Arbitration"
    });
    if (!confirmed) return;

    setRequestingArbiter(true);
    try {
      await apiClient.post(`/escrow/${order.id}/request-arbiter-decision`);
      await modal.alert({
        title: "Arbiter Decision Requested",
        message: "Platform arbiter escalation requested successfully. Your case has been placed at the top of the arbitration queue.",
        type: "orange",
        icon: "scale"
      });
      onRefresh();
    } catch (err: any) {
      await modal.alert({
        title: "Escalation Error",
        message: err.response?.data?.message || err.response?.data?.detail || 'Failed to request arbiter decision.',
        type: "danger"
      });
    } finally {
      setRequestingArbiter(false);
    }
  };

  let inspectionRemaining = "";
  if (isInspection && order.inspection_starts_at && !order.dispute_retracted_at) {
    const start = new Date(order.inspection_starts_at).getTime();
    const now = new Date().getTime();
    const hoursAllowed = order.inspection_hours_allowed || 24;
    const end = start + (hoursAllowed * 60 * 60 * 1000);
    const diff = end - now;
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      inspectionRemaining = `${hours}h ${mins}m`;
    } else {
      inspectionRemaining = "Expired (auto-releasing)";
    }
  }

  const targetPublicUrl = `/l/${order.link_id || order.id}?reference=${order.paystack_reference}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Sticky Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${statusCfg.bg} ${statusCfg.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusCfg.label}
            </span>
            <button
              onClick={handleCopyRef}
              title="Click to copy reference"
              className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              {order.paystack_reference}
              {copiedRef && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Copied!</span>}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Product & Store Card */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {order.image_url ? (
              <div
                onClick={() => onOpenLightbox(order.image_url)}
                className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 relative group cursor-pointer shadow-sm"
                title="Click to enlarge"
              >
                <img src={order.image_url} alt={order.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                  <ZoomIn className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                <Package className="w-8 h-8" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2">{order.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-medium">
                  <Store className="w-3.5 h-3.5 text-[#ff6d1d]" />
                  Sold by: <strong className="text-slate-900 dark:text-slate-200">{order.shop_name || `@${order.seller_username}`}</strong>
                </span>
                {order.seller_username && (
                  <a
                    href={`/store/${order.seller_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5 text-[11px]"
                  >
                    View Storefront <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {order.shipping_address && (
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>Delivery Address: <strong className="text-slate-700 dark:text-slate-300">{order.shipping_address}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Escrow Financial Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Item Price</span>
              <span className="font-bold text-slate-900 dark:text-white">GHS {Number(order.price_ghs !== undefined ? order.price_ghs : order.total_amount_ghs).toFixed(2)}</span>
            </div>
            {Number(order.shipping_fee_ghs || 0) > 0 && (
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-blue-500" /> Shipping Fee</span>
                <span className="font-bold text-slate-900 dark:text-white">GHS {Number(order.shipping_fee_ghs).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700">
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Escrow Protection Fee
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {order.fee_handling === 'PASS_TO_BUYER'
                  ? `GHS ${Number(order.platform_fee_ghs || 0).toFixed(2)}`
                  : 'Covered by Seller (Free for Buyer)'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 dark:border-slate-700 text-sm">
              <span className="font-bold text-slate-900 dark:text-white">Total Amount Paid</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                GHS {Number(order.total_amount_ghs || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Delivery & Tracking Details */}
          {(order.tracking_number || order.waybill_photo_url || order.driver_phone) && (
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Delivery & Logistics Information
                </span>
                {order.carrier_tracking_url && (
                  <a
                    href={order.carrier_tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    Track Live ↗
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {order.courier_name && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Courier Service</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{order.courier_name}</span>
                  </div>
                )}
                {order.tracking_number && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Tracking Number</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{order.tracking_number}</span>
                  </div>
                )}
                {order.driver_phone && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Driver / Station Phone</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{order.driver_phone}</span>
                  </div>
                )}
                {order.destination_station && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Destination Station</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{order.destination_station}</span>
                  </div>
                )}
              </div>
              {order.waybill_photo_url && (
                <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center gap-3">
                  <div
                    onClick={() => onOpenLightbox(order.waybill_photo_url)}
                    className="w-14 h-14 rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800 shrink-0 cursor-pointer relative group"
                    title="Click to enlarge package proof"
                  >
                    <img src={order.waybill_photo_url} alt="Waybill proof" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-200 block text-xs">Seller Dispatch Proof Photo</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-400 block">Uploaded by merchant upon parcel handover</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inspection Period Alert Box */}
          {isInspection && (
            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-4 text-xs text-purple-900 dark:text-purple-200 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-purple-950 dark:text-purple-100">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Inspection Window Active
                </span>
                {inspectionRemaining && (
                  <span className="font-mono font-bold bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 px-2.5 py-0.5 rounded-lg text-xs">
                    ⏳ {inspectionRemaining} left
                  </span>
                )}
              </div>
              <p className="leading-relaxed text-purple-800 dark:text-purple-300 text-[11px]">
                Test and inspect your item thoroughly. If you are satisfied, click <strong>Approve & Release Payment</strong> below to disburse funds to the seller. If anything is wrong, you can raise a dispute with photo evidence.
              </p>
            </div>
          )}

          {/* Dispute Dialogue Timeline (if disputed or historical) */}
          {hasDisputeRecord && (
            <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  {isDisputed ? 'Active Dispute Dialogue' : order.dispute_retracted_at ? 'Dispute Retracted & Settling' : 'Dispute Historical Record'}
                </span>
              </div>
              <DisputeChatTimeline
                buyerReason={order.buyer_dispute_reason}
                buyerPhotos={order.buyer_dispute_photos}
                buyerName="You (Buyer)"
                buyerCategory={order.buyer_dispute_category}
                sellerResponse={order.seller_dispute_response}
                sellerPhotos={order.seller_dispute_photos}
                sellerName={order.shop_name || order.seller_username || 'Seller'}
                managerNotes={order.manager_dispute_notes}
                managerPhotos={order.manager_dispute_photos}
                disputedAt={order.disputed_at || order.created_at}
                arbiterEscalatedAt={order.arbiter_escalated_at}
                arbiterEscalatedRole={order.arbiter_escalated_role}
                arbiterEscalationHours={order.arbiter_escalation_hours || 48}
                onRequestArbiterDecision={handleRequestArbiter}
                isRequestingArbiter={requestingArbiter}
                disputeRetractedAt={order.dispute_retracted_at}
                waybillPhotoUrl={order.waybill_photo_url}
              />
              {isDisputed && (
                <div className="flex gap-2 pt-2 border-t border-rose-200/70 dark:border-rose-900/50">
                  <button
                    onClick={() => onOpenDispute(order)}
                    className="flex-1 py-2 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    + Add Evidence / Update
                  </button>
                  <button
                    onClick={() => onOpenRetract(order)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                  >
                    Retract & Settle Privately
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Verified Reviews Section (if completed) */}
          {isCompleted && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Verified Buyer Feedback
                </span>
                <button
                  onClick={() => onOpenRating(order)}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {order.has_reviewed ? 'Edit Review ✎' : '⭐ Leave a Review'}
                </button>
              </div>
              {order.has_reviewed ? (
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= (order.review_overall || 5) ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                    ))}
                    <span className="text-[11px] font-bold text-slate-500 ml-1">({order.review_overall || 5}/5 Stars)</span>
                  </div>
                  {order.review_comment && (
                    <p className="italic text-slate-600 dark:text-slate-300">"{order.review_comment}"</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Help the social commerce community by reviewing your experience with this seller.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Sticky Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="flex items-center gap-2">
            <a
              href={targetPublicUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Public Order URL <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {canConfirm && (
              <button
                onClick={handle1ClickConfirm}
                className="py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-green-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                ⚡ Confirm Delivery Receipt
              </button>
            )}

            {isInspection && (
              <button
                onClick={handleApproveRelease}
                disabled={isReleasing}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isReleasing ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓ Approve & Release Payout'}
              </button>
            )}

            {canDispute && (
              <button
                onClick={() => onOpenDispute(order)}
                className="py-2.5 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl hover:bg-rose-100 transition cursor-pointer"
              >
                ⚠ Raise Dispute
              </button>
            )}

            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const DISPUTE_CATEGORIES = [
  { value: 'DAMAGED_ITEM', label: 'Item Damaged or Broken in Transit' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Delivered / Not as Described' },
  { value: 'DEFECTIVE_OR_FAULTY', label: 'Defective, Malfunctioning or Inoperable' },
  { value: 'MISSING_PARTS', label: 'Missing Accessories, Parts, or Incomplete Package' },
  { value: 'COUNTERFEIT_OR_FAKE', label: 'Counterfeit, Fake, or Replica Item' },
  { value: 'ITEM_NOT_RECEIVED', label: 'Item Not Received / Empty Parcel' },
  { value: 'OTHER', label: 'Other Issue / Contractual Non-Compliance' },
];

// ─── Buyer Dispute Modal ───────────────────────────────────────────────────
interface BuyerDisputeModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
  onOpenLightbox: (url: string) => void;
}

function BuyerDisputeModal({ order, onClose, onSuccess, onOpenLightbox }: BuyerDisputeModalProps) {
  const modal = useModal();
  useEscapeKey(onClose);
  const isInitialDispute = !order.buyer_dispute_reason && order.status !== 'DISPUTED';
  const [category, setCategory] = useState(order.buyer_dispute_category || 'DAMAGED_ITEM');
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      await modal.alert({
        title: "Photo Limit Exceeded",
        message: "You can upload a maximum of 5 evidence photos.",
        type: "warning"
      });
      return;
    }
    setIsCompressing(true);
    setError('');
    try {
      const compressed: string[] = [];
      for (const file of files) {
        const webp = await compressImageToWebP(file);
        compressed.push(webp);
      }
      setPhotos(prev => [...prev, ...compressed].slice(0, 5));
    } catch (err) {
      setError("Failed to compress evidence photo.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError('Please provide at least 10 characters explaining the dispute reason in detail.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint = order.buyer_dispute_reason
        ? `/escrow/${order.id}/dispute-append`
        : `/escrow/${order.id}/raise-dispute`;
      const payload: { reason: string; photos: string[]; category?: string } = {
        reason: reason.trim(),
        photos: photos,
      };
      if (isInitialDispute) {
        payload.category = category;
      }
      await apiClient.post(endpoint, payload);
      await modal.alert({
        title: "Dispute Submitted",
        message: "Dispute details submitted successfully. Management and seller have been updated.",
        type: "danger",
        icon: "alert"
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit dispute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50/60 dark:bg-rose-950/40 shrink-0">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>{isInitialDispute ? 'Raise Order Dispute' : 'Add Dispute Update / Evidence'}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Please describe why the item is damaged, defective, or does not match what was agreed upon. Escrow funds will remain safely held until resolution.
          </p>

          {isInitialDispute && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Dispute Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {DISPUTE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Reason & Details *
              </label>
              <span className={`text-[11px] font-mono ${reason.trim().length >= 10 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                {reason.trim().length}/10 min chars
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe the issue in detail (minimum 10 characters)..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Evidence Photos (Max 5)
              </label>
              <span className="text-[11px] font-mono text-slate-400">{photos.length}/5</span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={photos.length >= 5 || isCompressing}
              onChange={handlePhotoUpload}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl p-2.5 cursor-pointer disabled:opacity-50"
            />
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photos.map((img, idx) => (
                  <div key={idx} className="relative group cursor-pointer" onClick={() => onOpenLightbox(img)}>
                    <img src={img} alt={`Evidence ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPhotos(prev => prev.filter((_, i) => i !== idx)); }}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow z-10 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isCompressing || reason.trim().length < 10}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Buyer Retract Dispute Modal ───────────────────────────────────────────
interface BuyerRetractModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

function BuyerRetractModal({ order, onClose, onSuccess }: BuyerRetractModalProps) {
  const modal = useModal();
  useEscapeKey(onClose);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRetract = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post(`/escrow/${order.id}/retract-dispute`);
      await modal.alert({
        title: "Dispute Retracted",
        message: "Dispute retracted successfully. Settlement grace period initiated.",
        type: "success",
        icon: "shield"
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to retract dispute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-4 my-auto">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-base">
          <CheckCircle className="w-5 h-5" />
          <span>Retract Dispute & Settle Privately</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Are you sure you want to retract this dispute? Doing so indicates that you and the merchant have reached an agreement. Escrow funds will automatically release to the seller after the 24-hour grace window.
        </p>
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-semibold">
            {error}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRetract}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Retraction'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BuyerPurchasesTab() {
  const modal = useModal();
  const [searchParams] = useSearchParams();
  const newOrderRef = (searchParams.get('new_order') || '').trim();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERY_IN_PROGRESS' | 'INSPECTION_PERIOD' | 'DISPUTED' | 'COMPLETED'>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal states for interactive order management
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [confirmingReceiptOrder, setConfirmingReceiptOrder] = useState<any | null>(null);
  const [disputeOrder, setDisputeOrder] = useState<any | null>(null);
  const [retractOrder, setRetractOrder] = useState<any | null>(null);
  const [ratingOrder, setRatingOrder] = useState<any | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/checkout/buyer/my-orders');
      let list = Array.isArray(res.data) ? res.data : [];
      if (newOrderRef) {
        list = [...list].sort((a, b) => {
          const aMatch = a.paystack_reference === newOrderRef || a.id === newOrderRef || a.link_id === newOrderRef;
          const bMatch = b.paystack_reference === newOrderRef || b.id === newOrderRef || b.link_id === newOrderRef;
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }
      setPurchases(list);
    } catch (err) {
      console.error('Failed to fetch buyer purchases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [newOrderRef]);

  const handle1ClickConfirm = (txnOrOrder: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetOrder = typeof txnOrOrder === 'string' 
      ? purchases.find(p => p.id === txnOrOrder) || { id: txnOrOrder }
      : txnOrOrder;
    setConfirmingReceiptOrder(targetOrder);
  };

  const handleApproveRelease = async (txnId: string, orderObj?: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = await modal.confirm({
      title: "Approve Order & Release Payment",
      message: "Are you satisfied with this order? Releasing payment will immediately finalize escrow and transfer funds to the seller's wallet.",
      confirmText: "Release Payment",
      cancelText: "Keep In Inspection",
      type: "success",
      icon: "check",
      badgeText: "Escrow Finalization"
    });
    if (!confirmed) return;

    setActionLoadingId(txnId);
    try {
      await apiClient.post(`/escrow/${txnId}/approve-and-release`);
      await modal.alert({
        title: "Order Approved & Completed",
        message: "Escrow payment released to seller. Thank you for using HendAxis Trust!",
        type: "success",
        icon: "check"
      });
      await fetchPurchases();
      if (orderObj) {
        setRatingOrder(orderObj);
      }
      if (selectedOrder && selectedOrder.id === txnId) {
        const res = await apiClient.get('/checkout/buyer/my-orders');
        const found = (res.data || []).find((x: any) => x.id === txnId);
        if (found) setSelectedOrder(found);
      }
    } catch (err: any) {
      await modal.alert({
        title: "Payment Release Error",
        message: err.response?.data?.message || err.response?.data?.detail || 'Failed to release payment.',
        type: "danger"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = purchases.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = (
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.paystack_reference && p.paystack_reference.toLowerCase().includes(q)) ||
      (p.seller_username && p.seller_username.toLowerCase().includes(q)) ||
      (p.shop_name && p.shop_name.toLowerCase().includes(q))
    );
    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    return true;
  });

  const inTransitCount = purchases.filter(p => p.status === 'DELIVERY_IN_PROGRESS').length;
  const inInspectionCount = purchases.filter(p => p.status === 'INSPECTION_PERIOD').length;
  const disputedCount = purchases.filter(p => p.status === 'DISPUTED').length;
  const completedCount = purchases.filter(p => p.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-white/15 border border-white/20 rounded-full text-xs font-bold uppercase tracking-wider text-blue-200">
                Buyer Escrow Hub
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">My Purchases & Orders</h1>
              <p className="text-sm text-blue-200 mt-1 max-w-xl">
                Track incoming shipments, inspect delivered items, and release escrow funds directly from your dashboard.
              </p>
            </div>
            <Link
              to="/shops"
              className="self-start sm:self-auto px-5 py-3 bg-[#ff6d1d] hover:bg-[#e05b11] text-white font-bold text-xs rounded-xl transition shadow-lg shadow-[#ff6d1d]/30 flex items-center gap-2 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" /> Explore Verified Shops
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/15">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`text-left rounded-2xl p-4 border transition-all duration-200 cursor-pointer focus:outline-none ${
                statusFilter === 'ALL'
                  ? 'bg-white/25 border-white shadow-lg ring-2 ring-white/40 scale-[1.02]'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-200 block font-medium">Total Purchases</span>
                {statusFilter === 'ALL' && (
                  <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-md">All</span>
                )}
              </div>
              <span className="text-2xl font-black text-white mt-1 block">{purchases.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'DELIVERY_IN_PROGRESS' ? 'ALL' : 'DELIVERY_IN_PROGRESS')}
              className={`text-left rounded-2xl p-4 border transition-all duration-200 cursor-pointer focus:outline-none ${
                statusFilter === 'DELIVERY_IN_PROGRESS'
                  ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/20 scale-[1.02]'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 hover:border-amber-400/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-200 block font-medium">In Transit</span>
                {statusFilter === 'DELIVERY_IN_PROGRESS' && (
                  <span className="text-[10px] font-bold bg-amber-400/30 text-amber-200 px-1.5 py-0.5 rounded-md">Filtered</span>
                )}
              </div>
              <span className="text-2xl font-black text-amber-300 mt-1 block">{inTransitCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'INSPECTION_PERIOD' ? 'ALL' : 'INSPECTION_PERIOD')}
              className={`text-left rounded-2xl p-4 border transition-all duration-200 cursor-pointer focus:outline-none ${
                statusFilter === 'INSPECTION_PERIOD'
                  ? 'bg-purple-500/25 border-purple-400 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/20 scale-[1.02]'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 hover:border-purple-400/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-200 block font-medium">In Inspection</span>
                {statusFilter === 'INSPECTION_PERIOD' && (
                  <span className="text-[10px] font-bold bg-purple-400/30 text-purple-200 px-1.5 py-0.5 rounded-md">Filtered</span>
                )}
              </div>
              <span className="text-2xl font-black text-purple-300 mt-1 block">{inInspectionCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'DISPUTED' ? 'ALL' : 'DISPUTED')}
              className={`text-left rounded-2xl p-4 border transition-all duration-200 cursor-pointer focus:outline-none ${
                statusFilter === 'DISPUTED'
                  ? 'bg-rose-500/30 border-rose-400 ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/25 scale-[1.02]'
                  : disputedCount > 0
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/40'
                    : 'bg-white/10 hover:bg-white/15 border-white/10 hover:border-rose-400/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-rose-200 block font-medium">Disputed</span>
                {statusFilter === 'DISPUTED' && (
                  <span className="text-[10px] font-bold bg-rose-400/30 text-rose-200 px-1.5 py-0.5 rounded-md">Filtered</span>
                )}
              </div>
              <span className="text-2xl font-black text-rose-300 mt-1 block">{disputedCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(prev => prev === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
              className={`text-left rounded-2xl p-4 border transition-all duration-200 cursor-pointer focus:outline-none ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                  : 'bg-white/10 hover:bg-white/15 border-white/10 hover:border-emerald-400/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-200 block font-medium">Completed Safely</span>
                {statusFilter === 'COMPLETED' && (
                  <span className="text-[10px] font-bold bg-emerald-400/30 text-emerald-200 px-1.5 py-0.5 rounded-md">Filtered</span>
                )}
              </div>
              <span className="text-2xl font-black text-emerald-300 mt-1 block">{completedCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Order Welcome & Highlight Banner */}
      {newOrderRef && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                🎉 Welcome to your Buyer Dashboard!
              </h4>
              <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                Account Active
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Your recent purchase (<strong className="font-mono text-emerald-700 dark:text-emerald-400">{newOrderRef}</strong>) is highlighted at the top below. Click on any order to view details, inspect tracking, and release escrow funds without leaving this page.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search purchases by title, seller, or reference..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {statusFilter !== 'ALL' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              <Filter className="w-3.5 h-3.5" />
              <span>
                Filtered by:{' '}
                <strong>
                  {statusFilter === 'DELIVERY_IN_PROGRESS' && 'In Transit'}
                  {statusFilter === 'INSPECTION_PERIOD' && 'In Inspection'}
                  {statusFilter === 'DISPUTED' && 'Disputed'}
                  {statusFilter === 'COMPLETED' && 'Completed'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="ml-1 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded text-blue-600 dark:text-blue-300 transition cursor-pointer"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={fetchPurchases}
          className="self-end sm:self-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
        </button>
      </div>

      {/* Order List */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Purchases Found</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'No orders match your filter criteria.'
              : 'You haven\'t made any escrow purchases yet. Browse verified merchants and enjoy 100% money-back escrow protection.'}
          </p>
          {(search || statusFilter !== 'ALL') ? (
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Clear All Filters
            </button>
          ) : (
            <Link
              to="/shops"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md"
            >
              Browse Verified Storefronts
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => {
            const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG['PAYMENT_RECEIVED'];
            const StatusIcon = statusCfg.icon;
            const isProcessingThis = actionLoadingId === p.id;
            const isNewOrder = Boolean(newOrderRef && (p.paystack_reference === newOrderRef || p.id === newOrderRef || p.link_id === newOrderRef));

            return (
              <div
                key={p.id}
                onClick={() => setSelectedOrder(p)}
                className={`bg-white dark:bg-slate-900 rounded-2xl border ${isNewOrder ? 'border-2 border-indigo-500 dark:border-indigo-400 ring-4 ring-indigo-500/20 shadow-xl' : 'border-gray-200 dark:border-slate-800 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg'} p-5 transition-all duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden cursor-pointer group`}
              >
                {isNewOrder && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-600 to-blue-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3" /> Just Placed (New)
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title} className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0 group-hover:scale-105 transition" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">{p.title}</h4>
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 block mt-0.5">
                          Sold by <strong>{p.shop_name || `@${p.seller_username}`}</strong>
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${statusCfg.bg} ${statusCfg.color}`}>
                      <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs flex justify-between items-center border border-slate-200/60 dark:border-slate-800">
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px]">Total Escrow Amount</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">GHS {Number(p.total_amount_ghs || 0).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px]">Reference</span>
                      <span className="font-mono text-[11px] text-gray-700 dark:text-slate-300 font-bold">{p.paystack_reference}</span>
                    </div>
                  </div>

                  {p.tracking_number && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center justify-between">
                      <span className="flex items-center gap-1 font-semibold">
                        <Truck className="w-3.5 h-3.5" /> Courier Tracking: {p.tracking_number}
                      </span>
                      {p.carrier_tracking_url && (
                        <a
                          href={p.carrier_tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="underline font-bold text-[11px] flex items-center gap-1"
                        >
                          Track <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(p)}
                    className="flex-1 py-2 px-3 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-750 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1 cursor-pointer"
                  >
                    🔍 View Details & Actions
                  </button>

                  {p.status === 'DELIVERY_IN_PROGRESS' && (
                    <button
                      onClick={(e) => handle1ClickConfirm(p, e)}
                      className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      ⚡ Confirm Receipt
                    </button>
                  )}

                  {p.status === 'INSPECTION_PERIOD' && (
                    <button
                      onClick={(e) => handleApproveRelease(p.id, p, e)}
                      disabled={isProcessingThis}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓ Approve & Release'}
                    </button>
                  )}

                  {p.status === 'COMPLETED' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRatingOrder(p); }}
                      className="py-2 px-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold rounded-xl hover:bg-amber-100 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {p.has_reviewed ? 'Edit Review' : 'Rate Seller'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODALS ─── */}
      {selectedOrder && (
        <BuyerOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefresh={async () => {
            await fetchPurchases();
            const res = await apiClient.get('/checkout/buyer/my-orders');
            const found = (res.data || []).find((x: any) => x.id === selectedOrder.id);
            if (found) setSelectedOrder(found);
          }}
          onOpenLightbox={url => setLightboxImage(url)}
          onOpenRating={ord => { setSelectedOrder(null); setRatingOrder(ord); }}
          onOpenDispute={ord => setDisputeOrder(ord)}
          onOpenRetract={ord => setRetractOrder(ord)}
          onOpenConfirmReceipt={ord => setConfirmingReceiptOrder(ord)}
        />
      )}

      {disputeOrder && (
        <BuyerDisputeModal
          order={disputeOrder}
          onClose={() => setDisputeOrder(null)}
          onSuccess={async () => {
            setDisputeOrder(null);
            await fetchPurchases();
            if (selectedOrder) {
              const res = await apiClient.get('/checkout/buyer/my-orders');
              const found = (res.data || []).find((x: any) => x.id === selectedOrder.id);
              if (found) setSelectedOrder(found);
            }
          }}
          onOpenLightbox={url => setLightboxImage(url)}
        />
      )}

      {retractOrder && (
        <BuyerRetractModal
          order={retractOrder}
          onClose={() => setRetractOrder(null)}
          onSuccess={async () => {
            setRetractOrder(null);
            await fetchPurchases();
            if (selectedOrder) {
              const res = await apiClient.get('/checkout/buyer/my-orders');
              const found = (res.data || []).find((x: any) => x.id === selectedOrder.id);
              if (found) setSelectedOrder(found);
            }
          }}
        />
      )}

      {ratingOrder && (
        <RateSellerModal
          transactionId={ratingOrder.id}
          paystackReference={ratingOrder.paystack_reference}
          itemTitle={ratingOrder.title}
          sellerName={ratingOrder.shop_name || ratingOrder.seller_username || 'Seller'}
          shopName={ratingOrder.shop_name}
          sellerUsername={ratingOrder.seller_username}
          initialOverall={ratingOrder.review_overall}
          initialSpeed={ratingOrder.review_speed}
          initialCommunication={ratingOrder.review_communication}
          initialComment={ratingOrder.review_comment}
          initialEditCount={ratingOrder.review_edit_count}
          initialCreatedAt={ratingOrder.review_created_at}
          initialUpdatedAt={ratingOrder.review_updated_at}
          onClose={() => setRatingOrder(null)}
          onSuccess={async () => {
            setRatingOrder(null);
            await fetchPurchases();
            if (selectedOrder) {
              const res = await apiClient.get('/checkout/buyer/my-orders');
              const found = (res.data || []).find((x: any) => x.id === selectedOrder.id);
              if (found) setSelectedOrder(found);
            }
          }}
        />
      )}

      {/* Confirmation Dialog to prevent accidental delivery confirmations */}
      {confirmingReceiptOrder && (
        <ConfirmDeliveryReceiptModal
          order={{
            id: confirmingReceiptOrder.id,
            title: confirmingReceiptOrder.title,
            paystack_reference: confirmingReceiptOrder.paystack_reference,
            shop_name: confirmingReceiptOrder.shop_name,
            seller_username: confirmingReceiptOrder.seller_username,
            inspection_hours_allowed: confirmingReceiptOrder.inspection_hours_allowed,
            total_amount_ghs: confirmingReceiptOrder.total_amount_ghs
          }}
          onClose={() => setConfirmingReceiptOrder(null)}
          onConfirm={async () => {
            await apiClient.post(`/escrow/${confirmingReceiptOrder.id}/buyer-confirm-receipt`);
            setConfirmingReceiptOrder(null);
            await fetchPurchases();
            if (selectedOrder && selectedOrder.id === confirmingReceiptOrder.id) {
              const res = await apiClient.get('/checkout/buyer/my-orders');
              const found = (res.data || []).find((x: any) => x.id === confirmingReceiptOrder.id);
              if (found) setSelectedOrder(found);
            }
          }}
        />
      )}

      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}

export default function DashboardView() {
  const modal = useModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const defaultTab = searchParams.get('tab') || (user?.role === 'BUYER' ? 'purchases' : 'transactions');
  const [activeTab, setActiveTab] = useState<'transactions' | 'seller_reviews' | 'purchases' | 'referrals' | 'badges' | 'reviews'>(
    defaultTab as any
  );
  const [txns, setTxns] = useState<SellerTxn[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Summary Metrics State
  const [metrics, setMetrics] = useState<SellerMetrics | null>(null);

  // Suspension Appeal State
  const [appealData, setAppealData] = useState<{ has_appeal: boolean; appeal: any } | null>(null);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealSuccessMsg, setAppealSuccessMsg] = useState('');
  const [appealErrorMsg, setAppealErrorMsg] = useState('');

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
  
  // Pagination
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  
  // Parcel tag & transaction detail modal
  const [selectedTxn, setSelectedTxn] = useState<SellerTxn | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'AUDIT' | 'TAG'>('AUDIT');

  // Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Payment Verification & Archive Loading States
  const [verifyingPaymentId, setVerifyingPaymentId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);


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
    if (lightboxImage) {
      setLightboxImage(null);
      return;
    }
    setSelectedTxn(null);
    setDispatchTxn(null);
    setVerifyOtpTxn(null);
    setForceCourierTxn(null);
    setSellerDisputeTxn(null);
    setRateSellerTxn(null);
  }, Boolean(lightboxImage || selectedTxn || dispatchTxn || verifyOtpTxn || forceCourierTxn || sellerDisputeTxn || rateSellerTxn));

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

  const fetchAllTransactionsForExport = async (): Promise<Record<string, any>[]> => {
    const params = new URLSearchParams();
    params.append('limit', '10000');
    params.append('offset', '0');
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (status === 'ARCHIVED') params.append('include_archived', 'true');
    
    const res = await apiClient.get(`/escrow/seller/transactions?${params.toString()}`);
    return res.data?.items || [];
  };

  const fetchMetrics = async () => {
    try {
      const res = await apiClient.get('/escrow/seller/summary-metrics');
      setMetrics(res.data);
      if (res.data?.dispute_health?.is_suspended || res.data?.dispute_health?.dispute_level === 'SUSPENDED') {
        fetchAppealStatus();
      }
    } catch (err) {
      console.error('Failed to fetch seller summary metrics', err);
    }
  };

  const fetchAppealStatus = async () => {
    try {
      const res = await apiClient.get('/profile/appeal-status');
      setAppealData(res.data);
    } catch (err) {
      console.error('Failed to fetch appeal status', err);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim() || appealReason.trim().length < 10) {
      setAppealErrorMsg('Please provide a detailed explanation (at least 10 characters).');
      return;
    }
    setSubmittingAppeal(true);
    setAppealErrorMsg('');
    setAppealSuccessMsg('');
    try {
      const res = await apiClient.post('/profile/appeal-suspension', {
        reason: appealReason.trim()
      });
      setAppealSuccessMsg(res.data.message || 'Appeal submitted successfully.');
      setAppealReason('');
      await fetchAppealStatus();
      setTimeout(() => {
        setIsAppealModalOpen(false);
        setAppealSuccessMsg('');
      }, 2500);
    } catch (err: any) {
      setAppealErrorMsg(err.response?.data?.detail || 'Failed to submit suspension appeal.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleVerifyPayment = async (txnId: string) => {
    setVerifyingPaymentId(txnId);
    try {
      const res = await apiClient.post(`/escrow/seller/transactions/${txnId}/verify-payment`);
      if (res.data.payment_confirmed) {
        await modal.alert({
          title: "Payment Confirmed",
          message: "Payment confirmed! The transaction status has been updated to Awaiting Shipping.",
          type: "success",
          icon: "check"
        });
      } else {
        await modal.alert({
          title: "Payment Pending",
          message: res.data.detail || 'Payment has not been received yet. Please try again later.',
          type: "info",
          icon: "info"
        });
      }
      fetchTransactions();
      fetchMetrics();
    } catch (err: any) {
      console.error(err);
      await modal.alert({
        title: "Verification Error",
        message: err.response?.data?.detail || 'Failed to verify payment status.',
        type: "danger"
      });
    } finally {
      setVerifyingPaymentId(null);
    }
  };

  const handleArchive = async (txnId: string) => {
    setActionLoadingId(txnId);
    try {
      await apiClient.post(`/escrow/seller/transactions/${txnId}/archive`);
      fetchTransactions();
      fetchMetrics();
    } catch (err: any) {
      console.error(err);
      await modal.alert({
        title: "Archive Error",
        message: err.response?.data?.detail || 'Failed to archive transaction.',
        type: "danger"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnarchive = async (txnId: string) => {
    setActionLoadingId(txnId);
    try {
      await apiClient.post(`/escrow/seller/transactions/${txnId}/unarchive`);
      fetchTransactions();
      fetchMetrics();
    } catch (err: any) {
      console.error(err);
      await modal.alert({
        title: "Restore Error",
        message: err.response?.data?.detail || 'Failed to unarchive transaction.',
        type: "danger"
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['transactions', 'purchases', 'referrals', 'badges', 'reviews'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    fetchTransactions();
    fetchMetrics();
    fetchAppealStatus();
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
    const confirmed = await modal.confirm({
      title: "Cancel Transaction & Refund Buyer",
      message: "Are you sure you want to cancel this transaction? The platform fee will be charged to you and the escrow funds will be fully refunded to the buyer.",
      confirmText: "Cancel Order & Refund",
      cancelText: "Keep Order Active",
      type: "danger",
      icon: "alert",
      badgeText: "Cancellation Warning"
    });
    if (!confirmed) return;

    try {
      await apiClient.post(`/escrow/seller/transactions/${id}/cancel`);
      await modal.alert({
        title: "Transaction Cancelled",
        message: "The transaction has been cancelled and funds scheduled for refund to the buyer.",
        type: "info",
        icon: "info"
      });
      fetchTransactions();
      fetchMetrics();
    } catch (err: any) {
      console.error(err);
      await modal.alert({
        title: "Cancellation Error",
        message: err.response?.data?.message || err.response?.data?.detail || 'Failed to cancel transaction.',
        type: "danger"
      });
    }
  };

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('offset', newOffset.toString());
    setSearchParams(params);
  };

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('limit', newLimit.toString());
    params.set('offset', '0');
    setSearchParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ─── NAVIGATION TABS ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-slate-800 pb-3 overflow-x-auto print:hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {user?.role !== 'BUYER' ? (
          <>
            {/* 1. Merchant Sales & Escrows (Primary for Seller) */}
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('tab', 'transactions');
                setSearchParams(params);
                setActiveTab('transactions');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'transactions'
                  ? 'bg-[#0363ff] !text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Package className="h-4 w-4" />
              Merchant Sales & Escrows
            </button>

            {/* 2. Customer Reviews & Ratings (Reviews about this Seller) */}
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('tab', 'seller_reviews');
                setSearchParams(params);
                setActiveTab('seller_reviews');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'seller_reviews'
                  ? 'bg-[#0363ff] !text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              Store Reviews & Ratings
            </button>

            {/* 3. Referrals & Cash Rewards */}
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('tab', 'referrals');
                setSearchParams(params);
                setActiveTab('referrals');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'referrals'
                  ? 'bg-[#0363ff] !text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Gift className="h-4 w-4 text-emerald-400" />
              Referrals & Cash Rewards
            </button>

            {/* 4. Trust Badges & Social Proof */}
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('tab', 'badges');
                setSearchParams(params);
                setActiveTab('badges');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'badges'
                  ? 'bg-[#0363ff] !text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="h-4 w-4 text-amber-400" />
              Trust Badges & Proof
            </button>

            {/* 5. Grouped Buyer Activity (My Purchases & Written Reviews) */}
            <button
              type="button"
              onClick={() => {
                const target = activeTab === 'reviews' ? 'reviews' : 'purchases';
                const params = new URLSearchParams(searchParams);
                params.set('tab', target);
                setSearchParams(params);
                setActiveTab(target);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'purchases' || activeTab === 'reviews'
                  ? 'bg-[#0363ff] !text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Buyer Hub (Purchases & Reviews)</span>
            </button>
          </>
        ) : (
          <>
            {/* Pure Buyer Tabs */}
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('tab', 'purchases');
                setSearchParams(params);
                setActiveTab('purchases');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'purchases'
                  ? 'bg-[#0363ff] !text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              My Purchases & Orders
            </button>

            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('tab', 'reviews');
                setSearchParams(params);
                setActiveTab('reviews');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'reviews'
                  ? 'bg-[#0363ff] !text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              My Reviews & Ratings
            </button>

            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('tab', 'referrals');
                setSearchParams(params);
                setActiveTab('referrals');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === 'referrals'
                  ? 'bg-[#0363ff] !text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Gift className="h-4 w-4 text-emerald-400" />
              Referrals & Cash Rewards
            </button>
          </>
        )}
      </div>

      {/* ─── TAB CONTENT RENDERING ─────────────────────────────────────── */}
      {activeTab === 'seller_reviews' && (
        <SellerReviewsTab
          onNavigateToBadges={() => {
            const params = new URLSearchParams(searchParams);
            params.set('tab', 'badges');
            setSearchParams(params);
            setActiveTab('badges');
          }}
        />
      )}

      {(activeTab === 'purchases' || activeTab === 'reviews') && (
        <div className="space-y-6">
          {user?.role !== 'BUYER' && (
            <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('tab', 'purchases');
                  setSearchParams(params);
                  setActiveTab('purchases');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'purchases'
                    ? 'bg-[#0363ff] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>My Purchases & Orders</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('tab', 'reviews');
                  setSearchParams(params);
                  setActiveTab('reviews');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'reviews'
                    ? 'bg-[#0363ff] text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Reviews I've Written (Outbox)</span>
              </button>
            </div>
          )}

          {activeTab === 'purchases' && <BuyerPurchasesTab />}
          {activeTab === 'reviews' && (
            <BuyerReviewsTab
              onNavigateToPurchases={() => {
                const params = new URLSearchParams(searchParams);
                params.set('tab', 'purchases');
                setSearchParams(params);
                setActiveTab('purchases');
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'referrals' && <ReferralDashboardTab />}

      {activeTab === 'badges' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Merchant Trust Badges & Social Proof</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Embed verified trust badges on your Instagram Bio, WhatsApp catalog, website, or Shopify store to boost buyer confidence and conversion rate.
            </p>
          </div>
          <EmbeddableTrustBadge username={user?.username || ''} />
        </div>
      )}

      {activeTab === 'transactions' && (
        <>
          <div className="sm:flex sm:items-center sm:justify-between mb-6 print:hidden">
            <div>
              <h1 className="text-2xl font-bold text-white dark:text-white">Transactions Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Manage your escrow sales, track active order payouts, print parcel tags, and manage deliveries.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-2">
              <ExportButton
                filename={`merchant_transactions_${new Date().toISOString().split('T')[0]}`}
                title="Merchant Transactions Escrow Report"
                headers={merchantTxnExportHeaders}
                data={txns}
                totalCount={totalCount}
                onFetchAll={fetchAllTransactionsForExport}
                sheetName="Transactions"
                label="Export Sales Report"
              />
            </div>
          </div>

      {/* ─── SELLER DISPUTE HEALTH & ACCOUNT SUSPENSION BANNERS ───────────────── */}
      {metrics?.dispute_health && (
        <div className="mb-6 print:hidden">
          {/* Level 3: Suspended */}
          {(metrics.dispute_health.dispute_level === 'SUSPENDED' || metrics.dispute_health.is_suspended) && (
            <div className="bg-red-50 dark:bg-red-950/60 border-2 border-red-500 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-7 w-7 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base font-bold text-red-900 dark:text-red-200 flex items-center gap-2">
                    🚨 Account Suspended
                  </h3>
                  <p className="text-xs text-red-800 dark:text-red-300 mt-1 leading-relaxed">
                    Your seller account is currently suspended. You cannot create new payment links and all existing payment links have been deactivated.
                  </p>
                  {metrics.dispute_health.suspension_reason && (
                    <p className="text-xs font-mono bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-200 p-2 rounded-lg mt-2 border border-red-200 dark:border-red-800">
                      Reason: {metrics.dispute_health.suspension_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Appeal Status or Appeal Button */}
              {appealData?.has_appeal ? (
                <div className={`rounded-xl p-4 border text-xs font-semibold flex items-start gap-3 ${
                  appealData.appeal?.status === 'PENDING'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-200'
                    : appealData.appeal?.status === 'APPROVED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-400 text-slate-700 dark:text-slate-300'
                }`}>
                  <span className="text-lg shrink-0">
                    {appealData.appeal?.status === 'PENDING' ? '⏳' : appealData.appeal?.status === 'APPROVED' ? '✅' : '❌'}
                  </span>
                  <div>
                    <span className="font-bold block">
                      Appeal {appealData.appeal?.status === 'PENDING' ? 'Submitted — Pending Admin Review' : appealData.appeal?.status === 'APPROVED' ? 'Approved — Account Reinstated' : 'Rejected by Admin'}
                    </span>
                    {appealData.appeal?.reason && (
                      <span className="block mt-1 text-[11px] opacity-90 italic">"{appealData.appeal.reason}"</span>
                    )}
                    {appealData.appeal?.admin_notes && (
                      <span className="block mt-1 opacity-80">Admin notes: {appealData.appeal.admin_notes}</span>
                    )}
                    {appealData.appeal?.status === 'REJECTED' && (
                      <button
                        onClick={() => { setIsAppealModalOpen(true); setAppealErrorMsg(''); setAppealSuccessMsg(''); }}
                        className="mt-2 underline text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition"
                      >
                        Submit a new appeal
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  id="appeal-suspension-btn"
                  onClick={() => { setIsAppealModalOpen(true); setAppealErrorMsg(''); setAppealSuccessMsg(''); }}
                  className="self-start py-2.5 px-5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-md shadow-red-500/25 flex items-center gap-2"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Appeal Account Suspension
                </button>
              )}
            </div>
          )}

          {/* Compound Risk / Compliance Review Banner */}
          {metrics.dispute_health.dispute_level === 'COMPLIANCE_REVIEW' && !metrics.dispute_health.is_suspended && (
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-indigo-950/60 dark:via-purple-950/40 dark:to-indigo-950/60 border-2 border-indigo-400 dark:border-indigo-600 rounded-2xl p-5 shadow-lg flex items-start gap-3.5 mb-3">
              <ShieldAlert className="h-6 w-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-indigo-950 dark:text-indigo-100 uppercase tracking-wide">
                    🛡️ Account Flagged for Compliance Review (Compound Risk)
                  </h3>
                  <span className="bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    HYBRID RISK ALERT
                  </span>
                </div>
                <p className="text-xs text-indigo-900 dark:text-indigo-200 mt-1.5 leading-relaxed font-medium">
                  Your seller account has been flagged for prioritized administrative compliance review because multiple risk indicators have reached warning thresholds concurrently:
                </p>
                {metrics.dispute_health.compliance_review_reasons && metrics.dispute_health.compliance_review_reasons.length > 0 && (
                  <ul className="mt-2 space-y-1 bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200 font-mono">
                    {metrics.dispute_health.compliance_review_reasons.map((reason: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl p-3 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>📦 Ready-to-Ship Action Plan:</strong> Fulfill all pending orders immediately, pause links for out-of-stock inventory, and only create new payment links for items ready for immediate dispatch to protect your seller account.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rating Warning Banner */}
          {metrics.dispute_health.dispute_level === 'RATING_WARNING' && !metrics.dispute_health.is_suspended && (
            <div className="bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-400 rounded-2xl p-5 shadow-md flex items-start gap-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-yellow-900 dark:text-yellow-200">
                  ⭐ Low Seller Rating Warning
                </h3>
                <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1 leading-relaxed">
                  Your aggregated seller rating is currently{' '}
                  <strong className="font-mono font-black text-yellow-950 dark:text-white">
                    {metrics.dispute_health.avg_rating?.toFixed(1)} ★
                  </strong>{' '}
                  across {metrics.dispute_health.total_reviews_count} review{metrics.dispute_health.total_reviews_count !== 1 ? 's' : ''} — below the warning threshold of{' '}
                  <strong>{metrics.dispute_health.rating_warning_threshold} ★</strong>.
                  If your rating drops below{' '}
                  <strong>{metrics.dispute_health.rating_suspension_threshold} ★</strong>,
                  your account will be automatically suspended. Please focus on improving product quality, accurate descriptions, and responsive communication.
                </p>
              </div>
            </div>
          )}

          {/* Dispatch Expiry Warning Banner */}
          {metrics.dispute_health.dispute_level === 'DISPATCH_WARNING' && !metrics.dispute_health.is_suspended && (
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-400 rounded-2xl p-5 shadow-md flex items-start gap-3 mb-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  📦 High Dispatch Expiry Rate Warning ({metrics.dispute_health.dispatch_expiry_rate_pct}%)
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  Your unfulfilled dispatch default rate has reached{' '}
                  <strong className="font-mono text-amber-950 dark:text-white font-black">
                    {metrics.dispute_health.dispatch_expiry_rate_pct}%
                  </strong>{' '}
                  (above the warning threshold of {metrics.dispute_health.dispatch_expiry_warning_threshold ?? 20}%).
                  If your dispatch default rate reaches{' '}
                  <strong>{metrics.dispute_health.dispatch_expiry_suspension_threshold ?? 35}%</strong>,
                  your seller account will be automatically suspended.
                </p>
                <div className="mt-2 text-[11px] bg-amber-100/70 dark:bg-amber-900/40 p-2.5 rounded-lg text-amber-900 dark:text-amber-200 font-medium">
                  💡 <strong>Ready-to-Ship Advisory:</strong> Never generate payment links for pre-orders or items you do not have in hand. Deactivate inactive links to prevent buyer payments on unstocked goods.
                </div>
              </div>
            </div>
          )}

          {/* Level 2: Dispute Warning */}
          {metrics.dispute_health.dispute_level === 'WARNING' && !metrics.dispute_health.is_suspended && (
            <div className="bg-orange-50 dark:bg-orange-950/60 border border-orange-400 rounded-2xl p-5 shadow-md flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-orange-900 dark:text-orange-200">
                  ⚠️ High Dispute Warning — Action Required
                </h3>
                <p className="text-xs text-orange-800 dark:text-orange-300 mt-1 leading-relaxed">
                  Your dispute rate has reached <strong className="font-mono text-orange-950 dark:text-white font-black">{metrics.dispute_health.dispute_rate_pct}%</strong> ({metrics.dispute_health.sample_disputed_count} of {metrics.dispute_health.sample_paid_count} paid orders disputed) evaluated over your <strong>{metrics.dispute_health.sample_evaluated}</strong>. Reaching <strong>40%</strong> will result in automatic account suspension and link disablement. Please ensure fast shipping and high product accuracy.
                </p>
              </div>
            </div>
          )}

          {/* Level 1: Alert */}
          {metrics.dispute_health.dispute_level === 'ALERT' && !metrics.dispute_health.is_suspended && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 rounded-2xl p-4 shadow-sm flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  ⚡ Dispute Rate Notice ({metrics.dispute_health.dispute_rate_pct}%)
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  Your dispute rate is at <strong>{metrics.dispute_health.dispute_rate_pct}%</strong> ({metrics.dispute_health.sample_disputed_count} of {metrics.dispute_health.sample_paid_count} paid orders) in your <strong>{metrics.dispute_health.sample_evaluated}</strong> sample. Maintain high customer satisfaction to prevent escalation to account warning or suspension thresholds.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── PENDING TRANSACTIONS & AMOUNTS DUE SUMMARY ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8 print:hidden">
        {/* Card 1: Total Pending Orders & Net Amount Due */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-blue-800/40 shadow-md sm:shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-3 -bottom-3 opacity-10 pointer-events-none">
            <Package className="h-20 w-20 sm:h-32 sm:w-32 text-blue-400" />
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-blue-300 block truncate">
              Pending Escrow Payouts
            </span>
            <div className="mt-1 sm:mt-2 flex items-baseline gap-2">
              <span className="text-base sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                GHS {(metrics?.pending_net_due_seller_ghs ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-300 mt-1">
              Net amount due across active pending orders
            </p>
          </div>
          <div className="mt-2.5 sm:mt-5 pt-2 sm:pt-3 border-t border-blue-800/40 flex items-center justify-between">
            <span className="hidden sm:inline text-xs font-semibold text-blue-200">Active Pending Orders</span>
            <span className="text-[10px] sm:text-xs font-bold font-mono bg-blue-500/20 text-blue-300 px-2 sm:px-2.5 py-0.5 rounded-full border border-blue-400/30 ml-auto sm:ml-0">
              {metrics?.pending_transactions_count ?? 0} Orders
            </span>
          </div>
        </div>

        {/* Card 2: Awaiting Dispatch */}
        <div 
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('status', 'PAYMENT_RECEIVED');
            params.set('offset', '0');
            setStatus('PAYMENT_RECEIVED');
            setSearchParams(params);
          }}
          className={`bg-white dark:bg-slate-950 rounded-xl sm:rounded-2xl p-3 sm:p-5 border cursor-pointer transition hover:border-amber-500/50 hover:shadow-md flex flex-col justify-between ${
            status === 'PAYMENT_RECEIVED' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200 dark:border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">Awaiting Dispatch</span>
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2 text-base sm:text-xl font-bold font-mono text-gray-900 dark:text-white tracking-tight">
              GHS {(metrics?.awaiting_dispatch_net_ghs ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="hidden sm:block text-xs text-gray-500 dark:text-slate-400 mt-0.5">Paid by buyer, needs dispatch</p>
          </div>
          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100 dark:border-slate-900 flex items-center justify-between text-xs">
            <span className="hidden sm:inline text-gray-600 dark:text-slate-400 font-medium">To Package & Ship</span>
            <span className="text-[10px] sm:text-xs font-bold font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 sm:px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/50 ml-auto sm:ml-0">
              {metrics?.awaiting_dispatch_count ?? 0} Orders
            </span>
          </div>
        </div>

        {/* Card 3: In Transit & Inspection */}
        <div 
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('status', 'DELIVERY_IN_PROGRESS');
            params.set('offset', '0');
            setStatus('DELIVERY_IN_PROGRESS');
            setSearchParams(params);
          }}
          className={`bg-white dark:bg-slate-950 rounded-xl sm:rounded-2xl p-3 sm:p-5 border cursor-pointer transition hover:border-blue-500/50 hover:shadow-md flex flex-col justify-between ${
            status === 'DELIVERY_IN_PROGRESS' || status === 'INSPECTION_PERIOD' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">In Transit</span>
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2 text-base sm:text-xl font-bold font-mono text-gray-900 dark:text-white tracking-tight">
              GHS {((metrics?.in_delivery_net_ghs ?? 0) + (metrics?.in_inspection_net_ghs ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="hidden sm:block text-xs text-gray-500 dark:text-slate-400 mt-0.5">En route or buyer inspecting</p>
          </div>
          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100 dark:border-slate-900 flex items-center justify-between text-xs">
            <span className="hidden sm:inline text-gray-600 dark:text-slate-400 font-medium">In Transit / Inspecting</span>
            <span className="text-[10px] sm:text-xs font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 sm:px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/50 ml-auto sm:ml-0">
              {(metrics?.in_delivery_count ?? 0) + (metrics?.in_inspection_count ?? 0)} Orders
            </span>
          </div>
        </div>

        {/* Card 4: Settled & Completed Earnings */}
        <div 
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('status', 'COMPLETED');
            params.set('offset', '0');
            setStatus('COMPLETED');
            setSearchParams(params);
          }}
          className={`bg-white dark:bg-slate-950 rounded-xl sm:rounded-2xl p-3 sm:p-5 border cursor-pointer transition hover:border-emerald-500/50 hover:shadow-md flex flex-col justify-between ${
            status === 'COMPLETED' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200 dark:border-slate-800'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">Completed</span>
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
            </div>
            <div className="mt-1 sm:mt-2 text-base sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              GHS {(metrics?.completed_total_earned_ghs ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="hidden sm:block text-xs text-gray-500 dark:text-slate-400 mt-0.5">Released & settled to wallet</p>
          </div>
          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100 dark:border-slate-900 flex items-center justify-between text-xs">
            <span className="hidden sm:inline text-gray-600 dark:text-slate-400 font-medium">Total Settled</span>
            <span className="text-[10px] sm:text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50 ml-auto sm:ml-0">
              {metrics?.completed_transactions_count ?? 0} Completed
            </span>
          </div>
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
                <option value="ARCHIVED">Archived</option>
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
      {/* Data Table */}
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-900/80">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date & ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Buyer Details</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Product & Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Loading transactions...</p>
                  </td>
                </tr>
              ) : txns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-slate-900 flex items-center justify-center mb-3">
                      <Package className="h-6 w-6 text-gray-400 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">No transactions found</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Try adjusting your filters or search terms.</p>
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
                    <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{new Date(txn.created_at).toLocaleDateString()}</div>
                        <button 
                          onClick={() => setSelectedTxn(txn)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono mt-0.5 font-bold transition-colors underline"
                          title="View Parcel Tag"
                        >
                          {txn.paystack_reference}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{txn.buyer_name || 'No Name'}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{txn.buyer_phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100 line-clamp-1" title={txn.title}>{txn.title}</div>
                        <div className="text-xs font-bold text-gray-900 dark:text-slate-100 mt-0.5">GHS {Number(txn.total_amount_ghs).toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </span>
                        {txn.status === 'PAYMENT_RECEIVED' && (
                          (() => {
                            const createdAt = new Date(txn.created_at).getTime();
                            const timeoutDays = (txn as any).shipping_timeout_days || 4;
                            const dispatchDeadline = createdAt + timeoutDays * 24 * 60 * 60 * 1000;
                            const diff = dispatchDeadline - Date.now();
                            if (diff <= 0) {
                              return <div className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1">⚠ Dispatch Overdue</div>;
                            }
                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            return <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1">⏳ Dispatch before {days}d {hours}h</div>;
                          })()
                        )}
                        {txn.delivery_method && txn.status === 'DELIVERY_IN_PROGRESS' && (
                          <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            {txn.delivery_method === 'INFORMAL_BUS' ? '🚌 Informal Bus' : '📦 Courier'}
                          </div>
                        )}
                        {txn.status === 'INSPECTION_PERIOD' && txn.inspection_starts_at && (
                          (() => {
                            const start = new Date(txn.inspection_starts_at!).getTime();
                            const hoursAllowed = txn.inspection_hours_allowed || 24;
                            const end = start + hoursAllowed * 60 * 60 * 1000;
                            const diff = end - Date.now();
                            if (diff <= 0) {
                              return <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">Expired</div>;
                            }
                            const hours = Math.floor(diff / (1000 * 60 * 60));
                            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            return <div className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-1">{hours}h {mins}m left</div>;
                          })()
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        {txn.status === 'AWAITING_PAYMENT' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerifyPayment(txn.id)}
                              disabled={verifyingPaymentId === txn.id}
                              className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                              title="Check with payment gateway if buyer payment went through"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${verifyingPaymentId === txn.id ? 'animate-spin' : ''}`} />
                              {verifyingPaymentId === txn.id ? 'Checking...' : 'Check Payment'}
                            </button>
                            {txn.is_archived ? (
                              <button
                                onClick={() => handleUnarchive(txn.id)}
                                disabled={actionLoadingId === txn.id}
                                className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                title="Unarchive Transaction"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                Unarchive
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchive(txn.id)}
                                disabled={actionLoadingId === txn.id}
                                className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                title="Archive unpaid transaction"
                              >
                                <Archive className="h-3.5 w-3.5" />
                                Archive
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedTxn(txn)}
                              className="text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                              title="View Transaction Details"
                            >
                              Details
                            </button>
                          </div>
                        ) : txn.is_archived ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUnarchive(txn.id)}
                              disabled={actionLoadingId === txn.id}
                              className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                              title="Unarchive Transaction"
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                              Unarchive
                            </button>
                            <button
                              onClick={() => setSelectedTxn(txn)}
                              className="text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                              title="View Transaction Details"
                            >
                              Details
                            </button>
                          </div>
                        ) : txn.status === 'PAYMENT_RECEIVED' ? (
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
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/40 p-1.5 rounded-lg transition-colors"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        ) : isInformalInTransit ? (
                          (() => {
                            const delayHours = txn.otp_reveal_delay_hours ?? 24;
                            const dispatchedMs = txn.dispatched_at ? new Date(txn.dispatched_at).getTime() : Date.now();
                            const unlockTimeMs = dispatchedMs + delayHours * 3600 * 1000;
                            const isLocked = Date.now() < unlockTimeMs;
                            const msRemaining = Math.max(0, unlockTimeMs - Date.now());
                            const hoursLeft = Math.floor(msRemaining / (1000 * 3600));
                            const minsLeft = Math.floor((msRemaining % (1000 * 3600)) / (1000 * 60));

                            return (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => setVerifyOtpTxn(txn)}
                                  className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 text-xs ${
                                    isLocked
                                      ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/60'
                                      : 'text-white bg-green-600 hover:bg-green-700'
                                  }`}
                                >
                                  {isLocked ? <Lock className="h-3.5 w-3.5" /> : <KeyRound className="h-4 w-4" />}
                                  {isLocked ? `OTP Locked (${hoursLeft}h ${minsLeft}m)` : 'Verify Delivery OTP'}
                                </button>
                                <p className="text-[11px] text-gray-400 dark:text-slate-500 text-right">
                                  {isLocked ? `Anti-fraud lock active (${delayHours}h)` : 'Ask buyer for their OTP at pickup'}
                                </p>
                              </div>
                            );
                          })()
                        ) : isCourierStuck ? (
                           <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => setForceCourierTxn(txn)}
                              className="text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5"
                            >
                              <ShieldAlert className="h-4 w-4" />
                              Force Delivered
                            </button>
                            <p className="text-xs text-orange-500 dark:text-orange-400 text-right w-48">Over 36h since dispatch. Check courier status or override with a reason.</p>
                          </div>
                        ) : txn.status === 'DISPUTED' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedTxn(txn)}
                              className="text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
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
                            className="text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
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
        
        {/* Pagination controls & Page Size Selector */}
        {!loading && totalCount > 0 && (
          <div className="bg-white dark:bg-slate-950 px-4 py-3.5 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 sm:px-6">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300">
                Showing <span className="font-semibold text-gray-900 dark:text-slate-100">{offset + 1}</span> to <span className="font-semibold text-gray-900 dark:text-slate-100">{Math.min(offset + limit, totalCount)}</span> of <span className="font-semibold text-gray-900 dark:text-slate-100">{totalCount}</span>
              </p>
              
              <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-gray-200 sm:dark:border-slate-800 text-xs">
                <span className="text-gray-500 dark:text-slate-400 hidden sm:inline">Per page:</span>
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900">
                  {[10, 25, 50, 100].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleLimitChange(size)}
                      className={`px-2 py-1 rounded text-xs font-bold transition cursor-pointer ${
                        limit === size
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {totalCount > limit && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="relative inline-flex items-center px-3 py-1.5 rounded-l-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(offset + limit)}
                    disabled={offset + limit >= totalCount}
                    className="relative inline-flex items-center px-3 py-1.5 rounded-r-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 dark:border-slate-800 my-auto print:shadow-none print:max-w-none print:w-[10cm] print:border print:border-black print:rounded-none">
            
            {/* Modal Header - Hidden on print */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/80 flex-shrink-0 print:hidden">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Transaction Details & Settlement Audit
                </h3>
                <p className="text-xs font-mono text-gray-500 dark:text-slate-400">{selectedTxn.paystack_reference}</p>
              </div>
              <button 
                onClick={() => { setSelectedTxn(null); setActiveDetailTab('AUDIT'); }}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs - Hidden on print */}
            <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-100/60 dark:bg-slate-950/60 px-6 pt-2 flex-shrink-0 print:hidden">
              <button
                onClick={() => setActiveDetailTab('AUDIT')}
                className={`pb-2.5 px-4 text-xs font-bold font-mono transition-colors border-b-2 ${
                  activeDetailTab === 'AUDIT'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                📋 Audit & Financials
              </button>
              <button
                onClick={() => setActiveDetailTab('TAG')}
                className={`pb-2.5 px-4 text-xs font-bold font-mono transition-colors border-b-2 ${
                  activeDetailTab === 'TAG'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                🏷️ Print Parcel Tag
              </button>
            </div>

            {/* Tab 1: AUDIT & FINANCIAL DETAILS */}
            {activeDetailTab === 'AUDIT' && (
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-gray-700 dark:text-slate-300 print:hidden flex-1">
                {/* Financial Overview */}
                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 font-mono text-[10px] block">TOTAL BUYER PAID</span>
                    <span className="font-black text-gray-900 dark:text-slate-100 text-sm">GHS {Number(selectedTxn.total_amount_ghs).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 font-mono text-[10px] block">PLATFORM FEE</span>
                    <span className="font-bold text-gray-700 dark:text-slate-200 text-xs">GHS {Number(selectedTxn.platform_fee_ghs || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-slate-400 font-mono text-[10px] block">SHIPPING FEE</span>
                    <span className="font-bold text-gray-700 dark:text-slate-200 text-xs">GHS {Number(selectedTxn.shipping_fee_ghs || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Status & Milestones */}
                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700/80 pb-2">
                    <span className="font-bold text-gray-700 dark:text-slate-200">Order Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      STATUS_CONFIG[selectedTxn.status]?.bg || 'bg-gray-100 dark:bg-slate-800'
                    } ${STATUS_CONFIG[selectedTxn.status]?.color || 'text-gray-800 dark:text-slate-200'}`}>
                      {STATUS_CONFIG[selectedTxn.status]?.label || selectedTxn.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 dark:text-slate-400 pt-1 font-mono">
                    <div>Created: {new Date(selectedTxn.created_at).toLocaleString()}</div>
                    <div>Dispatched: {selectedTxn.dispatched_at ? new Date(selectedTxn.dispatched_at).toLocaleString() : 'Not Dispatched'}</div>
                    <div>Delivered: {selectedTxn.delivered_at ? new Date(selectedTxn.delivered_at).toLocaleString() : 'Not Delivered'}</div>
                    <div>Inspection Start: {selectedTxn.inspection_starts_at ? new Date(selectedTxn.inspection_starts_at).toLocaleString() : 'N/A'}</div>
                  </div>
                </div>

                {/* Refund & Dispute Audit Section */}
                {(selectedTxn.status === 'REFUNDED' || selectedTxn.status === 'CANCELLED' || selectedTxn.status === 'DISPUTED' || selectedTxn.buyer_dispute_reason || selectedTxn.dispute_retracted_at) && (
                  <div className="bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-red-200 dark:border-red-900/50 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Settlement & Dispute Audit Trail</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const current = selectedTxn;
                          setSelectedTxn(null);
                          setDisputeTxn(current);
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Open Dispute Evidence & Response Modal ↗</span>
                      </button>
                    </div>

                    {selectedTxn.status === 'REFUNDED' && (
                      <div className="space-y-1.5 text-xs text-red-900 dark:text-red-200">
                        <p className="font-semibold">
                          • Dispute Settlement: Payouts executed per arbitration ruling within 24 hours.
                        </p>
                        <p className="text-[11px] text-red-700 dark:text-red-300">
                          • Buyer refund amounts are processed directly to their original payment method (Paystack MoMo/Card).
                        </p>
                      </div>
                    )}

                    {selectedTxn.status === 'CANCELLED' && (
                      <div className="space-y-1.5 text-xs text-red-900 dark:text-red-200">
                        <p className="font-semibold">
                          • Order Cancelled: 100% full refund returned to the buyer via original payment medium.
                        </p>
                        <p className="text-[11px] text-red-700 dark:text-red-300">
                          • Note: Non-dispatch after 4 days automatically incurs platform fee + 1.95% Paystack charges penalty.
                        </p>
                      </div>
                    )}

                    {/* Dispute Dialogue & Evidence Trail */}
                    <div className="pt-2">
                      <DisputeChatTimeline
                        buyerReason={selectedTxn.buyer_dispute_reason}
                        buyerPhotos={selectedTxn.buyer_dispute_photos}
                        buyerName={selectedTxn.buyer_name || 'Buyer'}
                        sellerResponse={selectedTxn.seller_dispute_response}
                        sellerPhotos={selectedTxn.seller_dispute_photos}
                        sellerName="You (Seller)"
                        managerNotes={selectedTxn.manager_dispute_notes}
                        managerPhotos={selectedTxn.manager_dispute_photos}
                        disputeRetractedAt={selectedTxn.dispute_retracted_at}
                        waybillPhotoUrl={selectedTxn.waybill_photo_url}
                        showResponseButton={selectedTxn.status === 'DISPUTED'}
                        onOpenDisputeModal={() => {
                          const current = selectedTxn;
                          setSelectedTxn(null);
                          setDisputeTxn(current);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Logistics Details & Waybill Photo */}
                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-gray-800 dark:text-slate-100 block">Logistics & Dispatch Proof</span>
                  {selectedTxn.delivery_method ? (
                    <div className="space-y-1 text-xs text-gray-600 dark:text-slate-300">
                      <p>Method: <strong className="text-gray-900 dark:text-slate-100">{selectedTxn.delivery_method === 'INFORMAL_BUS' ? '🚌 Station / Bus OTP' : '📦 Courier API'}</strong></p>
                      {selectedTxn.courier_name && (
                        <div className="flex items-center justify-between pt-1">
                          <p>Courier: <span className="font-semibold text-gray-900 dark:text-slate-100">{selectedTxn.courier_name}</span> ({selectedTxn.tracking_number})</p>
                          {selectedTxn.carrier_tracking_url && (
                            <a
                              href={selectedTxn.carrier_tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                            >
                              Track Package ↗
                            </a>
                          )}
                        </div>
                      )}
                      {selectedTxn.driver_phone && <p>Driver: {selectedTxn.driver_phone} | Car: {selectedTxn.driver_car_number || 'N/A'} | Station: {selectedTxn.destination_station}</p>}
                    </div>
                  ) : (
                    <p className="text-gray-400 dark:text-slate-500 italic">Not dispatched yet.</p>
                  )}

                  {selectedTxn.waybill_photo_url && (
                    <div className="pt-2">
                      <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-slate-400 block mb-1 uppercase">Dispatch Waybill Photo:</span>
                      <div className="relative group cursor-pointer inline-block" onClick={() => setLightboxImage(selectedTxn.waybill_photo_url!)}>
                        <img
                          src={selectedTxn.waybill_photo_url}
                          alt="Waybill proof"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-slate-700 hover:opacity-90 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buyer Information */}
                <div className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-1 text-xs">
                  <span className="font-bold text-gray-800 dark:text-slate-100 block mb-1">Buyer Details</span>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">{selectedTxn.buyer_name || 'N/A'}</p>
                  <p className="font-mono text-gray-600 dark:text-slate-400">{selectedTxn.buyer_phone}</p>
                  <p className="text-gray-500 dark:text-slate-400">{selectedTxn.buyer_email}</p>
                  <p className="text-gray-600 dark:text-slate-300 mt-1">{selectedTxn.shipping_address}</p>
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
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800 flex gap-3 flex-shrink-0 print:hidden">
              <button 
                onClick={() => { setSelectedTxn(null); setActiveDetailTab('AUDIT'); }}
                className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
              {activeDetailTab === 'TAG' && (
                <button 
                  onClick={() => window.print()}
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
          onOpenLightbox={(url) => setLightboxImage(url)}
        />
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Account Suspension Appeal Modal */}
      {isAppealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Appeal Account Suspension</h3>
              </div>
              <button 
                onClick={() => { setIsAppealModalOpen(false); setAppealErrorMsg(''); setAppealSuccessMsg(''); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAppeal} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Provide a clear justification for why your account should be reinstated. Detail any remediation steps you have taken regarding order fulfillment, product quality, or dispute resolutions.
              </p>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Appeal Explanation & Justification
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {appealReason.length} chars (min 10)
                  </span>
                </div>
                <textarea
                  rows={5}
                  required
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Explain the circumstances and actions taken to prevent future issues..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              {appealErrorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300">
                  {appealErrorMsg}
                </div>
              )}

              {appealSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {appealSuccessMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsAppealModalOpen(false); setAppealErrorMsg(''); setAppealSuccessMsg(''); }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAppeal || appealReason.trim().length < 10}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingAppeal ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Appeal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FLOATING ACTION BUTTON (CREATE NEW PAYMENT LINK) ────────────────── */}
      {user?.role !== 'BUYER' && (
        <Link
          to="/create-link"
          title="Create New Payment Link"
          aria-label="Create New Payment Link"
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 group flex items-center gap-2 bg-[#0363ff] hover:bg-blue-600 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl shadow-blue-600/40 border border-blue-400/30 hover:shadow-blue-500/60 hover:scale-105 active:scale-95 transition-all duration-200 print:hidden cursor-pointer backdrop-blur-sm"
        >
          <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90 stroke-[2.5]" />
          <span className="hidden sm:inline font-bold text-xs tracking-wider uppercase font-sans">
            Create Link
          </span>
        </Link>
      )}
    </div>
  );
}
