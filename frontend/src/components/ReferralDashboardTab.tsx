import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  RefreshCw,
  QrCode,
  TrendingUp,
  MessageCircle,
  Send,
  Download
} from 'lucide-react';
import QRCode from 'qrcode';
import { apiClient } from '../api/client';
import SellerRewardsBreakdown from './SellerRewardsBreakdown';

interface ReferralDashboardTabProps {
  onInspectOrder?: (orderReference: string) => void;
}

export const ReferralDashboardTab: React.FC<ReferralDashboardTabProps> = ({ onInspectOrder }) => {
  const [activeSubTab, setActiveSubTab] = useState<'referrals' | 'rewards_ledger'>('referrals');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  // Manual code input
  const [inputCode, setInputCode] = useState<string>('');
  const [applying, setApplying] = useState<boolean>(false);
  const [applyMsg, setApplyMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/profile/referrals/stats');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load referral stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const origin = window.location.origin;
  const referralLink = stats?.referral_code ? `${origin}/register?ref=${stats.referral_code}` : '';

  useEffect(() => {
    if (referralLink) {
      QRCode.toDataURL(referralLink, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }).then(setQrDataUrl).catch(console.error);
    }
  }, [referralLink]);

  const shareText = `Hey! I use HendAxis Trust to protect my online sales and purchases in Ghana with 100% scam-free escrow protection. Register with my link and get GH₵ 10.00 off your transactions: ${referralLink}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.org/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join HendAxis Trust for scam-free escrow payments in Ghana!')}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setApplying(true);
    setApplyMsg(null);
    try {
      const res = await apiClient.post('/profile/referrals/apply', { referral_code: inputCode.trim() });
      setApplyMsg({ text: res.data.message || 'Referral code applied successfully!' });
      setInputCode('');
      fetchStats();
    } catch (err: any) {
      setApplyMsg({ text: err.response?.data?.detail || 'Failed to apply referral code.', error: true });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('referrals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'referrals'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Share2 className="w-4 h-4" /> Refer & Earn Links
        </button>
        <button
          onClick={() => setActiveSubTab('rewards_ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'rewards_ledger'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Promotional Earnings & Ledger Breakdown
        </button>
      </div>

      {activeSubTab === 'rewards_ledger' ? (
        <SellerRewardsBreakdown onInspectOrder={onInspectOrder} />
      ) : (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-600/20 via-blue-600/10 to-orange-500/15 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-blue-400 shrink-0">
                  <Gift className="h-7 w-7 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Merchant & Buyer Referral Program
                    <span className="bg-orange-500/20 text-[#ff6d1d] border border-orange-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      Earn GH₵ 15.00 / Deal
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Share your unique link with fellow merchants and buyers. When they complete their first escrow transaction, you earn GH₵ 15.00 in fee offset credits and they get GH₵ 10.00!
                  </p>
                </div>
              </div>

              <button
                onClick={fetchStats}
                className="self-start sm:self-auto px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
                Wallet Fee Credits
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                GH₵ {Number(stats?.wallet_bonus_credits_ghs || 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400">Available to offset transaction fees</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
                Total Earned Lifetime
              </span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                GH₵ {Number(stats?.total_earned_ghs || 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400">From completed referral deals</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
                Completed Referrals
              </span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {stats?.completed_referrals || 0}
              </p>
              <p className="text-[10px] text-slate-400">Qualified & paid out</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">
                Pending Activations
              </span>
              <p className="text-2xl font-black text-amber-500">
                {stats?.pending_referrals || 0}
              </p>
              <p className="text-[10px] text-slate-400">Signed up, awaiting 1st order</p>
            </div>
          </div>

          {/* Shareable Referral Link & Invitation Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-sm">
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-indigo-500" />
                  Your Unique Referral Link
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Anyone who joins through your link gets GH₵ 10.00 off. You get GH₵ 15.00 automatically when they complete their first escrow deal.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={referralLink || 'Loading...'}
                    className="bg-transparent border-none text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex-1 min-w-0 outline-none px-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Code:</span>
                    <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {stats?.referral_code || '---'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(stats?.referral_code || '');
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-1 cursor-pointer"
                      title="Copy code only"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="py-2 px-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-500" /> Show QR
                  </button>
                </div>

                {/* Instant Social Sharing Buttons */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-2">
                    1-Click Social Sharing
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                    >
                      <Send className="w-3.5 h-3.5" /> Telegram
                    </a>
                    <a
                      href={twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                    >
                      <span>𝕏 Post</span>
                    </a>
                    <a
                      href={smsUrl}
                      className="py-2.5 px-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
                    >
                      <span>SMS Invite</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Have a code? Apply here */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Were you referred by a friend?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter their referral code below to claim your GH₵ 10.00 first-transaction fee credit.
                </p>
              </div>

              <form onSubmit={handleApplyCode} className="space-y-3">
                <input
                  type="text"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HT-8K9X2 OR PHONE"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white font-mono font-bold uppercase placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                {applyMsg && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold ${applyMsg.error ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'}`}>
                    {applyMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={applying || !inputCode.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
                >
                  {applying ? 'Applying Code...' : 'Claim Referral Bonus'}
                </button>
              </form>
            </div>
          </div>

          {/* Recent Referrals Log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
              Referred Users & Activity Log ({stats?.recent_referrals?.length || 0})
            </h4>

            {!stats?.recent_referrals || stats.recent_referrals.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Users className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p>No referrals recorded yet. Share your invite link above to start earning!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recent_referrals.map((ref: any) => (
                  <div key={ref.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">@{ref.referee_username}</span>
                      <p className="text-[10px] text-slate-400">Signed up {new Date(ref.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        ref.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      }`}>
                        {ref.status === 'COMPLETED' ? '✓ Completed & Rewarded' : '⏳ Pending 1st Order'}
                      </span>
                      <span className="font-mono font-black text-slate-900 dark:text-white">
                        +GH₵ {Number(ref.reward_amount_ghs).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Scan to Register & Claim Bonus
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customers or merchants can scan this QR code with their camera to automatically apply your referral code.
            </p>

            {qrDataUrl && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner flex justify-center">
                <img src={qrDataUrl} alt="Referral QR Code" className="w-56 h-56" />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`HendAxis_Referral_QR_${stats?.referral_code || 'code'}.png`}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download QR
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralDashboardTab;
