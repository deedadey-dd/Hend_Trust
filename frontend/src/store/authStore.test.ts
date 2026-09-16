import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('initializes with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('updates state on login', () => {
    const user = { id: 'usr-123', role: 'SELLER', email: 'seller@example.com' };
    useAuthStore.getState().login('mock-jwt-token', user);

    const state = useAuthStore.getState();
    expect(state.token).toBe('mock-jwt-token');
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });

  it('clears state on logout', () => {
    const user = { id: 'usr-123', role: 'SELLER', email: 'seller@example.com' };
    useAuthStore.getState().login('mock-jwt-token', user);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
