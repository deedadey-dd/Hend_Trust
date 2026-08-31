import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Download, Share2, QrCode, Check } from 'lucide-react';
import logoSymbol from '../assets/logo_symbol.webp';

interface QRCodeDisplayProps {
  url: string;
  title?: string;
  priceGhs?: number;
  size?: number;
}

export const generateBrandedQRPosterBlob = async (url: string, title?: string, priceGhs?: number): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Outer Card Background with Rounded Corners
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, 600, 760, 32);
  } else {
    ctx.rect(0, 0, 600, 760);
  }
  ctx.fill();

  // Header Banner Gradient
  const grad = ctx.createLinearGradient(0, 0, 600, 0);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, 600, 140, [32, 32, 0, 0]);
  } else {
    ctx.rect(0, 0, 600, 140);
  }
  ctx.fill();

  // Header Text & Branding
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('HENDAXIS TRUST', 40, 52);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('VERIFIED BUYER-SELLER ESCROW PAYMENTS', 40, 80);

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('● SECURE PAYSTACK & MOMO PAYOUTS', 40, 108);

  // Generate QR Code Image with High Error Correction ('H') for center logo tolerance
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    width: 380,
    margin: 1,
    color: {
      dark: '#020617',
      light: '#ffffff'
    }
  });

  const qrImg = new Image();
  qrImg.src = qrDataUrl;
  await new Promise(resolve => { qrImg.onload = resolve; });
  ctx.drawImage(qrImg, 110, 160, 380, 380);

  // Draw Center Logo Symbol Badge
  try {
    const logoImg = new Image();
    logoImg.src = logoSymbol;
    await new Promise((resolve, reject) => {
      logoImg.onload = resolve;
      logoImg.onerror = reject;
    });

    const qrCenterX = 110 + 190;
    const qrCenterY = 160 + 190;
    const badgeRadius = 38;
    const logoSize = 56;

    // White circle backdrop for crisp logo separation from QR modules
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(qrCenterX, qrCenterY, badgeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw HendAxis Symbol Logo
    ctx.drawImage(logoImg, qrCenterX - logoSize / 2, qrCenterY - logoSize / 2, logoSize, logoSize);
  } catch (err) {
    console.error('Failed to overlay logo in QR poster:', err);
  }

  // Product Title Text
  if (title) {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const displayTitle = title.length > 36 ? title.substring(0, 33) + '...' : title;
    ctx.fillText(displayTitle, 300, 580);
  }

  // Price Badge Box
  if (priceGhs !== undefined && priceGhs !== null) {
    ctx.fillStyle = '#eff6ff';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(160, 608, 280, 50, 14);
    } else {
      ctx.rect(160, 608, 280, 50);
    }
    ctx.fill();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 22px monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`GHS ${Number(priceGhs).toFixed(2)}`, 300, 642);
  }

  // Footer Instructions
  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Scan with Phone Camera or MoMo App to Pay Safely', 300, 715);

  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png');
  });
};

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  url,
  title,
  priceGhs,
  size = 180
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (url) {
      QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        width: size * 2,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(data => setQrDataUrl(data))
        .catch(err => console.error('Failed to generate QR Code data URL:', err));
    }
  }, [url, size]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await generateBrandedQRPosterBlob(url, title, priceGhs);
      if (!blob) return;
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const cleanTitle = (title || 'hendaxis-payment-qr').toLowerCase().replace(/[^a-z0-9]/g, '-');
      a.download = `${cleanTitle}-qr.png`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to download QR poster:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const blob = await generateBrandedQRPosterBlob(url, title, priceGhs);
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'payment-qr.png', { type: 'image/png' })] })) {
        const file = new File([blob], `${(title || 'payment').replace(/[^a-z0-9]/g, '-')}-qr.png`, { type: 'image/png' });
        await navigator.share({
          title: title ? `Payment QR Code for ${title}` : 'HendAxis Trust Escrow QR Code',
          text: `Pay for ${title || 'product'} securely via HendAxis Escrow`,
          files: [file]
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: title ? `Payment Link for ${title}` : 'HendAxis Trust Escrow Link',
          text: `Pay for ${title || 'product'} securely via HendAxis Escrow`,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.log('Error sharing QR Code:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl text-center shadow-inner">
      <div className="bg-white p-3 rounded-2xl shadow-md border border-gray-200 dark:border-slate-800 mb-3 inline-block relative">
        {qrDataUrl ? (
          <div className="relative inline-block">
            <img
              src={qrDataUrl}
              alt="Payment QR Code"
              style={{ width: `${size}px`, height: `${size}px` }}
              className="rounded-xl object-contain mx-auto block"
            />
            {/* Embedded Center Logo Symbol Badge */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className="bg-white rounded-full p-1 shadow-md border border-slate-200 flex items-center justify-center overflow-hidden" 
                style={{ width: `${Math.round(size * 0.24)}px`, height: `${Math.round(size * 0.24)}px` }}
              >
                <img src={logoSymbol} alt="HendAxis Symbol" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{ width: `${size}px`, height: `${size}px` }}
            className="flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-slate-800 rounded-xl"
          >
            <QrCode className="h-8 w-8 animate-pulse" />
          </div>
        )}
      </div>

      <div className="mb-3 space-y-0.5">
        <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1.5">
          <QrCode className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          Scan QR Code to Pay
        </p>
        <p className="text-[11px] text-gray-500 dark:text-slate-400">
          Works with MoMo & camera apps
        </p>
      </div>

      <div className="flex items-center gap-2 w-full max-w-xs">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || !qrDataUrl}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          title="Download QR poster card image"
        >
          <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          {isDownloading ? 'Saving...' : 'Download QR'}
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={!qrDataUrl}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          title="Share QR Code or payment link"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Share QR'}
        </button>
      </div>
    </div>
  );
};

