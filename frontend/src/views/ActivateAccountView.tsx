import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, XCircle, Loader2, Smartphone, KeyRound } from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';

export default function ActivateAccountView() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const initialStep = searchParams.get('step') || 'email';
  const initialPhone = searchParams.get('phone') || '';
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'phone' | 'completed'>(
    initialStep === 'phone' ? 'phone' : 'email'
  );

  const [loading, setLoading] = useState(initialStep !== 'phone');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    if (initialStep === 'phone') {
      setLoading(false);
      return;
    }

    if (!uid || !token) {
      setError('Invalid or missing activation parameters.');
      setLoading(false);
      return;
    }

    apiClient.post('/auth/activate-account', { uid, token })
      .then((res: any) => {
        setMessage(res.data.message || 'Email verified successfully!');
        if (res.data.requires_phone_verification) {
          setStep('phone');
          if (res.data.phone_number) setPhoneNumber(res.data.phone_number);
        } else {
          setStep('completed');
        }
      })
      .catch((err: any) => {
        setError(getErrorMessage(err) || 'Failed to activate account. The activation link may be expired.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [uid, token, initialStep]);

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP verification code.');
      return;
    }
    setOtpError('');
    setVerifyingOtp(true);
    try {
      const res = await apiClient.post('/auth/verify-phone-otp', { uid, otp_code: otpCode.trim() });
      setMessage(res.data.message || 'Phone number verified successfully!');
      setStep('completed');
    } catch (err: any) {
      setOtpError(getErrorMessage(err) || 'Verification failed. Please check the code and try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendPhoneOtp = async () => {
    setResendingOtp(true);
    setResendMsg('');
    setOtpError('');
    try {
      const res = await apiClient.post('/auth/send-phone-otp', { uid });
      setResendMsg(res.data.message || 'Verification code resent to your phone.');
    } catch (err: any) {
      setOtpError(getErrorMessage(err) || 'Failed to resend SMS OTP.');
    } finally {
      setResendingOtp(false);
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
          Seller Account Verification
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
          ) : step === 'phone' ? (
            <div className="space-y-5 text-left">
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-lg">
                <Smartphone className="h-7 w-7" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verify Phone Number</h3>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Email verified! Enter the 6-digit SMS verification code sent to{' '}
                  <strong className="text-gray-800 dark:text-slate-200">{phoneNumber || 'your phone number'}</strong>.
                </p>
              </div>

              {otpError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
                  {otpError}
                </div>
              )}

              {resendMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  {resendMsg}
                </div>
              )}

              <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    6-Digit SMS Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-slate-500" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white font-mono text-center tracking-widest text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifyingOtp ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Activate Phone'}
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleResendPhoneOtp}
                  disabled={resendingOtp}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  {resendingOtp ? 'Resending SMS OTP...' : 'Resend SMS Verification Code'}
                </button>
              </div>
            </div>
          ) : step === 'completed' ? (
            <div className="space-y-5 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-lg">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Account Fully Verified!</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                {message || 'Email and phone number verified successfully! You can now log in to your seller dashboard.'}
              </p>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all text-sm cursor-pointer"
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
