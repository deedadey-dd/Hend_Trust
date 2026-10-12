import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BuyerCancelModal from './BuyerCancelModal';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

// Mock ModalContext
const mockConfirm = vi.fn().mockResolvedValue(true);
const mockAlert = vi.fn().mockResolvedValue(true);

vi.mock('../context/ModalContext', () => ({
  useModal: () => ({
    confirm: mockConfirm,
    alert: mockAlert,
  }),
}));

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('BuyerCancelModal Component', () => {
  const mockOrder = {
    id: 'ord-12345',
    title: 'Sony WH-1000XM5 Headphones',
    paystack_reference: 'PSTK_ORD_123',
    total_amount_ghs: 500.0,
    buyer_name: 'Ama Serwaa',
    buyer_phone: '0244112233',
    buyer_email: 'ama@example.com',
    is_instant_cancel_eligible: true,
  };

  const mockPreviewData = {
    transaction_id: 'ord-12345',
    status: 'PAYMENT_RECEIVED',
    is_undispatched: true,
    is_instant_eligible: true,
    instant_window_hours: 1,
    instant_window_remaining_minutes: 45,
    seller_response_window_hours: 1.5,
    cancellation_requested: false,
    gross_amount_ghs: 500.0,
    platform_fee_ghs: 17.5,
    gateway_fee_ghs: 9.75,
    wallet_payout_fee_ghs: 0.0,
    momo_payout_fee_ghs: 9.75,
    payout_transfer_fee_percent: 1.95,
    wallet_net_refund_ghs: 500.0,
    momo_net_refund_ghs: 490.25,
    buyer_phone: '0244112233',
    buyer_email: 'ama@example.com',
    buyer_name: 'Ama Serwaa',
    has_existing_account: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null });
    (apiClient.get as any).mockResolvedValue({ data: mockPreviewData });
    (apiClient.post as any).mockResolvedValue({
      data: {
        message: 'Order cancelled successfully and refund credited.',
        token: 'mock-jwt-token-xyz',
        user_id: 'user-789',
        role: 'BUYER',
        is_email_verified: false,
      },
    });
  });

  it('loads and displays preview refund amounts for Wallet and Mobile Money', async () => {
    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Check loading indicator or wait for preview data
    await waitFor(() => {
      expect(screen.getByText(/Instant Order Cancellation/i)).toBeInTheDocument();
    });

    expect(screen.getByText('In-App Wallet')).toBeInTheDocument();
    expect(screen.getByText('Mobile Money / Bank')).toBeInTheDocument();
    expect(screen.getAllByText('GHS 500.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('GHS 490.25').length).toBeGreaterThanOrEqual(1);
  });

  it('allows switching refund target between In-App Wallet and Mobile Money', async () => {
    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('In-App Wallet')).toBeInTheDocument();
    });

    const momoCard = screen.getByText('Mobile Money / Bank').closest('div');
    expect(momoCard).toBeDefined();

    fireEvent.click(momoCard!);
    // Momo selected, summary net refund updates
    expect(screen.getAllByText(/GHS 490.25/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows password requirement when guest buyer with existing account attempts to cancel', async () => {
    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Account Found – Enter Password to Cancel/i)).toBeInTheDocument();
    });

    // Try submitting without password
    const submitBtn = screen.getByRole('button', { name: /Verify & Cancel Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const msgs = screen.getAllByText(/Please enter your account password to verify identity and cancel/i);
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('switches to OTP mode and sends verification code when clicking forgot password alternative', async () => {
    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Can't remember password\? Verify via SMS\/Email code/i)).toBeInTheDocument();
    });

    const otpToggleBtn = screen.getByText(/Can't remember password\? Verify via SMS\/Email code/i);
    fireEvent.click(otpToggleBtn);

    // Verify /send-cancel-otp was called
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/escrow/ord-12345/send-cancel-otp');
    });

    // Verify OTP input rendered
    expect(screen.getByPlaceholderText(/Enter 6-digit code/i)).toBeInTheDocument();
    expect(screen.getByText(/6-Digit Verification Code \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /⚡ Verify Code & Cancel/i })).toBeInTheDocument();
  });

  it('validates 6-digit OTP code before proceeding', async () => {
    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Can't remember password\? Verify via SMS\/Email code/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Can't remember password\? Verify via SMS\/Email code/i));

    const submitBtn = screen.getByRole('button', { name: /⚡ Verify Code & Cancel/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const msgs = screen.getAllByText(/Please enter the 6-digit verification code/i);
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('submits cancellation with verified OTP code and updates auth store', async () => {
    const handleSuccess = vi.fn();
    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={handleSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(/Can't remember password\? Verify via SMS\/Email code/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Can't remember password\? Verify via SMS\/Email code/i));

    const otpInput = screen.getByPlaceholderText(/Enter 6-digit code/i);
    fireEvent.change(otpInput, { target: { value: '654321' } });

    const submitBtn = screen.getByRole('button', { name: /⚡ Verify Code & Cancel/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/escrow/ord-12345/buyer-cancel', expect.objectContaining({
        refund_target: 'WALLET',
        otp_code: '654321',
      }));
    });

    // Auth store should be logged in with unverified email
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().token).toBe('mock-jwt-token-xyz');
      expect(useAuthStore.getState().user?.is_email_verified).toBe(false);
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('renders a clickable Forgot password? link pre-filled with user identifier', async () => {
    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      const forgotLink = screen.getByRole('link', { name: /Forgot password\? ↗/i });
      expect(forgotLink).toBeInTheDocument();
      expect(forgotLink.getAttribute('href')).toContain('/forgot-password?identifier=ama%40example.com');
      expect(forgotLink.getAttribute('target')).toBe('_blank');
    });
  });

  it('displays verified owner badge when logged in user email matches order buyer', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'jwt-123',
      user: {
        id: 'u-1',
        email: 'ama@example.com',
        role: 'BUYER',
      } as any,
    });

    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Verified Order Owner/i)).toBeInTheDocument();
    });

    // Password / OTP sections should not be displayed
    expect(screen.queryByText(/Account Found – Enter Password to Cancel/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Enter 6-digit code/i)).not.toBeInTheDocument();
  });

  it('authorizes logged in user when normalized phone number matches (+233 vs 024)', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'jwt-123',
      user: {
        id: 'u-2',
        email: 'different@example.com',
        phone_number: '+233244112233', // Order phone is '0244112233'
        role: 'BUYER',
      } as any,
    });

    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Verified Order Owner/i)).toBeInTheDocument();
    });
  });

  it('displays account mismatch banner and disables cancel button when logged in user does not match', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'jwt-123',
      user: {
        id: 'u-stranger',
        email: 'stranger@example.com',
        phone_number: '0555000111',
        name: 'Stranger User',
        role: 'BUYER',
      } as any,
    });

    render(<BuyerCancelModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Account Mismatch Detected/i)).toBeInTheDocument();
    });

    // Submit button should be disabled with 'Account Mismatch' label
    const mismatchBtn = screen.getByRole('button', { name: /Account Mismatch/i });
    expect(mismatchBtn).toBeDisabled();

    // Clicking 'Log Out to Switch Account' logs the user out
    const switchBtn = screen.getByRole('button', { name: /Log Out to Switch Account/i });
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      // Now displays guest credentials section
      expect(screen.getByText(/Account Found – Enter Password to Cancel/i)).toBeInTheDocument();
    });
  });
});

