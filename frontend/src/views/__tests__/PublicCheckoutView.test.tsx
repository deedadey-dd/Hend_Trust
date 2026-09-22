import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
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

  beforeEach(() => {
    vi.clearAllMocks();
    getSpy = vi.spyOn(axios, 'get');
    postSpy = vi.spyOn(axios, 'post');
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  it('renders checkout details and computes baseline 1.5% + GHS 10 escrow fee for buyer', async () => {
    getSpy.mockImplementation((url: string) => {
      if (url.includes(`/api/v1/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataPassToBuyer });
      }
      if (url.includes('/api/v1/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    });

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
    getSpy.mockImplementation((url: string) => {
      if (url.includes(`/api/v1/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataPassToBuyer });
      }
      if (url.includes('/api/v1/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    });

    postSpy.mockImplementation((url: string) => {
      if (url.includes('/api/v1/checkout/validate-promo')) {
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
      return Promise.reject(new Error('not found'));
    });

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

    getSpy.mockImplementation((url: string) => {
      if (url.includes(`/api/v1/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataAbsorb });
      }
      if (url.includes('/api/v1/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    });

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
    getSpy.mockImplementation((url: string) => {
      if (url.includes(`/api/v1/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataPassToBuyer });
      }
      if (url.includes('/api/v1/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    });

    postSpy.mockImplementation((url: string) => {
      if (url.includes('/api/v1/checkout/validate-promo')) {
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
    });

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
    getSpy.mockImplementation((url: string) => {
      if (url.includes(`/api/v1/links/${mockLinkId}`)) {
        return Promise.resolve({ data: mockLinkDataPassToBuyer });
      }
      if (url.includes('/api/v1/escrow/public-settings')) {
        return Promise.resolve({ data: mockPublicSettings });
      }
      return Promise.reject(new Error('not found'));
    });

    postSpy.mockImplementation((url: string) => {
      if (url.includes('/api/v1/checkout/validate-promo')) {
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
    });

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
});
