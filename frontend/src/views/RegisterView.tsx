import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Lock, Phone, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';

export default function RegisterView() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!/^[\w]{3,30}$/.test(username.trim())) {
      setError('Username must be 3–30 characters: letters, numbers, and underscores only.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^[\d+\s()-]{7,20}$/.test(phone.trim())) {
      setError('Please enter a valid phone number (7–20 digits).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/register', {
        username: username.trim(),
        email: email.trim(),
        password,
        phone_number: phone.trim(),
        role: 'SELLER'
      });
      setRegisteredEmail(email.trim());
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 -ml-20 -mt-20 w-96 h-96 bg-indigo-100 dark:bg-indigo-950/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
      <div className="absolute bottom-0 right-0 -mr-20 -mb-20 w-96 h-96 bg-blue-100 dark:bg-blue-950/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="mx-auto flex justify-center items-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 mb-6">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline transition-colors">
            Sign in instead
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20 dark:border-slate-800">
          {registeredEmail ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-lg">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Account Created!</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                We've sent an activation link to <strong className="text-slate-900 dark:text-slate-200">{registeredEmail}</strong>. Please check your inbox and click the link to activate your account.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all text-sm"
                >
                  Proceed to Sign In
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleRegister}>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 text-sm text-red-600 dark:text-red-400 font-medium">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Username</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-3 border bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors" placeholder="johndoe" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email Address</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-3 border bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors" placeholder="john@example.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Phone Number</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-3 border bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors" placeholder="0241234567" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>
                  <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-3 border bg-white/50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 transition-colors" placeholder="••••••••" />
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
