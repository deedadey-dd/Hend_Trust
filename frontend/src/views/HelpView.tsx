import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Search, ChevronDown, ChevronUp, Lock, Truck, 
  Clock, ShieldAlert, PhoneCall, HelpCircle, ArrowRight, Code
} from 'lucide-react';

import SEOHead from '../components/SEOHead';

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
    answer: 'When you purchase through a HendAxis Trust Payment Link, your money is held safely in escrow. The seller is notified to dispatch your package, but your payment remains securely locked. Funds are only released to the seller after you receive your package and verify its condition during your inspection window.'
  },
  {
    id: 'faq-2',
    category: 'SELLERS',
    question: 'How do I get paid as a seller?',
    answer: 'Once the buyer confirms receipt of the package or the inspection window completes smoothly, your earnings are automatically released into your HendAxis Trust Wallet. You can withdraw your balance directly to your Mobile Money account at any time.'
  },
  {
    id: 'faq-3',
    category: 'SELLERS',
    question: 'What is the difference between "Absorb Fee" and "Pass Fee to Buyer"?',
    answer: 'When creating a payment link, choosing "Absorb Fee" deducts the platform fee from your item price so your customer pays only the listed item cost. Choosing "Pass Fee to Buyer" adds the transaction fee to checkout so you receive 100% of your listed item price.'
  },
  {
    id: 'faq-4',
    category: 'SELLERS',
    question: 'What is the Seller Dispatch Timeframe?',
    answer: 'Once a buyer completes payment into escrow, the seller must dispatch the item within the designated timeframe (typically 4 days). If a seller fails to dispatch on time, the transaction automatically cancels, the buyer receives a 100% full refund, and the seller account may incur a non-dispatch penalty.'
  },
  {
    id: 'faq-5',
    category: 'LOGISTICS',
    question: 'What is the difference between Courier Delivery and Station / Bus Delivery?',
    answer: 'Courier Delivery (DHL, Speedaf, FedEx, UPS, EMS) includes direct package tracking links and live delivery updates. Station / Bus Delivery logs driver details, and the buyer receives a secret 6-digit OTP to present at the station upon pickup.'
  },
  {
    id: 'faq-6',
    category: 'BUYERS',
    question: 'How long is my inspection period?',
    answer: 'Inspection timeframes give you time to inspect your item before funds release. The timer starts automatically once delivery is verified: 24 hours for orders under GHS 2,000; 48 hours for orders GHS 2,000 to GHS 9,999; and 72 hours for orders GHS 10,000 and above.'
  },
  {
    id: 'faq-7',
    category: 'DISPUTES',
    question: 'What happens if I receive a damaged or wrong item?',
    answer: 'If your package arrives damaged or differs from what you ordered, click "Raise Dispute" on your tracking page before your inspection window expires. Upload photos of the item and a description of the issue. Our support team reviews all evidence and resolves disputes within 24 hours.'
  },
  {
    id: 'faq-8',
    category: 'DISPUTES',
    question: 'How do Buyer Item Returns work during a dispute?',
    answer: 'If a dispute ruling requires returning the item, the buyer ships the product back via Courier or Bus transport. For bus returns, a secret 6-digit Reverse OTP is provided for the seller to verify receipt of the returned item before the full refund is processed.'
  },
  {
    id: 'faq-9',
    category: 'SELLERS',
    question: 'How do I get the "Verified Seller 🛡️" badge?',
    answer: 'Sellers can apply for the Verified Seller 🛡️ badge by submitting their Ghana Card / National ID and business registration documents under Profile Settings. Our verification team reviews submissions to issue official verification badges.'
  },
  {
    id: 'faq-10',
    category: 'SELLERS',
    question: 'How do Paid Shop Promotions work in the Marketplace Directory?',
    answer: 'Sellers can feature their store at the top of the Marketplace Directory (/shops) with a "Featured Ad ⚡" badge by choosing a promotion package (GHS 50 for 7 Days / GHS 150 for 30 Days) directly in their Store Settings.'
  },
  {
    id: 'faq-11',
    category: 'DEVELOPERS',
    question: 'How do I integrate HendAxis Escrow into my website or online store?',
    answer: 'Merchants and developers can integrate HendAxis Escrow directly into their custom websites or store checkout using our REST APIs or Drop-in JavaScript SDK. Code examples and documentation are available on our /developers portal.'
  },
  {
    id: 'faq-12',
    category: 'SELLERS',
    question: 'How does Seller Dispute Health Monitoring & Account Suspension work?',
    answer: 'HendAxis Trust monitors dispute percentages across recent orders (minimum 5 paid transactions). If a seller reaches a 20% dispute rate, a yellow alert banner appears. At 30%, an orange warning banner and email alert are issued. If disputes reach 40% or higher, the seller account is automatically suspended, active payment links are disabled, and link creation is blocked until manual review by platform administration.'
  },
  {
    id: 'faq-13',
    category: 'BUYERS',
    question: 'When can I rate a seller, and can I edit my review later?',
    answer: 'To ensure honest feedback, rating a seller is locked while your package is in transit and unlocks automatically once your item is delivered and inspection begins. Each transaction is limited to 1 review. If you wish to edit your review on another device, click "Request Edit Link" to receive a free magic link via email.'
  },
  {
    id: 'faq-14',
    category: 'SELLERS',
    question: 'What happens to unpaid checkout entries on my dashboard?',
    answer: 'Unpaid transactions that remain abandoned auto-archive after the platform\'s configured duration (default: 3 days). Sellers can click the "Check Payment" button next to any unpaid transaction to manually verify if the buyer\'s payment completed before archiving occurs.'
  },
  {
    id: 'faq-15',
    category: 'LOGISTICS',
    question: 'Why is there a 60-second countdown when requesting a Delivery Confirmation Code?',
    answer: 'To protect users from SMS spam and reduce transaction costs, a 60-second cooldown is enforced between confirmation SMS requests. The initial OTP sent remains valid and active during the cooldown period so you can confirm receipt without waiting for duplicate messages.'
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

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': FAQS.map(f => ({
      '@type': 'Question',
      'name': f.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': f.answer
      }
    }))
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16 transition-colors">
      <SEOHead
        title="Platform Guide & FAQ Knowledge Base — HendAxis Trust"
        description="Frequently asked questions about buyer protection, escrow payments, Mobile Money payouts, seller verification, and dispute resolution."
        canonicalUrl="https://trust.hendaxis.com/help"
        jsonLd={faqJsonLd}
      />
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
