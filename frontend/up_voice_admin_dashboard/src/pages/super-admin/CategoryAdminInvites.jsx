// src/pages/super-admin/CategoryAdminInvites.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchCategories,
  fetchEligibleUsers,
  fetchCategoryAdmins,
  assignCategoryAdmin,
  revokeCategoryAdmin,
  sendInvite,
  fetchPendingInvites,
  revokePendingInvite,
  resendInvite,
  extendInvite,
  directCreateAdmin
} from '../../services/adminInviteService';
import { 
  Mail, Plus, Trash2, CheckCircle2, AlertCircle, ChevronDown, 
  Users, Shield, ShieldCheck, Tag, X, Clock, Copy, 
  RotateCw, CalendarPlus, AlertTriangle, Eye, EyeOff, Sparkles, UserPlus, KeyRound
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

// ── Toast Component ─────────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div
    className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl z-[70] animate-[pageFadeIn_0.2s_ease] flex items-center gap-2.5 text-sm font-medium ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`}
  >
    {type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
    {msg}
  </div>
);

// ── Confirm Revoke Dialog ──────────────────────────────────────
const ConfirmRevokeDialog = ({ admin, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-[pageFadeIn_0.2s_ease]">
      <h3 className="text-base font-semibold text-slate-800 mb-2">{admin.isPending ? 'Cancel Invitation' : 'Revoke Access'}</h3>
      <p className="text-sm text-slate-500 mb-5 leading-relaxed">
        {admin.isPending ? (
          <>Are you sure you want to cancel the invitation for <strong className="text-slate-800">{admin.email}</strong>?</>
        ) : (
          <>Are you sure you want to revoke <strong className="text-slate-800">{admin.displayName}</strong>'s admin access for <strong className="text-slate-800">{admin.categoryName}</strong>?</>
        )}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              {admin.isPending ? 'Canceling…' : 'Revoking…'}
            </>
          ) : (
            admin.isPending ? 'Yes, Cancel' : 'Yes, Revoke'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Extend Expiration Dialog ──────────────────────────────────
const ExtendDialog = ({ invite, onConfirm, onCancel, isLoading }) => {
  const [days, setDays] = useState(7);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-[pageFadeIn_0.2s_ease]">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
          <CalendarPlus size={20} />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">ขยายเวลาคำเชิญ (Extend Validity)</h3>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          ขยายระยะเวลาใช้งานคำเชิญสำหรับ <strong className="text-slate-800">{invite.email}</strong>
        </p>

        <div className="space-y-2 mb-5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            เลือกระยะเวลาที่ต้องการขยายเพิ่ม
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[3, 7, 14].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  days === d
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                +{d} วัน
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => onConfirm(invite.inviteId, days)}
            disabled={isLoading}
            className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-70 flex items-center justify-center gap-1.5 shadow-sm"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              `ขยาย +${days} วัน`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Invite Success Modal with Instant Copy ─────────────────────
const InviteSuccessModal = ({ invite, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!invite) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invite.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-purple-100 animate-[pageFadeIn_0.2s_ease]">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
          <CheckCircle2 size={30} />
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 text-center mb-1">
          สร้างคำเชิญสำเร็จแล้ว!
        </h3>
        <p className="text-xs text-slate-500 text-center mb-5">
          ระบบได้บันทึกคำเชิญและจัดส่งอีเมลไปยัง <strong className="text-slate-800">{invite.email}</strong> แล้ว
        </p>

        <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 mb-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">บทบาท:</span>
            <span className="font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-full uppercase text-[11px]">
              {invite.role}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">หมวดหมู่:</span>
            <span className="font-semibold text-slate-700">
              {invite.categoryName || 'ภาพรวมระบบ'}
            </span>
          </div>
        </div>

        {/* Copy Link Input & Button */}
        <div className="space-y-2 mb-5">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            ลิงก์สำหรับสมัครสมาชิก / เปิดใช้งานบัญชี
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={invite.inviteLink}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#2B164D] hover:bg-[#3d2268] text-white active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>คัดลอก</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            💡 คุณสามารถคัดลอกลิงก์นี้ส่งให้ผู้รับทาง LINE หรือแชทเพื่อเปิดใช้งานได้ทันที (กรณีผู้รับไม่ได้รับอีเมลหรือติดสแปม)
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          เสร็จสิ้น (ปิดหน้าต่าง)
        </button>
      </div>
    </div>
  );
};

// ── Direct Create Success Modal ────────────────────────────────
const DirectCreateSuccessModal = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const loginUrl = window.location.origin + '/login';

  const copyText = `ข้อมูลเข้าสู่ระบบ UP Connect (สำหรับผู้ดูแลระบบ):
----------------------------------
ชื่อผู้ใช้: ${data.displayName}
อีเมล (Email): ${data.email}
รหัสผ่าน (Password): ${data.password}
บทบาท: ${data.role}
หมวดหมู่: ${data.categoryName || 'ภาพรวมระบบ'}
ลิงก์เข้าสู่ระบบ: ${loginUrl}
----------------------------------`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-emerald-100 animate-[pageFadeIn_0.2s_ease]">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
          <CheckCircle2 size={30} />
        </div>
        
        <h3 className="text-xl font-bold text-slate-800 text-center mb-1">
          สร้างบัญชีผู้ดูแลระบบสำเร็จ!
        </h3>
        <p className="text-xs text-slate-500 text-center mb-4">
          บัญชีพร้อมใช้งานแล้ว บุคลากรสามารถนำข้อมูลนี้ไปล็อกอินได้ทันที
        </p>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">ชื่อ-นามสกุล:</span>
            <span className="font-bold text-slate-800">{data.displayName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">อีเมล (Email):</span>
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{data.email}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">รหัสผ่าน (Password):</span>
            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{data.password}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">บทบาท:</span>
            <span className="font-semibold text-slate-700">{data.role}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">หมวดหมู่:</span>
            <span className="font-semibold text-purple-700">{data.categoryName || 'ภาพรวมระบบ'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm mb-2.5 ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-[#2B164D] hover:bg-[#3d2268] text-white active:scale-95'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle2 size={16} />
              <span>คัดลอกข้อมูลเข้าสู่ระบบเรียบร้อยแล้ว!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>📋 คัดลอกข้อมูลส่งให้บุคลากร</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
        >
          เสร็จสิ้น (ปิดหน้าต่าง)
        </button>
      </div>
    </div>
  );
};

// ── Add / Invite Admin Modal (Dual Tabs) ─────────────────────────
const InviteModal = ({ isOpen, onClose, categories, onAssign, onDirectCreate, submitting }) => {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'invite'

  // Tab 1: Invite State
  const [inviteForm, setInviteForm] = useState({ 
    email: '', 
    loginMethod: 'local',
    role: 'category_admin',
    category_id: '',
    expiration_days: 7
  });

  // Tab 2: Direct Create State
  const [directForm, setDirectForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'category_admin',
    category_id: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  // Auto-generate strong password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDirectForm((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setInviteForm({ email: '', loginMethod: 'local', role: 'category_admin', category_id: '', expiration_days: 7 });
      setDirectForm({ firstName: '', lastName: '', email: '', password: '', role: 'category_admin', category_id: '' });
      setShowPassword(false);
      setActiveTab('direct');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    onAssign(inviteForm);
  };

  const handleDirectSubmit = (e) => {
    e.preventDefault();
    onDirectCreate({
      first_name: directForm.firstName.trim(),
      last_name: directForm.lastName.trim(),
      email: directForm.email.trim(),
      password: directForm.password,
      role: directForm.role,
      category_id: directForm.role === 'category_admin' ? Number(directForm.category_id) : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-[pageFadeIn_0.2s_ease] flex flex-col border border-purple-50">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {activeTab === 'direct' ? 'สร้างบัญชีแอดมินโดยตรง' : 'เชิญผู้ดูแลระบบ'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeTab === 'direct' 
                ? 'สร้างบัญชีให้ทันที พร้อมนำอีเมลและรหัสผ่านไปล็อกอินใช้งานได้เลย' 
                : 'ส่งลิงก์คำเชิญผ่านอีเมลให้ผู้ดูแลระบบลงทะเบียน'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-100 bg-slate-50/80 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'direct'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <UserPlus size={14} className={activeTab === 'direct' ? 'text-indigo-600' : 'text-slate-400'} />
            สร้างบัญชีโดยตรง (Direct Create)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'invite'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Mail size={14} className={activeTab === 'invite' ? 'text-indigo-600' : 'text-slate-400'} />
            เชิญผ่านอีเมล (Invite Link)
          </button>
        </div>

        {/* Tab 1: Direct Account Creation Form */}
        {activeTab === 'direct' && (
          <form onSubmit={handleDirectSubmit} className="p-6 space-y-4 bg-white">
            {/* Row 1: Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  ชื่อ (FIRST NAME) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={directForm.firstName}
                  onChange={(e) => setDirectForm({ ...directForm, firstName: e.target.value })}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow bg-white"
                  placeholder="เช่น สมชาย"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  นามสกุล (LAST NAME) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={directForm.lastName}
                  onChange={(e) => setDirectForm({ ...directForm, lastName: e.target.value })}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow bg-white"
                  placeholder="เช่น ใจดี"
                  required
                />
              </div>
            </div>

            {/* Row 2: Email */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                อีเมลเข้าใช้งาน (EMAIL) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={directForm.email}
                onChange={(e) => setDirectForm({ ...directForm, email: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow bg-white"
                placeholder="staff@up.ac.th หรือ email@example.com"
                required
              />
            </div>

            {/* Row 3: Password + Generator */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  กำหนดรหัสผ่าน (PASSWORD) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline active:scale-95 transition-all"
                >
                  <Sparkles size={12} />
                  สุ่มรหัสผ่านอัตโนมัติ
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={directForm.password}
                  onChange={(e) => setDirectForm({ ...directForm, password: e.target.value })}
                  disabled={submitting}
                  className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow bg-white font-mono"
                  placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Row 4: Role & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  บทบาท (ROLE) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={directForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setDirectForm({ ...directForm, role: newRole, category_id: newRole === 'category_admin' ? directForm.category_id : '' });
                    }}
                    disabled={submitting}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 bg-white transition-shadow"
                  >
                    <option value="category_admin">Category Admin (แอดมินหมวดหมู่)</option>
                    <option value="staff">Staff (เจ้าหน้าที่ทั่วไป)</option>
                    <option value="super_admin">Super Admin (ผู้ดูแลระบบสูงสุด)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  หมวดหมู่ที่รับผิดชอบ {directForm.role === 'category_admin' && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <select
                    value={directForm.category_id}
                    onChange={(e) => setDirectForm({ ...directForm, category_id: e.target.value })}
                    disabled={submitting || directForm.role !== 'category_admin'}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-50 transition-shadow bg-white"
                    required={directForm.role === 'category_admin'}
                  >
                    <option value="" disabled>— เลือกหมวดหมู่ —</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Note banner */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
              <span className="text-base leading-none">💡</span>
              <span className="leading-relaxed">
                บัญชีจะเปิดใช้งานทันที Super Admin สามารถคัดลอกอีเมลและรหัสผ่านส่งให้บุคลากรนำไปล็อกอินเข้าสู่ระบบได้เลย
              </span>
            </div>

            {/* Footer actions */}
            <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting || !directForm.email || !directForm.firstName || !directForm.password || (directForm.role === 'category_admin' && !directForm.category_id)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-60 flex items-center justify-center min-w-[150px]"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                    กำลังสร้างบัญชี...
                  </>
                ) : (
                  <>
                    <UserPlus size={15} className="mr-1.5" />
                    สร้างบัญชีทันที
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Existing Invite by Email Form */}
        {activeTab === 'invite' && (
          <form onSubmit={handleInviteSubmit} className="p-6 space-y-4 bg-white">
            {/* Row 1: Email */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                EMAIL <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow bg-white"
                placeholder="user@example.com"
                required
              />
            </div>

            {/* Row 2: Login Method & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  LOGIN METHOD
                </label>
                <div className="relative">
                  <select
                    value={inviteForm.loginMethod}
                    onChange={(e) => setInviteForm({ ...inviteForm, loginMethod: e.target.value })}
                    disabled={submitting}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow bg-white"
                  >
                    <option value="local">Local (Username / Password)</option>
                    <option value="sso">University SSO</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  SELECT CATEGORY {inviteForm.role === 'category_admin' && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <select
                    value={inviteForm.category_id}
                    onChange={(e) => setInviteForm({ ...inviteForm, category_id: e.target.value })}
                    disabled={submitting || inviteForm.role !== 'category_admin'}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-50 transition-shadow bg-white"
                    required={inviteForm.role === 'category_admin'}
                  >
                    <option value="" disabled>— Choose —</option>
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 3: Role & Expiration Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  ROLE <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={inviteForm.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setInviteForm({ ...inviteForm, role: newRole, category_id: newRole === 'category_admin' ? inviteForm.category_id : '' });
                    }}
                    disabled={submitting}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 bg-white transition-shadow"
                  >
                    <option value="category_admin">Category Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  อายุคำเชิญ (EXPIRE IN)
                </label>
                <div className="relative">
                  <select
                    value={inviteForm.expiration_days}
                    onChange={(e) => setInviteForm({ ...inviteForm, expiration_days: Number(e.target.value) })}
                    disabled={submitting}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 bg-white transition-shadow"
                  >
                    <option value={3}>3 วัน (3 Days)</option>
                    <option value={7}>7 วัน (7 Days - แนะนำ)</option>
                    <option value={14}>14 วัน (14 Days)</option>
                    <option value={30}>30 วัน (30 Days)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !inviteForm.email || (inviteForm.role === 'category_admin' && !inviteForm.category_id)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center min-w-[140px]"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ── Skeleton Loader ────────────────────────────────────────────
const PageSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="w-48 h-7 bg-slate-200 rounded-lg" />
        <div className="w-64 h-4 bg-slate-100 rounded-lg" />
      </div>
      <div className="w-32 h-10 bg-slate-200 rounded-xl" />
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 shadow-sm" />
      ))}
    </div>

    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-64" />
  </div>
);

// ── Main page ──────────────────────────────────────────────────
const CategoryAdminInvites = () => {
  const [categories, setCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [createdInviteModal, setCreatedInviteModal] = useState(null);
  const [directCreatedModal, setDirectCreatedModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });
  
  const [revokeDialog, setRevokeDialog] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const [extendDialog, setExtendDialog] = useState(null);
  const [extending, setExtending] = useState(false);

  const [resendingId, setResendingId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catsRes, adminsRes, invitesRes] = await Promise.allSettled([
        fetchCategories(),
        fetchCategoryAdmins(),
        fetchPendingInvites()
      ]);

      const cats = catsRes.status === 'fulfilled' ? catsRes.value : [];
      const admins = adminsRes.status === 'fulfilled' ? adminsRes.value : [];
      const invites = invitesRes.status === 'fulfilled' ? invitesRes.value : [];

      setCategories(cats);
      
      const formattedAdmins = admins.map(a => ({
        id: `admin-${a.admin_id}`,
        userId: a.user_id,
        email: a.email,
        displayName: a.display_name,
        categoryName: a.category_name,
        categoryId: a.category_id,
        role: a.admin_level || 'Full',
        date: a.assigned_at,
        isPending: false,
        raw: a
      }));

      const formattedInvites = invites.map(i => ({
        id: `invite-${i.invite_id}`,
        inviteId: i.invite_id,
        email: i.email,
        displayName: i.email,
        categoryName: i.category_name || '—',
        categoryId: i.category_id,
        role: (i.role || '').replace('_', ' '),
        date: i.created_at,
        expiresAt: i.expires_at,
        remainingDays: i.remaining_days,
        remainingHours: i.remaining_hours,
        isExpired: i.is_expired || i.status === 'Expired',
        status: i.status,
        token: i.token,
        isPending: true,
        raw: i
      }));

      setAssignments([...formattedAdmins, ...formattedInvites]);
    } catch (e) {
      showToast('เกิดข้อผิดพลาดในการดึงข้อมูล กรุณารีเฟรชอีกครั้ง', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDirectCreate = async (payload) => {
    setSubmitting(true);
    try {
      const res = await directCreateAdmin(payload);
      setIsInviteModalOpen(false);

      const categoryObj = categories.find(c => String(c.category_id) === String(payload.category_id));
      const categoryName = categoryObj ? categoryObj.category_name : 'ภาพรวมระบบ';

      setDirectCreatedModal({
        displayName: `${payload.first_name} ${payload.last_name}`,
        email: payload.email,
        password: payload.password,
        role: payload.role.replace('_', ' ').toUpperCase(),
        categoryName: categoryName
      });

      showToast(`สร้างบัญชีให้ ${payload.email} สำเร็จเรียบร้อยแล้ว!`, 'success');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.detail || err.response?.data?.message || 'ไม่สามารถสร้างบัญชีได้', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (form) => {
    setSubmitting(true);
    try {
      const res = await sendInvite({
        email: form.email,
        role: form.role,
        category_id: form.category_id || null,
        expiration_days: form.expiration_days || 7
      });

      const token = res?.data?.token;
      const categoryObj = categories.find(c => String(c.category_id) === String(form.category_id));
      const categoryName = categoryObj ? categoryObj.category_name : 'ภาพรวมระบบ';
      const inviteLink = `https://university-social-listening-platfor.vercel.app/register?token=${token}`;

      setIsInviteModalOpen(false);
      if (token) {
        setCreatedInviteModal({
          email: form.email,
          role: form.role.replace('_', ' '),
          categoryName: categoryName,
          token: token,
          inviteLink: inviteLink
        });
      } else {
        showToast(`ส่งคำเชิญไปยัง ${form.email} สำเร็จ`);
      }
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send invite.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (invite) => {
    setResendingId(invite.inviteId);
    try {
      await resendInvite(invite.inviteId, 7);
      showToast(`ส่งคำเชิญและออก Token ใหม่ให้ ${invite.email} เรียบร้อยแล้ว!`, 'success');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'ไม่สามารถส่งคำเชิญใหม่ได้', 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleExtendConfirm = async (inviteId, days) => {
    setExtending(true);
    try {
      await extendInvite(inviteId, days);
      showToast(`ขยายเวลาคำเชิญเพิ่ม +${days} วัน สำเร็จแล้ว!`, 'success');
      setExtendDialog(null);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'ไม่สามารถขยายเวลาคำเชิญได้', 'error');
    } finally {
      setExtending(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeDialog) return;
    setRevoking(true);
    try {
      if (revokeDialog.isPending) {
        await revokePendingInvite(revokeDialog.inviteId);
        showToast('ยกเลิกคำเชิญเรียบร้อยแล้ว', 'success');
      } else {
        await revokeCategoryAdmin(revokeDialog.userId);
        showToast('ถอดถอนสิทธิ์แอดมินหมวดหมู่เรียบร้อยแล้ว', 'success');
      }
      setAssignments(prev => prev.filter(a => a.id !== revokeDialog.id));
      setRevokeDialog(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revoke access.', 'error');
    } finally {
      setRevoking(false);
    }
  };

  if (loading) return <PageSkeleton />;

  // Derived stats
  const activeAdmins = assignments.filter(a => !a.isPending);
  const totalAdmins = activeAdmins.length;
  const uniqueCategoriesCovered = new Set(activeAdmins.map(a => a.categoryId)).size;
  const totalCategories = categories.length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.msg && <Toast msg={toast.msg} type={toast.type} />}

      {/* Revoke dialog */}
      {revokeDialog && (
        <ConfirmRevokeDialog
          admin={revokeDialog}
          onConfirm={handleConfirmRevoke}
          onCancel={() => !revoking && setRevokeDialog(null)}
          isLoading={revoking}
        />
      )}

      {/* Extend dialog */}
      {extendDialog && (
        <ExtendDialog
          invite={extendDialog}
          onConfirm={handleExtendConfirm}
          onCancel={() => !extending && setExtendDialog(null)}
          isLoading={extending}
        />
      )}

      {/* Invite Created Success Modal */}
      {createdInviteModal && (
        <InviteSuccessModal
          invite={createdInviteModal}
          onClose={() => setCreatedInviteModal(null)}
        />
      )}

      {/* Direct Create Success Modal */}
      {directCreatedModal && (
        <DirectCreateSuccessModal
          data={directCreatedModal}
          onClose={() => setDirectCreatedModal(null)}
        />
      )}

      {/* Add / Invite Admin Modal */}
      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => !submitting && setIsInviteModalOpen(false)}
        categories={categories}
        onAssign={handleAssign}
        onDirectCreate={handleDirectCreate}
        submitting={submitting}
      />

      {/* Top Header & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Category Admins</h1>
          <p className="text-sm text-slate-500 mt-1">Manage personnel with category-level administrative access</p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95"
        >
          <UserPlus size={16} strokeWidth={2.5} />
          เพิ่ม / เชิญแอดมิน
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Admins</p>
            <p className="text-2xl font-bold text-slate-800">{totalAdmins}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Roles</p>
            <p className="text-2xl font-bold text-slate-800">{totalAdmins}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Tag size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Categories Covered</p>
            <p className="text-2xl font-bold text-slate-800">
              {uniqueCategoriesCovered} <span className="text-sm font-medium text-slate-400">/ {totalCategories}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Assigned Admins & Invitations</h3>
          <span className="badge bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold">
            {totalAdmins} active
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <Shield size={28} className="text-slate-300" />
            </div>
            <h4 className="text-base font-semibold text-slate-700">No Admins Yet</h4>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              You haven't assigned any category admins. Click the "Invite Admin" button to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Category</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Level</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => (
                  <tr key={a.id} className={`hover:bg-slate-50/50 transition-colors ${a.isExpired ? 'bg-rose-50/20' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          a.isPending 
                            ? (a.isExpired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {(a.displayName || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-snug">{a.displayName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {a.categoryName !== '—' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                          <Tag size={12} className="text-slate-400" />
                          {a.categoryName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">All Categories</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 capitalize font-medium">
                        {a.role}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {a.isPending ? 'Invited' : 'Since'} {fmtDate(a.date)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {a.isPending ? (
                        a.isExpired ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
                              <AlertTriangle size={12} className="text-rose-600" />
                              Expired (หมดอายุ)
                            </span>
                            <p className="text-[10px] text-rose-500 mt-1 font-medium">
                              หมดอายุเมื่อ {fmtDate(a.expiresAt)}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={12} className="text-amber-500" />
                              Pending
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">
                              {a.remainingDays > 0 ? `เหลืออีก ${a.remainingDays} วัน` : `เหลืออีก ${a.remainingHours} ชม.`}
                            </p>
                          </div>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.isPending && (
                          <>
                            {/* Resend button */}
                            <button
                              onClick={() => handleResend(a)}
                              disabled={resendingId === a.inviteId}
                              className="inline-flex items-center justify-center p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              title="ส่งคำเชิญใหม่ & ต่ออายุ Token (Resend Invite)"
                            >
                              <RotateCw size={16} className={resendingId === a.inviteId ? 'animate-spin' : ''} />
                            </button>

                            {/* Extend expiration button */}
                            <button
                              onClick={() => setExtendDialog(a)}
                              className="inline-flex items-center justify-center p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="ขยายเวลาคำเชิญ (Extend Expiration)"
                            >
                              <CalendarPlus size={16} />
                            </button>

                            {/* Copy Link */}
                            <button
                              onClick={() => {
                                const tk = a.token || a.raw?.token || '';
                                const link = `https://university-social-listening-platfor.vercel.app/register?token=${tk}`;
                                navigator.clipboard.writeText(link);
                                showToast('คัดลอกลิงก์คำเชิญเรียบร้อยแล้ว!', 'success');
                              }}
                              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                              title="คัดลอกลิงก์คำเชิญ (Copy Link)"
                            >
                              <Copy size={16} />
                            </button>
                          </>
                        )}
                        
                        {/* Revoke / Cancel */}
                        <button
                          onClick={() => setRevokeDialog(a)}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title={a.isPending ? "Cancel Invite" : "Revoke Access"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
};

export default CategoryAdminInvites;

