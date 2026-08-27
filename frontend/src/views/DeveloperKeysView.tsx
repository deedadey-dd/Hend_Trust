import { useState, useEffect } from 'react';
import { 
  Key, Plus, Trash2, Webhook, 
  Send, RefreshCw, Loader2, Code, Terminal, CheckCircle2, X
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useEscapeKey } from '../utils/useEscapeKey';

interface APIKeyItem {
  id: string;
  name: string;
  environment: 'LIVE' | 'TEST';
  public_key: string;
  secret_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  raw_secret_key?: string;
}

interface WebhookItem {
  id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface WebhookLogItem {
  id: string;
  event_type: string;
  response_status?: number;
  response_body?: string;
  delivered_at: string;
  success: boolean;
}

export default function DeveloperKeysView() {
  const [keys, setKeys] = useState<APIKeyItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'KEYS' | 'WEBHOOKS' | 'DOCS'>('KEYS');

  // Key creation modal state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyEnv, setKeyEnv] = useState<'LIVE' | 'TEST'>('TEST');
  const [creatingKey, setCreatingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<APIKeyItem | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);

  // Webhook creation modal state
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [webhookError, setWebhookError] = useState('');

  // Webhook test event state
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEscapeKey(() => {
    setShowKeyModal(false);
    setShowWebhookModal(false);
  }, showKeyModal || showWebhookModal);

  const fetchKeysAndWebhooks = async () => {
    setLoading(true);
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        apiClient.get('/developer/keys'),
        apiClient.get('/developer/webhooks')
      ]);
      setKeys(keysRes.data || []);
      setWebhooks(webhooksRes.data || []);
      if (webhooksRes.data && webhooksRes.data.length > 0) {
        setSelectedWebhookId(webhooksRes.data[0].id);
        fetchWebhookLogs(webhooksRes.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load developer portal settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookLogs = async (webhookId: string) => {
    try {
      const res = await apiClient.get(`/developer/webhooks/${webhookId}/logs`);
      setLogs(res.data || []);
    } catch (err) {
      console.error("Failed to load webhook logs:", err);
    }
  };

  useEffect(() => {
    fetchKeysAndWebhooks();
  }, []);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await apiClient.post('/developer/keys', {
        name: keyName.trim(),
        environment: keyEnv
      });
      setGeneratedKey(res.data);
      setKeys(prev => [res.data, ...prev]);
      setKeyName('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate API Key.');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Any applications using this key will immediately lose access.")) return;
    try {
      await apiClient.delete(`/developer/keys/${keyId}`);
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, is_active: false } : k));
    } catch (err) {
      alert("Failed to revoke API key.");
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookError('');
    setCreatingWebhook(true);
    try {
      const res = await apiClient.post('/developer/webhooks', {
        url: webhookUrl.trim(),
        events: ["escrow.paid", "escrow.dispatched", "escrow.completed", "escrow.disputed", "escrow.refunded"]
      });
      setWebhooks(prev => [res.data, ...prev]);
      setShowWebhookModal(false);
      setWebhookUrl('');
    } catch (err: any) {
      setWebhookError(err.response?.data?.detail || err.response?.data?.message || 'Failed to add Webhook endpoint.');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this Webhook endpoint?")) return;
    try {
      await apiClient.delete(`/developer/webhooks/${webhookId}`);
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
    } catch (err) {
      alert("Failed to delete webhook endpoint.");
    }
  };

  const handleSendTestWebhook = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await apiClient.post('/developer/webhooks/test');
      setTestResult(res.data);
      if (selectedWebhookId) fetchWebhookLogs(selectedWebhookId);
    } catch (err: any) {
      alert("Failed to dispatch test webhook event.");
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-bold text-blue-300 mb-3 backdrop-blur-sm">
                <Code className="h-3.5 w-3.5" /> Merchant API & Developer Portal
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Developer Settings</h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Generate API keys, register real-time webhooks, and integrate HendAxis Escrow into your e-commerce platforms.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/developers"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-sm border border-white/20 transition flex items-center gap-2"
              >
                <Terminal className="h-4 w-4 text-blue-300" /> API Documentation ↗
              </a>
              <button
                onClick={() => { setGeneratedKey(null); setShowKeyModal(true); }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Create API Key
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-8 border-t border-white/10 pt-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('KEYS')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                activeTab === 'KEYS' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Key className="h-4 w-4" /> API Keys ({keys.length})
            </button>
            <button
              onClick={() => setActiveTab('WEBHOOKS')}
              className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                activeTab === 'WEBHOOKS' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Webhook className="h-4 w-4" /> Webhook Endpoints ({webhooks.length})
            </button>
          </div>
        </div>

        {/* Tab 1: API Keys List */}
        {activeTab === 'KEYS' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">API Credentials</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Use Public Keys (`pk_...`) for frontend SDK checkouts and Secret Keys (`sk_...`) for server API calls.</p>
              </div>
              <button
                onClick={fetchKeysAndWebhooks}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-400 dark:text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" /> Loading API Keys...
              </div>
            ) : keys.length === 0 ? (
              <div className="py-12 text-center space-y-3 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                <Key className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">No API Keys Generated Yet</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">Create an API Key pair to integrate HendAxis Escrow into your custom storefront or mobile app.</p>
                <button
                  onClick={() => { setGeneratedKey(null); setShowKeyModal(true); }}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
                >
                  + Generate First API Key
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/40">
                      <th className="py-3 px-4">Name / Identifier</th>
                      <th className="py-3 px-4">Environment</th>
                      <th className="py-3 px-4">Public Key (`pk_...`)</th>
                      <th className="py-3 px-4">Secret Key Prefix</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {keys.map(k => (
                      <tr key={k.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-slate-100">
                          {k.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            k.environment === 'LIVE' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}>
                            {k.environment}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-slate-300 select-all">
                          {k.public_key}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-500 dark:text-slate-400">
                          {k.secret_prefix}
                        </td>
                        <td className="py-3.5 px-4">
                          {k.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Active
                            </span>
                          ) : (
                            <span className="text-red-500 font-bold">Revoked</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {k.is_active && (
                            <button
                              onClick={() => handleRevokeKey(k.id)}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 font-semibold text-xs px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 transition"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Webhooks Management */}
        {activeTab === 'WEBHOOKS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Webhook Endpoints */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Webhook Endpoints</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Receive real-time HMAC SHA-256 signed event notifications on your server.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendTestWebhook}
                    disabled={testingWebhook || webhooks.length === 0}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send Test Webhook
                  </button>
                  <button
                    onClick={() => setShowWebhookModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Endpoint
                  </button>
                </div>
              </div>

              {testResult && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                  <span className="font-bold block">✓ Test Webhook Dispatched</span>
                  <p className="font-mono text-[11px]">Dispatched to {testResult.dispatched} endpoint(s). Check delivery logs below.</p>
                </div>
              )}

              {webhooks.length === 0 ? (
                <div className="py-12 text-center space-y-3 border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl">
                  <Webhook className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto" />
                  <h4 className="text-base font-bold text-gray-900 dark:text-slate-100">No Webhook Endpoints Configured</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">Add your server's Webhook URL to get real-time JSON events when buyer payments are received or dispatched.</p>
                  <button
                    onClick={() => setShowWebhookModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
                  >
                    + Add Webhook Endpoint
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map(wh => (
                    <div
                      key={wh.id}
                      onClick={() => { setSelectedWebhookId(wh.id); fetchWebhookLogs(wh.id); }}
                      className={`p-4 rounded-2xl border transition cursor-pointer ${
                        selectedWebhookId === wh.id
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-sm text-gray-900 dark:text-slate-100 block break-all">
                            {wh.url}
                          </span>
                          <span className="text-[11px] font-mono text-gray-500 dark:text-slate-400 block">
                            Signing Secret: <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-slate-200">{wh.secret}</code>
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteWebhook(wh.id); }}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {wh.events.map(ev => (
                          <span key={ev} className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 font-mono text-[10px] font-medium text-gray-600 dark:text-slate-300">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Webhook Delivery Logs */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Delivery Logs</h3>
              
              {logs.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 dark:text-slate-500">
                  No delivery logs recorded for this endpoint yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {logs.map(log => (
                    <div key={log.id} className="p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900 dark:text-slate-100">{log.event_type}</span>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          log.success ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                        }`}>
                          HTTP {log.response_status || 'ERR'}
                        </span>
                      </div>
                      {log.response_body && (
                        <p className="font-mono text-[10px] text-gray-500 dark:text-slate-400 truncate bg-gray-50 dark:bg-slate-800 p-1.5 rounded border border-gray-100 dark:border-slate-700">
                          {log.response_body}
                        </p>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                        {new Date(log.delivered_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal: Generate API Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800 relative space-y-5">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {generatedKey ? (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">API Key Created!</h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                    ⚠ Save your Secret Key now. It will NEVER be displayed again!
                  </p>
                </div>

                <div className="space-y-3 bg-gray-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block font-bold uppercase text-[10px]">Secret Key (`sk_...`)</span>
                    <div className="flex items-center justify-between gap-2 mt-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-200 dark:border-slate-700">
                      <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold select-all text-xs break-all">
                        {generatedKey.raw_secret_key}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKey.raw_secret_key || '');
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline shrink-0"
                      >
                        {copiedSecret ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-slate-400 block font-bold uppercase text-[10px]">Public Key (`pk_...`)</span>
                    <div className="flex items-center justify-between gap-2 mt-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-gray-200 dark:border-slate-700">
                      <code className="font-mono text-blue-600 dark:text-blue-400 font-bold select-all text-xs break-all">
                        {generatedKey.public_key}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKey.public_key || '');
                          setCopiedPublic(true);
                          setTimeout(() => setCopiedPublic(false), 2000);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline shrink-0"
                      >
                        {copiedPublic ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowKeyModal(false)}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
                >
                  I Have Saved My Secret Key
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Create New API Key</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Generate credentials for your e-commerce website or custom application.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Key Name / App Identifier *</label>
                  <input
                    type="text"
                    required
                    value={keyName}
                    onChange={e => setKeyName(e.target.value)}
                    placeholder="e.g. WooCommerce Live Store, Mobile App"
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Environment *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setKeyEnv('TEST')}
                      className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                        keyEnv === 'TEST' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' : 'border-gray-200 dark:border-slate-700 text-gray-600'
                      }`}
                    >
                      TEST (`pk_test_...`)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyEnv('LIVE')}
                      className={`p-3 rounded-xl border text-center text-xs font-bold transition ${
                        keyEnv === 'LIVE' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'border-gray-200 dark:border-slate-700 text-gray-600'
                      }`}
                    >
                      LIVE (`pk_live_...`)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingKey}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center"
                >
                  {creatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate API Key"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Webhook Endpoint */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-slate-800 relative space-y-4">
            <button
              onClick={() => setShowWebhookModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Add Webhook Endpoint</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Specify your server URL to receive real-time POST event payloads.</p>
            </div>

            {webhookError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-600 font-medium">
                {webhookError}
              </div>
            )}

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Webhook URL *</label>
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://my-store.com/api/hendaxis-webhook"
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-700 p-3 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3 rounded-xl text-xs text-blue-900 dark:text-blue-300">
                <span className="font-bold block mb-0.5">Subscribed Events:</span>
                <span className="font-mono text-[11px] block">escrow.paid, escrow.dispatched, escrow.completed, escrow.disputed, escrow.refunded</span>
              </div>

              <button
                type="submit"
                disabled={creatingWebhook}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-blue-500/20 disabled:opacity-70 flex justify-center items-center"
              >
                {creatingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Webhook Endpoint"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
