import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Gift, 
  Sparkles, 
  Phone, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  ShieldCheck, 
  ArrowRight, 
  HelpCircle,
  Send,
  Store,
  Loader2
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';
import SEOHead from '../components/SEOHead';

export default function ReferralsView() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buyerData, setBuyerData] = useState<{
    phone_number: string;
    referral_code: string;
    referral_link: string;
    reward_per_referral_ghs: number;
    referee_welcome_bonus_ghs: number;
    wallet_bonus_credits_ghs: number;
    total_earned_ghs: number;
    completed_referrals: number;
    pending_referrals: number;
    recent_referrals: Array<any>;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleLookupOrCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleaned = phoneNumber.trim().replace(/\s+/g, '');
    if (!/^(\+?233|0)[235][0-9]{8}$/.test(cleaned)) {
      setError('Please enter a valid Ghana phone number (e.g. 0241234567 or 0501234567).');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/auth/buyer-referral', {
        phone_number: cleaned
      });
      setBuyerData(res.data);
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Unable to retrieve referral link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shareText = buyerData 
    ? `Protect your online shopping in Ghana! Use my HendAxis Trust referral link to get GH₵ ${buyerData.referee_welcome_bonus_ghs} off your escrow transaction fees: ${buyerData.referral_link}`
    : '';

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.org/share/url?url=${encodeURIComponent(buyerData?.referral_link || '')}&text=${encodeURIComponent('Get scam-free escrow payments on HendAxis Trust!')}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <SEOHead
        title="Refer & Earn Escrow Credits | HendAxis Trust Ghana"
        description="Share HendAxis Trust with friends and sellers in Ghana. Earn GH₵ 10.00 to GH₵ 15.00 in transaction credits for every completed escrow deal."
        canonicalUrl="/referrals"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 text-white">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            HendAxis Trust Referral Hub
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Refer Friends & Sellers. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400">
              Earn Free Escrow Credits.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            Help Ghana eliminate online scams. Refer buyers or merchants to HendAxis Trust and earn fee discount credits whenever they complete a transaction.
          </p>

          {/* Quick Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4 text-left">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <Gift className="w-4 h-4" /> GH₵ 10 - GH₵ 15 / Referral
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Both you and your referred friend receive escrow fee discounts.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <Phone className="w-4 h-4" /> No Store Needed
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Buyers can join instantly with just their Ghana phone number.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-blue-400 font-black text-sm">
                <ShieldCheck className="w-4 h-4" /> Automatic Fee Offset
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Credits apply automatically to reduce escrow fees on future deals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Referral Generator / Hub */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20 pb-20">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Get Your Instant Referral Link
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Enter your MoMo / Ghana phone number below to fetch your personalized invite link and view earned credits.
            </p>
          </div>

          <form onSubmit={handleLookupOrCreate} className="max-w-md mx-auto space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="h-5 w-5" />
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0241234567 or 0501234567"
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-[#ff6d1d] focus:border-[#ff6d1d] outline-none transition"
              />
            </div>

            {error && (
              <p className="text-xs font-semibold text-rose-500 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#ff6d1d] hover:bg-[#e05a10] text-white font-black text-sm transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching Referral Hub...
                </>
              ) : (
                <>
                  Generate / View My Referral Hub <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Rendered Buyer Dashboard if Phone is Loaded */}
          {buyerData && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Buyer Phone ID</span>
                  <p className="text-base font-black text-indigo-600 dark:text-indigo-400">{buyerData.phone_number}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Your Referral Code</span>
                  <div className="flex items-center justify-end gap-1.5">
                    <p className="text-base font-mono font-black text-slate-900 dark:text-white">{buyerData.referral_code}</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(buyerData.referral_code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title="Copy code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Available Credits</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    GH₵ {Number(buyerData.wallet_bonus_credits_ghs || 0).toFixed(2)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Lifetime Earned</span>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    GH₵ {Number(buyerData.total_earned_ghs || 0).toFixed(2)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Completed</span>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                    {buyerData.completed_referrals || 0}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Pending Deals</span>
                  <p className="text-xl font-black text-amber-500">
                    {buyerData.pending_referrals || 0}
                  </p>
                </div>
              </div>

              {/* Link & Instant Social Sharing */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-600" /> Share Your Link
                  </h4>
                  <p className="text-xs text-slate-500">
                    Friends receive GH₵ {buyerData.referee_welcome_bonus_ghs} welcome discount. You earn GH₵ {buyerData.reward_per_referral_ghs} on their first deal.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={buyerData.referral_link}
                    className="bg-transparent border-none text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex-1 min-w-0 outline-none px-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(buyerData.referral_link);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                  >
                    <MessageCircle className="w-4 h-4" /> Share on WhatsApp
                  </a>
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                  >
                    <Send className="w-4 h-4" /> Share on Telegram
                  </a>
                </div>
              </div>

              {/* Referral Activity List */}
              {buyerData.recent_referrals && buyerData.recent_referrals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase font-mono">Your Referral History</h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-200 dark:border-slate-800">
                    {buyerData.recent_referrals.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">@{item.referee_username}</span>
                          <p className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}>
                            {item.status === 'COMPLETED' ? 'Completed' : 'Pending Deal'}
                          </span>
                          <span className="font-mono font-black text-slate-900 dark:text-white">
                            +GH₵ {Number(item.reward_amount_ghs).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seller / Store Owner CTA */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" /> Are You an Online Merchant?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log in to your seller dashboard to generate branded escrow checkout links (`/l/uuid`), track order payouts, and offset fees.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl hover:opacity-90 transition whitespace-nowrap text-center"
            >
              Seller Dashboard &rarr;
            </Link>
          </div>

        </div>
      </section>

      {/* Referral FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 space-y-6">
        <h3 className="text-xl font-black text-center text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-600" /> Frequently Asked Questions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              How do referral rewards work?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              When someone clicks your referral link or enters your code during registration, your account is credited with fee offset bonus credits as soon as they complete their first protected escrow transaction.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Do buyers need to sign up for a seller store?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              No! Buyers only need their standard Ghana phone number to track their earned referral credits and share invite links on WhatsApp.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              How do I use my earned credits?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Credits are stored in your HendAxis Trust Fee Credit Wallet and automatically deduct from escrow fees on your subsequent buy or sell orders.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Is there a limit on how many friends I can refer?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              There is no limit! You can invite as many buyers and sellers across Ghana as you like and earn credits on every qualifying first transaction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
