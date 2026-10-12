import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApproveAndReleaseModal from './ApproveAndReleaseModal';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('ApproveAndReleaseModal Component', () => {
  const mockOrder = {
    id: 'ord-appr-101',
    title: 'Sony Alpha A7 IV Camera',
    paystack_reference: 'PSTK_CAM_101',
    buyer_phone: '0244998877',
    buyer_email: 'buyer@example.com',
    shop_name: 'Accra Camera House',
    seller_username: 'camera_hub',
    total_amount_ghs: 3200.0,
    platform_fee_ghs: 48.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.post as any).mockResolvedValue({
      data: { message: 'Release confirmation OTP sent to your phone and email.' },
    });
  });

  it('triggers OTP dispatch on mount and displays order details', async () => {
    render(<ApproveAndReleaseModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByText(/Approve & Release Payment/i)).toBeInTheDocument();
    expect(screen.getByText('Sony Alpha A7 IV Camera')).toBeInTheDocument();
    expect(screen.getByText(/3200\.00/)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/escrow/ord-appr-101/send-release-otp');
    });

    expect(screen.getByText(/Release confirmation OTP sent to your phone and email/i)).toBeInTheDocument();
  });

  it('disables submit button until 6 digits are entered and validates code length', async () => {
    render(<ApproveAndReleaseModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: /Confirm & Release/i });
    expect(submitBtn).toBeDisabled();

    // Trigger form submit directly with invalid code
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Please enter the complete 6-digit confirmation code/i)).toBeInTheDocument();
    });
  });

  it('submits valid 6-digit code and calls onSuccess and onClose', async () => {
    const handleSuccess = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    (apiClient.post as any).mockImplementation((url: string) => {
      if (url.includes('send-release-otp')) {
        return Promise.resolve({ data: { message: 'OTP sent' } });
      }
      if (url.includes('approve-and-release')) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.reject(new Error('not found'));
    });

    render(<ApproveAndReleaseModal order={mockOrder} onClose={handleClose} onSuccess={handleSuccess} />);

    const input = screen.getByLabelText(/Enter 6-Digit Release OTP/i);
    fireEvent.change(input, { target: { value: '123456' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Release/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/escrow/ord-appr-101/approve-and-release', {
        confirmation_code: '123456',
      });
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('handles verification error gracefully', async () => {
    (apiClient.post as any).mockImplementation((url: string) => {
      if (url.includes('send-release-otp')) {
        return Promise.resolve({ data: { message: 'OTP sent' } });
      }
      if (url.includes('approve-and-release')) {
        return Promise.reject({
          response: { data: { message: 'Invalid or expired 6-digit release code.' } },
        });
      }
      return Promise.reject(new Error('not found'));
    });

    render(<ApproveAndReleaseModal order={mockOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const input = screen.getByLabelText(/Enter 6-Digit Release OTP/i);
    fireEvent.change(input, { target: { value: '999999' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Release/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid or expired 6-digit release code/i)).toBeInTheDocument();
    });
  });
});
