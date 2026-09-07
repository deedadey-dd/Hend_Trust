import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Filter, Loader2, ArrowUpRight, ArrowDownLeft, Send, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { apiClient } from '../api/client';

const PAYSTACK_FEE_RATE = 0.0195;

export const LedgerView: React.FC = () => {
  const [balanceData, setBalanceData] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Withdrawal state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawType, setWithdrawType] = useState<'MOMO' | 'BANK'>('MOMO');
  const [withdrawDest, setWithdrawDest] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const entryType = searchParams.get('entry_type') || '';

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [offset, limit, startDate, endDate, entryType]);

  const fetchBalance = async () => {
    try {
      const res = await apiClient.get('/wallet/balance');
      setBalanceData(res.data);
      // Pre-fill destination from profile
      if (res.data.momo_number) setWithdrawDest(res.data.momo_number);

      // Pre-fill maximum possible withdrawable amount
      const avail = Number(res.data.available_balance_ghs || 0);
      if (avail > 0) {
        const maxAmt = Math.floor((avail / (1 + PAYSTACK_FEE_RATE)) * 100) / 100;
        setWithdrawAmount(maxAmt.toFixed(2));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('offset', offset.toString());
      params.append('limit', limit.toString());
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (entryType) params.append('entry_type', entryType);

      const res = await apiClient.get(`/wallet/ledger?${params.toString()}`);
      setEntries(res.data.items || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('offset', newOffset.toString());
    setSearchParams(params);
  };

  // Fee calculation
  const parsedAmount = parseFloat(withdrawAmount) || 0;
  const paystackFee = parsedAmount * PAYSTACK_FEE_RATE;
  const totalDeducted = parsedAmount + paystackFee;
  const youReceive = parsedAmount;
  const availableBalance = Number(balanceData?.available_balance_ghs || 0);
  const maxPossibleWithdraw = availableBalance > 0 ? Math.floor((availableBalance / (1 + PAYSTACK_FEE_RATE)) * 100) / 100 : 0;
  const hasInsufficientFunds = totalDeducted > availableBalance;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');
    if (!withdrawDest) {
      setWithdrawError('Please enter a destination account.');
      return;
    }
    setWithdrawLoading(true);
    try {
      await apiClient.post('/wallet/withdraw', {
        amount: parsedAmount.toFixed(2),
        destination_type: withdrawType,
        destination_account: withdrawDest,
      });
      setWithdrawSuccess(`Withdrawal of GHS ${parsedAmount.toFixed(2)} initiated successfully!`);
      setWithdrawAmount('');
      fetchBalance();
      fetchLedger();
    } catch (err: any) {
      setWithdrawError(err.response?.data?.message || 'Withdrawal failed. Please try again.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const ENTRY_TYPE_LABELS: Record<string, string> = {
    ESCROW_RELEASE_NET: 'Sale Payout Credit',
    PARTIAL_REFUND_SELLER: 'Partial Dispute Payout Credit',
    REFUND_FEE_PENALTY: 'Dispute Refund Penalty',
    NON_DISPATCH_SELLER_PENALTY_PLATFORM_FEE: 'Non-Dispatch Penalty (Platform Fee)',
    NON_DISPATCH_SELLER_PENALTY_GATEWAY_FEE: 'Non-Dispatch Penalty (Gateway Fee)',
    SHOP_PROMOTION_AD_FEE: 'Shop Promotion Ad Fee',
    SELLER_WITHDRAWAL_REQUEST: 'Payout Withdrawal',
    PAYSTACK_PAYOUT_FEE: 'Transfer Gateway Fee',
    PAYSTACK_REFUND_FEE: 'Refund Gateway Fee',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">

      {/* Header + Balance Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet & Ledger</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Track your financial activities and manage withdrawals</p>
        </div>
        
        {balanceData && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg min-w-[280px] sm:min-w-[340px]">
            <div className="flex items-center gap-2 opacity-90 mb-3">
              <Wallet className="h-5 w-5" />
              <span className="font-medium text-sm">Available Balance</span>
            </div>
            <div className="flex items-end justify-between gap-6 mt-2">
              <div className="text-3xl sm:text-4xl font-bold font-mono">
                GHS {Number(balanceData.available_balance_ghs).toFixed(2)}
              </div>
              <button
                onClick={() => {
                  setShowWithdraw(v => {
                    const next = !v;
                    if (next && maxPossibleWithdraw > 0 && !withdrawAmount) {
                      setWithdrawAmount(maxPossibleWithdraw.toFixed(2));
                    }
                    return next;
                  });
                  setWithdrawError('');
                  setWithdrawSuccess('');
                }}
                className="text-sm font-bold bg-white text-blue-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 flex-shrink-0 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                Withdraw
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Withdrawal Panel */}
      {showWithdraw && (
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/50 rounded-2xl shadow-md overflow-hidden transition-colors">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 px-6 py-4 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Withdraw Funds</h2>
            </div>
            <button onClick={() => setShowWithdraw(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleWithdraw} className="p-6 space-y-5">
            {withdrawSuccess && (
              <div className="flex items-center gap-2 bg-green-50 dark:bg-emerald-950/40 border border-green-200 dark:border-emerald-800 text-green-700 dark:text-emerald-300 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                {withdrawSuccess}
              </div>
            )}
            {withdrawError && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-xl px-4 py-3 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {withdrawError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Amount input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Amount to Withdraw (GHS)</label>
                  {maxPossibleWithdraw > 0 && (
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(maxPossibleWithdraw.toFixed(2))}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-0.5 rounded-md transition cursor-pointer"
                    >
                      Max: GHS {maxPossibleWithdraw.toFixed(2)}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 font-medium text-sm">GHS</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-12 pr-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Destination type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Destination Type</label>
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setWithdrawType('MOMO')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all cursor-pointer ${withdrawType === 'MOMO' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                  >
                    Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawType('BANK')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all cursor-pointer ${withdrawType === 'BANK' ? 'bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                  >
                    Bank Account
                  </button>
                </div>
              </div>
            </div>

            {/* Destination account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                {withdrawType === 'MOMO' ? 'MoMo Number' : 'Bank Account Number'}
              </label>
              <input
                type="text"
                required
                value={withdrawDest}
                onChange={e => setWithdrawDest(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder={withdrawType === 'MOMO' ? 'e.g. 024 000 0000' : 'Account number'}
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {balanceData?.momo_number ? `Your saved MoMo: ${balanceData.momo_number}` : 'Set a default in your Profile settings.'}
              </p>
            </div>

            {/* Fee Breakdown */}
            {parsedAmount > 0 && (
              <div className={`rounded-xl border p-4 space-y-2 text-sm ${hasInsufficientFunds ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60' : 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40'}`}>
                <p className="font-semibold text-gray-800 dark:text-slate-200 mb-3">Fee Breakdown</p>
                <div className="flex justify-between text-gray-600 dark:text-slate-400">
                  <span>Requested payout:</span>
                  <span className="font-mono font-medium">GHS {parsedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>Paystack transfer fee (1.95%):</span>
                  <span className="font-mono font-medium">+ GHS {paystackFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 dark:text-slate-100 border-t border-current/20 pt-2 mt-2">
                  <span>You will receive:</span>
                  <span className="font-mono text-green-700 dark:text-emerald-400">GHS {youReceive.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>Total deducted from wallet:</span>
                  <span className="font-mono font-bold text-gray-700 dark:text-slate-300">GHS {totalDeducted.toFixed(2)}</span>
                </div>
                {hasInsufficientFunds && (
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold mt-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Insufficient balance. Max withdrawable: GHS {maxPossibleWithdraw.toFixed(2)} (Available balance: GHS {availableBalance.toFixed(2)})
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={withdrawLoading || parsedAmount <= 0 || hasInsufficientFunds}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-60 text-sm cursor-pointer"
            >
              {withdrawLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {withdrawLoading ? 'Processing...' : `Withdraw GHS ${parsedAmount > 0 ? parsedAmount.toFixed(2) : '0.00'}`}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 flex flex-wrap gap-4 items-center transition-colors">
        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 font-medium w-full sm:w-auto">
          <Filter className="h-4 w-4" /> Filters:
        </div>
        
        <input 
          type="date"
          value={startDate}
          onChange={e => {
            const p = new URLSearchParams(searchParams);
            p.set('start_date', e.target.value);
            p.set('offset', '0');
            setSearchParams(p);
          }}
          className="border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-blue-500 focus:border-blue-500"
          title="Start Date"
        />
        
        <input 
          type="date"
          value={endDate}
          onChange={e => {
            const p = new URLSearchParams(searchParams);
            p.set('end_date', e.target.value);
            p.set('offset', '0');
            setSearchParams(p);
          }}
          className="border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-blue-500 focus:border-blue-500"
          title="End Date"
        />

        <select
          value={entryType}
          onChange={e => {
            const p = new URLSearchParams(searchParams);
            if (e.target.value) {
              p.set('entry_type', e.target.value);
            } else {
              p.delete('entry_type');
            }
            p.set('offset', '0');
            setSearchParams(p);
          }}
          className="border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
        >
          <option value="">All Types</option>
          <option value="ESCROW_RELEASE_NET">Sale Credits</option>
          <option value="PAYSTACK_PAYOUT_FEE">Paystack Payout Fees</option>
          <option value="PAYSTACK_REFUND_FEE">Paystack Refund Fees</option>
          <option value="REFUND_FEE_PENALTY">Refund Penalties</option>
          <option value="SELLER_WITHDRAWAL_REQUEST">Withdrawals</option>
        </select>
        
        {(startDate || endDate || entryType) && (
          <button 
            onClick={() => { setSearchParams(new URLSearchParams()); }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Txn Reference</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Amount (GHS)</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Loading ledger entries...</p>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">No ledger entries found</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Your transaction history will appear here.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr 
                    key={entry.id} 
                    onClick={() => setSelectedEntry(entry)}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 dark:text-white">
                      {ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.paystack_reference ? (
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 px-2.5 py-1 rounded-lg">
                          {entry.paystack_reference}
                        </span>
                      ) : entry.reference_id ? (
                        <span className="font-mono text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {entry.reference_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500 italic">System Entry</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.type === 'CREDIT' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-emerald-950/60 text-green-800 dark:text-emerald-300">
                          <ArrowDownLeft className="mr-1 h-3 w-3" />
                          IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                          <ArrowUpRight className="mr-1 h-3 w-3" />
                          OUT
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-xs font-bold font-mono ${entry.type === 'CREDIT' ? 'text-green-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {entry.type === 'CREDIT' ? '+' : '-'}{Number(entry.amount_ghs).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedEntry(entry); }}
                        className="py-1 px-2.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 hover:bg-blue-100 dark:hover:bg-slate-750 text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && totalCount > limit && (
          <div className="bg-white dark:bg-slate-950 px-6 py-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-gray-700 dark:text-slate-300">
              Showing <span className="font-medium">{offset + 1}</span> to <span className="font-medium">{Math.min(offset + limit, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results
            </p>
            <nav className="inline-flex rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
              <button
                onClick={() => handlePageChange(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 border-r border-gray-200 dark:border-slate-800 cursor-pointer"
              >
                ← Previous
              </button>
              <button
                onClick={() => handlePageChange(offset + limit)}
                disabled={offset + limit >= totalCount}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                Next →
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Transaction & Ledger Entry Inspection Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden relative">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Ledger Entry Audit</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">ID: {selectedEntry.id.slice(0, 18)}...</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Entry Amount & Type Card */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                selectedEntry.type === 'CREDIT' ? 'bg-green-50/80 dark:bg-emerald-950/40 border-green-200 dark:border-emerald-800' : 'bg-red-50/80 dark:bg-red-950/40 border-red-200 dark:border-red-800'
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 block">Entry Type</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {ENTRY_TYPE_LABELS[selectedEntry.entry_type] || selectedEntry.entry_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 block mt-0.5">
                    {new Date(selectedEntry.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 block">Amount</span>
                  <span className={`text-lg font-black font-mono ${selectedEntry.type === 'CREDIT' ? 'text-green-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {selectedEntry.type === 'CREDIT' ? '+' : '-'}GHS {Number(selectedEntry.amount_ghs).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Transaction Reference Section */}
              <div className="bg-gray-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-gray-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-gray-700 dark:text-slate-300 block uppercase text-[10px]">Transaction & Reference Details</span>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400">Paystack Reference:</span>
                  {selectedEntry.paystack_reference ? (
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                      {selectedEntry.paystack_reference}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-slate-500 italic">N/A (System Direct Entry)</span>
                  )}
                </div>
                {selectedEntry.reference_id && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-slate-400">System Reference UUID:</span>
                    <span className="font-mono text-[11px] text-gray-700 dark:text-slate-300">{selectedEntry.reference_id}</span>
                  </div>
                )}
              </div>

              {/* Order & Buyer Details (if available) */}
              {selectedEntry.transaction_title ? (
                <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3 shadow-sm">
                  <div className="border-b border-gray-100 dark:border-slate-700 pb-2 flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{selectedEntry.transaction_title}</span>
                    {selectedEntry.status && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                        {selectedEntry.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-gray-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Buyer Name:</span>
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{selectedEntry.buyer_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Buyer Phone:</span>
                      <span className="font-mono text-gray-800 dark:text-slate-200">{selectedEntry.buyer_phone || 'N/A'}</span>
                    </div>
                    {selectedEntry.buyer_email && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Buyer Email:</span>
                        <span className="text-gray-800 dark:text-slate-200">{selectedEntry.buyer_email}</span>
                      </div>
                    )}
                    {selectedEntry.shipping_address && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-slate-400">Delivery Address:</span>
                        <span className="text-gray-800 dark:text-slate-200 text-right max-w-[60%]">{selectedEntry.shipping_address}</span>
                      </div>
                    )}
                  </div>

                  {/* Dispatch / Logistics Proof */}
                  {selectedEntry.waybill_photo_url && (
                    <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 flex items-center gap-3 mt-2">
                      <img
                        src={selectedEntry.waybill_photo_url}
                        alt="Dispatch proof"
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200 block">Dispatch Proof / Waybill</span>
                        {selectedEntry.courier_name && (
                          <span className="text-[11px] text-gray-500 dark:text-slate-400 block">Courier: {selectedEntry.courier_name} ({selectedEntry.tracking_number || 'No tracking #'})</span>
                        )}
                        {selectedEntry.driver_phone && (
                          <span className="text-[11px] text-gray-500 dark:text-slate-400 block">Driver Phone: {selectedEntry.driver_phone}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-amber-900 dark:text-amber-300 text-xs">
                  ℹ This ledger record is a system fee or wallet withdrawal entry not directly linked to a specific buyer purchase order.
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
