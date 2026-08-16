import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export const useCreatePaymentLinkMutation = () => {
  return useMutation({
    mutationFn: async (linkData: { title: string; description: string; price_ghs: number; fee_handling: string }) => {
      const { data } = await apiClient.post('/links/create', linkData);
      return data;
    },
  });
};

export const useSendOTPMutation = () => {
  return useMutation({
    mutationFn: async (phoneData: { phone_number: string }) => {
      const { data } = await apiClient.post('/checkout/send-otp', phoneData);
      return data;
    },
  });
};

export const useInitializeCheckoutMutation = () => {
  return useMutation({
    mutationFn: async (checkoutData: { payment_link_id: string; buyer_name: string; buyer_phone: string; buyer_email: string; otp_code: string }) => {
      const { data } = await apiClient.post('/checkout/verify-and-initialize', checkoutData);
      return data;
    },
  });
};
