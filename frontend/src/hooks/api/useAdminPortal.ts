import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export interface AdminMetrics {
  gmv_ghs: number;
  platform_revenue_ghs: number;
  active_escrow_liabilities_ghs: number;
  total_sellers: number;
  total_buyers: number;
  total_transactions: number;
  active_disputes: number;
  transaction_counts: Record<string, number>;
}

export interface AdminTransactionItem {
  id: string;
  paystack_reference: string;
  title: string;
  seller_username: string;
  seller_email: string;
  seller_phone: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  shipping_address: string;
  total_amount_ghs: number;
  platform_fee_ghs: number;
  fee_handling: string;
  status: string;
  created_at: string;
  dispatched_at?: string;
  delivered_at?: string;
  inspection_starts_at?: string;
  delivery_method?: string;
  courier_name?: string;
  tracking_number?: string;
  driver_phone?: string;
  driver_car_number?: string;
  destination_station?: string;
}

export interface AdminSellerItem {
  id: string;
  username: string;
  email: string;
  phone_number: string;
  payout_mode: string;
  created_at?: string;
  payment_links_count: number;
  total_transactions_count: number;
  total_reviews_count?: number;
  completed_gmv_ghs: number;
  wallet_balance_ghs: number;
  shop_name?: string;
  shop_description?: string;
  shop_category?: string;
  profile_picture_url?: string;
  banner_url?: string;
  verification_status?: string;
  is_suspended?: boolean;
  suspension_reason?: string;
  dispute_health?: any;
}

export interface AdminSellerDetails {
  seller: {
    id: string;
    username: string;
    email: string;
    phone_number: string;
    role: string;
    payout_mode: string;
    shop_name?: string;
    shop_description?: string;
    shop_category?: string;
    shop_categories?: string[];
    advertised_until?: string | null;
    profile_picture_url?: string;
    banner_url?: string;
    verification_status: string;
    verified_at?: string | null;
    is_suspended: boolean;
    suspension_reason?: string;
    suspended_at?: string | null;
    reinstated_at?: string | null;
    is_email_verified?: boolean;
    is_phone_verified?: boolean;
    date_joined?: string;
  };
  dispute_health: any;
  wallet: {
    available_balance_ghs: number;
    preferred_payout_type: string;
    momo_number: string;
    bank_account_number: string;
    bank_name: string;
    bank_code: string;
    bank_account_name: string;
    total_paystack_fees_ghs: number;
  };
  links_summary: {
    total_links: number;
    active_links: number;
    archived_links: number;
    top_links: Array<{
      id: string;
      title: string;
      description: string;
      price_ghs: number;
      shipping_fee_ghs: number;
      image_url: string;
      is_active: boolean;
      is_archived: boolean;
      created_at: string;
      total_transactions: number;
      completed_transactions: number;
      completed_revenue_ghs: number;
      disputed_transactions: number;
    }>;
  };
  transactions_summary: {
    total_orders: number;
    completed_orders: number;
    disputed_orders: number;
    cancelled_orders: number;
    refunded_orders: number;
    completed_gmv_ghs: number;
  };
  reviews_summary: {
    total_reviews_count: number;
    avg_rating_overall: number | null;
    avg_rating_speed: number | null;
    avg_rating_communication: number | null;
    reviews: Array<{
      id: string;
      buyer_name: string;
      rating_overall: number;
      rating_speed: number;
      rating_communication: number;
      comment: string;
      image_url?: string;
      seller_reply?: string;
      seller_replied_at?: string | null;
      is_active: boolean;
      created_at: string;
    }>;
  };
}

export interface AdminBuyerItem {
  buyer_phone: string;
  buyer_name: string;
  buyer_email: string;
  total_orders: number;
  active_escrow_orders: number;
  disputed_orders: number;
  completed_orders: number;
  total_spent_ghs: number;
  last_order_at?: string;
}

export const useAdminMetricsQuery = () => {
  return useQuery<AdminMetrics>({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/metrics');
      return data;
    },
  });
};

export const useAdminTransactionsQuery = (status?: string, search?: string) => {
  return useQuery<{ total_count: number; items: AdminTransactionItem[] }>({
    queryKey: ['admin-transactions', status, search],
    queryFn: async () => {
      const params: any = {};
      if (status && status !== 'ALL') params.status = status;
      if (search) params.search = search;
      const { data } = await apiClient.get('/admin/transactions', { params });
      return data;
    },
  });
};

export const useAdminTransactionDetailQuery = (id: string | null) => {
  return useQuery({
    queryKey: ['admin-transaction-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await apiClient.get(`/admin/transactions/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      const isPendingState = ['AWAITING_PAYMENT', 'DELIVERY_IN_PROGRESS', 'INSPECTION_PERIOD', 'RETURN_IN_PROGRESS', 'DISPUTED'].includes(status);
      return isPendingState ? 5000 : false;
    },
  });
};

export const useAdminDisputesQuery = () => {
  return useQuery<any[]>({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/disputes');
      return data;
    },
  });
};

export const useAdminSellersQuery = (search?: string) => {
  return useQuery<AdminSellerItem[]>({
    queryKey: ['admin-sellers', search],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      const { data } = await apiClient.get('/admin/sellers', { params });
      return data;
    },
  });
};

export const useAdminSellerDetailsQuery = (sellerId?: string | null) => {
  return useQuery<AdminSellerDetails>({
    queryKey: ['admin-seller-details', sellerId],
    queryFn: async () => {
      if (!sellerId) throw new Error('Seller ID is required');
      const { data } = await apiClient.get(`/admin/sellers/${sellerId}/details`);
      return data;
    },
    enabled: !!sellerId,
  });
};

export interface AdminBuyerIntelligence {
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  is_registered_user: boolean;
  user_account?: {
    id: string;
    username: string;
    email: string;
    phone_number: string;
    role: string;
    is_active: boolean;
    is_suspended: boolean;
    verification_status: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    date_joined?: string | null;
  } | null;
  summary: {
    total_orders: number;
    completed_orders: number;
    active_escrow_orders: number;
    disputed_orders: number;
    all_disputes_raised_count: number;
    retracted_disputes_count: number;
    refunded_orders: number;
    cancelled_orders: number;
    dispute_rate_pct: number;
    total_spent_ghs: number;
    first_order_at?: string | null;
    last_order_at?: string | null;
    known_shipping_addresses: string[];
  };
  recent_transactions: Array<{
    id: string;
    paystack_reference: string;
    title: string;
    seller_id: string;
    seller_username: string;
    shop_name: string;
    amount_ghs: number;
    status: string;
    has_dispute: boolean;
    dispute_retracted: boolean;
    created_at: string;
    shipping_address?: string | null;
    delivery_method?: string | null;
    courier_name?: string | null;
  }>;
  disputes_history: Array<{
    id: string;
    paystack_reference: string;
    title: string;
    seller_id: string;
    seller_username: string;
    shop_name: string;
    amount_ghs: number;
    status: string;
    buyer_dispute_reason?: string | null;
    seller_dispute_response?: string | null;
    manager_dispute_notes?: string | null;
    dispute_retracted_at?: string | null;
    created_at: string;
  }>;
  reviews_given: Array<{
    id: string;
    seller_username: string;
    shop_name: string;
    rating_overall: number;
    rating_speed: number;
    rating_communication: number;
    comment?: string | null;
    created_at: string;
    edit_count: number;
  }>;
}

export const useAdminBuyersQuery = (search?: string) => {
  return useQuery<AdminBuyerItem[]>({
    queryKey: ['admin-buyers', search],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      const { data } = await apiClient.get('/admin/buyers', { params });
      return data;
    },
  });
};

export const useAdminBuyerIntelligenceQuery = (params?: { phone?: string | null; email?: string | null; userId?: string | null }) => {
  const phone = params?.phone?.trim();
  const email = params?.email?.trim();
  const userId = params?.userId?.trim();
  const hasParam = !!(phone || email || userId);

  return useQuery<AdminBuyerIntelligence>({
    queryKey: ['admin-buyer-intelligence', phone, email, userId],
    queryFn: async () => {
      const qParams: any = {};
      if (phone) qParams.phone = phone;
      if (email) qParams.email = email;
      if (userId) qParams.user_id = userId;
      const { data } = await apiClient.get('/admin/buyers/intelligence', { params: qParams });
      return data;
    },
    enabled: hasParam,
  });
};

export const useResolveDisputeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (resolveData: { 
      transaction_id: string; 
      action: string; 
      refund_amount_ghs?: number;
      seller_amount_ghs?: number;
      platform_retained_fee_ghs?: number;
      admin_notes?: string;
      manager_photos?: string[];
    }) => {
      const { data } = await apiClient.post(`/admin/disputes/${resolveData.transaction_id}/resolve`, resolveData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
    },
  });
};

export const useBroadcastMessageMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (broadcastData: {
      target_group: string;
      channels: string;
      subject?: string;
      message: string;
      custom_recipients?: string;
    }) => {
      const { data } = await apiClient.post('/admin/broadcast-message', broadcastData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-broadcast-campaigns'] });
    },
  });
};

export interface BroadcastCampaignItem {
  id: string;
  subject: string;
  message: string;
  target_group: string;
  channels: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  total_recipients: number;
  sent_sms_count: number;
  sent_email_count: number;
  failed_count: number;
  created_at: string;
  completed_at?: string;
  created_by: string;
}

export const useAdminBroadcastCampaignsQuery = () => {
  return useQuery<BroadcastCampaignItem[]>({
    queryKey: ['admin-broadcast-campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/broadcast-campaigns');
      return data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActive = data?.some((c) => c.status === 'PROCESSING' || c.status === 'PENDING');
      return hasActive ? 3000 : false;
    },
  });
};

export const useCancelBroadcastCampaignMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data } = await apiClient.post(`/admin/broadcast-campaigns/${campaignId}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-broadcast-campaigns'] });
    },
  });
};

export interface SuspensionAppealItem {
  id: string;
  user_id: string;
  username: string;
  shop_name: string;
  email: string;
  phone_number: string;
  is_suspended: boolean;
  suspension_reason: string;
  suspended_at?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_notes?: string;
  reviewed_by_name?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export const useAdminAppealsQuery = (status?: string) => {
  return useQuery<SuspensionAppealItem[]>({
    queryKey: ['admin-appeals', status],
    queryFn: async () => {
      const params: any = {};
      if (status && status !== 'ALL') params.status = status;
      const { data } = await apiClient.get('/admin/appeals', { params });
      return data;
    },
  });
};

export const useReviewAppealMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appealId, decision, admin_notes }: { appealId: string; decision: 'APPROVE' | 'REJECT'; admin_notes?: string }) => {
      const { data } = await apiClient.post(`/admin/appeals/${appealId}/review`, {
        decision,
        admin_notes: admin_notes || '',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appeals'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
    },
  });
};

// ─── Staff & Role Management Hooks ──────────────────────────────────────────

export interface StaffMember {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string | null;
}

export const useAdminStaffQuery = () => {
  return useQuery<StaffMember[]>({
    queryKey: ['admin-staff'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/staff');
      return data;
    },
  });
};

export const useUpdateStaffRoleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role, is_staff }: { userId: string; role: string; is_staff?: boolean }) => {
      const { data } = await apiClient.post(`/admin/staff/${userId}/role`, { role, is_staff });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
  });
};

export const useCreateStaffMemberMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { email: string; phone_number: string; role: string; first_name?: string; last_name?: string }) => {
      const { data } = await apiClient.post('/admin/staff/create', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
  });
};

// ─── Finance: Arbiter Compensation & Payout Accounting Hooks ──────────────────

export interface ArbiterActivityItem {
  id: string;
  arbiter: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    role: string;
  };
  transaction_id?: string | null;
  order_reference?: string | null;
  activity_type: string;
  fee_rate_ghs: number;
  payout_status: string;
  payout_batch_id?: string | null;
  payout_batch_reference?: string | null;
  notes?: string;
  paid_at?: string | null;
  created_at: string;
}

export interface ArbiterActivitiesResponse {
  total_count: number;
  items: ArbiterActivityItem[];
}

export interface ArbiterBalanceItem {
  arbiter_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  unpaid_count: number;
  unpaid_balance_ghs: number;
  paid_balance_ghs: number;
  total_earned_ghs: number;
}

export const useArbiterActivitiesQuery = (arbiterId?: string, payoutStatus?: string) => {
  return useQuery<ArbiterActivitiesResponse>({
    queryKey: ['admin-arbiter-activities', arbiterId, payoutStatus],
    queryFn: async () => {
      const params: any = {};
      if (arbiterId && arbiterId !== 'ALL') params.arbiter_id = arbiterId;
      if (payoutStatus && payoutStatus !== 'ALL') params.payout_status = payoutStatus;
      const { data } = await apiClient.get('/admin/finance/arbiter-activities', { params });
      return data;
    },
  });
};

export const useArbiterBalancesQuery = () => {
  return useQuery<ArbiterBalanceItem[]>({
    queryKey: ['admin-arbiter-balances'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/finance/arbiter-balances');
      return data;
    },
  });
};

export const useCreateArbiterPayoutBatchMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      arbiter_id: string;
      payout_method?: string;
      payout_account_details?: Record<string, any>;
      payment_reference?: string;
      notes?: string;
    }) => {
      const { data } = await apiClient.post('/admin/finance/arbiter-payouts/create-batch', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-arbiter-balances'] });
      queryClient.invalidateQueries({ queryKey: ['admin-arbiter-activities'] });
    },
  });
};

// ─── Dispute Resolution Action Audit Hooks ────────────────────────────────────

export interface DisputeActionItem {
  id: string;
  action_type: string;
  admin_notes: string;
  manager_photos: string[];
  refund_amount_ghs: number;
  seller_amount_ghs: number;
  platform_retained_fee_ghs: number;
  created_at: string;
  arbiter?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  } | null;
}

export const useDisputeActionsQuery = (transactionId: string | null) => {
  return useQuery<DisputeActionItem[]>({
    queryKey: ['admin-dispute-actions', transactionId],
    queryFn: async () => {
      if (!transactionId) return [];
      const { data } = await apiClient.get(`/admin/disputes/${transactionId}/actions`);
      return data;
    },
    enabled: !!transactionId,
  });
};

export const useAssignDisputeArbiterMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, arbiterId, notes }: { transactionId: string; arbiterId?: string; notes?: string }) => {
      const { data } = await apiClient.post(`/admin/disputes/${transactionId}/assign`, {
        arbiter_id: arbiterId || null,
        notes: notes || '',
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dispute-actions', variables.transactionId] });
    },
  });
};


