import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';

export default function ActivateAccountView() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!uid || !token) {
      setError('Invalid or missing activation parameters.');
      setLoading(false);
      return;
    }

    apiClient.post('/auth/activate-account', { uid, token })
      .then((res: any) => {
        setSuccess(true);
        setMessage(res.data.message || 'Account activated successfully!');
      })
      .catch((err: any) => {
        setError(getErrorMessage(err) || 'Failed to activate account. The activation link may be expired.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [uid, token]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100 dark:bg-blue-950/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-100 dark:bg-indigo-950/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="mx-auto flex justify-center items-center w-16 h-16 rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20 mb-6">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
          Account Activation
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20 dark:border-slate-800 text-center">
          {loading ? (
            <div className="py-8 space-y-4">
              <Loader2 className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400 mx-auto" />
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
                Verifying your account activation token...
              </p>
            </div>
          ) : success ? (
            <div className="space-y-5 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-lg">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Account Activated!</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                {message}
              </p>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all text-sm"
                >
                  Proceed to Sign In
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5 py-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400 shadow-lg">
                <XCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Activation Failed</h3>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {error}
              </p>
              <div className="pt-4 space-y-2">
                <Link
                  to="/login"
                  className="block w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-lg shadow-md transition-all text-sm"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
