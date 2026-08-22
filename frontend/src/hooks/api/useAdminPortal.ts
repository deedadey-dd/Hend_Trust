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
  completed_gmv_ghs: number;
  wallet_balance_ghs: number;
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
  });
};
