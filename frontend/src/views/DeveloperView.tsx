import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Terminal, Key, Webhook, Copy, Check, 
  ArrowRight, Layers, Server
} from 'lucide-react';

import SEOHead from '../components/SEOHead';

type LangTab = 'CURL' | 'NODE' | 'PYTHON' | 'PHP';

export default function DeveloperView() {
  const [lang, setLang] = useState<LangTab>('CURL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const curlCode = `curl -X POST https://trust.hendaxis.com/api/v1/v1/escrow/create \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "iPhone 15 Pro Max 256GB",
    "price_ghs": 14500.00,
    "shipping_fee_ghs": 50.00,
    "description": "Brand new sealed in box",
    "buyer_name": "Kofi Mensah",
    "buyer_email": "kofi@example.com",
    "buyer_phone": "0241234567",
    "shipping_address": "House 14, Ring Road East, Osu, Accra",
    "custom_order_reference": "WC-10492"
  }'`;

  const nodeCode = `const axios = require('axios');

async function createEscrowOrder() {
  try {
    const response = await axios.post(
      'https://trust.hendaxis.com/api/v1/v1/escrow/create',
      {
        title: 'iPhone 15 Pro Max 256GB',
        price_ghs: 14500.00,
        shipping_fee_ghs: 50.00,
        buyer_name: 'Kofi Mensah',
        buyer_email: 'kofi@example.com',
        buyer_phone: '0241234567',
        shipping_address: 'House 14, Ring Road East, Osu, Accra',
        custom_order_reference: 'WC-10492'
      },
      {
        headers: {
          'X-HendAxis-Secret-Key': process.env.HENDAXIS_SECRET_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Escrow Checkout URL:', response.data.checkout_url);
    console.log('Transaction ID:', response.data.transaction_id);
    return response.data;
  } catch (error) {
    console.error('HendAxis API Error:', error.response?.data || error.message);
  }
}`;

  const pythonCode = `import os
import requests

def create_escrow_order():
    url = "https://trust.hendaxis.com/api/v1/v1/escrow/create"
    headers = {
        "X-HendAxis-Secret-Key": os.getenv("HENDAXIS_SECRET_KEY"),
        "Content-Type": "application/json"
    }
    payload = {
        "title": "iPhone 15 Pro Max 256GB",
        "price_ghs": 14500.00,
        "shipping_fee_ghs": 50.00,
        "buyer_name": "Kofi Mensah",
        "buyer_email": "kofi@example.com",
        "buyer_phone": "0241234567",
        "shipping_address": "House 14, Ring Road East, Osu, Accra",
        "custom_order_reference": "WC-10492"
    }

    response = requests.post(url, json=payload, headers=headers)
    data = response.json()
    print("Checkout URL:", data.get("checkout_url"))
    return data`;

  const phpCode = `<?php
$secret_key = getenv('HENDAXIS_SECRET_KEY');

$payload = [
    'title' => 'iPhone 15 Pro Max 256GB',
    'price_ghs' => 14500.00,
    'shipping_fee_ghs' => 50.00,
    'buyer_name' => 'Kofi Mensah',
    'buyer_email' => 'kofi@example.com',
    'buyer_phone' => '0241234567',
    'shipping_address' => 'House 14, Ring Road East, Osu, Accra',
    'custom_order_reference' => 'WC-10492'
];

$ch = curl_init('https://trust.hendaxis.com/api/v1/v1/escrow/create');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-HendAxis-Secret-Key: ' . $secret_key,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
header('Location: ' . $result['checkout_url']);
exit;
?>`;

  const sdkEmbedCode = `<!-- 1. Include HendAxis Drop-in SDK Script -->
<script src="https://trust.hendaxis.com/sdk.js"></script>

<!-- 2. Trigger Escrow Modal Checkout with 2 Lines of JS -->
<button onclick="payWithHendAxis()">Pay via HendAxis Escrow</button>

<script>
function payWithHendAxis() {
  HendAxis.pay({
    publicKey: 'pk_live_your_public_key_here',
    amount: 14500.00,
    shipping: 50.00,
    title: 'iPhone 15 Pro Max 256GB',
    buyerEmail: 'kofi@example.com',
    buyerPhone: '0241234567',
    onSuccess: function(transaction) {
      alert('Payment successful! Reference: ' + transaction.escrow_reference);
    },
    onClose: function() {
      console.log('Customer closed checkout modal');
    }
  });
}
</script>`;

  const webhookVerifyCode = `const crypto = require('crypto');

function verifyHendAxisWebhook(req) {
  const signatureHeader = req.headers['x-hendaxis-signature'];
  if (!signatureHeader) return false;

  // Format: t=1724712000,v1=9f86d...
  const parts = signatureHeader.split(',');
  const timestamp = parts[0].split('=')[1];
  const signature = parts[1].split('=')[1];

  const payload = JSON.stringify(req.body);
  const signedPayload = \`\${timestamp}.\${payload}\`;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.HENDAXIS_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}`;

  const developerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    'headline': 'HendAxis Trust Developer APIs & Drop-in SDK Documentation',
    'description': 'Accept escrow payments, trigger checkout modals, manage courier webhooks, and verify signatures with HendAxis API.',
    'url': 'https://trust.hendaxis.com/developers'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <SEOHead
        title="Developer APIs & Drop-in SDK Documentation — HendAxis Trust"
        description="Integrate buyer-seller escrow payments, webhooks, and instant Mobile Money payouts into any website or app using HendAxis REST APIs and JS SDK."
        canonicalUrl="https://trust.hendaxis.com/developers"
        jsonLd={developerJsonLd}
      />
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-300 backdrop-blur-md">
              <Terminal className="h-4 w-4 text-emerald-400" /> HendAxis Developer APIs & SDK Reference
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Integrate HendAxis Escrow into Any Application
            </h1>
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
              Accept escrow payments, manage dispatch logistics, and receive real-time webhooks on your custom e-commerce website, mobile app, or Shopify/WooCommerce store.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                to="/dashboard/developer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-blue-600/30 transition flex items-center gap-2"
              >
                <Key className="h-4 w-4" /> Get API Keys in Merchant Portal <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#quickstart"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm backdrop-blur-md border border-white/20 transition"
              >
                Explore Quickstart
              </a>
            </div>
          </div>
        </div>

        {/* Key Features Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Drop-in JS SDK</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Add a single line of JavaScript to open an embedded iframe escrow checkout modal directly on your storefront.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
              <Server className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">REST API (`v1`)</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Create escrow orders, query order inspection status, and trigger courier dispatches programmatically via HTTP.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold">
              <Webhook className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">HMAC Webhooks</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Receive SHA-256 HMAC signed events on your server whenever buyer payments are confirmed, dispatched, or completed.
            </p>
          </div>
        </div>

        {/* Section 1: Server-to-Server API Integration */}
        <div id="quickstart" className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Method 1 — Server-to-Server</span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">Create Escrow Order via REST API</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Send a POST request with your Secret API Key (`X-HendAxis-Secret-Key`).</p>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-800">
              {(['CURL', 'NODE', 'PYTHON', 'PHP'] as LangTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setLang(t)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    lang === t 
                      ? 'bg-blue-600 !text-white shadow-md shadow-blue-600/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Code Container */}
          <div className="relative bg-slate-950 rounded-2xl p-4 sm:p-6 overflow-x-auto border border-slate-800 text-slate-100 font-mono text-xs shadow-inner">
            <button
              onClick={() => copyToClipboard(
                lang === 'CURL' ? curlCode : lang === 'NODE' ? nodeCode : lang === 'PYTHON' ? pythonCode : phpCode,
                'api_code'
              )}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 !text-white px-3 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm"
            >
              {copiedCode === 'api_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
              <span className="!text-white">{copiedCode === 'api_code' ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <pre className="pr-20 whitespace-pre-wrap">
              {lang === 'CURL' && curlCode}
              {lang === 'NODE' && nodeCode}
              {lang === 'PYTHON' && pythonCode}
              {lang === 'PHP' && phpCode}
            </pre>
          </div>
        </div>

        {/* Section 2: Drop-in JS SDK Embed */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Method 2 — Client-Side Embed</span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">Drop-in JavaScript SDK Modal</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Embed an instant HendAxis Escrow Modal checkout directly on your website using your Public Key (`pk_...`).</p>
            </div>
          </div>

          <div className="relative bg-slate-950 rounded-2xl p-4 sm:p-6 overflow-x-auto border border-slate-800 text-slate-100 font-mono text-xs shadow-inner">
            <button
              onClick={() => copyToClipboard(sdkEmbedCode, 'sdk_code')}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 !text-white px-3 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm"
            >
              {copiedCode === 'sdk_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
              <span className="!text-white">{copiedCode === 'sdk_code' ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <pre className="pr-20 whitespace-pre-wrap">{sdkEmbedCode}</pre>
          </div>
        </div>

        {/* Section 3: Webhook Verification & Security */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Security & Verifications</span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">Verifying Webhook Signatures</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Every webhook includes an `X-HendAxis-Signature` header computed via HMAC SHA-256 to prevent payload spoofing.</p>
            </div>
          </div>

          <div className="relative bg-slate-950 rounded-2xl p-4 sm:p-6 overflow-x-auto border border-slate-800 text-slate-100 font-mono text-xs shadow-inner">
            <button
              onClick={() => copyToClipboard(webhookVerifyCode, 'webhook_code')}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 !text-white px-3 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm"
            >
              {copiedCode === 'webhook_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
              <span className="!text-white">{copiedCode === 'webhook_code' ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <pre className="pr-20 whitespace-pre-wrap">{webhookVerifyCode}</pre>
          </div>
        </div>

        {/* Section 4: API Endpoint Reference Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100">REST API Endpoints Reference</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Base API URL: <code className="font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400">https://trust.hendaxis.com/api/v1/v1</code></p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Endpoint</th>
                  <th className="py-3 px-4">Auth Header</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3.5 px-4 font-bold text-emerald-600">POST</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow/create</td>
                  <td className="py-3.5 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-slate-300">Creates an escrow transaction link and returns checkout URL.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3.5 px-4 font-bold text-blue-600">GET</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow/{'{id}'}</td>
                  <td className="py-3.5 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-slate-300">Queries real-time status, tracking info, and inspection timeline.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3.5 px-4 font-bold text-amber-600">POST</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow/{'{id}'}/dispatch</td>
                  <td className="py-3.5 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3.5 px-4 text-gray-600 dark:text-slate-300">Programmatically marks an order as dispatched with courier tracking.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
