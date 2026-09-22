import React, { useRef, useState } from 'react';
import { 
  Share2, 
  ShieldCheck, 
  Star, 
  Sparkles, 
  CheckCircle2, 
  X,
  Copy,
  Check
} from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';

interface ShareableProofCardProps {
  itemTitle: string;
  amountGhs: number;
  sellerShopName: string;
  sellerUsername: string;
  buyerName?: string;
  rating?: number;
  reviewComment?: string;
  onClose?: () => void;
}

export const ShareableProofCard: React.FC<ShareableProofCardProps> = ({
  itemTitle,
  amountGhs,
  sellerShopName,
  sellerUsername,
  buyerName = 'Verified Buyer',
  rating = 5,
  reviewComment = 'Fast delivery and smooth escrow transaction. Highly recommended!',
  onClose,
}) => {
  useEscapeKey(() => {
    if (onClose) onClose();
  }, Boolean(onClose));

  const [copiedLink, setCopiedLink] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const origin = window.location.origin;
  const storeUrl = `${origin}/store/${sellerUsername}`;
  const whatsappShareText = encodeURIComponent(
    `✅ Successfully completed a protected escrow sale on HendAxis Trust!\n📦 Item: ${itemTitle}\n💰 Amount: GHS ${amountGhs.toFixed(2)}\n⭐ Verified 5-Star Experience\n\nShop with 100% scam protection at my verified store: ${storeUrl}`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Social Proof Story Card
            </h3>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Story Card Preview Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Share this verified transaction badge to your <strong>WhatsApp Status</strong> or <strong>Instagram Story</strong> to build trust with new followers.
          </p>

          {/* Visual Story Graphic Element */}
          <div 
            ref={cardRef}
            className="w-full rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 border border-slate-800 shadow-2xl relative overflow-hidden space-y-5"
          >
            {/* Background Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header Brand */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase block">
                    Verified Escrow Delivery
                  </span>
                  <span className="text-xs font-black text-white">HENDAXIS TRUST</span>
                </div>
              </div>

              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> 100% Completed
              </span>
            </div>

            {/* Main Content Info */}
            <div className="space-y-3 relative z-10">
              <span className="text-xs text-slate-400 font-mono">ORDER SUMMARY</span>
              <h4 className="text-xl font-extrabold text-white tracking-tight">
                {itemTitle}
              </h4>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-700 text-sm font-black text-emerald-400 font-mono">
                GHS {amountGhs.toFixed(2)} Protected & Paid
              </div>
            </div>

            {/* Buyer Review Snippet */}
            <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-1.5 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {buyerName}
                </span>
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                "{reviewComment}"
              </p>
            </div>

            {/* Footer Watermark */}
            <div className="flex items-center justify-between pt-2 text-[10px] text-slate-500 font-mono border-t border-slate-800/80 relative z-10">
              <span>Merchant: @{sellerUsername}</span>
              <span>Shop Safely: {sellerShopName || sellerUsername}</span>
            </div>
          </div>

          {/* Action Sharing Buttons */}
          <div className="space-y-3 pt-2">
            <a
              href={`https://api.whatsapp.com/send?text=${whatsappShareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              <span>Share to WhatsApp Status & Chat</span>
            </a>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(storeUrl);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copiedLink ? 'Store Link Copied!' : 'Copy Store Profile Link'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareableProofCard;
