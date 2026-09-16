import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import TrustpilotReviewCard from './TrustpilotReviewCard';
import type { RecentReview } from './TrustpilotReviewCard';

const mockReview: RecentReview = {
  id: 'rev-001',
  buyer_name: 'Jane Doe',
  rating_speed: 5,
  rating_communication: 5,
  rating_overall: 5,
  comment: 'Excellent transaction experience!',
  created_at: '2026-09-14T00:00:00Z',
  item_title: 'iPhone 15 Pro Max',
  item_image_url: 'https://example.com/phone.jpg',
  upvotes_count: 12,
  downvotes_count: 1,
  user_voted: 'UP',
  shop: {
    seller_id: 'seller-1',
    seller_username: 'tech_store',
    shop_name: 'Tech Store Ltd',
  },
};

describe('TrustpilotReviewCard Component', () => {
  it('renders buyer name, review comment, and shop information', () => {
    const handleOpenModal = vi.fn();

    render(
      <BrowserRouter>
        <TrustpilotReviewCard review={mockReview} onOpenModal={handleOpenModal} />
      </BrowserRouter>
    );

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('"Excellent transaction experience!"')).toBeDefined();
    expect(screen.getByText('iPhone 15 Pro Max')).toBeDefined();
    expect(screen.getByText('Tech Store Ltd')).toBeDefined();
    expect(screen.getByText('@tech_store')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
  });

  it('triggers onOpenModal when card is clicked', () => {
    const handleOpenModal = vi.fn();

    render(
      <BrowserRouter>
        <TrustpilotReviewCard review={mockReview} onOpenModal={handleOpenModal} />
      </BrowserRouter>
    );

    const cardContainer = screen.getByText('Jane Doe').closest('div');
    if (cardContainer) {
      fireEvent.click(cardContainer);
    }
    expect(handleOpenModal).toHaveBeenCalledWith(mockReview);
  });
});
