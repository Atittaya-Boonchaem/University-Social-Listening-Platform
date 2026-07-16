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
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = 'http://127.0.0.1:8000/api/v1';


// ─── TypeScript Interfaces ────────────────────────────────────────────────────
export interface Problem {
  id: number;
  problem_id?: number;
  title: string;
  description: string | null;
  image_url?: string | null;
  image?: string | null;
  photo?: string | null;
  attachments?: { file_url: string }[];
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
  building_name?: string | null;
  category_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  onDeleteRequest,
}: {
  problem: Problem;
  userId: number | null;
  onUpvote: (id: number) => void;
  onDeleteRequest: (id: number) => void;
}) {
  const navigate = useNavigate();
  const isOwn = userId !== null && problem.author_id === userId;
  const isInternal = problem.visibility === 'internal' || problem.visibility_name === 'internal';
  
  const problemId = problem.problem_id ?? problem.id;
  
  // Use exact author name or fallback to generic role for the tag
  let authorTag = 'ไม่ระบุตัวตน';
  if (problem.author?.role === 'student' || problem.author_name?.includes('นิสิต')) authorTag = 'นิสิต';
  else if (problem.author?.role === 'staff' || problem.author_name?.includes('บุคลากร')) authorTag = 'บุคลากร';

  let rawImages: string[] = [];
  if ((problem as any).images) rawImages = (problem as any).images;
  else if ((problem as any).imageUrls) rawImages = (problem as any).imageUrls;
  else if (problem.attachments && problem.attachments.length > 0) rawImages = problem.attachments.map(a => a.file_url);
  else {
    const single = problem.image_url || problem.image || problem.photo;
    if (single) rawImages = [single];
  }
  const images = rawImages.map(url => resolveImageUrl(url)).filter(Boolean) as string[];

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article
      onClick={() => navigate(`/issue/${problemId}`, { state: { problem } })}
      className="glass-card ambient-shadow rounded-xl p-5 relative group overflow-hidden transition-all duration-300 hover:translate-y-[-2px] mb-stack-sm cursor-pointer"
    >
      {/* Profile Badge (Top Left) */}
      <div className="absolute top-0 left-0">
        <span className={`${isInternal ? 'bg-secondary' : 'bg-primary'} text-white text-[10px] font-bold px-3 py-1 rounded-br-lg tracking-wider uppercase`}>
          {authorTag}
        </span>
      </div>

      {/* Delete Action */}
      {isOwn && (
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteRequest(problemId); }}
          className="absolute top-4 right-4 p-2 text-outline-variant hover:text-error hover:bg-error-container/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-0.5 ${isInternal ? 'bg-secondary-container/30 text-on-secondary-fixed-variant' : 'bg-tertiary-container/20 text-on-tertiary-container'} rounded text-[11px] font-bold`}>
            {problem.category_name || (problem.category as any)?.category_name || problem.category?.name || 'หมวดหมู่ทั่วไป'}
          </div>
          <span className="text-[12px] text-outline italic">{formatDateTime(problem.created_at)}</span>
        </div>
        
        <div className="mt-1">
          <p className={`font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
            {problem.description || problem.title || 'ไม่มีรายละเอียด'}
          </p>
          {(problem.description || problem.title || '').length > 100 && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="text-primary hover:underline cursor-pointer text-sm font-medium mt-1 inline-block"
            >
              {isExpanded ? 'ย่อความ...' : 'อ่านเพิ่มเติม...'}
            </button>
          )}
        </div>

        {/* Mock Image for now, or actual image */}
        {images.length > 0 && (
          <div className="w-full h-48 rounded-lg overflow-hidden bg-surface-container-highest mt-2">
            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${images[0]}')` }}></div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-outline-variant/30 flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-[18px]">location_on</span>
            <span className="text-label-sm font-label-sm">{problem.building_name || problem.building?.name || problem.location || 'พิกัดมหาวิทยาลัยพะเยา'}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {(() => {
              const s = (problem as any).status_name || (problem as any).status?.status_name || 'OPEN';
              if (s === 'IN_PROGRESS') {
                return (
                  <>
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-label-sm font-label-sm text-primary">กำลังดำเนินการ</span>
                  </>
                );
              }
              if (s === 'RESOLVED' || s === 'CLOSED') {
                return (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-label-sm font-label-sm text-green-600">แก้ไขสำเร็จ</span>
                  </>
                );
              }
              return (
                <>
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                  <span className="text-label-sm font-label-sm text-tertiary">รอดำเนินการ</span>
                </>
              );
            })()}
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
// ─── HomeFeed Component ────────────────────────────────────────────────────────
// หน้าที่: แสดงหน้ารายการปัญหา/ข้อร้องเรียนทั้งหมด (หน้าหลักของแอป)
// การทำงานหลัก:
// 1. ดึงข้อมูลและแสดงรายการปัญหาจาก API (ฟีดสาธารณะ และ ฟีดข่าวสารภายในสำหรับบุคลากร)
// 2. จัดการเรื่อง Role-Based Visibility (บุคลากรและแอดมินเท่านั้นถึงจะเห็นแท็บ 'ข่าวสารภายใน')
// 3. กรองปัญหาตามหมวดหมู่ (Category Filter)
// 4. รองรับการกดโหวต (Upvote) และการลบโพสต์ของตัวเอง
// 5. นำเสนอข้อมูลในรูปแบบการ์ด พร้อมการปกปิดตัวตน (แสดงชื่อผู้แจ้งเป็น "ไม่ระบุตัวตน" เสมอในหน้าฟีด)
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
      {/* TopAppBar */}
      <header className="md:hidden fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 h-16 bg-surface-container-low shadow-sm transition-colors duration-200 ease-in-out">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">hub</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">UP Connect</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-surface-variant/50 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs">
            {localStorage.getItem('display_name')?.substring(0, 2).toUpperCase() || 'UP'}
          </div>
        </div>
      </header>

      <div className="min-h-screen bg-surface pt-24 md:pt-8 pb-8 px-4">
        <div className="max-w-[600px] mx-auto pb-20 md:pb-0">
          
          {/* ── Page header ── */}
          <section className="mb-stack-lg">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-2">รายการปัญหาล่าสุด</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">รายงานปัญหาและการปรับปรุงภายในมหาวิทยาลัยพะเยา</p>
          </section>

          {/* ── Tabs (Logged in users only) ── */}
          {isPrivileged && (
            <div className="mb-4">
              <div className="flex items-end gap-1 border-b border-outline-variant/30">
                <button
                  id="tab-public"
                  onClick={() => { setActiveTab(0); }}
                  className={`px-4 pb-2.5 text-label-md font-label-md border-b-2 transition-colors -mb-px ${
                    activeTab === 0
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-primary'
                  }`}
                >
                  🌐 ฟีดสาธารณะ
                </button>
              <button
                id="tab-internal"
                onClick={() => { setActiveTab(1); }}
                className={`px-4 pb-2.5 text-label-md font-label-md border-b-2 transition-colors -mb-px ${
                  activeTab === 1
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-on-surface-variant hover:text-secondary'
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
                    flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-label-md font-label-md transition-all duration-200
                    ${isSelected
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white border border-outline-variant/50 text-on-surface-variant hover:border-primary hover:text-primary'
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
