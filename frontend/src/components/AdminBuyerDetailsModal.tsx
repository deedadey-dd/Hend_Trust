import React, { useState } from 'react';
import { 
  X, Star, ShieldCheck, ShieldAlert, 
  DollarSign, Phone, Mail, 
  AlertTriangle, CheckCircle2, MessageSquare, Copy, Check,
  AlertOctagon, UserCheck, ShoppingBag, MapPin, Search, ArrowUpRight
} from 'lucide-react';
import { useAdminBuyerIntelligenceQuery } from '../hooks/api/useAdminPortal';

export interface AdminBuyerTarget {
  phone?: string | null;
  email?: string | null;
  userId?: string | null;
  name?: string | null;
}

interface AdminBuyerDetailsModalProps {
  target: AdminBuyerTarget | null;
  onClose: () => void;
  onInspectTxn?: (txnId: string) => void;
  onInspectSeller?: (sellerId: string) => void;
}

export const AdminBuyerDetailsModal: React.FC<AdminBuyerDetailsModalProps> = ({
  target,
  onClose,
  onInspectTxn,
  onInspectSeller,
}) => {
  const { data, isLoading, error, refetch } = useAdminBuyerIntelligenceQuery({
    phone: target?.phone,
    email: target?.email,
    userId: target?.userId,
  });

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ORDERS' | 'DISPUTES' | 'REVIEWS'>('OVERVIEW');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!target || (!target.phone && !target.email && !target.userId)) return null;

  const summary = data?.summary;
  const userAccount = data?.user_account;
  const isRegistered = data?.is_registered_user;
  const displayName = data?.buyer_name || target.name || target.phone || target.email || 'Buyer Profile';
  const displayPhone = data?.buyer_phone || target.phone;
  const displayEmail = data?.buyer_email || target.email;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isHighRiskDisputer = summary && summary.total_orders > 0 && (summary.dispute_rate_pct >= 25 || (summary.all_disputes_raised_count >= 2 && summary.completed_orders <= 1));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 my-auto">
        
        {/* MODAL HEADER */}
        <div className="relative border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 shrink-0">
          
          {/* Header Backdrop Gradient Banner */}
          <div className="h-20 sm:h-24 w-full overflow-hidden bg-gradient-to-r from-teal-600 via-cyan-700 to-slate-900 dark:from-teal-900 dark:via-cyan-950 dark:to-slate-950 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition shadow-lg z-10 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Avatar & Title Row */}
          <div className="px-5 sm:px-6 pb-4 pt-0 -mt-10 sm:-mt-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 relative z-10">
            <div className="flex items-end gap-3.5">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-teal-600 dark:bg-teal-700 border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-xl sm:text-2xl font-black">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {displayName}
                  </h2>
                  
                  {isRegistered ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[11px] font-bold">
                      <UserCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      Registered User
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-[11px] font-medium">
                      Guest Buyer
                    </span>
                  )}

                  {userAccount?.verification_status === 'APPROVED' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Ghana Card Verified
                    </span>
                  )}

                  {userAccount?.is_suspended && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                      <AlertOctagon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      Suspended
                    </span>
                  )}

                  {isHighRiskDisputer && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[11px] font-black animate-pulse">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      High Dispute Rate ({summary?.dispute_rate_pct}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                  {displayPhone && (
                    <button 
                      onClick={() => copyToClipboard(displayPhone, 'phone')}
                      className="flex items-center gap-1 text-slate-800 dark:text-slate-300 font-mono hover:text-teal-600 dark:hover:text-teal-400 transition"
                      title="Click to copy phone number"
                    >
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{displayPhone}</span>
                      {copiedField === 'phone' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 opacity-50" />}
                    </button>
                  )}

                  {displayEmail && (
                    <button 
                      onClick={() => copyToClipboard(displayEmail, 'email')}
                      className="flex items-center gap-1 text-slate-800 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition truncate max-w-[200px]"
                      title="Click to copy email address"
                    >
                      <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{displayEmail}</span>
                      {copiedField === 'email' ? <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" /> : <Copy className="h-2.5 w-2.5 opacity-50 flex-shrink-0" />}
                    </button>
                  )}

                  {userAccount?.username && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono border border-slate-200 dark:border-slate-700">
                      @{userAccount.username}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
              {displayPhone && (
                <a
                  href={`tel:${displayPhone}`}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Phone className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  Call Buyer
                </a>
              )}
              {displayEmail && (
                <a
                  href={`mailto:${displayEmail}`}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Mail className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                  Send Email
                </a>
              )}
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="flex border-t border-slate-200 dark:border-slate-800 px-6 gap-2 sm:gap-6 text-xs sm:text-sm font-semibold overflow-x-auto bg-white dark:bg-slate-950">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Overview & Risk
            </button>
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ORDERS'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Order History
              <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                {summary?.total_orders ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('DISPUTES')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'DISPUTES'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Dispute Record
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${
                (summary?.all_disputes_raised_count || 0) > 0
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}>
                {summary?.all_disputes_raised_count ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('REVIEWS')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'REVIEWS'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Reviews Submitted
              <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                {data?.reviews_given?.length ?? 0}
              </span>
            </button>
          </div>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3">
              <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Querying database for buyer history & intelligence...</p>
            </div>
          ) : error || !data ? (
            <div className="py-12 text-center text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-base">No Buyer Records Found</p>
              <p className="text-xs text-rose-500 dark:text-rose-300/80 mt-1">
                Unable to find any transaction or user account associated with the given phone or email.
              </p>
              <button 
                onClick={() => refetch()} 
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Retry Query
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & RISK */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  
                  {/* RISK ALERT BANNER IF HIGH DISPUTES */}
                  {isHighRiskDisputer && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <span>High Dispute Frequency Warning</span>
                      </div>
                      <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                        This buyer has initiated <strong>{summary?.all_disputes_raised_count} disputes</strong> out of <strong>{summary?.total_orders} total orders</strong> ({summary?.dispute_rate_pct}% dispute rate).
                        Arbiters should inspect previous claim reasons and seller communications before approving non-consensual refunds.
                      </p>
                    </div>
                  )}

                  {/* KPI STATS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span>Total Spent (GMV)</span>
                        <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                        GHS {summary?.total_spent_ghs?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {summary?.completed_orders || 0} completed orders
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span>Total Orders</span>
                        <ShoppingBag className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      </div>
                      <p className="text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400 mt-2 font-mono">
                        {summary?.total_orders || 0}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {summary?.active_escrow_orders || 0} active in escrow
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span>Dispute Rate</span>
                        <AlertTriangle className={`h-4 w-4 ${(summary?.dispute_rate_pct || 0) > 20 ? 'text-amber-500' : 'text-slate-400'}`} />
                      </div>
                      <p className={`text-lg sm:text-xl font-black mt-2 font-mono ${
                        (summary?.dispute_rate_pct || 0) > 25 ? 'text-rose-600 dark:text-rose-400' :
                        (summary?.dispute_rate_pct || 0) > 10 ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {summary?.dispute_rate_pct ?? 0}%
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {summary?.all_disputes_raised_count || 0} raised ({summary?.retracted_disputes_count || 0} retracted)
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span>Disputes / Refunds</span>
                        <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
                        {summary?.refunded_orders || 0}
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> / {summary?.cancelled_orders || 0} canc.</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Refunded / Cancelled
                      </p>
                    </div>
                  </div>

                  {/* USER ACCOUNT & KNOWN SHIPPING ADDRESSES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Account Details */}
                    <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                      <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 font-mono">
                        User Profile & Identity
                      </h3>
                      
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400">Account Type</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {isRegistered ? 'Registered User' : 'Unregistered Guest Buyer'}
                          </span>
                        </div>

                        {userAccount && (
                          <>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500 dark:text-slate-400">Username</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                @{userAccount.username}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500 dark:text-slate-400">Verification Status</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {userAccount.verification_status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500 dark:text-slate-400">Phone Verified</span>
                              <span className={userAccount.is_phone_verified ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                                {userAccount.is_phone_verified ? 'Yes (Verified)' : 'No'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500 dark:text-slate-400">Email Verified</span>
                              <span className={userAccount.is_email_verified ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                                {userAccount.is_email_verified ? 'Yes (Verified)' : 'No'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500 dark:text-slate-400">Account Role</span>
                              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                                {userAccount.role}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500 dark:text-slate-400">Joined Platform</span>
                              <span className="text-slate-700 dark:text-slate-300 font-mono">
                                {userAccount.date_joined ? new Date(userAccount.date_joined).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </>
                        )}

                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500 dark:text-slate-400">First Order Date</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">
                            {summary?.first_order_at ? new Date(summary.first_order_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500 dark:text-slate-400">Last Order Date</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">
                            {summary?.last_order_at ? new Date(summary.last_order_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Known Shipping Addresses */}
                    <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                          Known Shipping & Delivery Addresses
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Recorded from completed & active escrow shipments
                        </p>

                        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                          {!summary?.known_shipping_addresses || summary.known_shipping_addresses.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                              No physical delivery addresses recorded.
                            </div>
                          ) : (
                            summary.known_shipping_addresses.map((addr, idx) => (
                              <div 
                                key={idx} 
                                className="p-2.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-2 group"
                              >
                                <span className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                  {addr}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(addr, `addr_${idx}`)}
                                  className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition flex-shrink-0 cursor-pointer"
                                  title="Copy address"
                                >
                                  {copiedField === `addr_${idx}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/60">
                        Total {summary?.known_shipping_addresses?.length || 0} unique shipping destinations
                      </div>
                    </div>
                  </div>

                  {/* RECENT TRANSACTIONS SNIPPET */}
                  {data?.recent_transactions && data.recent_transactions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 font-mono">
                          Recent Orders ({data.recent_transactions.length})
                        </h3>
                        <button
                          onClick={() => setActiveTab('ORDERS')}
                          className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                        >
                          View all orders <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {data.recent_transactions.slice(0, 3).map((txn) => (
                          <div 
                            key={txn.id}
                            className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm space-y-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1" title={txn.title}>
                                  {txn.title}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {txn.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Seller: <strong className="text-slate-700 dark:text-slate-300">{txn.shop_name}</strong>
                              </p>
                              <p className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                                GHS {txn.amount_ghs.toFixed(2)}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                              <span className="text-slate-500 text-[10px] font-mono">
                                {new Date(txn.created_at).toLocaleDateString()}
                              </span>
                              {onInspectTxn && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onInspectTxn(txn.id);
                                  }}
                                  className="text-teal-600 dark:text-teal-400 hover:underline font-bold text-[11px] cursor-pointer"
                                >
                                  Inspect →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ORDER HISTORY */}
              {activeTab === 'ORDERS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transaction & Escrow History</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Complete trail of {data.recent_transactions?.length || 0} orders placed by this buyer
                      </p>
                    </div>
                  </div>

                  {!data.recent_transactions || data.recent_transactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No order transactions found for this buyer.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {data.recent_transactions.map((txn) => (
                        <div 
                          key={txn.id}
                          className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                {txn.title}
                              </h4>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                                {txn.status}
                              </span>
                              {txn.has_dispute && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  txn.dispute_retracted
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                }`}>
                                  {txn.dispute_retracted ? 'Dispute Retracted' : 'Dispute Raised'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                              <span>
                                Seller:{' '}
                                {onInspectSeller ? (
                                  <button
                                    onClick={() => {
                                      onClose();
                                      onInspectSeller(txn.seller_id);
                                    }}
                                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                                  >
                                    {txn.shop_name}
                                  </button>
                                ) : (
                                  <strong className="text-slate-700 dark:text-slate-300">{txn.shop_name}</strong>
                                )}
                              </span>
                              <span className="font-mono text-slate-400">Ref: {txn.paystack_reference}</span>
                              <span className="font-mono">{new Date(txn.created_at).toLocaleString()}</span>
                            </div>

                            {txn.shipping_address && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{txn.shipping_address}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                            <p className="text-base font-black font-mono text-teal-600 dark:text-teal-400">
                              GHS {txn.amount_ghs.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2">
                              {onInspectTxn && (
                                <button
                                  onClick={() => {
                                    onClose();
                                    onInspectTxn(txn.id);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Search className="h-3 w-3" />
                                  Audit Order
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DISPUTE HISTORY */}
              {activeTab === 'DISPUTES' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dispute & Claim History</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Detailed log of all claims filed by this buyer across all sellers
                    </p>
                  </div>

                  {!data.disputes_history || data.disputes_history.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                      <p className="text-sm font-medium">Clean Record: No disputes filed by this buyer.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {data.disputes_history.map((disp) => (
                        <div 
                          key={disp.id}
                          className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                  {disp.title}
                                </h4>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  disp.status === 'DISPUTED' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' :
                                  disp.dispute_retracted_at ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' :
                                  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}>
                                  {disp.status}
                                </span>
                                {disp.dispute_retracted_at && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    Buyer Retracted Claim
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Against Seller: <strong className="text-slate-700 dark:text-slate-300">{disp.shop_name}</strong> • Amount:{' '}
                                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">GHS {disp.amount_ghs.toFixed(2)}</span> • Date:{' '}
                                <span className="font-mono">{new Date(disp.created_at).toLocaleDateString()}</span>
                              </p>
                            </div>

                            {onInspectTxn && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onInspectTxn(disp.id);
                                }}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              >
                                View Dispute Audit →
                              </button>
                            )}
                          </div>

                          {/* Dispute Reason & Details */}
                          <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                            {disp.buyer_dispute_reason && (
                              <div>
                                <p className="font-bold text-rose-700 dark:text-rose-400">Buyer Claim Reason:</p>
                                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{disp.buyer_dispute_reason}</p>
                              </div>
                            )}

                            {disp.seller_dispute_response && (
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <p className="font-bold text-blue-700 dark:text-blue-400">Seller Defense / Response:</p>
                                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{disp.seller_dispute_response}</p>
                              </div>
                            )}

                            {disp.manager_dispute_notes && (
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                                <p className="font-bold text-purple-700 dark:text-purple-400">Arbiter Settlement Notes:</p>
                                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{disp.manager_dispute_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: REVIEWS GIVEN */}
              {activeTab === 'REVIEWS' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Seller Reviews & Feedback</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ratings and comments left by this buyer for verified sellers
                    </p>
                  </div>

                  {!data.reviews_given || data.reviews_given.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No reviews submitted by this buyer.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.reviews_given.map((rev) => (
                        <div 
                          key={rev.id}
                          className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">
                                Reviewed: <span className="text-teal-600 dark:text-teal-400">{rev.shop_name}</span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {new Date(rev.created_at).toLocaleDateString()}
                                {rev.edit_count > 0 && ` • Updated (${rev.edit_count} times)`}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{rev.rating_overall} / 5</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Speed: <strong className="text-slate-700 dark:text-slate-300 font-mono">{rev.rating_speed} ★</strong></span>
                            <span>Communication: <strong className="text-slate-700 dark:text-slate-300 font-mono">{rev.rating_communication} ★</strong></span>
                          </div>

                          {rev.comment ? (
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                              "{rev.comment}"
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No written comment.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {data && (
              <span>
                Queried Identifier: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{displayPhone || displayEmail || target.userId}</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
};
