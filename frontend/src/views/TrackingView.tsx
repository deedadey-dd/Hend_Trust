import React, { useState } from 'react';
import { Package, Search, Phone, KeyRound, Loader2, Mail, FileText, ShieldCheck, X, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { apiClient } from '../api/client';
import { STATUS_CONFIG } from './DashboardView'; // Reusing status UI configs

type TrackingMode = 'SINGLE' | 'HISTORY';
type HistoryStep = 'EMAIL' | 'OTP';

export const TrackingView: React.FC = () => {
  // Mode selection
  const [mode, setMode] = useState<TrackingMode>('SINGLE');
  
  // Single Tracking state
  const [txnId, setTxnId] = useState('');
  const [phone, setPhone] = useState('');
  
  // History Tracking state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [historyStep, setHistoryStep] = useState<HistoryStep>('EMAIL');
  
  // Shared state
  const [loading, setLoading] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [error, setError] = useState('');
  const [txns, setTxns] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Modal State
  const [confirmTxnId, setConfirmTxnId] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

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
    setConfirmError('');
    setIsConfirming(true);
    try {
      await axios.post(`/api/v1/escrow/${confirmTxnId}/confirm-receipt`, { confirmation_code: confirmCode.trim() });
      alert('Receipt confirmed! Payment released. Thank you.');
      window.location.reload();
    } catch (err: any) { 
      setConfirmError(err.response?.data?.message || 'Failed to confirm receipt. Please check the code and try again.'); 
    } finally {
      setIsConfirming(false);
    }
  };

  // --- Single Tracking Flow ---
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!txnId || !phone) {
      setError('Please enter both Transaction ID and Phone Number.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/checkout/track/id', { 
        paystack_reference: txnId, 
        phone_number: phone 
      });
      setTxns(res.data);
      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Order not found or invalid details.');
    } finally {
      setLoading(false);
    }
  };

  // --- History Tracking Flow ---
  const handleSendEmailOtp = async () => {
    setError('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoadingOtp(true);
    try {
      await apiClient.post('/checkout/send-email-otp', { email });
      setHistoryStep('OTP');
      // Only alert if we're resending
      if (historyStep === 'OTP') {
        alert('A new OTP has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    // Automatically send OTP when continuing from Email step
    handleSendEmailOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp) {
      setError('Please enter the OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/checkout/track', { email, otp_code: otp });
      setTxns(res.data);
      setShowResults(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setTxnId('');
    setPhone('');
    setEmail('');
    setOtp('');
    setHistoryStep('EMAIL');
    setTxns([]);
    setError('');
    setShowResults(false);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      
      {!showResults ? (
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 animate-fade-in">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Track Your Order</h2>
            <p className="mt-2 text-sm text-gray-500">
              {mode === 'SINGLE' 
                ? "Enter your details below to track a specific order securely." 
                : historyStep === 'EMAIL' 
                  ? "Enter your email to view your full order history." 
                  : "Enter the verification code sent to your email."}
            </p>
          </div>

          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => { setMode('SINGLE'); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'SINGLE' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Track Single Order
            </button>
            <button
              onClick={() => { setMode('HISTORY'); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'HISTORY' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Full History
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 text-center">
              {error}
            </div>
          )}

          {/* SINGLE ORDER FLOW */}
          {mode === 'SINGLE' && (
            <form className="space-y-6" onSubmit={handleSingleSubmit}>
              <div>
                <label htmlFor="txnId" className="sr-only">Transaction ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="txnId"
                    type="text"
                    required
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase transition-all"
                    placeholder="Transaction ID (e.g. XY98Z123)"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="sr-only">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                    placeholder="Phone Number"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Track Order"}
              </button>
            </form>
          )}

          {/* HISTORY FLOW */}
          {mode === 'HISTORY' && historyStep === 'EMAIL' && (
            <form className="space-y-6" onSubmit={handleEmailSubmit}>
              <div>
                <label htmlFor="email" className="sr-only">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingOtp}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70"
              >
                {loadingOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Magic Code"}
              </button>
            </form>
          )}

          {mode === 'HISTORY' && historyStep === 'OTP' && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label htmlFor="otp" className="sr-only">OTP Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="appearance-none rounded-xl relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm tracking-widest font-mono text-center transition-all"
                    placeholder="• • • • • •"
                    maxLength={6}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 shadow-lg shadow-blue-500/30"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "View Full History"}
                </button>
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={loadingOtp || loading}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {loadingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Lost Code? Resend to Email
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'SINGLE' ? 'Transaction Details' : 'Your Order History'}
            </h2>
            <button 
              onClick={resetFlow}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Track another order
            </button>
          </div>
          
          <div className="bg-white shadow-lg border border-gray-100 rounded-2xl overflow-hidden">
            {txns.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No transactions found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {txns.map(txn => {
                  const cfg = STATUS_CONFIG[txn.status] || STATUS_CONFIG['AWAITING_PAYMENT'];
                  const Icon = cfg.icon;
                  return (
                    <li key={txn.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm font-bold text-gray-600 px-2 py-1 bg-gray-100 rounded-md uppercase">
                              {txn.paystack_reference}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                              <Icon className="mr-1.5 h-3.5 w-3.5" />
                              {cfg.label}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">{txn.title}</h3>
                          <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-green-600" /> HendAxis Trust Protected</span>
                            <span>{new Date(txn.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col justify-between items-end h-full">
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Paid</p>
                            <p className="text-2xl font-black text-gray-900">GHS {Number(txn.total_amount_ghs).toFixed(2)}</p>
                          </div>
                          {(() => {
                            const isInspection = txn.status === 'INSPECTION_PERIOD';
                            const canConfirm = txn.status === 'DELIVERY_IN_PROGRESS';
                            let canDispute = txn.status === 'INSPECTION_PERIOD' || txn.status === 'DELIVERY_IN_PROGRESS';
                            
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
                                inspectionRemaining = "Expired";
                                canDispute = false;
                              }
                            }

                            return (canConfirm || canDispute || isInspection) && (
                            <div className="flex flex-col sm:flex-row gap-2 mt-auto w-full sm:w-auto items-center">
                              {isInspection && (
                                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                  Inspection ends in: {inspectionRemaining}
                                </span>
                              )}
                              {canConfirm && (
                                <button
                                  onClick={() => handleOpenConfirmModal(txn.id)}
                                  disabled={isSendingCode && confirmTxnId === txn.id}
                                  className="py-2 px-4 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition shadow-sm whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                  {isSendingCode && confirmTxnId === txn.id ? <Loader2 className="h-4 w-4 animate-spin" /> : '✓ Confirm Receipt'}
                                </button>
                              )}
                              {canDispute && (
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to open a dispute? This will freeze the transaction.')) {
                                      try {
                                        await axios.post(`/api/v1/escrow/${txn.id}/dispute`);
                                        alert('Dispute opened. Support will contact you shortly.');
                                        window.location.reload();
                                      } catch (err: any) { alert('Failed to open dispute.'); }
                                    }
                                  }}
                                  className="py-2 px-4 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition shadow-sm whitespace-nowrap"
                                >
                                  Raise Dispute
                                </button>
                              )}
                            </div>
                          )
                          })()}

                          {/* Delivery Process Info — shown while in transit or inspection */}
                          {(txn.status === 'DELIVERY_IN_PROGRESS' || txn.status === 'INSPECTION_PERIOD') && (
                            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 w-full">
                              <p className="font-bold mb-2">📦 How delivery & receipt works</p>
                              <p className="font-semibold text-amber-800 mb-0.5">Path A — Formal Courier:</p>
                              <p className="text-amber-700 mb-2">System is notified automatically when courier marks it <strong>DELIVERED</strong>.</p>
                              <p className="font-semibold text-amber-800 mb-0.5">Path B — Informal / Bus Delivery:</p>
                              <ul className="list-disc list-inside text-amber-700 space-y-0.5">
                                <li>You received an SMS with the <strong>driver info</strong> and your <strong>Secret OTP</strong>.</li>
                                <li>Present your <strong>ID + OTP</strong> at the station to the driver/agent.</li>
                                <li>Keep the OTP — you'll need it again to <strong>Confirm Receipt</strong> here.</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Confirm Receipt Modal */}
      {confirmTxnId && !isSendingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-6 relative">
            <button 
              onClick={() => setConfirmTxnId(null)}
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
                onClick={() => handleOpenConfirmModal(confirmTxnId)}
                disabled={isSendingCode}
                className="w-full text-sm font-medium text-green-600 hover:text-green-800 transition-colors mt-2"
              >
                Didn't receive it? Resend Code
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
