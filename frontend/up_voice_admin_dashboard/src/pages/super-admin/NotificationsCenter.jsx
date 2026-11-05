// src/pages/super-admin/NotificationsCenter.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, Search, Filter,
  Clock, AlertTriangle, ShieldAlert, Sparkles,
  ExternalLink, Check, Inbox, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../../services/notificationService';

function formatDateTime(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

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

function getNotificationTypeBadge(type) {
  switch (type) {
    case 'PENDING_REVIEW':
    case 'NEW_PROBLEM':
      return {
        icon: AlertTriangle,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        iconBg: 'bg-amber-100 text-amber-700',
        label: 'คำร้องรอตรวจ',
      };
    case 'SECURITY_ALERT':
    case 'WAF_BLOCK':
      return {
        icon: ShieldAlert,
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        iconBg: 'bg-rose-100 text-rose-700',
        label: 'ความปลอดภัย',
      };
    case 'SYSTEM_ALERT':
    default:
      return {
        icon: Sparkles,
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        iconBg: 'bg-purple-100 text-purple-700',
        label: 'ระบบ',
      };
  }
}

const NotificationsCenter = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const loadNotifications = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchNotifications({
        unreadOnly: statusFilter === 'UNREAD',
        notificationType: typeFilter !== 'ALL' ? typeFilter : null,
        page,
        pageSize,
      });

      setNotifications(res.data || []);
      setTotalCount(res.total || 0);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications in center:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [typeFilter, statusFilter, page]);

  // Actions
  const handleMarkRead = async (id) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    setTotalCount((t) => Math.max(0, t - 1));
  };

  // Client search filter
  const filteredNotifications = notifications.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.message?.toLowerCase().includes(q)
    );
  });

  // Calculate high-level stats
  const pendingReviewCount = notifications.filter(
    (n) => n.notification_type === 'PENDING_REVIEW' || n.notification_type === 'NEW_PROBLEM'
  ).length;

  const securityAlertCount = notifications.filter(
    (n) => n.notification_type === 'SECURITY_ALERT' || n.notification_type === 'WAF_BLOCK'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2B164D] to-[#4B267D] flex items-center justify-center text-white shadow-md shadow-[#2B164D]/15">
              <Bell size={20} className="text-[#F59E0B]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#2B164D] tracking-tight">
                ศูนย์การแจ้งเตือนระบบ (Notifications Center)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                รายงานคำร้องรอตรวจสอบ เหตุการณ์ความปลอดภัย และการอัปเดตระบบแบบเรียลไทม์
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadNotifications(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>รีเฟรช</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8FC] border border-[#E9D5FF] text-xs font-bold text-[#4B267D] hover:bg-[#F3EEFA] transition-all shadow-2xs"
            >
              <CheckCheck size={15} />
              <span>ทำเครื่องหมายอ่านแล้วทั้งหมด</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Quick Stat Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">การแจ้งเตือนทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Bell size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{totalCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">รายการในประวัติระบบ</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ยังไม่อ่าน (Unread)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-[#4B267D]">
              <Sparkles size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#4B267D] mt-2">{unreadCount}</p>
          <span className="text-[10px] text-purple-600 font-medium">รอการเปิดดูและรับทราบ</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">คำร้องรอตรวจ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{pendingReviewCount}</p>
          <span className="text-[10px] text-amber-600 font-medium">รอการอนุมัติและจัดส่งงาน</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ความปลอดภัย / WAF</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
              <ShieldAlert size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{securityAlertCount}</p>
          <span className="text-[10px] text-rose-600 font-medium">ตรวจพบบนไฟร์วอลล์</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาตามหัวข้อ หรือข้อความแจ้งเตือน..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D]"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'PENDING_REVIEW', label: 'คำร้องรอตรวจ' },
              { id: 'SECURITY_ALERT', label: 'ความปลอดภัย' },
              { id: 'SYSTEM_ALERT', label: 'ระบบ' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTypeFilter(t.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  typeFilter === t.id
                    ? 'bg-[#2B164D] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => {
                setStatusFilter(statusFilter === 'UNREAD' ? 'ALL' : 'UNREAD');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                statusFilter === 'UNREAD'
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              เฉพาะยังไม่อ่าน
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-[#2B164D]"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">กำลังโหลดรายการแจ้งเตือน...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Inbox size={26} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">ไม่พบรายการแจ้งเตือน</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหาของคุณ ลองเปลี่ยนคำค้นหรือตัวกรอง'
                : 'ไม่มีข้อความแจ้งเตือนใหม่ในหมวดหมู่นี้ในขณะนี้'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((item) => {
              const typeBadge = getNotificationTypeBadge(item.notification_type);
              const IconComp = typeBadge.icon;

              return (
                <div
                  key={item.notification_id}
                  className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-[#FAF8FC] ${
                    !item.is_read ? 'bg-purple-50/20' : ''
                  }`}
                >
                  {/* Left: Icon & Content */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${typeBadge.iconBg}`}
                    >
                      <IconComp size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black rounded-md border ${typeBadge.badgeClass}`}
                        >
                          {typeBadge.label}
                        </span>

                        <span
                          className={`text-xs font-bold leading-tight ${
                            !item.is_read ? 'text-slate-900 font-black' : 'text-slate-700'
                          }`}
                        >
                          {item.title}
                        </span>

                        {!item.is_read && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#4B267D] text-white">
                            ใหม่
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock size={12} />
                          {formatRelativeTime(item.created_at)}
                        </span>
                        <span>•</span>
                        <span title={item.created_at}>{formatDateTime(item.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                    {item.problem_id && (
                      <button
                        onClick={() => navigate('/super-admin')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF8FC] border border-[#E9D5FF] text-xs font-bold text-[#4B267D] hover:bg-[#F3EEFA] transition-colors"
                        title="เปิดดูคำร้องนี้บน Dashboard"
                      >
                        <ExternalLink size={13} />
                        <span>เปิดคำร้อง</span>
                      </button>
                    )}

                    {!item.is_read && (
                      <button
                        onClick={() => handleMarkRead(item.notification_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                        title="ทำเครื่องหมายว่าอ่านแล้ว"
                      >
                        <Check size={13} />
                        <span>อ่านแล้ว</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(item.notification_id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="ลบการแจ้งเตือนนี้"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > pageSize && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              แสดง {notifications.length} จากทั้งหมด {totalCount} รายการ
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 font-bold">หน้า {page}</span>
              <button
                disabled={page * pageSize >= totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsCenter;
