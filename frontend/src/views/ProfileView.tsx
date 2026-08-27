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

  // Editable Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [payoutMode, setPayoutMode] = useState<'INSTANT' | 'MANUAL'>('INSTANT');
  const [payoutType, setPayoutType] = useState<'MOMO' | 'BANK'>('MOMO');
  const [momoNumber, setMomoNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');

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
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setPayoutMode(data.payout_mode || 'INSTANT');
      setPayoutType(data.preferred_payout_type || 'MOMO');
      setMomoNumber(data.momo_number || '');
      setBankAccount(data.bank_account_number || '');
      setBankName(data.bank_name || '');
      
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

  useEffect(() => {
    fetchProfile();
  }, []);

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
    <div className="min-h-[80vh] bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Account & Storefront Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your identity, store presentation, verification, and payout preferences.</p>
        </div>

        {/* Feedback Messages */}
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

        {/* 1. SELLER VERIFICATION STATUS CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Seller Document Verification</h2>
                <p className="text-xs text-gray-500">Earn the official Verified Seller badge</p>
              </div>
            </div>

            {profile?.verification_status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <CheckCircle className="h-3.5 w-3.5" /> 🛡️ VERIFIED SELLER
              </span>
            )}
            {profile?.verification_status === 'PENDING' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                <Clock className="h-3.5 w-3.5" /> Pending Manager Approval
              </span>
            )}
            {profile?.verification_status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                <XCircle className="h-3.5 w-3.5" /> Rejected
              </span>
            )}
          </div>

          <div className="px-6 py-5 space-y-5">
            {profile?.verification_status === 'APPROVED' ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold text-sm">🎉 Your Account is Verified!</p>
                <p>Your documents were verified on {profile.verified_at ? new Date(profile.verified_at).toLocaleDateString() : 'Management Review'}. Your store features the official Verified Seller badge across payment links and marketplace listings.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitVerification} className="space-y-4">
                {profile?.verification_status === 'REJECTED' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-1">
                    <p className="font-bold">❌ Previous Submission Rejected:</p>
                    <p>{profile.verification_rejection_reason}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Upload your <strong>Ghana Card / National ID</strong> and optional <strong>Business Registration License</strong>. Once submitted, our management team will review and grant your Verified badge.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">National ID / Ghana Card Number *</label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    placeholder="e.g. GHA-123456789-0"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* National ID Photo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">National ID Photo *</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, setIdPhoto)}
                      className="w-full text-xs text-gray-600 border border-gray-200 rounded-xl p-2 bg-gray-50 cursor-pointer"
                    />
                    {idPhoto && (
                      <img src={idPhoto} alt="National ID" className="mt-2 h-20 w-36 object-cover rounded-lg border border-gray-300" />
                    )}
                  </div>

                  {/* Business License Photo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Business License <span className="text-gray-400">(optional)</span></label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, setLicensePhoto)}
                      className="w-full text-xs text-gray-600 border border-gray-200 rounded-xl p-2 bg-gray-50 cursor-pointer"
                    />
                    {licensePhoto && (
                      <img src={licensePhoto} alt="Business License" className="mt-2 h-20 w-36 object-cover rounded-lg border border-gray-300" />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingVerif}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow flex justify-center items-center gap-2"
                >
                  {submittingVerif ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                  Submit Documents for Manager Verification
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 2. STOREFRONT DISPLAY SETTINGS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
              <Store className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Public Storefront Presentation</h2>
              <p className="text-xs text-gray-500">Displayed on your public profile and marketplace directory</p>
            </div>
          </div>
          
          <div className="px-6 py-5 space-y-5">
            {/* Branding Images: Logo & Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-200/80">
              {/* Profile Picture / Logo */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-blue-600" /> Storefront Logo / Profile Picture
                  </label>
                  {isCompressingProfilePic && <span className="text-xs text-blue-600 font-medium flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing WebP...</span>}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isCompressingProfilePic}
                  onChange={handleProfilePictureUpload}
                  className="w-full text-sm text-gray-600 border border-gray-300 rounded-xl p-2 bg-white cursor-pointer disabled:opacity-50"
                />
                {profilePicture && (
                  <div className="mt-2 relative inline-block">
                    <img src={profilePicture} alt="Profile Logo" className="h-16 w-16 object-cover rounded-xl border border-gray-300 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setProfilePicture('')}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700"
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
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-indigo-600" /> Storefront Cover Banner
                  </label>
                  {isCompressingBanner && <span className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing WebP...</span>}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isCompressingBanner}
                  onChange={handleBannerUpload}
                  className="w-full text-sm text-gray-600 border border-gray-300 rounded-xl p-2 bg-white cursor-pointer disabled:opacity-50"
                />
                {banner && (
                  <div className="mt-2 relative inline-block">
                    <img src={banner} alt="Cover Banner" className="h-16 w-36 object-cover rounded-xl border border-gray-300 shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setBanner('')}
                      className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow hover:bg-red-700"
                      title="Remove Banner"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder="e.g. Accra Gadgets Hub"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Shop Description</label>
              <textarea
                rows={3}
                value={shopDescription}
                onChange={e => setShopDescription(e.target.value)}
                placeholder="Briefly describe your business, shipping options, and warranty terms..."
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Product Categories (Select at most 3)</label>
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORY_OPTIONS.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryToggle(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat} {isSelected && '✓'}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] text-gray-400 mt-1 block">Selected: {selectedCategories.length} / 3 categories</span>
            </div>

            <button
              onClick={handleSaveShop}
              disabled={savingShop}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow flex justify-center items-center gap-2"
            >
              {savingShop ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Storefront Details
            </button>
          </div>
        </div>

        {/* 3. ACCOUNT INFO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Personal Information</h2>
              <p className="text-xs text-gray-500">Your account credentials</p>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                <input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                <input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
                  {profile?.username}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
                  {profile?.phone_number}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. PAYOUT SETTINGS */}
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
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-3">Payout Mode</label>
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
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${
                    payoutMode === 'INSTANT' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Zap className={`h-4 w-4 ${payoutMode === 'INSTANT' ? 'text-blue-600' : 'text-gray-500'}`} />
                  </div>
                  <p className={`font-semibold text-xs ${payoutMode === 'INSTANT' ? 'text-blue-800' : 'text-gray-800'}`}>
                    Instant Payout
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">Automatic transfer upon order completion.</p>
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
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center mb-2 ${
                    payoutMode === 'MANUAL' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <PiggyBank className={`h-4 w-4 ${payoutMode === 'MANUAL' ? 'text-purple-600' : 'text-gray-500'}`} />
                  </div>
                  <p className={`font-semibold text-xs ${payoutMode === 'MANUAL' ? 'text-purple-800' : 'text-gray-800'}`}>
                    Manual Withdrawal
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">Accumulate in wallet and withdraw on demand.</p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Payout Destination</label>
              <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPayoutType('MOMO')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition ${
                    payoutType === 'MOMO' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" /> Mobile Money
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutType('BANK')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition ${
                    payoutType === 'BANK' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" /> Bank Account
                </button>
              </div>

              {payoutType === 'MOMO' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">MoMo Number</label>
                  <input
                    type="tel"
                    value={momoNumber}
                    onChange={e => setMomoNumber(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 0244000000"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. GCB Bank"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={e => setBankAccount(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Account number"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving || sendingOtp}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow flex justify-center items-center gap-2"
            >
              {saving || sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {sendingOtp ? 'Sending Verification Code...' : 'Save Profile & Payout Settings'}
            </button>
          </div>
        </div>

      </div>

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
