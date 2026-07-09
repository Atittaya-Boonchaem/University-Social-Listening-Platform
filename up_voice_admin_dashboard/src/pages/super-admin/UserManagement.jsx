// src/pages/super-admin/UserManagement.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { fetchUsers, banUser, unbanUser } from '../../services/userService';
import {
  Search, Users, Shield, Ban, CheckCircle2, RefreshCw,
  GraduationCap, Briefcase, Globe, Ghost, ChevronDown,
} from 'lucide-react';

// ── Role badge ─────────────────────────────────────────────────
const ROLE_META = {
  student:        { label: 'Student',        color: 'bg-indigo-100 text-indigo-700',  icon: GraduationCap },
  staff:          { label: 'Staff',           color: 'bg-violet-100 text-violet-700',  icon: Briefcase },
  public:         { label: 'Public',          color: 'bg-emerald-100 text-emerald-700',icon: Globe },
  anonymous:      { label: 'Anonymous',       color: 'bg-slate-100 text-slate-500',    icon: Ghost },
  category_admin: { label: 'Cat. Admin',      color: 'bg-amber-100 text-amber-700',    icon: Shield },
  super_admin:    { label: 'Super Admin',     color: 'bg-rose-100 text-rose-700',      icon: Shield },
  unknown:        { label: 'Unknown',         color: 'bg-gray-100 text-gray-500',      icon: Users },
};

const RoleBadge = ({ role }) => {
  const meta = ROLE_META[role] || ROLE_META.unknown;
  const Icon = meta.icon;
  return (
    <span className={`badge gap-1 ${meta.color}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
};

// ── Status badge ───────────────────────────────────────────────
const StatusBadge = ({ isActive }) =>
  isActive
    ? <span className="badge bg-emerald-100 text-emerald-700"><CheckCircle2 size={11} /> Active</span>
    : <span className="badge bg-rose-100 text-rose-700"><Ban size={11} /> Banned</span>;


// ── Confirm dialog ─────────────────────────────────────────────
const ConfirmDialog = ({ user, action, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-[pageFadeIn_0.2s_ease]">
      <h3 className="text-base font-semibold text-slate-800 mb-2">
        {action === 'ban' ? 'Ban User' : 'Unban User'}
      </h3>
      <p className="text-sm text-slate-500 mb-5">
        {action === 'ban'
          ? <>Are you sure you want to <strong>ban</strong> <span className="text-rose-600">{user.display_name || user.email || user.ip_address}</span>? Their account will be deactivated.</>
          : <>Are you sure you want to <strong>unban</strong> <span className="text-emerald-600">{user.display_name || user.email || user.ip_address}</span>?</>}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 py-2 px-4 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-70 ${
            action === 'ban' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
               <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
               {action === 'ban' ? 'Banning…' : 'Unbanning…'}
            </span>
          ) : (
             action === 'ban' ? 'Yes, Ban' : 'Yes, Unban'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Skeleton Loader ────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="animate-pulse px-4 py-3 space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-2">
        <div className="w-8 h-8 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-slate-200 rounded w-1/4" />
          <div className="h-2 bg-slate-100 rounded w-1/6" />
        </div>
        <div className="w-24 h-4 bg-slate-200 rounded-full" />
        <div className="w-20 h-4 bg-slate-200 rounded-full" />
        <div className="w-16 h-6 bg-slate-200 rounded-lg" />
      </div>
    ))}
  </div>
);


// ── Main page ──────────────────────────────────────────────────
const SAUserManagement = () => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dialog, setDialog]   = useState(null);  // { user, action }
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]     = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchUsers();
      setUsers(data || []);
    } catch (e) {
      setError('Failed to load users. Make sure you are logged in as Super Admin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleToggleBan = async () => {
    if (!dialog) return;
    setActionLoading(true);
    try {
      const user = dialog.user;
      const targetIdentifier = user.role === 'anonymous' ? user.ip_address : (user.display_name || user.email);

      if (dialog.action === 'ban') {
        await banUser(user.user_id, 'Banned by Super Admin');
        showToast(`User ${targetIdentifier} banned.`);
        // Optimistic update
        setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_active: false } : u));
      } else {
        await unbanUser(user.user_id);
        showToast(`User ${targetIdentifier} unbanned.`);
        // Optimistic update
        setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, is_active: true } : u));
      }
      setDialog(null);
    } catch (e) {
      showToast(e.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter
  const filtered = users.filter((u) => {
    const searchTarget = u.role === 'anonymous' ? u.ip_address : (u.display_name || u.email || '');
    const matchSearch =
      !search ||
      (searchTarget || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 animate-[pageFadeIn_0.2s_ease]">
          {toast}
        </div>
      )}

      {/* Confirm dialog */}
      {dialog && (
        <ConfirmDialog
          user={dialog.user}
          action={dialog.action}
          onConfirm={handleToggleBan}
          onCancel={() => !actionLoading && setDialog(null)}
          isLoading={actionLoading}
        />
      )}

      {/* Summary strip (Filter quick-buttons) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['student', 'staff', 'public', 'anonymous'].map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          return (
            <div
              key={role}
              onClick={() => setRoleFilter(r => r === role ? 'all' : role)}
              className={`bg-white rounded-2xl border px-4 py-4 flex items-center gap-3 cursor-pointer transition-all shadow-sm ${
                roleFilter === role ? 'border-indigo-400 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:shadow'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 leading-tight">{roleCounts[role] ?? 0}</p>
                <p className="text-xs text-slate-400 font-medium">{meta.label}s</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="user-search-input"
              type="text"
              placeholder="Search by name, email, or IP address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-shadow"
            />
          </div>
          <div className="relative">
            <select
              id="role-filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="all">All Roles</option>
              {Object.keys(ROLE_META).map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={loadUsers}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Table / Loading / Error states */}
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
              <Ban size={20} className="text-rose-600" />
            </div>
            <p className="text-slate-800 font-semibold">{error}</p>
            <button 
              onClick={loadUsers}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center text-slate-400">
             <Search size={32} className="mb-3 opacity-20" />
             <p className="font-medium text-slate-600">No users found</p>
             <p className="text-sm">Try adjusting your search or role filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Identifier</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isAnon = u.role === 'anonymous';
                  // Display logic depends on whether it's an anonymous user
                  const primaryText = isAnon ? 'Anonymous User' : (u.display_name || '—');
                  const secondaryText = isAnon ? (u.ip_address || 'Unknown IP') : (u.email || '—');
                  const avatarLetter = isAnon ? 'A' : (u.display_name || u.email || '?')[0].toUpperCase();
                  
                  return (
                    <tr key={u.user_id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm ${
                            isAnon ? 'bg-slate-300' : 'bg-gradient-to-br from-indigo-400 to-violet-500'
                          }`}>
                            {avatarLetter}
                          </div>
                          <div>
                            <p className={`font-medium text-sm ${isAnon ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                              {primaryText}
                            </p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">ID #{u.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isAnon ? (
                          <code className="text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-mono shadow-inner border border-slate-200">
                            {secondaryText}
                          </code>
                        ) : (
                          <span className="text-sm text-slate-500">{secondaryText}</span>
                        )}
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td><StatusBadge isActive={u.is_active} /></td>
                      <td className="text-right">
                        <button
                          id={`user-action-btn-${u.user_id}`}
                          onClick={() => setDialog({ user: u, action: u.is_active ? 'ban' : 'unban' })}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border shadow-sm ${
                            u.is_active
                              ? 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.is_active ? 'Ban' : 'Unban'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs font-medium text-slate-500 text-right">
            Showing {filtered.length} of {users.length} total users
          </div>
        )}
      </div>
    </div>
  );
};

export default SAUserManagement;
