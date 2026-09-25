import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const BASE_URL = 'https://trust.hendaxis.com';

const routes = [
  {
    path: '/',
    outputPath: 'index.html',
    title: "HendAxis Trust — Ghana's Buyer-Seller Escrow Payment Platform",
    description: "Pay securely, sell with confidence. HendAxis Trust protects online transactions across Ghana with double-entry escrow, MoMo & card integration, formal courier webhooks, and verified seller badges.",
    canonical: `${BASE_URL}/`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Ghana's Premier Buyer-Seller Escrow Payment Platform",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Ghana's Premier Buyer-Seller Escrow Payment Platform</h1>
          <p>Pay securely, sell with confidence. HendAxis Trust protects online transactions across Ghana with bank-grade escrow holding, Mobile Money (MTN MoMo, Telecel Cash, AT Money) integration, verified seller storefronts, and automated courier tracking.</p>
        </header>
        <section>
          <h2>How Escrow Protects Buyers and Sellers in Ghana</h2>
          <ul>
            <li><strong>For Online Buyers:</strong> Never send money directly to an unknown seller. Your payment is held securely in escrow until you receive and inspect your package.</li>
            <li><strong>For Online Sellers:</strong> Eliminate "pay on delivery" rejections and scam buyers. Receive verified payment confirmation before shipping goods.</li>
            <li><strong>Instant Payouts:</strong> Automated Mobile Money and instant bank transfers upon successful delivery confirmation.</li>
            <li><strong>Dispute Arbitration:</strong> Impartial 24-hour dispute resolution backed by verifiable courier waybills and inspection logs.</li>
          </ul>
        </section>
        <section>
          <h2>Explore HendAxis Trust Services</h2>
          <nav>
            <ul>
              <li><a href="/for-buyers">Buyer Protection & Safe Shopping</a></li>
              <li><a href="/for-sellers">Seller Solutions & Escrow Links</a></li>
              <li><a href="/how-it-works">How Escrow Works Step-by-Step</a></li>
              <li><a href="/trust-center">Trust, Security & Verification Standards</a></li>
              <li><a href="/shops">Verified Sellers & Marketplace Directory</a></li>
              <li><a href="/guides">Scam Prevention & Safe Trading Guides</a></li>
              <li><a href="/referrals">Referral Program & Fee Credits</a></li>
              <li><a href="/developers">Developer Escrow API & Webhooks</a></li>
              <li><a href="/help">Help Center & FAQ</a></li>
              <li><a href="/contact">Contact Customer Support</a></li>
            </ul>
          </nav>
        </section>
      </main>
    `
  },
  {
    path: '/for-buyers',
    outputPath: 'for-buyers/index.html',
    title: "Secure Online Shopping with Escrow | HendAxis Trust",
    description: "Buy online with greater confidence using HendAxis Trust escrow. Your payment is held securely until the transaction conditions are fulfilled.",
    canonical: `${BASE_URL}/for-buyers`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Secure Online Shopping & Buyer Protection with Escrow",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Secure Online Shopping with Escrow Protection in Ghana</h1>
          <p>Never send money to an unfamiliar online seller and hope for the best. With HendAxis Trust, your Mobile Money or card payment is held safely in third-party escrow and only released to the seller after you receive and inspect your package.</p>
        </header>

        <section>
          <h2>How Buyer Escrow Protection Works</h2>
          <ol>
            <li>
              <h3>1. Start a Safe Transaction</h3>
              <p>Request an escrow payment link from any seller on Instagram, TikTok, WhatsApp, or Twitter, or browse verified sellers in our <a href="/shops">Shop Directory</a>.</p>
            </li>
            <li>
              <h3>2. Secure Payment Deposit</h3>
              <p>Deposit funds securely using MTN Mobile Money, Telecel Cash, AT Money, or debit cards. Your money is locked in a dedicated escrow account, NOT sent directly to the seller's personal wallet.</p>
            </li>
            <li>
              <h3>3. Seller Ships the Item</h3>
              <p>The seller receives immediate official notification that payment is secured and dispatches your order with integrated tracking.</p>
            </li>
            <li>
              <h3>4. Inspect Upon Delivery</h3>
              <p>When the courier delivers your package, inspect the goods to ensure they match what you ordered in condition, size, and specification.</p>
            </li>
            <li>
              <h3>5. Approve Payout or Dispute</h3>
              <p>If you are satisfied, approve the release of funds to the seller. If the item is defective, counterfeit, or never arrives, raise an instant dispute for a full refund.</p>
            </li>
          </ol>
        </section>

        <section>
          <h2>What Happens If Something Goes Wrong?</h2>
          <p>If the seller fails to deliver or sends an incorrect product, our dedicated dispute arbitration team investigates delivery waybills and transaction records. Funds remain safely frozen in escrow until resolution is achieved, ensuring you never lose your hard-earned money to scammers.</p>
        </section>

        <section>
          <h2>Information Buyers Receive</h2>
          <ul>
            <li>Official SMS & WhatsApp payment confirmation with unique Escrow Reference ID</li>
            <li>Real-time package dispatch and delivery courier tracking link</li>
            <li>Direct dispute portal link with 24-hour dispute window</li>
            <li>Official electronic payment receipt</li>
          </ul>
        </section>

        <nav>
          <p>Related Links: <a href="/how-it-works">How It Works</a> | <a href="/for-sellers">For Sellers</a> | <a href="/trust-center">Trust Center</a> | <a href="/help">Help Center</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/for-sellers',
    outputPath: 'for-sellers/index.html',
    title: "Sell Online with Buyer-Seller Escrow Protection | HendAxis Trust",
    description: "Accept online payments with escrow protection. HendAxis Trust helps sellers build buyer confidence while protecting transaction payments.",
    canonical: `${BASE_URL}/for-sellers`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Sell Online with Escrow Protection & Build Buyer Trust",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Sell Online with Buyer-Seller Escrow Protection in Ghana</h1>
          <p>Accept online payments with escrow protection. HendAxis Trust helps social media merchants, Instagram shops, and e-commerce sellers build instant buyer confidence while eliminating delivery payment defaults.</p>
        </header>

        <section>
          <h2>Why Ghana's Best Sellers Use HendAxis Trust</h2>
          <ul>
            <li><strong>Eliminate "Pay on Delivery" Losses:</strong> Stop wasting dispatch rider delivery fees on fake buyers who fail to show up or refuse payment upon arrival.</li>
            <li><strong>Verified Seller Badge:</strong> Get verified with Ghana Card KYC to display trust badges and get listed on our high-traffic <a href="/shops">Verified Marketplace Directory</a>.</li>
            <li><strong>Instant Payment Links:</strong> Generate branded checkout links with product images, custom delivery fees, and automated order receipts in 30 seconds.</li>
            <li><strong>Instant MoMo Payouts:</strong> Automated payout to MTN MoMo, Telecel Cash, AT Money, or commercial bank accounts as soon as delivery is confirmed.</li>
            <li><strong>Seller Fraud Protection:</strong> Protection against fraudulent chargebacks and fake payment alert screenshots.</li>
          </ul>
        </section>

        <section>
          <h2>How Selling with Escrow Works</h2>
          <ol>
            <li><strong>Create Payment Link:</strong> Set your product name, price, quantity, and delivery fee.</li>
            <li><strong>Share with Buyer:</strong> Send the link via WhatsApp, Instagram DM, TikTok, or post on your social bio.</li>
            <li><strong>Verified Deposit Alert:</strong> Get verified SMS/email confirmation when the buyer deposits the escrow funds.</li>
            <li><strong>Dispatch Package:</strong> Hand over to the dispatch rider with tracking details logged.</li>
            <li><strong>Receive Funds:</strong> Once delivered, escrow funds are instantly released to your wallet.</li>
          </ol>
        </section>

        <nav>
          <p>Related Links: <a href="/for-buyers">For Buyers</a> | <a href="/how-it-works">How Escrow Works</a> | <a href="/shops">Verified Shops</a> | <a href="/developers">Developer API</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/how-it-works',
    outputPath: 'how-it-works/index.html',
    title: "How Escrow Works | HendAxis Trust",
    description: "Learn how HendAxis Trust protects buyers and sellers by holding payment securely until the agreed transaction conditions are fulfilled.",
    canonical: `${BASE_URL}/how-it-works`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "How HendAxis Trust Escrow Protects Your Transactions",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>How Escrow Works: Complete Step-by-Step Lifecycle</h1>
          <p>Learn how HendAxis Trust protects buyers and sellers by holding payment securely in an independent trust account until the agreed transaction conditions are fulfilled.</p>
        </header>

        <section>
          <h2>The 5-Step Escrow Process</h2>
          <ol>
            <li>
              <h3>Step 1: Agreement & Payment Link Creation</h3>
              <p>The seller creates an escrow payment link specifying items, agreed price, and delivery logistics, and shares it with the buyer.</p>
            </li>
            <li>
              <h3>Step 2: Secure Escrow Deposit</h3>
              <p>The buyer deposits payment using Mobile Money (MTN, Telecel, AT) or Card. HendAxis Trust holds the funds safely in an audited trust account and notifies both parties.</p>
            </li>
            <li>
              <h3>Step 3: Order Dispatch & Courier Tracking</h3>
              <p>Knowing payment is guaranteed in escrow, the seller ships the item and records tracking info.</p>
            </li>
            <li>
              <h3>Step 4: Inspection Window</h3>
              <p>The buyer receives the parcel and has a dedicated window to inspect the goods against what was agreed upon.</p>
            </li>
            <li>
              <h3>Step 5: Completion & Payout</h3>
              <p>Upon buyer approval or successful delivery confirmation without dispute, the escrow balance is instantly transferred to the seller's wallet.</p>
            </li>
          </ol>
        </section>

        <section>
          <h2>Fair Dispute Resolution</h2>
          <p>If an issue arises (wrong item, transit damage, non-delivery), either party can open a dispute. Our arbitration team reviews photographic evidence, courier tracking, and chat logs to issue a fair, binding resolution or refund.</p>
        </section>

        <nav>
          <p>Learn more: <a href="/for-buyers">Buyer Guide</a> | <a href="/for-sellers">Seller Guide</a> | <a href="/trust-center">Trust & Security</a> | <a href="/help">FAQ</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/trust-center',
    outputPath: 'trust-center/index.html',
    title: "Trust & Security Center | HendAxis Trust",
    description: "Discover how HendAxis Trust guarantees payment security with double-entry ledgers, verified sellers, encryption, and dispute arbitration in Ghana.",
    canonical: `${BASE_URL}/trust-center`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Trust, Security & Institutional Compliance",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Trust, Security & Compliance Center</h1>
          <p>Discover how HendAxis Trust guarantees payment security with immutable double-entry financial ledgers, Ghana Card KYC verification, bank-grade encryption, and impartial dispute arbitration.</p>
        </header>

        <section>
          <h2>Our Core Security Pillars</h2>
          <ul>
            <li><strong>Double-Entry Ledger Architecture:</strong> Every pesewa is tracked across segregated balance sheets with cryptographic checksums, eliminating fund loss or reconciliation errors.</li>
            <li><strong>Ghana Card Identity Verification:</strong> Verified sellers undergo mandatory National Identification Authority (NIA) verification to eradicate fraudulent and ghost merchants.</li>
            <li><strong>256-Bit Bank-Grade Encryption:</strong> All data in transit and at rest is secured using TLS 1.3 encryption protocols.</li>
            <li><strong>Segregated Escrow Accounts:</strong> Customer escrow deposits are held separately from operational company funds in tier-1 regulated banking institutions.</li>
            <li><strong>24-Hour Dispute Resolution SLA:</strong> Fast, impartial arbitration handled by trained compliance specialists.</li>
          </ul>
        </section>

        <nav>
          <p>Explore: <a href="/how-it-works">How Escrow Works</a> | <a href="/guides">Safety Guides</a> | <a href="/contact">Contact Compliance Team</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/guides',
    outputPath: 'guides/index.html',
    title: "Guides & Safe Trading Hub | HendAxis Trust",
    description: "Step-by-step guides and best practices for safe online trading, buyer protection, and dispute resolution with escrow in Ghana.",
    canonical: `${BASE_URL}/guides`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Guides & Scam Prevention Resource Center",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Online Shopping Safety Guides & Scam Prevention Hub</h1>
          <p>Step-by-step guides and best practices for safe online trading, avoiding social media payment scams, and protecting Mobile Money transactions in Ghana.</p>
        </header>

        <section>
          <h2>Essential Guides for Online Buyers & Sellers</h2>
          <ul>
            <li><strong>How to Spot Social Media Shopping Scams:</strong> Identify fake Instagram boutiques, unverified WhatsApp vendors, and fraudulent Mobile Money prompt requests.</li>
            <li><strong>Avoiding Fake SMS Payment Receipts:</strong> Why sellers should never release goods based on SMS alerts without verified escrow confirmation.</li>
            <li><strong>Safe Delivery & Inspection Protocols:</strong> What to look for when inspecting items from dispatch riders before releasing escrow funds.</li>
            <li><strong>Resolving E-commerce Disputes:</strong> Step-by-step guide to gathering proof and winning legitimate transaction disputes.</li>
          </ul>
        </section>

        <nav>
          <p>Back to: <a href="/">Homepage</a> | <a href="/for-buyers">Buyer Protection</a> | <a href="/for-sellers">Seller Protection</a> | <a href="/help">Help Center</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/referrals',
    outputPath: 'referrals/index.html',
    title: "Referral Program & Rewards | HendAxis Trust",
    description: "Earn cash rewards and fee discounts by referring buyers and sellers to HendAxis Trust escrow platform.",
    canonical: `${BASE_URL}/referrals`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Refer Friends & Earn Escrow Fee Credits",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>HendAxis Trust Referral Program & Rewards</h1>
          <p>Share scam-free commerce with your network. Earn cash fee credits every time a referred buyer or seller completes an escrow transaction on HendAxis Trust.</p>
        </header>

        <section>
          <h2>How the Referral Program Works</h2>
          <ol>
            <li><strong>Get Your Link:</strong> Sign in to your HendAxis Trust dashboard and copy your unique referral link or referral code.</li>
            <li><strong>Share with Friends & Merchants:</strong> Invite buyers, social sellers, and colleagues via WhatsApp, Twitter, Instagram, or Telegram.</li>
            <li><strong>Earn Fee Credits:</strong> Whenever your invitee completes their first verified escrow deal, both you and your friend receive instant fee credits credited to your wallet.</li>
          </ol>
        </section>

        <nav>
          <p>Links: <a href="/register">Sign Up</a> | <a href="/login">Sign In</a> | <a href="/help">Help Center</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/developers',
    outputPath: 'developers/index.html',
    title: "Developer Hub & Escrow API | HendAxis Trust",
    description: "Integrate HendAxis Trust escrow checkout into your e-commerce store or marketplace with our REST APIs and webhooks.",
    canonical: `${BASE_URL}/developers`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Developer Hub: REST API & Drop-in SDK",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Developer Hub: REST APIs & Escrow SDK</h1>
          <p>Integrate HendAxis Trust escrow checkout, automated escrow hold, courier webhooks, and instant Mobile Money payouts into your custom e-commerce website or platform.</p>
        </header>

        <section>
          <h2>API Capabilities</h2>
          <ul>
            <li><strong>Payment Link Generation API:</strong> Programmatically create escrow links with custom metadata, SKU tracking, and variable delivery fees.</li>
            <li><strong>Real-time Webhook Events:</strong> Receive instant HTTP callbacks for payment verification, dispatch confirmation, delivery inspection, and dispute triggers.</li>
            <li><strong>Automated Payouts API:</strong> Trigger immediate automated payouts to Ghanaian MoMo wallets and bank accounts upon order completion.</li>
            <li><strong>Sandbox Testing Environment:</strong> Test transaction flows with simulated mobile money triggers and mock courier deliveries.</li>
          </ul>
        </section>

        <nav>
          <p>Documentation: <a href="/help">Help & Support</a> | <a href="/trust-center">Trust & Security</a> | <a href="/contact">API Support</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/help',
    outputPath: 'help/index.html',
    title: "Help Center & Support FAQs | HendAxis Trust",
    description: "Find answers to frequently asked questions regarding escrow payments, transaction disputes, seller verification, and MoMo payouts.",
    canonical: `${BASE_URL}/help`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Help Center & Knowledge Base",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>HendAxis Trust Help Center & Frequently Asked Questions</h1>
          <p>Find answers to frequently asked questions regarding escrow payments, transaction security, dispute resolution, seller verification, and Mobile Money payouts in Ghana.</p>
        </header>

        <section>
          <h2>Frequently Asked Questions</h2>
          <dl>
            <dt><strong>What is HendAxis Trust?</strong></dt>
            <dd>HendAxis Trust is Ghana's premier buyer-seller escrow payment platform. We protect online transactions by holding buyer payments in trust until goods or services are delivered and verified.</dd>

            <dt><strong>How much are the escrow fees?</strong></dt>
            <dd>Our escrow fees are transparent and tiered based on transaction value, typically ranging from 1.5% to 3.0%, split or assigned according to the seller's preference.</dd>

            <dt><strong>Which payment methods are supported?</strong></dt>
            <dd>We support MTN Mobile Money, Telecel Cash, AT Money, and Visa/Mastercard debit cards.</dd>

            <dt><strong>How does dispute resolution work?</strong></dt>
            <dd>If a buyer receives the wrong item or no item, they can open a dispute. Our arbitration team reviews the courier tracking, order terms, and photo evidence to resolve the claim fairly within 24 hours.</dd>
          </dl>
        </section>

        <nav>
          <p>Explore: <a href="/for-buyers">Buyer Guide</a> | <a href="/for-sellers">Seller Guide</a> | <a href="/contact">Contact Support</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/contact',
    outputPath: 'contact/index.html',
    title: "Contact HendAxis Trust Support | HendAxis Trust",
    description: "Get in touch with the HendAxis Trust team for transaction assistance, dispute support, seller verification, and partnership inquiries.",
    canonical: `${BASE_URL}/contact`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Contact Customer Support & Compliance",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Contact HendAxis Trust Support</h1>
          <p>Get in touch with our dedicated support team in Accra, Ghana for assistance with escrow transactions, dispute arbitration, seller verification, or developer integrations.</p>
        </header>

        <section>
          <h2>Support Channels</h2>
          <ul>
            <li><strong>Customer Support Email:</strong> support@trust.hendaxis.com</li>
            <li><strong>Dispute & Arbitration Desk:</strong> disputes@trust.hendaxis.com</li>
            <li><strong>Developer & API Support:</strong> developers@trust.hendaxis.com</li>
            <li><strong>Location:</strong> Accra, Greater Accra Region, Ghana</li>
            <li><strong>Operating Hours:</strong> Monday – Saturday: 8:00 AM – 8:00 PM GMT</li>
          </ul>
        </section>

        <nav>
          <p>Quick Links: <a href="/help">Help Center</a> | <a href="/how-it-works">How It Works</a> | <a href="/trust-center">Trust Center</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/shops',
    outputPath: 'shops/index.html',
    title: "Verified Sellers & Storefront Directory | HendAxis Trust",
    description: "Explore verified social commerce sellers and registered businesses protected by HendAxis Trust escrow in Ghana.",
    canonical: `${BASE_URL}/shops`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Verified Sellers & Social Commerce Directory",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Verified Escrow Sellers & Marketplace Directory in Ghana</h1>
          <p>Explore verified social commerce merchants, boutique shops, and verified businesses across Ghana protected by HendAxis Trust buyer escrow.</p>
        </header>

        <section>
          <h2>Shop Confidently from Verified Merchants</h2>
          <p>Every seller in our directory has completed Ghana Card identity verification. When you purchase from these stores, your money is held in escrow until your package arrives safely.</p>
          <ul>
            <li>Electronics, Gadgets & Smartphones</li>
            <li>Fashion, Apparel & Footwear</li>
            <li>Beauty, Skincare & Cosmetics</li>
            <li>Home Essentials & Groceries</li>
            <li>Automotive & Vehicle Spare Parts</li>
          </ul>
        </section>

        <nav>
          <p>Explore: <a href="/for-buyers">Buyer Protection</a> | <a href="/for-sellers">Become a Verified Seller</a> | <a href="/how-it-works">How It Works</a></p>
        </nav>
      </main>
    `
  },
  {
    path: '/reviews',
    outputPath: 'reviews/index.html',
    title: "Customer Reviews & Verified Experiences | HendAxis Trust",
    description: "Read real reviews and verified escrow transaction experiences from online buyers and sellers across Ghana.",
    canonical: `${BASE_URL}/reviews`,
    ogImage: `${BASE_URL}/assets/hero_banner.jpg`,
    heading: "Customer Reviews & Verified Experiences",
    htmlContent: `
      <main class="seo-crawler-content">
        <header>
          <h1>Customer Reviews & Verified Escrow Experiences</h1>
          <p>Read authentic testimonials and verified escrow transaction reviews from buyers, social merchants, and couriers using HendAxis Trust across Ghana.</p>
        </header>

        <section>
          <h2>Trusted by Thousands of Buyers & Sellers</h2>
          <p>Over 10,000 successful transactions protected with zero buyer fund loss and instant seller payouts.</p>
        </section>

        <nav>
          <p>Links: <a href="/for-buyers">For Buyers</a> | <a href="/for-sellers">For Sellers</a> | <a href="/shops">Verified Shops</a></p>
        </nav>
      </main>
    `
  }
];

function generateStaticHtml(templateHtml, route) {
  let html = templateHtml;

  // 1. Replace Title Tag
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${route.title}</title>`);
  html = html.replace(/<meta\s+name=["']title["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="title" content="${route.title}" />`);

  // 2. Replace Description Meta Tag
  html = html.replace(/<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="description" content="${route.description}" />`);

  // 3. Replace Canonical Link
  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i, `<link rel="canonical" href="${route.canonical}" />`);

  // 4. Replace Open Graph Tags
  html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta property="og:title" content="${route.title}" />`);
  html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta property="og:description" content="${route.description}" />`);
  html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta property="og:url" content="${route.canonical}" />`);
  if (route.ogImage) {
    html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta property="og:image" content="${route.ogImage}" />`);
  }

  // 5. Replace Twitter Tags
  html = html.replace(/<meta\s+name=["']twitter:title["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="twitter:title" content="${route.title}" />`);
  html = html.replace(/<meta\s+name=["']twitter:description["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="twitter:description" content="${route.description}" />`);
  html = html.replace(/<meta\s+name=["']twitter:url["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="twitter:url" content="${route.canonical}" />`);
  if (route.ogImage) {
    html = html.replace(/<meta\s+name=["']twitter:image["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="twitter:image" content="${route.ogImage}" />`);
  }

  // 6. Inject Schema.org WebPage JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": route.title,
    "description": route.description,
    "url": route.canonical,
    "publisher": {
      "@type": "Organization",
      "name": "HendAxis Trust",
      "url": BASE_URL,
      "logo": `${BASE_URL}/favicon.svg`
    }
  };
  const jsonLdScript = `\n    <script type="application/ld+json" id="json-ld-schema">${JSON.stringify(jsonLd)}</script>`;
  
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${jsonLdScript}\n  </head>`);
  }

  // 7. Inject Semantic Pre-render Content into <div id="root"></div>
  // This ensures crawlers (Googlebot, Bing, curl) receive rich semantic HTML text, headings, and links immediately.
  // When React client JS initializes, React mounts and takes over rendering.
  const rootReplacement = `<div id="root">${route.htmlContent}</div>`;
  html = html.replace(/<div\s+id=["']root["']\s*>[\s\S]*?<\/div>/i, rootReplacement);

  return html;
}

async function main() {
  const templatePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error(`[generate-routes-seo] Error: dist/index.html not found at ${templatePath}. Run vite build first.`);
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  console.log(`[generate-routes-seo] Generating ${routes.length} pre-rendered static route HTML files...`);

  for (const route of routes) {
    const targetFile = path.join(DIST_DIR, route.outputPath);
    const targetDir = path.dirname(targetFile);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const staticHtml = generateStaticHtml(templateHtml, route);
    fs.writeFileSync(targetFile, staticHtml, 'utf8');
    console.log(`  ✓ Generated: ${route.outputPath} (${route.canonical}) -> ${route.title}`);
  }

  console.log('[generate-routes-seo] All route SEO files generated successfully!');
}

main().catch(err => {
  console.error('[generate-routes-seo] Fatal error:', err);
  process.exit(1);
});
