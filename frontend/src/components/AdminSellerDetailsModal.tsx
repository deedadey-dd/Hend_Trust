import React, { useState } from 'react';
import { 
  X, ExternalLink, Star, ShieldCheck, ShieldAlert, Store, Package, 
  DollarSign, Phone, Mail, Calendar, CreditCard, 
  AlertTriangle, CheckCircle2, MessageSquare, Copy, Check,
  AlertOctagon, UserCheck
} from 'lucide-react';
import { useAdminSellerDetailsQuery } from '../hooks/api/useAdminPortal';
import { useEscapeKey } from '../utils/useEscapeKey';

interface AdminSellerDetailsModalProps {
  sellerId: string | null;
  onClose: () => void;
  onSuspend?: (sellerId: string, username: string) => void;
  onReinstate?: (sellerId: string, username: string) => void;
}

export const AdminSellerDetailsModal: React.FC<AdminSellerDetailsModalProps> = ({
  sellerId,
  onClose,
  onSuspend,
  onReinstate,
}) => {
  useEscapeKey(onClose, Boolean(sellerId));
  const { data, isLoading, error, refetch } = useAdminSellerDetailsQuery(sellerId);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LINKS' | 'REVIEWS' | 'HEALTH'>('OVERVIEW');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!sellerId) return null;

  const seller = data?.seller;
  const wallet = data?.wallet;
  const linksSummary = data?.links_summary;
  const txSummary = data?.transactions_summary;
  const reviewsSummary = data?.reviews_summary;
  const disputeHealth = data?.dispute_health;

  const handleCopyStoreLink = () => {
    if (!seller?.username) return;
    const storeUrl = `${window.location.origin}/store/${seller.username}`;
    navigator.clipboard.writeText(storeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenStore = () => {
    if (!seller?.username) return;
    window.open(`/store/${seller.username}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 my-auto">
        
        {/* MODAL HEADER WITH BANNER */}
        <div className="relative border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 shrink-0">
          {/* Banner Image or Gradient */}
          <div className="h-28 sm:h-32 w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-700 to-slate-800 dark:from-blue-900 dark:via-indigo-950 dark:to-slate-900 relative">
            {seller?.banner_url && (
              <img 
                src={seller.banner_url} 
                alt="Shop Banner" 
                className="w-full h-full object-cover" 
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/50" />
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
          <div className="px-5 sm:px-6 pb-4 pt-0 -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 relative z-10">
            <div className="flex items-end gap-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                {seller?.profile_picture_url ? (
                  <img src={seller.profile_picture_url} alt={seller.username} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-10 w-10 text-blue-500 dark:text-blue-400" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {seller?.shop_name || seller?.username || 'Seller Profile'}
                  </h2>
                  {seller?.verification_status === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Verified
                    </span>
                  )}
                  {seller?.is_suspended ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold">
                      <AlertOctagon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                      <UserCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                  <span className="font-mono text-slate-800 dark:text-slate-300 font-semibold">@{seller?.username}</span>
                  {seller?.shop_category && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                      {seller.shop_category}
                    </span>
                  )}
                  {reviewsSummary?.avg_rating_overall !== null && reviewsSummary?.avg_rating_overall !== undefined && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      {reviewsSummary.avg_rating_overall.toFixed(1)}
                      <span className="text-slate-500 dark:text-slate-400 font-normal">({reviewsSummary.total_reviews_count})</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
              <button
                onClick={handleCopyStoreLink}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Copy public storefront link"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedLink ? 'Copied Link' : 'Copy Link'}
              </button>
              
              <button
                onClick={handleOpenStore}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
                title="Open public storefront in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Storefront Page
              </button>

              {seller && (
                seller.is_suspended ? (
                  onReinstate && (
                    <button
                      onClick={() => onReinstate(seller.id, seller.username)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow"
                    >
                      Reinstate Seller
                    </button>
                  )
                ) : (
                  onSuspend && (
                    <button
                      onClick={() => onSuspend(seller.id, seller.username)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow"
                    >
                      Suspend Seller
                    </button>
                  )
                )
              )}
            </div>
          </div>

          {/* NAVIGATION TABS */}
          <div className="flex border-t border-slate-200 dark:border-slate-800 px-6 gap-2 sm:gap-6 text-xs sm:text-sm font-semibold overflow-x-auto bg-white dark:bg-slate-950">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Overview & KPIs
            </button>
            <button
              onClick={() => setActiveTab('LINKS')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'LINKS'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Payment Links
              <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                {linksSummary?.total_links ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('REVIEWS')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'REVIEWS'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Ratings & Comments
              <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                {reviewsSummary?.total_reviews_count ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('HEALTH')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'HEALTH'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Escrow Health & Risk
              {disputeHealth?.dispute_level === 'COMPLIANCE_REVIEW' && (
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3">
              <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading seller intelligence report...</p>
            </div>
          ) : error || !seller ? (
            <div className="py-12 text-center text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-base">Failed to load seller information</p>
              <p className="text-xs text-rose-500 dark:text-rose-300/80 mt-1">Please check your network connection or try again.</p>
              <button 
                onClick={() => refetch()} 
                className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* KPI STATS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span>Completed Volume</span>
                        <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                        GHS {txSummary?.completed_gmv_ghs?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{txSummary?.completed_orders || 0} completed orders</p>
                    </div>

                    <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span>Wallet Balance</span>
                        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">
                        GHS {wallet?.available_balance_ghs?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Payout: {wallet?.preferred_payout_type || seller.payout_mode}</p>
                    </div>

                    <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span>Active Links</span>
                        <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-300 mt-2 font-mono">
                        {linksSummary?.active_links || 0}
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> / {linksSummary?.total_links || 0}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{linksSummary?.archived_links || 0} archived</p>
                    </div>

                    <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                        <span>Customer Rating</span>
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      </div>
                      <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-300 mt-2">
                        {reviewsSummary?.avg_rating_overall ? `${reviewsSummary.avg_rating_overall.toFixed(1)} ★` : 'No reviews'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{reviewsSummary?.total_reviews_count || 0} total comments</p>
                    </div>
                  </div>

                  {/* SHOP DETAILS & CONTACT CARD */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Shop Info */}
                    <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                      <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 font-mono">
                        Shop Information
                      </h3>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Shop Name</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{seller.shop_name || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Shop Description</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/60">
                          {seller.shop_description || 'No description provided by the seller.'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categories</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {seller.shop_categories && seller.shop_categories.length > 0 ? (
                            seller.shop_categories.map((cat, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-md text-[11px] font-semibold">
                                {cat}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                              {seller.shop_category || 'General'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact & Settlement */}
                    <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                      <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 font-mono">
                        Account & Settlement Details
                      </h3>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
                          </span>
                          <a href={`mailto:${seller.email}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                            {seller.email || 'None'}
                          </a>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> Phone
                          </span>
                          {seller.phone_number ? (
                            <a href={`tel:${seller.phone_number}`} className="text-blue-600 dark:text-blue-400 hover:underline font-mono font-bold">
                              {seller.phone_number}
                            </a>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-slate-400" /> Payout Method
                          </span>
                          <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                            {wallet?.preferred_payout_type === 'MOMO' ? `MOMO (${wallet.momo_number || seller.phone_number || 'N/A'})` : `Bank (${wallet?.bank_name || 'N/A'} - ${wallet?.bank_account_number || 'N/A'})`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" /> Joined Date
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">
                            {seller.date_joined ? new Date(seller.date_joined).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {seller.is_suspended && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 mt-2">
                          <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertOctagon className="h-3.5 w-3.5" /> Account Suspended
                          </p>
                          <p className="text-[11px] text-rose-700 dark:text-rose-300">
                            Reason: {seller.suspension_reason || 'Administrative decision.'}
                          </p>
                          {seller.suspended_at && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400/80 font-mono">
                              Date: {new Date(seller.suspended_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TOP PERFORMING LINKS PREVIEW */}
                  {linksSummary?.top_links && linksSummary.top_links.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 font-mono">
                          Top Performing Payment Links
                        </h3>
                        <button
                          onClick={() => setActiveTab('LINKS')}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                        >
                          View all ({linksSummary.total_links}) →
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {linksSummary.top_links.slice(0, 3).map((link) => (
                          <div 
                            key={link.id} 
                            className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1" title={link.title}>
                                  {link.title}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  link.is_active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>
                                  {link.is_active ? 'Active' : 'Archived'}
                                </span>
                              </div>
                              <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                GHS {link.price_ghs.toFixed(2)}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                              <span>{link.completed_transactions} sales</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                GHS {link.completed_revenue_ghs.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PAYMENT LINKS */}
              {activeTab === 'LINKS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Payment Links & Products</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total {linksSummary?.total_links || 0} links ({linksSummary?.active_links || 0} active, {linksSummary?.archived_links || 0} archived)
                      </p>
                    </div>
                  </div>

                  {!linksSummary?.top_links || linksSummary.top_links.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">No payment links created by this seller.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {linksSummary.top_links.map((link) => (
                        <div 
                          key={link.id}
                          className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-sm"
                        >
                          <div className="flex gap-3">
                            <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {link.image_url ? (
                                <img src={link.image_url} alt={link.title} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate" title={link.title}>
                                  {link.title}
                                </h4>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  link.is_active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>
                                  {link.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                              </div>
                              <p className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 mt-0.5">
                                GHS {link.price_ghs.toFixed(2)}
                                {link.shipping_fee_ghs > 0 && (
                                  <span className="text-[11px] text-slate-500 font-normal ml-1">
                                    (+{link.shipping_fee_ghs.toFixed(2)} ship)
                                  </span>
                                )}
                              </p>
                              {link.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-1">
                                  {link.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-slate-500 uppercase font-mono">Orders / Revenue</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {link.completed_transactions} orders • <span className="text-emerald-600 dark:text-emerald-400 font-mono">GHS {link.completed_revenue_ghs.toFixed(2)}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => window.open(`/l/${link.id}`, '_blank')}
                              className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="View checkout link page"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Link
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RATINGS & REVIEWS / COMMENTS */}
              {activeTab === 'REVIEWS' && (
                <div className="space-y-5">
                  {/* Rating Breakdown Header */}
                  <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="text-center sm:text-left">
                        <p className="text-3xl font-black text-amber-500 dark:text-amber-400">
                          {reviewsSummary?.avg_rating_overall ? reviewsSummary.avg_rating_overall.toFixed(1) : '0.0'}
                        </p>
                        <div className="flex items-center gap-1 text-amber-500 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${
                                (reviewsSummary?.avg_rating_overall || 0) >= star
                                  ? 'fill-amber-500 text-amber-500'
                                  : 'text-slate-200 dark:text-slate-700'
                              }`} 
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {reviewsSummary?.total_reviews_count || 0} total buyer ratings
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Delivery Speed</span>
                        <span className="font-bold text-amber-600 dark:text-amber-300 font-mono">
                          {reviewsSummary?.avg_rating_speed ? `${reviewsSummary.avg_rating_speed.toFixed(1)} ★` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Communication</span>
                        <span className="font-bold text-amber-600 dark:text-amber-300 font-mono">
                          {reviewsSummary?.avg_rating_communication ? `${reviewsSummary.avg_rating_communication.toFixed(1)} ★` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 font-mono">
                      Buyer Comments & Feedback ({reviewsSummary?.reviews?.length || 0})
                    </h4>

                    {!reviewsSummary?.reviews || reviewsSummary.reviews.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">No reviews or buyer comments yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reviewsSummary.reviews.map((rev) => (
                          <div 
                            key={rev.id} 
                            className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-500/30">
                                  {rev.buyer_name ? rev.buyer_name.charAt(0).toUpperCase() : 'B'}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-slate-200">{rev.buyer_name || 'Verified Buyer'}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    {new Date(rev.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{rev.rating_overall} / 5</span>
                              </div>
                            </div>

                            {rev.comment ? (
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pl-1">
                                "{rev.comment}"
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic pl-1">No written comment provided.</p>
                            )}

                            {rev.image_url && (
                              <div className="mt-2 pl-1">
                                <img 
                                  src={rev.image_url} 
                                  alt="Buyer review photo" 
                                  className="h-16 w-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                                  onClick={() => window.open(rev.image_url, '_blank')}
                                />
                              </div>
                            )}

                            {rev.seller_reply && (
                              <div className="mt-2 pl-3 border-l-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-r-xl">
                                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Seller Reply:</p>
                                <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{rev.seller_reply}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ESCROW HEALTH & RISK */}
              {activeTab === 'HEALTH' && (
                <div className="space-y-5">
                  <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dispute & Dispatch Risk Analysis</h3>
                      {disputeHealth?.dispute_level === 'COMPLIANCE_REVIEW' ? (
                        <span className="px-3 py-1 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 rounded-full text-xs font-black uppercase flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Compliance Review
                        </span>
                      ) : seller.is_suspended ? (
                        <span className="px-3 py-1 bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 rounded-full text-xs font-black uppercase flex items-center gap-1.5">
                          <AlertOctagon className="h-4 w-4 text-rose-600 dark:text-rose-400" /> Suspended
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Normal Health
                        </span>
                      )}
                    </div>

                    {disputeHealth?.compliance_review_reasons && disputeHealth.compliance_review_reasons.length > 0 && (
                      <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 rounded-xl space-y-1.5">
                        <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Compound Risk Triggers Detected:
                        </p>
                        <ul className="text-xs text-indigo-900 dark:text-indigo-200/90 list-disc list-inside space-y-0.5">
                          {disputeHealth.compliance_review_reasons.map((reason: string, idx: number) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dispute Rate</p>
                        <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                          {disputeHealth?.dispute_rate_pct ?? 0}%
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {disputeHealth?.dispute_count ?? 0} / {disputeHealth?.total_orders ?? 0} orders disputed
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dispatch Expiry Rate</p>
                        <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                          {disputeHealth?.dispatch_expiry_rate_pct ?? 0}%
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {disputeHealth?.dispatch_expiry_count ?? 0} / {disputeHealth?.total_orders ?? 0} expired
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Average Order Rating</p>
                        <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                          {disputeHealth?.avg_rating ? `${disputeHealth.avg_rating} ★` : 'N/A'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {disputeHealth?.total_reviews_count ?? 0} buyer reviews
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ORDER TOTALS BREAKDOWN */}
                  <div className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 font-mono">
                      Order Lifecycle Breakdown
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">Total Placed</p>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">{txSummary?.total_orders || 0}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/30">
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-mono">Completed</p>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">{txSummary?.completed_orders || 0}</p>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/30">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-mono">Disputed</p>
                        <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">{txSummary?.disputed_orders || 0}</p>
                      </div>
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/30">
                        <p className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-mono">Refunded / Cancelled</p>
                        <p className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                          {(txSummary?.refunded_orders || 0) + (txSummary?.cancelled_orders || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 px-6 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Seller ID: <span className="font-mono text-slate-700 dark:text-slate-400">{seller?.id || sellerId}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenStore}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full Storefront Page
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
