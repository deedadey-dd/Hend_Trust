import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

export const useLoginMutation = () => {
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (credentials: { username?: string; email?: string; password?: string }) => {
      // Assuming Ninja JWT endpoint at /api/v1/auth/token or similar
      const { data } = await apiClient.post('/auth/token', credentials);
      return data;
    },
    onSuccess: (data) => {
      // Decode JWT or fetch user details if API doesn't return them directly
      // Adjust according to the actual backend response
      login(data.access, data.user || { id: 'dummy', role: 'UNKNOWN', email: 'user@example.com' });
    },
  });
};
