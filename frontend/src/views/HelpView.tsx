import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Search, ChevronDown, ChevronUp, Lock, Truck, 
  Clock, ShieldAlert, PhoneCall, HelpCircle, ArrowRight, Code
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'BUYERS' | 'SELLERS' | 'LOGISTICS' | 'DISPUTES' | 'DEVELOPERS';
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'BUYERS',
    question: 'How does HendAxis Trust protect my money?',
    answer: 'When you purchase through a HendAxis Trust Payment Link, your payment goes directly into a double-entry escrow account. The seller is notified to dispatch your package, but your funds remain locked in escrow. Money is only released to the seller after you receive the item and approve it during your inspection period.'
  },
  {
    id: 'faq-2',
    category: 'SELLERS',
    question: 'How do I get paid as a seller?',
    answer: 'Once your buyer confirms receipt or the inspection timer expires, your funds release instantly into your HendAxis Trust Wallet balance. Depending on your account payout mode, funds can be automatically transferred to your MoMo or Bank account instantly.'
  },
  {
    id: 'faq-3',
    category: 'DEVELOPERS',
    question: 'How do I integrate HendAxis Escrow into my website or e-commerce store?',
    answer: 'You can integrate HendAxis Escrow using our REST APIs (`/api/v1/v1/escrow/create`) or our Drop-in JavaScript SDK (`sdk.js`). Visit our Developer Documentation portal at /developers for copy-and-paste code examples in cURL, Node.js, Python, and PHP/WooCommerce.'
  },
  {
    id: 'faq-4',
    category: 'SELLERS',
    question: 'What is the 4-Day Seller Dispatch Rule?',
    answer: 'Once a buyer completes payment into escrow, you have exactly 4 days (96 hours) to dispatch the package. If you fail to dispatch within 4 days, the order is automatically cancelled, the buyer is refunded 100%, and your seller account is charged a non-dispatch penalty.'
  },
  {
    id: 'faq-5',
    category: 'DEVELOPERS',
    question: 'Where do I find my API Keys and Webhook Signing Secrets?',
    answer: 'Log in to your Seller Dashboard and navigate to the Developer Settings tab (`/dashboard/developer`). You can generate Live (`pk_live_...`) and Test (`pk_test_...`) API Key pairs, configure your server Webhook URL, and test event dispatches.'
  },
  {
    id: 'faq-6',
    category: 'LOGISTICS',
    question: 'What is the difference between Path A (Courier) and Path B (Bus OTP)?',
    answer: 'Path A is for formal shipping providers (DHL, Speedaf, FedEx, UPS, EMS) where tracking numbers are verified via webhooks. Path B is for informal station/bus deliveries, where driver details are logged and the buyer receives a Secret 6-Digit OTP to present at the station upon pickup.'
  },
  {
    id: 'faq-7',
    category: 'BUYERS',
    question: 'How long is my inspection period?',
    answer: 'Inspection periods are tiered based on transaction value: Under GHS 2,000 = 24 Hours; GHS 2,000 to GHS 9,999 = 48 Hours; GHS 10,000+ = 72 Hours. The inspection timer starts automatically once delivery is verified.'
  },
  {
    id: 'faq-8',
    category: 'DISPUTES',
    question: 'What happens if I receive a damaged or wrong item?',
    answer: 'Click "Raise Dispute" on your order page during your inspection period. Upload up to 5 photo evidence images and a statement. The seller can submit a counter-statement. Management arbitrates and executes refunds/payouts within 24 hours.'
  },
  {
    id: 'faq-9',
    category: 'SELLERS',
    question: 'How do I get the "Verified Seller 🛡️" badge?',
    answer: 'Upload your Ghana Card / National ID and Business Registration documents on your Profile page. Management manually inspects and verifies your identity documents in the Manager Portal before issuing the Verified badge.'
  }
];

export const HelpView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  const filteredFaqs = FAQS.filter(f => {
    const matchesCategory = activeCategory === 'ALL' || f.category === activeCategory;
    const matchesSearch = f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16 transition-colors">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-blue-400">
            <HelpCircle className="h-4 w-4" />
            Official Platform Guide & Knowledge Base
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">How Can We Help You Today?</h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto font-medium">
            Everything you need to know about secure escrow payments, seller verification, shipping logistics, and buyer protection.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto pt-2">
            <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help topics (e.g. 'refunds', 'verification', 'inspection')..."
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 space-y-10">

        {/* Quick Nav Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { title: 'Escrow Protection', icon: Lock, color: 'text-blue-600 dark:text-blue-400', desc: '100% fraud protection' },
            { title: 'Verified Sellers', icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', desc: 'Ghana Card ID check' },
            { title: 'Dual Shipping', icon: Truck, color: 'text-purple-600 dark:text-purple-400', desc: 'Couriers & Bus OTP' },
            { title: '24h Arbitration', icon: Clock, color: 'text-amber-600 dark:text-amber-400', desc: 'Fast dispute rulings' },
            { title: 'Developer APIs', icon: Code, color: 'text-teal-600 dark:text-teal-400', desc: 'REST API & JS SDK' }
          ].map((c, idx) => {
            const IconComp = c.icon;
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center space-y-1.5 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto">
                  <IconComp className={`h-5 w-5 ${c.color}`} />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{c.title}</h4>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-medium">{c.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 justify-center border-b border-slate-200 dark:border-slate-800 pb-4">
          {[
            { id: 'ALL', label: 'All Topics' },
            { id: 'BUYERS', label: 'For Buyers' },
            { id: 'SELLERS', label: 'For Sellers' },
            { id: 'LOGISTICS', label: 'Logistics & Shipping' },
            { id: 'DISPUTES', label: 'Disputes & Refunds' },
            { id: 'DEVELOPERS', label: 'Developer APIs' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition border ${
                activeCategory === cat.id
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-slate-600 dark:text-slate-400 space-y-2">
              <ShieldAlert className="h-8 w-8 text-amber-500 dark:text-amber-400 mx-auto" />
              <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">No topics match your search query.</p>
              <p className="text-xs sm:text-sm">Try searching for alternative terms or browse all topics.</p>
            </div>
          ) : (
            filteredFaqs.map(faq => {
              const isOpen = openFaqId === faq.id;
              return (
                <div key={faq.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition shadow-sm hover:shadow-md">
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 font-mono text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                        {faq.category}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{faq.question}</span>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3 font-normal">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Still Have Questions Banner */}
        <div className="bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 border border-blue-500/30 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl text-white">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-400" />
              Still Need Assistance?
            </h3>
            <p className="text-sm text-slate-300 mt-1">Our Ghana support team is ready to assist you 24/7 with any transaction queries.</p>
          </div>
          <Link
            to="/contact"
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-xl transition shadow-lg shrink-0 flex items-center gap-1.5"
          >
            Contact Support <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
