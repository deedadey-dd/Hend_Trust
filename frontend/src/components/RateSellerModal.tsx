import React, { useState } from 'react';
import { Star, X, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { apiClient } from '../api/client';

interface RateSellerModalProps {
  transactionId: string;
  sellerName: string;
  itemTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RateSellerModal({
  transactionId,
  sellerName,
  itemTitle,
  onClose,
  onSuccess
}: RateSellerModalProps) {
  const [speed, setSpeed] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [overall, setOverall] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/reviews/submit', {
        transaction_id: transactionId,
        rating_speed: speed,
        rating_communication: communication,
        rating_overall: overall,
        comment
      });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to submit rating.');
    } finally {
      setLoading(false);
    }
  };

  const renderStarPicker = (val: number, setVal: (n: number) => void, label: string) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
        <span>{label}</span>
        <span className="text-amber-600 font-bold">{val} / 5 ⭐</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setVal(star)}
            className="p-1 hover:scale-110 transition-transform focus:outline-none"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                star <= val ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div>
            <h3 className="text-base font-bold">Rate & Review Seller</h3>
            <p className="text-xs text-blue-100 opacity-90">{itemTitle}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h4 className="text-lg font-bold text-gray-900">Rating Published!</h4>
            <p className="text-xs text-gray-500">
              Thank you for reviewing <strong>@{sellerName}</strong>. Your feedback helps build earned trust across the HendAxis community.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100 text-center">
                {error}
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-600">
              Your feedback is verified by your completed escrow purchase for <strong>@{sellerName}</strong>.
            </div>

            {/* 3 Rating Axes */}
            <div className="space-y-4">
              {renderStarPicker(speed, setSpeed, "Delivery Speed")}
              {renderStarPicker(communication, setCommunication, "Communication & Service")}
              {renderStarPicker(overall, setOverall, "Overall Experience")}
            </div>

            {/* Comment Area */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5 text-gray-400" /> Public Review Comment <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share details about packaging, delivery speed, or product condition..."
                className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Publish Verified Review"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
