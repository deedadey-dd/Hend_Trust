import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, User, Lock, Loader2, LogOut } from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';
import { useAuthStore } from '../store/authStore';

// Ensure cookies are sent with requests
apiClient.defaults.withCredentials = true;

export default function LoginView() {
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleResendActivation = async () => {
    if (!username) {
      setError('Please enter your email or username first.');
      return;
    }
    setResending(true);
    setResendMsg('');
    try {
      const res = await apiClient.post('/auth/resend-activation', { email: username });
      setResendMsg(res.data.message || 'Activation email sent!');
    } catch (err: any) {
      setResendMsg(getErrorMessage(err) || 'Failed to resend activation link.');
    } finally {
      setResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendMsg('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { username, password });
      const { user_id, username: uname, role, email } = res.data;
      login('', { id: user_id, role, email, name: uname });
      if (role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100 dark:bg-blue-950/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-100 dark:bg-indigo-950/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="mx-auto flex justify-center items-center w-16 h-16 rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20 mb-6">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
          Or{' '}
          <Link to="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors">
            create a new seller account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20 dark:border-slate-800">
          <form className="space-y-6" onSubmit={handleLogin}>
            {isExpired && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm text-amber-900 dark:text-amber-300 font-medium flex items-center gap-3 shadow-sm">
                <LogOut className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-300">Session Expired</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">Your session has timed out. Please log in again to continue.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 text-sm text-red-600 dark:text-red-400 font-medium space-y-2">
                <p>{error}</p>
                {error.includes('activate your account') && (
                  <button
                    type="button"
                    onClick={handleResendActivation}
                    disabled={resending}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
                  >
                    {resending ? 'Sending activation link...' : 'Resend Activation Email'}
                  </button>
                )}
              </div>
            )}

            {resendMsg && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 text-sm text-blue-600 dark:text-blue-400 font-medium">
                {resendMsg}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Username or Email</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 border bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors" placeholder="johndoe" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 border bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors" placeholder="••••••••" />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-slate-300">
                  Remember me
                </label>
              </div>

              <div>
                <Link to="/forgot-password" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all">
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign in to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
