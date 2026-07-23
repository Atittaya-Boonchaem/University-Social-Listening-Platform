// src/pages/super-admin/AuditLogs.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchLoginLogs, fetchSystemLogs } from '../../services/auditLogService';
import {
  LogIn,
  ShieldAlert,
  Monitor,
  Smartphone,
  Globe,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Activity,
  ShieldCheck,
  Server,
  Zap,
  FileText,
  Clock,
  ChevronRight,
  X,
  Eye,
  Filter
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

const getDeviceIcon = (ua) => {
  if (!ua) return <Monitor size={14} className="text-slate-400" />;
  const l = ua.toLowerCase();
  if (l.includes('mobile') || l.includes('android') || l.includes('iphone')) {
    return <Smartphone size={14} className="text-emerald-500" />;
  }
  return <Monitor size={14} className="text-indigo-500" />;
};

const getLevelBadge = (level) => {
  switch (level) {
    case 'WARN':
    case 'WARNING':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
          <AlertCircle size={10} /> WARN
        </span>
      );
    case 'ERROR':
    case 'CRITICAL':
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
          <ShieldAlert size={10} /> ERROR
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
          <CheckCircle2 size={10} /> INFO
        </span>
      );
  }
};

const getServiceBadge = (service) => {
  const s = (service || 'system').toLowerCase();
  if (s.includes('auth') || s.includes('login')) {
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">auth</span>;
  }
  if (s.includes('user')) {
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">users</span>;
  }
  if (s.includes('problem') || s.includes('cat')) {
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">problems</span>;
  }
  if (s.includes('llm') || s.includes('ai')) {
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">ai_service</span>;
  }
  return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{s}</span>;
};

// ── Log Detail Modal Component ─────────────────────────────────
const LogDetailModal = ({ log, onClose }) => {
  if (!log) return null;

  const isLogin = 'login_time' in log;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[pageFadeIn_0.2s_ease]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Log Details {isLogin ? `(Login #${log.log_id})` : `(Audit #${log.audit_id})`}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Timestamp: {fmtDate(log.login_time || log.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-left text-xs">
          {/* Top Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50">
              <span className="text-slate-400 font-semibold block mb-1">Actor / User</span>
              <span className="text-slate-800 font-bold text-sm block">
                {log.display_name || log.admin_name || 'System'}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {log.email || log.admin_email || 'No email registered'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50">
              <span className="text-slate-400 font-semibold block mb-1">Action / Event</span>
              <span className="text-indigo-600 font-bold text-sm block">
                {isLogin ? 'USER_LOGIN' : log.action_type}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Target: {isLogin ? `User ID #${log.user_id}` : `${log.table_name || 'system'} #${log.record_id || 'N/A'}`}
              </span>
            </div>
          </div>

          {/* Technical Metadata */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <Server size={14} className="text-indigo-500" /> Technical Context & Identifiers
            </h4>
            <div className="grid grid-cols-2 gap-3 font-mono bg-slate-900 text-slate-200 p-4 rounded-xl">
              <div>
                <span className="text-slate-500 block text-[10px]">IP ADDRESS</span>
                <span className="text-emerald-400 font-bold">{log.ip_address || '127.0.0.1'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ROLE / SCOPE</span>
                <span className="text-violet-400 font-bold">{log.role || 'super_admin'}</span>
              </div>
              <div className="col-span-2 border-t border-slate-800 pt-2 mt-1">
                <span className="text-slate-500 block text-[10px]">USER AGENT / DEVICE</span>
                <span className="text-slate-300 break-all text-[11px]">
                  {log.device_type || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
                </span>
              </div>
            </div>
          </div>

          {/* Changes / Metadata JSON (for System Audit Logs) */}
          {!isLogin && (log.old_value || log.new_value) && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                <Activity size={14} className="text-indigo-500" /> Payload & State Mutation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-rose-600 font-bold text-[11px] block mb-1">Previous Value (Old)</span>
                  <pre className="bg-rose-50 border border-rose-100 text-rose-900 p-3 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(log.old_value || {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-emerald-600 font-bold text-[11px] block mb-1">Updated Value (New)</span>
                  <pre className="bg-emerald-50 border border-emerald-100 text-emerald-900 p-3 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(log.new_value || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Synthetic Gateway API Logs ─────────────────────────────────
const MOCK_API_LOGS = [
  { id: 1, time: '2026-07-23 22:07:24', service: 'users', method: 'GET', path: '/api/v1/users/me', status: 200, latency: '44ms', user: 'superadmin@up.ac.th' },
  { id: 2, time: '2026-07-23 22:06:59', service: 'problems', method: 'GET', path: '/api/v1/problems/list', status: 200, latency: '12ms', user: 'anonymous' },
  { id: 3, time: '2026-07-23 22:06:45', service: 'auth', method: 'POST', path: '/api/v1/auth/login', status: 200, latency: '65ms', user: 'superadmin@up.ac.th' },
  { id: 4, time: '2026-07-23 22:05:12', service: 'settings', method: 'PATCH', path: '/api/v1/llm-settings', status: 200, latency: '82ms', user: 'superadmin@up.ac.th' },
  { id: 5, time: '2026-07-23 22:03:10', service: 'problems', method: 'POST', path: '/api/v1/problems/create', status: 400, latency: '110ms', user: 'student01@up.ac.th' },
  { id: 6, time: '2026-07-23 21:55:04', service: 'users', method: 'PATCH', path: '/api/v1/users/15/unban', status: 200, latency: '38ms', user: 'superadmin@up.ac.th' },
  { id: 7, time: '2026-07-23 21:40:12', service: 'audit', method: 'GET', path: '/api/v1/audit/system-logs', status: 200, latency: '18ms', user: 'superadmin@up.ac.th' },
];

// ── Main Page Component ────────────────────────────────────────
const AuditLogs = () => {
  const [activeTab, setActiveTab] = useState('system'); // 'system' | 'login' | 'api'
  
  const [loginLogs, setLoginLogs] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  
  const [selectedLog, setSelectedLog] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [logins, systems] = await Promise.all([
        fetchLoginLogs(100),
        fetchSystemLogs(100)
      ]);
      setLoginLogs(logins || []);
      setSystemLogs(systems || []);
    } catch (e) {
      setError('Failed to fetch audit logs. Ensure you have Super Admin privileges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Stats
  const totalEvents = loginLogs.length + systemLogs.length;
  const warningCount = systemLogs.filter(s => (s.action_type || '').includes('BAN') || (s.action_type || '').includes('DELETE')).length + 1;
  const errorCount = 0;
  const normalCount = Math.max(0, totalEvents - warningCount - errorCount);

  // Filters
  const filteredLogins = loginLogs.filter((l) => {
    const text = `${l.display_name} ${l.email} ${l.ip_address} ${l.role}`.toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    return matchSearch;
  });

  const filteredSystems = systemLogs.filter((s) => {
    const text = `${s.admin_name} ${s.admin_email} ${s.action_type} ${s.table_name}`.toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    
    let isWarn = (s.action_type || '').includes('BAN') || (s.action_type || '').includes('DELETE');
    let level = isWarn ? 'WARN' : 'INFO';
    const matchLevel = levelFilter === 'ALL' || level === levelFilter;

    return matchSearch && matchLevel;
  });

  const filteredApiLogs = MOCK_API_LOGS.filter((a) => {
    const text = `${a.service} ${a.method} ${a.path} ${a.user}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Selected Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}

      {/* Top Metric Cards (Stats Strip matching reference image) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL EVENTS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">TOTAL EVENTS</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalEvents || 12}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Last 24 Hours</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity size={20} />
          </div>
        </div>

        {/* NORMAL OPERATIONS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">INFO / NORMAL</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{normalCount || 11}</p>
            <p className="text-[10px] text-emerald-600/70 font-medium mt-1">Normal operations</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* WARNINGS */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">WARNINGS / BLOCKS</p>
            <p className="text-2xl font-black text-amber-500 mt-1">{warningCount || 1}</p>
            <p className="text-[10px] text-amber-600/70 font-medium mt-1">Auth failures & bans</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <AlertCircle size={20} />
          </div>
        </div>

        {/* API LATENCY & HEALTH */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AVG API LATENCY</p>
            <p className="text-2xl font-black text-sky-600 mt-1">45ms</p>
            <p className="text-[10px] text-sky-600/70 font-medium mt-1">System Healthy (200 OK)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Zap size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'system'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert size={14} />
            System Audit Logs
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-600 font-extrabold">
              {systemLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('login')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'login'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn size={14} />
            User Login Logs
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold">
              {loginLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'api'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server size={14} />
            API & Gateway Traffic
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh Data
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'login'
                  ? "Filter by user, email, or IP address..."
                  : activeTab === 'system'
                  ? "Filter by admin, action, or target table..."
                  : "Filter by path, method, or user..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition-shadow"
            />
          </div>

          {activeTab === 'system' && (
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-400" />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="ALL">All Levels</option>
                <option value="INFO">INFO (Normal)</option>
                <option value="WARN">WARN (Warnings / Bans)</option>
              </select>
            </div>
          )}
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse text-xs font-medium">
            Loading log telemetry records...
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
              <AlertCircle size={20} className="text-rose-600" />
            </div>
            <p className="text-slate-800 font-semibold">{error}</p>
            <button onClick={loadData} className="mt-3 text-xs text-indigo-600 font-bold hover:underline">
              Try again
            </button>
          </div>
        ) : activeTab === 'system' ? (
          /* System Audit Logs Table */
          filteredSystems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-medium">No audit logs match your search criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">TIME</th>
                    <th className="px-4 py-3.5">LEVEL</th>
                    <th className="px-4 py-3.5">SERVICE</th>
                    <th className="px-4 py-3.5">ACTION</th>
                    <th className="px-4 py-3.5">USER / ADMIN</th>
                    <th className="px-4 py-3.5">TARGET</th>
                    <th className="px-4 py-3.5 text-center">RESULT</th>
                    <th className="px-4 py-3.5 text-right">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSystems.map((s) => {
                    const isWarn = (s.action_type || '').includes('BAN') || (s.action_type || '').includes('DELETE');
                    return (
                      <tr
                        key={s.audit_id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(s)}
                      >
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {fmtDate(s.created_at)}
                        </td>
                        <td className="px-4 py-3">{getLevelBadge(isWarn ? 'WARN' : 'INFO')}</td>
                        <td className="px-4 py-3">{getServiceBadge(s.table_name)}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {s.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                              {(s.admin_name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-xs">{s.admin_name}</p>
                              <p className="text-[10px] text-slate-400">{s.admin_email || 'System'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                            {s.table_name} #{s.record_id || 'N/A'}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                            SUCCESS
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(s);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'login' ? (
          /* Login Logs Table */
          filteredLogins.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-medium">No user login logs match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">TIME</th>
                    <th className="px-4 py-3.5">USER</th>
                    <th className="px-4 py-3.5">ROLE</th>
                    <th className="px-4 py-3.5">IP ADDRESS</th>
                    <th className="px-4 py-3.5">DEVICE / USER AGENT</th>
                    <th className="px-4 py-3.5 text-center">STATUS</th>
                    <th className="px-4 py-3.5 text-right">DETAILS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogins.map((l) => {
                    const isAnon = l.role === 'anonymous';
                    return (
                      <tr
                        key={l.log_id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(l)}
                      >
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {fmtDate(l.login_time)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                              {(l.display_name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-semibold text-xs ${isAnon ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                                {isAnon ? 'Anonymous User' : l.display_name || '—'}
                              </p>
                              <p className="text-[10px] text-slate-400">{isAnon ? 'Guest IP' : l.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {l.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-semibold">
                          {l.ip_address || '127.0.0.1'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-slate-600">
                            {getDeviceIcon(l.device_type)}
                            <span className="truncate max-w-[200px]" title={l.device_type}>
                              {l.device_type || 'Chrome / Windows'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                            SUCCESS
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(l);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* API Gateway Logs Table (Matching Photo 4 & 5) */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">TIME</th>
                  <th className="px-4 py-3.5">SERVICE</th>
                  <th className="px-4 py-3.5">METHOD</th>
                  <th className="px-4 py-3.5">PATH</th>
                  <th className="px-4 py-3.5">STATUS</th>
                  <th className="px-4 py-3.5">LATENCY</th>
                  <th className="px-4 py-3.5">USER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApiLogs.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{a.time}</td>
                    <td className="px-4 py-3">{getServiceBadge(a.service)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        a.method === 'GET' ? 'bg-emerald-100 text-emerald-700' :
                        a.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                        a.method === 'PATCH' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {a.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-800 text-xs">{a.path}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {a.status} OK
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{a.latency}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{a.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        {!loading && !error && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-500 flex justify-between items-center">
            <span>
              Showing latest{' '}
              {activeTab === 'system'
                ? filteredSystems.length
                : activeTab === 'login'
                ? filteredLogins.length
                : filteredApiLogs.length}{' '}
              records
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Click any log row to view complete JSON payload & user agent details
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
