import { useState } from 'react';
import { ArrowRight, Link as LinkIcon, DollarSign, Truck } from 'lucide-react';
import axios from 'axios';

export default function CreatePaymentLinkView() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [feeHandling, setFeeHandling] = useState('PASS_TO_BUYER');
  const [createdUrl, setCreatedUrl] = useState('');

  const grossTotal = parseFloat(price || '0') + parseFloat(shipping || '0');
  const platformFee = (grossTotal * 0.015) + 10;
  
  const buyerPays = feeHandling === 'PASS_TO_BUYER' ? grossTotal + platformFee : grossTotal;
  const sellerReceives = feeHandling === 'PASS_TO_BUYER' ? grossTotal : grossTotal - platformFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real app, we would attach an auth token
      const res = await axios.post('http://localhost:8000/api/v1/links/create', {
        title,
        description,
        price_ghs: parseFloat(price),
        shipping_fee_ghs: parseFloat(shipping),
        fee_handling: feeHandling
      });
      setCreatedUrl(res.data.url);
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Title</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border" placeholder="e.g., iPhone 13 Pro Max" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border"></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (GHS)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shipping (GHS)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Truck className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="number" step="0.01" value={shipping} onChange={e => setShipping(e.target.value)} className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3 border" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fee Handling</label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setFeeHandling('PASS_TO_BUYER')}
                    className={`cursor-pointer rounded-lg border p-4 text-center transition-all ${feeHandling === 'PASS_TO_BUYER' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <p className="font-semibold text-gray-900">Pass to Buyer</p>
                    <p className="text-xs text-gray-500 mt-1">Buyer pays the escrow fee</p>
                  </div>
                  <div 
                    onClick={() => setFeeHandling('ABSORB_FEE')}
                    className={`cursor-pointer rounded-lg border p-4 text-center transition-all ${feeHandling === 'ABSORB_FEE' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <p className="font-semibold text-gray-900">Absorb Fee</p>
                    <p className="text-xs text-gray-500 mt-1">Deducted from your payout</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Calculator */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Transaction Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Product & Shipping</span>
                  <span>GHS {grossTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Platform Escrow Fee (1.5% + GHS 10)</span>
                  <span>GHS {platformFee.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between font-medium text-gray-900">
                  <span>Buyer Will Pay</span>
                  <span>GHS {buyerPays.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-600 text-lg">
                  <span>You Will Receive</span>
                  <span>GHS {sellerReceives.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
              Generate Payment Link <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </form>

          {createdUrl && (
            <div className="p-6 bg-green-50 border-t border-green-100 text-center">
              <p className="text-sm text-green-800 font-medium mb-2">Link created successfully!</p>
              <div className="flex items-center justify-center space-x-2">
                <LinkIcon className="h-5 w-5 text-green-600" />
                <a href={createdUrl.replace('https://pay.hendaxis.com', 'http://localhost:5173')} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline">
                  {createdUrl.replace('https://pay.hendaxis.com', 'http://localhost:5173')}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
