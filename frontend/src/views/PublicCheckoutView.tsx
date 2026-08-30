import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck, Truck, ArrowRight, Loader2,
  CheckCircle, Clock, AlertTriangle, X, KeyRound, Store
} from 'lucide-react';
import RateSellerModal from '../components/RateSellerModal';
import { compressImageToWebP } from '../utils/imageUtils';
import SEOHead from '../components/SEOHead';

interface LinkData {
  id: string;
  title: string;
  description: string;
  price_ghs: string;
  shipping_fee_ghs: string;
  fee_handling: string;
  image_url?: string;
  seller_username?: string;
  shop_name?: string;
  seller_email?: string;
  seller_phone?: string;
  seller_profile_picture_url?: string;
}

interface TxnDetail {
  id: string;
  status: string;
  total_amount_ghs: number;
  buyer_email: string;
  shipping_address: string;
  title: string;
  image_url?: string;
  created_at: string;
  paystack_reference: string;
  inspection_starts_at?: string;
  seller_username?: string;
  shop_name?: string;
  seller_email?: string;
  seller_phone?: string;
  seller_profile_picture_url?: string;
  waybill_photo_url?: string;
}

import { STATUS_CONFIG } from '../constants/statusConfig';

// ─── Transaction Status Screen (post-payment) ──────────────────────────────
function TransactionStatusScreen({ txn, txRef }: { txn: TxnDetail; txRef: string }) {
  const cfg = STATUS_CONFIG[txn.status] || STATUS_CONFIG['AWAITING_PAYMENT'];
  const Icon = cfg.icon;

  const canConfirm = txn.status === 'DELIVERY_IN_PROGRESS';
  let canDispute = txn.status === 'INSPECTION_PERIOD' || txn.status === 'DELIVERY_IN_PROGRESS';
  const isInspection = txn.status === 'INSPECTION_PERIOD';

  // Calculate inspection remaining time
  let inspectionRemaining = "";
  if (isInspection && txn.inspection_starts_at) {
    const start = new Date(txn.inspection_starts_at).getTime();
    const now = new Date().getTime();
    
    let hoursAllowed = 24;
    if (txn.total_amount_ghs >= 2000 && txn.total_amount_ghs < 10000) hoursAllowed = 48;
    else if (txn.total_amount_ghs >= 10000) hoursAllowed = 72;
    
    const end = start + (hoursAllowed * 60 * 60 * 1000);
    const diff = end - now;
    
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      inspectionRemaining = `${hours}h ${mins}m`;
    } else {
      inspectionRemaining = "Expired (processing)";
      canDispute = false;
    }
  }

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Rating Modal state
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Dispute Modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [buyerPhotos, setBuyerPhotos] = useState<string[]>([]);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [isCompressingBuyerPhotos, setIsCompressingBuyerPhotos] = useState(false);
  const [disputeError, setDisputeError] = useState('');

  const handleOpenConfirmModal = async () => {
    setIsSendingCode(true);
    try {
      await axios.post(`/api/v1/escrow/${txn.id}/send-confirmation-code`);
      setShowConfirmModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send confirmation code.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmError('');
    setIsConfirming(true);
    try {
      await axios.post(`/api/v1/escrow/${txn.id}/confirm-receipt`, { confirmation_code: confirmCode.trim() });
      setShowConfirmModal(false);
      setShowRatingModal(true);
    } catch (err: any) { 
      setConfirmError(err.response?.data?.message || 'Failed to confirm receipt. Please check the code and try again.'); 
    } finally {
      setIsConfirming(false);
    }
  };

  const handleBuyerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (buyerPhotos.length + files.length > 5) {
      alert("You can upload a maximum of 5 evidence photos.");
      return;
    }
    setIsCompressingBuyerPhotos(true);
    setDisputeError('');
    try {
      const compressedList: string[] = [];
      for (const file of files) {
        const webp = await compressImageToWebP(file);
        compressedList.push(webp);
      }
      setBuyerPhotos(prev => [...prev, ...compressedList].slice(0, 5));
    } catch (err) {
      console.error("Failed to compress evidence photo:", err);
      setDisputeError("Failed to process selected evidence photo.");
    } finally {
      setIsCompressingBuyerPhotos(false);
    }
  };

  const handleRaiseDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) {
      setDisputeError('Please describe the reason for your dispute.');
      return;
    }
    setDisputeError('');
    setIsSubmittingDispute(true);
    try {
      await axios.post(`/api/v1/escrow/${txn.id}/raise-dispute`, {
        reason: disputeReason.trim(),
        photos: buyerPhotos
      });
      alert('Dispute and evidence photos submitted successfully. Management team will arbitrate.');
      setShowDisputeModal(false);
      window.location.reload();
    } catch (err: any) {
      setDisputeError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit dispute.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 font-sans transition-colors">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className={`p-8 text-center ${cfg.bg}`}>
            {txn.image_url && (
              <div className="mb-4 mx-auto max-w-xs rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <img src={txn.image_url} alt={txn.title} className="w-full h-44 object-cover" />
              </div>
            )}
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white/60 dark:bg-slate-800/80 mb-4 ${cfg.color}`}>
              <Icon className="h-8 w-8" />
            </div>
            <h1 className={`text-2xl font-bold mb-1 ${cfg.color}`}>{cfg.label}</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">{txn.title}</p>
          </div>

          <div className="p-6 space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Amount Paid</span>
              <span className="font-semibold text-gray-900 dark:text-slate-100">GHS {Number(txn.total_amount_ghs || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-gray-500 dark:text-slate-400">Email</span>
              <span className="font-medium text-gray-800 dark:text-slate-200">{txn.buyer_email}</span>
            </div>
            {txn.shipping_address && (
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-500 dark:text-slate-400">Delivery To</span>
                <span className="font-medium text-gray-800 dark:text-slate-200 text-right max-w-[60%]">{txn.shipping_address}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-gray-500 dark:text-slate-400">Reference</span>
              <span className="font-mono text-xs text-gray-600 dark:text-slate-400">{txRef}</span>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4">Escrow Progress</h3>
          {['PAYMENT_RECEIVED', 'DELIVERY_IN_PROGRESS', 'INSPECTION_PERIOD', 'COMPLETED'].map(step => {
            const s = STATUS_CONFIG[step];
            const StepIcon = s.icon;
            const statuses = ['AWAITING_PAYMENT', 'PAYMENT_RECEIVED', 'DELIVERY_IN_PROGRESS', 'INSPECTION_PERIOD', 'COMPLETED'];
            const currentIdx = statuses.indexOf(txn.status);
            const stepIdx = statuses.indexOf(step);
            const done = currentIdx >= stepIdx;
            return (
              <div key={step} className="flex items-center gap-3 mb-3">
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${done ? s.bg : 'bg-gray-100 dark:bg-slate-800'}`}>
                  <StepIcon className={`h-4 w-4 ${done ? s.color : 'text-gray-300 dark:text-slate-600'}`} />
                </div>
                <span className={`text-sm ${done ? 'text-gray-900 dark:text-slate-100 font-medium' : 'text-gray-400 dark:text-slate-500'}`}>{s.label}</span>
                {txn.status === step && (
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>Current</span>
                )}
              </div>
            );
          })}
        </div>

        {txn.waybill_photo_url && (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 flex items-center gap-4">
            <img
              src={txn.waybill_photo_url}
              alt="Package waybill proof"
              className="w-16 h-16 object-cover rounded-xl border border-blue-200 dark:border-blue-800/60"
            />
            <div>
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">Dispatch / Package Proof</span>
              <span className="text-xs text-blue-700 dark:text-blue-400 block mt-0.5">Uploaded by seller during dispatch</span>
            </div>
          </div>
        )}

        {txn.status === 'PAYMENT_RECEIVED' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="text-xs text-amber-900 dark:text-amber-300">
              <span className="font-bold block">4-Day Seller Dispatch Guarantee</span>
              <span>The seller has 4 days to dispatch your item. If not dispatched on time, your funds will be 100% automatically refunded.</span>
            </div>
          </div>
        )}

        {/* Refund & Dispute Settlement Audit Card */}
        {(txn.status === 'REFUNDED' || txn.status === 'CANCELLED' || txn.status === 'DISPUTED') && (
          <div className="bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex justify-between items-center border-b border-red-200/80 dark:border-red-800/50 pb-3">
              <span className="font-bold text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                {txn.status === 'REFUNDED' ? 'Dispute Refund Processed' : txn.status === 'CANCELLED' ? 'Order Cancelled & Refunded' : 'Dispute Under Review'}
              </span>
              {(txn.status === 'REFUNDED' || txn.status === 'CANCELLED') && (
                <span className="font-mono font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-lg text-sm shadow-sm">
                  Refund: GHS {Number((txn as any).buyer_refund_amount_ghs || txn.total_amount_ghs).toFixed(2)}
                </span>
              )}
            </div>

            <p className="text-red-900 dark:text-red-300 font-medium leading-relaxed">
              ⏱ <strong>24-Hour Settlement Guarantee:</strong> All refunds are automatically returned via your original payment channel (Paystack MoMo/Card) within 24 hours.
            </p>

            {(txn as any).manager_dispute_notes && (
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-red-200 dark:border-red-800/60 space-y-1.5 shadow-sm">
                <span className="font-mono text-red-600 dark:text-red-400 font-bold uppercase text-[10px] block">Manager Resolution Notes:</span>
                <p className="text-gray-800 dark:text-slate-200 text-xs font-sans leading-relaxed">{(txn as any).manager_dispute_notes}</p>
                {(txn as any).manager_dispute_photos && (txn as any).manager_dispute_photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(txn as any).manager_dispute_photos.map((url: string, idx: number) => (
                      <img key={idx} src={url} alt="Manager ruling proof" className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-700" />
                    ))}
                  </div>
                )}
              </div>
            )}

            {(txn as any).buyer_dispute_reason && (
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-red-200 dark:border-red-800/60 space-y-1 shadow-sm">
                <span className="font-mono text-gray-500 dark:text-slate-400 font-bold uppercase text-[10px] block">Your Dispute Claim:</span>
                <p className="text-gray-800 dark:text-slate-200 text-xs font-sans">{(txn as any).buyer_dispute_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Buyer Actions */}
        {(canConfirm || canDispute || isInspection) && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">
              {isInspection ? "Inspection Mode" : "Item received?"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
              {isInspection 
                ? `You have ${inspectionRemaining} remaining to raise a dispute before funds are automatically released to the seller.` 
                : "Confirm receipt to enter Inspection Mode, or raise a dispute if something is wrong."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {canConfirm && (
                <button
                  onClick={handleOpenConfirmModal}
                  disabled={isSendingCode}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : '✓ Confirm Receipt'}
                </button>
              )}
              {canDispute && (
                <button
                  onClick={() => { setShowDisputeModal(true); setDisputeReason(''); setBuyerPhotos([]); setDisputeError(''); }}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                >
                  ⚠ Raise Dispute
                </button>
              )}
            </div>
          </div>
        )}

        {/* Delivery Process Info — shown while item is in transit or inspection */}
        {(txn.status === 'DELIVERY_IN_PROGRESS' || txn.status === 'INSPECTION_PERIOD') && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-5 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-bold mb-2">📦 How delivery & receipt works</p>

            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Path A — Formal Courier:</p>
            <p className="text-amber-700 dark:text-amber-400 mb-3">
              If your seller used a courier service, the system is automatically notified the moment the package is marked <strong>DELIVERED</strong>. No action needed on your part until you inspect it.
            </p>

            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Path B — Informal / Bus Delivery:</p>
            <ul className="list-disc list-inside text-amber-700 dark:text-amber-400 space-y-1 mb-3">
              <li>You should have received an SMS with the <strong>driver's info</strong> (phone / car number) and your <strong>Secret OTP</strong>.</li>
              <li>When collecting at the station, present your <strong>ID + Secret OTP</strong> to the driver or seller's agent.</li>
              <li>Keep your OTP safe — you will need it again to <strong>Confirm Receipt</strong> in this app after collection.</li>
            </ul>

            <p className="text-xs text-amber-600 dark:text-amber-400 italic">
              Once you confirm receipt, a {txn.total_amount_ghs >= 10000 ? '72' : txn.total_amount_ghs >= 2000 ? '48' : '24'}-hour inspection window opens. Raise a dispute before it expires if there is a problem.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-slate-500 pb-4">
          Bookmark this page to track your delivery status. Reference: {txRef}
        </p>
      </div>

      {/* Confirm Receipt Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-6 relative">
            <button 
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Delivery</h3>
              <p className="text-sm text-gray-500 mt-2">
                We've sent a 6-digit code to your phone (and email if provided). Enter it below to release payment to the seller.
              </p>
            </div>

            {confirmError && (
              <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 text-center">
                {confirmError}
              </div>
            )}

            <form onSubmit={handleConfirmReceipt} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm tracking-widest font-mono text-center transition-all"
                  placeholder="• • • • • •"
                  maxLength={6}
                />
              </div>
              
              <button
                type="submit"
                disabled={isConfirming || !confirmCode}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all shadow-lg shadow-green-500/30 disabled:opacity-70"
              >
                {isConfirming ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Receipt"}
              </button>
              
              <button
                type="button"
                onClick={handleOpenConfirmModal}
                disabled={isSendingCode}
                className="w-full text-sm font-medium text-green-600 hover:text-green-800 transition-colors mt-2"
              >
                {isSendingCode ? 'Sending...' : 'Didn\'t receive it? Resend Code'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Raise Dispute Sub-Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button onClick={() => setShowDisputeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-base font-bold text-gray-900">Raise Transaction Dispute</h4>
            {disputeError && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">{disputeError}</p>}
            <form onSubmit={handleRaiseDisputeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Dispute *</label>
                <textarea
                  required
                  rows={3}
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Describe the issue with your item..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Evidence Photos (Max 5)</label>
                  <span className="text-[11px] font-mono text-gray-500">
                    {isCompressingBuyerPhotos ? 'Compressing WebP...' : `${buyerPhotos.length}/5 photos`}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBuyerPhotoUpload}
                  disabled={buyerPhotos.length >= 5 || isCompressingBuyerPhotos}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer disabled:opacity-50"
                />
                {isCompressingBuyerPhotos && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-red-600 font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing photos to WebP...
                  </div>
                )}
                {buyerPhotos.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {buyerPhotos.map((photo, i) => (
                      <div key={i} className="relative group">
                        <img src={photo} alt={`Evidence ${i}`} className="h-12 w-12 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setBuyerPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmittingDispute || isCompressingBuyerPhotos}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-red-500/20 disabled:opacity-70 flex justify-center items-center"
              >
                {isSubmittingDispute ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Dispute & Evidence"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rate Seller Sub-Modal */}
      {showRatingModal && (
        <RateSellerModal
          transactionId={txn.id}
          sellerName={txn.shop_name ? `${txn.shop_name} (@${txn.seller_username})` : (txn.seller_username ? `@${txn.seller_username}` : 'Seller')}
          itemTitle={txn.title}
          onClose={() => { setShowRatingModal(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}

// ─── Main Checkout View ────────────────────────────────────────────────────
export default function PublicCheckoutView() {
  const { linkId } = useParams();
  const [link, setLink] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const txRef = searchParams.get('reference') || searchParams.get('trxref') || searchParams.get('tx_ref');
  const [txnDetail, setTxnDetail] = useState<TxnDetail | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (txRef) {
          const res = await axios.get(`/api/v1/checkout/transaction/${txRef}`);
          setTxnDetail(res.data);
        } else {
          const res = await axios.get(`/api/v1/links/${linkId}`);
          setLink(res.data);
        }
      } catch {
        setError(txRef ? 'Transaction not found.' : 'Payment link is invalid or inactive.');
      } finally {
        setLoading(false);
      }
    };
    if (linkId) fetchData();
  }, [linkId, txRef]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await axios.post('/api/v1/checkout/send-otp', { phone_number: phone });
      setShowOtpModal(true);
    } catch { alert('Failed to send OTP. Try again.'); }
    finally { setIsProcessing(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await axios.post('/api/v1/checkout/verify-and-initialize', {
        link_id: linkId, name, phone_number: phone, otp_code: otp, email, shipping_address: address
      });
      window.location.href = res.data.authorization_url;
    } catch {
      alert('Invalid OTP or verification failed.');
      setIsProcessing(false);
    }
  };

  // ── Render states ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 font-medium">{error}</div>
  );

  // Post-payment: show transaction status
  if (txnDetail && txRef) {
    return <TransactionStatusScreen txn={txnDetail} txRef={txRef} />;
  }

  if (!link) return null;

  const grossTotal = parseFloat(link.price_ghs) + parseFloat(link.shipping_fee_ghs);
  const platformFee = (grossTotal * 0.015) + 10;
  const totalToPay = link.fee_handling === 'PASS_TO_BUYER' ? grossTotal + platformFee : grossTotal;

  const productTitle = link ? `${link.title} — Buy with Escrow Protection on HendAxis Trust` : 'Secure Payment Link — HendAxis Trust';
  const productDesc = link ? `Buy ${link.title} for GHS ${link.price_ghs} safely with HendAxis Trust escrow protection.` : 'Secure escrow checkout powered by HendAxis Trust.';
  const productJsonLd = link ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': link.title,
    'description': link.description || link.title,
    'image': link.image_url || 'https://trust.hendaxis.com/assets/hero_banner.jpg',
    'offers': {
      '@type': 'Offer',
      'price': link.price_ghs,
      'priceCurrency': 'GHS',
      'availability': 'https://schema.org/InStock',
      'url': `https://pay.hendaxis.com/l/${link.id}`
    }
  } : undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <SEOHead
        title={productTitle}
        description={productDesc}
        canonicalUrl={link ? `https://pay.hendaxis.com/l/${link.id}` : undefined}
        ogImage={link?.image_url || 'https://trust.hendaxis.com/assets/hero_banner.jpg'}
        jsonLd={productJsonLd}
      />
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl pointer-events-none" />
          
          {(link.shop_name || link.seller_username) && (
            <div className="inline-flex items-center gap-2 text-sm text-blue-100 bg-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-sm mb-4 border border-white/10 flex-wrap">
              {link.seller_profile_picture_url ? (
                <img src={link.seller_profile_picture_url} alt={link.shop_name || link.seller_username} className="h-5 w-5 rounded-lg object-cover border border-white/20" />
              ) : (
                <Store className="h-4 w-4 text-blue-200" />
              )}
              <span>
                Sold by: <a href={`/store/${link.seller_username}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:underline">
                  {link.shop_name || `@${link.seller_username}`}
                </a> {link.shop_name && link.seller_username && <span className="text-blue-200 text-xs">(@{link.seller_username})</span>}
              </span>
              <a href={`/store/${link.seller_username}`} target="_blank" rel="noreferrer" className="text-xs text-blue-200 bg-white/10 px-2 py-0.5 rounded-md hover:bg-white/20 transition ml-1 font-medium">
                View Store Ratings ↗
              </a>
            </div>
          )}

          {/* Side-by-Side Details & Image Row */}
          {link.image_url ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* Left Column: Product Details */}
              <div className="sm:col-span-7 space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black leading-tight text-white">{link.title}</h1>
                {link.description && (
                  <p className="text-blue-100/90 text-sm leading-relaxed max-h-36 overflow-y-auto pr-1">
                    {link.description}
                  </p>
                )}
                <div className="text-3xl sm:text-4xl font-black pt-2">
                  <span className="text-blue-200 text-lg mr-1 font-bold">GHS</span>
                  {totalToPay.toFixed(2)}
                </div>
              </div>

              {/* Right Column: Product Image (Portrait friendly object-contain without cropping) */}
              <div className="sm:col-span-5 flex justify-center">
                <div className="w-full max-w-[260px] sm:max-w-none h-60 sm:h-64 rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-slate-950/60 p-2 flex items-center justify-center backdrop-blur-xs">
                  <img
                    src={link.image_url}
                    alt={link.title}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Fallback when no image exists */
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black leading-tight text-white">{link.title}</h1>
              {link.description && (
                <p className="text-blue-100/90 text-sm leading-relaxed">{link.description}</p>
              )}
              <div className="text-3xl sm:text-4xl font-black pt-2">
                <span className="text-blue-200 text-lg mr-1 font-bold">GHS</span>
                {totalToPay.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="p-6 bg-slate-100/90 dark:bg-slate-800/90 border-b border-gray-200 dark:border-slate-700 space-y-3 text-sm">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
            <span className="font-medium">Item Price</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-base">GHS {parseFloat(link.price_ghs).toFixed(2)}</span>
          </div>
          {parseFloat(link.shipping_fee_ghs) > 0 && (
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
              <span className="flex items-center font-medium"><Truck className="h-4 w-4 mr-1.5 text-blue-600 dark:text-blue-400" /> Shipping Fee</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-base">GHS {parseFloat(link.shipping_fee_ghs).toFixed(2)}</span>
            </div>
          )}
          {link.fee_handling === 'PASS_TO_BUYER' && (
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-200">
              <span className="flex items-center font-medium"><ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" /> Escrow Protection Fee</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-base">GHS {platformFee.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Checkout Form */}
        <div className="p-6">
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50"
                placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50"
                placeholder="e.g., 0241234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50"
                placeholder="receipt@example.com" />
            </div>
            {parseFloat(link.shipping_fee_ghs) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                <textarea required value={address} onChange={e => setAddress(e.target.value)}
                  rows={2} className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50"
                  placeholder="Street, City, Landmark" />
              </div>
            )}
            <button disabled={isProcessing} type="submit"
              className="mt-4 w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all">
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continue to Payment'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <p className="text-center text-xs text-gray-500 flex items-center justify-center mt-4">
              <ShieldCheck className="h-4 w-4 mr-1 text-gray-400" /> Secure Escrow Checkout
            </p>
          </form>
        </div>

        {/* Streamlined Redirect to Tracking Portal */}
        <div className="bg-gray-50 border-t border-gray-100 p-4 text-center text-xs">
          <p className="text-gray-500">
            Already placed an order?{' '}
            <a href="/track" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1">
              Track your package status here <ArrowRight className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Verify your phone</h3>
              <p className="text-sm text-gray-500 mt-2">We sent a 6-digit code to {phone}</p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input required type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)}
                className="w-full text-center tracking-widest text-2xl font-mono rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50"
                placeholder="000000" />
              <button disabled={isProcessing} type="submit"
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 transition-all">
                {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirm & Pay'}
              </button>
              <button type="button" onClick={() => setShowOtpModal(false)}
                className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
