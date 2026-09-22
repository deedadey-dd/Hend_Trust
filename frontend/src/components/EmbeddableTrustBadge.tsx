import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Code, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface EmbeddableTrustBadgeProps {
  username?: string;
}

export const EmbeddableTrustBadge: React.FC<EmbeddableTrustBadgeProps> = ({
  username = 'yourstore',
}) => {
  const [badgeTheme, setBadgeTheme] = useState<'DARK' | 'LIGHT' | 'GOLD'>('DARK');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const origin = window.location.origin;
  const storeUrl = `${origin}/store/${username}`;

  const htmlSnippet = `<a href="${storeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;background-color:${badgeTheme === 'LIGHT' ? '#f8fafc' : badgeTheme === 'GOLD' ? '#1e1b4b' : '#0f172a'};color:${badgeTheme === 'LIGHT' ? '#0f172a' : badgeTheme === 'GOLD' ? '#fbbf24' : '#38bdf8'};border:1px solid ${badgeTheme === 'GOLD' ? '#f59e0b' : '#334155'};border-radius:12px;font-family:sans-serif;font-size:12px;font-weight:bold;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
  <span>Verified Escrow Merchant • HendAxis Trust</span>
</a>`;

  const linktreeBioText = `🛡 Verified Escrow Store: ${storeUrl} (100% Buyer Protection by HendAxis Trust)`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            "Protected by HendAxis" Trust Badge Embed
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Embed this verified seal in your Instagram Bio (Linktree), WhatsApp catalog, or website to boost buyer checkout rates.
          </p>
        </div>

        {/* Theme Picker */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
          {(['DARK', 'LIGHT', 'GOLD'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setBadgeTheme(theme)}
              className={`px-3 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                badgeTheme === theme
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      {/* Live Badge Preview */}
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Live Badge Preview
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Customers who click this badge will be taken directly to your verified storefront:
          </p>
        </div>

        <a
          href={storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md transition transform hover:scale-105 ${
            badgeTheme === 'LIGHT'
              ? 'bg-slate-100 text-slate-900 border border-slate-300'
              : badgeTheme === 'GOLD'
              ? 'bg-slate-950 text-amber-400 border border-amber-500 shadow-amber-500/10'
              : 'bg-slate-900 text-sky-400 border border-slate-700'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Verified Merchant • HendAxis Escrow</span>
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>

      {/* Code Snippets for Copying */}
      <div className="space-y-4">
        {/* HTML / Website Embed */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5 text-blue-500" />
              1. HTML / Website Embed Code
            </span>
            <button
              type="button"
              onClick={() => handleCopy(htmlSnippet, 'HTML')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copiedCode === 'HTML' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode === 'HTML' ? 'Copied!' : 'Copy HTML'}</span>
            </button>
          </div>
          <pre className="p-3 bg-slate-900 text-slate-200 text-[11px] font-mono rounded-xl overflow-x-auto border border-slate-800">
            {htmlSnippet}
          </pre>
        </div>

        {/* Linktree / Instagram Bio Snippet */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#ff6d1d]" />
              2. Instagram Bio / Linktree Headline
            </span>
            <button
              type="button"
              onClick={() => handleCopy(linktreeBioText, 'BIO')}
              className="text-xs font-bold text-[#ff6d1d] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copiedCode === 'BIO' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode === 'BIO' ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono">
            {linktreeBioText}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbeddableTrustBadge;
