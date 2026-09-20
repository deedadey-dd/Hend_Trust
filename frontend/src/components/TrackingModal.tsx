import React, { useState, useEffect } from 'react';
import { Package, Phone, Mail, KeyRound, Loader2, FileText, Search, X, AlertTriangle, ZoomIn, ExternalLink } from 'lucide-react';
import axios from 'axios';
import { apiClient, getErrorMessage } from '../api/client';
import { STATUS_CONFIG } from '../constants/statusConfig';
import RateSellerModal from './RateSellerModal';
import ImageLightboxModal from './ImageLightboxModal';
import DisputeChatTimeline from './DisputeChatTimeline';
import { compressImageToWebP } from '../utils/imageUtils';
import { useEscapeKey } from '../utils/useEscapeKey';

type TabMode = 'SINGLE' | 'HISTORY';
type SingleStep = 'INPUT' | 'OTP';
type HistoryStep = 'INPUT' | 'OTP';

interface TrackingModalProps {
  onClose: () => void;
}

export default function TrackingModal({ onClose }: TrackingModalProps) {
  useEscapeKey(onClose);
  const [tab, setTab] = useState<TabMode>('SINGLE');
  
  // Single Tracking State
  const [txnId, setTxnId] = useState('');
  const [phone, setPhone] = useState('');
  const [singleStep, setSingleStep] = useState<SingleStep>('INPUT');
  const [singleOtp, setSingleOtp] = useState('');
  const [loadingSingleOtp, setLoadingSingleOtp] = useState(false);
  const [singleOtpCooldown, setSingleOtpCooldown] = useState(0);

  // Rate Seller State
  const [rateTxn, setRateTxn] = useState<any>(null);

  // History State
  const [identifier, setIdentifier] = useState(''); // phone or email
  const [isEmailInput, setIsEmailInput] = useState(false);
  const [historyStep, setHistoryStep] = useState<HistoryStep>('INPUT');
  const [otp, setOtp] = useState('');
  const [historyOtpCooldown, setHistoryOtpCooldown] = useState(0);

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
  const [resendCooldown, setResendCooldown] = useState(0);

  // Dispute Modal State
  const [disputeTxnId, setDisputeTxnId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [buyerPhotos, setBuyerPhotos] = useState<string[]>([]);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [isCompressingBuyerPhotos, setIsCompressingBuyerPhotos] = useState(false);
  const [disputeError, setDisputeError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Cooldown timer effects
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (singleOtpCooldown <= 0) return;
    const timer = setInterval(() => {
      setSingleOtpCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [singleOtpCooldown]);

  useEffect(() => {
    if (historyOtpCooldown <= 0) return;
    const timer = setInterval(() => {
      setHistoryOtpCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [historyOtpCooldown]);

  // Step 1 Single Order Submit: Request OTP
  const handleSingleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!txnId.trim() || !phone.trim()) {
      setError('Please enter both Transaction ID and Phone Number.');
      return;
    }
    setLoadingSingleOtp(true);
    try {
      await apiClient.post('/checkout/track/id/request-otp', { 
        paystack_reference: txnId.trim().toUpperCase(), 
        phone_number: phone.trim() 
      });
      setSingleStep('OTP');
      setSingleOtpCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Order not found. Please verify your Transaction ID and Phone Number.');
    } finally {
      setLoadingSingleOtp(false);
    }
  };

  // Step 2 Single Order Verify OTP
  const handleSingleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!singleOtp.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/checkout/track/id', { 
        paystack_reference: txnId.trim().toUpperCase(), 
        phone_number: phone.trim(),
        otp_code: singleOtp.trim()
      });
      const dataArr = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      setTxns(dataArr);
      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Request History OTP (Auto-detect Email vs Phone)
  const handleSendHistoryOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      setHistoryOtpCooldown(60);
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
      const dataArr = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      setTxns(dataArr);
      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFullDetails = (txn: any) => {
    const targetUrl = `/l/${txn.link_id || txn.id || 'order'}?reference=${txn.paystack_reference}`;
    window.location.href = targetUrl;
  };

  const handleOpenConfirmModal = async (id: string) => {
    setConfirmTxnId(id);
    setConfirmError('');
    setConfirmCode('');

    if (resendCooldown > 0) {
      return;
    }
    setIsSendingCode(true);
    try {
      await axios.post(`/api/v1/escrow/${id}/send-confirmation-code`);
      setResendCooldown(60);
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
    setSingleStep('INPUT');
    setSingleOtp('');
    setHistoryStep('INPUT');
    setOtp('');
    setError('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden relative my-auto">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Track Package Status</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Live escrow tracking & order management</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {!showResults ? (
            <div className="max-w-md mx-auto space-y-6">
              
              {/* 2 Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-gray-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-center">
                <button
                  onClick={() => { setTab('SINGLE'); setError(''); }}
                  className={`py-2.5 px-3 rounded-lg transition-all cursor-pointer ${tab === 'SINGLE' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                >
                  🔍 Track by Order ID
                </button>
                <button
                  onClick={() => { setTab('HISTORY'); setHistoryStep('INPUT'); setError(''); }}
                  className={`py-2.5 px-3 rounded-lg transition-all cursor-pointer ${tab === 'HISTORY' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                >
                  📜 Full Order History
                </button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-medium border border-red-100 dark:border-red-900/50 text-center">
                  {error}
                </div>
              )}

              {/* TAB 1: SINGLE ORDER - STEP 1: INPUT */}
              {tab === 'SINGLE' && singleStep === 'INPUT' && (
                <form onSubmit={handleSingleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Transaction ID / Reference *</label>
                    <div className="relative">
                      <FileText className="h-4 w-4 absolute left-3 top-3 text-gray-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        value={txnId}
                        onChange={e => setTxnId(e.target.value)}
                        placeholder="e.g. XY98Z123"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Buyer Phone Number *</label>
                    <div className="relative">
                      <Phone className="h-4 w-4 absolute left-3 top-3 text-gray-400 dark:text-slate-500" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="e.g. 0244123456"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">We'll send a 6-digit OTP code to verify and unlock your order details and actions.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingSingleOtp}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center cursor-pointer"
                  >
                    {loadingSingleOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Verification OTP Code"}
                  </button>
                </form>
              )}

              {/* TAB 1: SINGLE ORDER - STEP 2: OTP */}
              {tab === 'SINGLE' && singleStep === 'OTP' && (
                <form onSubmit={handleSingleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Enter 6-Digit OTP Code *</label>
                    <div className="relative">
                      <KeyRound className="h-4 w-4 absolute left-3 top-3.5 text-gray-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={singleOtp}
                        onChange={e => setSingleOtp(e.target.value)}
                        placeholder="000000"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl text-center font-mono text-xl tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                      <span>Code sent to: {phone}</span>
                      <span>Valid for 2 hours</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || singleOtp.length < 6}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Track Order"}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setSingleStep('INPUT')}
                      className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      ← Change Reference/Phone
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (singleOtpCooldown === 0) handleSingleSendOtp();
                      }}
                      disabled={loadingSingleOtp || singleOtpCooldown > 0}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loadingSingleOtp 
                        ? 'Sending...' 
                        : singleOtpCooldown > 0 
                          ? `Resend OTP (${singleOtpCooldown}s)` 
                          : "Resend OTP"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: FULL HISTORY */}
              {tab === 'HISTORY' && historyStep === 'INPUT' && (
                <form onSubmit={handleSendHistoryOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Phone Number or Email Address *</label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-3 text-gray-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="Enter phone (0244...) or email"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">We'll send a 6-digit OTP code via SMS or Email to verify your identity.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loadingOtp}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center cursor-pointer"
                  >
                    {loadingOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Verification OTP Code"}
                  </button>
                </form>
              )}

              {tab === 'HISTORY' && historyStep === 'OTP' && (
                <form onSubmit={handleVerifyHistoryOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Enter 6-Digit OTP Code *</label>
                    <div className="relative">
                      <KeyRound className="h-4 w-4 absolute left-3 top-3.5 text-gray-400 dark:text-slate-500" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="000000"
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl text-center font-mono text-xl tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                      <span>Code sent to: {identifier}</span>
                      <span>Valid for 2 hours</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "View Full Order History"}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setHistoryStep('INPUT')}
                      className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 cursor-pointer"
                    >
                      ← Change Phone/Email
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (historyOtpCooldown === 0) handleSendHistoryOtp();
                      }}
                      disabled={loadingOtp || historyOtpCooldown > 0}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {loadingOtp 
                        ? 'Sending...' 
                        : historyOtpCooldown > 0 
                          ? `Resend OTP (${historyOtpCooldown}s)` 
                          : "Resend OTP"}
                    </button>
                  </div>
                </form>
              )}

            </div>
          ) : (
            /* RESULTS SCREEN */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">Found {txns.length} Order(s)</h4>
                </div>
                <button
                  onClick={resetSearch}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline self-start sm:self-auto"
                >
                  ← Track Another Order
                </button>
              </div>

              {/* Search & Pagination Bar */}
              {txns.length > 0 && (
                <div className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-3 justify-between">
                  <div className="relative w-full sm:w-72">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      placeholder="Search title, ref, seller..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {Math.ceil(txns.filter(t => 
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    t.paystack_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.shop_name && t.shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (t.seller_username && t.seller_username.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).length / itemsPerPage) > 1 && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                      <span>Page {currentPage} of {Math.ceil(txns.filter(t => 
                        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        t.paystack_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (t.shop_name && t.shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                        (t.seller_username && t.seller_username.toLowerCase().includes(searchQuery.toLowerCase()))
                      ).length / itemsPerPage)}</span>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 text-gray-900 dark:text-slate-100"
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
                        className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 text-gray-900 dark:text-slate-100"
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
                    (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (t.paystack_reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.shop_name && t.shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (t.seller_username && t.seller_username.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map(txn => {
                    const statusKey = txn.status || 'AWAITING_PAYMENT';
                    const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG['AWAITING_PAYMENT'];
                    const Icon = cfg.icon;
                    const sellerDisplayName = txn.shop_name ? `${txn.shop_name} (@${txn.seller_username})` : (txn.seller_username ? `@${txn.seller_username}` : 'Seller');
                    return (
                      <div key={txn.id} className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {txn.paystack_reference}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                                <Icon className="mr-1 h-3 w-3" />
                                {cfg.label}
                              </span>
                              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 px-2 py-0.5 rounded-full">
                                Sold by: {sellerDisplayName}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-slate-100">{txn.title}</h4>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
                            <div className="text-left sm:text-right">
                              <span className="text-xs text-gray-400 dark:text-slate-500 block">Total Amount</span>
                              <span className="text-base font-black text-gray-900 dark:text-slate-100">GHS {Number(txn.total_amount_ghs).toFixed(2)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenFullDetails(txn)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                              <span>View Full Details & Actions</span>
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {txn.waybill_photo_url && (
                          <div className="mt-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-2.5 flex items-center gap-3">
                            <div 
                              className="relative group cursor-pointer flex-shrink-0"
                              onClick={() => setLightboxImage(txn.waybill_photo_url)}
                              title="Click to enlarge dispatch proof"
                            >
                              <img
                                src={txn.waybill_photo_url}
                                alt="Dispatch proof"
                                className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-700 transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-gray-800 dark:text-slate-200 block">Dispatch / Package Proof</span>
                              <span className="text-[11px] text-gray-500 dark:text-slate-400 block">Uploaded by seller at dispatch</span>
                              <button
                                type="button"
                                onClick={() => setLightboxImage(txn.waybill_photo_url)}
                                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline mt-0.5 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <ZoomIn className="w-3 h-3" /> Enlarge Photo
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Refund & Dispute Settlement Audit Card */}
                        {(txn.status === 'REFUNDED' || txn.status === 'CANCELLED' || txn.status === 'DISPUTED' || txn.buyer_dispute_reason || txn.dispute_retracted_at) && (
                          <div className="bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 space-y-3 text-xs">
                            <div className="flex justify-between items-center border-b border-red-200/80 dark:border-red-900/50 pb-2">
                              <span className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4" />
                                {txn.status === 'REFUNDED' ? 'Refund Processed' : txn.status === 'CANCELLED' ? 'Order Cancelled & Refunded' : txn.dispute_retracted_at ? 'Dispute Retracted & Settle Privately' : 'Dispute Under Review'}
                              </span>
                              {(txn.status === 'REFUNDED' || txn.status === 'CANCELLED') && (
                                <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded text-xs">
                                  Refund: GHS {Number(txn.buyer_refund_amount_ghs || txn.total_amount_ghs).toFixed(2)}
                                </span>
                              )}
                            </div>

                            <p className="text-red-900 dark:text-red-200 font-medium text-[11px]">
                              ⏱ Refund Policy: Payouts are returned directly to your original payment method (Paystack MoMo/Card) within 24 hours.
                            </p>

                            <DisputeChatTimeline
                              buyerReason={txn.buyer_dispute_reason}
                              buyerPhotos={txn.buyer_dispute_photos}
                              buyerName="You (Buyer)"
                              sellerResponse={txn.seller_dispute_response}
                              sellerPhotos={txn.seller_dispute_photos}
                              sellerName={sellerDisplayName}
                              managerNotes={txn.manager_dispute_notes}
                              managerPhotos={txn.manager_dispute_photos}
                              disputeRetractedAt={txn.dispute_retracted_at}
                            />
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800/80 flex-wrap">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 dark:text-slate-500">Date: {new Date(txn.created_at).toLocaleDateString()}</span>
                            <button
                              type="button"
                              onClick={() => handleOpenFullDetails(txn)}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>View Full Details & Actions</span>
                              &rarr;
                            </button>
                          </div>
                          <div className="flex gap-2 flex-wrap items-center">
                            {(txn.status === 'INSPECTION_PERIOD' || txn.status === 'COMPLETED') && !txn.buyer_dispute_reason && !txn.dispute_retracted_at ? (
                              txn.has_reviewed ? (
                                <button
                                  onClick={() => setRateTxn(txn)}
                                  className="py-1.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer flex items-center gap-1"
                                >
                                  ✏️ Edit Review ({txn.review_overall}★)
                                </button>
                              ) : (
                                <button
                                  onClick={() => setRateTxn(txn)}
                                  className="py-1.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer"
                                >
                                  ⭐ Rate Seller
                                </button>
                              )
                            ) : (txn.status === 'PAYMENT_RECEIVED' || txn.status === 'DELIVERY_IN_PROGRESS') ? (
                              <button
                                disabled
                                title="Unlocks after delivery"
                                className="py-1.5 px-3 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 text-xs font-medium cursor-not-allowed opacity-80"
                              >
                                🔒 Rate Seller
                              </button>
                            ) : null}
                            {txn.status === 'DELIVERY_IN_PROGRESS' && (
                              <button
                                onClick={() => handleOpenConfirmModal(txn.id)}
                                className="py-1.5 px-3 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition shadow-sm cursor-pointer"
                              >
                                Confirm Receipt
                              </button>
                            )}
                            {(txn.status === 'INSPECTION_PERIOD' || txn.status === 'DELIVERY_IN_PROGRESS') && (
                              <button
                                onClick={() => { setDisputeTxnId(txn.id); setDisputeReason(''); setBuyerPhotos([]); }}
                                className="py-1.5 px-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition cursor-pointer"
                              >
                                Raise Dispute
                              </button>
                            )}
                            {txn.status === 'DISPUTED' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setDisputeTxnId(txn.id); setDisputeReason(''); setBuyerPhotos([]); }}
                                  className="py-1.5 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition cursor-pointer"
                                >
                                  + Add Dispute Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenFullDetails(txn)}
                                  className="py-1.5 px-3 rounded-lg bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
                                >
                                  Manage / Retract
                                </button>
                              </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl relative space-y-4 text-gray-900 dark:text-slate-100 max-h-[90vh] my-auto overflow-y-auto">
            <button onClick={() => setConfirmTxnId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
            <h4 className="text-base font-bold text-gray-900 dark:text-slate-100 text-center pr-6">Enter Delivery Confirmation Code</h4>
            {confirmError && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded text-center">{confirmError}</p>}
            <form onSubmit={handleConfirmReceipt} className="space-y-3">
              <input
                type="text"
                required
                maxLength={6}
                value={confirmCode}
                onChange={e => setConfirmCode(e.target.value)}
                placeholder="000000"
                className="w-full text-center font-mono text-xl tracking-widest border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl p-2.5 focus:ring-2 focus:ring-green-500 outline-none"
              />
              <button
                type="submit"
                disabled={isConfirming}
                className="w-full py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 transition"
              >
                {isConfirming ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Confirm Receipt"}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  if (confirmTxnId && resendCooldown === 0) handleOpenConfirmModal(confirmTxnId);
                }}
                disabled={isSendingCode || resendCooldown > 0}
                className="w-full text-xs font-medium text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors mt-2 text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingCode 
                  ? 'Sending...' 
                  : resendCooldown > 0 
                    ? `Resend Code (${resendCooldown}s)` 
                    : "Didn't receive it? Resend Code"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Raise Dispute Sub-Modal */}
      {disputeTxnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden relative text-gray-900 dark:text-slate-100 my-auto">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">Raise Transaction Dispute</h4>
              <button onClick={() => setDisputeTxnId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {disputeError && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded">{disputeError}</p>}
              <form onSubmit={handleRaiseDisputeSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Reason for Dispute *</label>
                  <textarea
                    required
                    rows={3}
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    placeholder="Describe the issue with your item..."
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300">Evidence Photos (Max 5)</label>
                    <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400">
                      {isCompressingBuyerPhotos ? 'Compressing WebP...' : `${buyerPhotos.length}/5 photos`}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleBuyerPhotoUpload}
                    disabled={buyerPhotos.length >= 5 || isCompressingBuyerPhotos}
                    className="w-full text-xs text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2 cursor-pointer disabled:opacity-50"
                  />
                  {isCompressingBuyerPhotos && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing photos to WebP...
                    </div>
                  )}
                  {buyerPhotos.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {buyerPhotos.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img} alt={`Evidence ${idx + 1}`} className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-slate-700" />
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
                  disabled={isSubmittingDispute || isCompressingBuyerPhotos}
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
        </div>
      )}

      {/* Rate Seller Sub-Modal */}
      {rateTxn && (
        <RateSellerModal
          transactionId={rateTxn.id}
          paystackReference={rateTxn.paystack_reference}
          reviewToken={rateTxn.buyer_review_token}
          sellerName={rateTxn.seller_username || 'Seller'}
          itemTitle={rateTxn.title}
          initialOverall={rateTxn.review_overall}
          initialSpeed={rateTxn.review_speed}
          initialCommunication={rateTxn.review_communication}
          initialComment={rateTxn.review_comment}
          initialEditCount={rateTxn.review_edit_count}
          initialCreatedAt={rateTxn.review_created_at}
          initialUpdatedAt={rateTxn.review_updated_at}
          onClose={() => setRateTxn(null)}
        />
      )}

      {/* Lightbox Modal */}
      <ImageLightboxModal
        src={lightboxImage || ''}
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
      />

    </div>
  );
}
