import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from './notificationStore';
import { useAuthStore } from './authStore';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('notificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({ unreadCount: 0, isLoading: false });
    useAuthStore.getState().logout();
  });

  it('initializes with unreadCount 0', () => {
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('updates unreadCount via setUnreadCount number and functional updater', () => {
    useNotificationStore.getState().setUnreadCount(5);
    expect(useNotificationStore.getState().unreadCount).toBe(5);

    useNotificationStore.getState().setUnreadCount((prev) => prev + 2);
    expect(useNotificationStore.getState().unreadCount).toBe(7);

    useNotificationStore.getState().decrementUnreadCount(1);
    expect(useNotificationStore.getState().unreadCount).toBe(6);
  });

  it('does not fetch unreadCount when user is unauthenticated', async () => {
    const count = await useNotificationStore.getState().fetchUnreadCount();
    expect(count).toBe(0);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('deduplicates simultaneous in-flight fetchUnreadCount requests into a single API call', async () => {
    useAuthStore.getState().login('token', { id: '1', role: 'SELLER', email: 'test@example.com' });

    (apiClient.get as any).mockResolvedValueOnce({
      data: { unread_count: 4 },
    });

    // Call fetchUnreadCount 3 times in parallel
    const [c1, c2, c3] = await Promise.all([
      useNotificationStore.getState().fetchUnreadCount(),
      useNotificationStore.getState().fetchUnreadCount(),
      useNotificationStore.getState().fetchUnreadCount(),
    ]);

    expect(c1).toBe(4);
    expect(c2).toBe(4);
    expect(c3).toBe(4);
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(useNotificationStore.getState().unreadCount).toBe(4);
  });
});
