// src/pages/super-admin/UserManagement.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchUsers, banUser, unbanUser } from '../../services/userService';
import { sendInvite } from '../../services/adminInviteService';
import api from '../../services/api';
import {
  Search, Users, Shield, Ban, CheckCircle2, RefreshCw,
  GraduationCap, Briefcase, Globe, Ghost, ChevronDown, ChevronLeft, ChevronRight,
  MoreVertical, Edit, Trash2, ShieldAlert, X, Copy, Key, Sparkles, Check,
  UserPlus, Mail, Building2, Download, Server, Lock
} from 'lucide-react';

// ── Role badge styling ─────────────────────────────────────────
const ROLE_META = {
  student:        { label: 'นิสิต (Student)',           color: 'bg-purple-50 text-purple-700 border-purple-200',  icon: GraduationCap },
  staff:          { label: 'บุคลากร (Staff)',          color: 'bg-amber-50 text-amber-700 border-amber-200',    icon: Briefcase },
  public:         { label: 'บุคคลทั่วไป (Public)',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Globe },
  anonymous:      { label: 'ไม่ระบุตัวตน (Anonymous)',  color: 'bg-slate-100 text-slate-700 border-slate-200',    icon: Ghost },
  category_admin: { label: 'แอดมินหมวดหมู่ (Cat. Admin)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Shield },
  super_admin:    { label: 'ผู้ดูแลสูงสุด (Super Admin)', color: 'bg-rose-50 text-rose-700 border-rose-200',     icon: Shield },
  unknown:        { label: 'ไม่ระบุ (Unknown)',        color: 'bg-gray-100 text-gray-500 border-gray-200',       icon: Users },
};

const RoleBadge = ({ role }) => {
  const meta = ROLE_META[role] || ROLE_META.unknown;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.color}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
};

// ── Status badge ───────────────────────────────────────────────
const StatusBadge = ({ isActive }) =>
  isActive
    ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
        <Check size={12} className="text-emerald-600 stroke-[2.5]" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
        <Ban size={12} className="text-rose-600" />
        Banned
      </span>
    );

// ── Helper to generate random secure password ─────────────────
const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pass = 'UP#';
  for (let i = 0; i < 6; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

// ── Confirm dialog (Ban / Unban) ───────────────────────────────
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

// ── Table Skeleton ─────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="animate-pulse p-6 space-y-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 rounded w-1/4" />
          <div className="h-2.5 bg-slate-100 rounded w-1/6" />
        </div>
        <div className="w-28 h-6 bg-slate-200 rounded-full" />
        <div className="w-20 h-6 bg-slate-200 rounded-full" />
        <div className="w-24 h-8 bg-slate-200 rounded-lg" />
      </div>
    ))}
  </div>
);

// ── Main SAUserManagement Page ─────────────────────────────────
const SAUserManagement = () => {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dialog, setDialog]         = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]           = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Edit User Modal
  const [editUser, setEditUser]         = useState(null);
  const [editRole, setEditRole]         = useState('');
  const [editStatus, setEditStatus]     = useState(true);
  const [editCategory, setEditCategory] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isUpdating, setIsUpdating]     = useState(false);

  // Delete User Confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting]               = useState(false);

  // Reset Password Modal
  const [showResetPwdModal, setShowResetPwdModal] = useState(false);
  const [resetPwdUser, setResetPwdUser]           = useState(null);
  const [newPassword, setNewPassword]             = useState('');
  const [isResetting, setIsResetting]             = useState(false);
  const [resetResult, setResetResult]             = useState(null);
  const [copied, setCopied]                       = useState(false);

  // Invite Modal Dialog (Screenshot 2)
  const [showInviteModal, setShowInviteModal]     = useState(false);
  const [inviteEmail, setInviteEmail]             = useState('');
  const [inviteRole, setInviteRole]               = useState('category_admin'); // 'category_admin' | 'dispatcher' | 'super_admin'
  const [inviteCategoryId, setInviteCategoryId]   = useState(null);
  const [isInviting, setIsInviting]               = useState(false);

  // Active Directory Info Modal
  const [showADModal, setShowADModal]             = useState(false);

  // Active Menu Dropdown state
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);

  // Close 3-dots action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-actions-menu')) {
        setActiveMenuUserId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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

  // Load Categories for assignment
  useEffect(() => {
    async function loadCats() {
      try {
        const res = await api.get('/problems/categories');
        const items = res.data?.data?.items || res.data?.data || [];
        setAvailableCategories(items);
        if (items.length > 0 && !inviteCategoryId) {
          setInviteCategoryId(items[0].category_id);
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
  }, [search, roleFilter]);

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

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
    if (editRole === 'category_admin' && !editCategory) {
      showToast('⚠️ กรุณาเลือกหมวดหมู่ที่ต้องการมอบหมาย');
      return;
    }
    setIsUpdating(true);
    try {
      // 1. Update role if changed or if category changed for category admin
      const roleChanged = editRole !== editUser.role;
      const catChanged = editRole === 'category_admin' && String(editCategory) !== String(editUser.category_id);

      if (roleChanged || catChanged) {
        await api.post(`/users/${editUser.user_id}/set-role`, {
          role: editRole,
          category_id: editRole === 'category_admin' ? Number(editCategory) : null,
        });
      }

      // 2. Update status (active / banned) if changed
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

  // Send Admin Invite Handler (Screenshot 2)
  const handleSendInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      showToast('❌ กรุณาระบุอีเมลมหาวิทยาลัย (@up.ac.th)');
      return;
    }
    setIsInviting(true);
    try {
      const payload = {
        email: inviteEmail.trim(),
        role: inviteRole,
        category_id: inviteRole === 'super_admin' ? null : inviteCategoryId,
        expiration_days: 7,
      };
      await sendInvite(payload);
      showToast(`🚀 ส่งคำเชิญไปยัง ${inviteEmail} เรียบร้อยแล้ว!`);
      setShowInviteModal(false);
      setInviteEmail('');
      await loadUsers();
    } catch (err) {
      showToast('❌ ไม่สามารถส่งคำเชิญได้: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsInviting(false);
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast('⚠️ ไม่มีข้อมูลสำหรับการส่งออก');
      return;
    }
    const headers = ['User ID', 'Name', 'Identifier (Email/IP)', 'Role', 'Status', 'Registered Date'];
    const rows = filtered.map((u) => [
      u.user_id,
      `"${(u.display_name || (u.role === 'anonymous' ? 'Anonymous User' : '')).replace(/"/g, '""')}"`,
      `"${(u.email || u.ip_address || '').replace(/"/g, '""')}"`,
      u.role,
      u.is_active ? 'Active' : 'Banned',
      u.created_at || '—'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `up_connect_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 ส่งออกไฟล์ CSV เรียบร้อยแล้ว');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16 text-left">
      
      {/* ─── Page Header Card ─── */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#4B267D] flex items-center justify-center shrink-0 border border-purple-100">
            <Users size={24} className="text-[#4B267D]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
              จัดการผู้ใช้งานระบบ (User Management)
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              บริหารจัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง (Roles) และสถานะบัญชีทั้งหมดในระบบ UP Civic Intelligence
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center gap-1.5 transition-colors bg-white shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#4B267D]" : "text-[#4B267D]"} />
            <span>รีเฟรชข้อมูล</span>
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 rounded-xl bg-[#4B267D] hover:bg-[#3E2166] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-sm shadow-[#4B267D]/20 cursor-pointer"
          >
            <UserPlus size={14} />
            <span>+ เชิญผู้ดูแลหรือเจ้าหน้าที่ใหม่</span>
          </button>
        </div>
      </section>

      {/* ─── 6 Responsive Metric Stat Badges ─── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Metric 1: นิสิต */}
        <div
          onClick={() => setRoleFilter(roleFilter === 'student' ? 'all' : 'student')}
          className={`p-3.5 rounded-xl border shadow-xs transition-all cursor-pointer ${
            roleFilter === 'student'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
              : 'bg-white border-purple-100/90 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              roleFilter === 'student' ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600'
            }`}>
              <GraduationCap size={20} />
            </div>
            <div className="min-w-0">
              <span className={`text-xl font-extrabold leading-tight ${roleFilter === 'student' ? 'text-white' : 'text-slate-800'}`}>
                {roleCounts['student'] ?? 0}
              </span>
              <p className={`text-xs font-medium truncate ${roleFilter === 'student' ? 'text-purple-100' : 'text-slate-500'}`}>
                นิสิต (Student)
              </p>
            </div>
          </div>
        </div>

        {/* Metric 2: บุคลากร */}
        <div
          onClick={() => setRoleFilter(roleFilter === 'staff' ? 'all' : 'staff')}
          className={`p-3.5 rounded-xl border shadow-xs transition-all cursor-pointer ${
            roleFilter === 'staff'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-200'
              : 'bg-white border-amber-100/90 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              roleFilter === 'staff' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'
            }`}>
              <Briefcase size={20} />
            </div>
            <div className="min-w-0">
              <span className={`text-xl font-extrabold leading-tight ${roleFilter === 'staff' ? 'text-white' : 'text-slate-800'}`}>
                {roleCounts['staff'] ?? 0}
              </span>
              <p className={`text-xs font-medium truncate ${roleFilter === 'staff' ? 'text-amber-100' : 'text-slate-500'}`}>
                บุคลากร (Staff)
              </p>
            </div>
          </div>
        </div>

        {/* Metric 3: บุคคลทั่วไป */}
        <div
          onClick={() => setRoleFilter(roleFilter === 'public' ? 'all' : 'public')}
          className={`p-3.5 rounded-xl border shadow-xs transition-all cursor-pointer ${
            roleFilter === 'public'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200'
              : 'bg-white border-emerald-100/90 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              roleFilter === 'public' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Globe size={20} />
            </div>
            <div className="min-w-0">
              <span className={`text-xl font-extrabold leading-tight ${roleFilter === 'public' ? 'text-white' : 'text-slate-800'}`}>
                {roleCounts['public'] ?? 0}
              </span>
              <p className={`text-xs font-medium truncate ${roleFilter === 'public' ? 'text-emerald-100' : 'text-slate-500'}`}>
                บุคคลทั่วไป (Public)
              </p>
            </div>
          </div>
        </div>

        {/* Metric 4: ไม่ระบุตัวตน */}
        <div
          onClick={() => setRoleFilter(roleFilter === 'anonymous' ? 'all' : 'anonymous')}
          className={`p-3.5 rounded-xl border shadow-xs transition-all cursor-pointer ${
            roleFilter === 'anonymous'
              ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              roleFilter === 'anonymous' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Ghost size={20} />
            </div>
            <div className="min-w-0">
              <span className={`text-xl font-extrabold leading-tight ${roleFilter === 'anonymous' ? 'text-white' : 'text-slate-800'}`}>
                {roleCounts['anonymous'] ?? 0}
              </span>
              <p className={`text-xs font-medium truncate ${roleFilter === 'anonymous' ? 'text-slate-200' : 'text-slate-500'}`}>
                ไม่ระบุตัวตน (Anon)
              </p>
            </div>
          </div>
        </div>

        {/* Metric 5: แอดมินหมวดหมู่ */}
        <div
          onClick={() => setRoleFilter(roleFilter === 'category_admin' ? 'all' : 'category_admin')}
          className={`p-3.5 rounded-xl border shadow-xs transition-all cursor-pointer ${
            roleFilter === 'category_admin'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
              : 'bg-white border-indigo-100/90 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              roleFilter === 'category_admin' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <Shield size={20} />
            </div>
            <div className="min-w-0">
              <span className={`text-xl font-extrabold leading-tight ${roleFilter === 'category_admin' ? 'text-white' : 'text-slate-800'}`}>
                {roleCounts['category_admin'] ?? 0}
              </span>
              <p className={`text-xs font-medium truncate ${roleFilter === 'category_admin' ? 'text-indigo-100' : 'text-slate-500'}`}>
                แอดมินหมวด (Cat)
              </p>
            </div>
          </div>
        </div>

        {/* Metric 6: ผู้ดูแลสูงสุด */}
        <div
          onClick={() => setRoleFilter(roleFilter === 'super_admin' ? 'all' : 'super_admin')}
          className={`p-3.5 rounded-xl border shadow-xs transition-all cursor-pointer ${
            roleFilter === 'super_admin'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-200'
              : 'bg-white border-rose-100/90 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              roleFilter === 'super_admin' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'
            }`}>
              <ShieldAlert size={20} />
            </div>
            <div className="min-w-0">
              <span className={`text-xl font-extrabold leading-tight ${roleFilter === 'super_admin' ? 'text-white' : 'text-slate-800'}`}>
                {roleCounts['super_admin'] ?? 0}
              </span>
              <p className={`text-xs font-medium truncate ${roleFilter === 'super_admin' ? 'text-rose-100' : 'text-slate-500'}`}>
                ผู้ดูแลสูงสุด (Super)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Search & Filter Bar ─── */}
      <section className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล, หรือ IP Address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:bg-white transition-all"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
          {/* Role Selector */}
          <div className="relative min-w-[170px]">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B267D] appearance-none cursor-pointer"
            >
              <option value="all">ทุกบทบาท (All Roles)</option>
              <option value="student">🎓 นิสิต (Student)</option>
              <option value="staff">💼 บุคลากร (Staff)</option>
              <option value="public">🌐 บุคคลทั่วไป (Public)</option>
              <option value="anonymous">👻 ไม่ระบุตัวตน (Anonymous)</option>
              <option value="category_admin">🛡️ แอดมินประจำหมวดหมู่ (Cat. Admin)</option>
              <option value="super_admin">👑 ผู้ดูแลสูงสุด (Super Admin)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Active Directory Sync button */}
          <button
            onClick={() => setShowADModal(true)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="ซิงค์บัญชีผ่านระบบมหาวิทยาลัย"
          >
            <Server size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Active Directory</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="ดาวน์โหลดไฟล์ผู้ใช้เป็น CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span>ส่งออก</span>
          </button>
        </div>
      </section>

      {/* ─── Users Data Table ─── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
              <Ban size={20} className="text-rose-600" />
            </div>
            <p className="text-slate-800 font-semibold text-sm">{error}</p>
            <button 
              onClick={loadUsers}
              className="mt-3 text-xs text-[#4B267D] hover:underline font-bold"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 flex flex-col items-center text-center text-slate-400">
             <Search size={36} className="mb-3 opacity-20" />
             <p className="font-bold text-slate-700 text-sm">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข</p>
             <p className="text-xs text-slate-400 mt-1">ลองค้นหาด้วยคำใหม่หรือเปลี่ยนตัวกรองบทบาท</p>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[380px] pb-16">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5" scope="col">ผู้ใช้งาน (USER)</th>
                  <th className="py-3.5 px-5" scope="col">ระบุตัวตน (IDENTIFIER)</th>
                  <th className="py-3.5 px-5" scope="col">บทบาท (ROLE)</th>
                  <th className="py-3.5 px-5 text-center" scope="col">สถานะ (STATUS)</th>
                  <th className="py-3.5 px-5 text-right" scope="col">การจัดการ (ACTIONS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {paginatedUsers.map((u) => {
                  const isAnon = u.role === 'anonymous';
                  const primaryText = isAnon ? 'Anonymous User' : (u.display_name || '—');
                  const secondaryText = isAnon ? (u.ip_address || 'Unknown IP') : (u.email || '—');
                  const avatarLetter = isAnon ? 'A' : (u.display_name || u.email || '?')[0].toUpperCase();
                  
                  return (
                    <tr
                      key={u.user_id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        u.role === 'super_admin' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Column 1: User */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                            isAnon
                              ? 'bg-slate-200 text-slate-600'
                              : u.role === 'super_admin'
                              ? 'bg-gradient-to-tr from-[#2B164D] to-[#4B267D] text-white'
                              : u.role === 'category_admin'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-purple-700 text-white'
                          }`}>
                            {avatarLetter}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className={isAnon ? 'italic' : ''}>{primaryText}</span>
                              {u.role === 'super_admin' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">ID #{u.user_id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Identifier */}
                      <td className="py-3 px-5">
                        {isAnon ? (
                          <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200/80">
                            {secondaryText}
                          </span>
                        ) : (
                          <span className="font-mono text-slate-700 text-xs">
                            {secondaryText}
                          </span>
                        )}
                      </td>

                      {/* Column 3: Role */}
                      <td className="py-3 px-5">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Column 4: Status */}
                      <td className="py-3 px-5 text-center">
                        <StatusBadge isActive={u.is_active} />
                      </td>

                      {/* Column 5: Actions (3-dots Menu Button) */}
                      <td className="py-3 px-5 text-right relative user-actions-menu">
                        <div className="inline-flex items-center justify-end relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuUserId(activeMenuUserId === u.user_id ? null : u.user_id);
                            }}
                            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                              activeMenuUserId === u.user_id
                                ? 'bg-purple-100 text-[#4B267D] border-purple-300 ring-2 ring-purple-200'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200/80 shadow-2xs'
                            }`}
                            title="เมนูการจัดการ"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Popover Dropdown Menu */}
                          {activeMenuUserId === u.user_id && (
                            <div
                              className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setActiveMenuUserId(null);
                                  setEditUser(u);
                                  setEditRole(u.role);
                                  setEditStatus(u.is_active);
                                  setEditCategory(u.category_id || (u.categories && u.categories[0]?.id) || null);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#4B267D] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Edit size={14} className="text-[#4B267D]" />
                                <span>แก้ไขบทบาท / สถานะ</span>
                              </button>

                              {/* Reset Password */}
                              {!isAnon && (
                                <button
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    setResetPwdUser(u);
                                    setNewPassword(generateRandomPassword());
                                    setShowResetPwdModal(true);
                                  }}
                                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                                >
                                  <Key size={14} className="text-amber-600" />
                                  <span>รีเซ็ตรหัสผ่าน</span>
                                </button>
                              )}

                              {/* Ban / Unban */}
                              <button
                                onClick={() => {
                                  setActiveMenuUserId(null);
                                  setDialog({ user: u, action: u.is_active ? 'ban' : 'unban' });
                                }}
                                className={`w-full px-3.5 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                                  u.is_active
                                    ? 'text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                <Ban size={14} className={u.is_active ? 'text-amber-600' : 'text-emerald-600'} />
                                <span>{u.is_active ? 'ระงับการใช้งานบัญชี' : 'ปลดระงับบัญชี'}</span>
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              {/* Delete */}
                              <button
                                onClick={() => {
                                  setActiveMenuUserId(null);
                                  setShowDeleteConfirm(u);
                                }}
                                className="w-full px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} className="text-rose-500" />
                                <span>ลบผู้ใช้งาน</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Table Pagination ─── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>แสดงข้อมูล</span>
              <span className="font-bold text-slate-800">{totalItems === 0 ? 0 : startIndex + 1} - {endIndex}</span>
              <span>จากทั้งหมด</span>
              <span className="font-bold text-slate-800">{totalItems}</span>
              <span>รายการผู้ใช้ในระบบ</span>
            </div>

            {/* Page Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>

                {[...Array(totalPages)].map((_, idx) => {
                  const pageNumber = idx + 1;
                  // Show pages around current
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center transition-colors cursor-pointer ${
                          currentPage === pageNumber
                            ? 'bg-[#4B267D] text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    (pageNumber === 2 && currentPage > 3) ||
                    (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return <span key={pageNumber} className="px-1 text-slate-400">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── Footer Bar ─── */}
      <footer className="pt-2 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
        <div>
          © 2025 มหาวิทยาลัยพะเยา (University of Phayao). Civic Intelligence & Engagement Platform.
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Server: UP-DC-NODE01
          </span>
          <span>Security Level: Super-Admin Authorized</span>
        </div>
      </footer>

      {/* ─── MODAL 1: Invite New Staff / Admin (Screenshot 2) ─── */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 my-8">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-purple-50/50 via-white to-white">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#4B267D] border border-purple-200 flex items-center justify-center shrink-0 shadow-xs">
                  <UserPlus size={22} className="text-[#4B267D]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 font-sans">
                    เชิญผู้ดูแลหรือเจ้าหน้าที่ใหม่ <span className="text-xs text-slate-400 font-normal">(Invite New Staff / Admin)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    ส่งคำเชิญเพื่อกำหนดสิทธิ์การเข้าถึงระบบบริหารจัดการ UP Connect ผ่านโครงสร้างความปลอดภัยมหาวิทยาลัย
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendInviteSubmit} className="p-6 space-y-6 text-left">
              {/* Field 1: Email */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    อีเมลมหาวิทยาลัย (@up.ac.th) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-[#4B267D] border border-purple-200 flex items-center gap-1">
                    <Mail size={11} />
                    UP Mail & Passport Only
                  </span>
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="เช่น somsak.m@up.ac.th หรือชื่อบุคลากร"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#4B267D] focus:outline-none bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <Lock size={12} className="text-purple-600 shrink-0" />
                  ระบบจะส่งรหัสความปลอดภัย OTP และลิงก์ Magic Token ไปยังอีเมลของบุคลากรเพื่อยืนยันตัวตนผ่าน UP Passport
                </p>
              </div>

              {/* Field 2: Role Assignment - Category Admin Only */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    เลือกระดับบทบาทและสิทธิ์ (Role Assignment) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    แอดมินประจำหมวดหมู่
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#4B267D] bg-purple-50/40 ring-2 ring-[#4B267D]/20 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#4B267D] flex items-center justify-center text-white text-[11px] font-bold mt-0.5 shrink-0">
                      ✓
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          แอดมินประจำหมวดหมู่ (Category Admin)
                          <span className="text-[10px] bg-purple-700 text-white px-2 py-0.2 rounded font-black">ค่าเริ่มต้น</span>
                        </span>
                        <Shield size={16} className="text-purple-600" />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        มีสิทธิ์รับเรื่อง อัปเดตสถานะปัญหา ร้องขอข้อมูล และจ่ายงานช่างเฉพาะในหมวดหมู่ที่ตนรับผิดชอบ
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field 3: Assigned Category */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 size={14} className="text-[#4B267D]" />
                    <span>หมวดหมู่งานที่รับผิดชอบ (Assigned Category)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">เลือกหมวดหมู่ตามประกาศการ</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {availableCategories.map((cat) => (
                    <label
                      key={cat.category_id}
                      onClick={() => setInviteCategoryId(cat.category_id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        inviteCategoryId === cat.category_id
                          ? 'border-[#4B267D] bg-purple-50/50 ring-1 ring-[#4B267D]'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="assigned_cat"
                        checked={inviteCategoryId === cat.category_id}
                        onChange={() => setInviteCategoryId(cat.category_id)}
                        className="mt-0.5 text-[#4B267D] focus:ring-[#4B267D]"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                          {cat.category_name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {cat.description || 'รับเรื่องและประสานงานแก้ไข'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#4B267D] hover:bg-[#3E2166] rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isInviting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      กำลังส่งคำเชิญ...
                    </>
                  ) : (
                    <>
                      <span>🚀 ส่งลิงก์คำเชิญ (Send Invitation)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Edit User Role / Status ─── */}
      {editUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-left border border-slate-100">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">แก้ไขบทบาทและสถานะ</h3>
                  <p className="text-xs text-slate-500 mt-1">ผู้ใช้งาน: {editUser.display_name || editUser.email || editUser.ip_address}</p>
                </div>
                <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-lg cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateRoleStatus} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">บทบาท (Role)</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="student">🎓 นิสิต (Student)</option>
                    <option value="staff">💼 บุคลากร (Staff)</option>
                    <option value="public">🌐 ประชาชนทั่วไป (Public)</option>
                    <option value="category_admin">🛡️ แอดมินหมวดหมู่ (Category Admin)</option>
                    <option value="super_admin">👑 ผู้ดูแลระบบสูงสุด (Super Admin)</option>
                  </select>
                </div>

                {editRole === 'category_admin' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">หมวดหมู่ที่มอบหมาย</label>
                    <select
                      value={editCategory || ''}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white focus:ring-2 focus:ring-purple-200"
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="active">Active (ใช้งานได้ปกติ)</option>
                    <option value="banned">Banned (ระงับการใช้งาน)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#4B267D] hover:bg-[#3E2166] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Confirm Delete ─── */}
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
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: Reset Password ─── */}
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
                  ตั้งรหัสผ่านใหม่สำหรับ: <span className="font-bold text-purple-700">{resetPwdUser.display_name || resetPwdUser.email}</span>
                </p>
              </div>
              <button onClick={() => setShowResetPwdModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-lg cursor-pointer">
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
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-xs font-mono font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPwdModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isResetting ? 'กำลังบันทึก...' : 'ยืนยันเปลี่ยนรหัสผ่าน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: Reset Password Success Result ─── */}
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

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">รหัสผ่านใหม่ (Temporary Password)</p>
                <p className="text-base font-mono font-black text-purple-800 tracking-wider mt-0.5 select-all">
                  {resetResult.password}
                </p>
              </div>
              <button
                onClick={handleCopyPassword}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#4B267D] hover:bg-[#3E2166] text-white'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกรหัส'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setResetResult(null)}
                className="px-6 py-2.5 bg-[#4B267D] text-white text-xs font-bold rounded-xl hover:bg-[#3E2166] transition-colors shadow-xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: Active Directory Info Modal ─── */}
      {showADModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 text-left border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4B267D] flex items-center justify-center border border-purple-200">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Active Directory & UP Passport</h3>
                  <p className="text-[11px] text-slate-400">การเชื่อมต่อฐานข้อมูลอัตลักษณ์ส่วนกลางมหาวิทยาลัยพะเยา</p>
                </div>
              </div>
              <button onClick={() => setShowADModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>สถานะการเชื่อมต่อ: <strong>ออนไลน์ (UP-SSO-LDAP Connected)</strong></span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p>
                  ระบบ UP Connect ทำการซิงค์ข้อมูลผู้ใช้อัตโนมัติร่วมกับระบบ <strong>UP Single Sign-On (SSO)</strong> และ <strong>Active Directory มหาวิทยาลัยพะเยา</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-500">
                  <li>นิสิตทุกคนสามารถเข้าสู่ระบบด้วยรหัสนิสิตและรหัสผ่าน UP Mail โดยตรง</li>
                  <li>บุคลากรและอาจารย์ใช้บัญชี @up.ac.th เพื่อยืนยันตัวตนระดับเจ้าหน้าที่</li>
                  <li>เมื่อมีบุคลากรใหม่ถูกเชิญ ระบบจะจับคู่สิทธิ์เข้ากับ UP Passport ทันที</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowADModal(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#4B267D] hover:bg-[#3E2166] rounded-xl shadow-xs cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#2B164D] text-white text-xs font-bold rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-[#F59E0B]" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
};

export default SAUserManagement;
