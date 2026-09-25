import React, { useState } from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead';
import { useEscapeKey } from '../utils/useEscapeKey';

interface GuideArticle {
  id: string;
  category: 'SCAM_PREVENTION' | 'SELLER_GUIDES' | 'ESCROW_EDUCATION' | 'LOGISTICS';
  title: string;
  summary: string;
  readTime: string;
  content: string[];
  keyTips: string[];
}

const ARTICLES: GuideArticle[] = [
  {
    id: 'avoid-instagram-scams-ghana',
    category: 'SCAM_PREVENTION',
    title: 'How to Spot & Avoid Instagram Shopping Scams in Ghana (2026 Guide)',
    readTime: '4 min read',
    summary: 'Recognize the 5 red flags of fraudulent Instagram and TikTok boutique pages before you send Mobile Money.',
    keyTips: [
      'Beware of accounts with disabled comments on all product posts.',
      'Check account username history under "About This Account" for frequent name changes.',
      'Never send full prepayment directly via MoMo to an unverified personal account without escrow protection.'
    ],
    content: [
      'Over 70% of Ghanaian online shoppers report having lost money or received inferior counterfeit goods from social media boutiques.',
      'Scammers often run sponsored Instagram and TikTok ads featuring stolen high-end luxury photos at suspiciously low prices (e.g., brand new iPhone 15 Pro Max for GHS 1,500). Once payment is received, the buyer is immediately blocked.',
      'To shop safely, always ask the seller if they support HendAxis Trust escrow checkout. A legitimate seller with real inventory will be eager to use escrow because it guarantees them a committed, paying customer.'
    ]
  },
  {
    id: 'what-is-escrow-ghana',
    category: 'ESCROW_EDUCATION',
    title: 'What is an Escrow Service? How to Protect Your Mobile Money in Ghana',
    readTime: '5 min read',
    summary: 'Everything you need to know about how third-party escrow smart-locks eliminate prepayment risk across MTN MoMo and Telecel Cash.',
    keyTips: [
      'Escrow acts as a neutral trusted intermediary that holds funds until agreed delivery conditions are met.',
      'Sellers cannot withdraw your funds until you confirm satisfaction using a secret 6-digit OTP code.',
      'If the goods are damaged or never arrive, your money is 100% refunded to your MoMo wallet.'
    ],
    content: [
      'In traditional commerce, either the buyer takes 100% of the risk (by paying upfront) or the seller takes 100% of the risk (by shipping on Cash-on-Delivery).',
      'An escrow platform solves this asymmetry by holding the money in a regulated, double-entry trust vault. The seller gets guaranteed proof of funds and dispatches the parcel with complete peace of mind.',
      'Once delivered, the buyer has a dedicated inspection window (24–48 hours) to verify the item. If satisfied, entering the OTP releases the payment directly to the seller.'
    ]
  },
  {
    id: 'merchant-protection-fake-transfers',
    category: 'SELLER_GUIDES',
    title: 'How Ghanaian Merchants Protect Themselves from Fake Transfer Receipts & CoD Losses',
    readTime: '4 min read',
    summary: 'How social media sellers can eliminate order cancellations, driver theft, and photoshop bank alert scams.',
    keyTips: [
      'Eliminate Cash-on-Delivery failure rates exceeding 30% by locking escrow funds before dispatch.',
      'Never rely on SMS or screenshot payment proofs sent by the customer—only dispatch after automated platform confirmation.',
      'Use integrated dispatch waybill tracking to defeat false non-delivery dispute claims.'
    ],
    content: [
      'Cash-on-Delivery is the number one profit killer for Ghanaian online merchants. Dispatch riders charge double fees when a buyer refuses delivery or switches off their phone.',
      'Furthermore, sophisticated scammers use fake bank alert apps that generate realistic SMS messages and transfer receipts to trick sellers into dispatching high-value items.',
      'With HendAxis Trust, sellers generate a single-use payment link. Funds are verified and locked before the merchant even contacts a courier, ensuring 100% payment certainty upon delivery.'
    ]
  },
  {
    id: 'intercity-bus-waybill-safety',
    category: 'LOGISTICS',
    title: 'Intercity Bus & Waybill Safety: Buying Goods from Kumasi, Tamale & Takoradi with Zero Fear',
    readTime: '3 min read',
    summary: 'The safe way to transact through VIP, STC, and OA parcel offices across Ghana without risk.',
    keyTips: [
      'Always have the seller log the bus station, driver phone number, and vehicle registration number in the escrow order.',
      'Ensure the seller uploads a clear photo of the bus parcel waybill receipt.',
      'Inspect the parcel at the destination terminal before confirming your OTP release code.'
    ],
    content: [
      'Intercity parcel bus services (VIP, STC, OA, VVIP) are the backbone of Ghanaian cross-regional commerce. However, buyers often worry: "What if the seller never goes to the bus station after I send MoMo?"',
      'HendAxis Trust incorporates a dedicated Informal Bus & Waybill dispatch flow. When the seller ships your order at the bus station, they log the driver’s phone number, vehicle plate, and a photo of the physical waybill.',
      'The buyer tracks the bus in real time, collects the parcel at the destination station, inspects the contents, and confirms the OTP to finalize the deal.'
    ]
  }
];

export const GuidesHubView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArticle, setActiveArticle] = useState<GuideArticle | null>(null);

  useEscapeKey(() => setActiveArticle(null), Boolean(activeArticle));

  const filteredArticles = ARTICLES.filter(art => {
    const matchesCategory = selectedCategory === 'ALL' || art.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      art.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-20 transition-colors">
      <SEOHead 
        title="Guides & Safe Trading Hub | HendAxis Trust"
        description="Step-by-step guides and best practices for safe online trading, buyer protection, and dispute resolution with escrow in Ghana."
        canonicalUrl="https://trust.hendaxis.com/guides"
      />

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-blue-600/10 via-slate-50 to-transparent dark:from-blue-950/30 dark:via-slate-950 dark:to-slate-950 pt-16 pb-12 px-6 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-extrabold uppercase tracking-wider">
            <BookOpen className="h-4 w-4" />
            Knowledge & Safety Center
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Scam Prevention & Safe Commerce Guides
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            Educational insights, scam prevention checklists, and best practices for safe online commerce in Ghana.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search guides, scam tactics, escrow tips..."
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <div className="max-w-5xl mx-auto px-6 mt-8 flex flex-wrap items-center justify-center gap-2">
        {[
          { id: 'ALL', label: 'All Guides' },
          { id: 'SCAM_PREVENTION', label: 'Scam Prevention' },
          { id: 'ESCROW_EDUCATION', label: 'Escrow 101' },
          { id: 'SELLER_GUIDES', label: 'Seller Protection' },
          { id: 'LOGISTICS', label: 'Bus & Waybills' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map(art => (
            <div 
              key={art.id}
              onClick={() => setActiveArticle(art)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm hover:border-blue-500/50 transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {art.category.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {art.readTime}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {art.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {art.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>Read Full Guide</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Article Detail Lightbox Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {activeArticle.category.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400">{activeArticle.readTime}</span>
              </div>
              <button
                onClick={() => setActiveArticle(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {activeArticle.title}
              </h2>

              {/* Key Takeaways Box */}
              <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 space-y-2">
                <span className="font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4" />
                  Key Takeaways
                </span>
                <ul className="space-y-1.5 text-xs text-blue-900 dark:text-blue-200">
                  {activeArticle.keyTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Content Paragraphs */}
              <div className="space-y-4 text-slate-700 dark:text-slate-300">
                {activeArticle.content.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {/* Article Footer CTA */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                    Ready to transact with 100% confidence?
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Create or request a HendAxis Trust escrow checkout link today.
                  </p>
                </div>
                <Link
                  to="/create-link"
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow shrink-0"
                >
                  Create Escrow Link
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuidesHubView;
