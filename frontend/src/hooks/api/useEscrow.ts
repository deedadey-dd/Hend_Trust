import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export const useTransactionQuery = (id: string) => {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/escrow/transactions/${id}`);
      return data;
    },
    enabled: !!id,
  });
};

export const useTransactionsListQuery = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/escrow/transactions');
      return data;
    },
  });
};

export const useSubmitDeliveryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryData: any) => {
      const { data } = await apiClient.post('/delivery/submit', deliveryData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transaction', variables.transaction_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useVerifyDeliveryOTPMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (otpData: { transaction_id: string; otp_code: string }) => {
      const { data } = await apiClient.post('/delivery/verify-otp', otpData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transaction', variables.transaction_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};

export const useDisputeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (disputeData: { transaction_id: string; reason: string }) => {
      const { data } = await apiClient.post(`/escrow/${disputeData.transaction_id}/dispute`, disputeData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transaction', variables.transaction_id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
