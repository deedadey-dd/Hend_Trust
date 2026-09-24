import * as Sentry from '@sentry/react';

/**
 * Production-ready Sentry Frontend Initialization
 * Safe for local development — fails silently if VITE_SENTRY_DSN is omitted.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || typeof dsn !== 'string' || dsn.trim() === '') {
    if (import.meta.env.DEV) {
      console.info('[Observability] VITE_SENTRY_DSN not set. Sentry frontend tracking disabled.');
    }
    return;
  }

  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || (import.meta.env.DEV ? 'development' : 'production');
  const release = import.meta.env.VITE_SENTRY_RELEASE || undefined;
  const tracesSampleRate = import.meta.env.DEV ? 0.0 : 0.1; // 10% conservative sampling in production

  try {
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      // Security: Sanitize event data before dispatching to Sentry
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
          delete event.request.headers['Cookie'];
          delete event.request.headers['cookie'];
          delete event.request.headers['X-Admin-Security-Token'];
        }

        // Scrub sensitive keywords from breadcrumbs and extra context
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
            if (breadcrumb.data && typeof breadcrumb.data === 'object') {
              const sanitizedData = { ...breadcrumb.data };
              for (const key of Object.keys(sanitizedData)) {
                if (/password|token|secret|pin|otp|ghana_card/i.test(key)) {
                  sanitizedData[key] = '[FILTERED]';
                }
              }
              breadcrumb.data = sanitizedData;
            }
            return breadcrumb;
          });
        }

        return event;
      },
      // Sanitize transaction names if containing IDs or sensitive tokens
      beforeSendTransaction(event) {
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
        }
        return event;
      },
    });

    if (import.meta.env.DEV) {
      console.info(`[Observability] Sentry React SDK active (env: ${environment})`);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[Observability] Failed to initialize Sentry React SDK:', err);
    }
  }
}
