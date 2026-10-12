import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Terminal, Key, Webhook, Copy, Check, 
  ArrowRight, Layers, Server, ShieldCheck, 
  CheckCircle2, Zap
} from 'lucide-react';

import SEOHead from '../components/SEOHead';

type LangTab = 'CURL' | 'NODE' | 'PYTHON' | 'PHP';
type EndpointAction = 'CREATE_ORDER' | 'GET_STATUS' | 'DISPATCH' | 'CONFIRM_DELIVERY' | 'CANCEL_ORDER' | 'CREATE_LINK' | 'MERCHANT_ACCOUNT' | 'PING';
type WebhookLang = 'NODE' | 'PYTHON' | 'PHP' | 'GO';

export default function DeveloperView() {
  const [lang, setLang] = useState<LangTab>('CURL');
  const [action, setAction] = useState<EndpointAction>('CREATE_ORDER');
  const [webhookLang, setWebhookLang] = useState<WebhookLang>('NODE');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ─── Dynamic Code Generator Snippets ─────────────────────────────────────────

  const getCodeSnippet = () => {
    switch (action) {
      case 'CREATE_ORDER':
        if (lang === 'CURL') {
          return `curl -X POST https://trust.hendaxis.com/api/v1/v1/escrow/create \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "iPhone 15 Pro Max 256GB",
    "price_ghs": 14500.00,
    "shipping_fee_ghs": 50.00,
    "fee_handling": "PASS_TO_BUYER",
    "description": "Brand new sealed in box, natural titanium",
    "buyer_name": "Kofi Mensah",
    "buyer_email": "kofi@example.com",
    "buyer_phone": "0241234567",
    "shipping_address": "House 14, Ring Road East, Osu, Accra",
    "custom_order_reference": "WC-10492"
  }'`;
        } else if (lang === 'NODE') {
          return `const axios = require('axios');

async function createEscrowOrder() {
  try {
    const { data } = await axios.post(
      'https://trust.hendaxis.com/api/v1/v1/escrow/create',
      {
        title: 'iPhone 15 Pro Max 256GB',
        price_ghs: 14500.00,
        shipping_fee_ghs: 50.00,
        fee_handling: 'PASS_TO_BUYER',
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

    console.log('Escrow Reference:', data.escrow_reference);
    console.log('Customer Checkout URL:', data.checkout_url);
    return data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
}`;
        } else if (lang === 'PYTHON') {
          return `import os
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
        "fee_handling": "PASS_TO_BUYER",
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
        } else {
          return `<?php
$secret_key = getenv('HENDAXIS_SECRET_KEY');

$payload = [
    'title' => 'iPhone 15 Pro Max 256GB',
    'price_ghs' => 14500.00,
    'shipping_fee_ghs' => 50.00,
    'fee_handling' => 'PASS_TO_BUYER',
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
        }

      case 'GET_STATUS':
        if (lang === 'CURL') {
          return `curl -X GET https://trust.hendaxis.com/api/v1/v1/escrow/DEV-A1B2C3D4 \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here"`;
        } else if (lang === 'NODE') {
          return `const axios = require('axios');

async function getOrderStatus(referenceOrId) {
  const { data } = await axios.get(
    \`https://trust.hendaxis.com/api/v1/v1/escrow/\${referenceOrId}\`,
    {
      headers: { 'X-HendAxis-Secret-Key': process.env.HENDAXIS_SECRET_KEY }
    }
  );
  console.log('Order Status:', data.status_label);
  console.log('Tracking Info:', data.tracking_number, data.courier_name);
  return data;
}`;
        } else if (lang === 'PYTHON') {
          return `import requests

def get_order_status(reference_or_id):
    url = f"https://trust.hendaxis.com/api/v1/v1/escrow/{reference_or_id}"
    headers = {"X-HendAxis-Secret-Key": os.getenv("HENDAXIS_SECRET_KEY")}
    res = requests.get(url, headers=headers)
    return res.json()`;
        } else {
          return `<?php
$ch = curl_init('https://trust.hendaxis.com/api/v1/v1/escrow/DEV-A1B2C3D4');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['X-HendAxis-Secret-Key: ' . getenv('HENDAXIS_SECRET_KEY')]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = json_decode(curl_exec($ch), true);
curl_close($ch);
print_r($res);
?>`;
        }

      case 'DISPATCH':
        if (lang === 'CURL') {
          return `curl -X POST https://trust.hendaxis.com/api/v1/v1/escrow/DEV-A1B2C3D4/dispatch \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "delivery_method": "COURIER_API",
    "courier_name": "Speedaf Express",
    "carrier_code": "SPEEDAF",
    "tracking_number": "SP-99281726",
    "carrier_tracking_url": "https://speedaf.com/track/SP-99281726"
  }'`;
        } else if (lang === 'NODE') {
          return `const axios = require('axios');

async function dispatchEscrowOrder(orderRef) {
  const { data } = await axios.post(
    \`https://trust.hendaxis.com/api/v1/v1/escrow/\${orderRef}/dispatch\`,
    {
      delivery_method: 'COURIER_API',
      courier_name: 'Speedaf Express',
      tracking_number: 'SP-99281726',
      carrier_tracking_url: 'https://speedaf.com/track/SP-99281726'
    },
    {
      headers: {
        'X-HendAxis-Secret-Key': process.env.HENDAXIS_SECRET_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
  console.log('Order status updated to:', data.status);
  return data;
}`;
        } else if (lang === 'PYTHON') {
          return `import requests

def dispatch_order(order_ref):
    url = f"https://trust.hendaxis.com/api/v1/v1/escrow/{order_ref}/dispatch"
    payload = {
        "delivery_method": "COURIER_API",
        "courier_name": "Speedaf Express",
        "tracking_number": "SP-99281726",
        "carrier_tracking_url": "https://speedaf.com/track/SP-99281726"
    }
    headers = {"X-HendAxis-Secret-Key": os.getenv("HENDAXIS_SECRET_KEY")}
    return requests.post(url, json=payload, headers=headers).json()`;
        } else {
          return `<?php
$payload = [
    'delivery_method' => 'COURIER_API',
    'courier_name' => 'Speedaf Express',
    'tracking_number' => 'SP-99281726'
];
$ch = curl_init('https://trust.hendaxis.com/api/v1/v1/escrow/DEV-A1B2C3D4/dispatch');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-HendAxis-Secret-Key: ' . getenv('HENDAXIS_SECRET_KEY'),
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = json_decode(curl_exec($ch), true);
curl_close($ch);
?>`;
        }

      case 'CONFIRM_DELIVERY':
        return `curl -X POST https://trust.hendaxis.com/api/v1/v1/escrow/DEV-A1B2C3D4/confirm-delivery \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here"`;

      case 'CANCEL_ORDER':
        return `curl -X POST https://trust.hendaxis.com/api/v1/v1/escrow/DEV-A1B2C3D4/cancel \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"reason": "Buyer requested cancellation before payment"}'`;

      case 'CREATE_LINK':
        return `curl -X POST https://trust.hendaxis.com/api/v1/v1/links/create \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Custom Ceramic Mug Set",
    "price_ghs": 350.00,
    "shipping_fee_ghs": 25.00,
    "fee_handling": "PASS_TO_BUYER",
    "description": "Handmade ceramic mug set with custom initials"
  }'`;

      case 'MERCHANT_ACCOUNT':
        return `curl -X GET https://trust.hendaxis.com/api/v1/v1/merchant/account \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here"`;

      case 'PING':
        return `curl -X GET https://trust.hendaxis.com/api/v1/v1/ping \\
  -H "X-HendAxis-Secret-Key: sk_live_your_secret_key_here"`;
    }
  };

  const sampleJsonResponses = {
    CREATE_ORDER: `{
  "transaction_id": "019488a0-2f92-7100-b6f1-e7a9b0c20188",
  "escrow_reference": "DEV-E7A9B0C2",
  "checkout_url": "https://trust.hendaxis.com/l/019488a0-2f92-7100-b6f1-e7a9b0c20188?reference=DEV-E7A9B0C2",
  "embed_url": "https://trust.hendaxis.com/l/embed?pk=pk_live_...&ref=DEV-E7A9B0C2",
  "title": "iPhone 15 Pro Max 256GB",
  "price_ghs": 14500.00,
  "shipping_fee_ghs": 50.00,
  "platform_fee_ghs": 228.25,
  "total_amount_ghs": 14778.25,
  "fee_handling": "PASS_TO_BUYER",
  "status": "AWAITING_PAYMENT",
  "status_label": "Awaiting Payment",
  "custom_order_reference": "WC-10492",
  "created_at": "2026-10-11T02:15:30Z"
}`,
    GET_STATUS: `{
  "transaction_id": "019488a0-2f92-7100-b6f1-e7a9b0c20188",
  "escrow_reference": "DEV-E7A9B0C2",
  "status": "DELIVERY_IN_PROGRESS",
  "status_label": "In Transit / Dispatched",
  "title": "iPhone 15 Pro Max 256GB",
  "price_ghs": 14500.00,
  "shipping_fee_ghs": 50.00,
  "platform_fee_ghs": 228.25,
  "total_amount_ghs": 14778.25,
  "fee_handling": "PASS_TO_BUYER",
  "delivery_method": "COURIER_API",
  "courier_name": "Speedaf Express",
  "carrier_code": "SPEEDAF",
  "tracking_number": "SP-99281726",
  "carrier_tracking_url": "https://speedaf.com/track/SP-99281726",
  "dispatched_at": "2026-10-11T02:20:00Z",
  "delivered_at": null,
  "inspection_starts_at": null,
  "inspection_period_hours": 48,
  "is_disputed": false,
  "created_at": "2026-10-11T02:15:30Z"
}`
  };

  const sdkEmbedCode = `<!-- 1. Include HendAxis Drop-in SDK Script -->
<script src="https://trust.hendaxis.com/sdk.js"></script>

<!-- 2. Trigger Escrow Modal Checkout with 1 Simple JS Call -->
<button onclick="payWithHendAxis()">Pay with HendAxis Escrow</button>

<script>
function payWithHendAxis() {
  HendAxis.pay({
    publicKey: 'pk_live_your_public_key_here',
    amount: 14500.00,
    shipping: 50.00,
    feeHandling: 'PASS_TO_BUYER',
    title: 'iPhone 15 Pro Max 256GB',
    buyerEmail: 'kofi@example.com',
    buyerPhone: '0241234567',
    buyerName: 'Kofi Mensah',
    shippingAddress: 'House 14, Ring Road East, Osu, Accra',
    customRef: 'WC-10492',
    theme: 'dark', // 'light' | 'dark' | 'auto'
    onSuccess: function(transaction) {
      console.log('Escrow Deposit Secured! Tx Reference:', transaction.escrow_reference);
      window.location.href = '/checkout/success?ref=' + transaction.escrow_reference;
    },
    onClose: function() {
      console.log('Customer closed checkout modal');
    },
    onError: function(err) {
      console.error('Checkout error:', err);
    }
  });
}
</script>`;

  const getWebhookVerifySnippet = () => {
    switch (webhookLang) {
      case 'NODE':
        return `const crypto = require('crypto');

function verifyHendAxisWebhook(req) {
  const signatureHeader = req.headers['x-hendaxis-signature'];
  if (!signatureHeader) return false;

  // Header format: t=1724712000,v1=9f86d...
  const parts = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !signature) return false;

  // Mitigate replay attacks: Reject payloads older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const payload = JSON.stringify(req.body);
  const signedPayload = \`\${timestamp}.\${payload}\`;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.HENDAXIS_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}`;

      case 'PYTHON':
        return `import hmac
import hashlib
import time

def verify_hendaxis_webhook(payload_bytes: bytes, signature_header: str, webhook_secret: str) -> bool:
    if not signature_header:
        return False

    header_dict = dict(item.split("=") for item in signature_header.split(","))
    timestamp = header_dict.get("t")
    signature = header_dict.get("v1")

    if not timestamp or not signature:
        return False

    # Check timestamp freshness (5 min tolerance)
    if abs(int(time.time()) - int(timestamp)) > 300:
        return False

    signed_payload = f"{timestamp}.".encode("utf-8") + payload_bytes
    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        signed_payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)`;

      case 'PHP':
        return `<?php
function verify_hendaxis_webhook($raw_body, $signature_header, $webhook_secret) {
    if (empty($signature_header)) return false;

    parse_str(str_replace(',', '&', $signature_header), $headers);
    $timestamp = $headers['t'] ?? null;
    $signature = $headers['v1'] ?? null;

    if (!$timestamp || !$signature) return false;

    if (abs(time() - intval($timestamp)) > 300) return false;

    $signed_payload = $timestamp . '.' . $raw_body;
    $expected_signature = hash_hmac('sha256', $signed_payload, $webhook_secret);

    return hash_equals($signature, $expected_signature);
}
?>`;

      case 'GO':
        return `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"
)

func VerifyHendAxisWebhook(body []byte, sigHeader string, secret string) bool {
	var timestamp, signature string
	for _, part := range strings.Split(sigHeader, ",") {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) == 2 {
			if kv[0] == "t" { timestamp = kv[1] }
			if kv[0] == "v1" { signature = kv[1] }
		}
	}
	if timestamp == "" || signature == "" { return false }

	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil || time.Since(time.Unix(ts, 0)).Abs() > 5*time.Minute { return false }

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fmt.Sprintf("%s.%s", timestamp, string(body))))
	expected := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expected))
}`;
    }
  };

  const developerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    'headline': 'HendAxis Trust Developer APIs, SDK & Webhook Documentation',
    'description': 'Accept escrow payments, manage dispatch logistics, trigger checkout modals, and verify HMAC webhooks with HendAxis API.',
    'url': 'https://trust.hendaxis.com/developers'
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <SEOHead
        title="Developer Hub & Escrow API Reference | HendAxis Trust"
        description="Integrate HendAxis Trust escrow checkout, logistics tracking, and real-time webhooks into your e-commerce store or marketplace."
        canonicalUrl="https://trust.hendaxis.com/developers"
        jsonLd={developerJsonLd}
      />

      <div className="max-w-6xl mx-auto space-y-10">

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-300 backdrop-blur-md">
              <Terminal className="h-4 w-4 text-emerald-400" /> Developer Hub & REST API v1.2.0
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Embed Trust & Escrow into Any E-Commerce Experience
            </h1>
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
              Programmatically create escrow orders, query courier tracking, handle automated dispatch, and receive HMAC-signed webhook events across your custom store, Shopify, WooCommerce, or mobile application.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Link
                to="/dashboard/developer"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-blue-600/30 transition flex items-center gap-2 group"
              >
                <Key className="h-4 w-4 text-blue-200 group-hover:rotate-12 transition-transform" /> 
                Get API Keys in Merchant Portal <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#quickstart"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm backdrop-blur-md border border-white/20 transition flex items-center gap-2"
              >
                <Zap className="h-4 w-4 text-amber-400" /> Interactive Quickstart
              </a>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Drop-in JS SDK</h3>
            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
              Add a 2-line snippet to trigger responsive escrow modal checkouts with built-in buyer verification and payment callbacks.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
              <Server className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">REST API (`v1`)</h3>
            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
              Create orders, manage logistics dispatch (Speedaf, Fez, Ghana Post, Bus Transport), trigger inspections, and query balances.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-800/80 space-y-3 relative overflow-hidden group hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold">
              <Webhook className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">HMAC Webhooks</h3>
            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
              Receive instant SHA-256 HMAC-signed webhooks whenever funds are deposited, orders are dispatched, or payouts are released.
            </p>
          </div>
        </div>

        {/* Section 1: Interactive REST API Code Generator */}
        <div id="quickstart" className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">API Explorer & Code Generator</span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">Interactive API Request Generator</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Select an operation and programming language to copy drop-in code snippets.</p>
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

          {/* Action Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'CREATE_ORDER', label: '1. Create Escrow Order', method: 'POST' },
              { id: 'GET_STATUS', label: '2. Query Order Status', method: 'GET' },
              { id: 'DISPATCH', label: '3. Dispatch Courier', method: 'POST' },
              { id: 'CONFIRM_DELIVERY', label: '4. Confirm Delivery', method: 'POST' },
              { id: 'CANCEL_ORDER', label: '5. Cancel Order', method: 'POST' },
              { id: 'CREATE_LINK', label: '6. Create Payment Link', method: 'POST' },
              { id: 'MERCHANT_ACCOUNT', label: '7. Merchant Account', method: 'GET' },
              { id: 'PING', label: '8. Ping Health', method: 'GET' },
            ].map(a => (
              <button
                key={a.id}
                onClick={() => setAction(a.id as EndpointAction)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                  action === a.id
                    ? 'bg-slate-900 dark:bg-slate-800 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${a.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {a.method}
                </span>
                {a.label}
              </button>
            ))}
          </div>

          {/* Code Container */}
          <div className="relative bg-slate-950 rounded-2xl p-4 sm:p-6 overflow-x-auto border border-slate-800 text-slate-100 font-mono text-xs shadow-inner">
            <button
              onClick={() => copyToClipboard(getCodeSnippet(), 'api_code')}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 !text-white px-3 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm z-10"
            >
              {copiedCode === 'api_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
              <span className="!text-white">{copiedCode === 'api_code' ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <pre className="pr-24 whitespace-pre-wrap leading-relaxed">{getCodeSnippet()}</pre>
          </div>

          {/* Sample JSON Response Preview */}
          {sampleJsonResponses[action as keyof typeof sampleJsonResponses] && (
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Sample Response Body (200 OK)
              </span>
              <div className="relative bg-slate-950/80 rounded-2xl p-4 overflow-x-auto border border-slate-800/80 text-emerald-400 font-mono text-xs">
                <pre className="whitespace-pre-wrap">{sampleJsonResponses[action as keyof typeof sampleJsonResponses]}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Drop-in JS SDK Embed */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Client-Side Checkout Modal</span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">Drop-in JavaScript SDK Embed</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Embed a seamless escrow checkout modal with buyer payment authorization directly inside your frontend using your Public Key (`pk_...`).</p>
            </div>
          </div>

          <div className="relative bg-slate-950 rounded-2xl p-4 sm:p-6 overflow-x-auto border border-slate-800 text-slate-100 font-mono text-xs shadow-inner">
            <button
              onClick={() => copyToClipboard(sdkEmbedCode, 'sdk_code')}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 !text-white px-3 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm z-10"
            >
              {copiedCode === 'sdk_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
              <span className="!text-white">{copiedCode === 'sdk_code' ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <pre className="pr-24 whitespace-pre-wrap leading-relaxed">{sdkEmbedCode}</pre>
          </div>

          {/* SDK Parameter Options Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3">Option</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Required</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">publicKey</td>
                  <td className="py-2.5 px-3 font-mono text-gray-500">string</td>
                  <td className="py-2.5 px-3 text-red-500 font-bold">Yes</td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300">Your merchant Public API Key (e.g. <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">pk_live_...</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">pk_test_...</code>).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">amount / price</td>
                  <td className="py-2.5 px-3 font-mono text-gray-500">number</td>
                  <td className="py-2.5 px-3 text-red-500 font-bold">Yes</td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300">Item price in Ghanaian Cedi (GHS).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">shipping</td>
                  <td className="py-2.5 px-3 font-mono text-gray-500">number</td>
                  <td className="py-2.5 px-3 text-gray-400">Optional</td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300">Shipping or dispatch fee (defaults to 0.00).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">feeHandling</td>
                  <td className="py-2.5 px-3 font-mono text-gray-500">string</td>
                  <td className="py-2.5 px-3 text-gray-400">Optional</td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300"><code className="font-mono">PASS_TO_BUYER</code> (default) or <code className="font-mono">ABSORB_FEE</code>.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">customRef</td>
                  <td className="py-2.5 px-3 font-mono text-gray-500">string</td>
                  <td className="py-2.5 px-3 text-gray-400">Optional</td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300">Your custom store order ID (e.g. WooCommerce/Shopify order reference).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">onSuccess(tx)</td>
                  <td className="py-2.5 px-3 font-mono text-gray-500">function</td>
                  <td className="py-2.5 px-3 text-gray-400">Optional</td>
                  <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300">Callback triggered when buyer payment is successfully deposited into escrow.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Webhook Verification & Events */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Security & Verifications</span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-1">Verifying Webhook Signatures</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Every webhook request includes an <code className="font-mono text-indigo-500">X-HendAxis-Signature</code> header computed via HMAC SHA-256 to prevent tampering and spoofing.</p>
            </div>

            {/* Webhook Language Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-800">
              {(['NODE', 'PYTHON', 'PHP', 'GO'] as WebhookLang[]).map(w => (
                <button
                  key={w}
                  onClick={() => setWebhookLang(w)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    webhookLang === w 
                      ? 'bg-indigo-600 !text-white shadow-md shadow-indigo-600/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-slate-950 rounded-2xl p-4 sm:p-6 overflow-x-auto border border-slate-800 text-slate-100 font-mono text-xs shadow-inner">
            <button
              onClick={() => copyToClipboard(getWebhookVerifySnippet(), 'webhook_code')}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 !text-white px-3 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm z-10"
            >
              {copiedCode === 'webhook_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
              <span className="!text-white">{copiedCode === 'webhook_code' ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <pre className="pr-24 whitespace-pre-wrap leading-relaxed">{getWebhookVerifySnippet()}</pre>
          </div>

          {/* Webhook Events Catalog */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-2">
              <Webhook className="h-4 w-4 text-indigo-500" /> Supported Webhook Events
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { event: 'escrow.created', desc: 'Triggered when a new escrow checkout order is initialized via API.' },
                { event: 'escrow.paid', desc: 'Buyer has completed payment. Funds are locked in escrow; ready for dispatch.' },
                { event: 'escrow.dispatched', desc: 'Seller or courier has marked the order as dispatched with tracking.' },
                { event: 'escrow.delivered', desc: 'Package delivered to buyer; 48-hour inspection countdown initiated.' },
                { event: 'escrow.inspection_started', desc: 'Inspection period is active for buyer acceptance.' },
                { event: 'escrow.completed', desc: 'Escrow released! Payout transferred to merchant wallet.' },
                { event: 'escrow.disputed', desc: 'Buyer opened a formal inspection dispute with photo evidence.' },
                { event: 'escrow.cancelled', desc: 'Unpaid order cancelled by buyer or merchant.' },
                { event: 'test.event', desc: 'Simulated test ping triggered from Merchant Developer Portal.' },
              ].map(e => (
                <div key={e.event} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">{e.event}</div>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">{e.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Full REST API Endpoints Matrix */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-slate-100">REST API Endpoints Reference</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Base URL: <code className="font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-blue-600 dark:text-blue-400">https://trust.hendaxis.com/api/v1/v1</code>
            </p>
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
                  <td className="py-3 px-4 font-bold text-emerald-600">POST</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow/create</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Initializes escrow order link and returns checkout & embed URLs.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-blue-600">GET</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow/{'{id_or_ref}'}</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Queries real-time status, tracking info, delivery logs, and inspection countdown.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-blue-600">GET</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Lists all merchant escrow transactions with status filtering & search.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-amber-600">POST</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow/{'{id}'}/dispatch</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Marks order as dispatched via Courier API or Informal Bus transport.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-emerald-600">POST</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow/{'{id}'}/confirm-delivery</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Confirms package arrival and starts the 48-hour buyer inspection period.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-rose-600">POST</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/escrow/{'{id}'}/cancel</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Cancels an unpaid escrow order and frees allocated references.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-emerald-600">POST</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/links/create</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Creates reusable or single-use payment link for social or catalog sales.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-blue-600">GET</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/merchant/account</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Returns merchant verified badge, escrow volumes, rating & wallet balances.</td>
                </tr>
                <tr className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-blue-600">GET</td>
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-slate-100">/ping</td>
                  <td className="py-3 px-4 font-mono text-gray-500">X-HendAxis-Secret-Key</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-slate-300">Verifies API key credentials, environment (<code className="font-mono">LIVE</code> or <code className="font-mono">TEST</code>), and server latency.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Environments & Sandbox Testing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-500">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">API Key Environments</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Separate credentials for development and live production.</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>Test Mode</strong>: Prefix <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-500">pk_test_...</code> / <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-500">sk_test_...</code> for simulated mock payments without real charges.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Live Mode</strong>: Prefix <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-500">pk_live_...</code> / <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-500">sk_live_...</code> processes real Mobile Money & Card escrow transactions.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 rounded-xl text-purple-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Security & Best Practices</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Safeguard secret keys and customer data.</p>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <span><strong>Never expose Secret Keys</strong> in client-side HTML or frontend JS. Only use <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">pk_...</code> in browser code.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <span><strong>Always verify HMAC signatures</strong> on your webhook endpoint before fulfilling or shipping orders.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-10 border border-slate-800 text-center text-white space-y-4 shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-black">Ready to Start Building?</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Generate your API Keys, configure webhook listening endpoints, and test payload deliveries inside the Merchant Developer Portal.
          </p>
          <div className="pt-2 flex justify-center">
            <Link
              to="/dashboard/developer"
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-sm shadow-xl shadow-blue-600/30 transition flex items-center gap-2"
            >
              <Key className="h-4 w-4" /> Open Merchant Developer Portal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
