import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ModalProvider } from '../context/ModalContext';
import CreatePaymentLinkView from './CreatePaymentLinkView';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { items: [] } }),
    post: vi.fn().mockResolvedValue({ data: { id: 'link-123' } }),
  },
}));

describe('CreatePaymentLinkView Component', () => {
  it('renders product title input field', async () => {
    await act(async () => {
      render(
        <ModalProvider>
          <BrowserRouter>
            <CreatePaymentLinkView />
          </BrowserRouter>
        </ModalProvider>
      );
    });

    expect(screen.getByPlaceholderText('e.g., iPhone 13 Pro Max')).toBeDefined();
  });

  it('updates title state on user input', async () => {
    await act(async () => {
      render(
        <ModalProvider>
          <BrowserRouter>
            <CreatePaymentLinkView />
          </BrowserRouter>
        </ModalProvider>
      );
    });

    const titleInput = screen.getByPlaceholderText('e.g., iPhone 13 Pro Max') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(titleInput, { target: { value: 'iPhone 15 Pro Max' } });
    });
    expect(titleInput.value).toBe('iPhone 15 Pro Max');
  });

  it('renders Ready-to-Ship Advisory with dynamic shipping timeout days', async () => {
    await act(async () => {
      render(
        <ModalProvider>
          <BrowserRouter>
            <CreatePaymentLinkView />
          </BrowserRouter>
        </ModalProvider>
      );
    });

    expect(screen.getByText(/Ready-to-Ship Advisory/i)).toBeDefined();
    expect(screen.getByText(/shipping window/i)).toBeDefined();
  });
});

