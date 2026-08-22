import React, { useState } from 'react';
import { Package, Phone, Mail, KeyRound, Loader2, FileText, Search, X } from 'lucide-react';
import axios from 'axios';
import { apiClient, getErrorMessage } from '../api/client';
import { STATUS_CONFIG } from '../views/DashboardView';
import RateSellerModal from './RateSellerModal';

type TabMode = 'SINGLE' | 'HISTORY';
type HistoryStep = 'INPUT' | 'OTP';

interface TrackingModalProps {
  onClose: () => void;
}

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

export default function TrackingModal({ onClose }: TrackingModalProps) {
  const [tab, setTab] = useState<TabMode>('SINGLE');
  
  // Single Tracking State
  const [txnId, setTxnId] = useState('');
  const [phone, setPhone] = useState('');

  // Rate Seller State
  const [rateTxn, setRateTxn] = useState<any>(null);

  // History State
  const [identifier, setIdentifier] = useState(''); // phone or email
  const [isEmailInput, setIsEmailInput] = useState(false);
  const [historyStep, setHistoryStep] = useState<HistoryStep>('INPUT');
  const [otp, setOtp] = useState('');

  // Results State
  const [loading, setLoading] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [error, setError] = useState('');
  const [txns, setTxns] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Confirm Receipt State
  const [confirmTxnId, setConfirmTxnId] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Dispute Modal State
  const [disputeTxnId, setDisputeTxnId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [buyerPhotos, setBuyerPhotos] = useState<string[]>([]);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeError, setDisputeError] = useState('');

  // Single Order Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!txnId.trim() || !phone.trim()) {
      setError('Please enter both Transaction ID and Phone Number.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/checkout/track/id', { 
        paystack_reference: txnId.trim(), 
        phone_number: phone.trim() 
      });
      setTxns(res.data);
      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Order not found. Please verify details.');
    } finally {
      setLoading(false);
    }
  };

  // Request History OTP (Auto-detect Email vs Phone)
  const handleSendHistoryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const val = identifier.trim();
    if (!val) {
      setError('Please enter your Phone Number or Email address.');
      return;
    }

    const isEmail = val.includes('@');
    setIsEmailInput(isEmail);
    setLoadingOtp(true);

    try {
      if (isEmail) {
        await apiClient.post('/checkout/send-email-otp', { email: val });
      } else {
        await apiClient.post('/checkout/lookup/request-otp', { phone_number: val });
      }
      setHistoryStep('OTP');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP code.');
    } finally {
      setLoadingOtp(false);
    }
  };

  // Verify History OTP
  const handleVerifyHistoryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (isEmailInput) {
        res = await apiClient.post('/checkout/track', { email: identifier.trim(), otp_code: otp.trim() });
      } else {
        res = await apiClient.post('/checkout/track/phone', { phone_number: identifier.trim(), otp_code: otp.trim() });
      }
      setTxns(res.data);
      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmModal = async (id: string) => {
    setIsSendingCode(true);
    setConfirmTxnId(id);
    setConfirmError('');
    setConfirmCode('');
    try {
      await axios.post(`/api/v1/escrow/${id}/send-confirmation-code`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send confirmation code.');
      setConfirmTxnId(null);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmTxnId) return;
    if (!confirmCode.trim()) {
      setConfirmError('Please enter the 6-digit code.');
      return;
    }
    setIsConfirming(true);
    setConfirmError('');
    try {
      await axios.post(`/api/v1/escrow/${confirmTxnId}/confirm-receipt`, { confirmation_code: confirmCode.trim() });
      const targetTxn = txns.find(t => t.id === confirmTxnId);
      setConfirmTxnId(null);
      if (targetTxn) {
        setRateTxn(targetTxn);
      } else {
        alert('Receipt confirmed! Funds released to seller.');
        window.location.reload();
      }
    } catch (err: any) { 
      setConfirmError(err.response?.data?.message || 'Failed to confirm receipt. Please try again.'); 
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
    if (!disputeTxnId) return;
    if (!disputeReason.trim()) {
      setDisputeError('Please describe the reason for your dispute.');
      return;
    }
    setDisputeError('');
    setIsSubmittingDispute(true);
    try {
      await axios.post(`/api/v1/escrow/${disputeTxnId}/raise-dispute`, {
        reason: disputeReason.trim(),
        photos: buyerPhotos
      });
      alert('Dispute and evidence submitted successfully. Management team will arbitrate.');
      setDisputeTxnId(null);
      window.location.reload();
    } catch (err: any) {
      setDisputeError(getErrorMessage(err));
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const resetSearch = () => {
    setTxns([]);
    setShowResults(false);
    setHistoryStep('INPUT');
    setOtp('');
    setError('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Track Package Status</h3>
              <p className="text-xs text-gray-500">Live escrow tracking & order management</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!showResults ? (
            <div className="max-w-md mx-auto space-y-6">
              
              {/* 2 Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-gray-100 rounded-xl text-xs font-bold text-center">
                <button
                  onClick={() => { setTab('SINGLE'); setError(''); }}
                  className={`py-2.5 px-3 rounded-lg transition-all ${tab === 'SINGLE' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  🔍 Track by Order ID
                </button>
                <button
                  onClick={() => { setTab('HISTORY'); setHistoryStep('INPUT'); setError(''); }}
                  className={`py-2.5 px-3 rounded-lg transition-all ${tab === 'HISTORY' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  📜 Full Order History
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100 text-center">
                  {error}
                </div>
              )}

              {/* TAB 1: SINGLE ORDER */}
              {tab === 'SINGLE' && (
                <form onSubmit={handleSingleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Transaction ID / Reference *</label>
                    <div className="relative">
                      <FileText className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={txnId}
                        onChange={e => setTxnId(e.target.value)}
                        placeholder="e.g. XY98Z123"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="e.g. 0244123456"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Track Order Status"}
                  </button>
                </form>
              )}

              {/* TAB 2: FULL HISTORY */}
              {tab === 'HISTORY' && historyStep === 'INPUT' && (
                <form onSubmit={handleSendHistoryOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number or Email Address *</label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="Enter phone (0244...) or email"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">We'll send a 6-digit OTP code via SMS or Email to verify your identity.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingOtp}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center"
                  >
                    {loadingOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Verification OTP Code"}
                  </button>
                </form>
              )}

              {tab === 'HISTORY' && historyStep === 'OTP' && (
                <form onSubmit={handleVerifyHistoryOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Enter 6-Digit OTP Code *</label>
                    <div className="relative">
                      <KeyRound className="h-4 w-4 absolute left-3 top-3.5 text-gray-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="000000"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-center font-mono text-xl tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">Code sent to: {identifier}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "View Full Order History"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryStep('INPUT')}
                    className="w-full text-xs text-gray-500 hover:text-gray-700 text-center block pt-1"
                  >
                    ← Change Phone/Email
                  </button>
                </form>
              )}

            </div>
          ) : (
            /* RESULTS SCREEN */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-gray-900">Found {txns.length} Order(s)</h4>
                </div>
                <button
                  onClick={resetSearch}
                  className="text-xs font-bold text-blue-600 hover:underline self-start sm:self-auto"
                >
                  ← Track Another Order
                </button>
              </div>

              {/* Search & Pagination Bar */}
              {txns.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center gap-3 justify-between">
                  <div className="relative w-full sm:w-72">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      placeholder="Search title, ref, seller..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {Math.ceil(txns.filter(t => 
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    t.paystack_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.shop_name && t.shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (t.seller_username && t.seller_username.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).length / itemsPerPage) > 1 && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Page {currentPage} of {Math.ceil(txns.filter(t => 
                        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        t.paystack_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (t.shop_name && t.shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (t.seller_username && t.seller_username.toLowerCase().includes(searchQuery.toLowerCase()))
                      ).length / itemsPerPage)}</span>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="px-2 py-0.5 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        disabled={currentPage >= Math.ceil(txns.filter(t => 
                          t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.paystack_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.shop_name && t.shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (t.seller_username && t.seller_username.toLowerCase().includes(searchQuery.toLowerCase()))
                        ).length / itemsPerPage)}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="px-2 py-0.5 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Transactions List */}
              <div className="space-y-3">
                {txns
                  .filter(t => 
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    t.paystack_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.shop_name && t.shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (t.seller_username && t.seller_username.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map(txn => {
                    const cfg = STATUS_CONFIG[txn.status] || STATUS_CONFIG['AWAITING_PAYMENT'];
                    const Icon = cfg.icon;
                    const sellerDisplayName = txn.shop_name ? `${txn.shop_name} (@${txn.seller_username})` : (txn.seller_username ? `@${txn.seller_username}` : 'Seller');
                    return (
                      <div key={txn.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                {txn.paystack_reference}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                                <Icon className="mr-1 h-3 w-3" />
                                {cfg.label}
                              </span>
                              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                                Sold by: {sellerDisplayName}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">{txn.title}</h4>
                          </div>

                          <div className="sm:text-right">
                            <span className="text-xs text-gray-400 block">Total Amount</span>
                            <span className="text-base font-black text-gray-900">GHS {Number(txn.total_amount_ghs).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-xs text-gray-400">Date: {new Date(txn.created_at).toLocaleDateString()}</span>
                          <div className="flex gap-2 flex-wrap">
                            {txn.status !== 'AWAITING_PAYMENT' && txn.status !== 'CANCELLED' && txn.status !== 'DISPUTED' && (
                              <button
                                onClick={() => setRateTxn(txn)}
                                className="py-1.5 px-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition"
                              >
                                ⭐ Rate Seller
                              </button>
                            )}
                            {txn.status === 'DELIVERY_IN_PROGRESS' && (
                              <button
                                onClick={() => handleOpenConfirmModal(txn.id)}
                                className="py-1.5 px-3 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition"
                              >
                                Confirm Receipt
                              </button>
                            )}
                            {(txn.status === 'INSPECTION_PERIOD' || txn.status === 'DELIVERY_IN_PROGRESS') && (
                              <button
                                onClick={() => { setDisputeTxnId(txn.id); setDisputeReason(''); setBuyerPhotos([]); }}
                                className="py-1.5 px-3 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition"
                              >
                                Raise Dispute
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Confirm Receipt Sub-Modal */}
      {confirmTxnId && !isSendingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative space-y-4">
            <button onClick={() => setConfirmTxnId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-base font-bold text-gray-900 text-center">Enter Delivery Confirmation Code</h4>
            {confirmError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded text-center">{confirmError}</p>}
            <form onSubmit={handleConfirmReceipt} className="space-y-3">
              <input
                type="text"
                required
                maxLength={6}
                value={confirmCode}
                onChange={e => setConfirmCode(e.target.value)}
                placeholder="000000"
                className="w-full text-center font-mono text-xl tracking-widest border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-green-500 outline-none"
              />
              <button
                type="submit"
                disabled={isConfirming}
                className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 transition"
              >
                {isConfirming ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Confirm Receipt"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Raise Dispute Sub-Modal */}
      {disputeTxnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button onClick={() => setDisputeTxnId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-base font-bold text-gray-900">Raise Transaction Dispute</h4>
            {disputeError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{disputeError}</p>}
            <form onSubmit={handleRaiseDisputeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Dispute *</label>
                <textarea
                  required
                  rows={3}
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Describe the issue with your item..."
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-red-500 outline-none"
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
                  className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-2 cursor-pointer disabled:opacity-50"
                />
                {buyerPhotos.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {buyerPhotos.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt={`Evidence ${idx + 1}`} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => setBuyerPhotos(prev => prev.filter((_, i) => i !== idx))}
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
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition shadow flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isSubmittingDispute ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Dispute & Evidence...</span>
                  </>
                ) : (
                  "Submit Dispute Claim"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rate Seller Sub-Modal */}
      {rateTxn && (
        <RateSellerModal
          transactionId={rateTxn.id}
          sellerName={rateTxn.seller_username || 'Seller'}
          itemTitle={rateTxn.title}
          onClose={() => setRateTxn(null)}
        />
      )}

    </div>
  );
}
