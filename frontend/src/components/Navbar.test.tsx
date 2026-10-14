import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { available_balance_ghs: 125.50 } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../context/ModalContext', () => ({
  useModal: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    alert: vi.fn().mockResolvedValue(true),
  }),
}));

describe('Navbar Mobile Hamburger Menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'mock-token',
      user: {
        id: 'usr-1',
        name: 'Kofi Mensah',
        username: 'kmensah',
        email: 'kofi@example.com',
        role: 'BUYER',
        is_email_verified: true,
      },
    });
  });

  it('renders mobile menu toggle button and opens mobile drawer with user details and logout', async () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: /Toggle Navigation Menu/i });
    expect(toggleButton).toBeInTheDocument();

    // Drawer should not be present initially
    expect(document.getElementById('mobile-nav-drawer')).toBeNull();

    // Click hamburger button to open
    fireEvent.click(toggleButton);

    // Should display username, email and logout button inside mobile drawer
    const drawer = document.getElementById('mobile-nav-drawer');
    expect(drawer).not.toBeNull();
    expect(drawer).toHaveClass('mobile-menu-drawer');
    expect(drawer).toHaveClass('fixed');

    expect(within(drawer!).getByText('Kofi Mensah')).toBeInTheDocument();
    expect(within(drawer!).getByText('kofi@example.com')).toBeInTheDocument();
    expect(within(drawer!).getByRole('button', { name: /Log Out/i })).toBeInTheDocument();

    // Verify body scroll lock is applied
    expect(document.body.style.overflow).toBe('hidden');

    // Clicking Log Out triggers logout
    const logoutBtn = within(drawer!).getByRole('button', { name: /Log Out/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  it('renders solutions and guest actions for unauthenticated user in mobile drawer', () => {
    useAuthStore.setState({
      isAuthenticated: false,
      token: null,
      user: null,
    });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: /Toggle Navigation Menu/i });
    fireEvent.click(toggleButton);

    const drawer = document.getElementById('mobile-nav-drawer');
    expect(drawer).not.toBeNull();

    expect(screen.getByText('Log In to Account')).toBeInTheDocument();
    expect(screen.getByText('Get Started Free')).toBeInTheDocument();
  });

  it('renders prominent Track Order Status in mobile drawer and opens TrackingModal upon click', async () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: /Toggle Navigation Menu/i });
    fireEvent.click(toggleButton);

    const drawer = document.getElementById('mobile-nav-drawer');
    expect(drawer).not.toBeNull();

    // Prominent Track Order Status button is visible inside drawer
    const trackBtns = within(drawer!).getAllByText(/Track Order Status/i);
    expect(trackBtns.length).toBeGreaterThanOrEqual(1);

    // Clicking it opens the tracking modal
    fireEvent.click(trackBtns[0]);

    await waitFor(() => {
      // The modal title or input is rendered
      expect(screen.getByText(/Track Package Status/i)).toBeInTheDocument();
    });
  });

  it('renders prominent Track Order Status in desktop profile dropdown menu', async () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    // Desktop user menu trigger button
    const userDropdownTrigger = screen.getByText('Kofi Mensah');
    fireEvent.click(userDropdownTrigger);

    // Prominent Track Order button should appear in the open dropdown menu
    await waitFor(() => {
      expect(screen.getByText(/Instant courier & escrow lookup/i)).toBeInTheDocument();
    });
  });
});

