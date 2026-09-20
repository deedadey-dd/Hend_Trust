import React, { useState, useEffect } from 'react';
import { Star, X, Loader2, CheckCircle2, MessageSquare, Mail } from 'lucide-react';
import { apiClient } from '../api/client';
import { useEscapeKey } from '../utils/useEscapeKey';
import { getReviewToken, saveReviewToken } from '../utils/reviewStorage';

interface RateSellerModalProps {
  transactionId: string;
  paystackReference?: string;
  reviewToken?: string;
  sellerName: string;
  shopName?: string;
  sellerUsername?: string;
  sellerLogoUrl?: string;
  itemTitle: string;
  initialOverall?: number;
  initialSpeed?: number;
  initialCommunication?: number;
  initialComment?: string;
  initialEditCount?: number;
  initialCreatedAt?: string;
  initialUpdatedAt?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RateSellerModal({
  transactionId,
  paystackReference,
  reviewToken: initialToken,
  sellerName,
  shopName,
  sellerUsername,
  sellerLogoUrl,
  itemTitle,
  initialOverall,
  initialSpeed,
  initialCommunication,
  initialComment,
  initialEditCount,
  initialCreatedAt,
  initialUpdatedAt,
  onClose,
  onSuccess
}: RateSellerModalProps) {
  useEscapeKey(onClose);
  const [speed, setSpeed] = useState(initialSpeed || 5);
  const [communication, setCommunication] = useState(initialCommunication || 5);
  const [overall, setOverall] = useState(initialOverall || 5);
  const [comment, setComment] = useState(initialComment || '');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [isExisting, setIsExisting] = useState(Boolean(initialOverall !== undefined || (initialEditCount !== undefined && initialEditCount >= 0 && initialCreatedAt)));
  const [editCount, setEditCount] = useState(initialEditCount || 0);
  const [createdAt, setCreatedAt] = useState(initialCreatedAt || '');
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt || '');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const activeToken = initialToken || (paystackReference ? getReviewToken(paystackReference) : null);

  useEffect(() => {
    // If initial data wasn't provided, try fetching from API
    if (initialOverall !== undefined || !paystackReference || !activeToken) return;
    const fetchExisting = async () => {
      setLoadingInitial(true);
      try {
        const res = await apiClient.get(`/reviews/transaction-review/${paystackReference}?token=${activeToken}`);
        if (res.data.has_existing_review) {
          setIsExisting(true);
          setSpeed(res.data.rating_speed || 5);
          setCommunication(res.data.rating_communication || 5);
          setOverall(res.data.rating_overall || 5);
          setComment(res.data.comment || '');
          setEditCount(res.data.edit_count || 0);
          setCreatedAt(res.data.created_at || '');
          setUpdatedAt(res.data.updated_at || '');
        }
      } catch (err) {
        console.error("Could not fetch existing review detail:", err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchExisting();
  }, [paystackReference, activeToken, initialOverall]);

  const displayName = shopName 
    ? (sellerUsername ? `${shopName} (@${sellerUsername})` : shopName) 
    : (sellerName.startsWith('@') ? sellerName : `@${sellerName}`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/reviews/submit', {
        transaction_id: transactionId,
        rating_speed: speed,
        rating_communication: communication,
        rating_overall: overall,
        comment,
        review_token: activeToken || undefined
      });
      
      if (paystackReference && res.data.review_token) {
        saveReviewToken(paystackReference, res.data.review_token);
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit rating.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMagicLink = async () => {
    if (!paystackReference) return;
    const buyerPhone = prompt("Enter your Buyer Phone Number used during checkout:");
    if (!buyerPhone) return;
    
    setSendingEmail(true);
    setEmailMsg('');
    setError('');
    try {
      const res = await apiClient.post('/reviews/request-edit-link', {
        paystack_reference: paystackReference,
        buyer_phone: buyerPhone.trim()
      });
      setEmailMsg(res.data.message || 'Magic link sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to send review edit link.');
    } finally {
      setSendingEmail(false);
    }
  };

  const renderStarPicker = (val: number, setVal: (n: number) => void, label: string) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-slate-200">
        <span>{label}</span>
        <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{val} / 5 ⭐</span>
      </div>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setVal(star)}
            className="p-1 hover:scale-110 transition-transform focus:outline-none cursor-pointer"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= val ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-slate-700'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden relative text-gray-900 dark:text-slate-100 my-auto">
        
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold">{isExisting ? '✏️ Edit Your Seller Review' : '⭐ Rate & Review Seller'}</h3>
            <p className="text-[11px] sm:text-xs text-blue-100 opacity-90">
              {isExisting && editCount > 0 && updatedAt
                ? `Updated ${editCount} time${editCount > 1 ? 's' : ''} • Last edited ${new Date(updatedAt).toLocaleDateString()}`
                : isExisting && createdAt
                ? `Submitted on ${new Date(createdAt).toLocaleDateString()}`
                : itemTitle}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 sm:p-8 text-center space-y-4 overflow-y-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>
            <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{isExisting ? 'Review Updated!' : 'Rating Published!'}</h4>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
              Thank you for reviewing <strong>{displayName}</strong>. Your feedback helps build earned trust across the HendAxis community.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : loadingInitial ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Loading your review details...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs sm:text-sm font-medium border border-red-100 dark:border-red-900/50 text-center">
                {error}
              </div>
            )}
            {emailMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl text-xs sm:text-sm font-medium border border-emerald-200 dark:border-emerald-900/50 text-center">
                {emailMsg}
              </div>
            )}

            <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-center gap-3 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
              {sellerLogoUrl ? (
                <img src={sellerLogoUrl} alt={displayName} className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 shrink-0" />
              ) : (
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-blue-600 text-white font-black text-sm sm:text-base flex items-center justify-center shrink-0">
                  {(shopName || sellerName).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white block truncate">{shopName || sellerName}</span>
                <span className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-300 font-medium block truncate">
                  {isExisting 
                    ? `Updating your verified review ${editCount > 0 ? `(Edit #${editCount + 1})` : '(First update)'}` 
                    : 'Reviewing merchant for completed escrow purchase'}
                </span>
              </div>
            </div>

            {/* 3 Rating Axes */}
            <div className="space-y-3 sm:space-y-4">
              {renderStarPicker(speed, setSpeed, "Delivery Speed")}
              {renderStarPicker(communication, setCommunication, "Communication & Service")}
              {renderStarPicker(overall, setOverall, "Overall Experience")}
            </div>

            {/* Comment Area */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 dark:text-slate-500" /> Public Review Comment <span className="text-gray-400 dark:text-slate-500 text-[11px]">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share details about packaging, delivery speed, or product condition..."
                className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {paystackReference && !activeToken && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handleRequestMagicLink}
                  disabled={sendingEmail}
                  className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {sendingEmail ? 'Sending email...' : 'Editing on a new device? Email me a $0 edit link'}
                </button>
              </div>
            )}

            <div className="pt-1 pb-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-3.5 bg-blue-600 text-white font-bold rounded-xl text-sm sm:text-base hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center cursor-pointer"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isExisting ? "✓ Update Verified Review" : "⭐ Publish Verified Review")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
