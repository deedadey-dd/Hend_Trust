import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';

export default function ResetPasswordView() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!uid || !token) {
      setError('Invalid or missing password reset link parameter.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        uid,
        token,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Failed to reset password. Link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100 dark:bg-blue-950/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-100 dark:bg-indigo-950/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="mx-auto flex justify-center items-center w-16 h-16 rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20 mb-6">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
          Reset Your Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
          Enter a new secure password for your HendAxis Trust account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20 dark:border-slate-800">
          {!uid || !token ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto" />
              <h3 className="font-bold text-red-900 dark:text-red-300 text-base">Invalid Reset Link</h3>
              <p className="text-sm text-red-700 dark:text-red-400">
                This password reset link is invalid or incomplete. Please request a new link.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow"
              >
                Request New Password Reset
              </Link>
            </div>
          ) : success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Password Reset Complete!</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                Your password has been successfully updated. You can now log in with your new credentials.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all text-sm"
                >
                  Sign In to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 text-sm text-red-600 dark:text-red-400 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">New Password</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 border bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Confirm New Password</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 border bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
