import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Search, Filter, Plus, Copy, Check, Loader2, ChevronLeft, ChevronRight, ExternalLink, X, Image as ImageIcon, Archive, RotateCcw, Trash2, Power } from 'lucide-react';
import { apiClient } from '../api/client';
import { Link as RouterLink } from 'react-router-dom';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { useEscapeKey } from '../utils/useEscapeKey';

export const LinksView: React.FC = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<any | null>(null);

  useEscapeKey(() => setSelectedLink(null), Boolean(selectedLink));

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'disabled', 'archived'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const limit = 10;
  const [offset, setOffset] = useState(0);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      if (search) params.append('search', search);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const res = await apiClient.get(`/links/?${params.toString()}`);
      setLinks(res.data.items || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [offset, search, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchLinks();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const copyToClipboard = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (link: any) => {
    try {
      const res = await apiClient.post(`/links/${link.id}/toggle-active`);
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, is_active: res.data.is_active } : l));
      if (selectedLink && selectedLink.id === link.id) {
        setSelectedLink((prev: any) => prev ? { ...prev, is_active: res.data.is_active } : null);
      }
    } catch (err) {
      console.error('Failed to toggle link status:', err);
      alert('Failed to update link status.');
    }
  };

  const handleArchive = async (link: any) => {
    if (!confirm(`Are you sure you want to delete/archive "${link.title}"?\n\nThis will disable the link and hide it from your active list without breaking past transaction history.`)) return;
    try {
      await apiClient.post(`/links/${link.id}/archive`);
      if (selectedLink && selectedLink.id === link.id) {
        setSelectedLink(null);
      }
      fetchLinks();
    } catch (err) {
      console.error('Failed to archive link:', err);
      alert('Failed to archive link.');
    }
  };

  const handleUnarchive = async (link: any) => {
    try {
      await apiClient.post(`/links/${link.id}/unarchive`);
      if (selectedLink && selectedLink.id === link.id) {
        setSelectedLink((prev: any) => prev ? { ...prev, is_archived: false, is_active: true } : null);
      }
      fetchLinks();
    } catch (err) {
      console.error('Failed to restore link:', err);
      alert('Failed to restore link.');
    }
  };

  const hasFilters = search || statusFilter !== 'all' || startDate || endDate;
  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Payment Links</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage, disable, or archive your products and checkout links.</p>
        </div>
        <RouterLink 
          to="/create-link"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          Create New Link
        </RouterLink>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 space-y-3 transition-colors">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 font-medium text-sm">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by product name..."
              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setOffset(0); }}
            className="border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="all">Active & Disabled Links</option>
            <option value="active">Active Links Only</option>
            <option value="disabled">Disabled Links Only</option>
            <option value="archived">Archived (Soft Deleted)</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setOffset(0); }}
              className="border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              title="From date"
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setOffset(0); }}
              className="border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              title="To date"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-500">
          {totalCount === 0
            ? 'No payment links found.'
            : `Showing ${offset + 1}–${Math.min(offset + limit, totalCount)} of ${totalCount} links`}
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
            <p className="text-sm">Loading your links...</p>
          </div>
        ) : links.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-14 w-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 className="h-7 w-7 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-800">
              {hasFilters ? 'No links match your filters.' : "You haven't created any payment links yet."}
            </p>
            {!hasFilters && (
              <RouterLink
                to="/create-link"
                className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium underline"
              >
                <Plus className="h-4 w-4" />
                Create your first link
              </RouterLink>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Price (GHS)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-slate-800">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                    {new Date(link.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                    <button
                      onClick={() => setSelectedLink(link)}
                      className="text-left font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors flex items-center gap-1.5 group cursor-pointer"
                      title="Click to view full link details & QR Code"
                    >
                      <span>{link.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-slate-100 font-mono">
                    GHS {Number(link.price_ghs).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {link.is_archived ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700">
                        <Archive className="h-3 w-3" /> Archived
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(link)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          link.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                        }`}
                        title="Click to toggle Active / Disabled state"
                      >
                        <span className={`w-2 h-2 rounded-full ${link.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {link.is_active ? 'Active' : 'Disabled'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                        title="Open payment checkout page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(link.url, link.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          copiedId === link.id
                            ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300'
                            : 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {copiedId === link.id ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy Link</>}
                      </button>

                      {link.is_archived ? (
                        <button
                          onClick={() => handleUnarchive(link)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Restore/Unarchive link"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchive(link)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete/Archive link (Soft Delete)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="bg-white dark:bg-slate-950 px-6 py-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </p>
            <nav className="inline-flex rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 border-r border-gray-200 dark:border-slate-800"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= totalCount}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Link Detail & QR Code Modal */}
      {selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-slate-800 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/60 dark:bg-slate-900/60">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Link Details</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Created on {new Date(selectedLink.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
              </div>
              <button
                onClick={() => setSelectedLink(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Product Header Card */}
              <div className="flex gap-4 items-start bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                {selectedLink.image_url ? (
                  <img
                    src={selectedLink.image_url}
                    alt={selectedLink.title}
                    className="w-20 h-20 object-cover rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <h4 className="text-base font-bold text-gray-900 dark:text-white leading-snug">{selectedLink.title}</h4>
                  {selectedLink.description && (
                    <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2">{selectedLink.description}</p>
                  )}
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-blue-200 dark:border-slate-700">
                      GHS {Number(selectedLink.price_ghs).toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {selectedLink.fee_handling === 'PASS_TO_BUYER' ? 'Fee Passed to Buyer' : 'Fee Absorbed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Controls inside Modal */}
              <div className="pt-1 flex gap-3">
                {selectedLink.is_archived ? (
                  <button
                    onClick={() => handleUnarchive(selectedLink)}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <RotateCcw className="h-4 w-4" /> Restore Archived Link
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleActive(selectedLink)}
                      className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                        selectedLink.is_active
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="h-4 w-4" />
                      {selectedLink.is_active ? 'Disable Checkout Link' : 'Enable Checkout Link'}
                    </button>
                    <button
                      onClick={() => handleArchive(selectedLink)}
                      className="py-2.5 px-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" /> Archive / Delete
                    </button>
                  </>
                )}
              </div>

              {/* Financial Breakdown Table */}
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 text-xs space-y-2">
                <p className="font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Fee & Payout Breakdown</p>
                <div className="flex justify-between text-gray-600 dark:text-slate-400">
                  <span>Item Price:</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-slate-200">GHS {Number(selectedLink.price_ghs).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-slate-400">
                  <span>Shipping Fee:</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-slate-200">GHS {Number(selectedLink.shipping_fee_ghs || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-slate-400">
                  <span>Escrow Fee (1.5% + GHS 10):</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-slate-200">
                    GHS {(((Number(selectedLink.price_ghs) + Number(selectedLink.shipping_fee_ghs || 0)) * 0.015) + 10).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-blue-700 dark:text-blue-400 font-bold border-t border-gray-200 dark:border-slate-700 pt-2 text-sm">
                  <span>Total Buyer Payment:</span>
                  <span className="font-mono">
                    GHS {(
                      selectedLink.fee_handling === 'PASS_TO_BUYER'
                        ? (Number(selectedLink.price_ghs) + Number(selectedLink.shipping_fee_ghs || 0)) + (((Number(selectedLink.price_ghs) + Number(selectedLink.shipping_fee_ghs || 0)) * 0.015) + 10)
                        : (Number(selectedLink.price_ghs) + Number(selectedLink.shipping_fee_ghs || 0))
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Direct Checkout Link Bar */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Direct Checkout Link</label>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-900 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700">
                  <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={selectedLink.url}
                    className="bg-transparent border-none focus:ring-0 text-xs text-gray-800 dark:text-slate-200 font-mono flex-1 min-w-0"
                  />
                  <button
                    onClick={() => copyToClipboard(selectedLink.url, selectedLink.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === selectedLink.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === selectedLink.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* QR Code Section */}
              <div>
                <QRCodeDisplay
                  url={selectedLink.url}
                  title={selectedLink.title}
                  priceGhs={Number(selectedLink.price_ghs)}
                  size={160}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
