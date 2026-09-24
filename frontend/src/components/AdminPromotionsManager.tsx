import React, { useState, useEffect } from 'react';
import { 
  Gift, Percent, Sparkles, Tag, Plus, Trash2, CheckCircle2, 
  AlertCircle, RefreshCw, Calendar, Clock, DollarSign, Users, X,
  Eye, History, ShoppingBag, ExternalLink, Edit3, Search,
  Layers, UserPlus, Sliders, TrendingUp, Award, Check, Flame
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useEscapeKey } from '../utils/useEscapeKey';
import { ExportButton } from './ExportButton';
import type { ExportColumn } from '../utils/exportUtils';

export interface AdminPromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED_GHS';
  discount_value: number;
  max_discount_cap_ghs?: number | null;
  min_order_amount_ghs: number;
  usage_limit?: number | null;
  usage_count: number;
  per_buyer_limit: number;
  eligible_role: 'ALL' | 'BUYER_ONLY' | 'SELLER_ONLY';
  is_active: boolean;
  expires_at?: string | null;
  created_at: string;
  redemptions_count: number;
  total_subsidized_ghs: number;
}

export interface PromoRedemption {
  id: string;
  promo_code: string;
  promo_code_id?: string | null;
  transaction_id: string;
  paystack_reference: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  seller_name: string;
  seller_username: string;
  discount_applied_ghs: number;
  order_total_ghs: number;
  transaction_status: string;
  created_at: string;
}

export interface SeasonalFeeCampaign {
  id: string;
  name: string;
  description: string;
  fee_rule_type: string;
  rule_value: number;
  min_order_amount_ghs: number;
  max_discount_cap_ghs?: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  orders_count?: number;
  total_subsidized_ghs?: number;
  created_at?: string;
}

export interface SeasonalFeeOrder {
  id: string;
  campaign_id?: string | null;
  campaign_name: string;
  paystack_reference: string;
  item_title: string;
  buyer_name: string;
  buyer_phone: string;
  seller_name: string;
  seller_username: string;
  order_total_ghs: number;
  platform_fee_ghs: number;
  seasonal_discount_ghs: number;
  status: string;
  created_at: string;
}

export interface TransactionRewardCampaign {
  id: string;
  name: string;
  description: string;
  target_role: string;
  reward_type: string;
  reward_value: number;
  min_order_amount_ghs: number;
  max_reward_cap_ghs?: number | null;
  validity_days: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface ReferralAuditRecord {
  id: string;
  referrer_name: string;
  referrer_username: string;
  referrer_phone: string;
  referee_name: string;
  referee_username: string;
  referee_phone: string;
  status: string;
  qualifying_transaction_id?: string | null;
  qualifying_reference?: string | null;
  qualifying_amount_ghs?: number | null;
  referrer_reward_ghs: number;
  referee_reward_ghs: number;
  created_at: string;
  completed_at?: string | null;
}

export interface CashbackLedgerRecord {
  id: string;
  recipient_type: string;
  recipient_identifier: string;
  recipient_name: string;
  amount_ghs: number;
  entry_type: string;
  reference_id: string;
  transaction_id?: string | null;
  transaction_reference?: string | null;
  notes: string;
  expires_at?: string | null;
  created_at: string;
}

export interface ReferralSettings {
  referral_program_active: boolean;
  referrer_reward_ghs: number;
  referee_reward_ghs: number;
  min_order_amount_for_referral_ghs: number;
  max_referrals_per_user: number;
}

const formatGHS = (val?: number | null | string): string => {
  if (val === undefined || val === null) return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

const promoExportHeaders: ExportColumn[] = [
  { label: 'Code', key: 'code' },
  { label: 'Description', key: 'description' },
  { label: 'Discount Type', key: 'discount_type' },
  { label: 'Discount Value', key: 'discount_value' },
  { label: 'Max Cap (GHS)', key: 'max_discount_cap_ghs' },
  { label: 'Min Order (GHS)', key: 'min_order_amount_ghs' },
  { label: 'Usage Count', key: 'usage_count' },
  { label: 'Usage Limit', key: 'usage_limit' },
  { label: 'Total Subsidized (GHS)', key: 'total_subsidized_ghs' },
  { label: 'Status', key: 'is_active' },
  { label: 'Role Allowed', key: 'eligible_role' },
  { label: 'Expires At', key: 'expires_at' },
];

const redemptionsExportHeaders: ExportColumn[] = [
  { label: 'Redemption Date', key: 'created_at' },
  { label: 'Promo Code', key: 'promo_code' },
  { label: 'Buyer Name', key: 'buyer_name' },
  { label: 'Buyer Phone', key: 'buyer_phone' },
  { label: 'Buyer Email', key: 'buyer_email' },
  { label: 'Order Reference', key: 'paystack_reference' },
  { label: 'Seller Name', key: 'seller_name' },
  { label: 'Order Total (GHS)', key: 'order_total_ghs' },
  { label: 'Discount Subsidized (GHS)', key: 'discount_applied_ghs' },
  { label: 'Status', key: 'transaction_status' },
];

const seasonalOrdersExportHeaders: ExportColumn[] = [
  { label: 'Date', key: 'created_at' },
  { label: 'Campaign', key: 'campaign_name' },
  { label: 'Order Reference', key: 'paystack_reference' },
  { label: 'Product Title', key: 'item_title' },
  { label: 'Buyer', key: 'buyer_name' },
  { label: 'Seller', key: 'seller_name' },
  { label: 'Order Amount (GHS)', key: 'order_total_ghs' },
  { label: 'Standard Fee (GHS)', key: 'platform_fee_ghs' },
  { label: 'Fee Discount Granted (GHS)', key: 'seasonal_discount_ghs' },
  { label: 'Status', key: 'status' },
];

const referralExportHeaders: ExportColumn[] = [
  { label: 'Date Registered', key: 'created_at' },
  { label: 'Referrer Name', key: 'referrer_name' },
  { label: 'Referrer Phone', key: 'referrer_phone' },
  { label: 'Referee Name', key: 'referee_name' },
  { label: 'Referee Phone', key: 'referee_phone' },
  { label: 'Status', key: 'status' },
  { label: 'Qualifying Order Ref', key: 'qualifying_reference' },
  { label: 'Order Total (GHS)', key: 'qualifying_amount_ghs' },
  { label: 'Referrer Reward (GHS)', key: 'referrer_reward_ghs' },
  { label: 'Referee Reward (GHS)', key: 'referee_reward_ghs' },
  { label: 'Completed At', key: 'completed_at' },
];

const cashbackExportHeaders: ExportColumn[] = [
  { label: 'Date & Time', key: 'created_at' },
  { label: 'Recipient Name', key: 'recipient_name' },
  { label: 'Recipient Handle/Phone', key: 'recipient_identifier' },
  { label: 'Role Type', key: 'recipient_type' },
  { label: 'Entry Type', key: 'entry_type' },
  { label: 'Amount (GHS)', key: 'amount_ghs' },
  { label: 'Order Reference', key: 'transaction_reference' },
  { label: 'Reference Key', key: 'reference_id' },
  { label: 'Notes', key: 'notes' },
];

interface AdminPromotionsManagerProps {
  platformSettings: any;
  onUpdateSettings: (updates: any) => Promise<void>;
  onInspectTransaction?: (txnId: string) => void;
}

export const AdminPromotionsManager: React.FC<AdminPromotionsManagerProps> = ({
  platformSettings,
  onUpdateSettings,
  onInspectTransaction
}) => {
  const [activeTab, setActiveTab] = useState<
    'CAMPAIGNS' | 'GLOBAL_HISTORY' | 'SEASONAL_HISTORY' | 'REFERRAL_AUDIT' | 'CASHBACK_LEDGER'
  >('CAMPAIGNS');

  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');

  // 1. Promo Codes State
  const [promoCodes, setPromoCodes] = useState<AdminPromoCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // 2. Global Redemptions Audit State
  const [globalRedemptions, setGlobalRedemptions] = useState<PromoRedemption[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<{
    total_count: number;
    total_subsidy_ghs: number;
    unique_buyers_count: number;
    avg_discount_ghs: number;
  }>({
    total_count: 0,
    total_subsidy_ghs: 0,
    unique_buyers_count: 0,
    avg_discount_ghs: 0
  });
  const [loadingGlobalRedemptions, setLoadingGlobalRedemptions] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyCodeFilter, setHistoryCodeFilter] = useState('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // 3. Seasonal Fee Overrides State
  const [seasonalCampaigns, setSeasonalCampaigns] = useState<SeasonalFeeCampaign[]>([]);
  const [loadingSeasonal, setLoadingSeasonal] = useState(false);
  const [seasonalOrders, setSeasonalOrders] = useState<SeasonalFeeOrder[]>([]);
  const [seasonalMetrics, setSeasonalMetrics] = useState<{
    total_count: number;
    total_subsidized_ghs: number;
    avg_discount_ghs: number;
    total_volume_ghs: number;
    unique_sellers_count: number;
  }>({
    total_count: 0,
    total_subsidized_ghs: 0,
    avg_discount_ghs: 0,
    total_volume_ghs: 0,
    unique_sellers_count: 0
  });
  const [loadingSeasonalOrders, setLoadingSeasonalOrders] = useState(false);
  const [seasonalSearch, setSeasonalSearch] = useState('');
  const [seasonalCampaignFilter, setSeasonalCampaignFilter] = useState('ALL');

  // 4. Transaction Reward / Cashback Campaigns State
  const [rewardCampaigns, setRewardCampaigns] = useState<TransactionRewardCampaign[]>([]);
  const [loadingRewardCampaigns, setLoadingRewardCampaigns] = useState(false);

  // 5. Referral Program Settings & Audit State
  const [referralSettings, setReferralSettings] = useState<ReferralSettings>({
    referral_program_active: true,
    referrer_reward_ghs: 10.0,
    referee_reward_ghs: 5.0,
    min_order_amount_for_referral_ghs: 50.0,
    max_referrals_per_user: 50
  });
  const [savingReferralSettings, setSavingReferralSettings] = useState(false);
  const [referralAuditRecords, setReferralAuditRecords] = useState<ReferralAuditRecord[]>([]);
  const [referralMetrics, setReferralMetrics] = useState<{
    total_referrals: number;
    qualifying_count: number;
    total_referrer_rewards_ghs: number;
    total_referee_rewards_ghs: number;
  }>({
    total_referrals: 0,
    qualifying_count: 0,
    total_referrer_rewards_ghs: 0,
    total_referee_rewards_ghs: 0
  });
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralSearch, setReferralSearch] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState('ALL');

  // 6. Cashback / Milestone Ledger State
  const [cashbackLedgerRecords, setCashbackLedgerRecords] = useState<CashbackLedgerRecord[]>([]);
  const [cashbackMetrics, setCashbackMetrics] = useState<{
    total_count: number;
    total_earned_ghs: number;
    total_redeemed_ghs: number;
  }>({
    total_count: 0,
    total_earned_ghs: 0,
    total_redeemed_ghs: 0
  });
  const [loadingCashbackLedger, setLoadingCashbackLedger] = useState(false);
  const [cashbackSearch, setCashbackSearch] = useState('');
  const [cashbackTypeFilter, setCashbackTypeFilter] = useState('ALL');

  // --- Modals State ---
  const [redemptionsModalOpen, setRedemptionsModalOpen] = useState(false);
  const [selectedPromoForRedemptions, setSelectedPromoForRedemptions] = useState<AdminPromoCode | null>(null);
  const [redemptions, setRedemptions] = useState<PromoRedemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [newCode, setNewCode] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_GHS',
    discount_value: 10,
    max_discount_cap_ghs: 25,
    min_order_amount_ghs: 0,
    usage_limit: 100,
    per_buyer_limit: 1,
    eligible_role: 'ALL' as 'ALL' | 'BUYER_ONLY' | 'SELLER_ONLY',
    expires_at: ''
  });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<AdminPromoCode | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    code: '',
    description: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_GHS',
    discount_value: 10,
    max_discount_cap_ghs: '' as number | '',
    min_order_amount_ghs: '' as number | '',
    usage_limit: '' as number | '',
    per_buyer_limit: 1,
    eligible_role: 'ALL' as 'ALL' | 'BUYER_ONLY' | 'SELLER_ONLY',
    expires_at: '',
    is_active: true
  });

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [isGrantingCredit, setIsGrantingCredit] = useState(false);
  const [grantForm, setGrantForm] = useState({
    target_type: 'BUYER' as 'BUYER' | 'SELLER',
    target_identifier: '',
    amount_ghs: 10,
    notes: '',
    validity_days: 90
  });

  const [seasonalModalOpen, setSeasonalModalOpen] = useState(false);
  const [editingSeasonal, setEditingSeasonal] = useState<SeasonalFeeCampaign | null>(null);
  const [isSubmittingSeasonal, setIsSubmittingSeasonal] = useState(false);
  const [seasonalForm, setSeasonalForm] = useState({
    name: '',
    description: '',
    fee_rule_type: 'WAIVED',
    rule_value: 0,
    min_order_amount_ghs: 0,
    start_date: '',
    end_date: '',
    is_active: true
  });

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<TransactionRewardCampaign | null>(null);
  const [isSubmittingReward, setIsSubmittingReward] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    target_role: 'ALL',
    reward_type: 'FIXED_GHS',
    reward_value: 5,
    min_order_amount_ghs: 0,
    max_reward_cap_ghs: '' as number | '',
    validity_days: 180,
    start_date: '',
    end_date: '',
    is_active: true
  });

  // Wire ESC key to modals
  useEscapeKey(() => setCreateModalOpen(false), createModalOpen);
  useEscapeKey(() => { setEditModalOpen(false); setEditingCode(null); }, editModalOpen);
  useEscapeKey(() => setGrantModalOpen(false), grantModalOpen);
  useEscapeKey(() => setRedemptionsModalOpen(false), redemptionsModalOpen);
  useEscapeKey(() => { setSeasonalModalOpen(false); setEditingSeasonal(null); }, seasonalModalOpen);
  useEscapeKey(() => { setRewardModalOpen(false); setEditingReward(null); }, rewardModalOpen);

  // --- Fetch API Handlers ---
  const fetchPromoCodes = async () => {
    try {
      setLoadingCodes(true);
      const res = await apiClient.get('/escrow/admin/promo-codes');
      setPromoCodes(res.data || []);
    } catch (err) {
      console.error('Failed to fetch promo codes:', err);
    } finally {
      setLoadingCodes(false);
    }
  };

  const fetchSeasonalCampaigns = async () => {
    try {
      setLoadingSeasonal(true);
      const res = await apiClient.get('/escrow/admin/seasonal-fees');
      setSeasonalCampaigns(res.data || []);
    } catch (err) {
      console.error('Failed to fetch seasonal campaigns:', err);
    } finally {
      setLoadingSeasonal(false);
    }
  };

  const fetchRewardCampaigns = async () => {
    try {
      setLoadingRewardCampaigns(true);
      const res = await apiClient.get('/escrow/admin/reward-campaigns');
      setRewardCampaigns(res.data || []);
    } catch (err) {
      console.error('Failed to fetch reward campaigns:', err);
    } finally {
      setLoadingRewardCampaigns(false);
    }
  };

  const fetchReferralSettings = async () => {
    try {
      const res = await apiClient.get('/users/admin/referral-settings');
      const data = res.data?.settings || res.data;
      if (data && typeof data.referral_program_active !== 'undefined') {
        setReferralSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch referral settings:', err);
    }
  };

  const handleSaveReferralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingReferralSettings(true);
      setActionMsg('');
      setActionError('');
      const res = await apiClient.put('/users/admin/referral-settings', referralSettings);
      const savedData = res.data?.settings || res.data;
      if (savedData && typeof savedData.referral_program_active !== 'undefined') {
        setReferralSettings(savedData);
      }
      setActionMsg('Referral program settings saved successfully!');
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to update referral settings.');
    } finally {
      setSavingReferralSettings(false);
    }
  };

  const fetchGlobalRedemptions = async () => {
    try {
      setLoadingGlobalRedemptions(true);
      const params: any = {};
      if (historyCodeFilter && historyCodeFilter !== 'ALL') params.promo_code = historyCodeFilter;
      if (historyStatusFilter && historyStatusFilter !== 'ALL') params.transaction_status = historyStatusFilter;
      if (historySearch.trim()) params.search = historySearch.trim();
      if (historyStartDate) params.start_date = historyStartDate;
      if (historyEndDate) params.end_date = historyEndDate;

      const res = await apiClient.get('/escrow/admin/promo-redemptions', { params });
      setGlobalRedemptions(res.data.items || []);
      setGlobalMetrics(res.data.metrics || {
        total_count: 0,
        total_subsidy_ghs: 0,
        unique_buyers_count: 0,
        avg_discount_ghs: 0
      });
    } catch (err) {
      console.error('Failed to fetch global promo redemptions:', err);
    } finally {
      setLoadingGlobalRedemptions(false);
    }
  };

  const fetchSeasonalOrders = async () => {
    try {
      setLoadingSeasonalOrders(true);
      const params: any = {};
      if (seasonalCampaignFilter && seasonalCampaignFilter !== 'ALL') params.campaign_id = seasonalCampaignFilter;
      if (seasonalSearch.trim()) params.search = seasonalSearch.trim();

      const res = await apiClient.get('/escrow/admin/seasonal-fee-orders', { params });
      setSeasonalOrders(res.data?.items || []);
      setSeasonalMetrics(res.data?.metrics || {
        total_count: 0,
        total_subsidized_ghs: 0,
        avg_discount_ghs: 0,
        total_volume_ghs: 0,
        unique_sellers_count: 0
      });
    } catch (err) {
      console.error('Failed to fetch seasonal fee orders:', err);
    } finally {
      setLoadingSeasonalOrders(false);
    }
  };

  const fetchReferrals = async () => {
    try {
      setLoadingReferrals(true);
      const params: any = {};
      if (referralStatusFilter && referralStatusFilter !== 'ALL') params.status = referralStatusFilter;
      if (referralSearch.trim()) params.search = referralSearch.trim();

      const res = await apiClient.get('/users/admin/referrals', { params });
      setReferralAuditRecords(res.data?.items || []);
      setReferralMetrics(res.data?.metrics || {
        total_referrals: 0,
        qualifying_count: 0,
        total_referrer_rewards_ghs: 0,
        total_referee_rewards_ghs: 0
      });
    } catch (err) {
      console.error('Failed to fetch referral audit records:', err);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const fetchCashbackLedger = async () => {
    try {
      setLoadingCashbackLedger(true);
      const params: any = {};
      if (cashbackTypeFilter && cashbackTypeFilter !== 'ALL') params.entry_type = cashbackTypeFilter;
      if (cashbackSearch.trim()) params.search = cashbackSearch.trim();

      const res = await apiClient.get('/escrow/admin/cashback-ledger', { params });
      setCashbackLedgerRecords(res.data?.items || []);
      setCashbackMetrics(res.data?.metrics || {
        total_count: 0,
        total_earned_ghs: 0,
        total_redeemed_ghs: 0
      });
    } catch (err) {
      console.error('Failed to fetch cashback ledger:', err);
    } finally {
      setLoadingCashbackLedger(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchPromoCodes();
    fetchSeasonalCampaigns();
    fetchRewardCampaigns();
    fetchReferralSettings();
  }, []);

  // Tab-dependent loader
  useEffect(() => {
    if (activeTab === 'GLOBAL_HISTORY') {
      fetchGlobalRedemptions();
    } else if (activeTab === 'SEASONAL_HISTORY') {
      fetchSeasonalOrders();
    } else if (activeTab === 'REFERRAL_AUDIT') {
      fetchReferrals();
    } else if (activeTab === 'CASHBACK_LEDGER') {
      fetchCashbackLedger();
    }
  }, [
    activeTab, 
    historyCodeFilter, historyStatusFilter, historyStartDate, historyEndDate, historySearch,
    seasonalCampaignFilter, seasonalSearch,
    referralStatusFilter, referralSearch,
    cashbackTypeFilter, cashbackSearch
  ]);

  const isPromoExpired = Boolean(
    platformSettings.promotions_expires_at && 
    new Date(platformSettings.promotions_expires_at).getTime() <= Date.now()
  );
  const isLiveActive = Boolean(platformSettings.promotions_active && !isPromoExpired);

  const handleTogglePromoActive = async () => {
    const nextState = !platformSettings.promotions_active;
    await onUpdateSettings({ promotions_active: nextState });
  };

  // --- Promo Code Handlers ---
  const handleOpenRedemptions = async (codeItem: AdminPromoCode) => {
    setSelectedPromoForRedemptions(codeItem);
    setRedemptionsModalOpen(true);
    setLoadingRedemptions(true);
    try {
      const res = await apiClient.get(`/escrow/admin/promo-codes/${codeItem.id}/redemptions`);
      setRedemptions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch promo redemptions:', err);
      setRedemptions([]);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleRefreshRedemptions = async () => {
    if (!selectedPromoForRedemptions) return;
    setLoadingRedemptions(true);
    try {
      const res = await apiClient.get(`/escrow/admin/promo-codes/${selectedPromoForRedemptions.id}/redemptions`);
      setRedemptions(res.data || []);
      fetchPromoCodes();
    } catch (err) {
      console.error('Failed to refresh redemptions:', err);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const handleOpenRedemptionsByCodeStr = (codeStr: string) => {
    const found = promoCodes.find(c => c.code.toUpperCase() === codeStr.toUpperCase());
    if (found) {
      handleOpenRedemptions(found);
    } else {
      handleOpenRedemptions({
        id: '',
        code: codeStr,
        description: `Audit for promotional code ${codeStr}`,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        min_order_amount_ghs: 0,
        usage_count: 0,
        per_buyer_limit: 1,
        eligible_role: 'ALL',
        is_active: true,
        created_at: new Date().toISOString(),
        redemptions_count: 0,
        total_subsidized_ghs: 0
      });
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.code.trim()) return;

    setIsSubmittingCode(true);
    setActionMsg('');
    setActionError('');

    try {
      await apiClient.post('/escrow/admin/promo-codes', {
        code: newCode.code.trim().toUpperCase(),
        description: newCode.description.trim(),
        discount_type: newCode.discount_type,
        discount_value: Number(newCode.discount_value),
        max_discount_cap_ghs: newCode.max_discount_cap_ghs ? Number(newCode.max_discount_cap_ghs) : null,
        min_order_amount_ghs: Number(newCode.min_order_amount_ghs) || 0,
        usage_limit: newCode.usage_limit ? Number(newCode.usage_limit) : null,
        per_buyer_limit: Number(newCode.per_buyer_limit) || 1,
        eligible_role: newCode.eligible_role,
        is_active: true,
        expires_at: newCode.expires_at ? new Date(newCode.expires_at).toISOString() : null
      });

      setActionMsg(`Promo code ${newCode.code.toUpperCase()} created successfully!`);
      setCreateModalOpen(false);
      setNewCode({
        code: '',
        description: '',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        max_discount_cap_ghs: 25,
        min_order_amount_ghs: 0,
        usage_limit: 100,
        per_buyer_limit: 1,
        eligible_role: 'ALL',
        expires_at: ''
      });
      fetchPromoCodes();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to create promo code.');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleOpenEditModal = (codeItem: AdminPromoCode) => {
    setEditingCode(codeItem);
    setEditForm({
      code: codeItem.code,
      description: codeItem.description || '',
      discount_type: codeItem.discount_type,
      discount_value: codeItem.discount_value,
      max_discount_cap_ghs: codeItem.max_discount_cap_ghs ?? '',
      min_order_amount_ghs: codeItem.min_order_amount_ghs ?? 0,
      usage_limit: codeItem.usage_limit ?? '',
      per_buyer_limit: codeItem.per_buyer_limit ?? 1,
      eligible_role: codeItem.eligible_role,
      expires_at: codeItem.expires_at ? new Date(codeItem.expires_at).toISOString().slice(0, 16) : '',
      is_active: codeItem.is_active
    });
    setEditModalOpen(true);
  };

  const handleUpdatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode || !editForm.code.trim()) return;

    setIsSubmittingEdit(true);
    setActionMsg('');
    setActionError('');

    try {
      await apiClient.put(`/escrow/admin/promo-codes/${editingCode.id}`, {
        code: editForm.code.trim().toUpperCase(),
        description: editForm.description.trim(),
        discount_type: editForm.discount_type,
        discount_value: Number(editForm.discount_value),
        max_discount_cap_ghs: editForm.max_discount_cap_ghs ? Number(editForm.max_discount_cap_ghs) : null,
        min_order_amount_ghs: Number(editForm.min_order_amount_ghs) || 0,
        usage_limit: editForm.usage_limit ? Number(editForm.usage_limit) : null,
        per_buyer_limit: Number(editForm.per_buyer_limit) || 1,
        eligible_role: editForm.eligible_role,
        is_active: editForm.is_active,
        expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null
      });

      setActionMsg(`Promo code ${editForm.code.toUpperCase()} updated successfully!`);
      setEditModalOpen(false);
      setEditingCode(null);
      fetchPromoCodes();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to update promo code.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleToggleCodeActive = async (codeItem: AdminPromoCode) => {
    try {
      await apiClient.put(`/escrow/admin/promo-codes/${codeItem.id}`, {
        is_active: !codeItem.is_active
      });
      fetchPromoCodes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update promo code.');
    }
  };

  const handleDeleteCode = async (codeItem: AdminPromoCode) => {
    if (!window.confirm(`Are you sure you want to permanently delete promo code "${codeItem.code}"?`)) return;
    try {
      await apiClient.delete(`/escrow/admin/promo-codes/${codeItem.id}`);
      fetchPromoCodes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete promo code.');
    }
  };

  // --- Seasonal Campaigns Handlers ---
  const handleOpenCreateSeasonalModal = () => {
    setEditingSeasonal(null);
    setSeasonalForm({
      name: '',
      description: '',
      fee_rule_type: 'WAIVED',
      rule_value: 0,
      min_order_amount_ghs: 0,
      start_date: new Date().toISOString().slice(0, 16),
      end_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16),
      is_active: true
    });
    setSeasonalModalOpen(true);
  };

  const handleOpenEditSeasonalModal = (camp: SeasonalFeeCampaign) => {
    setEditingSeasonal(camp);
    setSeasonalForm({
      name: camp.name,
      description: camp.description || '',
      fee_rule_type: camp.fee_rule_type,
      rule_value: camp.rule_value,
      min_order_amount_ghs: camp.min_order_amount_ghs,
      start_date: camp.start_date ? new Date(camp.start_date).toISOString().slice(0, 16) : '',
      end_date: camp.end_date ? new Date(camp.end_date).toISOString().slice(0, 16) : '',
      is_active: camp.is_active
    });
    setSeasonalModalOpen(true);
  };

  const handleSaveSeasonalCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonalForm.name.trim()) return;

    setIsSubmittingSeasonal(true);
    setActionMsg('');
    setActionError('');

    try {
      const payload = {
        name: seasonalForm.name.trim(),
        description: seasonalForm.description.trim(),
        fee_rule_type: seasonalForm.fee_rule_type,
        rule_value: Number(seasonalForm.rule_value) || 0,
        min_order_amount_ghs: Number(seasonalForm.min_order_amount_ghs) || 0,
        start_date: seasonalForm.start_date ? new Date(seasonalForm.start_date).toISOString() : new Date().toISOString(),
        end_date: seasonalForm.end_date ? new Date(seasonalForm.end_date).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
        is_active: seasonalForm.is_active
      };

      if (editingSeasonal) {
        await apiClient.put(`/escrow/admin/seasonal-fees/${editingSeasonal.id}`, payload);
        setActionMsg(`Seasonal fee campaign "${payload.name}" updated!`);
      } else {
        await apiClient.post('/escrow/admin/seasonal-fees', payload);
        setActionMsg(`Seasonal fee campaign "${payload.name}" created successfully!`);
      }

      setSeasonalModalOpen(false);
      setEditingSeasonal(null);
      fetchSeasonalCampaigns();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to save seasonal campaign.');
    } finally {
      setIsSubmittingSeasonal(false);
    }
  };

  const handleToggleSeasonalActive = async (camp: SeasonalFeeCampaign) => {
    try {
      await apiClient.put(`/escrow/admin/seasonal-fees/${camp.id}`, {
        is_active: !camp.is_active
      });
      fetchSeasonalCampaigns();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update campaign.');
    }
  };

  const handleDeleteSeasonal = async (camp: SeasonalFeeCampaign) => {
    if (!window.confirm(`Are you sure you want to permanently delete seasonal campaign "${camp.name}"?`)) return;
    try {
      await apiClient.delete(`/escrow/admin/seasonal-fees/${camp.id}`);
      fetchSeasonalCampaigns();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete seasonal campaign.');
    }
  };

  // --- Reward Campaigns Handlers ---
  const handleOpenCreateRewardModal = () => {
    setEditingReward(null);
    setRewardForm({
      name: '',
      description: '',
      target_role: 'ALL',
      reward_type: 'FIXED_GHS',
      reward_value: 5,
      min_order_amount_ghs: 0,
      max_reward_cap_ghs: '',
      validity_days: 180,
      start_date: new Date().toISOString().slice(0, 16),
      end_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 16),
      is_active: true
    });
    setRewardModalOpen(true);
  };

  const handleOpenEditRewardModal = (camp: TransactionRewardCampaign) => {
    setEditingReward(camp);
    setRewardForm({
      name: camp.name,
      description: camp.description || '',
      target_role: camp.target_role,
      reward_type: camp.reward_type,
      reward_value: camp.reward_value,
      min_order_amount_ghs: camp.min_order_amount_ghs,
      max_reward_cap_ghs: camp.max_reward_cap_ghs ?? '',
      validity_days: camp.validity_days || 180,
      start_date: camp.start_date ? new Date(camp.start_date).toISOString().slice(0, 16) : '',
      end_date: camp.end_date ? new Date(camp.end_date).toISOString().slice(0, 16) : '',
      is_active: camp.is_active
    });
    setRewardModalOpen(true);
  };

  const handleSaveRewardCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.name.trim()) return;

    setIsSubmittingReward(true);
    setActionMsg('');
    setActionError('');

    try {
      const payload = {
        name: rewardForm.name.trim(),
        description: rewardForm.description.trim(),
        target_role: rewardForm.target_role,
        reward_type: rewardForm.reward_type,
        reward_value: Number(rewardForm.reward_value) || 0,
        min_order_amount_ghs: Number(rewardForm.min_order_amount_ghs) || 0,
        max_reward_cap_ghs: rewardForm.max_reward_cap_ghs ? Number(rewardForm.max_reward_cap_ghs) : null,
        validity_days: Number(rewardForm.validity_days) || 180,
        start_date: rewardForm.start_date ? new Date(rewardForm.start_date).toISOString() : null,
        end_date: rewardForm.end_date ? new Date(rewardForm.end_date).toISOString() : null,
        is_active: rewardForm.is_active
      };

      if (editingReward) {
        await apiClient.put(`/escrow/admin/reward-campaigns/${editingReward.id}`, payload);
        setActionMsg(`Reward campaign "${payload.name}" updated!`);
      } else {
        await apiClient.post('/escrow/admin/reward-campaigns', payload);
        setActionMsg(`Reward campaign "${payload.name}" created successfully!`);
      }

      setRewardModalOpen(false);
      setEditingReward(null);
      fetchRewardCampaigns();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to save reward campaign.');
    } finally {
      setIsSubmittingReward(false);
    }
  };

  const handleToggleRewardActive = async (camp: TransactionRewardCampaign) => {
    try {
      await apiClient.put(`/escrow/admin/reward-campaigns/${camp.id}`, {
        is_active: !camp.is_active
      });
      fetchRewardCampaigns();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update campaign.');
    }
  };

  const handleDeleteReward = async (camp: TransactionRewardCampaign) => {
    if (!window.confirm(`Are you sure you want to permanently delete reward campaign "${camp.name}"?`)) return;
    try {
      await apiClient.delete(`/escrow/admin/reward-campaigns/${camp.id}`);
      fetchRewardCampaigns();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete reward campaign.');
    }
  };

  // --- Manual Credit Handlers ---
  const handleGrantCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantForm.target_identifier.trim() || !grantForm.amount_ghs) return;

    setIsGrantingCredit(true);
    setActionMsg('');
    setActionError('');

    try {
      const res = await apiClient.post('/escrow/admin/grant-credit', {
        target_type: grantForm.target_type,
        target_identifier: grantForm.target_identifier.trim(),
        amount_ghs: Number(grantForm.amount_ghs),
        notes: grantForm.notes.trim() || 'Manual admin credit grant',
        validity_days: Number(grantForm.validity_days) || 90
      });

      setActionMsg(res.data.message || 'Reward credit granted successfully!');
      setGrantModalOpen(false);
      setGrantForm({
        target_type: 'BUYER',
        target_identifier: '',
        amount_ghs: 10,
        notes: '',
        validity_days: 90
      });
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to grant promotional credit.');
    } finally {
      setIsGrantingCredit(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header & Status Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Promotions, Seasonal Fees, Cashback & Referral Engine
            </h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Configure seasonal fee waivers, transaction cashback offsets for sellers, referral incentives, and promo codes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 ${
            isLiveActive
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : isPromoExpired
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              isLiveActive ? 'bg-emerald-500 animate-pulse' : isPromoExpired ? 'bg-amber-500' : 'bg-slate-400'
            }`} />
            {isLiveActive ? 'PROMOTIONS ACTIVE' : isPromoExpired ? 'CAMPAIGN EXPIRED' : 'PROMOTIONS DISABLED'}
          </span>

          <button
            type="button"
            onClick={handleTogglePromoActive}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow cursor-pointer ${
              platformSettings.promotions_active
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {platformSettings.promotions_active ? 'Turn OFF Promotions' : 'Turn ON Promotions'}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {actionMsg}
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          {actionError}
        </div>
      )}

      {/* ─── PROMOTIONS SUB-NAV (5 TABS) ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('CAMPAIGNS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'CAMPAIGNS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Layers className="h-4 w-4" />
          Active Campaigns & Program Settings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GLOBAL_HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'GLOBAL_HISTORY'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <History className="h-4 w-4" />
          Promo Code Redemptions
          {globalMetrics.total_count > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'GLOBAL_HISTORY' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            }`}>
              {globalMetrics.total_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SEASONAL_HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'SEASONAL_HISTORY'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Flame className="h-4 w-4 text-amber-500" />
          Seasonal Fee Reductions & Orders
          {seasonalMetrics.total_count > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'SEASONAL_HISTORY' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
            }`}>
              {seasonalMetrics.total_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REFERRAL_AUDIT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'REFERRAL_AUDIT'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <UserPlus className="h-4 w-4 text-purple-500" />
          Referral Tracking & Audit
          {referralMetrics.total_referrals > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'REFERRAL_AUDIT' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
            }`}>
              {referralMetrics.total_referrals}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CASHBACK_LEDGER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'CASHBACK_LEDGER'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          Cashback & Fee Offset Ledger
          {cashbackMetrics.total_count > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'CASHBACK_LEDGER' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            }`}>
              {cashbackMetrics.total_count}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: CAMPAIGNS & PLATFORM CONFIGURATION ─────────────────────────── */}
      {activeTab === 'CAMPAIGNS' && (
        <div className="space-y-8">
          {/* Section 1: Global Promotion Duration & Rules */}
          <div className="space-y-3">
            <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Global Promotion Duration & Platform Rules
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Campaign End Date & Time (Optional)
                </label>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  If set, all promo codes and reward fields across public checkout will auto-deactivate after this timestamp.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={platformSettings.promotions_expires_at ? platformSettings.promotions_expires_at.slice(0, 16) : ''}
                    onChange={(e) => onUpdateSettings({ promotions_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 w-full font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  {platformSettings.promotions_expires_at && (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ promotions_expires_at: null })}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      title="Clear Expiry (Set to Perpetual)"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Buyer Loyalty Reward Rate (%)
                </label>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Percentage of gross order value credited to guest buyer's phone upon order completion.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={platformSettings.buyer_reward_rate_percent ?? 1.0}
                    onChange={(e) => onUpdateSettings({ buyer_reward_rate_percent: parseFloat(e.target.value) || 0 })}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 w-24 font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">% Cashback</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Buyer Credit Validity (Days)
                </label>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Time period before buyer loyalty credit balances expire if unused.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={platformSettings.buyer_credit_validity_days ?? 90}
                    onChange={(e) => onUpdateSettings({ buyer_credit_validity_days: parseInt(e.target.value) || 90 })}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 w-24 font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Days</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Seller Default Reward per Completed Order
                </label>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Fixed GHS token bonus credited to seller's promotional balance per completed order.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="1000"
                    value={platformSettings.seller_reward_per_completed_order_ghs ?? 2.0}
                    onChange={(e) => onUpdateSettings({ seller_reward_per_completed_order_ghs: parseFloat(e.target.value) || 0 })}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 w-24 font-mono font-bold text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">GHS / completed txn</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Seller Credit Expiration (Days)
                </label>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Validity window for seller promotional and fee offset credits.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="730"
                    value={platformSettings.seller_credit_validity_days ?? 180}
                    onChange={(e) => onUpdateSettings({ seller_credit_validity_days: parseInt(e.target.value) || 180 })}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 w-24 font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Days</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  Max Platform Fee Discount Cap (GHS)
                </label>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Hard financial ceiling capping the maximum subsidy allowable on any single transaction's platform fee.
                </p>
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="500"
                    value={platformSettings.max_promo_discount_cap_ghs ?? 25.0}
                    onChange={(e) => onUpdateSettings({ max_promo_discount_cap_ghs: parseFloat(e.target.value) || 25.0 })}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 w-24 font-mono font-bold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">GHS Max Cap</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Referral Program Settings */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Referral Program Configuration & Reward Incentives
                </h5>
                <p className="text-xs text-slate-500">
                  Configure reward amounts earned by referrers and newly referred users upon first qualifying order completion.
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border self-start sm:self-auto ${
                referralSettings?.referral_program_active
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                  : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
              }`}>
                {referralSettings?.referral_program_active ? 'PROGRAM ACTIVE' : 'PROGRAM DISABLED'}
              </span>
            </div>

            <form onSubmit={handleSaveReferralSettings} className="bg-blue-50/40 dark:bg-blue-950/20 p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Program Status
                  </label>
                  <select
                    value={referralSettings?.referral_program_active ? 'ACTIVE' : 'DISABLED'}
                    onChange={e => setReferralSettings({ ...referralSettings, referral_program_active: e.target.value === 'ACTIVE' })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">Enabled (Active)</option>
                    <option value="DISABLED">Disabled (Paused)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Referrer Reward (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={referralSettings?.referrer_reward_ghs ?? 15}
                    onChange={e => setReferralSettings({ ...referralSettings, referrer_reward_ghs: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Referee Reward (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={referralSettings?.referee_reward_ghs ?? 10}
                    onChange={e => setReferralSettings({ ...referralSettings, referee_reward_ghs: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold font-mono text-blue-600 dark:text-blue-400 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Min Qualifying Order (GHS)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={referralSettings?.min_order_amount_for_referral_ghs ?? 0}
                    onChange={e => setReferralSettings({ ...referralSettings, min_order_amount_for_referral_ghs: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Max Referrals / User
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={referralSettings?.max_referrals_per_user ?? 0}
                    onChange={e => setReferralSettings({ ...referralSettings, max_referrals_per_user: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingReferralSettings}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow flex items-center gap-2 cursor-pointer"
                >
                  {savingReferralSettings ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save Referral Settings
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Seasonal / Holiday Platform Fee Overrides & Waivers */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  Seasonal & Holiday Platform Fee Overrides (Discounts & Waivers)
                </h5>
                <p className="text-xs text-slate-500">
                  Create festive season campaigns (Easter, Christmas, Black Friday) to reduce or 100% waive platform fees automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateSeasonalModal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-1.5 shadow shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Seasonal Campaign
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">Campaign Name & Description</th>
                    <th className="p-3">Rule Type & Value</th>
                    <th className="p-3">Min Order</th>
                    <th className="p-3">Start & End Schedule</th>
                    <th className="p-3">Orders Benefited</th>
                    <th className="p-3">Total Subsidized</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loadingSeasonal ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                        Loading seasonal fee campaigns...
                      </td>
                    </tr>
                  ) : seasonalCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No seasonal fee override campaigns created yet. Click "Create Seasonal Campaign" to start.
                      </td>
                    </tr>
                  ) : (
                    seasonalCampaigns.map(camp => (
                      <tr key={camp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{camp.name}</div>
                          {camp.description && <div className="text-[11px] text-slate-500 mt-0.5">{camp.description}</div>}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {camp.fee_rule_type === 'WAIVED' && <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Waived (GHS 0.00)</span>}
                          {camp.fee_rule_type === 'REDUCED_PERCENTAGE' && <span>Reduced Rate: {camp.rule_value}% (Fixed GHS 0.00)</span>}
                          {camp.fee_rule_type === 'REDUCED_FIXED' && <span>Flat Fixed Fee: GHS {formatGHS(camp.rule_value)} (0% variable)</span>}
                          {camp.fee_rule_type === 'PERCENTAGE_DISCOUNT' && <span>{camp.rule_value}% Discount on Fee</span>}
                          {camp.fee_rule_type === 'FIXED_DISCOUNT' && <span>GHS {formatGHS(camp.rule_value)} OFF Fee</span>}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                          {camp.min_order_amount_ghs > 0 ? `GHS ${formatGHS(camp.min_order_amount_ghs)}` : 'None'}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          <div>{camp.start_date ? new Date(camp.start_date).toLocaleDateString() : 'Immediate'}</div>
                          <div>to {camp.end_date ? new Date(camp.end_date).toLocaleDateString() : 'Perpetual'}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {camp.orders_count || 0}
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                          GHS {formatGHS(camp.total_subsidized_ghs)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            camp.is_active
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {camp.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSeasonalModal(camp)}
                              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition cursor-pointer"
                              title="Edit Seasonal Campaign"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSeasonalActive(camp)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs transition cursor-pointer"
                            >
                              {camp.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSeasonal(camp)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                              title="Delete Campaign"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Transaction Cashback & Reward Campaigns */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-500" />
                  Transaction Reward & Cashback Campaigns (Offsetting Seller Fees)
                </h5>
                <p className="text-xs text-slate-500">
                  Define promotional periods granting rewards per successful transaction. Sellers can use these credits to offset platform fees when absorbing fees.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateRewardModal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow shadow-emerald-500/20 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Reward Campaign
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">Campaign Name</th>
                    <th className="p-3">Target Role</th>
                    <th className="p-3">Reward Rate / Value</th>
                    <th className="p-3">Min Order / Cap</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loadingRewardCampaigns ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-500" />
                        Loading reward campaigns...
                      </td>
                    </tr>
                  ) : rewardCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No transaction reward campaigns configured yet. Click "Create Reward Campaign" to begin.
                      </td>
                    </tr>
                  ) : (
                    rewardCampaigns.map(camp => (
                      <tr key={camp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{camp.name}</div>
                          {camp.description && <div className="text-[11px] text-slate-500 mt-0.5">{camp.description}</div>}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {camp.target_role}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 font-mono">
                          {camp.reward_type === 'FIXED_GHS' ? `GHS ${formatGHS(camp.reward_value)}` : `${camp.reward_value}% of Order`}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          <div>Min: {camp.min_order_amount_ghs > 0 ? `GHS ${camp.min_order_amount_ghs}` : '0'}</div>
                          <div>Cap: {camp.max_reward_cap_ghs ? `GHS ${camp.max_reward_cap_ghs}` : '∞'}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          <div>{camp.start_date ? new Date(camp.start_date).toLocaleDateString() : 'Immediate'}</div>
                          <div>to {camp.end_date ? new Date(camp.end_date).toLocaleDateString() : 'Perpetual'}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            camp.is_active
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {camp.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRewardModal(camp)}
                              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                              title="Edit Reward Campaign"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleRewardActive(camp)}
                              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs transition cursor-pointer"
                            >
                              {camp.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReward(camp)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                              title="Delete Campaign"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Promotional Codes Table */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Promotional Coupon Codes
                </h5>
                <p className="text-xs text-slate-500">
                  Manage coupons, discounts, usage limits, and inspect marketing subsidies.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ExportButton
                  filename="promotional_codes_catalog"
                  title="HendAxis Trust - Promotional Coupon Codes"
                  headers={promoExportHeaders}
                  data={promoCodes}
                  label="Export Codes"
                />

                <button
                  type="button"
                  onClick={() => setGrantModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="h-3.5 w-3.5" />
                  Grant Manual Credit
                </button>

                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow shadow-blue-500/20 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Promo Code
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3">Code & Description</th>
                    <th className="p-3">Discount Type / Value</th>
                    <th className="p-3">Max Cap</th>
                    <th className="p-3">Usage / Limit</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Total Subsidized</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loadingCodes ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading promo codes...
                      </td>
                    </tr>
                  ) : promoCodes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No promotional codes configured yet. Click "Create Promo Code" to launch a campaign.
                      </td>
                    </tr>
                  ) : (
                    promoCodes.map(code => {
                      const isLimitReached = Boolean(code.usage_limit && code.usage_count >= code.usage_limit);
                      return (
                        <tr key={code.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition group">
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleOpenRedemptions(code)}
                              className="text-left group/code inline-flex flex-col items-start cursor-pointer"
                              title="Click to view redemption history & orders"
                            >
                              <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 group-hover/code:bg-blue-100 dark:group-hover/code:bg-blue-900/40 group-hover/code:text-blue-700 dark:group-hover/code:text-blue-300 px-2 py-0.5 rounded text-xs transition flex items-center gap-1.5 border border-transparent group-hover/code:border-blue-300 dark:group-hover/code:border-blue-700">
                                <Tag className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                {code.code}
                                <Eye className="h-3 w-3 opacity-0 group-hover/code:opacity-100 transition text-blue-500" />
                              </span>
                              {code.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5 max-w-[200px] truncate">{code.description}</p>
                              )}
                            </button>
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {code.discount_type === 'PERCENTAGE' ? `${code.discount_value}% OFF Fee` : `GHS ${formatGHS(code.discount_value)} OFF`}
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                            {code.max_discount_cap_ghs ? `GHS ${formatGHS(code.max_discount_cap_ghs)}` : 'None'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                {code.usage_count} / {code.usage_limit ?? '∞'}
                              </span>
                              {isLimitReached && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Global usage limit reached">
                                  LIMIT
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {code.eligible_role}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                            GHS {formatGHS(code.total_subsidized_ghs)}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              code.is_active
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-500/10 text-slate-500'
                            }`}>
                              {code.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenRedemptions(code)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                                title="View Redemptions & Order History"
                              >
                                <History className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(code)}
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                                title="Edit Promo Code"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleCodeActive(code)}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs transition cursor-pointer"
                              >
                                {code.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCode(code)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                                title="Delete Code"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: GLOBAL PROMO REDEMPTIONS & AUDIT TRAIL ──────────────────────── */}
      {activeTab === 'GLOBAL_HISTORY' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-blue-500" />
                Total Redemptions
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {globalMetrics.total_count}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Successful promotional orders
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-rose-500" />
                Total Subsidized Volume
              </div>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                GHS {formatGHS(globalMetrics.total_subsidy_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Platform fee absorption
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-500" />
                Unique Buyers Benefited
              </div>
              <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                {globalMetrics.unique_buyers_count}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Distinct consumer accounts
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-emerald-500" />
                Avg Subsidy per Order
              </div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                GHS {formatGHS(globalMetrics.avg_discount_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Per discounted checkout
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  SEARCH REDEMPTIONS
                </label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by buyer, phone, email, reference..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  PROMO CAMPAIGN
                </label>
                <select
                  value={historyCodeFilter}
                  onChange={e => setHistoryCodeFilter(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                >
                  <option value="ALL">All Promotional Codes</option>
                  {promoCodes.map(c => (
                    <option key={c.id} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  ORDER STATUS
                </label>
                <select
                  value={historyStatusFilter}
                  onChange={e => setHistoryStatusFilter(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAYMENT_RECEIVED">Payment Received</option>
                  <option value="DELIVERY_IN_PROGRESS">Delivery In Progress</option>
                  <option value="INSPECTION_PERIOD">Inspection Period</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DISPUTED">Disputed</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={fetchGlobalRedemptions}
                  disabled={loadingGlobalRedemptions}
                  className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                  title="Refresh Audit Records"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingGlobalRedemptions ? 'animate-spin text-blue-500' : ''}`} />
                </button>

                <ExportButton
                  filename="promo_redemptions_history"
                  title="HendAxis Trust - Promotional Redemptions Audit Trail"
                  headers={redemptionsExportHeaders}
                  data={globalRedemptions}
                  label="Export History"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
              <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date Range:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={e => setHistoryStartDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={e => setHistoryEndDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono"
                />
              </div>

              {(historySearch || historyCodeFilter !== 'ALL' || historyStatusFilter !== 'ALL' || historyStartDate || historyEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryCodeFilter('ALL');
                    setHistoryStatusFilter('ALL');
                    setHistoryStartDate('');
                    setHistoryEndDate('');
                  }}
                  className="text-[11px] text-rose-600 hover:underline font-bold ml-auto cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Promo Code</th>
                  <th className="p-3">Buyer Details</th>
                  <th className="p-3">Order Reference</th>
                  <th className="p-3">Seller Details</th>
                  <th className="p-3">Order Total</th>
                  <th className="p-3">Promo Discount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loadingGlobalRedemptions ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading global promo redemption history...
                    </td>
                  </tr>
                ) : globalRedemptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No promotional redemptions found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  globalRedemptions.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition">
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleOpenRedemptionsByCodeStr(r.promo_code)}
                          className="group/code inline-flex items-center gap-1.5 font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="Click to view full campaign redemption history"
                        >
                          <Tag className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span>{r.promo_code}</span>
                          <Eye className="h-3 w-3 opacity-0 group-hover/code:opacity-100 transition text-blue-500" />
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {r.buyer_name || 'Guest Buyer'}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                          {r.buyer_phone && <span>{r.buyer_phone}</span>}
                          {r.buyer_email && <span>• {r.buyer_email}</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onInspectTransaction?.(r.transaction_id)}
                          className="group/tx inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60 transition cursor-pointer"
                          title="Click to open Transaction Deep Inspection"
                        >
                          <span>{r.paystack_reference || r.transaction_id.slice(0, 8)}</span>
                          <ExternalLink className="h-3 w-3 opacity-70 group-hover/tx:opacity-100 transition" />
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {r.seller_name || 'N/A'}
                        </div>
                        {r.seller_username && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            @{r.seller_username}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        GHS {formatGHS(r.order_total_ghs)}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        -GHS {formatGHS(r.discount_applied_ghs)}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          {r.transaction_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SEASONAL FEE REDUCTIONS & ORDERS AUDIT ─────────────────────── */}
      {activeTab === 'SEASONAL_HISTORY' && (
        <div className="space-y-5">
          {/* Seasonal KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                Seasonal Orders
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {seasonalMetrics.total_count}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Orders with seasonal fee reduction
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-rose-500" />
                Total Fee Subsidies
              </div>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                GHS {formatGHS(seasonalMetrics.total_subsidized_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Total platform fee waived
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-blue-500" />
                Gross Merch Volume
              </div>
              <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                GHS {formatGHS(seasonalMetrics.total_volume_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                GMV processed during promotions
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-emerald-500" />
                Avg Subsidy / Order
              </div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                GHS {formatGHS(seasonalMetrics.avg_discount_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Average fee savings per customer
              </div>
            </div>
          </div>

          {/* Filters & Export */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  SEARCH ORDERS
                </label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by buyer, seller, order ref..."
                    value={seasonalSearch}
                    onChange={e => setSeasonalSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  SEASONAL CAMPAIGN
                </label>
                <select
                  value={seasonalCampaignFilter}
                  onChange={e => setSeasonalCampaignFilter(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">All Seasonal Campaigns</option>
                  {seasonalCampaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={fetchSeasonalOrders}
                  disabled={loadingSeasonalOrders}
                  className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                  title="Refresh Records"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingSeasonalOrders ? 'animate-spin text-amber-500' : ''}`} />
                </button>

                <ExportButton
                  filename="seasonal_fee_reductions_audit"
                  title="HendAxis Trust - Seasonal Platform Fee Reductions Audit"
                  headers={seasonalOrdersExportHeaders}
                  data={seasonalOrders}
                  label="Export Audit"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Campaign Applied</th>
                  <th className="p-3">Order Reference</th>
                  <th className="p-3">Item Details</th>
                  <th className="p-3">Buyer Details</th>
                  <th className="p-3">Seller Details</th>
                  <th className="p-3">Order Total</th>
                  <th className="p-3">Standard Fee</th>
                  <th className="p-3">Fee Waived / Discount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loadingSeasonalOrders ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-amber-500" />
                      Loading seasonal fee order records...
                    </td>
                  </tr>
                ) : seasonalOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No seasonal fee orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  seasonalOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition">
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(o.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-white bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                          {o.campaign_name}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onInspectTransaction?.(o.id)}
                          className="group/tx inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60 cursor-pointer"
                          title="Click to open Transaction Deep Inspection"
                        >
                          <span>{o.paystack_reference || o.id.slice(0, 8)}</span>
                          <ExternalLink className="h-3 w-3 opacity-70 group-hover/tx:opacity-100 transition" />
                        </button>
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {o.item_title}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        <div>{o.buyer_name || 'Guest Buyer'}</div>
                        {o.buyer_phone && <div className="text-[11px] text-slate-500 font-mono">{o.buyer_phone}</div>}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        <div>{o.seller_name || 'N/A'}</div>
                        {o.seller_username && <div className="text-[11px] text-slate-500 font-mono">@{o.seller_username}</div>}
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        GHS {formatGHS(o.order_total_ghs)}
                      </td>
                      <td className="p-3 font-mono text-slate-500">
                        GHS {formatGHS(o.platform_fee_ghs)}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        -GHS {formatGHS(o.seasonal_discount_ghs)}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: REFERRAL PROGRAM TRACKING & AUDIT LOG ──────────────────────── */}
      {activeTab === 'REFERRAL_AUDIT' && (
        <div className="space-y-5">
          {/* Referral KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-500" />
                Total Referrals
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {referralMetrics.total_referrals}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Total referred accounts registered
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Qualifying Orders
              </div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {referralMetrics.qualifying_count}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Referrals completing first orders
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-purple-500" />
                Referrer Rewards
              </div>
              <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                GHS {formatGHS(referralMetrics.total_referrer_rewards_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Total granted to referrers
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                Referee Rewards
              </div>
              <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                GHS {formatGHS(referralMetrics.total_referee_rewards_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Total granted to new users
              </div>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  SEARCH REFERRALS
                </label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by referrer, referee, phone, email..."
                    value={referralSearch}
                    onChange={e => setReferralSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  STATUS
                </label>
                <select
                  value={referralStatusFilter}
                  onChange={e => setReferralStatusFilter(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending (Registered, No Order)</option>
                  <option value="QUALIFIED">Qualified / Completed</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={fetchReferrals}
                  disabled={loadingReferrals}
                  className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                  title="Refresh Records"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingReferrals ? 'animate-spin text-purple-500' : ''}`} />
                </button>

                <ExportButton
                  filename="referral_program_audit_trail"
                  title="HendAxis Trust - Referral Program Audit Log"
                  headers={referralExportHeaders}
                  data={referralAuditRecords}
                  label="Export Audit"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Referrals Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3">Referrer</th>
                  <th className="p-3">Referred User (Referee)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Qualifying Order</th>
                  <th className="p-3">Referrer Reward</th>
                  <th className="p-3">Referee Reward</th>
                  <th className="p-3">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loadingReferrals ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
                      Loading referral audit records...
                    </td>
                  </tr>
                ) : referralAuditRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <UserPlus className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No referral records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  referralAuditRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition">
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{r.referrer_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">@{r.referrer_username} • {r.referrer_phone}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{r.referee_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">@{r.referee_username} • {r.referee_phone}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          r.status === 'QUALIFIED'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {r.qualifying_transaction_id ? (
                          <button
                            type="button"
                            onClick={() => onInspectTransaction?.(r.qualifying_transaction_id!)}
                            className="group/tx inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60 cursor-pointer"
                            title="Click to open Transaction Deep Inspection"
                          >
                            <span>{r.qualifying_reference || r.qualifying_transaction_id.slice(0, 8)}</span>
                            <ExternalLink className="h-3 w-3 opacity-70 group-hover/tx:opacity-100 transition" />
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No order yet</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {r.referrer_reward_ghs > 0 ? `+GHS ${formatGHS(r.referrer_reward_ghs)}` : 'Pending'}
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {r.referee_reward_ghs > 0 ? `+GHS ${formatGHS(r.referee_reward_ghs)}` : 'Pending'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {r.completed_at ? new Date(r.completed_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: TRANSACTION CASHBACK & SELLER FEE OFFSET LEDGER ────────────── */}
      {activeTab === 'CASHBACK_LEDGER' && (
        <div className="space-y-5">
          {/* Cashback KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-blue-500" />
                Ledger Entries
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {cashbackMetrics.total_count}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Total reward & offset ledger records
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                Total Credits Granted
              </div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                GHS {formatGHS(cashbackMetrics.total_earned_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Cashback & milestone credits awarded
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <div className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                Seller Platform Fees Offset
              </div>
              <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                GHS {formatGHS(cashbackMetrics.total_redeemed_ghs)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Credits redeemed to absorb seller fees
              </div>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  SEARCH LEDGER
                </label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by user, phone, reference, notes..."
                    value={cashbackSearch}
                    onChange={e => setCashbackSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1">
                  ENTRY TYPE
                </label>
                <select
                  value={cashbackTypeFilter}
                  onChange={e => setCashbackTypeFilter(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="ALL">All Entry Types</option>
                  <option value="EARNED">Transaction Milestone Grants (EARNED)</option>
                  <option value="REDEEMED">Fee Offsets & Redemptions (REDEEMED)</option>
                  <option value="ADMIN_GRANT">Admin Grants (ADMIN_GRANT)</option>
                  <option value="REFERRAL_BONUS">Referral Bonuses (REFERRAL_BONUS)</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={fetchCashbackLedger}
                  disabled={loadingCashbackLedger}
                  className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                  title="Refresh Ledger"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingCashbackLedger ? 'animate-spin text-emerald-500' : ''}`} />
                </button>

                <ExportButton
                  filename="cashback_and_seller_fee_offset_ledger"
                  title="HendAxis Trust - Cashback & Seller Fee Offset Ledger"
                  headers={cashbackExportHeaders}
                  data={cashbackLedgerRecords}
                  label="Export Ledger"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Recipient & Contact</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Entry Type</th>
                  <th className="p-3">Amount (GHS)</th>
                  <th className="p-3">Reference / Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loadingCashbackLedger ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-500" />
                      Loading cashback ledger records...
                    </td>
                  </tr>
                ) : cashbackLedgerRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <ShoppingBag className="h-6 w-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No cashback or fee offset records found.
                    </td>
                  </tr>
                ) : (
                  cashbackLedgerRecords.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition">
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{r.recipient_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{r.recipient_identifier}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {r.recipient_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          r.entry_type === 'REDEEMED'
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {r.entry_type}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold">
                        {r.entry_type === 'REDEEMED' ? (
                          <span className="text-purple-600 dark:text-purple-400">-GHS {formatGHS(r.amount_ghs)}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">+GHS {formatGHS(r.amount_ghs)}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{r.notes}</div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {(r.transaction_id || r.transaction_reference) ? (
                            <button
                              type="button"
                              onClick={() => onInspectTransaction?.(r.transaction_id || r.reference_id)}
                              className="group/tx inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800/60 transition cursor-pointer text-xs"
                              title="Click to open Transaction Deep Inspection"
                            >
                              <span>{r.transaction_reference || r.reference_id}</span>
                              <ExternalLink className="h-3 w-3 opacity-70 group-hover/tx:opacity-100 transition" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                              {r.reference_id}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: PROMO CODE REDEMPTIONS & AUDIT LOG ──────────────────────── */}
      {redemptionsModalOpen && selectedPromoForRedemptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Promo Code Redemptions & Audit: <span className="font-mono text-blue-600 dark:text-blue-400 font-black">{selectedPromoForRedemptions.code}</span>
                </h5>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPromoForRedemptions.description || 'Promotional coupon audit trail'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshRedemptions}
                  disabled={loadingRedemptions}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Refresh Redemptions"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingRedemptions ? 'animate-spin text-blue-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setRedemptionsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Transaction</th>
                      <th className="p-3">Buyer</th>
                      <th className="p-3">Discount Subsidized</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {loadingRedemptions ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                          Loading redemption records...
                        </td>
                      </tr>
                    ) : redemptions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          No redemptions recorded for this promotional coupon yet.
                        </td>
                      </tr>
                    ) : (
                      redemptions.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40 transition">
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => onInspectTransaction?.(r.transaction_id)}
                              className="group/tx inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60 cursor-pointer"
                              title="Inspect Transaction"
                            >
                              <span>{r.paystack_reference || r.transaction_id.slice(0, 8)}</span>
                              <ExternalLink className="h-3 w-3 opacity-70 group-hover/tx:opacity-100 transition" />
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{r.buyer_name || 'Buyer'}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{r.buyer_phone || r.buyer_email}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                            -GHS {formatGHS(r.discount_applied_ghs)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setRedemptionsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CREATE PROMO CODE ───────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Create New Promotional Coupon Code
              </h5>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePromoCode} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  COUPON CODE (UPPERCASE) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME50"
                  value={newCode.code}
                  onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CAMPAIGN DESCRIPTION
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50% discount on escrow fees for first-time buyers"
                  value={newCode.description}
                  onChange={e => setNewCode({ ...newCode, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    DISCOUNT TYPE
                  </label>
                  <select
                    value={newCode.discount_type}
                    onChange={e => setNewCode({ ...newCode, discount_type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_GHS">Fixed Amount (GHS)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    DISCOUNT VALUE *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newCode.discount_value}
                    onChange={e => setNewCode({ ...newCode, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    MAX DISCOUNT CAP (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional cap"
                    value={newCode.max_discount_cap_ghs || ''}
                    onChange={e => setNewCode({ ...newCode, max_discount_cap_ghs: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    MIN ORDER AMOUNT (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCode.min_order_amount_ghs}
                    onChange={e => setNewCode({ ...newCode, min_order_amount_ghs: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GLOBAL USAGE LIMIT
                  </label>
                  <input
                    type="number"
                    placeholder="Unlimited if empty"
                    value={newCode.usage_limit || ''}
                    onChange={e => setNewCode({ ...newCode, usage_limit: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PER BUYER LIMIT
                  </label>
                  <input
                    type="number"
                    value={newCode.per_buyer_limit}
                    onChange={e => setNewCode({ ...newCode, per_buyer_limit: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ELIGIBLE ROLE
                  </label>
                  <select
                    value={newCode.eligible_role}
                    onChange={e => setNewCode({ ...newCode, eligible_role: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Users</option>
                    <option value="BUYER_ONLY">Buyers Only</option>
                    <option value="SELLER_ONLY">Sellers Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    EXPIRATION DATE
                  </label>
                  <input
                    type="datetime-local"
                    value={newCode.expires_at}
                    onChange={e => setNewCode({ ...newCode, expires_at: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCode}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCode && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Create Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: EDIT PROMO CODE ─────────────────────────────────────────── */}
      {editModalOpen && editingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Edit Promo Code: <span className="font-mono font-black text-blue-600 dark:text-blue-400">{editingCode.code}</span>
              </h5>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePromoCode} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  COUPON CODE (UPPERCASE) *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.code}
                  onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono uppercase font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CAMPAIGN DESCRIPTION
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    DISCOUNT TYPE
                  </label>
                  <select
                    value={editForm.discount_type}
                    onChange={e => setEditForm({ ...editForm, discount_type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_GHS">Fixed Amount (GHS)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    DISCOUNT VALUE *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.discount_value}
                    onChange={e => setEditForm({ ...editForm, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    MAX DISCOUNT CAP (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional cap"
                    value={editForm.max_discount_cap_ghs}
                    onChange={e => setEditForm({ ...editForm, max_discount_cap_ghs: e.target.value ? parseFloat(e.target.value) : '' })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    MIN ORDER AMOUNT (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.min_order_amount_ghs}
                    onChange={e => setEditForm({ ...editForm, min_order_amount_ghs: e.target.value ? parseFloat(e.target.value) : 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GLOBAL USAGE LIMIT
                  </label>
                  <input
                    type="number"
                    placeholder="Unlimited if empty"
                    value={editForm.usage_limit}
                    onChange={e => setEditForm({ ...editForm, usage_limit: e.target.value ? parseInt(e.target.value) : '' })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PER BUYER LIMIT
                  </label>
                  <input
                    type="number"
                    value={editForm.per_buyer_limit}
                    onChange={e => setEditForm({ ...editForm, per_buyer_limit: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ELIGIBLE ROLE
                  </label>
                  <select
                    value={editForm.eligible_role}
                    onChange={e => setEditForm({ ...editForm, eligible_role: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Users</option>
                    <option value="BUYER_ONLY">Buyers Only</option>
                    <option value="SELLER_ONLY">Sellers Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    EXPIRATION DATE
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.expires_at}
                    onChange={e => setEditForm({ ...editForm, expires_at: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editForm.is_active}
                  onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="edit_is_active" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Coupon Is Active & Redeemable
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Update Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: SEASONAL CAMPAIGN CREATE/EDIT ───────────────────────────── */}
      {seasonalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                {editingSeasonal ? `Edit Campaign: ${editingSeasonal.name}` : 'Create Seasonal Fee Campaign'}
              </h5>
              <button
                type="button"
                onClick={() => setSeasonalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSeasonalCampaign} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CAMPAIGN NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Easter Promo, Black Friday 0% Fee"
                  value={seasonalForm.name}
                  onChange={e => setSeasonalForm({ ...seasonalForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  DESCRIPTION / PUBLIC BANNER NOTE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zero platform fees on all escrow trades this holiday!"
                  value={seasonalForm.description}
                  onChange={e => setSeasonalForm({ ...seasonalForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    FEE RULE TYPE *
                  </label>
                  <select
                    value={seasonalForm.fee_rule_type}
                    onChange={e => setSeasonalForm({ ...seasonalForm, fee_rule_type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="WAIVED">100% Waived (Zero Platform Fee)</option>
                    <option value="PERCENTAGE_DISCOUNT">Percentage Discount on Standard Fee (%)</option>
                    <option value="FIXED_DISCOUNT">Fixed Fee Discount (GHS)</option>
                    <option value="OVERRIDE_PERCENTAGE">Flat Fee Override (% of Order Total)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    RULE VALUE
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={seasonalForm.fee_rule_type === 'WAIVED'}
                    placeholder={seasonalForm.fee_rule_type === 'WAIVED' ? '0 (Waived)' : 'Value'}
                    value={seasonalForm.rule_value}
                    onChange={e => setSeasonalForm({ ...seasonalForm, rule_value: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    START DATE & TIME
                  </label>
                  <input
                    type="datetime-local"
                    value={seasonalForm.start_date}
                    onChange={e => setSeasonalForm({ ...seasonalForm, start_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    END DATE & TIME
                  </label>
                  <input
                    type="datetime-local"
                    value={seasonalForm.end_date}
                    onChange={e => setSeasonalForm({ ...seasonalForm, end_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="seasonal_is_active"
                  checked={seasonalForm.is_active}
                  onChange={e => setSeasonalForm({ ...seasonalForm, is_active: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <label htmlFor="seasonal_is_active" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Campaign Is Active
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSeasonalModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSeasonal}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSeasonal && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {editingSeasonal ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: REWARD CAMPAIGN CREATE/EDIT ─────────────────────────────── */}
      {rewardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-500" />
                {editingReward ? `Edit Reward Campaign: ${editingReward.name}` : 'Create Transaction Reward Campaign'}
              </h5>
              <button
                type="button"
                onClick={() => setRewardModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRewardCampaign} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CAMPAIGN NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seller Trade Cashback Q4"
                  value={rewardForm.name}
                  onChange={e => setRewardForm({ ...rewardForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  DESCRIPTION
                </label>
                <input
                  type="text"
                  placeholder="e.g. Earn GHS 10 promo credit on every completed transaction over GHS 200"
                  value={rewardForm.description}
                  onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    TARGET BENEFICIARY
                  </label>
                  <select
                    value={rewardForm.target_role}
                    onChange={e => setRewardForm({ ...rewardForm, target_role: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="ALL">All Trading Parties</option>
                    <option value="SELLER_ONLY">Sellers Only (Fee Offset Credit)</option>
                    <option value="BUYER_ONLY">Buyers Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    REWARD TYPE
                  </label>
                  <select
                    value={rewardForm.reward_type}
                    onChange={e => setRewardForm({ ...rewardForm, reward_type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="FIXED_GHS">Fixed Amount (GHS)</option>
                    <option value="PERCENTAGE_VOLUME">% of Transaction Volume</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    REWARD VALUE *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rewardForm.reward_value}
                    onChange={e => setRewardForm({ ...rewardForm, reward_value: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    MIN ORDER AMOUNT (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={rewardForm.min_order_amount_ghs}
                    onChange={e => setRewardForm({ ...rewardForm, min_order_amount_ghs: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    MAX REWARD CAP (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Optional cap"
                    value={rewardForm.max_reward_cap_ghs}
                    onChange={e => setRewardForm({ ...rewardForm, max_reward_cap_ghs: e.target.value ? parseFloat(e.target.value) : '' })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CREDIT VALIDITY (DAYS)
                  </label>
                  <input
                    type="number"
                    value={rewardForm.validity_days}
                    onChange={e => setRewardForm({ ...rewardForm, validity_days: parseInt(e.target.value) || 180 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    START DATE
                  </label>
                  <input
                    type="datetime-local"
                    value={rewardForm.start_date}
                    onChange={e => setRewardForm({ ...rewardForm, start_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    END DATE
                  </label>
                  <input
                    type="datetime-local"
                    value={rewardForm.end_date}
                    onChange={e => setRewardForm({ ...rewardForm, end_date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="reward_is_active"
                  checked={rewardForm.is_active}
                  onChange={e => setRewardForm({ ...rewardForm, is_active: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="reward_is_active" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Campaign Is Active
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRewardModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReward}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReward && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {editingReward ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: GRANT MANUAL PROMO CREDIT ───────────────────────────────── */}
      {grantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Grant Manual Promotional Credit
              </h5>
              <button
                type="button"
                onClick={() => setGrantModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGrantCredit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  TARGET RECIPIENT TYPE
                </label>
                <select
                  value={grantForm.target_type}
                  onChange={e => setGrantForm({ ...grantForm, target_type: e.target.value as any })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                >
                  <option value="BUYER">Buyer (Registered User or Phone Number)</option>
                  <option value="SELLER">Seller (Storefront Owner)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  TARGET IDENTIFIER (PHONE / EMAIL / USERNAME) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +233240000000 or user@example.com"
                  value={grantForm.target_identifier}
                  onChange={e => setGrantForm({ ...grantForm, target_identifier: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CREDIT AMOUNT (GHS) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={grantForm.amount_ghs}
                    onChange={e => setGrantForm({ ...grantForm, amount_ghs: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                    VALIDITY (DAYS)
                  </label>
                  <input
                    type="number"
                    value={grantForm.validity_days}
                    onChange={e => setGrantForm({ ...grantForm, validity_days: parseInt(e.target.value) || 90 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-bold text-slate-700 dark:text-slate-300 mb-1">
                  REASON / AUDIT NOTES
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. VIP merchant compensation / Goodwill reward"
                  value={grantForm.notes}
                  onChange={e => setGrantForm({ ...grantForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGrantModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGrantingCredit}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isGrantingCredit && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Grant Promotional Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
