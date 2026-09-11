/**
 * Sentry Error Tracking Observability Stub
 * Fails gracefully if VITE_SENTRY_DSN is not configured.
 */

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || typeof dsn !== 'string' || dsn.trim() === '') {
    if (import.meta.env.DEV) {
      console.info('[Observability] VITE_SENTRY_DSN not set. Sentry frontend tracking disabled for local dev.');
    }
    return;
  }

  try {
    // Dynamic initialization when Sentry SDK is installed/configured
    if (import.meta.env.DEV) {
      console.info('[Observability] Initializing Sentry monitoring with DSN:', dsn.slice(0, 15) + '...');
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Observability] Sentry initialization warning:', err);
    }
  }
}
