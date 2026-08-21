import { useState, useEffect } from 'react';
import { 
  User, Wallet, Zap, PiggyBank, Phone, Building2, 
  Save, Loader2, CheckCircle, AlertTriangle
} from 'lucide-react';
import { apiClient } from '../api/client';

interface ProfileData {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  payout_mode: 'INSTANT' | 'MANUAL';
  preferred_payout_type: 'MOMO' | 'BANK' | null;
  momo_number: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  total_paystack_fees_ghs: number | null;
}

export default function ProfileView() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'MANUAL'>('INSTANT');
  const [payoutType, setPayoutType] = useState<'MOMO' | 'BANK'>('MOMO');
  const [momoNumber, setMomoNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/profile/');
        const data = res.data as ProfileData;
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPayoutMode(data.payout_mode || 'INSTANT');
        setPayoutType(data.preferred_payout_type || 'MOMO');
        setMomoNumber(data.momo_number || '');
        setBankAccount(data.bank_account_number || '');
        setBankName(data.bank_name || '');
      } catch {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      await apiClient.patch('/profile/', {
        first_name: firstName,
        last_name: lastName,
        payout_mode: payoutMode,
        preferred_payout_type: payoutType,
        momo_number: payoutType === 'MOMO' ? momoNumber : null,
        bank_account_number: payoutType === 'BANK' ? bankAccount : null,
        bank_name: payoutType === 'BANK' ? bankName : null,
      });
      setSuccess('Profile saved successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Account Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your profile and payout preferences.</p>
        </div>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-xl text-sm font-medium">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl text-sm font-medium">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Account Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Account Information</h2>
              <p className="text-xs text-gray-500">Your public seller identity</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Last name"
                />
              </div>
            </div>
            {/* Read-only fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                  {profile?.username}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                  {profile?.phone_number}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Mode Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Payout Settings</h2>
              <p className="text-xs text-gray-500">Choose how you receive your earnings</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5">
            
            {/* Payout Mode Cards */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Payout Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <button
                  type="button"
                  onClick={() => setPayoutMode('INSTANT')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    payoutMode === 'INSTANT'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center mb-3 ${
                    payoutMode === 'INSTANT' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Zap className={`h-5 w-5 ${payoutMode === 'INSTANT' ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>
                  <p className={`font-semibold text-sm ${payoutMode === 'INSTANT' ? 'text-blue-800' : 'text-gray-800'}`}>
                    Instant Payout
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Funds are transferred to your account automatically when a transaction is completed.
                  </p>
                  {payoutMode === 'INSTANT' && (
                    <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMode('MANUAL')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    payoutMode === 'MANUAL'
                      ? 'border-purple-500 bg-purple-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center mb-3 ${
                    payoutMode === 'MANUAL' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <PiggyBank className={`h-5 w-5 ${payoutMode === 'MANUAL' ? 'text-purple-600' : 'text-gray-500'}`} />
                  </div>
                  <p className={`font-semibold text-sm ${payoutMode === 'MANUAL' ? 'text-purple-800' : 'text-gray-800'}`}>
                    Manual Withdrawal
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Earnings accumulate in your HendAxis wallet. Withdraw in bulk whenever you choose.
                  </p>
                  {payoutMode === 'MANUAL' && (
                    <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <CheckCircle className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Paystack Fee Notice */}
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">1.95% Paystack Transfer Fee</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  Paystack charges a <strong>1.95%</strong> fee on all outgoing transfers (payouts and refunds). 
                  This is deducted from your transfer amount and logged transparently in your ledger.
                  {profile?.total_paystack_fees_ghs !== null && profile?.total_paystack_fees_ghs !== undefined && (
                    <> You have paid <strong>GHS {Number(profile.total_paystack_fees_ghs).toFixed(2)}</strong> in transfer fees to date.</>
                  )}
                </p>
              </div>
            </div>

            {/* Payout Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Payout Destination</label>
              <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPayoutType('MOMO')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all ${
                    payoutType === 'MOMO' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Phone className="h-4 w-4" /> Mobile Money
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutType('BANK')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-semibold transition-all ${
                    payoutType === 'BANK' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Building2 className="h-4 w-4" /> Bank Account
                </button>
              </div>

              {payoutType === 'MOMO' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">MoMo Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={momoNumber}
                      onChange={e => setMomoNumber(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="e.g. 024 000 0000"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        placeholder="e.g. GCB Bank"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={e => setBankAccount(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Account number"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-70 text-sm"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

      </div>
    </div>
  );
}
