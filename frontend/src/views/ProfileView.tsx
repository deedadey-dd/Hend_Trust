import React, { useState, useEffect } from 'react';
import { 
  User, Wallet, Zap, PiggyBank, Phone, Building2, 
  Save, Loader2, CheckCircle, AlertTriangle, ShieldCheck, FileCheck, Store, Clock, XCircle, Image as ImageIcon, Camera, X
} from 'lucide-react';
import { apiClient } from '../api/client';
import { compressImageToWebP } from '../utils/imageUtils';

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
  bank_code?: string | null;
  bank_account_name?: string | null;
  bank_name_matched?: boolean;
  total_paystack_fees_ghs: number | null;
  // Shop details
  shop_name: string;
  shop_description: string;
  shop_category: string;
  shop_categories: string[];
  profile_picture_url?: string;
  banner_url?: string;
  // Verification
  verification_status: 'UNSUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  national_id_number: string;
  national_id_photo_url: string;
  business_license_photo_url: string;
  verification_rejection_reason: string;
  verified_at?: string;
  is_2fa_enabled?: boolean;
}

const CATEGORY_OPTIONS = ['Electronics', 'Fashion', 'Beauty', 'Home & Living', 'Services', 'General'];

export default function ProfileView() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [submittingVerif, setSubmittingVerif] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetupModal, setShow2FASetupModal] = useState(false);
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Editable Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'MANUAL'>('INSTANT');
  const [payoutType, setPayoutType] = useState<'MOMO' | 'BANK'>('MOMO');
  const [momoNumber, setMomoNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankNameMatched, setBankNameMatched] = useState(true);
  const [banksList, setBanksList] = useState<Array<{ name: string; code: string; type?: string }>>([]);
  const [resolvingBank, setResolvingBank] = useState(false);
  const [bankResolveError, setBankResolveError] = useState('');

  // Editable Shop fields
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [profilePicture, setProfilePicture] = useState('');
  const [banner, setBanner] = useState('');
  const [isCompressingProfilePic, setIsCompressingProfilePic] = useState(false);
  const [isCompressingBanner, setIsCompressingBanner] = useState(false);

  // Verification fields
  const [idNumber, setIdNumber] = useState('');
  const [idPhoto, setIdPhoto] = useState('');
  const [licensePhoto, setLicensePhoto] = useState('');

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/profile/');
      const data = res.data as ProfileData;
      setProfile(data);
      setIs2FAEnabled(Boolean(data.is_2fa_enabled));
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setPayoutMode(data.payout_mode || 'INSTANT');
      setPayoutType(data.preferred_payout_type || 'MOMO');
      setMomoNumber(data.momo_number || '');
      setBankAccount(data.bank_account_number || '');
      setBankName(data.bank_name || '');
      setBankCode(data.bank_code || '');
      setBankAccountName(data.bank_account_name || '');
      setBankNameMatched(data.bank_name_matched !== false);
      
      setShopName(data.shop_name || '');
      setShopDescription(data.shop_description || '');
      setSelectedCategories(data.shop_categories || []);
      setProfilePicture(data.profile_picture_url || '');
      setBanner(data.banner_url || '');

      setIdNumber(data.national_id_number || '');
      setIdPhoto(data.national_id_photo_url || '');
      setLicensePhoto(data.business_license_photo_url || '');
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const res = await apiClient.get('/profile/banks');
      setBanksList(res.data || []);
    } catch {
      console.error("Failed to load supported banks directory.");
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchBanks();
  }, []);

  const handleResolveBank = async (codeToUse?: string, accToUse?: string) => {
    const targetCode = codeToUse || bankCode;
    const targetAcc = accToUse || bankAccount;
    if (!targetCode || !targetAcc || targetAcc.length < 5) return;
    setResolvingBank(true);
    setBankResolveError('');
    try {
      const res = await apiClient.post('/profile/resolve-bank-account', {
        bank_code: targetCode,
        account_number: targetAcc
      });
      if (res.data.success) {
        setBankAccountName(res.data.account_name);
        setBankNameMatched(Boolean(res.data.is_name_matched));
      } else {
        setBankAccountName('');
        setBankResolveError(res.data.message || "Failed to resolve account number with selected bank.");
      }
    } catch (err: any) {
      setBankAccountName('');
      setBankResolveError(err.response?.data?.message || "Error connecting to bank account resolution service.");
    } finally {
      setResolvingBank(false);
    }
  };

  // MoMo OTP Verification modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [momoOtp, setMomoOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  const requestMomoOtpCode = async (targetNumber: string) => {
    setSendingOtp(true);
    setOtpError('');
    try {
      await apiClient.post('/profile/request-momo-otp', { momo_number: targetNumber });
      setShowOtpModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send MoMo OTP verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!momoNumber) return;
    setSendingOtp(true);
    setOtpError('');
    try {
      await apiClient.post('/profile/request-momo-otp', { momo_number: momoNumber });
      setOtpError('A new verification code has been sent.');
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtpAndSave = async () => {
    if (momoOtp.length !== 6) {
      setOtpError('Please enter the full 6-digit verification code.');
      return;
    }
    setVerifyingOtp(true);
    setOtpError('');
    try {
      await apiClient.patch('/profile/', {
        first_name: firstName,
        last_name: lastName,
        payout_mode: payoutMode,
        preferred_payout_type: payoutType,
        momo_number: momoNumber,
        momo_otp: momoOtp,
        bank_account_number: payoutType === 'BANK' ? bankAccount : null,
        bank_name: payoutType === 'BANK' ? bankName : null,
      });
      setShowOtpModal(false);
      setMomoOtp('');
      setSuccess('Profile & MoMo Payout settings verified and saved!');
      setTimeout(() => setSuccess(''), 4000);
      fetchProfile();
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 2FA Setup & Disable Handlers
  const handleStart2FASetup = async () => {
    setTotpLoading(true);
    setTotpError('');
    try {
      const res = await apiClient.post('/profile/2fa/setup');
      setTotpSecret(res.data.secret || '');
      setQrCodeUri(res.data.qr_code || '');
      setTotpCode('');
      setShow2FASetupModal(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initialize 2FA setup.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleVerify2FASetup = async () => {
    if (totpCode.length !== 6) {
      setTotpError('Please enter the 6-digit code from your authenticator app.');
      return;
    }
    setTotpLoading(true);
    setTotpError('');
    try {
      await apiClient.post('/profile/2fa/verify', { otp_code: totpCode.trim() });
      setIs2FAEnabled(true);
      setShow2FASetupModal(false);
      setSuccess('Two-Factor Authentication (2FA) has been successfully enabled on your account!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || 'Invalid code. Please check your app and try again.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (totpCode.length !== 6) {
      setTotpError('Please enter the 6-digit code from your authenticator app.');
      return;
    }
    if (!disablePassword) {
      setTotpError('Please enter your account password.');
      return;
    }
    setTotpLoading(true);
    setTotpError('');
    try {
      await apiClient.post('/profile/2fa/disable', { password: disablePassword, otp_code: totpCode.trim() });
      setIs2FAEnabled(false);
      setShow2FADisableModal(false);
      setDisablePassword('');
      setTotpCode('');
      setSuccess('Two-Factor Authentication (2FA) has been disabled.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || 'Failed to disable 2FA.');
    } finally {
      setTotpLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSuccess('');
    setError('');

    // Check if user modified MoMo number
    const momoChanged = payoutType === 'MOMO' && momoNumber && momoNumber.trim() !== (profile?.momo_number || '');

    if (momoChanged) {
      // Trigger MoMo OTP request before saving
      await requestMomoOtpCode(momoNumber.trim());
      return;
    }

    setSaving(true);
    try {
      await apiClient.patch('/profile/', {
        first_name: firstName,
        last_name: lastName,
        payout_mode: payoutMode,
        preferred_payout_type: payoutType,
        momo_number: payoutType === 'MOMO' ? momoNumber : null,
        bank_account_number: payoutType === 'BANK' ? bankAccount : null,
        bank_name: payoutType === 'BANK' ? bankName : null,
        bank_code: payoutType === 'BANK' ? bankCode : null,
        bank_account_name: payoutType === 'BANK' ? bankAccountName : null,
      });
      setSuccess('Profile & Payout settings saved!');
      setTimeout(() => setSuccess(''), 4000);
      fetchProfile();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShop = async () => {
    if (selectedCategories.length > 3) {
      setError('You can select at most 3 product categories.');
      return;
    }
    setSavingShop(true);
    setSuccess('');
    setError('');
    try {
      await apiClient.put('/profile/shop', {
        shop_name: shopName,
        shop_description: shopDescription,
        shop_categories: selectedCategories,
        profile_picture_url: profilePicture,
        banner_url: banner
      });
      setSuccess('Shop details, logo, banner & categories updated!');
      setTimeout(() => setSuccess(''), 4000);
      fetchProfile();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update shop profile.');
    } finally {
      setSavingShop(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingProfilePic(true);
    try {
      const webp = await compressImageToWebP(file);
      setProfilePicture(webp);
    } catch {
      alert("Failed to process profile picture.");
    } finally {
      setIsCompressingProfilePic(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingBanner(true);
    try {
      const webp = await compressImageToWebP(file);
      setBanner(webp);
    } catch {
      alert("Failed to process cover banner image.");
    } finally {
      setIsCompressingBanner(false);
    }
  };

  const handleCategoryToggle = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(prev => prev.filter(c => c !== cat));
    } else {
      if (selectedCategories.length >= 3) {
        alert("Maximum of 3 product categories allowed.");
        return;
      }
      setSelectedCategories(prev => [...prev, cat]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setPhotoFn: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setPhotoFn(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) {
      setError('Please enter your National ID / Ghana Card number.');
      return;
    }
    if (!idPhoto) {
      setError('Please upload a photo of your National ID / Ghana Card.');
      return;
    }
    setSubmittingVerif(true);
    setSuccess('');
    setError('');
    try {
      await apiClient.post('/profile/submit-verification', {
        national_id_number: idNumber,
        national_id_photo_url: idPhoto,
        business_license_photo_url: licensePhoto
      });
      setSuccess('Verification documents submitted for manager review!');
      setTimeout(() => setSuccess(''), 4000);
      fetchProfile();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit verification documents.');
    } finally {
      setSubmittingVerif(false);
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
    <div className="min-h-[80vh] bg-gray-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Account & Storefront Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage your identity, store presentation, verification, and payout preferences.</p>
        </div>

        {/* Feedback Messages */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-emerald-950/40 text-green-700 dark:text-emerald-300 border border-green-200 dark:border-emerald-800 px-4 py-3 rounded-xl text-sm font-medium">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 px-4 py-3 rounded-xl text-sm font-medium">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* 1. SELLER VERIFICATION STATUS CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Seller Document Verification</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">Earn the official Verified Seller badge</p>
              </div>
            </div>

            {profile?.verification_status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
                <CheckCircle className="h-3.5 w-3.5" /> 🛡️ VERIFIED SELLER
              </span>
            )}
            {profile?.verification_status === 'PENDING' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">
                <Clock className="h-3.5 w-3.5" /> Pending Manager Approval
              </span>
            )}
            {profile?.verification_status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-3 py-1 rounded-full">
                <XCircle className="h-3.5 w-3.5" /> Rejected
              </span>
            )}
          </div>

          <div className="px-6 py-5 space-y-5">
            {profile?.verification_status === 'APPROVED' ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <p className="font-bold text-sm">🎉 Your Account is Verified!</p>
                <p>Your documents were verified on {profile.verified_at ? new Date(profile.verified_at).toLocaleDateString() : 'Management Review'}. Your store features the official Verified Seller badge across payment links and marketplace listings.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitVerification} className="space-y-4">
                {profile?.verification_status === 'REJECTED' && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 space-y-1">
                    <p className="font-bold">❌ Previous Submission Rejected:</p>
                    <p>{profile.verification_rejection_reason}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                  <p>
                    Enter your <strong>Ghana Card / National ID number</strong> and upload a clear photo of your card.
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" /> Instant NIA Auto-Verification enabled. Valid Ghana Cards are verified immediately!
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">National ID / Ghana Card Number *</label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    placeholder="e.g. GHA-123456789-0"
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">Format: GHA-XXXXXXXXX-X (15 characters)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* National ID Photo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">National ID Photo *</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, setIdPhoto)}
                      className="w-full text-xs text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-xl p-2 bg-gray-50 dark:bg-slate-800 cursor-pointer"
                    />
                    {idPhoto && (
                      <img src={idPhoto} alt="National ID" className="mt-2 h-20 w-36 object-cover rounded-lg border border-gray-300 dark:border-slate-700" />
                    )}
                  </div>

                  {/* Business License Photo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Business License <span className="text-gray-400 dark:text-slate-500">(optional)</span></label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, setLicensePhoto)}
                      className="w-full text-xs text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-xl p-2 bg-gray-50 dark:bg-slate-800 cursor-pointer"
                    />
                    {licensePhoto && (
                      <img src={licensePhoto} alt="Business License" className="mt-2 h-20 w-36 object-cover rounded-lg border border-gray-300 dark:border-slate-700" />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingVerif}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow flex justify-center items-center gap-2 cursor-pointer"
                >
                  {submittingVerif ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                  Submit for Auto / Manager Verification
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 2. STOREFRONT DISPLAY SETTINGS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
              <Store className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Public Storefront Presentation</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Displayed on your public profile and marketplace directory</p>
            </div>
          </div>
          
          <div className="px-6 py-5 space-y-5">
            {/* Branding Images: Logo & Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200/80 dark:border-slate-700">
              {/* Profile Picture / Logo */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Storefront Logo / Profile Picture
                  </label>
                  {isCompressingProfilePic && <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing WebP...</span>}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isCompressingProfilePic}
                  onChange={handleProfilePictureUpload}
                  className="w-full text-sm text-gray-600 dark:text-slate-400 border border-gray-300 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 cursor-pointer disabled:opacity-50"
                />
                {profilePicture && (
                  <div className="mt-2 relative inline-block">
                    <img src={profilePicture} alt="Profile Logo" className="h-16 w-16 object-cover rounded-xl border border-gray-300 dark:border-slate-700 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setProfilePicture('')}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700 cursor-pointer"
                      title="Remove Logo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Cover Banner */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Storefront Cover Banner
                  </label>
                  {isCompressingBanner && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing WebP...</span>}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isCompressingBanner}
                  onChange={handleBannerUpload}
                  className="w-full text-sm text-gray-600 dark:text-slate-400 border border-gray-300 dark:border-slate-700 rounded-xl p-2 bg-white dark:bg-slate-900 cursor-pointer disabled:opacity-50"
                />
                {banner && (
                  <div className="mt-2 relative inline-block">
                    <img src={banner} alt="Cover Banner" className="h-16 w-36 object-cover rounded-xl border border-gray-300 dark:border-slate-700 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setBanner('')}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700 cursor-pointer"
                      title="Remove Banner"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder="e.g. Accra Gadgets Hub"
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Shop Description</label>
              <textarea
                rows={3}
                value={shopDescription}
                onChange={e => setShopDescription(e.target.value)}
                placeholder="Briefly describe your business, shipping options, and warranty terms..."
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Product Categories (Select at most 3)</label>
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORY_OPTIONS.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">Selected: {selectedCategories.length} / 3 categories</span>
            </div>

            <button
              onClick={handleSaveShop}
              disabled={savingShop}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow flex justify-center items-center gap-2 cursor-pointer"
            >
              {savingShop ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Storefront Details
            </button>
          </div>
        </div>

        {/* 3. ACCOUNT INFO */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Personal Information</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Your account credentials</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">First Name</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Last Name</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Username</label>
                <div className="w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 px-4 py-2 text-xs text-gray-500 dark:text-slate-400">
                  {profile?.username}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Phone Number</label>
                <div className="w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 px-4 py-2 text-xs text-gray-500 dark:text-slate-400">
                  {profile?.phone_number}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. PAYOUT SETTINGS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Payout Settings</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Choose how you receive your earnings</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-3">Payout Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayoutMode('INSTANT')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    payoutMode === 'INSTANT'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 shadow-sm'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${
                    payoutMode === 'INSTANT' ? 'bg-blue-100 dark:bg-blue-900/60' : 'bg-gray-100 dark:bg-slate-800'
                  }`}>
                    <Zap className={`h-4 w-4 ${payoutMode === 'INSTANT' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`} />
                  </div>
                  <p className={`font-semibold text-xs ${payoutMode === 'INSTANT' ? 'text-blue-800 dark:text-blue-300' : 'text-gray-800 dark:text-slate-200'}`}>
                    Instant Payout
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">Automatic transfer upon order completion.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMode('MANUAL')}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    payoutMode === 'MANUAL'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 shadow-sm'
                      : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${
                    payoutMode === 'MANUAL' ? 'bg-purple-100 dark:bg-purple-900/60' : 'bg-gray-100 dark:bg-slate-800'
                  }`}>
                    <PiggyBank className={`h-4 w-4 ${payoutMode === 'MANUAL' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-slate-400'}`} />
                  </div>
                  <p className={`font-semibold text-xs ${payoutMode === 'MANUAL' ? 'text-purple-800 dark:text-purple-300' : 'text-gray-800 dark:text-slate-200'}`}>
                    Manual Withdrawal
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">Accumulate in wallet and withdraw on demand.</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2">Payout Destination</label>
              <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPayoutType('MOMO')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                    payoutType === 'MOMO' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" /> Mobile Money
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutType('BANK')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
                    payoutType === 'BANK' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" /> Bank Account
                </button>
              </div>

              {payoutType === 'MOMO' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">MoMo Number</label>
                  <input
                    type="tel"
                    value={momoNumber}
                    onChange={e => setMomoNumber(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 0244000000"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Select Bank *</label>
                    <select
                      value={bankCode}
                      onChange={e => {
                        const selectedCode = e.target.value;
                        setBankCode(selectedCode);
                        const selectedBank = banksList.find(b => b.code === selectedCode);
                        if (selectedBank) setBankName(selectedBank.name);
                        if (selectedCode && bankAccount) handleResolveBank(selectedCode, bankAccount);
                      }}
                      className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer font-medium"
                    >
                      <option value="">Select your Commercial Bank / MoMo</option>
                      {banksList.map(b => (
                        <option key={b.code} value={b.code}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Account Number *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={e => {
                          setBankAccount(e.target.value);
                          if (bankCode && e.target.value.length >= 6) {
                            handleResolveBank(bankCode, e.target.value);
                          }
                        }}
                        onBlur={() => handleResolveBank()}
                        className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        placeholder="e.g. 1441000123456"
                      />
                      <button
                        type="button"
                        onClick={() => handleResolveBank()}
                        disabled={resolvingBank || !bankCode || !bankAccount}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        {resolvingBank ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        Verify
                      </button>
                    </div>
                  </div>

                  {/* Resolution Feedback Status */}
                  {bankAccountName && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      bankNameMatched
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}>
                      <div>
                        <span className="font-bold block">Account Holder: {bankAccountName}</span>
                        <span className="text-[11px] opacity-90">
                          {bankNameMatched
                            ? '✓ Account name matches profile identity.'
                            : 'ℹ️ Third-Party / Business Account detected. Details recorded for payout audit log.'}
                        </span>
                      </div>
                      <CheckCircle className={`h-4 w-4 shrink-0 ${bankNameMatched ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
                    </div>
                  )}

                  {bankResolveError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{bankResolveError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving || sendingOtp}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow flex justify-center items-center gap-2 cursor-pointer"
            >
              {saving || sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {sendingOtp ? 'Sending Verification Code...' : 'Save Profile & Payout Settings'}
            </button>
          </div>
        </div>

        {/* 5. SECURITY & 2FA SETTINGS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Account Security & 2FA</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">Protect your account using an Authenticator App (Google Authenticator, Authy, 1Password)</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              is2FAEnabled
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {is2FAEnabled ? '🟢 2FA Enabled' : '⚪ 2FA Disabled'}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
              Two-Factor Authentication (2FA) adds an extra layer of security to your HendAxis account. When enabled, signing in will require both your password and a 6-digit verification code from your authenticator app.
            </p>

            {is2FAEnabled ? (
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Your account is secured with 2FA</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">You will be prompted for an authenticator code whenever you log in.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTotpCode('');
                    setDisablePassword('');
                    setTotpError('');
                    setShow2FADisableModal(true);
                  }}
                  className="px-4 py-2 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Disable 2FA
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Set up Authenticator App</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Optional security feature for all user accounts.</p>
                </div>
                <button
                  type="button"
                  onClick={handleStart2FASetup}
                  disabled={totpLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Enable 2FA Authenticator
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 2FA Setup Modal */}
      {show2FASetupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative text-slate-900 dark:text-white">
            <button
              onClick={() => setShow2FASetupModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Setup 2FA Authenticator</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Google Authenticator / Authy / 1Password</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                1. Scan this QR code with your authenticator app:
              </p>
              
              {qrCodeUri ? (
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <img src={qrCodeUri} alt="2FA QR Code" className="w-44 h-44 object-contain" />
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Can't scan? Enter key manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider select-all border border-slate-200 dark:border-slate-700 overflow-x-auto">
                    {totpSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(totpSecret);
                      setCopiedSecret(true);
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold rounded-lg transition"
                  >
                    {copiedSecret ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-1">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  2. Enter 6-digit code from your app to confirm:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-xl tracking-widest font-mono font-bold py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {totpError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400">
                  {totpError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShow2FASetupModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerify2FASetup}
                  disabled={totpLoading || totpCode.length !== 6}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
                >
                  {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verify & Enable 2FA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Disable Modal */}
      {show2FADisableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-slate-900 dark:text-white">
            <button
              onClick={() => setShow2FADisableModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-red-600 dark:text-red-400">Disable Two-Factor Security</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Security Check</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter your account password and the current 6-digit code from your authenticator app to disable 2FA.
            </p>

            {totpError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400">
                {totpError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Account Password</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={e => setDisablePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">6-Digit Authenticator Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-xl tracking-widest font-mono font-bold py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShow2FADisableModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisable2FA}
                disabled={totpLoading || !disablePassword || totpCode.length !== 6}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
              >
                {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                Confirm & Disable 2FA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MoMo OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-slate-900 dark:text-white">
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Verify MoMo Payout Number</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Security Check</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We sent a 6-digit SMS verification code to <strong className="text-slate-900 dark:text-white">{momoNumber}</strong>. Please enter the code below to confirm your new payout number.
            </p>

            {otpError && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300">
                {otpError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1">6-Digit Verification Code</label>
              <input
                type="text"
                maxLength={6}
                value={momoOtp}
                onChange={e => setMomoOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center text-xl tracking-widest font-mono font-bold py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={sendingOtp}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {sendingOtp ? 'Sending...' : 'Resend Code'}
              </button>

              <button
                type="button"
                onClick={handleVerifyOtpAndSave}
                disabled={verifyingOtp || momoOtp.length !== 6}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2"
              >
                {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
