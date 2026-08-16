import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export const usePlatformMetricsQuery = () => {
  return useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/metrics');
      return data;
    },
  });
};

export const useDisputesListQuery = () => {
  return useQuery({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const { data } = await apiClient.get('/admin/disputes');
      return data;
    },
  });
};

export const useResolveDisputeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (resolveData: { transaction_id: string; action: string; admin_notes: string }) => {
      const { data } = await apiClient.post(`/admin/disputes/${resolveData.transaction_id}/resolve`, resolveData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });
};
