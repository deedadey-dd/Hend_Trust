import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import RegisterView from './RegisterView';

describe('RegisterView Component', () => {
  it('renders registration form inputs and submit button', () => {
    render(
      <BrowserRouter>
        <RegisterView />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('johndoe')).toBeDefined();
    expect(screen.getByPlaceholderText('john@example.com')).toBeDefined();
    expect(screen.getByPlaceholderText('0241234567')).toBeDefined();
    expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
  });

  it('triggers client-side validation error for short username', () => {
    render(
      <BrowserRouter>
        <RegisterView />
      </BrowserRouter>
    );

    const usernameInput = screen.getByPlaceholderText('johndoe');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    if (form) {
      fireEvent.submit(form);
    }

    expect(screen.getByText(/username must be 3–30 characters/i)).toBeDefined();
  });

  it('triggers client-side validation error for short password', () => {
    render(
      <BrowserRouter>
        <RegisterView />
      </BrowserRouter>
    );

    const usernameInput = screen.getByPlaceholderText('johndoe');
    const emailInput = screen.getByPlaceholderText('john@example.com');
    const phoneInput = screen.getByPlaceholderText('0241234567');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const form = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'valid_user' } });
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '0240001122' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });

    if (form) {
      fireEvent.submit(form);
    }

    expect(screen.getByText(/password must be at least 8 characters long/i)).toBeDefined();
  });
});
