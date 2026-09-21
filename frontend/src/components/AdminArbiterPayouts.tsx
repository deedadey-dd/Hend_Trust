import React, { useState } from 'react';
import {
  Coins,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  CreditCard,
  Phone,
  UserCheck,
  X,
  FileText,
} from 'lucide-react';
import {
  useArbiterBalancesQuery,
  useArbiterActivitiesQuery,
  useCreateArbiterPayoutBatchMutation,
  type ArbiterBalanceItem,
  type ArbiterActivityItem,
} from '../hooks/api/useAdminPortal';
import { ExportButton } from './ExportButton';
import type { ExportColumn } from '../utils/exportUtils';
import { useEscapeKey } from '../utils/useEscapeKey';

const arbiterBalanceExportHeaders: ExportColumn[] = [
  { label: 'Arbiter ID', key: 'arbiter_id' },
  { label: 'Username', key: 'username' },
  { label: 'Name', key: 'first_name' },
  { label: 'Phone', key: 'phone_number' },
  { label: 'Email', key: 'email' },
  { label: 'Role', key: 'role' },
  { label: 'Pending Cases', key: 'unpaid_count' },
  { label: 'Unpaid Balance (GHS)', key: 'unpaid_balance_ghs' },
  { label: 'Paid Balance (GHS)', key: 'paid_balance_ghs' },
  { label: 'Total Earned (GHS)', key: 'total_earned_ghs' },
];

const arbiterActivityExportHeaders: ExportColumn[] = [
  { label: 'Activity ID', key: 'id' },
  { label: 'Date', key: 'created_at' },
  { label: 'Order Reference', key: 'order_reference' },
  { label: 'Activity Type', key: 'activity_type' },
  { label: 'Fee Rate (GHS)', key: 'fee_rate_ghs' },
  { label: 'Payout Status', key: 'payout_status' },
  { label: 'Payout Batch Reference', key: 'payout_batch_reference' },
  { label: 'Paid Timestamp', key: 'paid_at' },
];

export const AdminArbiterPayouts: React.FC = () => {
  const { data: balances, isLoading: loadingBalances, refetch: refetchBalances } = useArbiterBalancesQuery();
  const [selectedArbiterFilter, setSelectedArbiterFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { data: activitiesData, isLoading: loadingActivities, refetch: refetchActivities } = useArbiterActivitiesQuery(
    selectedArbiterFilter,
    statusFilter
  );

  const createBatchMutation = useCreateArbiterPayoutBatchMutation();

  // Payout Batch Modal State
  const [payoutModalArbiter, setPayoutModalArbiter] = useState<ArbiterBalanceItem | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<'MOMO' | 'BANK'>('MOMO');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('');
  const [payoutErrorMsg, setPayoutErrorMsg] = useState('');

  useEscapeKey(() => setPayoutModalArbiter(null), Boolean(payoutModalArbiter));

  // Calculations
  const totalUnpaidGhs = (balances || []).reduce((acc, b) => acc + (b.unpaid_balance_ghs || 0), 0);
  const totalPaidGhs = (balances || []).reduce((acc, b) => acc + (b.paid_balance_ghs || 0), 0);
  const totalArbitersWithPending = (balances || []).filter((b) => b.unpaid_count > 0).length;

  const handleOpenPayoutModal = (arb: ArbiterBalanceItem) => {
    setPayoutModalArbiter(arb);
    setMomoPhone(arb.phone_number || '');
    setPayoutMethod('MOMO');
    setPaymentReference('');
    setPayoutNotes('');
    setPayoutSuccessMsg('');
    setPayoutErrorMsg('');
  };

  const handleExecuteBatchPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalArbiter) return;
    setPayoutSuccessMsg('');
    setPayoutErrorMsg('');

    try {
      const accountDetails =
        payoutMethod === 'MOMO'
          ? { phone: momoPhone, network: momoNetwork }
          : { bank_name: bankName, account_number: bankAccountNumber };

      const res = await createBatchMutation.mutateAsync({
        arbiter_id: payoutModalArbiter.arbiter_id,
        payout_method: payoutMethod,
        payout_account_details: accountDetails,
        payment_reference: paymentReference.trim(),
        notes: payoutNotes.trim(),
      });

      setPayoutSuccessMsg(res.message || 'Payout batch processed successfully!');
      setTimeout(() => {
        setPayoutModalArbiter(null);
        setPayoutSuccessMsg('');
        refetchBalances();
        refetchActivities();
      }, 1800);
    } catch (err: any) {
      setPayoutErrorMsg(err.response?.data?.detail || 'Failed to process payout batch.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Finance & Compensation Ledger
            </span>
            <span className="text-slate-500 text-xs font-mono">Arbitration Payout Accounting</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Arbiter Compensation & Payout Batches
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Track dispute resolution task compensation fees, compute verified balances, and execute batched MoMo/Bank disbursements for platform arbiters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            filename={`arbiter_compensation_${new Date().toISOString().split('T')[0]}`}
            title="Arbiter Compensation Ledger Report"
            headers={arbiterBalanceExportHeaders}
            data={balances || []}
            sheetName="Arbiter Balances"
            label="Export Balances"
          />
          <button
            onClick={() => {
              refetchBalances();
              refetchActivities();
            }}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            title="Refresh balances"
          >
            <RefreshCw className={`h-4 w-4 ${loadingBalances || loadingActivities ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Payout Balance</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2 font-mono">
            GHS {totalUnpaidGhs.toFixed(2)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Across {totalArbitersWithPending} active dispute arbiters</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Settled To Date</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
            GHS {totalPaidGhs.toFixed(2)}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Fully disbursed & accounted in ledger</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Arbiters</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono">
            {balances?.length || 0}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Authorized arbitration staff</p>
        </div>
      </div>

      {/* Section 1: Arbiter Balances Summary Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              Arbiter Balance Accounting & Settlement Triggers
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Click "Settle Batch Payout" to disburse funds to an arbiter.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Arbiter Profile</th>
                <th className="py-3 px-4">Phone / MoMo</th>
                <th className="py-3 px-4 text-center">Unpaid Cases</th>
                <th className="py-3 px-4 text-right">Unpaid Balance (GHS)</th>
                <th className="py-3 px-4 text-right">Paid Balance (GHS)</th>
                <th className="py-3 px-4 text-right">Total Lifetime Earned</th>
                <th className="py-3 px-4 text-right">Settlement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loadingBalances ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-1 text-amber-500" />
                    Loading arbiter balances...
                  </td>
                </tr>
              ) : !balances || balances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No arbiters found in system.
                  </td>
                </tr>
              ) : (
                balances.map((arb) => {
                  const fullName = `${arb.first_name || ''} ${arb.last_name || ''}`.trim();
                  const hasUnpaid = arb.unpaid_count > 0;

                  return (
                    <tr key={arb.arbiter_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-600 dark:text-amber-400 uppercase text-xs">
                            {arb.username.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-xs">
                              @{arb.username}
                            </span>
                            {fullName && <span className="text-[11px] text-slate-500 block">{fullName}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {arb.phone_number || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            hasUnpaid
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {arb.unpaid_count}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                        GHS {arb.unpaid_balance_ghs.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                        GHS {arb.paid_balance_ghs.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                        GHS {arb.total_earned_ghs.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={!hasUnpaid}
                          onClick={() => handleOpenPayoutModal(arb)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer ${
                            hasUnpaid
                              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <Send className="h-3 w-3" />
                          <span>Settle Batch</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Chronological Arbiter Activity Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Chronological Arbiter Activity & Resolution Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified record of each dispute resolution event and associated compensation credit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={selectedArbiterFilter}
              onChange={(e) => setSelectedArbiterFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Arbiters</option>
              {(balances || []).map((b) => (
                <option key={b.arbiter_id} value={b.arbiter_id}>
                  @{b.username}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING (Unpaid)</option>
              <option value="PAID">PAID (Settled)</option>
            </select>
            <ExportButton
              filename={`arbiter_activity_ledger_${new Date().toISOString().split('T')[0]}`}
              title="Arbiter Activity Ledger Log"
              headers={arbiterActivityExportHeaders}
              data={activitiesData?.items || []}
              sheetName="Activity Logs"
              label="Export Log"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Arbiter</th>
                <th className="py-3 px-4">Order Reference</th>
                <th className="py-3 px-4">Activity Description</th>
                <th className="py-3 px-4 text-right">Fee (GHS)</th>
                <th className="py-3 px-4 text-center">Payout Status</th>
                <th className="py-3 px-4">Batch Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loadingActivities ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-1 text-indigo-500" />
                    Loading activity ledger logs...
                  </td>
                </tr>
              ) : !activitiesData || activitiesData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No activity logs recorded matching criteria.
                  </td>
                </tr>
              ) : (
                activitiesData.items.map((act: ArbiterActivityItem) => (
                  <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(act.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white">@{act.arbiter.username}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      {act.order_reference || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {act.notes || act.activity_type}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                      GHS {act.fee_rate_ghs.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          act.payout_status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {act.payout_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {act.payout_batch_reference || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: PROCESS ARBITER BATCH PAYOUT ────────────────────────────── */}
      {payoutModalArbiter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Execute Arbiter Settlement Payout
                </h3>
                <p className="text-xs text-slate-500">
                  Arbiter: <strong className="text-amber-600 dark:text-amber-400">@{payoutModalArbiter.username}</strong>
                </p>
              </div>
              <button
                onClick={() => setPayoutModalArbiter(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteBatchPayout} className="space-y-3.5 text-xs">
              {/* Summary of pending disbursement */}
              <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-300 dark:border-amber-500/30 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Dispute Cases to Settle:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{payoutModalArbiter.unpaid_count} cases</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-amber-200 dark:border-amber-800/40">
                  <span className="font-bold text-amber-800 dark:text-amber-300">Total Batch Payout Amount:</span>
                  <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                    GHS {payoutModalArbiter.unpaid_balance_ghs.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Payout Channel</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('MOMO')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      payoutMethod === 'MOMO'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <Phone className="h-4 w-4" /> Mobile Money (MoMo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      payoutMethod === 'BANK'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" /> Bank Account Transfer
                  </button>
                </div>
              </div>

              {payoutMethod === 'MOMO' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">MoMo Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value)}
                      placeholder="024XXXXXXX"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Network Provider</label>
                    <select
                      value={momoNetwork}
                      onChange={(e) => setMomoNetwork(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold cursor-pointer"
                    >
                      <option value="MTN">MTN MoMo</option>
                      <option value="TELECEL">Telecel Cash</option>
                      <option value="AIRTELTIGO">AT Money</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. GCB Bank, Ecobank"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="Account number"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Payment Reference / Transaction ID (Optional)</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. MOMO-TX-99882211"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Disbursement Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Notes for accountant audit trail..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {payoutSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold">
                  {payoutSuccessMsg}
                </div>
              )}
              {payoutErrorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl font-bold">
                  {payoutErrorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayoutModalArbiter(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBatchMutation.isPending}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {createBatchMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Confirm Batch Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
