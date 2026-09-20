import { useState } from 'react';
import { User, Store, ShieldCheck, ZoomIn, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import ImageLightboxModal from './ImageLightboxModal';

export interface DisputeChatTimelineProps {
  buyerReason?: string | null;
  buyerPhotos?: string[] | null;
  buyerName?: string;
  sellerResponse?: string | null;
  sellerPhotos?: string[] | null;
  sellerName?: string;
  managerNotes?: string | null;
  managerPhotos?: string[] | null;
  disputeRetractedAt?: string | null;
  waybillPhotoUrl?: string | null;
  onOpenDisputeModal?: () => void;
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
  disputeRetractedAt?: string | null,
  waybillPhotoUrl?: string | null
): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const baseTime = Date.now() - 3600000; // 1 hour ago fallback baseline

  // Dispatch Waybill Proof (from seller)
  if (waybillPhotoUrl) {
    messages.push({
      id: 'waybill-dispatch-0',
      sender: 'SELLER',
      title: formatTitle(sellerName, 'SELLER', false, true),
      text: 'Dispatch waybill photo uploaded by seller during shipping.',
      photos: [waybillPhotoUrl],
      sortDate: baseTime - 60000
    });
  }

  // Parse Buyer Reason(s)
  if (buyerReason && buyerReason.trim()) {
    const rawChunks = buyerReason.split(/\n\n---\s*\[Buyer Update\s*(?:\((.*?)\))?\]\s*---\n?/gi);
    if (rawChunks.length === 1) {
      // Single initial claim
      messages.push({
        id: 'buyer-0',
        sender: 'BUYER',
        title: formatTitle(buyerName, 'BUYER', false),
        text: rawChunks[0].trim(),
        photos: buyerPhotos || [],
        sortDate: baseTime
      });
    } else {
      if (rawChunks[0].trim()) {
        messages.push({
          id: 'buyer-0',
          sender: 'BUYER',
          title: formatTitle(buyerName, 'BUYER', false),
          text: rawChunks[0].trim(),
          photos: buyerPhotos || [],
          sortDate: baseTime
        });
      }
      for (let i = 1; i < rawChunks.length; i += 2) {
        const time = rawChunks[i];
        const text = rawChunks[i + 1] || '';
        if (text.trim()) {
          const parsedTime = parseDate(time) || (baseTime + (i * 60000));
          messages.push({
            id: `buyer-update-${i}`,
            sender: 'BUYER',
            title: formatTitle(buyerName, 'BUYER', true),
            text: text.trim(),
            timestamp: time ? time.trim() : undefined,
            photos: [],
            sortDate: parsedTime
          });
        }
      }
    }
  }

  // Parse Seller Response(s)
  if (sellerResponse && sellerResponse.trim()) {
    const rawChunks = sellerResponse.split(/\n\n---\s*\[Seller Response\s*(?:\((.*?)\))?\]\s*---\n?/gi);
    if (rawChunks.length === 1) {
      messages.push({
        id: 'seller-0',
        sender: 'SELLER',
        title: formatTitle(sellerName, 'SELLER', false),
        text: rawChunks[0].trim(),
        photos: sellerPhotos || [],
        sortDate: baseTime + 1800000 // default 30 mins after buyer
      });
    } else {
      if (rawChunks[0].trim()) {
        messages.push({
          id: 'seller-0',
          sender: 'SELLER',
          title: formatTitle(sellerName, 'SELLER', false),
          text: rawChunks[0].trim(),
          photos: sellerPhotos || [],
          sortDate: baseTime + 1800000
        });
      }
      for (let i = 1; i < rawChunks.length; i += 2) {
        const time = rawChunks[i];
        const text = rawChunks[i + 1] || '';
        if (text.trim()) {
          const parsedTime = parseDate(time) || (baseTime + 1800000 + (i * 60000));
          messages.push({
            id: `seller-update-${i}`,
            sender: 'SELLER',
            title: formatTitle(sellerName, 'SELLER', true),
            text: text.trim(),
            timestamp: time ? time.trim() : undefined,
            photos: [],
            sortDate: parsedTime
          });
        }
      }
    }
  }

  // Manager Notes
  if (managerNotes && managerNotes.trim()) {
    messages.push({
      id: 'manager-0',
      sender: 'MANAGER',
      title: '⚖️ Admin Arbitrator Resolution Notes',
      text: managerNotes.trim(),
      photos: managerPhotos || [],
      sortDate: Date.now() + 1000 // rulings are typically final
    });
  }

  // Dispute Retraction System Event
  if (disputeRetractedAt) {
    const retTime = parseDate(disputeRetractedAt) || Date.now();
    messages.push({
      id: 'retracted-system',
      sender: 'SYSTEM',
      title: 'Dispute Retracted & Settled Privately',
      text: 'The buyer retracted this dispute to settle privately with the seller. Funds are scheduled for automatic release to the seller.',
      timestamp: new Date(disputeRetractedAt).toLocaleString(),
      photos: [],
      sortDate: retTime
    });
  }

  // Sort strictly across board chronologically
  messages.sort((a, b) => a.sortDate - b.sortDate);

  return messages;
}

export default function DisputeChatTimeline({
  buyerReason,
  buyerPhotos,
  buyerName = 'Buyer',
  sellerResponse,
  sellerPhotos,
  sellerName = 'Seller',
  managerNotes,
  managerPhotos,
  disputeRetractedAt,
  waybillPhotoUrl,
  onOpenDisputeModal,
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
    disputeRetractedAt,
    waybillPhotoUrl
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

  return (
    <div className="space-y-3">
      {/* Header & Response Trigger */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-slate-800 pb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <h4 className="text-xs font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-rose-500" />
            <span>Dispute Evidence & Dialogue Trail</span>
            <span className="text-[10px] font-mono font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
              {messages.length} update{messages.length === 1 ? '' : 's'}
            </span>
          </h4>
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
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 text-purple-950 dark:text-purple-200 rounded-2xl p-3.5 text-left text-xs max-w-[92%] shadow-sm space-y-2">
                  <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800 pb-1.5 font-bold text-purple-900 dark:text-purple-300">
                    <span className="flex items-center gap-1.5">⚖️ {msg.title}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>
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
                    <div className="flex flex-wrap gap-1.5 pt-1">
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
                            className="w-14 h-14 object-cover rounded-lg border border-purple-200 dark:border-purple-700 hover:opacity-90 transition"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
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
