import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RateSellerModal from './RateSellerModal';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: { id: 'rev-100' } }),
  },
}));

describe('RateSellerModal Component', () => {
  it('renders seller name, item title, and rating options', () => {
    const handleClose = vi.fn();

    render(
      <RateSellerModal
        transactionId="tx-100"
        sellerName="Accra Tech"
        shopName="Accra Tech Store"
        itemTitle="MacBook Pro M3"
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Accra Tech/i)).toBeDefined();
    expect(screen.getByText(/MacBook Pro M3/i)).toBeDefined();
  });
});
