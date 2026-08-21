import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// No Authorization header needed — auth is fully cookie-based (HttpOnly cookies
// are forwarded automatically by the browser through the Vite proxy).

// Response Interceptor: On 401, log out and redirect to login only for
// protected seller pages — not for public checkout API calls.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const protectedPaths = ['/dashboard'];
      if (protectedPaths.some(p => window.location.pathname.startsWith(p))) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
