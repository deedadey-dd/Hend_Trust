import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CreatePaymentLinkView from './CreatePaymentLinkView';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { items: [] } }),
    post: vi.fn().mockResolvedValue({ data: { id: 'link-123' } }),
  },
}));

describe('CreatePaymentLinkView Component', () => {
  it('renders product title input field', () => {
    render(
      <BrowserRouter>
        <CreatePaymentLinkView />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('e.g., iPhone 13 Pro Max')).toBeDefined();
  });

  it('updates title state on user input', () => {
    render(
      <BrowserRouter>
        <CreatePaymentLinkView />
      </BrowserRouter>
    );

    const titleInput = screen.getByPlaceholderText('e.g., iPhone 13 Pro Max') as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'iPhone 15 Pro Max' } });
    expect(titleInput.value).toBe('iPhone 15 Pro Max');
  });
});
