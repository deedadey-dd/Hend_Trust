import React from 'react';
import { X, ShieldAlert, UserCheck, Calendar, Image, RefreshCw } from 'lucide-react';
import { useDisputeActionsQuery, type DisputeActionItem } from '../hooks/api/useAdminPortal';
import { useEscapeKey } from '../utils/useEscapeKey';

interface AdminDisputeAuditModalProps {
  transactionId: string;
  paystackReference?: string;
  linkTitle?: string;
  onClose: () => void;
  onPreviewImage?: (url: string) => void;
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: 'Arbiter Assigned', color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20' },
  RELEASE_TO_SELLER: { label: 'Funds Released to Seller', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  FULL_REFUND_TO_BUYER: { label: 'Full Refund to Buyer', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
  PARTIAL_REFUND_TO_BUYER: { label: 'Partial Refund Settlement', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  REQUIRE_RETURN_FROM_BUYER: { label: 'Item Return Required', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  RETRACTED_CONFIRMED: { label: 'Buyer Retraction Confirmed', color: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20' },
  MESSAGE_APPENDED: { label: 'Evidence / Notes Appended', color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20' },
};

export const AdminDisputeAuditModal: React.FC<AdminDisputeAuditModalProps> = ({
  transactionId,
  paystackReference,
  linkTitle,
  onClose,
  onPreviewImage,
}) => {
  useEscapeKey(onClose);
  const { data: actions, isLoading } = useDisputeActionsQuery(transactionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Multi-Arbiter Audit Trail
              </span>
              {paystackReference && <span className="font-mono text-xs text-slate-500">{paystackReference}</span>}
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
              Dispute Resolution & Arbiter History
            </h3>
            {linkTitle && <p className="text-xs text-slate-500 truncate max-w-md">{linkTitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
              <p className="text-xs">Loading dispute resolution audit logs...</p>
            </div>
          ) : !actions || actions.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No official arbiter actions recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Actions will be logged automatically when arbiters assign cases or issue binding settlements.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6">
              {actions.map((act: DisputeActionItem) => {
                const config = ACTION_TYPE_CONFIG[act.action_type] || {
                  label: act.action_type,
                  color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
                };
                const arbiterName = act.arbiter
                  ? `${act.arbiter.first_name || ''} ${act.arbiter.last_name || ''}`.trim() || act.arbiter.username
                  : 'Platform System';

                return (
                  <div key={act.id} className="relative pl-6">
                    {/* Timeline Node */}
                    <div className="absolute -left-2.5 top-1 h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" />
                          {new Date(act.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Arbiter info */}
                      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                        <span>
                          Arbiter: <strong className="text-slate-900 dark:text-white">@{act.arbiter?.username || 'system'}</strong> ({arbiterName})
                        </span>
                        {act.arbiter?.role && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {act.arbiter.role}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {act.admin_notes && (
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                          <span className="font-semibold block text-slate-800 dark:text-slate-200 mb-0.5">Arbiter Ruling Notes:</span>
                          <p className="whitespace-pre-wrap">{act.admin_notes}</p>
                        </div>
                      )}

                      {/* Split Amounts if present */}
                      {(act.refund_amount_ghs > 0 || act.seller_amount_ghs > 0) && (
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                            <span className="text-slate-500 text-[10px] font-mono block">REFUND TO BUYER</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">GHS {act.refund_amount_ghs.toFixed(2)}</span>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
                            <span className="text-slate-500 text-[10px] font-mono block">SELLER ALLOCATION</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">GHS {act.seller_amount_ghs.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Evidence ruling photos */}
                      {act.manager_photos && act.manager_photos.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1">
                            <Image className="h-3 w-3" /> Attached Arbiter Ruling Evidence:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {act.manager_photos.map((photo, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => onPreviewImage?.(photo)}
                                className="h-14 w-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 hover:scale-105 transition cursor-pointer"
                              >
                                <img src={photo} alt={`Ruling evidence ${pIdx + 1}`} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
