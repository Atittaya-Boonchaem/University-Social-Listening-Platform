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
  revokePendingInvite
} from '../../services/adminInviteService';
import { Mail, Plus, Trash2, CheckCircle2, AlertCircle, ChevronDown, Users, Shield, ShieldCheck, Tag, X, Clock } from 'lucide-react';

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
          <>Are you sure you want to cancel the pending invitation for <strong className="text-slate-800">{admin.email}</strong>?</>
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

// ── Invite Admin Modal ─────────────────────────────────────────
const InviteModal = ({ isOpen, onClose, users, categories, onAssign, submitting }) => {
  const [form, setForm] = useState({ 
    email: '', 
    loginMethod: 'local',
    role: 'category_admin',
    category_id: '' 
  });

  // Reset form when opened
  useEffect(() => {
    if (isOpen) setForm({ email: '', loginMethod: 'local', role: 'category_admin', category_id: '' });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onAssign(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-[pageFadeIn_0.2s_ease] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Invite User</h2>
            <p className="text-sm text-gray-500 mt-0.5">Send a sign-up invitation</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          {/* Row 1: Email */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              EMAIL <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow bg-white"
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Row 2: Login Method & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                LOGIN METHOD
              </label>
              <div className="relative">
                <select
                  value={form.loginMethod}
                  onChange={(e) => setForm({ ...form, loginMethod: e.target.value })}
                  disabled={submitting}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow bg-white"
                >
                  <option value="local">Local (Username / Password)</option>
                  <option value="sso">University SSO</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                SELECT CATEGORY {form.role === 'category_admin' && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  disabled={submitting || form.role !== 'category_admin'}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-50 transition-shadow bg-white"
                  required={form.role === 'category_admin'}
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

          {/* Row 3: Role (Unlocked) */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              ROLE <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setForm({ ...form, role: newRole, category_id: newRole === 'category_admin' ? form.category_id : '' });
                }}
                disabled={submitting}
                className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-200 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 bg-white transition-shadow"
              >
                <option value="category_admin">Category Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="staff">Staff</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-6 mt-6 flex justify-end gap-3 border-t border-transparent">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.email || (form.role === 'category_admin' && !form.category_id)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-70 flex items-center justify-center min-w-[140px]"
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
      </div>
    </div>
  );
};

// ── Skeleton Loader ────────────────────────────────────────────
const PageSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="w-48 h-7 bg-slate-200 rounded-lg" />
        <div className="w-64 h-4 bg-slate-100 rounded-lg" />
      </div>
      <div className="w-32 h-10 bg-slate-200 rounded-xl" />
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 shadow-sm" />
      ))}
    </div>

    {/* Table */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-64" />
  </div>
);

// ── Main page ──────────────────────────────────────────────────
const CategoryAdminInvites = () => {
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });
  
  const [revokeDialog, setRevokeDialog] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [cats, eligibleUsers, admins, invites] = await Promise.all([
        fetchCategories(),
        fetchEligibleUsers(),
        fetchCategoryAdmins(),
        fetchPendingInvites()
      ]);
      setCategories(cats);
      setUsers(eligibleUsers);
      
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
        role: i.role.replace('_', ' '),
        date: i.created_at,
        isPending: true,
        raw: i
      }));

      setAssignments([...formattedAdmins, ...formattedInvites]);
    } catch (e) {
      showToast('Failed to load data. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (form) => {
    setSubmitting(true);
    try {
      await sendInvite({
        email: form.email,
        role: form.role,
        category_id: form.category_id || null
      });
      
      showToast(`Invitation sent to ${form.email}`);
      setIsInviteModalOpen(false);
      
      // Silently refresh the list
      const [admins, invites] = await Promise.all([fetchCategoryAdmins(), fetchPendingInvites()]);
      const formattedAdmins = admins.map(a => ({ id: `admin-${a.admin_id}`, userId: a.user_id, email: a.email, displayName: a.display_name, categoryName: a.category_name, categoryId: a.category_id, role: a.admin_level || 'Full', date: a.assigned_at, isPending: false, raw: a }));
      const formattedInvites = invites.map(i => ({ id: `invite-${i.invite_id}`, inviteId: i.invite_id, email: i.email, displayName: i.email, categoryName: i.category_name || '—', categoryId: i.category_id, role: i.role.replace('_', ' '), date: i.created_at, isPending: true, raw: i }));
      setAssignments([...formattedAdmins, ...formattedInvites]);
      
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send invite.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeDialog) return;
    setRevoking(true);
    try {
      if (revokeDialog.isPending) {
        await revokePendingInvite(revokeDialog.inviteId);
        showToast('Pending invite canceled.', 'success');
      } else {
        await revokeCategoryAdmin(revokeDialog.userId);
        showToast('Category admin access revoked.', 'success');
      }
      // Optimistic update
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

      {/* Invite Modal */}
      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => !submitting && setIsInviteModalOpen(false)}
        users={users}
        categories={categories}
        onAssign={handleAssign}
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
          <Plus size={16} strokeWidth={2.5} />
          Invite Admin
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
          <h3 className="text-base font-bold text-slate-800">Assigned Admins</h3>
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
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${a.isPending ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
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
                      <p className="text-[11px] text-slate-400 mt-0.5">{a.isPending ? 'Invited' : 'Since'} {fmtDate(a.date)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {a.isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={12} className="text-amber-500" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setRevokeDialog(a)}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title={a.isPending ? "Cancel Invite" : "Revoke Access"}
                      >
                        <Trash2 size={16} />
                      </button>
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
