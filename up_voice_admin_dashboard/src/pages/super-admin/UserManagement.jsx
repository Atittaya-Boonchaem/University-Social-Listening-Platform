// src/pages/super-admin/UserManagement.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchUsers, banUser, unbanUser } from '../../services/userService';
import api from '../../services/api';
import {
  Search, Users, Shield, Ban, CheckCircle2, RefreshCw,
  GraduationCap, Briefcase, Globe, Ghost, ChevronDown, ChevronLeft, ChevronRight,
  MoreVertical, Eye, Edit, Trash2, ShieldAlert, X, Filter, Copy, Key, Sparkles, Check
} from 'lucide-react';

// ── Role badge ─────────────────────────────────────────────────
const ROLE_META = {
  student:        { label: 'Student',        color: 'bg-indigo-100 text-indigo-700 border-indigo-200',  icon: GraduationCap },
  staff:          { label: 'Staff',           color: 'bg-violet-100 text-violet-700 border-violet-200',  icon: Briefcase },
  public:         { label: 'Public',          color: 'bg-emerald-100 text-emerald-700 border-emerald-200',icon: Globe },
  anonymous:      { label: 'Anonymous',       color: 'bg-slate-100 text-slate-500 border-slate-200',    icon: Ghost },
  category_admin: { label: 'Cat. Admin',      color: 'bg-amber-100 text-amber-700 border-amber-200',    icon: Shield },
  super_admin:    { label: 'Super Admin',     color: 'bg-rose-100 text-rose-700 border-rose-200',      icon: Shield },
  unknown:        { label: 'Unknown',         color: 'bg-gray-100 text-gray-500 border-gray-200',      icon: Users },
};

const RoleBadge = ({ role }) => {
  const meta = ROLE_META[role] || ROLE_META.unknown;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${meta.color}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
};

// ── Status badge ───────────────────────────────────────────────
const StatusBadge = ({ isActive }) =>
  isActive
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12} /> Active</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200"><Ban size={12} /> Banned</span>;

// ── Helper to generate random secure password ─────────────────
const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = 'UP#';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

// ── Confirm dialog ─────────────────────────────────────────────
const ConfirmDialog = ({ user, action, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-left border border-slate-100">
      <h3 className="text-base font-bold text-slate-800 mb-2">
        {action === 'ban' ? 'ระงับการใช้งานบัญชี (Ban User)' : 'ปลดระงับบัญชี (Unban User)'}
      </h3>
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        {action === 'ban'
          ? <>คุณแน่ใจหรือไม่ว่าต้องการระงับบัญชีของ <strong className="text-rose-600">{user.display_name || user.email || user.ip_address}</strong>?</>
          : <>คุณแน่ใจหรือไม่ว่าต้องการคืนสิทธิ์การใช้งานให้ <strong className="text-emerald-600">{user.display_name || user.email || user.ip_address}</strong>?</>}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 py-2 px-4 rounded-xl text-white text-xs font-bold transition-colors disabled:opacity-70 ${
            action === 'ban' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isLoading ? 'กำลังดำเนินการ...' : action === 'ban' ? 'ยืนยันระงับบัญชี' : 'ยืนยันปลดระงับ'}
        </button>
      </div>
    </div>
  </div>
);

// ── Skeleton Loader ────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="animate-pulse p-6 space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 rounded w-1/4" />
          <div className="h-2.5 bg-slate-100 rounded w-1/6" />
        </div>
        <div className="w-24 h-6 bg-slate-200 rounded-full" />
        <div className="w-20 h-6 bg-slate-200 rounded-full" />
        <div className="w-16 h-8 bg-slate-200 rounded-lg" />
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
  const [dialog, setDialog]   = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]     = useState('');

  // Pagination & Display limit
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(10); // 5, 10, 25, 50, 100, or 'all'

  const [activeMenuUserId, setActiveMenuUserId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState(true);
  const [editCategory, setEditCategory] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset Password states
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { user, password }
  const [copied, setCopied] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
      setError('ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาตรวจสอบการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Load Categories for Category Admin assignment
  useEffect(() => {
    async function loadCats() {
      try {
        const res = await api.get('/settings/categories');
        if (res.data && res.data.data) {
          setAvailableCategories(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    }
    loadCats();
  }, []);

  // Filtering
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const q = search.toLowerCase().trim();
      const matchQuery =
        !q ||
        (u.display_name && u.display_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.ip_address && u.ip_address.toLowerCase().includes(q)) ||
        String(u.user_id).includes(q);
      return matchRole && matchQuery;
    });
  }, [users, roleFilter, search]);

  // Role counters
  const roleCounts = useMemo(() => {
    const c = {};
    users.forEach((u) => {
      c[u.role] = (c[u.role] || 0) + 1;
    });
    return c;
  }, [users]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, pageSize]);

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / pageSize) || 1;

  const paginatedUsers = useMemo(() => {
    if (pageSize === 'all') return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const startIndex = (currentPage - 1) * (pageSize === 'all' ? totalItems : pageSize);
  const endIndex = Math.min(startIndex + (pageSize === 'all' ? totalItems : pageSize), totalItems);

  // Ban / Unban
  const handleConfirmAction = async () => {
    if (!dialog) return;
    setActionLoading(true);
    try {
      if (dialog.action === 'ban') {
        await banUser(dialog.user.user_id, 'Admin action');
        showToast(`⚡ ระงับบัญชี #${dialog.user.user_id} เรียบร้อยแล้ว`);
      } else {
        await unbanUser(dialog.user.user_id);
        showToast(`✅ คืนสิทธิ์บัญชี #${dialog.user.user_id} เรียบร้อยแล้ว`);
      }
      setDialog(null);
      await loadUsers();
    } catch (e) {
      showToast(`❌ เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Role / Status
  const handleUpdateRoleStatus = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setIsUpdating(true);
    try {
      // 1. If role is super_admin
      if (editRole === 'super_admin' && editUser.role !== 'super_admin') {
        await api.post(`/users/${editUser.user_id}/promote/super-admin`);
      }
      // 2. If role is category_admin
      if (editRole === 'category_admin' && editCategory) {
        await api.post(`/users/${editUser.user_id}/assign/category-admin`, null, {
          params: { category_id: editCategory }
        });
      }
      // 3. Status changes
      if (editStatus !== editUser.is_active) {
        if (editStatus) {
          await unbanUser(editUser.user_id);
        } else {
          await banUser(editUser.user_id, 'Status updated by Super Admin');
        }
      }
      showToast('✅ อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว');
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      showToast('❌ ไม่สามารถอัปเดตข้อมูลได้: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!showDeleteConfirm) return;
    setIsDeleting(true);
    try {
      await api.delete(`/users/${showDeleteConfirm.user_id}`);
      showToast('✅ ลบผู้ใช้งานเรียบร้อยแล้ว');
      setShowDeleteConfirm(null);
      await loadUsers();
    } catch (err) {
      showToast('❌ ไม่สามารถลบผู้ใช้ได้: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset Password Handler
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    if (!newPassword || newPassword.length < 6) {
      showToast('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setIsResetting(true);
    try {
      await api.post(`/users/${resetPwdUser.user_id}/reset-password`, { new_password: newPassword });
      setResetResult({ user: resetPwdUser, password: newPassword });
      setShowResetPwdModal(false);
      showToast('✅ รีเซ็ตรหัสผ่านสำเร็จ!');
    } catch (err) {
      showToast('❌ เปลี่ยนรหัสผ่านไม่สำเร็จ: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsResetting(false);
    }
  };

  const handleCopyPassword = () => {
    if (resetResult?.password) {
      navigator.clipboard.writeText(resetResult.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('📋 คัดลอกรหัสผ่านลง Clipboard เรียบร้อย!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-24 text-left space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={24} className="text-indigo-600" />
            <span>จัดการผู้ใช้งานระบบ (User Management)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            บริหารจัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง (Roles) และสถานะบัญชีทั้งหมดในระบบ
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="px-4 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors shadow-xs flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* Role Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {Object.keys(ROLE_META).filter(r => r !== 'unknown').map((role) => {
          const meta = ROLE_META[role];
          const Icon = meta.icon;
          return (
            <div
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                roleFilter === role
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-xs'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${roleFilter === role ? 'bg-white/20 text-white' : meta.color}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className={`text-base font-black leading-tight ${roleFilter === role ? 'text-white' : 'text-slate-800'}`}>
                  {roleCounts[role] ?? 0}
                </p>
                <p className={`text-[11px] font-bold ${roleFilter === role ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {meta.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible w-full">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="relative flex-1 max-w-lg">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="user-search-input"
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล, หรือ IP Address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                id="role-filter-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white cursor-pointer"
              >
                <option value="all">ทุกบทบาท (All Roles)</option>
                {Object.keys(ROLE_META).filter(r => r !== 'unknown').map((r) => (
                  <option key={r} value={r}>{ROLE_META[r].label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
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
              className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-bold"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center text-slate-400">
             <Search size={32} className="mb-3 opacity-20" />
             <p className="font-medium text-slate-600">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</p>
             <p className="text-xs">ลองค้นหาด้วยคำใหม่หรือเปลี่ยนการกรองบทบาท</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="data-table w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ใช้งาน (User)</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ระบุตัวตน (Identifier)</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">บทบาท (Role)</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ (Status)</th>
                  <th className="py-3.5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedUsers.map((u) => {
                  const isAnon = u.role === 'anonymous';
                  const primaryText = isAnon ? 'Anonymous User' : (u.display_name || '—');
                  const secondaryText = isAnon ? (u.ip_address || 'Unknown IP') : (u.email || '—');
                  const avatarLetter = isAnon ? 'A' : (u.display_name || u.email || '?')[0].toUpperCase();
                  
                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs ${
                            isAnon ? 'bg-slate-300' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
                          }`}>
                            {avatarLetter}
                          </div>
                          <div>
                            <p className={`font-bold text-xs ${isAnon ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                              {primaryText}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID #{u.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isAnon ? (
                          <code className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-mono border border-slate-200">
                            {secondaryText}
                          </code>
                        ) : (
                          <span className="text-xs text-slate-600 font-medium">{secondaryText}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4"><RoleBadge role={u.role} /></td>
                      <td className="py-3.5 px-4"><StatusBadge isActive={u.is_active} /></td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Role/Status Button */}
                          <button
                            onClick={() => {
                              setEditUser(u);
                              setEditRole(u.role);
                              setEditStatus(u.is_active);
                              setEditCategory(u.category_id || (u.categories && u.categories[0]?.id) || null);
                            }}
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-xs font-bold flex items-center gap-1"
                            title="แก้ไขบทบาท/สถานะ"
                          >
                            <Edit size={14} />
                            <span>แก้ไข</span>
                          </button>

                          {/* Reset Password Button (for non-anonymous users) */}
                          {!isAnon && (
                            <button
                              onClick={() => {
                                setResetPwdUser(u);
                                setNewPassword(generateRandomPassword());
                                setShowResetPwdModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors text-xs font-bold flex items-center gap-1"
                              title="รีเซ็ตรหัสผ่าน"
                            >
                              <Key size={14} />
                              <span>รีเซ็ตพาส</span>
                            </button>
                          )}

                          {/* Ban/Unban Button */}
                          <button
                            onClick={() => setDialog({ user: u, action: u.is_active ? 'ban' : 'unban' })}
                            className={`p-1.5 rounded-lg transition-colors text-xs font-bold ${
                              u.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                            title={u.is_active ? 'ระงับบัญชี' : 'ปลดระงับบัญชี'}
                          >
                            <Ban size={14} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setShowDeleteConfirm(u)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                            title="ลบผู้ใช้"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Enhanced Bottom Pagination & Items Per Page Filter */}
        {!loading && !error && (
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-600 rounded-b-2xl">
            
            {/* Left Summary */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">
                แสดง {totalItems === 0 ? 0 : startIndex + 1} - {endIndex} จากทั้งหมด {totalItems} รายการ
              </span>
              {filtered.length < users.length && (
                <span className="text-slate-400 text-[11px]"> (กรองจาก {users.length} บัญชี)</span>
              )}
            </div>

            {/* Right Controls (Items per page + Nav buttons) */}
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Items Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs font-semibold">จำนวนคนต่อหน้า:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
                >
                  <option value={5}>5 คนต่อหน้า</option>
                  <option value={10}>10 คนต่อหน้า</option>
                  <option value={25}>25 คนต่อหน้า</option>
                  <option value={50}>50 คนต่อหน้า</option>
                  <option value={100}>100 คนต่อหน้า</option>
                  <option value="all">แสดงทั้งหมด ({totalItems} คน)</option>
                </select>
              </div>

              {/* Page Nav Buttons */}
              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="px-3 text-xs font-bold text-slate-700">
                    หน้า {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-100 bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="หน้าถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Action Dialog (Ban / Unban) */}
      {dialog && (
        <ConfirmDialog
          user={dialog.user}
          action={dialog.action}
          onConfirm={handleConfirmAction}
          onCancel={() => setDialog(null)}
          isLoading={actionLoading}
        />
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-left border border-slate-100">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">แก้ไขบทบาทและสถานะ</h3>
                  <p className="text-xs text-slate-500 mt-1">ผู้ใช้งาน: {editUser.display_name || editUser.email || editUser.ip_address}</p>
                </div>
                <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-lg">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateRoleStatus} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">บทบาท (Role)</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="student">Student (นิสิต)</option>
                    <option value="staff">Staff (บุคลากร)</option>
                    <option value="public">Public (ประชาชนทั่วไป)</option>
                    <option value="category_admin">Category Admin (แอดมินหมวดหมู่)</option>
                    <option value="super_admin">Super Admin (ผู้ดูแลระบบสูงสุด)</option>
                  </select>
                </div>

                {editRole === 'category_admin' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">หมวดหมู่ที่มอบหมาย</label>
                    <select
                      value={editCategory || ''}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">-- เลือกหมวดหมู่ --</option>
                      {availableCategories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">สถานะบัญชี (Status)</label>
                  <select
                    value={editStatus ? "active" : "banned"}
                    onChange={(e) => setEditStatus(e.target.value === "active")}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="active">Active (ใช้งานได้ปกติ)</option>
                    <option value="banned">Banned (ระงับการใช้งาน)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
                  >
                    {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-left border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-2">ยืนยันการลบผู้ใช้งาน</h3>
            <p className="text-xs text-slate-500 mb-4">
              คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ <strong className="text-slate-800">{showDeleteConfirm.display_name || showDeleteConfirm.email || showDeleteConfirm.ip_address}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Input Modal */}
      {showResetPwdModal && resetPwdUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-left border border-slate-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Key size={18} className="text-amber-500" />
                  <span>รีเซ็ตรหัสผ่านผู้ใช้ (Reset Password)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ตั้งรหัสผ่านใหม่สำหรับ: <span className="font-bold text-indigo-600">{resetPwdUser.display_name || resetPwdUser.email}</span>
                </p>
              </div>
              <button onClick={() => setShowResetPwdModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 mt-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">รหัสผ่านใหม่ (New Password)</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Sparkles size={13} />
                    <span>สุ่มรหัสผ่านใหม่</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="ป้อนรหัสผ่านใหม่ หรือกดสุ่มด้านบน"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-mono font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPwdModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Key size={14} />
                      ยืนยันเปลี่ยนรหัสผ่าน
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Success Result Modal (with Copy button) */}
      {resetResult && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-left border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 size={24} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1">รีเซ็ตรหัสผ่านสำเร็จ!</h3>
            <p className="text-xs text-slate-500 mb-4">
              รหัสผ่านของบัญชี <strong className="text-slate-800">{resetResult.user.display_name || resetResult.user.email}</strong> ถูกเปลี่ยนเป็นรหัสใหม่เรียบร้อยแล้ว
            </p>

            {/* Generated Password Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">รหัสผ่านใหม่ (Temporary Password)</p>
                <p className="text-base font-mono font-black text-indigo-700 tracking-wider mt-0.5 select-all">
                  {resetResult.password}
                </p>
              </div>
              <button
                onClick={handleCopyPassword}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกรหัส'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setResetResult(null)}
                className="px-6 py-2.5 bg-[#2B164D] text-white text-xs font-bold rounded-xl hover:bg-[#1a0d30] transition-colors shadow-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

    </div>
  );
};

export default SAUserManagement;
