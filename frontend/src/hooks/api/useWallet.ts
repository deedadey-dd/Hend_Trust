import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export const useWalletBalanceQuery = () => {
  return useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const { data } = await apiClient.get('/wallet/balance');
      return data;
    },
  });
};

export const useWithdrawMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (withdrawData: { amount_ghs: number; bank_code: string; account_number: string }) => {
      const { data } = await apiClient.post('/wallet/withdraw', withdrawData);
      return data;
    },
    onSuccess: () => {
      // Instantly invalidate the wallet balance query so it refetches
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
    },
  });
};
