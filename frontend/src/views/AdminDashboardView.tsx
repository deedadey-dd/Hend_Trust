import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Package, ShieldAlert, Users, PhoneCall, Send, Search, Filter, 
  TrendingUp, DollarSign, Lock, Eye, X, 
  RefreshCw, Layers, CheckCircle2, UserCheck, FileCheck, ShieldCheck
} from 'lucide-react';
import { 
  useAdminMetricsQuery, 
  useAdminTransactionsQuery, 
  useAdminTransactionDetailQuery, 
  useAdminDisputesQuery, 
  useAdminSellersQuery, 
  useAdminBuyersQuery, 
  useResolveDisputeMutation, 
  useBroadcastMessageMutation 
} from '../hooks/api/useAdminPortal';
import { apiClient } from '../api/client';

type AdminTab = 'OVERVIEW' | 'TRANSACTIONS' | 'DISPUTES' | 'VERIFICATIONS' | 'FUNDS' | 'SELLERS' | 'BUYERS' | 'BROADCAST';

interface SellerVerificationRecord {
  id: string;
  username: string;
  email: string;
  phone_number: string;
  shop_name: string;
  shop_description: string;
  shop_categories: string[];
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNSUBMITTED';
  national_id_number: string;
  national_id_photo_url: string;
  business_license_photo_url: string;
  verification_rejection_reason: string;
  verified_at?: string;
  joined_at: string;
}

interface AccountsSummary {
  system_bank_asset_ghs: number;
  buyer_escrow_deposit_ghs: number;
  seller_wallets_liabilities_ghs: number;
  platform_revenue_ghs: number;
  paystack_expense_ghs: number;
  net_platform_profit_ghs: number;
  total_assets_ghs: number;
  total_liabilities_ghs: number;
  is_ledger_balanced: boolean;
}

interface AccountRecord {
  id: string;
  name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
  user_username?: string;
  user_id?: string;
}

interface LedgerEntryRecord {
  id: string;
  reference_id: string;
  entry_type: string;
  debit_account_name: string;
  debit_account_type: string;
  credit_account_name: string;
  credit_account_type: string;
  amount_ghs: number;
  timestamp: string;
}

export const AdminDashboardView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');

  // Verifications State
  const [verifications, setVerifications] = useState<SellerVerificationRecord[]>([]);
  const [loadingVerifs, setLoadingVerifs] = useState(false);
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isActioningVerif, setIsActioningVerif] = useState(false);

  const fetchVerifications = async () => {
    try {
      setLoadingVerifs(true);
      const res = await apiClient.get('/admin/verifications');
      setVerifications(res.data);
    } catch {
      console.error("Failed to fetch verifications");
    } finally {
      setLoadingVerifs(false);
    }
  };

  const handleApproveVerification = async (userId: string) => {
    setIsActioningVerif(true);
    try {
      await apiClient.post(`/admin/verifications/${userId}/approve`);
      alert("Seller verification approved! Verified badge granted.");
      fetchVerifications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve verification.");
    } finally {
      setIsActioningVerif(false);
    }
  };

  const handleRejectVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectUserId) return;
    setIsActioningVerif(true);
    try {
      await apiClient.post(`/admin/verifications/${rejectUserId}/reject`, { reason: rejectReason });
      alert("Seller verification rejected.");
      setRejectUserId(null);
      setRejectReason('');
      fetchVerifications();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject verification.");
    } finally {
      setIsActioningVerif(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  // Platform Funds & Ledger Audit State
  const [fundsSummary, setFundsSummary] = useState<AccountsSummary | null>(null);
  const [accountsList, setAccountsList] = useState<AccountRecord[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryRecord[]>([]);
  const [ledgerTotalCount, setLedgerTotalCount] = useState(0);
  const [ledgerTotalVolume, setLedgerTotalVolume] = useState(0);
  const [loadingFunds, setLoadingFunds] = useState(false);

  // Filters for Ledger Audit
  const [entryTypeFilter, setEntryTypeFilter] = useState('ALL');
  const [accountTypeFilter, setAccountTypeFilter] = useState('ALL');
  const [accountIdFilter, setAccountIdFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerSortBy, setLedgerSortBy] = useState('timestamp');
  const [ledgerOrder, setLedgerOrder] = useState('desc');

  const fetchFundsAccounts = async () => {
    try {
      const res = await apiClient.get('/admin/funds/accounts');
      setFundsSummary(res.data.summary);
      setAccountsList(res.data.accounts);
    } catch {
      console.error("Failed to fetch funds accounts");
    }
  };

  const fetchLedgerEntries = async () => {
    try {
      setLoadingFunds(true);
      const params: any = {
        entry_type: entryTypeFilter,
        account_type: accountTypeFilter,
        account_id: accountIdFilter,
        start_date: startDateFilter,
        end_date: endDateFilter,
        search: ledgerSearch,
        sort_by: ledgerSortBy,
        order: ledgerOrder,
        limit: 100,
      };
      const res = await apiClient.get('/admin/funds/ledger', { params });
      setLedgerEntries(res.data.items);
      setLedgerTotalCount(res.data.total_count);
      setLedgerTotalVolume(res.data.total_volume_ghs);
    } catch {
      console.error("Failed to fetch ledger entries");
    } finally {
      setLoadingFunds(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'FUNDS') {
      fetchFundsAccounts();
      fetchLedgerEntries();
    }
  }, [
    activeTab, entryTypeFilter, accountTypeFilter, accountIdFilter,
    startDateFilter, endDateFilter, ledgerSearch, ledgerSortBy, ledgerOrder
  ]);

  // Overview Queries
  const { data: metrics, refetch: refetchMetrics } = useAdminMetricsQuery();

  // Transactions State & Query
  const [txnStatus, setTxnStatus] = useState<string>('ALL');
  const [txnSearch, setTxnSearch] = useState<string>('');
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const { data: txnsData, isLoading: txnsLoading, refetch: refetchTxns } = useAdminTransactionsQuery(txnStatus, txnSearch);
  const { data: txnDetail, isLoading: detailLoading } = useAdminTransactionDetailQuery(selectedTxnId);

  // Disputes Query & Mutation
  const { data: disputes, isLoading: disputesLoading, refetch: refetchDisputes } = useAdminDisputesQuery();
  const resolveMutation = useResolveDisputeMutation();
  const [resolvingTxnId, setResolvingTxnId] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<string>('RELEASE_TO_SELLER');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [resolveMsg, setResolveMsg] = useState<string>('');

  // Partial Refund Breakdown States
  const [refundAmountGhs, setRefundAmountGhs] = useState<number>(0);
  const [sellerAmountGhs, setSellerAmountGhs] = useState<number>(0);
  const [platformFeeGhs, setPlatformFeeGhs] = useState<number>(0);
  const [managerPhotos, setManagerPhotos] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleManagerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (managerPhotos.length + files.length > 5) {
      alert("You can upload a maximum of 5 manager evidence photos.");
      return;
    }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setManagerPhotos(prev => [...prev, reader.result as string].slice(0, 5));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Sellers State & Query
  const [sellerSearch, setSellerSearch] = useState<string>('');
  const { data: sellers, isLoading: sellersLoading } = useAdminSellersQuery(sellerSearch);

  // Buyers State & Query
  const [buyerSearch, setBuyerSearch] = useState<string>('');
  const { data: buyers, isLoading: buyersLoading } = useAdminBuyersQuery(buyerSearch);

  // Broadcast Messaging State
  const [targetGroup, setTargetGroup] = useState<string>('ALL_USERS');
  const [channels, setChannels] = useState<string>('SMS');
  const [subject, setSubject] = useState<string>('Notice from HendAxis Trust');
  const [message, setMessage] = useState<string>('');
  const [customRecipients, setCustomRecipients] = useState<string>('');
  const broadcastMutation = useBroadcastMessageMutation();
  const [broadcastResult, setBroadcastResult] = useState<string>('');

  const activeDisputeTxn = disputes?.find((d: any) => d.id === resolvingTxnId);
  const totalPaidByBuyer = activeDisputeTxn?.total_amount_ghs || 0;
  const partialSum = (Number(refundAmountGhs) || 0) + (Number(sellerAmountGhs) || 0) + (Number(platformFeeGhs) || 0);
  const isPartialOverLimit = partialSum > totalPaidByBuyer;

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTxnId) return;
    if (resolveAction === 'PARTIAL_REFUND_TO_BUYER' && isPartialOverLimit) {
      setResolveMsg(`The total allocated (GHS ${partialSum.toFixed(2)}) cannot exceed the total amount paid by the buyer (GHS ${totalPaidByBuyer.toFixed(2)}).`);
      return;
    }
    setResolveMsg('');
    try {
      const res = await resolveMutation.mutateAsync({
        transaction_id: resolvingTxnId,
        action: resolveAction,
        refund_amount_ghs: Number(refundAmountGhs) || 0,
        seller_amount_ghs: Number(sellerAmountGhs) || 0,
        platform_retained_fee_ghs: Number(platformFeeGhs) || 0,
        admin_notes: adminNotes,
        manager_photos: managerPhotos,
      });
      setResolveMsg(res.message || 'Dispute resolved successfully.');
      setTimeout(() => {
        setResolvingTxnId(null);
        setResolveMsg('');
        setManagerPhotos([]);
        refetchDisputes();
        refetchMetrics();
      }, 1500);
    } catch (err: any) {
      setResolveMsg(err.response?.data?.detail || 'Failed to resolve dispute.');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBroadcastResult('');
    try {
      const res = await broadcastMutation.mutateAsync({
        target_group: targetGroup,
        channels,
        subject,
        message,
        custom_recipients: customRecipients,
      });
      setBroadcastResult(res.message);
      setMessage('');
    } catch (err: any) {
      setBroadcastResult(err.response?.data?.detail || 'Failed to send broadcast.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Platform Operations
              </span>
              <span className="text-slate-500 text-sm">Manager Portal v1.0</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">HendAxis Trust Management Center</h1>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">Real-time surveillance, transaction escrow controls, dispute arbitration, and targeted broadcast engine.</p>
          </div>
          <button 
            onClick={() => { refetchMetrics(); refetchTxns(); refetchDisputes(); }}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold transition shadow-sm"
          >
            <RefreshCw className="h-4 w-4 text-blue-400" />
            Refresh Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-6 flex overflow-x-auto gap-2 border-b border-slate-800 scrollbar-none pb-px">
          {[
            { id: 'OVERVIEW', label: 'Overview & Health', icon: BarChart3 },
            { id: 'TRANSACTIONS', label: 'All Transactions', icon: Package, badge: txnsData?.total_count },
            { id: 'DISPUTES', label: 'Disputes Center', icon: ShieldAlert, badge: metrics?.active_disputes, alert: (metrics?.active_disputes || 0) > 0 },
            { id: 'VERIFICATIONS', label: 'Seller Verifications', icon: FileCheck, badge: verifications.filter(v => v.verification_status === 'PENDING').length, alert: verifications.filter(v => v.verification_status === 'PENDING').length > 0 },
            { id: 'FUNDS', label: 'Platform Funds & Ledger', icon: DollarSign, badge: fundsSummary ? `GHS ${fundsSummary.system_bank_asset_ghs.toLocaleString()}` : undefined },
            { id: 'SELLERS', label: 'Sellers Directory', icon: Users },
            { id: 'BUYERS', label: 'Buyer Phone Registry', icon: PhoneCall },
            { id: 'BROADCAST', label: 'Broadcast Messaging Studio', icon: Send },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2.5 px-4 py-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
                  isActive 
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5 rounded-t-lg' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    tab.alert 
                      ? 'bg-rose-500/20 text-rose-300 font-extrabold border border-rose-500/40' 
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 mt-8">

        {/* ─── TAB 1: OVERVIEW & ANALYTICS ────────────────────────────────────── */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gross Volume (GMV)</span>
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl"><TrendingUp className="h-5 w-5" /></div>
                </div>
                <p className="text-2xl font-black text-white mt-3">GHS {metrics?.gmv_ghs?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</p>
                <p className="text-xs text-slate-500 mt-1">Total settled merchandise volume</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Platform Revenue</span>
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl"><DollarSign className="h-5 w-5" /></div>
                </div>
                <p className="text-2xl font-black text-emerald-400 mt-3">GHS {metrics?.platform_revenue_ghs?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</p>
                <p className="text-xs text-slate-500 mt-1">Accumulated platform fee ledger balance</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Escrow Holds</span>
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl"><Lock className="h-5 w-5" /></div>
                </div>
                <p className="text-2xl font-black text-indigo-300 mt-3">GHS {metrics?.active_escrow_liabilities_ghs?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</p>
                <p className="text-xs text-slate-500 mt-1">Current buyer funds in clearing account</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Disputes</span>
                  <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl"><ShieldAlert className="h-5 w-5" /></div>
                </div>
                <p className="text-2xl font-black text-rose-400 mt-3">{metrics?.active_disputes || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Transactions frozen requiring manager action</p>
              </div>
            </div>

            {/* Platform Metrics Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Transaction State Breakdown */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-400" />
                  Transaction Pipeline Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { key: 'AWAITING_PAYMENT', label: 'Awaiting Payment', color: 'bg-slate-800 text-slate-300' },
                    { key: 'PAYMENT_RECEIVED', label: 'Awaiting Shipping', color: 'bg-amber-500/10 text-amber-300 border border-amber-500/20' },
                    { key: 'DELIVERY_IN_PROGRESS', label: 'Delivery in Progress', color: 'bg-blue-500/10 text-blue-300 border border-blue-500/20' },
                    { key: 'INSPECTION_PERIOD', label: 'Inspection Window', color: 'bg-purple-500/10 text-purple-300 border border-purple-500/20' },
                    { key: 'COMPLETED', label: 'Completed & Paid Out', color: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' },
                    { key: 'DISPUTED', label: 'Disputed', color: 'bg-rose-500/10 text-rose-300 border border-rose-500/20' },
                    { key: 'REFUNDED', label: 'Refunded', color: 'bg-teal-500/10 text-teal-300 border border-teal-500/20' },
                  ].map(item => (
                    <div key={item.key} className={`p-4 rounded-xl ${item.color} flex flex-col justify-between`}>
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{item.label}</span>
                      <span className="text-2xl font-black mt-2">
                        {metrics?.transaction_counts?.[item.key] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Health Quick Totals */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-emerald-400" />
                    User Directory Totals
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-sm font-semibold text-slate-300">Registered Sellers</span>
                      <span className="text-lg font-black text-white">{metrics?.total_sellers || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-sm font-semibold text-slate-300">Unique Buyers</span>
                      <span className="text-lg font-black text-white">{metrics?.total_buyers || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-sm font-semibold text-slate-300">Total Lifecycle Orders</span>
                      <span className="text-lg font-black text-white">{metrics?.total_transactions || 0}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('BROADCAST')}
                  className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                >
                  <Send className="h-4 w-4" />
                  Launch Broadcast Studio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: ALL TRANSACTIONS ────────────────────────────────────────── */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search Reference, Buyer Name, Buyer Phone, Seller, or Product..."
                  value={txnSearch}
                  onChange={e => setTxnSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={txnStatus}
                  onChange={e => setTxnStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All States</option>
                  <option value="AWAITING_PAYMENT">Awaiting Payment</option>
                  <option value="PAYMENT_RECEIVED">Payment Received</option>
                  <option value="DELIVERY_IN_PROGRESS">Delivery In Progress</option>
                  <option value="INSPECTION_PERIOD">Inspection Period</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DISPUTED">Disputed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
            </div>

            {/* Transactions Datatable */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-4">Reference</th>
                      <th className="px-5 py-4">Item & Seller</th>
                      <th className="px-5 py-4">Buyer Details</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {txnsLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">Loading transactions database…</td>
                      </tr>
                    ) : txnsData?.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">No transactions match the filter criteria.</td>
                      </tr>
                    ) : (
                      txnsData?.items.map(t => (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-5 py-4 font-mono font-bold text-blue-400">{t.paystack_reference}</td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-white">{t.title}</p>
                            <p className="text-xs text-slate-500">Seller: @{t.seller_username}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-200">{t.buyer_name}</p>
                            <p className="text-xs text-slate-400 font-mono">{t.buyer_phone}</p>
                          </td>
                          <td className="px-5 py-4 font-extrabold text-white">
                            GHS {t.total_amount_ghs.toFixed(2)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                              t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              t.status === 'DISPUTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              t.status === 'INSPECTION_PERIOD' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              t.status === 'DELIVERY_IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                              t.status === 'PAYMENT_RECEIVED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setSelectedTxnId(t.id)}
                              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-slate-700"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-400" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: DISPUTES CENTER ──────────────────────────────────────────── */}
        {activeTab === 'DISPUTES' && (
          <div className="space-y-6">
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4">
              <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-rose-300">Manager Dispute Arbitration Queue</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Transactions listed here have had auto-payouts frozen by a buyer dispute claim. Platform managers can review evidence, logs, and issue final binding settlements.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {disputesLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">Loading disputes queue…</div>
              ) : disputes?.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  No active disputes pending resolution!
                </div>
              ) : (
                disputes?.map((d: any) => (
                  <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                          {d.paystack_reference}
                        </span>
                        <h4 className="text-lg font-bold text-white">{d.link_title}</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                        <div>
                          <p className="text-slate-500 font-mono">SELLER DETAILS</p>
                          <p className="font-bold text-slate-200 mt-1">@{d.seller_username}</p>
                          <p className="text-slate-400">{d.seller_phone || 'No phone'}</p>
                          <p className="text-slate-400">{d.seller_email || 'No email'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-mono">BUYER DETAILS</p>
                          <p className="font-bold text-slate-200 mt-1">{d.buyer_name}</p>
                          <p className="text-slate-400 font-mono">{d.buyer_phone}</p>
                          <p className="text-slate-400">{d.buyer_email || 'No email'}</p>
                        </div>
                      </div>

                      {/* Dispute Evidence Photos & Text */}
                      <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                        {d.buyer_dispute_reason && (
                          <div>
                            <span className="font-mono text-rose-400 font-bold uppercase block mb-1">BUYER CLAIM REASON:</span>
                            <p className="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">{d.buyer_dispute_reason}</p>
                          </div>
                        )}

                        {d.buyer_dispute_photos && d.buyer_dispute_photos.length > 0 && (
                          <div>
                            <span className="font-mono text-slate-400 text-[11px] block mb-1.5">BUYER EVIDENCE PHOTOS ({d.buyer_dispute_photos.length}/5):</span>
                            <div className="flex flex-wrap gap-2">
                              {d.buyer_dispute_photos.map((url: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`Buyer evidence ${idx + 1}`}
                                  onClick={() => setPreviewImage(url)}
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-700 hover:border-rose-500 hover:scale-105 transition cursor-pointer"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {d.seller_dispute_response && (
                          <div className="pt-2 border-t border-slate-800">
                            <span className="font-mono text-blue-400 font-bold uppercase block mb-1">SELLER RESPONSE:</span>
                            <p className="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">{d.seller_dispute_response}</p>
                          </div>
                        )}

                        {d.seller_dispute_photos && d.seller_dispute_photos.length > 0 && (
                          <div>
                            <span className="font-mono text-slate-400 text-[11px] block mb-1.5">SELLER EVIDENCE PHOTOS ({d.seller_dispute_photos.length}/5):</span>
                            <div className="flex flex-wrap gap-2">
                              {d.seller_dispute_photos.map((url: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`Seller evidence ${idx + 1}`}
                                  onClick={() => setPreviewImage(url)}
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-700 hover:border-blue-500 hover:scale-105 transition cursor-pointer"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {d.manager_dispute_notes && (
                          <div className="pt-2 border-t border-slate-800">
                            <span className="font-mono text-amber-400 font-bold uppercase block mb-1">MANAGER RULING NOTES:</span>
                            <p className="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">{d.manager_dispute_notes}</p>
                          </div>
                        )}

                        {d.manager_dispute_photos && d.manager_dispute_photos.length > 0 && (
                          <div>
                            <span className="font-mono text-amber-400 text-[11px] block mb-1.5">MANAGER RULING PHOTOS ({d.manager_dispute_photos.length}/5):</span>
                            <div className="flex flex-wrap gap-2">
                              {d.manager_dispute_photos.map((url: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`Manager photo ${idx + 1}`}
                                  onClick={() => setPreviewImage(url)}
                                  className="w-16 h-16 object-cover rounded-lg border border-slate-700 hover:border-amber-500 hover:scale-105 transition cursor-pointer"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {d.delivery_method && (
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-400" />
                          <span>Delivery Method: <strong>{d.delivery_method}</strong></span>
                          {d.courier_name && <span>({d.courier_name} - #{d.tracking_number})</span>}
                          {d.driver_phone && <span>(Driver: {d.driver_phone} @ {d.destination_station})</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-between items-end gap-4 min-w-[220px]">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 uppercase font-mono">Disputed Amount</span>
                        <p className="text-2xl font-black text-rose-400">GHS {d.total_amount_ghs.toFixed(2)}</p>
                      </div>

                      <button
                        onClick={() => { setResolvingTxnId(d.id); setResolveMsg(''); }}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Resolve Dispute
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: SELLER VERIFICATIONS ───────────────────────────────────────── */}
        {activeTab === 'VERIFICATIONS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-400" /> Seller Verification Document Approvals ({verifications.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Inspect submitted National IDs & Business Licenses. Verified Seller badges are ONLY granted upon manager approval.</p>
              </div>
              <button
                onClick={fetchVerifications}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Refresh Submissions
              </button>
            </div>

            <div className="space-y-4">
              {loadingVerifs ? (
                <div className="py-12 text-center text-slate-400">Loading verifications...</div>
              ) : verifications.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                  No seller verification submissions found.
                </div>
              ) : (
                verifications.map(v => (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-white text-base">@{v.username}</span>
                          <span className="text-xs text-slate-400">({v.shop_name})</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            v.verification_status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            v.verification_status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {v.verification_status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">Phone: {v.phone_number} • Email: {v.email || 'N/A'}</p>
                      </div>

                      <div className="flex gap-2">
                        {v.verification_status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveVerification(v.id)}
                            disabled={isActioningVerif}
                            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <ShieldCheck className="h-4 w-4" /> Approve & Grant Verified Badge
                          </button>
                        )}
                        {v.verification_status !== 'REJECTED' && (
                          <button
                            onClick={() => { setRejectUserId(v.id); setRejectReason(''); }}
                            className="py-2 px-4 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/50 font-bold text-xs rounded-xl transition"
                          >
                            Reject Document
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Document Details & Photos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <span className="font-bold text-slate-300 block border-b border-slate-800 pb-1">🪪 National ID / Ghana Card</span>
                        <p className="text-slate-400">ID Number: <strong className="text-white font-mono">{v.national_id_number || 'N/A'}</strong></p>
                        {v.national_id_photo_url ? (
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Click to inspect:</span>
                            <img
                              src={v.national_id_photo_url}
                              alt="National ID"
                              onClick={() => setPreviewImage(v.national_id_photo_url)}
                              className="h-28 w-44 object-cover rounded-lg border border-slate-700 hover:border-emerald-500 transition cursor-pointer"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-500 italic block">No photo uploaded</span>
                        )}
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <span className="font-bold text-slate-300 block border-b border-slate-800 pb-1">📄 Business Registration License</span>
                        {v.business_license_photo_url ? (
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-1">Click to inspect:</span>
                            <img
                              src={v.business_license_photo_url}
                              alt="Business License"
                              onClick={() => setPreviewImage(v.business_license_photo_url)}
                              className="h-28 w-44 object-cover rounded-lg border border-slate-700 hover:border-blue-500 transition cursor-pointer"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-500 italic block mt-2">No business license uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── MODAL: REJECT VERIFICATION ────────────────────────────────────────── */}
        {rejectUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h4 className="text-base font-bold text-white">Reject Seller Verification</h4>
              <form onSubmit={handleRejectVerification} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Rejection *</label>
                  <textarea
                    required
                    rows={3}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="e.g. Ghana Card photo is blurry or ID number does not match image..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectUserId(null)}
                    className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isActioningVerif}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── TAB: PLATFORM FUNDS & LEDGER AUDIT ─────────────────────────────── */}
        {activeTab === 'FUNDS' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-400" /> Platform Funds & Immutable Double-Entry Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time accounting breakdown of system bank assets, escrow liabilities, seller balances, platform fee revenues, and transaction entries.</p>
              </div>
              <button
                onClick={() => { fetchFundsAccounts(); fetchLedgerEntries(); }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-blue-400" /> Refresh Ledger
              </button>
            </div>

            {/* Summary Stat Cards */}
            {fundsSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. System Bank Asset */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">🏦 System Bank Asset</span>
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><TrendingUp className="h-4 w-4" /></div>
                  </div>
                  <p className="text-2xl font-black text-white mt-2">GHS {fundsSummary.system_bank_asset_ghs.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Gross bank & gateway clearing funds</p>
                </div>

                {/* 2. Buyer Escrow Deposit */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">🔒 Active Escrow Liabilities</span>
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl"><Lock className="h-4 w-4" /></div>
                  </div>
                  <p className="text-2xl font-black text-amber-300 mt-2">GHS {fundsSummary.buyer_escrow_deposit_ghs.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Locked in escrow for active orders</p>
                </div>

                {/* 3. Platform Fee Revenue */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">📈 Platform Fee Revenue</span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><DollarSign className="h-4 w-4" /></div>
                  </div>
                  <p className="text-2xl font-black text-emerald-400 mt-2">GHS {fundsSummary.platform_revenue_ghs.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Escrow fees + Paid ad promotions</p>
                </div>

                {/* 4. Seller Wallets Liabilities */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">💼 Seller Wallet Balances</span>
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl"><Users className="h-4 w-4" /></div>
                  </div>
                  <p className="text-2xl font-black text-indigo-300 mt-2">GHS {fundsSummary.seller_wallets_liabilities_ghs.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Withdrawable seller funds</p>
                </div>

              </div>
            )}

            {/* Filter & Search Bar for Ledger Entries */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-400" /> Ledger Audit Filters & Sorting
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total Filtered: <strong>{ledgerTotalCount} entries</strong></span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    GHS {ledgerTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                
                {/* Entry Type Filter */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Entry Type</label>
                  <select
                    value={entryTypeFilter}
                    onChange={e => setEntryTypeFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Entry Types</option>
                    <option value="BUYER_DEPOSIT">BUYER_DEPOSIT</option>
                    <option value="ESCROW_RELEASE">ESCROW_RELEASE</option>
                    <option value="AD_PROMOTION_FEE">AD_PROMOTION_FEE</option>
                    <option value="FULL_REFUND">FULL_REFUND</option>
                    <option value="PARTIAL_REFUND">PARTIAL_REFUND</option>
                    <option value="WITHDRAWAL">WITHDRAWAL</option>
                  </select>
                </div>

                {/* Account Type Filter */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Account Type</label>
                  <select
                    value={accountTypeFilter}
                    onChange={e => setAccountTypeFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Account Types</option>
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="REVENUE">REVENUE</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>

                {/* Specific Account Filter */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Specific Account</label>
                  <select
                    value={accountIdFilter}
                    onChange={e => setAccountIdFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Accounts ({accountsList.length})</option>
                    {accountsList.map(acc => (
                      <option key={acc.id} value={acc.name}>
                        {acc.name} ({acc.account_type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={e => setStartDateFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={e => setEndDateFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Sort By</label>
                  <select
                    value={ledgerSortBy}
                    onChange={e => setLedgerSortBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="timestamp">Timestamp / Date</option>
                    <option value="amount_ghs">Amount (GHS)</option>
                    <option value="entry_type">Entry Type</option>
                    <option value="debit_account">Debit Account</option>
                    <option value="credit_account">Credit Account</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Order</label>
                  <select
                    value={ledgerOrder}
                    onChange={e => setLedgerOrder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">Descending (Newest / Highest)</option>
                    <option value="asc">Ascending (Oldest / Lowest)</option>
                  </select>
                </div>

              </div>

              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search ledger entries by reference UUID, account name, or type..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Ledger Audit Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Detailed Transaction Entries</span>
                <span className="text-[11px] text-slate-500">Showing up to 100 entries per query</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Entry Type</th>
                      <th className="py-3 px-4">Debit Account</th>
                      <th className="py-3 px-4">Credit Account</th>
                      <th className="py-3 px-4 text-right">Amount (GHS)</th>
                      <th className="py-3 px-4">Reference ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {loadingFunds ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">Loading ledger entries...</td>
                      </tr>
                    ) : ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">No ledger entries match the selected filters.</td>
                      </tr>
                    ) : (
                      ledgerEntries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                            {new Date(entry.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              entry.entry_type === 'BUYER_DEPOSIT' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                              entry.entry_type === 'ESCROW_RELEASE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                              entry.entry_type === 'AD_PROMOTION_FEE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                              entry.entry_type.includes('REFUND') ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                              'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            }`}>
                              {entry.entry_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {entry.debit_account_name}
                            <span className="text-[10px] text-slate-500 block">({entry.debit_account_type})</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {entry.credit_account_name}
                            <span className="text-[10px] text-slate-500 block">({entry.credit_account_type})</span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white font-mono">
                            GHS {entry.amount_ghs.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                            {entry.reference_id}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: SELLERS DIRECTORY ───────────────────────────────────────── */}
        {activeTab === 'SELLERS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search sellers by username, email, or phone..."
                  value={sellerSearch}
                  onChange={e => setSellerSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-4">Seller Username</th>
                      <th className="px-5 py-4">Contact Info</th>
                      <th className="px-5 py-4">Payout Mode</th>
                      <th className="px-5 py-4">Payment Links</th>
                      <th className="px-5 py-4">Completed GMV</th>
                      <th className="px-5 py-4">Wallet Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sellersLoading ? (
                      <tr><td colSpan={6} className="text-center py-12 text-slate-500">Loading sellers directory…</td></tr>
                    ) : sellers?.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-slate-500">No sellers found.</td></tr>
                    ) : (
                      sellers?.map(s => (
                        <tr key={s.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-5 py-4 font-bold text-white">@{s.username}</td>
                          <td className="px-5 py-4">
                            <p className="text-xs text-slate-200">{s.email || 'No Email'}</p>
                            <p className="text-xs text-slate-400 font-mono">{s.phone_number || 'No Phone'}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 bg-slate-800 text-slate-300 font-mono text-xs rounded-md border border-slate-700">
                              {s.payout_mode}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-200">{s.payment_links_count} links</td>
                          <td className="px-5 py-4 font-extrabold text-emerald-400">GHS {s.completed_gmv_ghs.toFixed(2)}</td>
                          <td className="px-5 py-4 font-extrabold text-blue-400">GHS {s.wallet_balance_ghs.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: BUYER PHONE REGISTRY ────────────────────────────────────── */}
        {activeTab === 'BUYERS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search buyer by phone number, name, or email..."
                  value={buyerSearch}
                  onChange={e => setBuyerSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-xs border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-4">Buyer Phone Number</th>
                      <th className="px-5 py-4">Buyer Name & Email</th>
                      <th className="px-5 py-4">Total Orders</th>
                      <th className="px-5 py-4">Active Escrow Holds</th>
                      <th className="px-5 py-4">Disputed Orders</th>
                      <th className="px-5 py-4">Total Lifetime Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {buyersLoading ? (
                      <tr><td colSpan={6} className="text-center py-12 text-slate-500">Loading buyers registry…</td></tr>
                    ) : buyers?.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-slate-500">No buyers found matching search.</td></tr>
                    ) : (
                      buyers?.map(b => (
                        <tr key={b.buyer_phone} className="hover:bg-slate-800/40 transition">
                          <td className="px-5 py-4 font-mono font-bold text-blue-400">{b.buyer_phone}</td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-white">{b.buyer_name}</p>
                            <p className="text-xs text-slate-400">{b.buyer_email || 'No email'}</p>
                          </td>
                          <td className="px-5 py-4 font-bold text-slate-200">{b.total_orders} orders</td>
                          <td className="px-5 py-4">
                            {b.active_escrow_orders > 0 ? (
                              <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 font-bold text-xs rounded-full border border-indigo-500/30">
                                {b.active_escrow_orders} Active
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">0 Active</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {b.disputed_orders > 0 ? (
                              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 font-bold text-xs rounded-full border border-rose-500/30">
                                {b.disputed_orders} Disputed
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">None</span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-extrabold text-emerald-400">GHS {b.total_spent_ghs.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: BROADCAST MESSAGING STUDIO ─────────────────────────────── */}
        {activeTab === 'BROADCAST' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-400" />
                Broadcast SMS & Email Notification Studio
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Send targeted announcements, system maintenance warnings, or reminder notifications to specific user cohorts across SMS (via MNotify) and Email channels.
              </p>

              <form onSubmit={handleSendBroadcast} className="space-y-5">
                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Target Audience Cohort *</label>
                  <select
                    value={targetGroup}
                    onChange={e => setTargetGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-semibold rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL_USERS">All Platform Users & Buyers</option>
                    <option value="ALL_SELLERS">All Registered Sellers Only</option>
                    <option value="ALL_BUYERS">All Registered / Order Buyers Only</option>
                    <option value="USERS_WITH_ACTIVE_ESCROW">Users with Active Escrow Orders</option>
                    <option value="USERS_WITH_DISPUTES">Users with Open Disputes</option>
                    <option value="CUSTOM">Custom Recipients List (Phone / Email)</option>
                  </select>
                </div>

                {targetGroup === 'CUSTOM' && (
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Custom Recipients (Comma / Newline Separated)</label>
                    <textarea
                      rows={3}
                      value={customRecipients}
                      onChange={e => setCustomRecipients(e.target.value)}
                      placeholder="0244123456, buyer@example.com, 0501234567"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                )}

                {/* Communication Channel */}
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Delivery Channels *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['SMS', 'EMAIL', 'BOTH'].map(ch => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChannels(ch)}
                        className={`py-2.5 rounded-xl text-xs font-bold transition border ${
                          channels === ch 
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject (for Email) */}
                {(channels === 'EMAIL' || channels === 'BOTH') && (
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Email Subject Line</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Broadcast Message Content *</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Enter message text to broadcast..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-between items-center text-xs text-slate-500 mt-1.5 font-mono">
                    <span>Characters: {message.length}</span>
                    <span>SMS Segments: {Math.ceil(message.length / 160) || 1}</span>
                  </div>
                </div>

                {broadcastResult && (
                  <div className={`p-4 rounded-xl text-sm font-semibold border ${
                    broadcastResult.includes('dispatched') 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    {broadcastResult}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={broadcastMutation.isPending}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-50"
                >
                  {broadcastMutation.isPending ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  {broadcastMutation.isPending ? 'Dispatching Broadcast…' : 'Send Broadcast Notification'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ─── MODAL: INSPECT TRANSACTION DETAIL ───────────────────────────────── */}
      {selectedTxnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="text-base font-bold text-white">Transaction Deep Inspection</h3>
                <p className="text-xs font-mono text-blue-400">{txnDetail?.paystack_reference}</p>
              </div>
              <button onClick={() => setSelectedTxnId(null)} className="text-slate-400 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
              {detailLoading ? (
                <div className="py-12 text-center text-slate-500">Fetching audit trail…</div>
              ) : (
                <>
                  {/* Summary Header */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 font-mono">PRODUCT TITLE</span>
                      <p className="font-bold text-white text-sm mt-0.5">{txnDetail?.title}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">TOTAL AMOUNT</span>
                      <p className="font-black text-emerald-400 text-base mt-0.5">GHS {txnDetail?.total_amount_ghs?.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Buyer & Seller */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 font-mono">SELLER ACCOUNT</span>
                      <p className="font-bold text-slate-200 mt-1">@{txnDetail?.seller?.username}</p>
                      <p className="text-slate-400">{txnDetail?.seller?.phone_number}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">BUYER DETAILS</span>
                      <p className="font-bold text-slate-200 mt-1">{txnDetail?.buyer?.name}</p>
                      <p className="text-slate-400 font-mono">{txnDetail?.buyer?.phone}</p>
                      <p className="text-slate-400 mt-0.5">{txnDetail?.buyer?.shipping_address}</p>
                    </div>
                  </div>

                  {/* Delivery Logs */}
                  <div>
                    <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-blue-400" />
                      Delivery Logs & Status
                    </h4>
                    {txnDetail?.delivery_logs?.length === 0 ? (
                      <p className="text-slate-500 italic">No delivery log recorded yet.</p>
                    ) : (
                      txnDetail?.delivery_logs?.map((l: any) => (
                        <div key={l.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 mb-2">
                          <div className="flex justify-between font-bold text-slate-200">
                            <span>Method: {l.delivery_method}</span>
                            <span className="text-slate-500 text-[10px]">{new Date(l.created_at).toLocaleString()}</span>
                          </div>
                          {l.courier_name && <p className="text-slate-400">Courier: {l.courier_name} (#{l.tracking_number})</p>}
                          {l.driver_phone && <p className="text-slate-400">Driver: {l.driver_phone} | Vehicle: {l.driver_car_number || 'N/A'} | Station: {l.destination_station}</p>}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Ledger Entries Audit */}
                  <div>
                    <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      Double-Entry Ledger Audit Trail
                    </h4>
                    <div className="space-y-1.5">
                      {txnDetail?.ledger_entries?.map((e: any) => (
                        <div key={e.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center font-mono">
                          <div>
                            <span className="text-blue-400 font-bold">{e.entry_type}</span>
                            <p className="text-[10px] text-slate-500">{e.debit_account} → {e.credit_account}</p>
                          </div>
                          <span className="font-bold text-emerald-400">GHS {e.amount_ghs.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTxnId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg transition"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: RESOLVE DISPUTE ──────────────────────────────────────────── */}
      {resolvingTxnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Arbitrate Dispute Claim
              </h3>
              <button onClick={() => setResolvingTxnId(null)} className="text-slate-400 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResolveDispute} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono uppercase mb-1">Arbitration Resolution Action *</label>
                <select
                  value={resolveAction}
                  onChange={e => setResolveAction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-bold rounded-xl p-3 text-sm focus:outline-none focus:border-rose-500"
                >
                  <option value="RELEASE_TO_SELLER">RELEASE_TO_SELLER — Mark Completed & Release Escrow to Seller</option>
                  <option value="FULL_REFUND_TO_BUYER">FULL_REFUND_TO_BUYER — 100% Refund Buyer & Charge Seller Penalty</option>
                  <option value="PARTIAL_REFUND_TO_BUYER">PARTIAL_REFUND_TO_BUYER — Custom Split (Buyer, Seller & Platform)</option>
                </select>
              </div>

              {resolveAction === 'PARTIAL_REFUND_TO_BUYER' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono border-b border-slate-800 pb-2">
                    <span>TOTAL PAID BY BUYER:</span>
                    <span className="font-bold text-emerald-400">GHS {totalPaidByBuyer.toFixed(2)}</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">1. Buyer Refund Amount (GHS)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalPaidByBuyer}
                      value={refundAmountGhs !== undefined ? (Math.round((Number(refundAmountGhs) + Number.EPSILON) * 100) / 100) : ''}
                      onChange={e => {
                        const r = Math.round(((parseFloat(e.target.value) || 0) + Number.EPSILON) * 100) / 100;
                        setRefundAmountGhs(r);
                        const rem = Math.round((Math.max(0, totalPaidByBuyer - r) + Number.EPSILON) * 100) / 100;
                        setSellerAmountGhs(rem);
                        setPlatformFeeGhs(0);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">2. Seller Payout Amount (GHS)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalPaidByBuyer}
                      value={sellerAmountGhs !== undefined ? (Math.round((Number(sellerAmountGhs) + Number.EPSILON) * 100) / 100) : ''}
                      onChange={e => {
                        const s = Math.round(((parseFloat(e.target.value) || 0) + Number.EPSILON) * 100) / 100;
                        setSellerAmountGhs(s);
                        const rem = Math.round((Math.max(0, totalPaidByBuyer - (Number(refundAmountGhs) || 0) - s) + Number.EPSILON) * 100) / 100;
                        setPlatformFeeGhs(rem);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono uppercase mb-1">3. Platform Retained Fee (GHS)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalPaidByBuyer}
                      value={platformFeeGhs !== undefined ? (Math.round((Number(platformFeeGhs) + Number.EPSILON) * 100) / 100) : ''}
                      onChange={e => {
                        const p = Math.round(((parseFloat(e.target.value) || 0) + Number.EPSILON) * 100) / 100;
                        setPlatformFeeGhs(p);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className={`p-2.5 rounded-lg text-xs font-mono flex justify-between items-center ${
                    isPartialOverLimit 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                      : 'bg-slate-900 text-slate-300 border border-slate-800'
                  }`}>
                    <span>SUM OF SPLIT: GHS {partialSum.toFixed(2)}</span>
                    <span>{totalPaidByBuyer > 0 ? ((partialSum / totalPaidByBuyer) * 100).toFixed(1) : 0}%</span>
                  </div>
                  {isPartialOverLimit && (
                    <p className="text-rose-400 text-[11px] font-bold">
                      ⚠️ Sum exceeds buyer payment (GHS {totalPaidByBuyer.toFixed(2)}) by GHS {(partialSum - totalPaidByBuyer).toFixed(2)}!
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-mono uppercase mb-1">Manager Arbitration Notes / Reason</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Record formal arbitration ruling notes..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-400 font-mono uppercase">Upload Manager Evidence Photos</label>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">{managerPhotos.length}/5 photos</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={managerPhotos.length >= 5}
                  onChange={handleManagerPhotoUpload}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30 cursor-pointer disabled:opacity-50"
                />
                {managerPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {managerPhotos.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt={`Manager ${idx + 1}`} className="w-14 h-14 object-cover rounded-lg border border-slate-700" />
                        <button
                          type="button"
                          onClick={() => setManagerPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {resolveMsg && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  resolveMsg.includes('released') || resolveMsg.includes('refund') 
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}>
                  {resolveMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setResolvingTxnId(null); setManagerPhotos([]); }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveMutation.isPending}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  {resolveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                  Confirm Ruling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: LIGHTBOX PHOTO PREVIEW ──────────────────────────────────────── */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img src={previewImage} alt="Evidence inspection" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800" />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 bg-rose-600 text-white p-2 rounded-full shadow-lg hover:bg-rose-500 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
