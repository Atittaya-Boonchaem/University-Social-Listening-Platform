// src/pages/super-admin/UserManagement.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { fetchUsers, banUser, unbanUser } from '../../services/userService';
import api from '../../services/api';
import {
  Search, Users, Shield, Ban, CheckCircle2, RefreshCw,
  GraduationCap, Briefcase, Globe, Ghost, ChevronDown,
  MoreVertical, Eye, Edit, Trash2, ShieldAlert, X,
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

  const [activeMenuUserId, setActiveMenuUserId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState(true);
  const [editCategory, setEditCategory] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/problems/categories');
      setAvailableCategories(res.data?.data?.items || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

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

  useEffect(() => { 
    loadUsers(); 
    loadCategories();
  }, [loadUsers, loadCategories]);

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
                      <td className="text-right p-4 relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuUserId(activeMenuUserId === u.user_id ? null : u.user_id);
                          }}
                          className="inline-flex items-center text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                          title="เมนูเพิ่มเติม"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenuUserId === u.user_id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuUserId(null)} />
                            <div className="absolute right-4 top-10 bg-white border border-slate-100 rounded-lg shadow-lg z-20 py-1.5 min-w-[150px] text-left">
                              <button
                                onClick={() => {
                                  setActiveMenuUserId(null);
                                  setEditUser(u);
                                  setEditRole(u.role);
                                  setEditStatus(u.is_active);
                                  setEditCategory(u.category_id || (u.categories && u.categories[0]?.id) || null);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2"
                              >
                                <Edit className="w-3.5 h-3.5 text-emerald-500" />
                                แก้ไข (บทบาท/สถานะ)
                              </button>
                              {u.role === 'category_admin' && (
                                <button
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    setResetPwdUser(u);
                                    setNewPassword('');
                                    setShowResetPwdModal(true);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                  รีเซ็ตรหัสผ่าน
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setActiveMenuUserId(null);
                                  setShowDeleteConfirm(u);
                                  setIsDeleting(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-red-600 text-xs font-medium flex items-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                ลบผู้ใช้งาน
                              </button>
                            </div>
                          </>
                        )}
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

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-left">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">แก้ไขบทบาทและสถานะ</h3>
                  <p className="text-xs text-slate-500 mt-1">แก้ไขข้อมูลผู้ใช้: {editUser.display_name || editUser.email || editUser.ip_address}</p>
                </div>
                <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">บทบาท (Role)</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="public">Public</option>
                    <option value="category_admin">Category Admin (แอดมินปัญหา)</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {editRole === 'category_admin' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">หมวดหมู่ที่ดูแล (Category)</label>
                    <select
                      value={editCategory || ''}
                      onChange={(e) => setEditCategory(Number(e.target.value) || null)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm bg-white"
                    >
                      <option value="">เลือกหมวดหมู่...</option>
                      {availableCategories.map((c) => (
                        <option key={c.category_id || c.id} value={c.category_id || c.id}>
                          {c.category_name || c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">สถานะการใช้งาน (Status)</label>
                  <select
                    value={editStatus ? 'active' : 'suspended'}
                    onChange={(e) => setEditStatus(e.target.value === 'active')}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm bg-white"
                  >
                    <option value="active">Active (ปกติ)</option>
                    <option value="suspended">Suspended / Banned (ระงับการใช้งาน)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex gap-3 justify-end">
              <button
                onClick={() => setEditUser(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isUpdating}
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    await api.put(`/users/${editUser.user_id}`, {
                      role: editRole,
                      is_active: editStatus,
                      category_id: editCategory,
                    });
                    showToast("อัปเดตข้อมูลผู้ใช้สำเร็จ!");
                    setEditUser(null);
                    loadUsers();
                  } catch (err) {
                    showToast("อัปเดตล้มเหลว: " + (err.response?.data?.detail || err.message));
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 animate-pulse"
              >
                {isUpdating ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPwdModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-left">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">รีเซ็ตรหัสผ่าน</h3>
              <p className="text-xs text-slate-500 mb-4">
                ตั้งค่ารหัสผ่านใหม่สำหรับแอดมินปัญหานี้: <span className="font-semibold text-slate-700">{resetPwdUser?.display_name || resetPwdUser?.email}</span>
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">รหัสผ่านใหม่ *</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none text-sm transition-all"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end border-t">
              <button
                onClick={() => setShowResetPwdModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isResetting}
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  if (!newPassword.trim() || newPassword.length < 6) {
                    alert("กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร");
                    return;
                  }
                  setIsResetting(true);
                  try {
                    await api.post(`/users/${resetPwdUser.user_id}/reset-password`, { password: newPassword });
                    showToast("รีเซ็ตรหัสผ่านสำเร็จ!");
                    setShowResetPwdModal(false);
                    setNewPassword('');
                  } catch (err) {
                    alert("รีเซ็ตรหัสผ่านล้มเหลว: " + (err.response?.data?.detail || err.message));
                  } finally {
                    setIsResetting(false);
                  }
                }}
                disabled={isResetting}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isResetting ? 'กำลังเปลี่ยน...' : 'บันทึกรหัสผ่านใหม่'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-left">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">ลบผู้ใช้งาน?</h3>
              <p className="text-slate-500 text-sm">
                คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน{' '}
                <span className="font-semibold text-gray-800">{showDeleteConfirm.display_name || showDeleteConfirm.email}</span>?
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex gap-3 justify-end border-t">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await api.delete(`/users/${showDeleteConfirm.user_id}`);
                    showToast("ลบผู้ใช้งานสำเร็จ!");
                    setShowDeleteConfirm(null);
                    loadUsers();
                  } catch (err) {
                    showToast("ลบผู้ใช้งานล้มเหลว: " + (err.response?.data?.detail || err.message));
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SAUserManagement;
