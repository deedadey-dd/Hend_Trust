import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrackingModal from './TrackingModal';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getErrorMessage: (err: any) => err?.response?.data?.message || 'Error occurred',
}));

vi.mock('../context/ModalContext', () => ({
  useModal: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    alert: vi.fn().mockResolvedValue(true),
  }),
}));

describe('TrackingModal Component', () => {
  const mockTrackedOrder = {
    id: 'txn-track-123',
    link_id: 'link-123',
    title: 'Bose QuietComfort 45',
    status: 'DELIVERY_IN_PROGRESS',
    total_amount_ghs: 1800.0,
    paystack_reference: 'PSTK_BOSE_123',
    seller_username: 'bose_ghana',
    shop_name: 'Bose Store Accra',
    delivery_carrier: 'Speedaf Express',
    tracking_number: 'SPF-GH-778899',
    buyer_phone: '0244112233',
    buyer_email: 'buyer@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null });
  });

  it('renders single order tracking inputs and validates required fields', async () => {
    render(<TrackingModal onClose={vi.fn()} />);

    expect(screen.getByText(/Track Package Status/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. XY98Z123/i)).toBeInTheDocument();

    const trackBtn = screen.getByRole('button', { name: /Send Verification OTP Code/i });
    fireEvent.submit(trackBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Please enter your Transaction Reference ID/i)).toBeInTheDocument();
    });
  });

  it('sends OTP code for guest buyer tracking single order', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: { message: 'OTP sent to your phone.' },
    });

    render(<TrackingModal onClose={vi.fn()} />);

    const refInput = screen.getByPlaceholderText(/e\.g\. XY98Z123/i);
    const phoneInput = screen.getByPlaceholderText(/e\.g\. 0244123456/i);

    fireEvent.change(refInput, { target: { value: 'PSTK_BOSE_123' } });
    fireEvent.change(phoneInput, { target: { value: '0244112233' } });

    const trackBtn = screen.getByRole('button', { name: /Send Verification OTP Code/i });
    fireEvent.click(trackBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/checkout/track/id/request-otp', {
        paystack_reference: 'PSTK_BOSE_123',
        phone_number: '0244112233',
      });
    });

    // Switches to OTP step
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify & Track Order/i })).toBeInTheDocument();
  });

  it('verifies OTP and renders order details and shipping carrier', async () => {
    (apiClient.post as any).mockImplementation((url: string) => {
      if (url.includes('request-otp')) {
        return Promise.resolve({ data: { message: 'OTP sent' } });
      }
      if (url.includes('/checkout/track/id')) {
        return Promise.resolve({ data: mockTrackedOrder });
      }
      return Promise.reject(new Error('not found'));
    });

    render(<TrackingModal onClose={vi.fn()} />);

    const refInput = screen.getByPlaceholderText(/e\.g\. XY98Z123/i);
    const phoneInput = screen.getByPlaceholderText(/e\.g\. 0244123456/i);
    fireEvent.change(refInput, { target: { value: 'PSTK_BOSE_123' } });
    fireEvent.change(phoneInput, { target: { value: '0244112233' } });

    fireEvent.click(screen.getByRole('button', { name: /Send Verification OTP Code/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText('000000');
    fireEvent.change(otpInput, { target: { value: '654321' } });

    fireEvent.click(screen.getByRole('button', { name: /Verify & Track Order/i }));

    await waitFor(() => {
      expect(screen.getByText('Bose QuietComfort 45')).toBeInTheDocument();
      expect(screen.getByText('PSTK_BOSE_123')).toBeInTheDocument();
      expect(screen.getByText(/1800\.00/)).toBeInTheDocument();
      expect(screen.getByText(/Sold by: Bose Store Accra/i)).toBeInTheDocument();
    });
  });

  it('bypasses OTP verification when user is logged in', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'u1', role: 'BUYER', email: 'test@example.com', phone_number: '0244112233' } as any,
      token: 'jwt-xyz',
    });

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes('/checkout/my-orders')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/checkout/transaction/PSTK_BOSE_123')) {
        return Promise.resolve({ data: mockTrackedOrder });
      }
      return Promise.reject(new Error('not found'));
    });

    render(<TrackingModal onClose={vi.fn()} />);

    const refInput = screen.getByPlaceholderText(/e\.g\. XY98Z123/i);
    fireEvent.change(refInput, { target: { value: 'PSTK_BOSE_123' } });

    const trackBtn = screen.getByRole('button', { name: /Send Verification OTP Code/i });
    fireEvent.click(trackBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/checkout/transaction/PSTK_BOSE_123');
      expect(screen.getByText('Bose QuietComfort 45')).toBeInTheDocument();
    });
  });
});
