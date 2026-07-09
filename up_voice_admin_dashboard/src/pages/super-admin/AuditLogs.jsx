// src/pages/super-admin/AuditLogs.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { fetchLoginLogs, fetchSystemLogs } from '../../services/auditLogService';
import { LogIn, ShieldAlert, Monitor, Smartphone, Globe, Search, RefreshCw, AlertCircle } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const getDeviceIcon = (ua) => {
  if (!ua) return <Monitor size={14} className="text-slate-400" />;
  const l = ua.toLowerCase();
  if (l.includes('mobile') || l.includes('android') || l.includes('iphone')) {
    return <Smartphone size={14} className="text-emerald-500" />;
  }
  return <Monitor size={14} className="text-indigo-500" />;
};

// ── Skeleton Loader ────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="animate-pulse p-4 space-y-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-2">
        <div className="w-8 h-8 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-1/4" />
          <div className="h-2 bg-slate-100 rounded w-1/6" />
        </div>
        <div className="w-32 h-4 bg-slate-200 rounded-lg" />
        <div className="w-24 h-4 bg-slate-200 rounded-lg" />
        <div className="w-20 h-4 bg-slate-200 rounded-lg" />
      </div>
    ))}
  </div>
);

// ── Main page ──────────────────────────────────────────────────
const AuditLogs = () => {
  const [activeTab, setActiveTab] = useState('login');
  
  const [loginLogs, setLoginLogs] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [logins, systems] = await Promise.all([
        fetchLoginLogs(100),
        fetchSystemLogs(100)
      ]);
      setLoginLogs(logins);
      setSystemLogs(systems);
    } catch (e) {
      setError('Failed to fetch audit logs. Ensure you have Super Admin privileges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filters
  const filteredLogins = loginLogs.filter((l) => {
    const text = `${l.display_name} ${l.email} ${l.ip_address}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });

  const filteredSystems = systemLogs.filter((s) => {
    const text = `${s.admin_name} ${s.action_type} ${s.table_name}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('login')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            activeTab === 'login'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-indigo-50 border border-slate-200'
          }`}
        >
          <LogIn size={16} />
          User Login Logs
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            activeTab === 'system'
              ? 'bg-rose-600 text-white'
              : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-200'
          }`}
        >
          <ShieldAlert size={16} />
          Admin System Actions
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'login' ? "Search by user, email, or IP..." : "Search by admin, action, or table..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-shadow"
            />
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
              <AlertCircle size={20} className="text-rose-600" />
            </div>
            <p className="text-slate-800 font-semibold">{error}</p>
            <button onClick={loadData} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">Try again</button>
          </div>
        ) : activeTab === 'login' ? (
          /* Login Logs Table */
          filteredLogins.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No login logs match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>IP Address</th>
                    <th>Device</th>
                    <th>Login Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogins.map((l) => {
                    const isAnon = l.role === 'anonymous';
                    return (
                      <tr key={l.log_id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0">
                              {(l.display_name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className={`font-medium text-sm ${isAnon ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                                {isAnon ? 'Anonymous User' : (l.display_name || '—')}
                              </p>
                              <p className="text-xs text-slate-400">{isAnon ? 'No email' : (l.email || '—')}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-slate-100 text-slate-600">{l.role}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Globe size={13} className="opacity-50" />
                            {isAnon ? (
                              <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono border border-slate-200 shadow-inner">
                                {l.ip_address || 'Unknown'}
                              </code>
                            ) : (
                              <span className="text-sm">{l.ip_address || '—'}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(l.device_type)}
                            <span className="text-xs text-slate-500 max-w-[120px] truncate" title={l.device_type}>
                              {l.device_type || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm font-medium text-slate-600">{fmtDate(l.login_time)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* System Logs Table */
          filteredSystems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No system logs match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target Table</th>
                    <th>Record ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSystems.map((s) => (
                    <tr key={s.audit_id}>
                      <td className="text-sm font-medium text-slate-600">{fmtDate(s.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold flex-shrink-0">
                            {(s.admin_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{s.admin_name}</p>
                            <p className="text-xs text-slate-400">{s.admin_email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-amber-50 text-amber-700 border border-amber-100 text-[10px] uppercase tracking-wider">
                          {s.action_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <code className="text-xs bg-slate-50 px-2 py-1 rounded text-slate-500 font-mono">
                          {s.table_name}
                        </code>
                      </td>
                      <td className="text-slate-500 text-sm">
                        {s.record_id ? `#${s.record_id}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Footer */}
        {!loading && !error && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs font-medium text-slate-500 text-right">
            Showing latest {activeTab === 'login' ? filteredLogins.length : filteredSystems.length} records
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
