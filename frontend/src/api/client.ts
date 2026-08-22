import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export function getErrorMessage(err: any): string {
  if (!err) return 'An unexpected error occurred.';
  if (typeof err === 'string') return err;
  const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (typeof detail === 'object' && detail !== null) {
    if (detail.string) return detail.string;
    return JSON.stringify(detail);
  }
  return 'An unexpected error occurred.';
}

// Response Interceptor: On 401/403 (token invalid or expired), log out and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const isPublicPath = window.location.pathname.startsWith('/l/') || window.location.pathname === '/track';
      if (!isPublicPath) {
        useAuthStore.getState().logout();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);
