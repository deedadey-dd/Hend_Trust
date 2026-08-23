import { useState, useEffect } from 'react';
import { ArrowRight, Link as LinkIcon, Truck, Copy, Check, Share2, X, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';

export default function CreatePaymentLinkView() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [feeHandling, setFeeHandling] = useState('PASS_TO_BUYER');
  const [createdUrl, setCreatedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Past products autosuggestion & quick fill
  const [pastLinks, setPastLinks] = useState<any[]>([]);
  const [selectedPastId, setSelectedPastId] = useState('');
  const [autofillNotice, setAutofillNotice] = useState('');

  useEffect(() => {
    apiClient.get('/links/?limit=50')
      .then(res => {
        const items = res.data?.items || [];
        const uniqueMap = new Map();
        items.forEach((item: any) => {
          if (item.title && !uniqueMap.has(item.title.toLowerCase())) {
            uniqueMap.set(item.title.toLowerCase(), item);
          }
        });
        setPastLinks(Array.from(uniqueMap.values()));
      })
      .catch(err => console.error('Failed to load past links for autosuggestion:', err));
  }, []);

  const handleAutofill = (linkItem: any) => {
    if (!linkItem) return;
    setTitle(linkItem.title || '');
    setDescription(linkItem.description || '');
    setPrice(linkItem.price_ghs ? String(linkItem.price_ghs) : '0');
    setShipping(linkItem.shipping_fee_ghs ? String(linkItem.shipping_fee_ghs) : '0');
    setFeeHandling(linkItem.fee_handling || 'PASS_TO_BUYER');
    setAutofillNotice(`⚡ Autofilled details from previous product: "${linkItem.title}"`);
    setTimeout(() => setAutofillNotice(''), 4000);
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Payment Link for ${title}`,
          text: `Pay for ${title} securely via HendAxis Trust Escrow`,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      alert("Web Share API not supported in your browser. Please copy the link instead.");
    }
  };

  const grossTotal = parseFloat(price || '0') + parseFloat(shipping || '0');
  const platformFee = (grossTotal * 0.015) + 10;
  
  const buyerPays = feeHandling === 'PASS_TO_BUYER' ? grossTotal + platformFee : grossTotal;
  const sellerReceives = feeHandling === 'PASS_TO_BUYER' ? grossTotal : grossTotal - platformFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/links/create', {
        title,
        description,
        price_ghs: parseFloat(price),
        shipping_fee_ghs: parseFloat(shipping),
        fee_handling: feeHandling
      });
      const url = response.data.url.replace('https://pay.hendaxis.com', window.location.origin);
      setCreatedUrl(url);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      alert('Failed to create link');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Payment Link</h2>
          <p className="mt-2 text-sm text-gray-500">Generate a single-use escrow link for your buyer.</p>
        </div>

        {/* Quick Autofill Selector from Past Products */}
        {pastLinks.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Quick Autofill from Previous Products
              </label>
              <span className="text-[11px] text-blue-700 font-medium">{pastLinks.length} products saved</span>
            </div>
            <select
              value={selectedPastId}
              onChange={e => {
                setSelectedPastId(e.target.value);
                const found = pastLinks.find(p => p.id === e.target.value);
                if (found) handleAutofill(found);
              }}
              className="w-full text-xs border border-blue-200 rounded-xl p-2.5 bg-white font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
              <option value="">-- Select a previous product to autofill details --</option>
              {pastLinks.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} — GHS {Number(p.price_ghs).toFixed(2)} (Shipping: GHS {Number(p.shipping_fee_ghs || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        )}

        {autofillNotice && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-xl text-xs font-bold flex items-center justify-between">
            <span>{autofillNotice}</span>
            <button onClick={() => setAutofillNotice('')} className="text-emerald-600 hover:text-emerald-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Title</label>
                <input
                  required
                  type="text"
                  list="past-products-datalist"
                  value={title}
                  onChange={e => {
                    const newTitle = e.target.value;
                    setTitle(newTitle);
                    const matchingPast = pastLinks.find(p => p.title.toLowerCase() === newTitle.toLowerCase());
                    if (matchingPast) {
                      handleAutofill(matchingPast);
                    }
                  }}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border"
                  placeholder="e.g., iPhone 13 Pro Max"
                />
                <datalist id="past-products-datalist">
                  {pastLinks.map(p => (
                    <option key={p.id} value={p.title}>{`GHS ${Number(p.price_ghs).toFixed(2)} — ${p.description || ''}`}</option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border"></textarea>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (GHS) *</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-bold text-xs">GHS</span>
                    </div>
                    <input type="number" step="0.01" min="0" required value={price} onChange={e => setPrice(e.target.value)} className="pl-12 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Shipping (GHS)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Truck className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="number" step="0.01" min="0" value={shipping} onChange={e => setShipping(e.target.value)} className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border font-mono" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Escrow Fee (GHS)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 font-mono text-xs">1.5%+10</span>
                    </div>
                    <input type="text" readOnly value={`GHS ${platformFee.toFixed(2)}`} className="pl-16 block w-full rounded-lg border-gray-200 bg-gray-100 text-gray-600 sm:text-sm p-3 border font-mono font-bold cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* Compact Fee Handling Toggle Checkbox */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={feeHandling === 'PASS_TO_BUYER'}
                    onChange={e => setFeeHandling(e.target.checked ? 'PASS_TO_BUYER' : 'ABSORB_FEE')}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">Pass Platform Fee (GHS {platformFee.toFixed(2)}) to Buyer</span>
                    <span className="text-xs text-gray-500">
                      {feeHandling === 'PASS_TO_BUYER' 
                        ? 'Buyer pays item price + shipping + escrow fee. You receive 100% of price + shipping.' 
                        : 'You absorb the escrow fee. Fee will be deducted from your final payout.'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Dynamic Calculator Summary */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 text-sm space-y-2 font-mono">
              <div className="flex justify-between text-gray-600">
                <span>Buyer Total Payment:</span>
                <span className="font-bold text-gray-900">GHS {buyerPays.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-700 font-bold border-t border-gray-200 pt-2 text-base">
                <span>Net Seller Payout:</span>
                <span>GHS {sellerReceives.toFixed(2)}</span>
              </div>
            </div>

            <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Generate Payment Link <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </form>

          {/* Inline Success Area */}
          {createdUrl && (
            <div className="p-6 bg-green-50 border-t border-green-100">
              <p className="text-sm text-green-800 font-medium mb-3 text-center">Link created successfully! Share it with your buyer.</p>
              <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 p-3">
                <LinkIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                <a
                  href={createdUrl}
                  target="_blank" rel="noreferrer"
                  className="text-blue-600 text-sm font-medium hover:underline flex-1 truncate">
                  {createdUrl}
                </a>
                <button
                  onClick={() => handleCopy(createdUrl)}
                  className="flex-shrink-0 p-1.5 rounded-md hover:bg-green-100 transition-colors"
                  title="Copy link">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
                </button>
                <button
                  onClick={() => handleShare(createdUrl)}
                  className="flex-shrink-0 p-1.5 rounded-md hover:bg-green-100 transition-colors"
                  title="Share link">
                  <Share2 className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal Pop-up */}
      {showModal && createdUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="relative p-6 text-center">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Link Ready!</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Your secure escrow link has been generated. Share it with your buyer to get paid.
              </p>

              <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-3 mb-6">
                <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input 
                  type="text" 
                  readOnly 
                  value={createdUrl} 
                  className="bg-transparent border-none focus:ring-0 text-sm text-gray-600 flex-1 min-w-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCopy(createdUrl)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => handleShare(createdUrl)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                >
                  <Share2 className="h-4 w-4" />
                  Share Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
