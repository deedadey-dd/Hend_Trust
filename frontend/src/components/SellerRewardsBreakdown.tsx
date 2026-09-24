import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  RefreshCw, 
  Receipt,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins
} from 'lucide-react';
import { apiClient } from '../api/client';

interface RewardsBreakdownData {
  wallet_balance_ghs: number;
  total_earned_lifetime_ghs: number;
  total_redeemed_lifetime_ghs: number;
  source_breakdown: {
    referral_rewards_ghs: number;
    transaction_campaigns_ghs: number;
    admin_grants_ghs: number;
    first_order_bonus_ghs: number;
  };
  ledger_history: Array<{
    id: number;
    amount_ghs: number;
    source_type: string;
    description: string;
    order_id: number | null;
    order_reference: string | null;
    is_redeemed: boolean;
    created_at: string;
  }>;
}

interface SellerRewardsBreakdownProps {
  onInspectOrder?: (orderReference: string) => void;
}

export const SellerRewardsBreakdown: React.FC<SellerRewardsBreakdownProps> = ({ onInspectOrder }) => {
  const [data, setData] = useState<RewardsBreakdownData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSource, setFilterSource] = useState<string>('ALL');

  const fetchBreakdown = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/profile/rewards-breakdown');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load seller rewards breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreakdown();
  }, []);

  const filteredLedger = (data?.ledger_history || []).filter((entry) => {
    if (filterSource === 'ALL') return true;
    return entry.source_type === filterSource;
  });

  const getSourceBadge = (sourceType: string) => {
    switch (sourceType) {
      case 'REFERRAL_BONUS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            <Gift className="w-3 h-3" /> Referral Reward
          </span>
        );
      case 'TRANSACTION_CAMPAIGN':
      case 'CASHBACK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            <TrendingUp className="w-3 h-3" /> Cashback / Promo
          </span>
        );
      case 'FIRST_ORDER_BONUS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Sparkles className="w-3 h-3" /> 1st Order Welcome
          </span>
        );
      case 'ADMIN_GRANT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3" /> Admin Grant
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Summary & Refresh */}
      <div className="bg-gradient-to-r from-emerald-600/20 via-indigo-600/10 to-blue-600/15 border border-emerald-500/30 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Coins className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-300 dark:text-white flex items-center gap-2">
                Promotions & Reward Earnings
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Automatic Fee Offset
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Track every reward cedi earned from referrals, promo campaigns, and loyalty bonuses. Credits automatically deduct from escrow fees on your deals.
              </p>
            </div>
          </div>

          <button
            onClick={fetchBreakdown}
            className="self-start sm:self-auto px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Primary KPI Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-1 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Coins className="w-16 h-16 text-emerald-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">
            Available Wallet Credit
          </span>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            GH₵ {Number(data?.wallet_balance_ghs || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Available to offset seller escrow transaction fees</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-1 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-indigo-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">
            Lifetime Promos Earned
          </span>
          <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
            GH₵ {Number(data?.total_earned_lifetime_ghs || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Cumulative promotions & referral rewards earned</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-1 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Receipt className="w-16 h-16 text-amber-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">
            Fees Saved / Redeemed
          </span>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400">
            GH₵ {Number(data?.total_redeemed_lifetime_ghs || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Total fees waived on completed transactions</p>
        </div>
      </div>

      {/* Earnings Breakdown By Source */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
        <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" />
          Where Your Earnings Came From
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Referrals</span>
              <Gift className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              GH₵ {Number(data?.source_breakdown?.referral_rewards_ghs || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500">From invited sellers & buyers</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Cashback & Promos</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              GH₵ {Number(data?.source_breakdown?.transaction_campaigns_ghs || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500">Seasonal fee rebates & milestones</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">First Order Bonus</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              GH₵ {Number(data?.source_breakdown?.first_order_bonus_ghs || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500">Welcome bonus on activation</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Admin Grants & VIP</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">
              GH₵ {Number(data?.source_breakdown?.admin_grants_ghs || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500">Direct promotional credits</p>
          </div>
        </div>
      </div>

      {/* Itemized Rewards Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-500" />
              Itemized Rewards & Cashback Ledger
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Auditable breakdown of every individual credit added to your store
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All Rewards' },
              { id: 'REFERRAL_BONUS', label: 'Referrals' },
              { id: 'TRANSACTION_CAMPAIGN', label: 'Campaigns' },
              { id: 'ADMIN_GRANT', label: 'Admin Grants' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterSource(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  filterSource === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredLedger.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Coins className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p>No reward ledger entries match the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Description & Order Ref</th>
                  <th className="py-3 px-3 text-right">Amount (GH₵)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getSourceBadge(item.source_type)}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.description}
                      </div>
                      {item.order_reference && (
                        <div className="mt-0.5">
                          {onInspectOrder ? (
                            <button
                              type="button"
                              onClick={() => onInspectOrder(item.order_reference!)}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              Ref: {item.order_reference} <ArrowUpRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-500">
                              Ref: {item.order_reference}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      +GH₵ {Number(item.amount_ghs).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {item.is_redeemed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" /> Offset in Deal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-emerald-500" /> Available Credit
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerRewardsBreakdown;
