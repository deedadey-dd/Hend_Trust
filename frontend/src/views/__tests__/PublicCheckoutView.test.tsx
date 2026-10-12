import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../api/client';
import PublicCheckoutView from '../PublicCheckoutView';

describe('PublicCheckoutView Integration Tests', () => {
  const mockLinkId = 'test-link-uuid-1234';

  const mockLinkDataPassToBuyer = {
    id: mockLinkId,
    title: 'Vintage Leather Jacket',
    description: 'Authentic 100% leather jacket',
    price_ghs: '200.00',
    shipping_fee_ghs: '50.00',
    fee_handling: 'PASS_TO_BUYER',
    image_url: 'https://example.com/jacket.jpg',
    seller_username: 'kofi_mensah',
    shop_name: 'Kofi Vintage Hub',
  };

  const mockPublicSettings = {
    promotions_active: true,
    promotions_expires_at: null,
  };

  let getSpy: any;
  let postSpy: any;
  let clientGetSpy: any;
  let clientPostSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    getSpy = vi.spyOn(axios, 'get');
    postSpy = vi.spyOn(axios, 'post');
    clientGetSpy = vi.spyOn(apiClient, 'get');
    clientPostSpy = vi.spyOn(apiClient, 'post');
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    clientGetSpy.mockRestore();
    clientPostSpy.mockRestore();
  });

  it('renders checkout details and computes baseline 1.5% + GHS 10 escrow fee for buyer', async () => {
    const handleGet = (url: string) => {
      if (url.includes(`/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataPassToBuyer });
      }
      if (url.includes('/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    };
    getSpy.mockImplementation(handleGet);
    clientGetSpy.mockImplementation(handleGet);

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    const titleElement = await screen.findByText('Vintage Leather Jacket');
    expect(titleElement).toBeDefined();
    expect(screen.getByText('GHS 200.00')).toBeDefined();
    expect(screen.getByText('GHS 50.00')).toBeDefined();

    // Gross = 250.00 -> Escrow Fee = (250 * 0.015) + 10 = 13.75
    expect(screen.getByText('GHS 13.75')).toBeDefined();

    // Total = 200 + 50 + 13.75 = 263.75
    expect(screen.getByText('263.75')).toBeDefined();
  });

  it('dynamically updates Net Escrow Fee and Total Buyer Payment when promo code is applied', async () => {
    const handleGet = (url: string) => {
      if (url.includes(`/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataPassToBuyer });
      }
      if (url.includes('/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    };
    getSpy.mockImplementation(handleGet);
    clientGetSpy.mockImplementation(handleGet);

    const handlePost = (url: string, data?: any) => {
      if (url.includes('/checkout/validate-promo')) {
        if (data?.promo_code === 'PROMO10') {
          return Promise.resolve({
            data: {
              valid: true,
              promo_code_applied: 'PROMO10',
              promo_discount_ghs: 10.0,
              credit_discount_ghs: 0.0,
              base_platform_fee: 13.75,
              effective_platform_fee: 3.75,
              final_platform_fee_ghs: 3.75,
              total_buyer_pays: 253.75,
              net_total_to_pay_ghs: 253.75,
            },
          });
        }
        return Promise.resolve({
          data: {
            valid: true,
            promo_code_applied: null,
            promo_discount_ghs: 0.0,
            credit_discount_ghs: 0.0,
            base_platform_fee: 13.75,
            effective_platform_fee: 13.75,
            final_platform_fee_ghs: 13.75,
            total_buyer_pays: 263.75,
            net_total_to_pay_ghs: 263.75,
          },
        });
      }
      return Promise.reject(new Error('not found'));
    };
    postSpy.mockImplementation(handlePost);
    clientPostSpy.mockImplementation(handlePost);

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    const titleElement = await screen.findByText('Vintage Leather Jacket');
    expect(titleElement).toBeDefined();

    // Baseline shows 263.75 total
    expect(screen.getByText('263.75')).toBeDefined();

    // Find promo code input and enter PROMO10
    const promoInput = screen.getByPlaceholderText(/ENTER PROMO CODE/i);
    fireEvent.change(promoInput, { target: { value: 'PROMO10' } });

    const applyButton = screen.getByRole('button', { name: /apply/i });
    fireEvent.click(applyButton);

    // Wait for promo validation response to render
    await waitFor(() => {
      expect(screen.getByText(/Promo code "PROMO10" applied/i)).toBeDefined();
    });

    // Net Escrow Fee line must appear with GHS 3.75
    expect(screen.getByText('Net Escrow Fee')).toBeDefined();
    expect(screen.getByText('GHS 3.75')).toBeDefined();

    // Total must be updated from 263.75 -> 253.75
    expect(screen.getByText('253.75')).toBeDefined();
  });

  it('renders correctly when seller absorbs escrow protection fees', async () => {
    const mockLinkDataAbsorb = {
      ...mockLinkDataPassToBuyer,
      fee_handling: 'ABSORB_FEES',
    };

    const handleGet = (url: string) => {
      if (url.includes(`/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataAbsorb });
      }
      if (url.includes('/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    };
    getSpy.mockImplementation(handleGet);
    clientGetSpy.mockImplementation(handleGet);

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    const titleElement = await screen.findByText('Vintage Leather Jacket');
    expect(titleElement).toBeDefined();
    expect(screen.getByText(/Covered by Seller/i)).toBeDefined();

    // Total is strictly Item (200) + Shipping (50) = 250.00
    expect(screen.getByText('250.00')).toBeDefined();
  });

  it('displays error message when promo code has reached its maximum global redemptions', async () => {
    const handleGet = (url: string) => {
      if (url.includes(`/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataPassToBuyer });
      }
      if (url.includes('/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    };
    getSpy.mockImplementation(handleGet);
    clientGetSpy.mockImplementation(handleGet);

    const handlePost = (url: string) => {
      if (url.includes('/checkout/validate-promo')) {
        return Promise.resolve({
          data: {
            valid: false,
            promo_error: 'This promo code is no longer valid.',
            promo_discount_ghs: 0.0,
            credit_discount_ghs: 0.0,
            base_platform_fee: 13.75,
            effective_platform_fee: 13.75,
            final_platform_fee_ghs: 13.75,
            total_buyer_pays: 263.75,
            net_total_to_pay_ghs: 263.75,
          },
        });
      }
      return Promise.reject(new Error('not found'));
    };
    postSpy.mockImplementation(handlePost);
    clientPostSpy.mockImplementation(handlePost);

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Vintage Leather Jacket');

    const promoInput = screen.getByPlaceholderText(/ENTER PROMO CODE/i);
    fireEvent.change(promoInput, { target: { value: 'EXHAUSTED50' } });

    const applyButton = screen.getByRole('button', { name: /apply/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/no longer valid/i)).toBeDefined();
    });

    // Total remains baseline (263.75)
    expect(screen.getByText('263.75')).toBeDefined();
  });

  it('displays error when buyer has already redeemed the promo code maximum allowed times', async () => {
    const handleGet = (url: string) => {
      if (url.includes(`/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataPassToBuyer });
      }
      if (url.includes('/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    };
    getSpy.mockImplementation(handleGet);
    clientGetSpy.mockImplementation(handleGet);

    const handlePost = (url: string) => {
      if (url.includes('/checkout/validate-promo')) {
        return Promise.resolve({
          data: {
            valid: false,
            promo_error: 'You have already redeemed promo code FIRST20 the maximum allowed times.',
            promo_discount_ghs: 0.0,
            credit_discount_ghs: 0.0,
            base_platform_fee: 13.75,
            effective_platform_fee: 13.75,
            final_platform_fee_ghs: 13.75,
            total_buyer_pays: 263.75,
            net_total_to_pay_ghs: 263.75,
          },
        });
      }
      return Promise.reject(new Error('not found'));
    };
    postSpy.mockImplementation(handlePost);
    clientPostSpy.mockImplementation(handlePost);

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Vintage Leather Jacket');

    const promoInput = screen.getByPlaceholderText(/ENTER PROMO CODE/i);
    fireEvent.change(promoInput, { target: { value: 'FIRST20' } });

    const applyButton = screen.getByRole('button', { name: /apply/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/already redeemed promo code FIRST20/i)).toBeDefined();
    });
  });

  it('renders horizontal escrow progress stepper and partial refund status on post-payment status screen', async () => {
    const mockTxnPartialRefund = {
      id: 'txn-part-100',
      title: 'Vintage Leather Jacket',
      status: 'REFUNDED',
      is_partial_refund: true,
      total_amount_ghs: 250.0,
      buyer_refund_amount_ghs: 150.0,
      seller_amount_ghs: 100.0,
      buyer_email: 'buyer@example.com',
      paystack_reference: 'REF_PARTIAL_100',
      created_at: new Date().toISOString(),
      fee_handling: 'PASS_TO_BUYER',
    };

    clientGetSpy.mockImplementation((url: string) => {
      if (url.includes('/checkout/transaction/REF_PARTIAL_100')) {
        return Promise.resolve({ data: mockTxnPartialRefund });
      }
      return Promise.reject(new Error('not found'));
    });

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}?reference=REF_PARTIAL_100`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    // Verifies status title
    const partialTitle = await screen.findByText('Partially Refunded');
    expect(partialTitle).toBeInTheDocument();

    // Verifies horizontal progress stepper labels
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Dispatch')).toBeInTheDocument();
    expect(screen.getByText('Inspection')).toBeInTheDocument();
    expect(screen.getByText('Partial Refund')).toBeInTheDocument();
    expect(screen.getByText('Settled')).toBeInTheDocument();
  });

  it('renders side-by-side action buttons on Item received? card during delivery in progress when unlocked', async () => {
    const mockTxnInTransit = {
      id: 'txn-transit-200',
      title: 'Vintage Leather Jacket',
      status: 'DELIVERY_IN_PROGRESS',
      total_amount_ghs: 250.0,
      buyer_email: 'buyer@example.com',
      paystack_reference: 'REF_TRANSIT_200',
      created_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
      dispatched_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
      fee_handling: 'PASS_TO_BUYER',
    };

    clientGetSpy.mockImplementation((url: string) => {
      if (url.includes('/checkout/transaction/REF_TRANSIT_200')) {
        return Promise.resolve({ data: mockTxnInTransit });
      }
      return Promise.reject(new Error('not found'));
    });

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}?reference=REF_TRANSIT_200`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Item received?');

    const confirmBtn = screen.getByRole('button', { name: /Confirm Receipt/i });
    const disputeBtn = screen.getByRole('button', { name: /Raise Dispute/i });

    expect(confirmBtn).toBeInTheDocument();
    expect(disputeBtn).toBeInTheDocument();

    // Both buttons should be siblings in the flex-row container
    expect(confirmBtn.parentElement).toBe(disputeBtn.parentElement);
  });

  it('locks Raise Dispute button with countdown when in-transit order is dispatched less than 48 hours ago', async () => {
    const mockTxnRecentTransit = {
      id: 'txn-transit-recent',
      title: 'Vintage Leather Jacket',
      status: 'DELIVERY_IN_PROGRESS',
      total_amount_ghs: 250.0,
      buyer_email: 'buyer@example.com',
      paystack_reference: 'REF_RECENT_TRANSIT',
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      dispatched_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      fee_handling: 'PASS_TO_BUYER',
    };

    clientGetSpy.mockImplementation((url: string) => {
      if (url.includes('/checkout/transaction/REF_RECENT_TRANSIT')) {
        return Promise.resolve({ data: mockTxnRecentTransit });
      }
      return Promise.reject(new Error('not found'));
    });

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}?reference=REF_RECENT_TRANSIT`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Item received?');

    const lockedDisputeBtn = screen.getByRole('button', { name: /Dispute Unlocks in/i });
    expect(lockedDisputeBtn).toBeInTheDocument();
    expect(lockedDisputeBtn).toBeDisabled();
    expect(lockedDisputeBtn.textContent).toContain('42h');
  });

  it('filters dispute categories to non-delivery options and displays in-transit banner when unlocked in transit', async () => {
    const mockTxnUnlockedTransit = {
      id: 'txn-transit-unlocked',
      title: 'Vintage Leather Jacket',
      status: 'DELIVERY_IN_PROGRESS',
      total_amount_ghs: 250.0,
      buyer_email: 'buyer@example.com',
      paystack_reference: 'REF_UNLOCKED_TRANSIT',
      created_at: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
      dispatched_at: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
      fee_handling: 'PASS_TO_BUYER',
    };

    clientGetSpy.mockImplementation((url: string) => {
      if (url.includes('/checkout/transaction/REF_UNLOCKED_TRANSIT')) {
        return Promise.resolve({ data: mockTxnUnlockedTransit });
      }
      return Promise.reject(new Error('not found'));
    });

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}?reference=REF_UNLOCKED_TRANSIT`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText('Item received?');

    const disputeBtn = screen.getByRole('button', { name: /Raise Dispute/i });
    expect(disputeBtn).not.toBeDisabled();
    fireEvent.click(disputeBtn);

    // Modal opens
    expect(screen.getByText('Raise Transaction Dispute')).toBeInTheDocument();
    expect(screen.getByText('Package Currently In Transit')).toBeInTheDocument();

    // Only non-delivery options should be present in the select dropdown
    expect(screen.getByRole('option', { name: /Item Not Received/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Other Issue/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Item Damaged or Broken/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Defective, Malfunctioning/i })).not.toBeInTheDocument();
  });

  it('places referral card above How Delivery & Receipt Works card and opens cancellation modal', async () => {
    const mockTxnPaymentReceived = {
      id: 'txn-paid-300',
      title: 'Vintage Leather Jacket',
      status: 'PAYMENT_RECEIVED',
      total_amount_ghs: 250.0,
      buyer_email: 'buyer@example.com',
      paystack_reference: 'REF_PAID_300',
      created_at: new Date().toISOString(),
      fee_handling: 'PASS_TO_BUYER',
      is_instant_cancel_eligible: true,
      instant_cancel_remaining_minutes: 55,
      instant_cancel_window_hours: 1,
    };

    clientGetSpy.mockImplementation((url: string) => {
      if (url.includes('/checkout/transaction/REF_PAID_300')) {
        return Promise.resolve({ data: mockTxnPaymentReceived });
      }
      if (url.includes('/escrow/txn-paid-300/cancel-preview')) {
        return Promise.resolve({
          data: {
            transaction_id: 'txn-paid-300',
            status: 'PAYMENT_RECEIVED',
            is_undispatched: true,
            is_instant_eligible: true,
            instant_window_hours: 1,
            instant_window_remaining_minutes: 55,
            seller_response_window_hours: 1.5,
            gross_amount_ghs: 250.0,
            platform_fee_ghs: 13.75,
            gateway_fee_ghs: 4.88,
            wallet_payout_fee_ghs: 0.0,
            momo_payout_fee_ghs: 4.88,
            wallet_net_refund_ghs: 250.0,
            momo_net_refund_ghs: 245.12,
            buyer_phone: '0244112233',
            buyer_email: 'buyer@example.com',
            has_existing_account: false,
          },
        });
      }
      return Promise.reject(new Error('not found'));
    });

    render(
      <MemoryRouter initialEntries={[`/l/${mockLinkId}?reference=REF_PAID_300`]}>
        <Routes>
          <Route path="/l/:linkId" element={<PublicCheckoutView />} />
        </Routes>
      </MemoryRouter>
    );

    // Referral card is present
    const refCardTitle = await screen.findByText(/Refer Friends & Get GH₵ 10.00 Credits!/i);
    expect(refCardTitle).toBeInTheDocument();

    // Cancellation button exists
    const cancelBtn = screen.getByText(/Instant Self-Cancellation Available/i);
    expect(cancelBtn).toBeInTheDocument();

    // Clicking trigger opens BuyerCancelModal
    const cancelTriggerBtn = screen.getByRole('button', { name: /Cancel\s*Order/i });
    fireEvent.click(cancelTriggerBtn);

    await waitFor(() => {
      expect(screen.getByText(/Instant Order Cancellation/i)).toBeInTheDocument();
    });
  });
});

