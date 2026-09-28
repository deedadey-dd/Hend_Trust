import { useState } from 'react';
import { User, Store, ShieldCheck, ZoomIn, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import ImageLightboxModal from './ImageLightboxModal';

export interface DisputeChatTimelineProps {
  buyerReason?: string | null;
  buyerPhotos?: string[] | null;
  buyerName?: string;
  buyerCategory?: string | null;
  sellerResponse?: string | null;
  sellerPhotos?: string[] | null;
  sellerName?: string;
  managerNotes?: string | null;
  managerPhotos?: string[] | null;
  disputedAt?: string | null;
  dispatchedAt?: string | null;
  createdAt?: string | null;
  arbiterName?: string | null;
  arbiterEscalatedAt?: string | null;
  arbiterEscalatedRole?: string | null;
  arbiterEscalationHours?: number;
  disputeRetractedAt?: string | null;
  waybillPhotoUrl?: string | null;
  onOpenDisputeModal?: () => void;
  onRequestArbiterDecision?: () => void;
  isRequestingArbiter?: boolean;
  showResponseButton?: boolean;
  maxHeight?: string;
}

interface ParsedMessage {
  id: string;
  sender: 'BUYER' | 'SELLER' | 'MANAGER' | 'SYSTEM';
  title: string;
  text: string;
  timestamp?: string;
  photos: string[];
  sortDate: number;
}

function parseDate(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? null : parsed;
}

function formatDisplayDate(dateVal?: string | number | null): string | undefined {
  if (!dateVal) return undefined;
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return (
        d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) + ' • ' + d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      );
    }
    return undefined;
  }
  
  const parsed = Date.parse(dateVal);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return (
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' • ' + d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    );
  }

  return dateVal;
}

function cleanRoleSuffix(name?: string): string {
  if (!name) return '';
  return name.replace(/\s*\((Buyer|Seller|Buyer Update|Seller Update|Dispatch Proof)\)\s*/gi, '').trim();
}

function formatTitle(
  rawName: string | undefined, 
  role: 'BUYER' | 'SELLER', 
  isUpdate: boolean, 
  isWaybill: boolean = false
): string {
  if (isWaybill) {
    const clean = cleanRoleSuffix(rawName);
    return clean ? `${clean} (Dispatch Proof)` : 'Dispatch & Waybill Proof';
  }

  const clean = cleanRoleSuffix(rawName);
  const isYou = clean.toLowerCase() === 'you';

  if (role === 'BUYER') {
    const base = isYou ? 'You' : (clean || 'Buyer');
    return isUpdate ? `${base} (Buyer Update)` : `${base} (Buyer)`;
  } else {
    const base = isYou ? 'You' : (clean || 'Seller');
    return isUpdate ? `${base} (Seller Update)` : `${base} (Seller)`;
  }
}

function parseDisputeTrail(
  buyerReason?: string | null,
  buyerPhotos?: string[] | null,
  buyerName?: string,
  sellerResponse?: string | null,
  sellerPhotos?: string[] | null,
  sellerName?: string,
  managerNotes?: string | null,
  managerPhotos?: string[] | null,
  disputedAt?: string | null,
  dispatchedAt?: string | null,
  createdAt?: string | null,
  disputeRetractedAt?: string | null,
  waybillPhotoUrl?: string | null,
  arbiterName?: string | null
): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  
  const createdTime = parseDate(createdAt) || parseDate(disputedAt) || (Date.now() - 3600000);
  const disputeOpenTime = parseDate(disputedAt) || createdTime;
  const dispatchTime = parseDate(dispatchedAt) || (disputeOpenTime - 120000);

  // 1. Dispatch Waybill Proof (from seller)
  if (waybillPhotoUrl) {
    messages.push({
      id: 'waybill-dispatch-0',
      sender: 'SELLER',
      title: formatTitle(sellerName, 'SELLER', false, true),
      text: 'Dispatch waybill photo uploaded by seller during package shipment.',
      timestamp: formatDisplayDate(dispatchedAt || dispatchTime),
      photos: [waybillPhotoUrl],
      sortDate: dispatchTime
    });
  }

  // 2. Parse Buyer Reason(s)
  if (buyerReason && buyerReason.trim()) {
    const rawChunks = buyerReason.split(/(?:^|\n\n)---\s*\[Buyer Update\s*(?:\((.*?)\))?\]\s*---\n?/gi);
    if (rawChunks.length === 1) {
      messages.push({
        id: 'buyer-0',
        sender: 'BUYER',
        title: formatTitle(buyerName, 'BUYER', false),
        text: rawChunks[0].replace(/---\s*\[Buyer Update.*?\]\s*---\n?/gi, '').trim(),
        timestamp: formatDisplayDate(disputedAt || disputeOpenTime),
        photos: buyerPhotos || [],
        sortDate: disputeOpenTime
      });
    } else {
      if (rawChunks[0] && rawChunks[0].trim()) {
        const cleanLead = rawChunks[0].replace(/---\s*\[Buyer Update.*?\]\s*---\n?/gi, '').trim();
        if (cleanLead) {
          messages.push({
            id: 'buyer-0',
            sender: 'BUYER',
            title: formatTitle(buyerName, 'BUYER', false),
            text: cleanLead,
            timestamp: formatDisplayDate(disputedAt || disputeOpenTime),
            photos: buyerPhotos || [],
            sortDate: disputeOpenTime
          });
        }
      }
      for (let i = 1; i < rawChunks.length; i += 2) {
        const time = rawChunks[i];
        const rawText = rawChunks[i + 1] || '';
        const text = rawText.replace(/---\s*\[Buyer Update.*?\]\s*---\n?/gi, '').trim();
        if (text) {
          const parsedTime = parseDate(time) || (disputeOpenTime + (i * 60000));
          messages.push({
            id: `buyer-update-${i}`,
            sender: 'BUYER',
            title: formatTitle(buyerName, 'BUYER', true),
            text,
            timestamp: formatDisplayDate(time || parsedTime),
            photos: [],
            sortDate: parsedTime
          });
        }
      }
    }
  }

  // 3. Parse Seller Response(s)
  if (sellerResponse && sellerResponse.trim()) {
    const rawChunks = sellerResponse.split(/(?:^|\n\n)---\s*\[Seller Response\s*(?:\((.*?)\))?\]\s*---\n?/gi);
    const sellerInitialTime = disputeOpenTime + 300000; // default 5 mins after dispute opened baseline
    if (rawChunks.length === 1) {
      messages.push({
        id: 'seller-0',
        sender: 'SELLER',
        title: formatTitle(sellerName, 'SELLER', false),
        text: rawChunks[0].replace(/---\s*\[Seller Response.*?\]\s*---\n?/gi, '').trim(),
        timestamp: formatDisplayDate(sellerInitialTime),
        photos: sellerPhotos || [],
        sortDate: sellerInitialTime
      });
    } else {
      if (rawChunks[0] && rawChunks[0].trim()) {
        const cleanLead = rawChunks[0].replace(/---\s*\[Seller Response.*?\]\s*---\n?/gi, '').trim();
        if (cleanLead) {
          messages.push({
            id: 'seller-0',
            sender: 'SELLER',
            title: formatTitle(sellerName, 'SELLER', false),
            text: cleanLead,
            timestamp: formatDisplayDate(sellerInitialTime),
            photos: sellerPhotos || [],
            sortDate: sellerInitialTime
          });
        }
      }
      for (let i = 1; i < rawChunks.length; i += 2) {
        const time = rawChunks[i];
        const rawText = rawChunks[i + 1] || '';
        const text = rawText.replace(/---\s*\[Seller Response.*?\]\s*---\n?/gi, '').trim();
        if (text) {
          const parsedTime = parseDate(time) || (sellerInitialTime + (i * 60000));
          messages.push({
            id: `seller-update-${i}`,
            sender: 'SELLER',
            title: formatTitle(sellerName, 'SELLER', true),
            text,
            timestamp: formatDisplayDate(time || parsedTime),
            photos: [],
            sortDate: parsedTime
          });
        }
      }
    }
  }

  // 4. Manager / Arbiter Notes & Instructions
  if (managerNotes && managerNotes.trim()) {
    const hasFormattedBlocks = /---\s*\[(?:Arbiter Instruction|Arbiter Note|Admin Note|Arbiter Resolution)/i.test(managerNotes);
    const defaultArbiterTitle = arbiterName && arbiterName.trim() 
      ? `Official Arbiter Notice (${arbiterName.trim()})` 
      : 'Official Arbiter Notice';

    if (hasFormattedBlocks) {
      const rawChunks = managerNotes.split(/(?:^|\n\n)---\s*\[(?:Arbiter Instruction|Arbiter Note|Admin Note|Arbiter Resolution)\s*(?:\((.*?)\))?(?:\s*by\s*(.*?))?\]\s*---\n?/gi);

      if (rawChunks[0] && rawChunks[0].trim()) {
        const cleanLead = rawChunks[0].replace(/---\s*\[(?:Arbiter Instruction|Arbiter Note|Admin Note|Arbiter Resolution).*?\]\s*---\n?/gi, '').trim();
        if (cleanLead) {
          const leadTime = disputeOpenTime + 600000;
          messages.push({
            id: 'manager-lead-0',
            sender: 'MANAGER',
            title: defaultArbiterTitle,
            text: cleanLead,
            timestamp: formatDisplayDate(leadTime),
            photos: managerPhotos || [],
            sortDate: leadTime
          });
        }
      }

      for (let i = 1; i < rawChunks.length; i += 3) {
        const time = rawChunks[i];
        const author = rawChunks[i + 1];
        const rawText = rawChunks[i + 2] || '';
        const text = rawText.replace(/---\s*\[(?:Arbiter Instruction|Arbiter Note|Admin Note|Arbiter Resolution).*?\]\s*---\n?/gi, '').trim();
        if (text) {
          const parsedTime = parseDate(time) || (disputeOpenTime + 600000 + (i * 60000));
          const cleanAuthor = author && author.trim() ? author.trim() : (arbiterName && arbiterName.trim() ? arbiterName.trim() : '');
          const title = cleanAuthor ? `Official Arbiter Notice (${cleanAuthor})` : 'Official Arbiter Notice';
          messages.push({
            id: `manager-instruction-${i}`,
            sender: 'MANAGER',
            title,
            text,
            timestamp: formatDisplayDate(time || parsedTime),
            photos: managerPhotos || [],
            sortDate: parsedTime
          });
        }
      }
    } else {
      // Single unformatted resolution note
      const rulingTime = Date.now();
      messages.push({
        id: 'manager-0',
        sender: 'MANAGER',
        title: defaultArbiterTitle,
        text: managerNotes.replace(/---\s*\[(?:Arbiter Instruction|Arbiter Note|Admin Note|Arbiter Resolution).*?\]\s*---\n?/gi, '').trim(),
        timestamp: formatDisplayDate(rulingTime),
        photos: managerPhotos || [],
        sortDate: rulingTime
      });
    }
  }

  // 5. Dispute Retraction System Event
  if (disputeRetractedAt) {
    const retTime = parseDate(disputeRetractedAt) || Date.now();
    messages.push({
      id: 'retracted-system',
      sender: 'SYSTEM',
      title: 'Dispute Retracted & Settled Privately',
      text: 'The buyer retracted this dispute to settle privately with the seller. Funds are scheduled for automatic release to the seller.',
      timestamp: formatDisplayDate(disputeRetractedAt || retTime),
      photos: [],
      sortDate: retTime
    });
  }

  // 6. Sort strictly across board chronologically
  messages.sort((a, b) => a.sortDate - b.sortDate);

  return messages;
}

export default function DisputeChatTimeline({
  buyerReason,
  buyerPhotos,
  buyerName = 'Buyer',
  buyerCategory,
  sellerResponse,
  sellerPhotos,
  sellerName = 'Seller',
  managerNotes,
  managerPhotos,
  disputedAt,
  dispatchedAt,
  createdAt,
  arbiterName,
  arbiterEscalatedAt,
  arbiterEscalatedRole,
  arbiterEscalationHours = 48,
  disputeRetractedAt,
  waybillPhotoUrl,
  onOpenDisputeModal,
  onRequestArbiterDecision,
  isRequestingArbiter = false,
  showResponseButton = false,
  maxHeight = '420px'
}: DisputeChatTimelineProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [expandedMsgIds, setExpandedMsgIds] = useState<Set<string>>(new Set());
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  const messages = parseDisputeTrail(
    buyerReason,
    buyerPhotos,
    buyerName,
    sellerResponse,
    sellerPhotos,
    sellerName,
    managerNotes,
    managerPhotos,
    disputedAt,
    dispatchedAt,
    createdAt,
    disputeRetractedAt,
    waybillPhotoUrl,
    arbiterName
  );

  const hasAnyDispute = Boolean(buyerReason || sellerResponse || managerNotes || disputeRetractedAt || waybillPhotoUrl);

  if (!hasAnyDispute) {
    return (
      <div className="bg-gray-50 dark:bg-slate-900/60 p-4 rounded-xl border border-gray-200 dark:border-slate-800 text-center text-xs text-gray-500 dark:text-slate-400 italic">
        No active dispute or claims recorded for this transaction.
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // If there are > 4 messages, offer a compact view by default
  const isLargeTrail = messages.length > 4;
  const displayedMessages = isLargeTrail && !showAllUpdates
    ? messages.slice(-3) // show latest 3 by default if large
    : messages;

  const CATEGORY_LABELS: Record<string, string> = {
    ITEM_DEFECTIVE: 'Item Damaged / Defective',
    WRONG_ITEM: 'Wrong Item Delivered',
    ITEM_NOT_RECEIVED: 'Item Not Received',
    MISSING_ITEMS: 'Missing Parts / Incomplete',
    MISREPRESENTED: 'Not As Described',
    OTHER: 'General Dispute',
  };

  const escalationThresholdHours = arbiterEscalationHours || 48;
  let canRequestArbiter = false;
  let hoursRemainingForArbiter = 0;

  if (disputedAt) {
    const dispTime = new Date(disputedAt).getTime();
    if (!isNaN(dispTime)) {
      const hoursElapsed = (Date.now() - dispTime) / 3600000;
      if (hoursElapsed >= escalationThresholdHours) {
        canRequestArbiter = true;
      } else {
        hoursRemainingForArbiter = Math.max(1, Math.ceil(escalationThresholdHours - hoursElapsed));
      }
    } else {
      canRequestArbiter = true;
    }
  } else {
    canRequestArbiter = true;
  }

  return (
    <div className="space-y-3">
      {/* Header & Response Trigger */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-slate-800 pb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-rose-500" />
            <span>Dispute Evidence & Dialogue Trail</span>
            <span className="text-[10px] font-mono font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
              {messages.length} update{messages.length === 1 ? '' : 's'}
            </span>
          </h4>
          {buyerCategory && (
            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-md text-[10px] font-bold">
              {CATEGORY_LABELS[buyerCategory] || buyerCategory}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showResponseButton && onOpenDisputeModal && (
            <button
              type="button"
              onClick={onOpenDisputeModal}
              className="py-1 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {sellerResponse ? '+ Add Subsequent Response' : 'Respond to Dispute'}
            </button>
          )}
        </div>
      </div>

      {/* Arbiter Decision Escalation Status & Action */}
      {arbiterEscalatedAt ? (
        <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl px-3.5 py-2 text-xs text-purple-900 dark:text-purple-200 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
            <span>
              ⚡ <strong>Arbiter Decision Requested</strong> {arbiterEscalatedRole ? `by ${arbiterEscalatedRole.toLowerCase()}` : ''} — Case prioritized in the official arbitration queue.
            </span>
          </div>
          <span className="text-[10px] font-bold bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md shrink-0">
            Priority Queue
          </span>
        </div>
      ) : onRequestArbiterDecision && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs">
          <div>
            <span className="font-bold text-amber-900 dark:text-amber-200 block">
              Official Arbiter Decision & Mediation
            </span>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              {canRequestArbiter
                ? `Direct negotiation window (${escalationThresholdHours}h) completed. You can request a certified platform arbiter ruling.`
                : `Parties have ${hoursRemainingForArbiter}h remaining in the direct negotiation window before requesting an Arbiter ruling.`}
            </p>
          </div>
          {canRequestArbiter ? (
            <button
              type="button"
              disabled={isRequestingArbiter}
              onClick={onRequestArbiterDecision}
              className="px-3.5 py-2 bg-[#ff6d1d] hover:bg-[#e05b11] text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span>⚡ Request Arbiter Decision</span>
            </button>
          ) : (
            <span className="text-[10px] font-bold font-mono bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg shrink-0">
              Unlocks in ~{hoursRemainingForArbiter}h
            </span>
          )}
        </div>
      )}

      {/* Large Trail Toggle Banner */}
      {isLargeTrail && (
        <div className="flex items-center justify-between bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 px-3 py-1.5 rounded-xl text-xs">
          <span className="text-blue-800 dark:text-blue-300 font-medium text-[11px]">
            {showAllUpdates ? `Showing all ${messages.length} dialogue messages` : `Showing latest 3 of ${messages.length} messages`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllUpdates(prev => !prev)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
          >
            {showAllUpdates ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Collapse Trail
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Show Earlier Updates ({messages.length - 3})
              </>
            )}
          </button>
        </div>
      )}

      {/* WhatsApp-Style Chat Stream */}
      <div 
        style={{ maxHeight }}
        className="bg-slate-100/80 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 overflow-y-auto"
      >
        {displayedMessages.map((msg) => {
          if (msg.sender === 'SYSTEM') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 rounded-xl px-4 py-2 text-center text-[11px] max-w-[90%] shadow-sm">
                  <div className="font-bold flex items-center justify-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{msg.title}</span>
                  </div>
                  <p className="mt-0.5">{msg.text}</p>
                  {msg.timestamp && <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-mono block mt-1">{msg.timestamp}</span>}
                </div>
              </div>
            );
          }

          if (msg.sender === 'MANAGER') {
            const isLong = msg.text.length > 260;
            const isExpanded = expandedMsgIds.has(msg.id);
            const displayText = isLong && !isExpanded ? `${msg.text.slice(0, 260)}...` : msg.text;

            return (
              <div key={msg.id} className="flex justify-center my-3">
                <div className="w-full max-w-[94%] bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/90 dark:border-purple-800/70 rounded-2xl p-3.5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-purple-200/80 dark:border-purple-800/60 pb-1.5 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs">⚖️</span>
                      <span className="font-bold text-purple-950 dark:text-purple-200 text-xs truncate">
                        {msg.title}
                      </span>
                    </div>
                    {msg.timestamp && (
                      <span className="text-[10px] font-mono text-purple-700/80 dark:text-purple-400/80 shrink-0">
                        {msg.timestamp}
                      </span>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed text-xs text-purple-950 dark:text-purple-100 font-medium">
                    {displayText}
                  </p>

                  {isLong && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(msg.id)}
                      className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                    >
                      {isExpanded ? 'Read less' : 'Read more...'}
                    </button>
                  )}

                  {msg.photos && msg.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-purple-200/60 dark:border-purple-800/40">
                      {msg.photos.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxImage(url)}
                          className="relative group cursor-pointer"
                          title="Click to enlarge"
                        >
                          <img
                            src={url}
                            alt="Arbitrator proof"
                            className="w-16 h-16 object-cover rounded-xl border border-purple-300 dark:border-purple-700 hover:opacity-90 transition shadow-xs"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-xl transition">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const isBuyer = msg.sender === 'BUYER';
          const isLong = msg.text.length > 260;
          const isExpanded = expandedMsgIds.has(msg.id);
          const displayText = isLong && !isExpanded ? `${msg.text.slice(0, 260)}...` : msg.text;

          return (
            <div
              key={msg.id}
              className={`flex ${isBuyer ? 'justify-start' : 'justify-end'} animate-fade-in`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 shadow-sm text-xs space-y-2 ${
                  isBuyer
                    ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                    : 'bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-slate-900 dark:text-slate-100 rounded-tr-xs'
                }`}
              >
                {/* Bubble Header */}
                <div className="flex items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-1">
                  <span
                    className={`font-bold flex items-center gap-1 text-[11px] ${
                      isBuyer ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {isBuyer ? <User className="h-3 w-3" /> : <Store className="h-3 w-3" />}
                    {msg.title}
                  </span>
                  {msg.timestamp && (
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {msg.timestamp}
                    </span>
                  )}
                </div>

                {/* Message Body */}
                <p className="whitespace-pre-wrap leading-relaxed break-words font-sans">
                  {displayText}
                </p>

                {isLong && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(msg.id)}
                    className={`text-[11px] font-bold hover:underline cursor-pointer ${
                      isBuyer ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {isExpanded ? 'Read less' : 'Read more...'}
                  </button>
                )}

                {/* Attached Evidence Photos */}
                {msg.photos && msg.photos.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-slate-400 block mb-1">
                      Evidence Photos ({msg.photos.length}/5):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.photos.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxImage(url)}
                          className="relative group cursor-pointer"
                          title="Click to enlarge"
                        >
                          <img
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-700 hover:opacity-90 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
                            <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      <ImageLightboxModal
        src={lightboxImage || ''}
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
