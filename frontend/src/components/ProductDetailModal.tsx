import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, ShieldCheck, Star, Truck, MessageCircle, Phone, 
  ExternalLink, Store, ShoppingBag, ZoomIn, 
  Package 
} from 'lucide-react';
import { useEscapeKey } from '../utils/useEscapeKey';
import { ImageLightboxModal } from './ImageLightboxModal';

export interface ProductModalData {
  link_id: string;
  title: string;
  price_ghs: number;
  image_url?: string;
  description?: string;
  category?: string;
  seller_username?: string;
  seller_shop_name?: string;
  seller_phone?: string;
  seller_avg_rating?: number;
  seller_review_count?: number;
  badge_verified_seller?: boolean;
  badge_title?: string;
  whatsapp_contact_url?: string;
}

interface ProductDetailModalProps {
  product: ProductModalData | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  useEscapeKey(onClose, Boolean(product) && !isLightboxOpen);

  if (!product) return null;

  const formattedPrice = Number(product.price_ghs || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sellerName = product.seller_shop_name || product.seller_username || 'Seller';

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div 
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto space-y-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-modal-title"
        >
          {/* Header: Seller Info & Close Button */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              {product.seller_username ? (
                <Link
                  to={`/store/${product.seller_username}`}
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm hover:opacity-90 transition"
                  title={`Visit ${sellerName}'s store`}
                >
                  {sellerName.charAt(0).toUpperCase()}
                </Link>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {product.seller_username ? (
                    <Link
                      to={`/store/${product.seller_username}`}
                      onClick={onClose}
                      className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm hover:text-blue-600 dark:hover:text-blue-400 transition truncate"
                    >
                      {sellerName}
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                      {sellerName}
                    </span>
                  )}
                  {product.badge_verified_seller && (
                    <span 
                      className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/40"
                      title="Verified Escrow Merchant"
                    >
                      <ShieldCheck className="w-3 h-3 text-blue-500" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {product.seller_avg_rating !== undefined && product.seller_avg_rating > 0 && (
                    <span className="flex items-center gap-0.5 font-bold text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      {product.seller_avg_rating.toFixed(1)}
                      {Boolean(product.seller_review_count) && (
                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                          ({product.seller_review_count})
                        </span>
                      )}
                    </span>
                  )}
                  {product.seller_username && (
                    <span className="truncate">@{product.seller_username}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Large Image Showcase */}
          <div className="relative w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-200/80 dark:border-slate-800 flex items-center justify-center group">
            {product.image_url ? (
              <>
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="max-h-64 sm:max-h-72 w-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                  onClick={() => setIsLightboxOpen(true)}
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/75 hover:bg-slate-950/90 text-white backdrop-blur-md border border-white/20 text-[11px] font-semibold transition cursor-pointer shadow-md"
                  title="Click to view full image"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
                  <span>Enlarge</span>
                </button>
              </>
            ) : (
              <div className="w-full py-12 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 text-slate-400 p-4 text-center">
                <ShoppingBag className="w-12 h-12 text-slate-500 mb-2 stroke-[1.5]" />
                <span className="text-xs font-semibold text-slate-300">
                  HendAxis Escrow Protected Product
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  No product photo uploaded by seller
                </span>
              </div>
            )}
          </div>

          {/* Title, Category & Price */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {product.category && (
                  <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60 text-[10px] font-bold uppercase tracking-wider mb-1">
                    {product.category}
                  </span>
                )}
                <h3 
                  id="product-detail-modal-title"
                  className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg leading-snug"
                >
                  {product.title}
                </h3>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  GH₵ {formattedPrice}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Item Price
                </div>
              </div>
            </div>

            {/* Escrow Protection Guarantee Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-[11px] leading-tight">
                <strong>HendAxis Escrow Protection:</strong> Funds held securely until you inspect & approve delivery.
              </span>
            </div>
          </div>

          {/* Description Section */}
          {product.description && (
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Product Description
              </h4>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* Shipping & Delivery Notice Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-xs">
              <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Shipping & Delivery Information</span>
            </div>
            <p className="leading-relaxed text-[11px] text-amber-900/90 dark:text-amber-200/90">
              Shipping cost in Ghana depends on your destination city/town and preferred method (e.g. Courier or Station Bus OTP).
            </p>
            <p className="leading-relaxed text-[11px] font-medium text-amber-900 dark:text-amber-100">
              Contact the seller via WhatsApp or phone to confirm shipping fees before checking out if you are outside their local pickup zone.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Direct Checkout CTA */}
            <Link
              to={`/l/${product.link_id}`}
              onClick={onClose}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 text-center cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Proceed to Escrow Checkout (GH₵ {formattedPrice})</span>
            </Link>

            {/* Seller Contact Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {product.whatsapp_contact_url ? (
                <a
                  href={product.whatsapp_contact_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2 text-center cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Chat on WhatsApp</span>
                </a>
              ) : null}

              {product.seller_phone ? (
                <a
                  href={`tel:${product.seller_phone}`}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 text-center cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">Call Seller</span>
                </a>
              ) : null}
            </div>

            {/* Visit Store Link */}
            {product.seller_username && (
              <div className="pt-1 text-center">
                <Link
                  to={`/store/${product.seller_username}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Visit {sellerName}'s full store catalog →</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox for full screen image viewing */}
      {product.image_url && (
        <ImageLightboxModal
          isOpen={isLightboxOpen}
          imageUrl={product.image_url}
          alt={product.title}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </>
  );
};

export default ProductDetailModal;
