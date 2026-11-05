// src/pages/super-admin/SystemLogs.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText, LogIn, Shield, Search, RefreshCw, ChevronRight,
  X, Clock, User, Monitor, Smartphone, Laptop, AlertTriangle,
  CheckCircle2, Lock, Eye, Activity, Database, Edit3,
  Trash2, Plus, Settings, Download, Filter, Wifi, WifiOff
} from 'lucide-react';
import {
  fetchLoginLogs,
  fetchSystemLogs,
  fetchSecurityAlerts,
} from '../../services/auditLogService';

// ─────────────────────────────────────────────────────────────
// 🎨 Helper: Role Badge
// ─────────────────────────────────────────────────────────────
const ROLE_BADGE = {
  super_admin:    { label: 'Super Admin', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  category_admin: { label: 'Category Admin', cls: 'bg-purple-100 text-purple-800 border-purple-300' },
  staff:          { label: 'บุคลากร', cls: 'bg-blue-100 text-blue-800 border-blue-300' },
  student:        { label: 'นิสิต', cls: 'bg-sky-100 text-sky-800 border-sky-300' },
  public:         { label: 'บุคคลทั่วไป', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  anonymous:      { label: 'ไม่ระบุตัวตน', cls: 'bg-zinc-100 text-zinc-600 border-zinc-300' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_BADGE[role] || { label: role || 'Unknown', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// 🎨 Helper: Action type badge
// ─────────────────────────────────────────────────────────────
const ACTION_CFG = {
  DELETE: { icon: Trash2,  cls: 'bg-red-50 text-red-700 border-red-200',    label: 'ลบข้อมูล' },
  UPDATE: { icon: Edit3,   cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'แก้ไขข้อมูล' },
  CREATE: { icon: Plus,    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'เพิ่มข้อมูล' },
  BAN:    { icon: Lock,    cls: 'bg-orange-50 text-orange-700 border-orange-200', label: 'ระงับบัญชี' },
  UNBAN:  { icon: CheckCircle2, cls: 'bg-teal-50 text-teal-700 border-teal-200', label: 'ปลดระงับ' },
  ROLE_CHANGE: { icon: Settings, cls: 'bg-purple-50 text-purple-700 border-purple-200', label: 'เปลี่ยนสิทธิ์' },
};

function ActionBadge({ action }) {
  const key = Object.keys(ACTION_CFG).find(k => (action || '').toUpperCase().includes(k)) || 'UPDATE';
  const cfg = ACTION_CFG[key];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// 🎨 Helper: Device icon
// ─────────────────────────────────────────────────────────────
function DeviceIcon({ device }) {
  const d = (device || '').toLowerCase();
  if (d.includes('mobile') || d.includes('phone')) return <Smartphone size={14} className="text-slate-400" />;
  if (d.includes('tablet')) return <Monitor size={14} className="text-slate-400" />;
  return <Laptop size={14} className="text-slate-400" />;
}

// ─────────────────────────────────────────────────────────────
// 🎨 Helper: Format datetime to Thai readable
// ─────────────────────────────────────────────────────────────
function formatThaiDate(str) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return str;
  }
}

// ─────────────────────────────────────────────────────────────
// 🎨 Summary Stat Card
// ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <p className="text-xl font-black text-slate-900 font-mono leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 📋 TAB 1: Login Logs
// ─────────────────────────────────────────────────────────────
function LoginLogsTab({ logs, loading }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (log.display_name || '').toLowerCase().includes(q) ||
          (log.email || '').toLowerCase().includes(q) ||
          (log.ip_address || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (roleFilter !== 'ALL' && log.role !== roleFilter) return false;
      return true;
    });
  }, [logs, search, roleFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, อีเมล หรือ IP Address..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#4B267D]/30 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4B267D]/30 bg-white"
        >
          <option value="ALL">ทุกบทบาท</option>
          <option value="super_admin">Super Admin</option>
          <option value="category_admin">Category Admin</option>
          <option value="staff">บุคลากร</option>
          <option value="student">นิสิต</option>
          <option value="public">บุคคลทั่วไป</option>
          <option value="anonymous">ไม่ระบุตัวตน</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-[11px] text-slate-500">
        แสดงผล <strong className="text-slate-800">{filtered.length}</strong> จากทั้งหมด {logs.length} รายการ
      </p>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState message="ไม่พบประวัติการเข้าสู่ระบบที่ตรงกับเงื่อนไข" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">ผู้ใช้งาน</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">บทบาท</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">อุปกรณ์</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">เวลา Login</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">เวลา Logout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log, i) => (
                  <tr key={log.log_id || i} className="hover:bg-slate-50/60 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4B267D]/10 to-[#4B267D]/20 flex items-center justify-center shrink-0">
                          <User size={13} className="text-[#4B267D]" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{log.display_name || '—'}</p>
                          <p className="text-[10px] text-slate-400 font-mono leading-tight">{log.email || 'ไม่มีอีเมล'}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3"><RoleBadge role={log.role} /></td>
                    {/* IP */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {log.ip_address || '—'}
                      </span>
                    </td>
                    {/* Device */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <DeviceIcon device={log.device_type} />
                        <span className="text-[11px]">{log.device_type || 'Unknown'}</span>
                      </div>
                    </td>
                    {/* Login Time */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-slate-700 flex items-center gap-1">
                        <Clock size={11} className="text-slate-400" />
                        {formatThaiDate(log.login_time)}
                      </span>
                    </td>
                    {/* Logout Time */}
                    <td className="px-4 py-3">
                      {log.logout_time ? (
                        <span className="text-[11px] text-slate-500">{formatThaiDate(log.logout_time)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ออนไลน์อยู่
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 🔍 Audit Detail Modal (Rendered with React Portal to body)
// ─────────────────────────────────────────────────────────────
function AuditDetailModal({ log, onClose }) {
  if (!log) return null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-[#4B267D] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-purple-200">
              <Database size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm">รายละเอียดการเปลี่ยนแปลง (Audit Diff)</h3>
              <p className="text-[11px] text-purple-200">
                {log.admin_name || 'System'} · {log.table_name} #{log.record_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Info Banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">ประเภทกิจกรรม:</span>
            <ActionBadge action={log.action_type} />
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-bold">เป้าหมาย:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-[#4B267D]">
              {log.table_name} #{log.record_id}
            </span>
          </div>
        </div>

        {/* Modal Body: Old vs New Value */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Old Value */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              ค่าก่อนเปลี่ยน (Old Value)
            </p>
            <pre className="bg-red-50/70 border border-red-200 rounded-xl p-3 text-[11px] text-slate-700 overflow-auto max-h-60 font-mono whitespace-pre-wrap leading-relaxed">
              {formatLogValue(log.old_value)}
            </pre>
          </div>

          {/* New Value */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ค่าหลังเปลี่ยน (New Value)
            </p>
            <pre className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-[11px] text-slate-700 overflow-auto max-h-60 font-mono whitespace-pre-wrap leading-relaxed">
              {formatLogValue(log.new_value)}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs">
          <span className="text-slate-400 text-[11px]">
            บันทึกเมื่อ: {formatThaiDate(log.created_at)}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────
// 📋 TAB 2: System Audit Logs
// ─────────────────────────────────────────────────────────────
function SystemAuditTab({ logs, loading }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (log.admin_name || '').toLowerCase().includes(q) ||
          (log.table_name || '').toLowerCase().includes(q) ||
          String(log.record_id || '').includes(q);
        if (!match) return false;
      }
      if (actionFilter !== 'ALL' && !(log.action_type || '').toUpperCase().includes(actionFilter)) return false;
      return true;
    });
  }, [logs, search, actionFilter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อแอดมิน, ตาราง หรือ ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#4B267D]/30 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4B267D]/30 bg-white"
        >
          <option value="ALL">ทุกประเภทกิจกรรม</option>
          <option value="DELETE">ลบข้อมูล (DELETE)</option>
          <option value="UPDATE">แก้ไขข้อมูล (UPDATE)</option>
          <option value="CREATE">เพิ่มข้อมูล (CREATE)</option>
          <option value="BAN">ระงับบัญชี (BAN)</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-[11px] text-slate-500">
        แสดงผล <strong className="text-slate-800">{filtered.length}</strong> จากทั้งหมด {logs.length} รายการ
      </p>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <EmptyState message="ไม่พบประวัติการดำเนินการที่ตรงกับเงื่อนไข" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">ผู้ดำเนินการ</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">ประเภทกิจกรรม</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">ตาราง / ID</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">เวลา</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log, i) => (
                  <tr key={log.audit_id || i} className="hover:bg-slate-50/60 transition-colors">
                    {/* Admin */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-900">{log.admin_name || 'System'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{log.admin_email || '—'}</p>
                      </div>
                    </td>
                    {/* Action */}
                    <td className="px-4 py-3"><ActionBadge action={log.action_type} /></td>
                    {/* Table / Record */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {log.table_name || '—'}
                        </span>
                        {log.record_id && (
                          <span className="text-[11px] text-slate-400">#{log.record_id}</span>
                        )}
                      </div>
                    </td>
                    {/* Time */}
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Clock size={11} className="text-slate-400" />
                        {formatThaiDate(log.created_at)}
                      </span>
                    </td>
                    {/* Detail */}
                    <td className="px-4 py-3">
                      {(log.old_value || log.new_value) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4B267D] hover:text-[#381C5F] transition-colors px-2 py-1 rounded-lg hover:bg-purple-50 cursor-pointer"
                        >
                          <Eye size={12} />
                          ดูการเปลี่ยนแปลง
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal: Rendered via Portal directly to body to avoid container clipping */}
      {selectedLog && (
        <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 📋 TAB 3: Security Alerts
// ─────────────────────────────────────────────────────────────
function SecurityAlertsTab({ data, loading }) {
  if (loading) return <LoadingSpinner />;

  const { waf_alerts = [], brute_force_locked_targets = [], total_waf_blocks = 0, system_firewall_status } = data || {};
  const isProtected = (system_firewall_status || '').includes('PROTECTED');

  return (
    <div className="space-y-5">
      {/* System Status Banner */}
      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${isProtected
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-red-50 border-red-200'
      }`}>
        {isProtected
          ? <Shield size={28} className="text-emerald-600 shrink-0" />
          : <WifiOff size={28} className="text-red-600 shrink-0" />
        }
        <div className="flex-1">
          <p className={`text-sm font-black ${isProtected ? 'text-emerald-800' : 'text-red-800'}`}>
            {isProtected ? '🛡️ ระบบป้องกันภัยคุกคามออนไลน์และทำงานปกติ' : '⚠️ ระบบป้องกันภัยคุกคามอาจมีปัญหา'}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            WAF (Web Application Firewall) + IDS (Intrusion Detection System) •
            สถานะ: <span className={`font-bold font-mono ${isProtected ? 'text-emerald-700' : 'text-red-700'}`}>
              {system_firewall_status || 'UNKNOWN'}
            </span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black font-mono text-red-600">{total_waf_blocks}</p>
          <p className="text-[11px] text-slate-500">ครั้งที่ถูก Block</p>
        </div>
      </div>

      {/* WAF Alerts */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-red-500" />
            <h3 className="text-sm font-black text-slate-900">WAF Alerts — การโจมตีที่ถูก Block</h3>
          </div>
          <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
            {waf_alerts.length} รายการ
          </span>
        </div>
        {waf_alerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">ไม่มีการโจมตีที่บันทึกไว้</p>
            <p className="text-xs text-slate-400">ระบบ WAF ทำงานปกติ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">ประเภทภัยคุกคาม</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">เส้นทาง (Path)</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">เวลา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waf_alerts.map((alert, i) => (
                  <tr key={i} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                        {alert.ip || alert.client_ip || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
                        <AlertTriangle size={11} />
                        {alert.attack_type || alert.threat_type || alert.reason || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[200px] block">
                        {alert.path || alert.url || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-slate-600">{formatThaiDate(alert.timestamp || alert.time)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Brute Force Locks */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-amber-500" />
            <h3 className="text-sm font-black text-slate-900">Brute Force Lock — บัญชีที่ถูกล็อค</h3>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            {brute_force_locked_targets.length} บัญชี
          </span>
        </div>
        {brute_force_locked_targets.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">ไม่มีบัญชีที่ถูกล็อคในขณะนี้</p>
            <p className="text-xs text-slate-400">ระบบ IDS ทำงานปกติ</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {brute_force_locked_targets.map((item, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-amber-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Lock size={14} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-xs text-slate-800">{item.target}</p>
                    <p className="text-[11px] text-slate-500">ล้มเหลว <span className="font-bold text-red-600">{item.failed_count}</span> ครั้ง</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {item.status || 'LOCKED'}
                  </span>
                  {item.locked_until && (
                    <p className="text-[10px] text-slate-400 mt-1">ถึง: {formatThaiDate(item.locked_until)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 🔄 Loading & Empty State
// ─────────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-[#4B267D]/20 border-t-[#4B267D] animate-spin" />
      <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูล...</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="p-14 text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
        <FileText size={22} className="text-slate-400" />
      </div>
      <p className="text-sm font-bold text-slate-600">{message}</p>
      <p className="text-xs text-slate-400">ลองปรับตัวกรองหรือค้นหาใหม่</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 🏠 Main Page Component
// ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'login',    label: 'ประวัติการเข้าสู่ระบบ', icon: LogIn,    color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-500' },
  { id: 'audit',   label: 'กิจกรรมผู้ดูแลระบบ',    icon: Database, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500' },
  { id: 'security',label: 'ภัยคุกคามและความปลอดภัย', icon: Shield,   color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-500' },
];

const SystemLogs = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [loginLogs, setLoginLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState({ login: false, audit: false, security: false });
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);

  const loadAll = async () => {
    setLoading({ login: true, audit: true, security: true });
    setError(null);
    try {
      const [logins, audits, security] = await Promise.all([
        fetchLoginLogs(200),
        fetchSystemLogs(200),
        fetchSecurityAlerts(200),
      ]);
      setLoginLogs(logins);
      setAuditLogs(audits);
      setSecurityData(security);
      setLastRefresh(new Date());
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูล Log ได้ กรุณาตรวจสอบการเชื่อมต่อ API');
      console.error('SystemLogs load error:', err);
    } finally {
      setLoading({ login: false, audit: false, security: false });
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Summary counts
  const todayLoginCount = useMemo(() => {
    const today = new Date().toDateString();
    return loginLogs.filter(l => l.login_time && new Date(l.login_time).toDateString() === today).length;
  }, [loginLogs]);

  const isAnyLoading = Object.values(loading).some(Boolean);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* Page Header */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200/60">
              <Shield size={12} className="text-amber-600" /> Super Admin
            </span>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-800 font-bold">ศูนย์บันทึกและตรวจสอบระบบ</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <FileText size={20} className="text-[#4B267D]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">ศูนย์บันทึกและตรวจสอบระบบ (System Audit Logs)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ตรวจสอบกิจกรรม Login, การดำเนินการของผู้ดูแล และภัยคุกคามด้านความปลอดภัย
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          {lastRefresh && (
            <span className="text-[11px] text-slate-400 hidden sm:block">
              อัปเดตล่าสุด: {lastRefresh.toLocaleTimeString('th-TH')}
            </span>
          )}
          <button
            onClick={loadAll}
            disabled={isAnyLoading}
            className="px-3.5 py-2 rounded-xl bg-[#4B267D] text-white font-semibold text-xs hover:bg-[#381C5F] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={13} className={isAnyLoading ? 'animate-spin' : ''} />
            รีเฟรชข้อมูล
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={LogIn}
          label="Login วันนี้"
          value={todayLoginCount}
          color="bg-blue-50 text-blue-600"
          sub={`รวมทั้งหมด ${loginLogs.length} รายการ`}
        />
        <StatCard
          icon={Activity}
          label="กิจกรรมแอดมิน"
          value={auditLogs.length}
          color="bg-amber-50 text-amber-600"
          sub="บันทึกทั้งหมดในระบบ"
        />
        <StatCard
          icon={Shield}
          label="การโจมตีที่ตรวจพบ"
          value={securityData?.total_waf_blocks ?? '—'}
          color="bg-red-50 text-red-600"
          sub={`ถูกล็อค ${securityData?.brute_force_locked_targets?.length ?? 0} บัญชี`}
        />
      </section>

      {/* Tabs */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Header */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? `${tab.color} ${tab.border} bg-white`
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {/* Badge counts */}
                {tab.id === 'login' && loginLogs.length > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {loginLogs.length}
                  </span>
                )}
                {tab.id === 'audit' && auditLogs.length > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {auditLogs.length}
                  </span>
                )}
                {tab.id === 'security' && (securityData?.brute_force_locked_targets?.length ?? 0) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                    {securityData.brute_force_locked_targets.length} ล็อค
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'login' && (
            <LoginLogsTab logs={loginLogs} loading={loading.login} />
          )}
          {activeTab === 'audit' && (
            <SystemAuditTab logs={auditLogs} loading={loading.audit} />
          )}
          {activeTab === 'security' && (
            <SecurityAlertsTab data={securityData} loading={loading.security} />
          )}
        </div>
      </section>
    </div>
  );
};

export default SystemLogs;

