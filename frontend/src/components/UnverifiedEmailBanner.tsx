import { useState } from 'react';
import { Mail, AlertTriangle, Loader2, CheckCircle, X, Edit2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export default function UnverifiedEmailBanner() {
  const { isAuthenticated, user, updateUser } = useAuthStore();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('dismiss_unverified_email_banner') === 'true';
  });
  const [loadingResend, setLoadingResend] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [loadingChange, setLoadingChange] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Only show if user is authenticated and explicitly has is_email_verified === false
  if (!isAuthenticated || !user || user.is_email_verified !== false || dismissed) {
    return null;
  }

  const handleResend = async () => {
    if (!user.email) return;
    setLoadingResend(true);
    setSentMessage('');
    setErrorMessage('');
    try {
      await apiClient.post('/auth/resend-activation', { email: user.email });
      setSentMessage(`Verification link sent to ${user.email}! Please check your inbox & spam folder.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.response?.data?.detail || 'Failed to resend activation link. Please try again later.');
    } finally {
      setLoadingResend(false);
    }
  };

  const handleOpenEdit = () => {
    setNewEmail(user.email || '');
    setErrorMessage('');
    setIsEditingEmail(true);
  };

  const handleCancelEdit = () => {
    setIsEditingEmail(false);
    setErrorMessage('');
  };

  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter an email address.');
      return;
    }
    // Basic format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoadingChange(true);
    setErrorMessage('');
    setSentMessage('');

    try {
      const res = await apiClient.post('/auth/change-email', { new_email: cleanEmail });
      const updatedEmail = res.data?.email || cleanEmail;
      updateUser({ email: updatedEmail, is_email_verified: false });
      setSentMessage(res.data?.message || `Email updated to ${updatedEmail}! Verification link sent to your inbox.`);
      setIsEditingEmail(false);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.response?.data?.detail || 'Failed to update email. Please try again.');
    } finally {
      setLoadingChange(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('dismiss_unverified_email_banner', 'true');
  };

  return (
    <aside aria-label="Email verification alert" className="relative z-30 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-300/40 dark:border-amber-700/40 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 transition-all backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        {isEditingEmail ? (
          /* Inline Email Edit Form */
          <form onSubmit={handleChangeEmailSubmit} className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-xs whitespace-nowrap">Change Email:</span>
              <input
                type="email"
                required
                autoFocus
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                className="w-full sm:w-64 px-2.5 py-1 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="submit"
                disabled={loadingChange}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-60 transition shadow-sm cursor-pointer"
              >
                {loadingChange ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-3 w-3" />
                    Update & Send Link
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loadingChange}
                className="px-2.5 py-1 rounded-lg font-medium text-[11px] text-amber-800 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-800/40 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* Default Unverified Notice */
          <>
            <div className="flex items-center gap-2 text-center sm:text-left">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <p className="font-medium">
                <span className="font-bold">Email confirmation pending:</span> We noticed your email <span className="font-semibold underline decoration-amber-400">{user.email}</span> is not yet verified. Please verify ownership to secure your account.
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
                  disabled={loadingResend}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-60 transition shadow-sm cursor-pointer"
                >
                  {loadingResend ? (
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
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-400/10 dark:hover:bg-amber-400/20 border border-amber-300/40 dark:border-amber-700/40 transition cursor-pointer"
                title="Change unverified email address"
              >
                <Edit2 className="h-3 w-3" />
                Change Email
              </button>

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
          </>
        )}
      </div>

      {errorMessage && (
        <p className="max-w-6xl mx-auto mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium text-center sm:text-left">
          {errorMessage}
        </p>
      )}
    </aside>
  );
}
