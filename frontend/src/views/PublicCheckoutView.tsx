import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Truck, ArrowRight, Loader2 } from 'lucide-react';

interface LinkData {
  id: string;
  title: string;
  description: string;
  price_ghs: string;
  shipping_fee_ghs: string;
  fee_handling: string;
}

export default function PublicCheckoutView() {
  const { linkId } = useParams();
  const [link, setLink] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/v1/links/${linkId}`);
        setLink(res.data);
      } catch (err) {
        setError('Payment link is invalid or inactive.');
      } finally {
        setLoading(false);
      }
    };
    if (linkId) fetchLink();
  }, [linkId]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await axios.post('http://localhost:8000/api/v1/checkout/send-otp', { phone_number: phone });
      setShowOtpModal(true);
    } catch (err) {
      alert('Failed to send OTP. Try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await axios.post('http://localhost:8000/api/v1/checkout/verify-and-initialize', {
        link_id: linkId,
        phone_number: phone,
        otp_code: otp,
        email,
        shipping_address: address
      });
      // Redirect to Paystack
      window.location.href = res.data.authorization_url;
    } catch (err) {
      alert('Invalid OTP or verification failed.');
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600 h-8 w-8" /></div>;
  if (error || !link) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 font-medium">{error}</div>;

  const grossTotal = parseFloat(link.price_ghs) + parseFloat(link.shipping_fee_ghs);
  const platformFee = (grossTotal * 0.015) + 10;
  const totalToPay = link.fee_handling === 'PASS_TO_BUYER' ? grossTotal + platformFee : grossTotal;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
          <h1 className="text-2xl font-bold mb-1">{link.title}</h1>
          {link.description && <p className="text-blue-100 text-sm mb-4 opacity-90">{link.description}</p>}
          <div className="text-4xl font-black mt-4">
            <span className="text-blue-200 text-xl mr-1">GHS</span>
            {totalToPay.toFixed(2)}
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-6 bg-gray-50/50 border-b border-gray-100 space-y-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Item Price</span>
            <span className="font-medium">GHS {parseFloat(link.price_ghs).toFixed(2)}</span>
          </div>
          {parseFloat(link.shipping_fee_ghs) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center"><Truck className="h-4 w-4 mr-1"/> Shipping</span>
              <span className="font-medium">GHS {parseFloat(link.shipping_fee_ghs).toFixed(2)}</span>
            </div>
          )}
          {link.fee_handling === 'PASS_TO_BUYER' && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center"><ShieldCheck className="h-4 w-4 mr-1 text-green-500"/> Escrow Protection</span>
              <span className="font-medium">GHS {platformFee.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50" placeholder="e.g., 0241234567" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50" placeholder="receipt@example.com" />
            </div>
            {parseFloat(link.shipping_fee_ghs) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
                <textarea required value={address} onChange={e => setAddress(e.target.value)} rows={2} className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50" placeholder="Street, City, Landmark"></textarea>
              </div>
            )}

            <button disabled={isProcessing} type="submit" className="mt-4 w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all">
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continue to Payment'} <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <p className="text-center text-xs text-gray-500 flex items-center justify-center mt-4">
              <ShieldCheck className="h-4 w-4 mr-1 text-gray-400" /> Secure Escrow Checkout
            </p>
          </form>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <ShieldCheck className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Verify your phone</h3>
              <p className="text-sm text-gray-500 mt-2">We sent a 6-digit code to {phone}</p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input required type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} className="w-full text-center tracking-widest text-2xl font-mono rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border bg-gray-50/50" placeholder="000000" />
              <button disabled={isProcessing} type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 transition-all">
                {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirm & Pay'}
              </button>
              <button type="button" onClick={() => setShowOtpModal(false)} className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
