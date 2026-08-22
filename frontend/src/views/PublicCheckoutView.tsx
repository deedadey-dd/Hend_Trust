import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck, Truck, ArrowRight, Loader2,
  Package, CheckCircle, Clock, AlertTriangle, X, KeyRound, Store
} from 'lucide-react';
import RateSellerModal from '../components/RateSellerModal';

interface LinkData {
  id: string;
  title: string;
  description: string;
  price_ghs: string;
  shipping_fee_ghs: string;
  fee_handling: string;
  seller_username?: string;
  shop_name?: string;
  seller_email?: string;
  seller_phone?: string;
}

interface TxnDetail {
  id: string;
  status: string;
  total_amount_ghs: number;
  buyer_email: string;
  shipping_address: string;
  title: string;
  created_at: string;
  paystack_reference: string;
  inspection_starts_at?: string;
  seller_username?: string;
  shop_name?: string;
}

const STATUS_CONFIG: Record<string, { icon: typeof ShieldCheck; color: string; bg: string; label: string }> = {
  AWAITING_PAYMENT:    { icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Awaiting Payment' },
  PAYMENT_RECEIVED:    { icon: CheckCircle,   color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Awaiting Shipping' },
  DELIVERY_IN_PROGRESS:{ icon: Truck,         color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Delivery In Progress' },
  INSPECTION_PERIOD:   { icon: Package,       color: 'text-purple-600', bg: 'bg-purple-50', label: 'Inspection Period' },
  COMPLETED:           { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  label: 'Completed' },
  DISPUTED:            { icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50',    label: 'Disputed' },
  CANCELLED:           { icon: AlertTriangle, color: 'text-gray-600',   bg: 'bg-gray-50',   label: 'Cancelled' },
  REFUNDED:            { icon: CheckCircle,   color: 'text-teal-600',   bg: 'bg-teal-50',   label: 'Refunded' },
};

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

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};

  const handleBuyerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (buyerPhotos.length + files.length > 5) {
      alert("You can upload a maximum of 5 evidence photos.");
      return;
    }
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        setBuyerPhotos(prev => [...prev, compressed].slice(0, 5));
      } catch {
        console.error("Failed to compress evidence photo.");
      }
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
    <div className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className={`p-8 text-center ${cfg.bg}`}>
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white/60 mb-4 ${cfg.color}`}>
              <Icon className="h-8 w-8" />
            </div>
            <h1 className={`text-2xl font-bold mb-1 ${cfg.color}`}>{cfg.label}</h1>
            <p className="text-gray-500 text-sm">{txn.title}</p>
          </div>

          <div className="p-6 space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Amount Paid</span>
              <span className="font-semibold text-gray-900">GHS {txn.total_amount_ghs.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-800">{txn.buyer_email}</span>
            </div>
            {txn.shipping_address && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Delivery To</span>
                <span className="font-medium text-gray-800 text-right max-w-[60%]">{txn.shipping_address}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Reference</span>
              <span className="font-mono text-xs text-gray-600">{txRef}</span>
            </div>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Escrow Progress</h3>
          {['PAYMENT_RECEIVED', 'DELIVERY_IN_PROGRESS', 'INSPECTION_PERIOD', 'COMPLETED'].map(step => {
            const s = STATUS_CONFIG[step];
            const StepIcon = s.icon;
            const statuses = ['AWAITING_PAYMENT', 'PAYMENT_RECEIVED', 'DELIVERY_IN_PROGRESS', 'INSPECTION_PERIOD', 'COMPLETED'];
            const currentIdx = statuses.indexOf(txn.status);
            const stepIdx = statuses.indexOf(step);
            const done = currentIdx >= stepIdx;
            return (
              <div key={step} className="flex items-center gap-3 mb-3">
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${done ? s.bg : 'bg-gray-100'}`}>
                  <StepIcon className={`h-4 w-4 ${done ? s.color : 'text-gray-300'}`} />
                </div>
                <span className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{s.label}</span>
                {txn.status === step && (
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>Current</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Buyer Actions */}
        {(canConfirm || canDispute || isInspection) && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">
              {isInspection ? "Inspection Mode" : "Item received?"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
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
                  className="flex-1 py-2.5 px-4 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 transition"
                >
                  ⚠ Raise Dispute
                </button>
              )}
            </div>
          </div>
        )}

        {/* Delivery Process Info — shown while item is in transit or inspection */}
        {(txn.status === 'DELIVERY_IN_PROGRESS' || txn.status === 'INSPECTION_PERIOD') && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            <p className="font-bold mb-2">📦 How delivery & receipt works</p>

            <p className="font-semibold text-amber-800 mb-1">Path A — Formal Courier:</p>
            <p className="text-amber-700 mb-3">
              If your seller used a courier service, the system is automatically notified the moment the package is marked <strong>DELIVERED</strong>. No action needed on your part until you inspect it.
            </p>

            <p className="font-semibold text-amber-800 mb-1">Path B — Informal / Bus Delivery:</p>
            <ul className="list-disc list-inside text-amber-700 space-y-1 mb-3">
              <li>You should have received an SMS with the <strong>driver's info</strong> (phone / car number) and your <strong>Secret OTP</strong>.</li>
              <li>When collecting at the station, present your <strong>ID + Secret OTP</strong> to the driver or seller's agent.</li>
              <li>Keep your OTP safe — you will need it again to <strong>Confirm Receipt</strong> in this app after collection.</li>
            </ul>

            <p className="text-xs text-amber-600 italic">
              Once you confirm receipt, a {txn.total_amount_ghs >= 10000 ? '72' : txn.total_amount_ghs >= 2000 ? '48' : '24'}-hour inspection window opens. Raise a dispute before it expires if there is a problem.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Evidence Photos (Max 5)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBuyerPhotoUpload}
                  disabled={buyerPhotos.length >= 5}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                />
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
                disabled={isSubmittingDispute}
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl" />
          
          {(link.shop_name || link.seller_username) && (
            <div className="inline-flex items-center gap-2 text-xs text-blue-100 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm mb-3 border border-white/10">
              <Store className="h-3.5 w-3.5 text-blue-200" />
              <span>
                Sold by: <a href={`/store/${link.seller_username}`} target="_blank" rel="noreferrer" className="text-white font-bold hover:underline">
                  {link.shop_name || `@${link.seller_username}`}
                </a> {link.shop_name && link.seller_username && <span className="text-blue-200 text-[11px]">(@{link.seller_username})</span>}
              </span>
              <a href={`/store/${link.seller_username}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-200 bg-white/10 px-1.5 py-0.5 rounded hover:bg-white/20 transition ml-1">
                View Store Ratings ↗
              </a>
            </div>
          )}

          <h1 className="text-2xl font-bold mb-1">{link.title}</h1>
          {link.description && <p className="text-blue-100 text-sm mb-4 opacity-90">{link.description}</p>}
          <div className="text-4xl font-black mt-4">
            <span className="text-blue-200 text-xl mr-1">GHS</span>
            {totalToPay.toFixed(2)}
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-6 bg-gray-50/50 border-b border-gray-100 space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Item Price</span>
            <span className="font-medium">GHS {parseFloat(link.price_ghs).toFixed(2)}</span>
          </div>
          {parseFloat(link.shipping_fee_ghs) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center"><Truck className="h-4 w-4 mr-1" /> Shipping</span>
              <span className="font-medium">GHS {parseFloat(link.shipping_fee_ghs).toFixed(2)}</span>
            </div>
          )}
          {link.fee_handling === 'PASS_TO_BUYER' && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center"><ShieldCheck className="h-4 w-4 mr-1 text-green-500" /> Escrow Protection</span>
              <span className="font-medium">GHS {platformFee.toFixed(2)}</span>
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
