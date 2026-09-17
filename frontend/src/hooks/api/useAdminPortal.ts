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

