// src/components/NotificationDropdown.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, Clock, AlertTriangle,
  ShieldAlert, Sparkles, ExternalLink, Inbox, ChevronRight
} from 'lucide-react';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead
} from '../services/notificationService';

// Format timestamp relative to now
function formatRelativeTime(dateString) {
  if (!dateString) return 'เมื่อสักครู่';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'เมื่อสักครู่';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
  } catch {
    return 'ไม่นานมานี้';
  }
}

// Icon and color badge depending on notification type
function getNotificationIcon(type) {
  switch (type) {
    case 'PENDING_REVIEW':
    case 'NEW_PROBLEM':
      return {
        icon: AlertTriangle,
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        label: 'รอตรวจสอบ',
      };
    case 'SECURITY_ALERT':
    case 'WAF_BLOCK':
      return {
        icon: ShieldAlert,
        bg: 'bg-rose-100',
        text: 'text-rose-700',
        label: 'ความปลอดภัย',
      };
    case 'SYSTEM_ALERT':
    default:
      return {
        icon: Sparkles,
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        label: 'ระบบ',
      };
  }
}

const NotificationDropdown = ({ unreadCount = 0, onCountChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'UNREAD'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load latest notifications when opened
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications({
        unreadOnly: activeTab === 'UNREAD',
        page: 1,
        pageSize: 15,
      });
      setNotifications(res.data || []);
      if (typeof onCountChange === 'function' && res.unread_count !== undefined) {
        onCountChange(res.unread_count);
      }
    } catch (err) {
      console.error('Failed to load notifications in dropdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle click on a single notification
  const handleItemClick = async (item) => {
    if (!item.is_read) {
      await markAsRead(item.notification_id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === item.notification_id ? { ...n, is_read: true } : n
        )
      );
      if (typeof onCountChange === 'function') {
        onCountChange(Math.max(0, unreadCount - 1));
      }
    }
    setIsOpen(false);

    // If linked to a problem, redirect to Dashboard or problem view
    if (item.problem_id) {
      navigate('/super-admin');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (typeof onCountChange === 'function') {
      onCountChange(0);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-[#FAF8FC] text-[#2B164D] border-2 border-[#4B267D]/40 ring-2 ring-[#4B267D]/10'
            : 'text-slate-500 hover:bg-[#FAF8FC] hover:text-[#2B164D] border border-slate-200/80'
        }`}
        title={unreadCount > 0 ? `มี ${unreadCount} การแจ้งเตือนที่ยังไม่ได้อ่าน` : 'การแจ้งเตือน'}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-black rounded-full ring-2 ring-white flex items-center justify-center animate-bounce shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-[#FAF8FC] to-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-[#4B267D] hover:text-[#2B164D] hover:underline flex items-center gap-1 transition-colors"
                title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
              >
                <CheckCheck size={14} />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/60 px-3 pt-2 gap-2 flex-shrink-0 text-xs">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`pb-2 px-2 font-bold transition-colors border-b-2 ${
                activeTab === 'ALL'
                  ? 'border-[#2B164D] text-[#2B164D]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setActiveTab('UNREAD')}
              className={`pb-2 px-2 font-bold transition-colors border-b-2 ${
                activeTab === 'UNREAD'
                  ? 'border-[#2B164D] text-[#2B164D]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              ยังไม่อ่าน ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-[#2B164D]"></div>
                <p className="text-xs text-slate-400 mt-2 font-medium">กำลังโหลดข้อมูล...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Inbox size={22} />
                </div>
                <p className="text-xs font-bold text-slate-600">ไม่มีการแจ้งเตือน</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeTab === 'UNREAD' ? 'คุณอ่านการแจ้งเตือนทั้งหมดแล้ว' : 'ยังไม่มีข้อมูลการแจ้งเตือนใหม่'}
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const config = getNotificationIcon(item.notification_type);
                const IconComponent = config.icon;
                return (
                  <div
                    key={item.notification_id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 flex gap-3 hover:bg-[#FAF8FC] cursor-pointer transition-colors ${
                      !item.is_read ? 'bg-purple-50/25' : ''
                    }`}
                  >
                    {/* Icon Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg} ${config.text}`}
                    >
                      <IconComponent size={18} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <p
                          className={`text-xs truncate ${
                            !item.is_read ? 'font-black text-slate-900' : 'font-bold text-slate-700'
                          }`}
                        >
                          {item.title}
                        </p>
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#4B267D] flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                        <Clock size={11} />
                        <span>{formatRelativeTime(item.created_at)}</span>
                        <span>•</span>
                        <span className="font-semibold">{config.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer - Full Page Link */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center flex-shrink-0">
            <Link
              to="/super-admin/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#4B267D] hover:bg-[#FAF8FC] hover:border-[#4B267D]/30 transition-all shadow-2xs"
            >
              <span>ดูการแจ้งเตือนทั้งหมด (Notification Center)</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;

