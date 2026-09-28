import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bell, Mail, MessageSquare, Search, Calendar, CheckCheck, 
  Trash2, CheckCircle2, AlertTriangle, Truck, Scale, 
  Gift, Star, ShieldCheck, RefreshCw, Loader2, ArrowLeft, ExternalLink,
  ChevronLeft, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useModal } from '../context/ModalContext';

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  notification_type: 'EMAIL' | 'SMS' | 'IN_APP' | string;
  action_url?: string | null;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

type DateFilterPreset = 'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM';

export default function NotificationsView() {
  const { isAuthenticated } = useAuthStore();
  const modal = useModal();
  const navigate = useNavigate();

  // Data state
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'EMAIL' | 'SMS' | 'IN_APP'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('offset', ((page - 1) * pageSize).toString());

      if (statusFilter === 'UNREAD') {
        params.append('unread_only', 'true');
      }
      if (channelFilter !== 'ALL') {
        params.append('channel', channelFilter);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      // Compute dates based on preset
      if (datePreset === 'TODAY') {
        const today = new Date().toISOString().split('T')[0];
        params.append('start_date', today);
      } else if (datePreset === '7DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append('start_date', d.toISOString().split('T')[0]);
      } else if (datePreset === '30DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append('start_date', d.toISOString().split('T')[0]);
      } else if (datePreset === 'CUSTOM') {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
      }

      const res = await apiClient.get(`/notifications/?${params.toString()}`);
      setNotifications(res.data?.items || []);
      setTotalCount(res.data?.total_count || 0);
      setUnreadCount(res.data?.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page, channelFilter, statusFilter, search, datePreset, startDate, endDate]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Reset page to 1 when filters change
  const handleFilterChange = () => {
    setPage(1);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await apiClient.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      modal.alert({
        title: 'All Notifications Read',
        message: 'All unread notifications have been marked as read.',
        type: 'success',
        icon: 'check',
      });
    } catch {
      modal.alert({
        title: 'Error',
        message: 'Failed to mark notifications as read.',
        type: 'danger',
      });
    }
  };

  const handleClearRead = async () => {
    const confirmed = await modal.confirm({
      title: 'Clear Read Notifications',
      message: 'Are you sure you want to delete all read notifications? This action cannot be undone.',
      confirmText: 'Clear Read',
      type: 'orange',
      icon: 'trash',
    });

    if (!confirmed) return;

    try {
      await apiClient.delete('/notifications/clear-read');
      fetchNotifications();
      modal.alert({
        title: 'Notifications Cleared',
        message: 'All read notifications have been deleted.',
        type: 'success',
        icon: 'check',
      });
    } catch {
      modal.alert({
        title: 'Error',
        message: 'Failed to clear read notifications.',
        type: 'danger',
      });
    }
  };

  const handleToggleRead = async (item: NotificationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(item.id);
    try {
      const res = await apiClient.patch(`/notifications/${item.id}/toggle-read`);
      const newReadState = !item.is_read;
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, is_read: newReadState } : n))
      );
      if (typeof res.data?.unread_count === 'number') {
        setUnreadCount(res.data.unread_count);
      } else {
        setUnreadCount(prev => (newReadState ? Math.max(0, prev - 1) : prev + 1));
      }
    } catch {
      // ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (item: NotificationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(item.id);
    try {
      const res = await apiClient.delete(`/notifications/${item.id}`);
      setNotifications(prev => prev.filter(n => n.id !== item.id));
      setTotalCount(prev => Math.max(0, prev - 1));
      if (!item.is_read) {
        if (typeof res.data?.unread_count === 'number') {
          setUnreadCount(res.data.unread_count);
        } else {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch {
      modal.alert({
        title: 'Delete Failed',
        message: 'Could not delete notification. Please try again.',
        type: 'danger',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCardClick = async (item: NotificationRecord) => {
    if (!item.is_read) {
      try {
        await apiClient.patch(`/notifications/${item.id}/read`);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      } catch {
        // ignore
      }
    }
    if (item.action_url) {
      navigate(item.action_url);
    }
  };

  const renderContextIcon = (title: string, message: string) => {
    const text = `${title} ${message}`.toLowerCase();
    if (text.includes('dispute') || text.includes('arbiter')) {
      return <Scale className="w-5 h-5 text-rose-500" />;
    }
    if (text.includes('ship') || text.includes('track') || text.includes('deliver') || text.includes('courier')) {
      return <Truck className="w-5 h-5 text-blue-500" />;
    }
    if (text.includes('payout') || text.includes('release') || text.includes('payment') || text.includes('refund')) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }
    if (text.includes('review') || text.includes('rating') || text.includes('star')) {
      return <Star className="w-5 h-5 text-amber-500 fill-amber-500" />;
    }
    if (text.includes('referral') || text.includes('reward')) {
      return <Gift className="w-5 h-5 text-purple-500" />;
    }
    if (text.includes('warning') || text.includes('urgent') || text.includes('cancel')) {
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
    return <ShieldCheck className="w-5 h-5 text-[#0363ff]" />;
  };

  const renderChannelBadge = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-xs">
            <Mail className="w-3.5 h-3.5" /> Email
          </span>
        );
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
            <MessageSquare className="w-3.5 h-3.5" /> SMS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 shadow-xs">
            <Bell className="w-3.5 h-3.5" /> In-App
          </span>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#0363ff] dark:hover:text-blue-400 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0363ff]/10 text-[#0363ff] flex items-center justify-center border border-[#0363ff]/20 shadow-xs">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Notification Center
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Comprehensive audit trail of SMS, Email, and platform updates.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || loading}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-[#0363ff]" />
              <span>Mark All Read</span>
            </button>

            <button
              type="button"
              onClick={handleClearRead}
              disabled={loading}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-800 hover:text-rose-700 dark:text-slate-200 dark:hover:text-rose-400 font-bold text-xs transition border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Read</span>
            </button>

            <button
              type="button"
              onClick={() => fetchNotifications()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Total Notifications</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{totalCount}</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Unread Alerts</span>
            <span className={`text-2xl font-black mt-1 block ${unreadCount > 0 ? 'text-[#ff6d1d]' : 'text-slate-900 dark:text-white'}`}>
              {unreadCount}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Channels Monitored</span>
              <span className="text-xs font-extrabold text-[#0363ff] dark:text-blue-400 mt-1 block">SMS • Email • In-App</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0363ff] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          
          {/* Top Row: Search Input & Channel Tabs */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  handleFilterChange();
                }}
                placeholder="Search notifications by keyword, title, or order reference..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0363ff]"
              />
            </div>

            {/* Channel Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 overflow-x-auto border border-slate-200/80 dark:border-slate-700/80">
              {(['ALL', 'EMAIL', 'SMS', 'IN_APP'] as const).map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => {
                    setChannelFilter(ch);
                    handleFilterChange();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    channelFilter === ch
                      ? 'bg-[#0363ff] text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {ch === 'ALL' ? 'All Channels' : ch === 'EMAIL' ? 'Emails' : ch === 'SMS' ? 'SMS' : 'In-App'}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Row: Status Filter & Date Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">Status:</span>
              {(['ALL', 'UNREAD', 'READ'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    handleFilterChange();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    statusFilter === st
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'UNREAD' ? 'Unread' : 'Read'}
                </button>
              ))}
            </div>

            {/* Date Preset Dropdown / Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date:
              </span>
              <select
                value={datePreset}
                onChange={e => {
                  setDatePreset(e.target.value as DateFilterPreset);
                  handleFilterChange();
                }}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0363ff] cursor-pointer shadow-xs"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="7DAYS">Last 7 Days</option>
                <option value="30DAYS">Last 30 Days</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>

              {datePreset === 'CUSTOM' && (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      handleFilterChange();
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                  />
                  <span className="text-xs text-slate-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => {
                      setEndDate(e.target.value);
                      handleFilterChange();
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading && notifications.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0363ff]" />
              <p className="text-sm font-semibold">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-200/80 dark:border-slate-700">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">No Notifications Found</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {search || channelFilter !== 'ALL' || statusFilter !== 'ALL' || datePreset !== 'ALL'
                  ? 'No notifications match your current filter settings. Try adjusting or clearing your search filters.'
                  : 'You have no recorded email, SMS, or in-app alerts on file.'}
              </p>
              {(search || channelFilter !== 'ALL' || statusFilter !== 'ALL' || datePreset !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setChannelFilter('ALL');
                    setStatusFilter('ALL');
                    setDatePreset('ALL');
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className={`p-4 sm:p-5 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative ${
                  !item.is_read
                    ? 'bg-blue-50/70 dark:bg-blue-950/20 border-l-4 border-l-[#0363ff] hover:bg-blue-50 dark:hover:bg-blue-950/30'
                    : 'bg-white dark:bg-slate-900 border-l-4 border-l-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Left Section: Icon & Content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                    {renderContextIcon(item.title, item.message)}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className={`text-sm leading-snug ${!item.is_read ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-800 dark:text-slate-200'}`}>
                        {item.title}
                      </h4>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#0363ff] shrink-0" />
                      )}
                      {renderChannelBadge(item.notification_type)}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words">
                      {item.message}
                    </p>

                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium block">
                      {new Date(item.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                </div>

                {/* Right Section: Action Link & Card Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={e => e.stopPropagation()}>
                  {item.action_url && (
                    <button
                      type="button"
                      onClick={() => handleCardClick(item)}
                      className="px-3 py-1.5 rounded-xl bg-[#0363ff]/10 hover:bg-[#0363ff] text-[#0363ff] hover:text-white font-extrabold text-xs transition flex items-center gap-1 cursor-pointer border border-[#0363ff]/20 shadow-xs"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleToggleRead(item, e)}
                    disabled={actionLoadingId === item.id}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title={item.is_read ? 'Mark as Unread' : 'Mark as Read'}
                  >
                    {item.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#0363ff]" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item, e)}
                    disabled={actionLoadingId === item.id}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} items)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
