import { useState } from 'react';
import { Mail, AlertTriangle, Loader2, CheckCircle, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export default function UnverifiedEmailBanner() {
  const { isAuthenticated, user } = useAuthStore();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('dismiss_unverified_email_banner') === 'true';
  });
  const [loading, setLoading] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Only show if user is authenticated and explicitly has is_email_verified === false
  if (!isAuthenticated || !user || user.is_email_verified !== false || dismissed) {
    return null;
  }

  const handleResend = async () => {
    if (!user.email) return;
    setLoading(true);
    setSentMessage('');
    setErrorMessage('');
    try {
      await apiClient.post('/auth/resend-activation', { email: user.email });
      setSentMessage(`Verification link sent to ${user.email}! Please check your inbox & spam folder.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.response?.data?.detail || 'Failed to resend activation link. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('dismiss_unverified_email_banner', 'true');
  };

  return (
    <aside aria-label="Email verification alert" className="relative z-30 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-300/40 dark:border-amber-700/40 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 transition-all backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <p className="font-medium">
            <span className="font-bold">Email confirmation pending:</span> We noticed your email <span className="font-semibold underline decoration-amber-400">{user.email}</span> is not yet verified. Please check your inbox to confirm ownership.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {sentMessage ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-3.5 w-3.5" />
              Sent! Check inbox
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-60 transition shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3" />
                  Resend Link
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-800/50 text-amber-700 dark:text-amber-400 transition cursor-pointer"
            title="Dismiss notice for this session"
            aria-label="Dismiss email verification notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <p className="max-w-6xl mx-auto mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium text-center sm:text-left">
          {errorMessage}
        </p>
      )}
    </aside>
  );
}
