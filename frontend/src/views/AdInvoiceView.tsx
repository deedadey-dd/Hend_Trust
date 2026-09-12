import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Printer, ArrowLeft, CheckCircle2, Building2, Mail, Phone, FileText } from 'lucide-react';
import { apiClient } from '../api/client';
import SEOHead from '../components/SEOHead';

interface AdInvoiceData {
  id: string;
  invoice_number: string;
  seller_name: string;
  seller_username: string;
  seller_email: string;
  seller_phone: string;
  duration_days: number;
  amount_ghs: number;
  payment_method: string;
  reference_code: string;
  advertised_from: string;
  advertised_until: string;
  created_at: string;
}

export const AdInvoiceView: React.FC = () => {
  const { invoice_id } = useParams<{ invoice_id: string }>();
  const [invoice, setInvoice] = useState<AdInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!invoice_id) return;
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/reviews/shop/ad-invoice/${invoice_id}`);
        setInvoice(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invoice not found or invalid invoice reference.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoice_id]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <FileText className="h-12 w-12 text-red-400 mx-auto" />
          <h3 className="text-xl font-bold text-white">Invoice Not Found</h3>
          <p className="text-sm text-slate-400">{error || "The requested advertisement invoice receipt does not exist."}</p>
          <Link to="/shops" className="inline-block py-2.5 px-6 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition">
            Return to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-10 px-4 sm:px-6">
      <SEOHead 
        title={`Invoice ${invoice.invoice_number} | HendAxis Trust`} 
        description="Official payment receipt and downloadable tax invoice for HendAxis Trust store advertisement."
      />

      {/* Top Action Bar (Hidden during printing) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link to="/shops" className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
          <ArrowLeft className="h-4 w-4" /> Back to Directory
        </Link>
        <button
          onClick={handlePrint}
          className="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm rounded-xl hover:from-amber-600 hover:to-orange-700 transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Print / Download PDF Invoice
        </button>
      </div>

      {/* Printable Invoice Container */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl print:shadow-none print:border-none print:rounded-none print:p-0">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-gray-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-amber-500" />
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">HendAxis Trust</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Financial Escrow & Merchant Directory Services</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Paid & Verified Receipt
            </span>
            <h2 className="text-lg font-mono font-bold text-slate-900 dark:text-white">{invoice.invoice_number}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(invoice.created_at)}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Billed To Merchant</span>
            <div className="space-y-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-amber-500" /> {invoice.seller_name} (@{invoice.seller_username})
              </p>
              {invoice.seller_email && (
                <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {invoice.seller_email}
                </p>
              )}
              {invoice.seller_phone && (
                <p className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {invoice.seller_phone}
                </p>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Payment Details</span>
            <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              <p className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Method:</span>
                <span className="font-bold">{invoice.payment_method === 'WALLET' ? 'Wallet Balance Deduction' : 'Paystack Mobile Money / Card'}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Reference:</span>
                <span className="font-mono font-semibold">{invoice.reference_code}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Promotion Window:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatShortDate(invoice.advertised_from)} – {formatShortDate(invoice.advertised_until)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="my-8 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 text-xs uppercase font-bold text-slate-400">
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-2 text-center">Duration</th>
                <th className="py-3 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              <tr>
                <td className="py-4 px-2">
                  <span className="font-bold text-slate-900 dark:text-white block">Marketplace Directory Store Promotion</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Featured Ad placement at the top row of the /shops directory</span>
                </td>
                <td className="py-4 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                  {invoice.duration_days} Days
                </td>
                <td className="py-4 px-2 text-right font-black text-slate-900 dark:text-white">
                  GHS {invoice.amount_ghs.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total Summary */}
        <div className="border-t-2 border-gray-200 dark:border-slate-700 pt-4 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>Ad fees are credited to platform revenue and non-refundable.</p>
            <p>Questions? Contact support@hendaxistrust.com</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 text-right w-full sm:w-auto">
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block">Total Paid</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">GHS {invoice.amount_ghs.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer Stamp */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-600 dark:text-slate-400">HendAxis Trust Financial Escrow Infrastructure</p>
          <p>This document serves as an official electronic receipt and tax invoice for paid digital store placement.</p>
        </div>

      </div>
    </div>
  );
};

export default AdInvoiceView;
