import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Bell, Mail, MessageSquare, ShieldCheck, Scale, Truck, Gift, Star, 
  CheckCircle2, AlertTriangle, ArrowRight, CheckCheck, Loader2
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: 'EMAIL' | 'SMS' | 'IN_APP' | string;
  action_url?: string | null;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function NotificationDropdown() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll unread count periodically
  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get('/notifications/unread-count');
      setUnreadCount(res.data?.unread_count || 0);
    } catch {
      // ignore
    }
  };

  const fetchRecentNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/notifications/?limit=8');
      setNotifications(res.data?.items || []);
      if (typeof res.data?.unread_count === 'number') {
        setUnreadCount(res.data.unread_count);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // When opening dropdown, load full recent items
  useEffect(() => {
    if (isOpen) {
      fetchRecentNotifications();
    }
  }, [isOpen]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isAuthenticated) return null;

  const handleNotificationClick = async (item: NotificationItem) => {
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
    setIsOpen(false);
    const targetUrl = item.action_url || '/notifications';
    navigate(targetUrl);
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await apiClient.post('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const renderChannelBadge = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
            <Mail className="w-2.5 h-2.5" /> Email
          </span>
        );
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
            <MessageSquare className="w-2.5 h-2.5" /> SMS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60">
            <Bell className="w-2.5 h-2.5" /> In-App
          </span>
        );
    }
  };

  const renderContextIcon = (title: string, message: string) => {
    const text = `${title || ''} ${message || ''}`.toLowerCase();
    if (text.includes('dispute') || text.includes('arbiter')) {
      return <Scale className="w-4 h-4 text-rose-500" />;
    }
    if (text.includes('ship') || text.includes('track') || text.includes('deliver') || text.includes('courier')) {
      return <Truck className="w-4 h-4 text-blue-500" />;
    }
    if (text.includes('payout') || text.includes('release') || text.includes('payment') || text.includes('refund')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (text.includes('review') || text.includes('rating') || text.includes('star')) {
      return <Star className="w-4 h-4 text-amber-500 fill-amber-500" />;
    }
    if (text.includes('referral') || text.includes('reward')) {
      return <Gift className="w-4 h-4 text-purple-500" />;
    }
    if (text.includes('warning') || text.includes('urgent') || text.includes('cancel')) {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    return <ShieldCheck className="w-4 h-4 text-[#0363ff]" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative p-2 rounded-xl border transition shadow-sm cursor-pointer shrink-0 ${
          isOpen
            ? 'bg-blue-50 dark:bg-slate-800 border-[#0363ff] text-[#0363ff] dark:text-white'
            : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
        title="Notifications"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />

        {/* Unread Bubble Count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 bg-[#ff6d1d] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md shadow-orange-500/30 animate-pulse border-2 border-white dark:border-slate-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 text-slate-900 dark:text-slate-100">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ff6d1d]/15 text-[#ff6d1d] border border-[#ff6d1d]/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-[11px] font-bold text-[#0363ff] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#0363ff]" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] mx-auto">
                  You have no unread notifications or recent updates.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 relative ${
                    !item.is_read
                      ? 'bg-blue-50/50 dark:bg-blue-950/20'
                      : 'bg-transparent'
                  }`}
                >
                  {/* Context Icon Box */}
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                    {renderContextIcon(item.title, item.message)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className={`text-xs leading-snug line-clamp-1 ${!item.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center gap-2 pt-0.5">
                      {renderChannelBadge(item.notification_type)}
                    </div>
                  </div>

                  {/* Unread indicator dot */}
                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#0363ff] shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl text-xs font-bold text-[#0363ff] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            >
              <span>View all notifications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
