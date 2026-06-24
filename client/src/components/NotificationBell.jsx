import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';

const POLL_INTERVAL_MS = 15000;

const TYPE_ICON = {
  claim_received: '📦',
  handover_confirmed: '✅',
  nearby_listing: '📍',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Silently ignore — a failed poll shouldn't surface an error banner
      // for something this non-critical.
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open) load();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.patch(`/notifications/${notification.id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((list) => list.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
      } catch {
        // Non-critical — clicking through still works even if the read-state update fails.
      }
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Non-critical.
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        className="relative text-stone-600 hover:text-ink transition-colors p-1.5"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-coral-500 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <p className="font-medium text-ink text-sm">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-teal-600 font-medium hover:text-teal-700">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-stone-50 hover:bg-sand-50 transition-colors flex gap-2.5 ${
                    !n.is_read ? 'bg-teal-50/40' : ''
                  }`}
                >
                  <span className="text-base leading-none">{TYPE_ICON[n.type] || '🔔'}</span>
                  <span className="flex-1">
                    <span className={`text-sm block ${!n.is_read ? 'text-ink font-medium' : 'text-stone-500'}`}>
                      {n.message}
                    </span>
                    <span className="text-xs text-stone-400">{relativeTime(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function relativeTime(isoLike) {
  // SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" (UTC, no
  // timezone marker) — append 'Z' so the browser parses it as UTC instead
  // of local time, which would otherwise skew "X minutes ago" by the
  // viewer's UTC offset.
  const date = new Date(isoLike.replace(' ', 'T') + 'Z');
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
