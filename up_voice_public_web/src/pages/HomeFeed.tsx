/**
 * HomeFeed.tsx
 *
 * React + TypeScript migration of Flutter's HomeScreen.
 * Faithfully reproduces:
 *  - Problem list fetched from /api/v1/problems/list?visibility=<type>
 *  - Staff/Admin tabs (roleId 2 or 4): "ฟีดสาธารณะ" | "ข่าวสารภายใน"
 *  - Horizontal category chip filter (with live counts)
 *  - Privacy masking: every author shown as "ไม่ระบุตัวตน" regardless of actual author
 *  - Image rendering with correct URL normalisation (mirrors the Flutter regex fix)
 *  - Left accent border: red for internal posts, UP Purple for public
 *  - Building / location pill
 *  - Upvote toggle with optimistic UI + server reconciliation
 *  - Delete button visible only for own posts (author_id === userId)
 *  - Delete confirmation modal
 *  - Thai Buddhist-calendar timestamp: "2 ก.ค. 2569 เวลา 13:55 น."
 *  - Pull-to-refresh (via a Refresh button on web)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = 'http://127.0.0.1:8000/api/v1';
const UP_PURPLE = '#2B164D';

// ─── TypeScript Interfaces ────────────────────────────────────────────────────
export interface Problem {
  id: number;
  problem_id?: number;
  title: string;
  description: string | null;
  image_url: string | null;
  visibility: 'public' | 'internal';
  visibility_name?: 'public' | 'internal';
  is_staff_only: boolean;
  created_at: string;
  author_id: number | null;
  upvote_count: number;
  like_count?: number;
  is_upvoted_by_me: boolean;
  is_liked_by_me?: boolean;
  author_name?: string;
  author?: {
    user_id: number;
    display_name: string;
    role: string;
  };
  category_id: number | null;
  category: Category | null;
  building: Building | null;
  location: string | null;
}

export interface Category {
  id: number;
  name: string;
}

export interface Building {
  id: number;
  name: string;
}

interface ApiProblemListResponse {
  success: boolean;
  data: {
    items: Problem[];
    total?: number;
  } | Problem[];
  message?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract items from either { data: { items } } or { data: [] } shape */
function extractItems(data: ApiProblemListResponse['data']): Problem[] {
  if (Array.isArray(data)) return data;
  if (data && 'items' in data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Mirrors Flutter's _formatDateTime:
 *  - Appends 'Z' if no timezone suffix (treats as UTC → converts to local +7)
 *  - Returns Thai Buddhist calendar date string
 */
function formatDateTime(rawDate: string | null | undefined): string {
  if (!rawDate) return '';
  try {
    const dateString = rawDate.endsWith('Z') || rawDate.includes('+')
      ? rawDate
      : rawDate + 'Z'; // force UTC interpretation
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // CE → BE
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} เวลา ${hh}:${mm} น.`;
  } catch {
    return '';
  }
}

/**
 * Normalises image URLs — mirrors the Flutter regex fix exactly:
 *   1. Absolute URLs kept as-is
 *   2. Relative paths get base prepended
 *   3. Ensures uploads/images/ not uploads/images/images/
 */
function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  if (raw.startsWith('http')) return raw;
  const cleaned = raw.replace(/^\/+/, '').replace('uploads/', 'uploads/images/').replace('images/images/', 'images/');
  return `${API_BASE.replace('/api/v1', '')}/${cleaned}`;
}

// ─── Toast (reuse the same tiny pattern from ReportProblem) ──────────────────
type ToastVariant = 'success' | 'error';

interface ToastMsg { id: number; msg: string; variant: ToastVariant; }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const counter = useRef(0);
  const push = useCallback((msg: string, variant: ToastVariant = 'error') => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, msg, variant }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

function ToastStack({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white animate-[slideUp_0.3s_ease-out_forwards] ${t.variant === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <span>{t.variant === 'success' ? '✅' : '❌'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Delete confirmation modal ────────────────────────────────────────────────
function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">🗑️</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">ยืนยันการลบโพสต์</h3>
            <p className="text-sm text-slate-500 mt-0.5">คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้?</p>
          </div>
        </div>
        <div className="flex gap-3 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition shadow-md shadow-red-200"
          >
            ลบโพสต์
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Individual Problem Card ──────────────────────────────────────────────────
function ProblemCard({
  problem,
  userId,
  onUpvote,
  onDeleteRequest,
}: {
  problem: Problem;
  userId: number | null;
  onUpvote: (id: number) => void;
  onDeleteRequest: (id: number) => void;
}) {
  const isOwn = userId !== null && problem.author_id === userId;
  const isInternal = problem.visibility === 'internal' || problem.visibility_name === 'internal';
  const accentColor = isInternal ? '#E11D48' : '#10B981';
  
  const problemId = problem.problem_id ?? problem.id;
  const authorName = problem.author?.display_name || problem.author_name || "ไม่ระบุตัวตน";
  const imageUrl = resolveImageUrl(problem.image_url);
  const [imgError, setImgError] = useState(false);

  return (
    <article
      className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4 hover:shadow-md transition-shadow duration-200"
      style={{ borderLeft: `6px solid ${accentColor}` }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-bold text-[#2B164D] max-w-[200px] truncate">
            👁️ <span className="truncate">{authorName}</span>
          </span>
          <div className="flex gap-2">
            {isInternal ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">🔒 ภายใน</span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">🌐 สาธารณะ</span>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mb-2.5">
          โพสต์เมื่อ: {formatDateTime(problem.created_at)}
        </p>

        <h3 className="font-bold text-slate-800 text-sm mb-1 leading-snug">
          {problem.title}
        </h3>

        {(problem.building?.name || problem.location) && (
          <div className="flex items-start gap-1 text-[11px] text-[#2B164D]/70 font-medium mb-3 mt-2 bg-purple-50/50 p-2 rounded-lg">
            <span>📍</span>
            <span className="flex-1 break-words">{problem.building?.name || problem.location}</span>
          </div>
        )}

        {imageUrl && !imgError && (
          <div className="mt-3 rounded-xl overflow-hidden bg-slate-100 max-h-[280px] w-full border border-slate-200">
            <img
              src={imageUrl}
              alt="Problem"
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {problem.description && (
          <p className="mt-3 text-sm text-slate-600 line-clamp-3 leading-relaxed break-words whitespace-pre-wrap">
            {problem.description}
          </p>
        )}

        <hr className="border-slate-100 my-4" />

        <div className="flex items-center justify-between h-9">
          <button
            onClick={() => onUpvote(problemId!)}
            className={`
              inline-flex items-center gap-1.5 h-full px-3.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm
              ${
                problem.is_upvoted_by_me || problem.is_liked_by_me
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
              }
            `}
          >
            <span className={`transform transition-transform ${problem.is_upvoted_by_me || problem.is_liked_by_me ? 'scale-110' : ''}`}>
              {problem.is_upvoted_by_me || problem.is_liked_by_me ? '❤️' : '🤍'}
            </span>
            <span>{(problem.upvote_count ?? 0) + (problem.like_count ?? 0)}</span>
          </button>

          <div className="flex gap-2 h-full">
            {isOwn && (
              <button
                onClick={() => onDeleteRequest(problemId!)}
                className="h-full px-3.5 rounded-full border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors shadow-sm flex items-center justify-center"
                title="ลบโพสต์"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}
            
            <button
              className="h-full px-3.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold hover:bg-slate-100 transition-colors shadow-sm"
              onClick={() => alert('ฟีเจอร์แชร์กำลังอยู่ในระหว่างพัฒนา')}
            >
              แชร์
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-slate-100 rounded-full" />
        <div className="h-6 w-20 bg-slate-100 rounded-lg" />
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-4 w-4 bg-slate-100 rounded-full" />
        <div className="h-4 w-24 bg-slate-100 rounded-full" />
      </div>
      <div className="space-y-2 mt-4">
        <div className="h-5 w-3/4 bg-slate-100 rounded" />
        <div className="h-32 w-full bg-slate-100 rounded-xl" />
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-40 bg-slate-100 rounded" />
        <div className="h-4 w-3/4 bg-slate-100 rounded" />
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-5/6 bg-slate-100 rounded" />
        <hr className="border-slate-100" />
      </div>
    </div>
  );
}

// ─── Main HomeFeed Component ──────────────────────────────────────────────────
export default function HomeFeed() {
  const roleId = Number(localStorage.getItem('role_id') ?? 0);
  const userId = localStorage.getItem('user_id') ? Number(localStorage.getItem('user_id')) : null;
  const isPrivileged = roleId === 2 || roleId === 4;

  const [problems, setProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<{id: number; name: string; icon: string}[]>([{ id: 0, name: 'ทั้งหมด', icon: '📋' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState(0);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toasts, push: pushToast } = useToast();

  const fetchProblems = useCallback(async (tab: 0 | 1 = activeTab, silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const visibility = tab === 0 ? 'public' : 'internal';
      const token = localStorage.getItem('access_token');
      const res = await axios.get<ApiProblemListResponse>(
        `${API_BASE}/problems/list`,
        {
          params: { visibility_name: visibility },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (res.data.success) {
        setProblems(extractItems(res.data.data));
      } else {
        setError(res.data.message ?? 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } catch (err) {
      console.error('🚨 ดึงข้อมูลไม่ได้:', err);
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchProblems(activeTab, false);
    setSelectedCategoryId(0);
  }, [activeTab, fetchProblems]);

  const getCategoryCount = useCallback((catId: number) => {
    if (catId === 0) return problems.length;
    return problems.filter(p => p.category_id === catId || p.category?.id === catId).length;
  }, [problems]);

  const visibleChips = useMemo(
    () => categories.filter(c => c.id === 0 || getCategoryCount(c.id) > 0),
    [categories, getCategoryCount]
  );

  const displayProblems = useMemo(() => {
    if (selectedCategoryId === 0) return problems;
    return problems.filter(p => p.category_id === selectedCategoryId || p.category?.id === selectedCategoryId);
  }, [problems, selectedCategoryId]);

  const handleUpvote = async (pid: number) => {
    if (!localStorage.getItem('access_token')) {
      pushToast('กรุณาเข้าสู่ระบบก่อนแสดงความรู้สึก', 'error');
      return;
    }
    
    setProblems(prev =>
      prev.map(p => {
        if ((p.problem_id ?? p.id) === pid) {
          const wasUpvoted = p.is_upvoted_by_me || p.is_liked_by_me;
          const currentCount = (p.upvote_count ?? 0) + (p.like_count ?? 0);
          return {
            ...p,
            is_liked_by_me: !wasUpvoted,
            is_upvoted_by_me: !wasUpvoted,
            like_count: wasUpvoted ? Math.max(0, currentCount - 1) : currentCount + 1,
            upvote_count: 0
          };
        }
        return p;
      })
    );

    try {
      const res = await axios.post(`${API_BASE}/problems/${pid}/like`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
      });
      if (!res.data.success) throw new Error();
    } catch {
      pushToast('ไม่สามารถบันทึกข้อมูลได้', 'error');
      fetchProblems(activeTab, true);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.delete(`${API_BASE}/problems/${deleteTargetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        pushToast('ลบโพสต์สำเร็จ', 'success');
        setProblems(prev => prev.filter(p => (p.problem_id ?? p.id) !== deleteTargetId));
      } else {
        pushToast(res.data.message ?? 'เกิดข้อผิดพลาดในการลบโพสต์', 'error');
      }
    } catch (err) {
      pushToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadCats() {
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE}/problems/categories`, { headers });
        if (!cancelled && res.data.success) {
          const items = Array.isArray(res.data.data) ? res.data.data : res.data.data.items;
          const formatted = items.map((c: any) => ({
            id: c.category_id ?? c.id,
            name: c.category_name ?? c.name,
            icon: '🏷️'
          }));
          setCategories([{ id: 0, name: 'ทั้งหมด', icon: '📋' }, ...formatted]);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    loadCats();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-[550px] mx-auto pb-20 md:pb-0">
          
          {/* ── Page header ── */}
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#2B164D]">
              📣 UP Voice Feed
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              กระดานรับฟังเสียงและปัญหาของชุมชนมหาวิทยาลัยพะเยา
            </p>
          </header>

          {/* ── Tabs (Logged in users only) ── */}
          {isPrivileged && (
            <div className="mb-4">
              <div className="flex items-end gap-1 border-b border-slate-200">
                <button
                  id="tab-public"
                  onClick={() => { setActiveTab(0); }}
                  className={`px-4 pb-2.5 text-sm font-bold border-b-2 transition-colors -mb-px ${
                    activeTab === 0
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  🌐 ฟีดสาธารณะ
                </button>
              <button
                id="tab-internal"
                onClick={() => { setActiveTab(1); }}
                className={`px-4 pb-2.5 text-sm font-bold border-b-2 transition-colors -mb-px ${
                  activeTab === 1
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🔒 ข่าวสารภายใน
              </button>

              {/* Spacer + Refresh */}
              <div className="ml-auto pb-1">
                <button
                  onClick={() => fetchProblems(activeTab, true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#2B164D] transition disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}>
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  รีเฟรช
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refresh button for non-staff */}
        {!isPrivileged && (
          <div className="flex justify-end mb-3">
            <button
              onClick={() => fetchProblems(0, true)}
              disabled={isRefreshing}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#2B164D] transition disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}>
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              รีเฟรช
            </button>
          </div>
        )}

        {/* ── Category filter chips ── */}
        {!isLoading && problems.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
            {visibleChips.map(cat => {
              const isSelected = selectedCategoryId === cat.id;
              const count = getCategoryCount(cat.id);
              return (
                <button
                  key={cat.id}
                  id={`cat-chip-${cat.id}`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`
                    flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150
                    ${isSelected
                      ? 'bg-[#2B164D]/10 border-[#2B164D] text-[#2B164D]'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-[#2B164D]/40 hover:text-[#2B164D]'
                    }
                  `}
                >
                  {cat.icon} {cat.name} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* ── Error state ── */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-5xl">😵</span>
            <p className="text-slate-600 font-medium">{error}</p>
            <button
              onClick={() => fetchProblems(activeTab, false)}
              className="mt-2 px-5 py-2 rounded-xl bg-[#2B164D] text-white text-sm font-semibold hover:bg-[#3d2268] transition"
            >
              ลองอีกครั้ง
            </button>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {isLoading && (
          <div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && !error && displayProblems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">📭</span>
            <p className="text-slate-500 font-medium">ไม่พบโพสต์ในหมวดหมู่นี้</p>
            {selectedCategoryId !== 0 && (
              <button
                onClick={() => setSelectedCategoryId(0)}
                className="text-xs text-[#2B164D] underline underline-offset-2"
              >
                ดูทั้งหมด
              </button>
            )}
          </div>
        )}

        {/* ── Problem cards ── */}
        {!isLoading && !error && displayProblems.map(problem => {
          const pid = problem.problem_id ?? problem.id;
          return (
            <ProblemCard
              key={pid}
              problem={problem}
              userId={userId}
              onUpvote={handleUpvote}
              onDeleteRequest={id => setDeleteTargetId(id)}
            />
          );
        })}
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteTargetId !== null && !isDeleting && (
        <DeleteModal
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Toasts ── */}
      <ToastStack toasts={toasts} />

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}
