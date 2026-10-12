import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnverifiedEmailBanner from './UnverifiedEmailBanner';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe('UnverifiedEmailBanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'mock-token',
      user: {
        id: 'usr-1',
        email: 'buyer@example.com',
        role: 'BUYER',
        is_email_verified: false,
      },
    });
  });

  it('does not render when user is not authenticated', () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    const { container } = render(<UnverifiedEmailBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when user email is already verified', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'usr-1',
        email: 'buyer@example.com',
        role: 'BUYER',
        is_email_verified: true,
      },
    });
    const { container } = render(<UnverifiedEmailBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when banner was dismissed in current session', () => {
    sessionStorage.setItem('dismiss_unverified_email_banner', 'true');
    const { container } = render(<UnverifiedEmailBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders unverified notice with email and actions when is_email_verified is false', () => {
    render(<UnverifiedEmailBanner />);

    expect(screen.getByText(/Email confirmation pending:/i)).toBeInTheDocument();
    expect(screen.getByText('buyer@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend Link/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Email/i })).toBeInTheDocument();
  });

  it('triggers resend activation email when clicking Resend Link', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: { message: 'Verification link resent!' },
    });

    render(<UnverifiedEmailBanner />);

    const resendBtn = screen.getByRole('button', { name: /Resend Link/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/resend-activation', {
        email: 'buyer@example.com',
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Sent! Check inbox/i)).toBeInTheDocument();
    });
  });

  it('toggles edit form, updates email via API, and updates authStore', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: {
        message: 'Email updated to newbuyer@example.com! Verification link sent.',
        email: 'newbuyer@example.com',
        is_email_verified: false,
      },
    });

    render(<UnverifiedEmailBanner />);

    // Click Change Email
    const changeBtn = screen.getByRole('button', { name: /Change Email/i });
    fireEvent.click(changeBtn);

    // Form inputs should be visible
    const input = screen.getByPlaceholderText(/Enter new email address/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('buyer@example.com');

    // Change input
    fireEvent.change(input, { target: { value: 'newbuyer@example.com' } });

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Update & Send Link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/change-email', {
        new_email: 'newbuyer@example.com',
      });
    });

    // authStore should have updated email
    await waitFor(() => {
      expect(useAuthStore.getState().user?.email).toBe('newbuyer@example.com');
      expect(useAuthStore.getState().user?.is_email_verified).toBe(false);
    });

    // Success badge should be displayed
    await waitFor(() => {
      expect(screen.getByText(/Sent! Check inbox/i)).toBeInTheDocument();
      expect(screen.getByText('newbuyer@example.com')).toBeInTheDocument();
    });
  });

  it('allows cancelling edit mode without saving', () => {
    render(<UnverifiedEmailBanner />);

    fireEvent.click(screen.getByRole('button', { name: /Change Email/i }));
    expect(screen.getByPlaceholderText(/Enter new email address/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByPlaceholderText(/Enter new email address/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Email confirmation pending:/i)).toBeInTheDocument();
  });

  it('dismisses banner on close button click and sets sessionStorage', () => {
    const { container } = render(<UnverifiedEmailBanner />);

    const dismissBtn = screen.getByRole('button', { name: /Dismiss email verification notice/i });
    fireEvent.click(dismissBtn);

    expect(sessionStorage.getItem('dismiss_unverified_email_banner')).toBe('true');
    expect(container.firstChild).toBeNull();
  });
});
