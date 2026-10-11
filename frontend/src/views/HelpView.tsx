import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Search, ChevronDown, ChevronUp, Lock, Truck, 
  Clock, ShieldAlert, PhoneCall, HelpCircle, ArrowRight, Code,
  Gift, Sparkles, Zap
} from 'lucide-react';
import { apiClient } from '../api/client';
import SEOHead from '../components/SEOHead';

interface FAQItem {
  id: string;
  category: 'BUYERS' | 'SELLERS' | 'LOGISTICS' | 'DISPUTES' | 'REFERRALS' | 'DEVELOPERS';
  question: string;
  answer: string;
  customComponent?: React.ReactNode;
}

interface PublicPlatformSettings {
  inspection_tier1_threshold?: number;
  inspection_tier1_hours?: number;
  inspection_tier2_threshold?: number;
  inspection_tier2_hours?: number;
  inspection_tier3_hours?: number;
  shipping_timeout_days?: number;
  auto_delivery_hours?: number;
  otp_reveal_delay_hours?: number;
  return_dispatch_days?: number;
  return_auto_refund_hours?: number;
  dispute_alert_threshold?: number;
  dispute_warning_threshold?: number;
  dispute_suspension_threshold?: number;
  dispute_retraction_release_hours?: number;
  arbiter_escalation_hours?: number;
}

export const HelpView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-3');
  const [platformSettings, setPlatformSettings] = useState<PublicPlatformSettings>({
    inspection_tier1_threshold: 2000,
    inspection_tier1_hours: 24,
    inspection_tier2_threshold: 10000,
    inspection_tier2_hours: 48,
    inspection_tier3_hours: 72,
    shipping_timeout_days: 4,
    dispute_alert_threshold: 20,
    dispute_warning_threshold: 30,
    dispute_suspension_threshold: 40,
    dispute_retraction_release_hours: 24,
    arbiter_escalation_hours: 48,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/escrow/public-settings');
        if (res.data) {
          setPlatformSettings(res.data);
        }
      } catch {
        /* fallback to defaults */
      }
    };
    fetchSettings();
  }, []);

  const t1Thresh = platformSettings.inspection_tier1_threshold ?? 2000;
  const t1Hrs = platformSettings.inspection_tier1_hours ?? 24;
  const t2Thresh = platformSettings.inspection_tier2_threshold ?? 10000;
  const t2Hrs = platformSettings.inspection_tier2_hours ?? 48;
  const t3Hrs = platformSettings.inspection_tier3_hours ?? 72;
  const dispatchDays = platformSettings.shipping_timeout_days ?? 4;
  const disputeAlert = platformSettings.dispute_alert_threshold ?? 20;
  const disputeWarning = platformSettings.dispute_warning_threshold ?? 30;
  const disputeSuspension = platformSettings.dispute_suspension_threshold ?? 40;
  const disputeRetractionHours = platformSettings.dispute_retraction_release_hours ?? 24;
  const arbiterEscalationHours = platformSettings.arbiter_escalation_hours ?? 48;

  const faqs: FAQItem[] = useMemo(() => [
    // ─── BUYERS ─────────────────────────────────────────────────────────────
    {
      id: 'faq-1',
      category: 'BUYERS',
      question: 'How does HendAxis Trust protect my money?',
      answer: 'When you purchase through a HendAxis Trust Payment Link, your payment is held in our secure escrow vault. The seller is notified to dispatch your package, but cannot access your funds. Payment is only released to the seller after you receive your package, inspect the goods, and confirm satisfaction within your inspection window.'
    },
    {
      id: 'faq-2',
      category: 'BUYERS',
      question: 'Which payment methods can I use at checkout?',
      answer: 'HendAxis Trust supports all major Ghanaian payment channels: Mobile Money (MTN MoMo, Telecel Cash, AT Money) and Debit/Credit Cards (Visa, Mastercard). Transactions are securely processed through leading payment engines including Paystack Multi-Channel, AppsNMobile (The Orchard API), and Hubtel Ghana PSP.'
    },
    {
      id: 'faq-3',
      category: 'BUYERS',
      question: 'How long is my buyer inspection period?',
      answer: `Inspection timeframes start automatically the moment your delivery is confirmed: ${t1Hrs} Hours for orders under GH₵ ${t1Thresh.toLocaleString()}; ${t2Hrs} Hours for orders between GH₵ ${t1Thresh.toLocaleString()} and GH₵ ${(t2Thresh - 0.01).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}; and ${t3Hrs} Hours for orders GH₵ ${t2Thresh.toLocaleString()} and above. During this window, you have full protection to inspect your items and raise a dispute if anything is amiss.`,
      customComponent: (
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Live Platform Inspection Schedule
            </span>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Admin Synchronized
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Tier 1 (Everyday Orders)</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono block">&lt; GH₵ {t1Thresh.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-800/80 mt-1">
                ⏱️ {t1Hrs} Hours ({Math.round(t1Hrs / 24)} {t1Hrs === 24 ? 'day' : 'days'})
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Tier 2 (Mid-Range Orders)</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono block">GH₵ {t1Thresh.toLocaleString()} – {t2Thresh.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-800/80 mt-1">
                ⏱️ {t2Hrs} Hours ({Math.round(t2Hrs / 24)} days)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Tier 3 (High-Value / Luxury)</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono block">≥ GH₵ {t2Thresh.toLocaleString()}</span>
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200/80 dark:border-blue-800/80 mt-1">
                ⏱️ {t3Hrs} Hours ({Math.round(t3Hrs / 24)} days)
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq-4',
      category: 'BUYERS',
      question: 'How does the 2-Step OTP package tracking work?',
      answer: 'To protect your personal data and delivery address, tracking your order (single parcel or full order history) requires verifying a quick 6-digit OTP sent to your phone. Once verified, your session stays active for 2 hours, allowing seamless access to live status, waybills, and action buttons without repetitive prompts.'
    },
    {
      id: 'faq-5',
      category: 'BUYERS',
      question: 'When can I rate a seller, and how does the review system work?',
      answer: 'To guarantee honest reviews, rating a seller is locked while an item is in transit and unlocks automatically once delivery is verified. Buyers rate sellers across 3 axes: Product Quality, Shipping Speed, and Communication. If you ever update your review, the platform transparently records the edit count and timestamp for complete community trust.'
    },
    {
      id: 'faq-5b',
      category: 'BUYERS',
      question: 'How does the Marketplace Search and Store Directory work?',
      answer: 'The HendAxis Marketplace Directory (/shops) lets buyers discover verified escrow stores and search across hundreds of products using real-time keyword matching. You can filter by standard Ghanaian commerce categories (Phones, Electronics, Fashion, Auto Parts, etc.) and explore featured merchants alongside verified customer reviews.'
    },
    {
      id: 'faq-5d',
      category: 'BUYERS',
      question: 'How do Order Cancellations, the 90-Minute Seller Grace Window, and Payout Holds work for buyers?',
      answer: 'If an order has not been dispatched, you can click "Cancel Order" on your order page. To protect against items already in transit, the seller receives an immediate SMS alert with a 90-minute window to verify dispatch. If unconfirmed after 90 minutes, the cancellation is confirmed and enters a 90-minute safety buffer before final refund disbursement to your In-App Wallet or Mobile Money account (minus non-refundable escrow and 1.95% payment provider fees). Buyers are limited to 2 cancellations per month.'
    },

    // ─── SELLERS ────────────────────────────────────────────────────────────
    {
      id: 'faq-6',
      category: 'SELLERS',
      question: 'How do I create a payment link and choose fee handling?',
      answer: 'Log in to your Seller Dashboard and click "Create Payment Link". Enter your item title, category, description, price in GH₵, and shipping fee. You can choose "Pass Fee to Buyer" (buyer pays the escrow fee at checkout and you receive 100% of your listed price) or "Absorb Fee" (fee is deducted from your final payout). You can also simulate exact calculations anytime with the Escrow Fee Calculator.'
    },
    {
      id: 'faq-6b',
      category: 'SELLERS',
      question: 'Why should I select a category when creating a payment link?',
      answer: 'Selecting one of our standard marketplace categories (e.g. Phones & Tablets, Electronics & Appliances, Fashion & Apparel, Automotive & Spare Parts) categorizes your product in the public Marketplace Directory (/shops). This enables active buyers searching for specific items to discover your store and product listings instantly.'
    },
    {
      id: 'faq-6c',
      category: 'SELLERS',
      question: 'How does the 1-Click WhatsApp Escrow Link Generator work for sellers?',
      answer: 'When buyers message you on WhatsApp from your public storefront, they send a link that opens your HendAxis link creation view (/create-link) with the item title, price, category, and image URL already pre-filled. All you need to do is agree on the shipping destination with the customer, enter the shipping amount, and click Generate to create the secure escrow payment link.'
    },
    {
      id: 'faq-6d',
      category: 'SELLERS',
      question: 'What should I do if a buyer requests a cancellation?',
      answer: 'You will receive an urgent SMS notification giving you a 90-minute window to respond on your dashboard. If you have not shipped, click "Accept Cancel" to allow the refund. If you already shipped or handed the parcel to a courier, click "I Already Shipped" and provide your waybill/tracking number to immediately halt the cancellation and keep the order active. If an order is auto-confirmed, you have a 90-minute safety hold to click "Report Shipped (Freeze)" with waybill evidence to freeze the payout for arbitration.'
    },
    {
      id: 'faq-7',
      category: 'SELLERS',
      question: 'What is the Seller Dispatch Guarantee and what happens if I miss the deadline?',
      answer: `Sellers must dispatch packages within the platform-configured dispatch window (currently: ${dispatchDays} days / ${dispatchDays * 24} hours). HendAxis Trust sends progressive reminders at 24 hours and 6 hours remaining. If a seller defaults and fails to dispatch on time, the order is automatically cancelled, the buyer receives a 100% full refund, and the defaulting seller is charged a non-dispatch penalty.`
    },
    {
      id: 'faq-8',
      category: 'SELLERS',
      question: 'How do I get the official "Verified Seller 🛡️" badge for my storefront?',
      answer: 'The Verified Seller badge is never awarded based on order volume alone. Sellers submit their Ghana Card / National ID number, a clear Ghana Card photo, and optional business registration license under Profile Settings. Our compliance team verifies the documents before approving the official Verified Seller badge.'
    },
    {
      id: 'faq-9',
      category: 'SELLERS',
      question: 'How does Seller Dispute Health Monitoring & Account Suspension work?',
      answer: `HendAxis Trust monitors dispute rates across recent paid transactions. If a store reaches a ${disputeAlert}% dispute rate, a warning banner appears. At ${disputeWarning}%, a high-priority alert is issued. If disputes reach ${disputeSuspension}% or higher, the seller account is automatically suspended and active payment links are paused. Suspended sellers can submit a formal reinstatement appeal directly through their dashboard.`
    },
    {
      id: 'faq-10',
      category: 'SELLERS',
      question: 'How do I get paid, and what is the difference between Instant and Manual payouts?',
      answer: 'Once an escrow order completes, earnings credit to your HendAxis Trust Wallet immediately. With Instant Payout enabled, funds auto-disburse directly to your registered Mobile Money or Bank Account. In Manual Payout mode, earnings accumulate in your wallet and you can initiate withdrawals whenever you choose.'
    },
    {
      id: 'faq-11',
      category: 'SELLERS',
      question: 'What are Merchant Trust Badges and how do I embed them on Instagram or WhatsApp?',
      answer: 'Sellers can access embeddable Trust Badges in their dashboard (`/dashboard?tab=badges`). You can copy your custom verified store badge code for your website/Shopify store, download branded trust seals, or generate a Shareable Proof Card to post directly on Instagram stories, WhatsApp statuses, and TikTok.'
    },

    // ─── LOGISTICS ──────────────────────────────────────────────────────────
    {
      id: 'faq-12',
      category: 'LOGISTICS',
      question: 'What is the difference between Formal Courier Delivery and Station / Bus Delivery?',
      answer: 'Path A (Formal Courier) supports DHL Express, FedEx, UPS, EMS / Ghana Post, Speedaf Express, and local couriers with live tracking links and automated 17TRACK delivery webhooks. Path B (Informal Bus / Station) allows recording driver phone, vehicle number, and station location, generating a Secret 6-Digit OTP for the buyer to present upon collection.'
    },
    {
      id: 'faq-12b',
      category: 'LOGISTICS',
      question: 'How are location-based shipping fees and delivery timelines agreed upon?',
      answer: `Shipping fees in Ghana vary depending on intra-city vs. inter-city transit (e.g. Accra vs. Kumasi or Tamale). Buyers and sellers should confirm the delivery destination and agreed carrier fee before the seller generates the payment link. The official seller dispatch window (currently ${dispatchDays} days) starts only after the buyer deposits the escrow funds.`
    },
    {
      id: 'faq-13',
      category: 'LOGISTICS',
      question: 'Why is there a 60-second cooldown between SMS OTP requests?',
      answer: 'To protect users against SMS flooding and minimize network carrier latency, a 60-second cooldown timer operates between OTP resend requests. The original OTP remains fully valid throughout the window.'
    },

    // ─── DISPUTES ───────────────────────────────────────────────────────────
    {
      id: 'faq-14',
      category: 'DISPUTES',
      question: 'How do I raise a dispute if there is an issue with my order?',
      answer: 'If your item arrives damaged, defective, or incorrect, click "Raise Dispute" on your tracking page before your inspection window expires. You can describe the issue and upload up to 5 WebP evidence photos. Our 24-hour arbitration team reviews all evidence to issue a fair, binding ruling.'
    },
    {
      id: 'faq-15',
      category: 'DISPUTES',
      question: 'What is the WhatsApp-Style Dispute Dialogue Trail?',
      answer: 'Both buyers and sellers can append continuous follow-up messages and photos to active disputes. Statements are organized in a chronological, color-coded chat timeline (Rose for Buyer, Emerald for Seller, Purple for Arbitrators), ensuring full historical transparency without overwriting previous evidence.'
    },
    {
      id: 'faq-16',
      category: 'DISPUTES',
      question: 'What is Dispute Retraction and how does Grace Period Settlement work?',
      answer: `If buyer and seller resolve their disagreement amicably (such as a direct replacement or discount), the buyer can click "Retract Dispute / Settle Privately". Escrow funds enter a ${disputeRetractionHours}-hour grace period before releasing to the seller. Rating capability is voided on disputed deals to prevent coercive pressure.`
    },
    {
      id: 'faq-17',
      category: 'DISPUTES',
      question: 'How do Buyer Item Returns and Reverse OTP handoffs work?',
      answer: 'When an arbiter ruling requires returning the item, the buyer dispatches the return via courier or bus transport. For informal bus returns, a secret 6-digit Reverse OTP is generated. The seller verifies receipt of the returned item to trigger the full buyer refund.'
    },
    {
      id: 'faq-17b',
      category: 'DISPUTES',
      question: 'When can either party click "Request Arbiter Decision"?',
      answer: `After a ${arbiterEscalationHours}-hour negotiation window following the initial dispute, both buyer and seller can click "Request Arbiter Decision" on their order panel. This moves the dispute to the top priority queue of certified platform arbiters for an expedited, binding resolution.`
    },
    {
      id: 'faq-17c',
      category: 'DISPUTES',
      question: 'What happens if parties take a dispute to external arbitration or legal proceedings?',
      answer: 'If either party escalates to external arbitration or courts, the disputing parties bear 100% of all third-party legal and administrative costs. HendAxis Trust is held fully harmless and indemnified. Escrow funds will solely be disbursed upon submission and platform arbiter upload of an authentic, certified, written ruling order from the third-party arbitrator or court.'
    },

    // ─── REFERRALS & REWARDS ────────────────────────────────────────────────
    {
      id: 'faq-18',
      category: 'REFERRALS',
      question: 'How does the HendAxis Trust Referral Program work?',
      answer: 'Invite fellow merchants or buyers to HendAxis Trust! When a referred friend signs up using your link or code and completes their first escrow transaction, you earn GH₵ 15.00 in fee offset credits and your friend receives a GH₵ 10.00 welcome fee credit.'
    },
    {
      id: 'faq-19',
      category: 'REFERRALS',
      question: 'Do buyers need to create a seller store to get a referral link?',
      answer: 'No! Any buyer can visit `/referrals`, enter their Ghana phone number (e.g. 0241234567), and instantly generate their personalized referral link with 1-click WhatsApp, Telegram, and SMS sharing buttons.'
    },
    {
      id: 'faq-20',
      category: 'REFERRALS',
      question: 'How do Fee Offset Credits work on transactions?',
      answer: 'Earned referral bonuses, cashback campaigns, first order rewards, and admin grants accumulate in your Fee Offset Credit Wallet. When you create or pay for an escrow order, your available credits automatically deduct from platform escrow fees, saving you money on every deal.'
    },

    // ─── DEVELOPERS ─────────────────────────────────────────────────────────
    {
      id: 'faq-21',
      category: 'DEVELOPERS',
      question: 'How can developers integrate HendAxis Escrow into an e-commerce website?',
      answer: 'Developers can use our REST API and Drop-in JavaScript SDK to embed HendAxis Escrow directly into custom web applications, mobile apps, or Shopify stores. Visit `/developers` for full API documentation, webhook payload guides, and test sandbox credentials.'
    }
  ], [t1Thresh, t1Hrs, t2Thresh, t2Hrs, t3Hrs, dispatchDays, disputeAlert, disputeWarning, disputeSuspension, disputeRetractionHours, arbiterEscalationHours]);

  const filteredFaqs = faqs.filter(f => {
    const matchesCategory = activeCategory === 'ALL' || f.category === activeCategory;
    const matchesSearch = f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(f => ({
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
        title="Help Center & Support FAQs | HendAxis Trust"
        description="Official platform guide and frequently asked questions for buyers, sellers, couriers, and developers. Learn how escrow, verification, tracking, and disputes work."
        canonicalUrl="https://trust.hendaxis.com/help"
        jsonLd={faqJsonLd}
      />

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-black via-slate-950 to-black border-b border-orange-500/20 py-16 sm:py-20 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[950px] h-[380px] bg-gradient-to-b from-[#ff6d1d]/25 via-[#ff6d1d]/10 to-transparent blur-3xl pointer-events-none -z-0"></div>
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#ff6d1d_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none"></div>
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#ff6d1d]/40 to-transparent"></div>
        
        <div className="max-w-4xl mx-auto text-center space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#ff6d1d]/15 border border-[#ff6d1d]/35 px-4 py-1.5 rounded-full text-xs font-black text-[#ff6d1d] shadow-sm tracking-wide">
            <HelpCircle className="h-4 w-4 text-[#ff6d1d]" />
            Official Platform Guide & Knowledge Base
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            How Can We Help You Today?
          </h1>
          <p className="text-slate-300 text-xs sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            Everything you need to know about scam-free escrow payments, Ghana Card seller verification, multi-carrier logistics, dispute arbitration, and referral rewards.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto pt-3">
            <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-orange-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search help topics (e.g. 'inspection', 'refunds', 'verification', 'dispatch')..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-900/90 border border-slate-700 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#ff6d1d] focus:ring-4 focus:ring-[#ff6d1d]/20 shadow-2xl transition"
            />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 space-y-10">

        {/* Quick Pillar Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { title: 'Buyer Escrow', icon: Lock, color: 'text-blue-500', desc: '100% money protection' },
            { title: 'Verified Sellers', icon: ShieldCheck, color: 'text-emerald-500', desc: 'Ghana Card KYC' },
            { title: 'Dual Shipping', icon: Truck, color: 'text-sky-500', desc: 'Courier & Bus OTP' },
            { title: '24h Arbitration', icon: Clock, color: 'text-amber-500', desc: 'Fair binding rulings' },
            { title: 'Refer & Earn', icon: Gift, color: 'text-[#ff6d1d]', desc: 'Fee offset credits' },
            { title: 'Developer APIs', icon: Code, color: 'text-teal-500', desc: 'REST API & SDK' }
          ].map((c, idx) => {
            const IconComp = c.icon;
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center space-y-1.5 shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto">
                  <IconComp className={`h-5 w-5 ${c.color}`} />
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{c.title}</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">{c.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Dynamic Tiered Inspection Windows Card */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/50 border border-blue-500/30 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Tiered Buyer Inspection Periods
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculated automatically based on transaction value configured in Platform Settings.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Full Buyer Escrow Protection</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Tier 1 (Everyday Orders)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">&lt; GH₵ {t1Thresh.toLocaleString()}</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">{t1Hrs}h</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {Math.round(t1Hrs / 24)} {t1Hrs === 24 ? 'day' : 'days'} to test items, clothing fit, or general merchandise before funds release.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Tier 2 (Mid-Range Orders)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">GH₵ {t1Thresh.toLocaleString()} – {t2Thresh.toLocaleString()}</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">{t2Hrs}h</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {Math.round(t2Hrs / 24)} days to thoroughly inspect electronics, gadgets, and home appliances.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Tier 3 (High-Value / Luxury)
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">≥ GH₵ {t2Thresh.toLocaleString()}</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">{t3Hrs}h</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {Math.round(t3Hrs / 24)} days extended guarantee for flagship smartphones, laptops, and luxury goods.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 justify-center border-b border-slate-200 dark:border-slate-800 pb-4">
          {[
            { id: 'ALL', label: 'All Topics' },
            { id: 'BUYERS', label: 'For Buyers' },
            { id: 'SELLERS', label: 'For Sellers' },
            { id: 'LOGISTICS', label: 'Logistics & Shipping' },
            { id: 'DISPUTES', label: 'Disputes & Arbitration' },
            { id: 'REFERRALS', label: 'Referrals & Rewards' },
            { id: 'DEVELOPERS', label: 'Developer APIs' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition border cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20'
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
              <p className="text-xs sm:text-sm">Try searching for alternative terms or browse all categories.</p>
            </div>
          ) : (
            filteredFaqs.map(faq => {
              const isOpen = openFaqId === faq.id;
              return (
                <div key={faq.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition shadow-sm hover:shadow-md">
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0">
                        {faq.category}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-snug">
                        {faq.question}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3 font-normal space-y-3">
                      <p>{faq.answer}</p>
                      {faq.customComponent && faq.customComponent}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Helpful Resources Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            to="/how-it-works"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition shadow-sm group"
          >
            <Sparkles className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">How Escrow Works</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visual step-by-step walkthrough of the 4-step escrow lifecycle.
            </p>
          </Link>

          <Link
            to="/trust-center"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition shadow-sm group"
          >
            <ShieldCheck className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Trust & Security Center</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Bank-grade security protocols, Ghana Card verification, and fraud prevention.
            </p>
          </Link>

          <Link
            to="/referrals"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#ff6d1d] dark:hover:border-[#ff6d1d] transition shadow-sm group"
          >
            <Gift className="w-6 h-6 text-[#ff6d1d] mb-2 group-hover:scale-110 transition-transform" />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Refer & Earn Hub</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Earn fee offset credits whenever friends complete transactions.
            </p>
          </Link>
        </div>

        {/* 24/7 Support CTA Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-black border border-blue-500/30 p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl text-white">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-400" />
              Still Need Assistance?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Our Ghana customer support team is available 24/7 to help you with active orders, payments, or disputes.
            </p>
          </div>
          <Link
            to="/contact"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-xl transition shadow-lg shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            Contact Support <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </div>
  );
};

export default HelpView;
