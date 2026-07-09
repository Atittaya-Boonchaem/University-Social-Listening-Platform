// src/pages/category-admin/CategoryAdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchCategoryProblems,
  updateProblemStatus,
  addProblemComment,
  fetchProblemComments,
} from '../../services/problemService';
import { fetchCategories } from '../../services/categoryService';
import {
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  MapPin,
  Building2,
  Send,
  Clock,
  RefreshCw,
  ImageIcon,
  MessageSquare,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────
const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const STATUS_META = {
  OPEN:        { label: 'Open',        bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400'  },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500'   },
  RESOLVED:    { label: 'Resolved',    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500'},
  CLOSED:      { label: 'Closed',      bg: 'bg-slate-100',  text: 'text-slate-500',   border: 'border-slate-200',  dot: 'bg-slate-400'  },
  UNKNOWN:     { label: 'Unknown',     bg: 'bg-slate-100',  text: 'text-slate-400',   border: 'border-slate-200',  dot: 'bg-slate-300'  },
};

// ── Helpers ────────────────────────────────────────────────────
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    : '—';

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : '—';

// ── Status Pill ────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${m.bg} ${m.text} ${m.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} flex-shrink-0`} />
      {m.label}
    </span>
  );
};

// ── Toast ─────────────────────────────────────────────────────
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

// ── Skeleton Table ─────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="animate-pulse space-y-5">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="w-48 h-5 bg-slate-200 rounded-lg" />
        <div className="w-72 h-3 bg-slate-100 rounded-lg" />
      </div>
    </div>
    {/* Filter tabs */}
    <div className="flex gap-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="w-20 h-8 bg-slate-100 rounded-lg" />
      ))}
    </div>
    {/* Stat strip */}
    <div className="grid grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 bg-white rounded-xl border border-slate-100" />
      ))}
    </div>
    {/* Table */}
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex gap-8">
          {['w-12', 'w-56', 'w-24', 'w-20', 'w-24'].map((w, i) => (
            <div key={i} className={`${w} h-3 bg-slate-200 rounded`} />
          ))}
        </div>
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex gap-8 items-center">
          <div className="w-12 h-3 bg-slate-100 rounded" />
          <div className="w-64 h-4 bg-slate-200 rounded" />
          <div className="w-20 h-6 bg-slate-100 rounded-full" />
          <div className="w-20 h-3 bg-slate-100 rounded" />
          <div className="w-24 h-3 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  </div>
);

// ── Problem Detail Modal ────────────────────────────────────────
const ProblemModal = ({ problem, onClose, onStatusUpdated, showToast }) => {
  const [selectedStatus, setSelectedStatus] = useState(problem.status_name || 'OPEN');
  const [comment, setComment]               = useState('');
  const [comments, setComments]             = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [saving, setSaving]                 = useState(false);
  const commentRef = useRef(null);

  // Load existing comments
  useEffect(() => {
    fetchProblemComments(problem.problem_id)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [problem.problem_id]);

  const handleUpdate = async () => {
    if (!selectedStatus) return;
    setSaving(true);
    try {
      // Update status
      const statusChanged = selectedStatus !== problem.status_name;
      if (statusChanged) {
        await updateProblemStatus(
          problem.problem_id,
          selectedStatus,
          comment.trim() || undefined
        );
      }

      // Post comment separately if there's text and status didn't change (or as extra note)
      if (comment.trim() && !statusChanged) {
        await addProblemComment(problem.problem_id, comment.trim());
      }
      if (comment.trim() && statusChanged) {
        // comment was already sent as notes, but also post as a comment for visibility
        await addProblemComment(problem.problem_id, comment.trim());
      }

      showToast(
        statusChanged
          ? `Status updated to ${STATUS_META[selectedStatus]?.label || selectedStatus}.`
          : 'Comment posted.',
        'success'
      );
      onStatusUpdated(problem.problem_id, selectedStatus);
      onClose();
    } catch (err) {
      showToast(
        err.response?.data?.detail || err.response?.data?.message || 'Update failed.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const hasChange = selectedStatus !== problem.status_name || comment.trim().length > 0;
  const attachments = problem.attachments || [];
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://127.0.0.1:8000';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-2xl shadow-2xl sm:max-w-2xl max-h-[95vh] flex flex-col animate-[pageFadeIn_0.2s_ease]">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400">#{problem.problem_id}</span>
              <StatusPill status={problem.status_name} />
              {problem.category_name && (
                <span className="badge bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px]">
                  {problem.category_name}
                </span>
              )}
            </div>
            <h3 className="text-[15px] font-bold text-slate-800 leading-snug line-clamp-2">
              {problem.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Reported by{' '}
              <span className="font-medium text-slate-600">
                {problem.author?.display_name || 'Unknown'}
              </span>{' '}
              · {fmtDateTime(problem.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            id="problem-modal-close"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Description
            </p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {problem.description}
            </p>
          </div>

          {/* Location context */}
          {(problem.building_name || problem.latitude) && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
              <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-600 space-y-0.5">
                {problem.building_name && (
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-slate-400" />
                    <span className="font-medium">{problem.building_name}</span>
                  </div>
                )}
                {problem.latitude && problem.longitude && (
                  <p className="font-mono text-slate-400 text-[11px]">
                    {parseFloat(problem.latitude).toFixed(6)},{' '}
                    {parseFloat(problem.longitude).toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Attachments
              </p>
              <div className="flex flex-wrap gap-3">
                {attachments.map((att) => (
                  <div key={att.attachment_id} className="relative group">
                    {att.file_type?.startsWith('image/') ? (
                      <a
                        href={`${baseUrl}${att.file_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        <img
                          src={`${baseUrl}${att.file_url}`}
                          alt="attachment"
                          className="w-28 h-20 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </a>
                    ) : (
                      <a
                        href={`${baseUrl}${att.file_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <ImageIcon size={14} className="text-slate-400" />
                        View file
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Previous comments */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MessageSquare size={12} />
              Admin Responses{' '}
              {!loadingComments && comments.length > 0 && (
                <span className="ml-1 bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {comments.length}
                </span>
              )}
            </p>
            {loadingComments ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl" />
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No responses yet.</p>
            ) : (
              <div className="space-y-2">
                {comments.map((c) => (
                  <div
                    key={c.comment_id}
                    className="px-4 py-3 bg-indigo-50 rounded-xl border border-indigo-100"
                  >
                    <p className="text-sm text-slate-700 leading-relaxed">{c.comment_text}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{fmtDateTime(c.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Update section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Update Ticket
            </p>

            {/* Status dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Status
              </label>
              <div className="relative">
                <select
                  id="status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={saving}
                  className="appearance-none w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50 disabled:opacity-50"
                >
                  {STATUSES.filter((s) => s !== 'ALL').map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s]?.label || s}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Comment / notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Response / Note{' '}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                ref={commentRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={saving}
                rows={3}
                placeholder="Add a note or response to the reporter..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50 disabled:opacity-50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Close
          </button>
          <button
            id="problem-modal-submit"
            onClick={handleUpdate}
            disabled={saving || !hasChange}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Send size={14} />
                Save Update
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────
const CategoryAdminDashboard = () => {
  const [problems, setProblems]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [categoryId, setCategoryId] = useState(null); // from JWT
  const [categoryName, setCategoryName] = useState('');
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [toast, setToast]           = useState({ msg: '', type: '' });

  // ── Decode JWT to get category_id ───────────────────────────
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // The category admin JWT may carry category_id
        if (payload.category_id) setCategoryId(payload.category_id);
      }
    } catch {}
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  // ── Load problems ───────────────────────────────────────────
  const loadProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params = { visibility_name: 'public' };
      if (categoryId) {
        params.category_id = categoryId;
        // Resolve category name
        try {
          const cats = await fetchCategories();
          const cat = cats.find((c) => c.category_id === parseInt(categoryId));
          if (cat) setCategoryName(cat.category_name);
        } catch {}
      }
      const data = await fetchCategoryProblems(params);
      setProblems(data.items || []);
    } catch {
      showToast('Failed to load problems.', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  // ── Stats ────────────────────────────────────────────────────
  const stats = {
    OPEN:        problems.filter((p) => p.status_name === 'OPEN').length,
    IN_PROGRESS: problems.filter((p) => p.status_name === 'IN_PROGRESS').length,
    RESOLVED:    problems.filter((p) => p.status_name === 'RESOLVED').length,
    CLOSED:      problems.filter((p) => p.status_name === 'CLOSED').length,
  };

  // ── Filtered list ────────────────────────────────────────────
  const filtered =
    activeStatus === 'ALL'
      ? problems
      : problems.filter((p) => p.status_name === activeStatus);

  // ── Optimistic status update ─────────────────────────────────
  const handleStatusUpdated = (problemId, newStatus) => {
    setProblems((prev) =>
      prev.map((p) =>
        p.problem_id === problemId ? { ...p, status_name: newStatus } : p
      )
    );
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast.msg && <Toast msg={toast.msg} type={toast.type} />}

      {/* Modal */}
      {selectedProblem && (
        <ProblemModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onStatusUpdated={handleStatusUpdated}
          showToast={showToast}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText size={17} className="text-amber-500" />
            My Problem Tickets
            {categoryName && (
              <span className="badge bg-amber-50 text-amber-700 border border-amber-100 text-[11px] ml-1">
                {categoryName}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any row to view details, update the status, or add a response.
          </p>
        </div>
        <button
          onClick={loadProblems}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-white transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const m = STATUS_META[s] || {};
          const isAll = s === 'ALL';
          const active = activeStatus === s;
          return (
            <button
              key={s}
              id={`filter-tab-${s.toLowerCase()}`}
              onClick={() => setActiveStatus(s)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                active
                  ? isAll
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : `${m.bg} ${m.text} ${m.border} shadow-sm`
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {!isAll && (
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? m.dot : 'bg-slate-300'}`}
                />
              )}
              {isAll ? 'All' : STATUS_META[s]?.label}
              <span
                className={`ml-1 rounded-full px-1.5 text-[10px] font-bold ${
                  active ? 'bg-white/30' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isAll ? problems.length : stats[s] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'OPEN',        label: 'Open',        icon: Clock,         iconColor: 'text-amber-500',   bgColor: 'bg-amber-50'   },
          { key: 'IN_PROGRESS', label: 'In Progress', icon: RefreshCw,     iconColor: 'text-blue-500',    bgColor: 'bg-blue-50'    },
          { key: 'RESOLVED',    label: 'Resolved',    icon: CheckCircle2,  iconColor: 'text-emerald-500', bgColor: 'bg-emerald-50' },
          { key: 'CLOSED',      label: 'Closed',      icon: FileText,      iconColor: 'text-slate-400',   bgColor: 'bg-slate-100'  },
        ].map(({ key, label, icon: Icon, iconColor, bgColor }) => (
          <div
            key={key}
            className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-slate-200 transition-colors"
            onClick={() => setActiveStatus(key)}
          >
            <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
              <Icon size={15} className={iconColor} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800 leading-none">{stats[key]}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {filtered.length} {filtered.length === 1 ? 'ticket' : 'tickets'}
            {activeStatus !== 'ALL' && ` · ${STATUS_META[activeStatus]?.label}`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <FileText size={22} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">No tickets found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeStatus !== 'ALL'
                  ? `No ${STATUS_META[activeStatus]?.label} tickets.`
                  : 'No problems assigned to this category yet.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Ticket ID</th>
                  <th>Title</th>
                  <th style={{ width: '140px' }}>Status</th>
                  <th style={{ width: '130px' }}>Reporter</th>
                  <th style={{ width: '120px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.problem_id}
                    onClick={() => setSelectedProblem(p)}
                    className="cursor-pointer"
                  >
                    {/* ID */}
                    <td>
                      <span className="text-xs font-mono text-slate-400">#{p.problem_id}</span>
                    </td>

                    {/* Title */}
                    <td>
                      <div>
                        <p className="font-semibold text-slate-800 text-[13px] line-clamp-1">
                          {p.title}
                        </p>
                        {p.building_name && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 size={10} />
                            {p.building_name}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <StatusPill status={p.status_name} />
                    </td>

                    {/* Reporter */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 text-[10px] font-bold flex-shrink-0">
                          {(p.author?.display_name || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-[12px] text-slate-600 truncate max-w-[90px]">
                          {p.author?.display_name || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="text-[12px] text-slate-500">{fmtDate(p.created_at)}</td>
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

export default CategoryAdminDashboard;
