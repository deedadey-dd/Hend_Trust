import { create } from 'zustand';
import { apiClient } from '../api/client';
import { useAuthStore } from './authStore';

interface NotificationState {
  unreadCount: number;
  isLoading: boolean;
  setUnreadCount: (count: number | ((prev: number) => number)) => void;
  decrementUnreadCount: (amount?: number) => void;
  fetchUnreadCount: (force?: boolean) => Promise<number>;
  initPolling: () => () => void;
}

let inFlightPromise: Promise<number> | null = null;
let pollingInterval: any = null;
let visibilityHandler: any = null;
let focusHandler: any = null;
let activeSubscriberCount = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  isLoading: false,

  setUnreadCount: (countOrUpdater) =>
    set((state) => ({
      unreadCount: Math.max(
        0,
        typeof countOrUpdater === 'function'
          ? countOrUpdater(state.unreadCount)
          : countOrUpdater
      ),
    })),

  decrementUnreadCount: (amount = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - amount) })),

  fetchUnreadCount: async (force = false) => {
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated) {
      set({ unreadCount: 0 });
      return 0;
    }

    // Deduplicate simultaneous requests
    if (inFlightPromise && !force) {
      return inFlightPromise;
    }

    inFlightPromise = (async () => {
      try {
        set({ isLoading: true });
        const res = await apiClient.get('/notifications/unread-count');
        const count = Number(res.data?.unread_count || 0);
        set({ unreadCount: count, isLoading: false });
        return count;
      } catch {
        set({ isLoading: false });
        return get().unreadCount;
      } finally {
        inFlightPromise = null;
      }
    })();

    return inFlightPromise;
  },

  initPolling: () => {
    activeSubscriberCount += 1;

    // Start single authoritative timer if not already running
    if (!pollingInterval) {
      const runPoll = () => {
        const auth = useAuthStore.getState();
        if (auth.isAuthenticated && document.visibilityState === 'visible') {
          get().fetchUnreadCount();
        }
      };

      // Initial fetch on mount
      runPoll();

      // Poll every 45s while tab is visible
      pollingInterval = setInterval(runPoll, 45000);

      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          runPoll();
        }
      };

      focusHandler = () => {
        runPoll();
      };

      document.addEventListener('visibilitychange', visibilityHandler);
      window.addEventListener('focus', focusHandler);
    }

    // Cleanup function when subscriber unmounts
    return () => {
      activeSubscriberCount = Math.max(0, activeSubscriberCount - 1);
      if (activeSubscriberCount === 0 && pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        if (visibilityHandler) {
          document.removeEventListener('visibilitychange', visibilityHandler);
          visibilityHandler = null;
        }
        if (focusHandler) {
          window.removeEventListener('focus', focusHandler);
          focusHandler = null;
        }
      }
    };
  },
}));
