/**
 * HomeFeed.tsx
 *
 * Modern Feed & Issue Tracking Portal for UP Connect (University of Phayao)
 * - Hero Banner with University Royal Purple Gradient & Gold CTA
 * - Live Category Filter Pills with real counts from API
 * - Status Filter & Sorting (Latest, Upvotes, Urgency)
 * - Feed Cards powered by Real Database Records
 * - Analytical Sidebar (Live Status Summary, Campus Hotspots, Emergency Hotlines, PDPA)
 * - Real-time Upvote & Search Support
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

// ─── API Constants ────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Problem {
  id: number;
  problem_id?: number;
  ticket_id?: string | null;
  title: string;
  description: string | null;
  image_url?: string | null;
  image?: string | null;
  photo?: string | null;
  attachments?: { file_url: string }[];
  visibility: 'public' | 'internal' | 'PUBLIC' | 'INTERNAL';
  visibility_id?: number;
  visibility_name?: string;
  is_staff_only?: boolean;
  created_at: string;
  user_id?: number | null;
  author_id?: number | null;
  upvote_count?: number;
  like_count?: number;
  is_upvoted_by_me?: boolean;
  is_liked_by_me?: boolean;
  author_name?: string;
  author?: {
    user_id: number;
    display_name: string;
    role: string;
    student_id?: string;
  };
  category_id: number | null;
  category_name?: string | null;
  category?: {
    id?: number;
    category_id?: number;
    name?: string;
    category_name?: string;
  } | null;
  building_name?: string | null;
  building?: { id?: number; name?: string } | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status_name?: string;
  status_color?: string;
  updated_at?: string | null;
  llm_analysis?: any;
}

export interface CategoryItem {
  id: number;
  name: string;
  ticket_prefix?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  if (raw.startsWith('http')) return raw;
  const cleaned = raw.replace(/^\/+/, '').replace('uploads/', 'uploads/images/').replace('images/images/', 'images/');
  return `${API_BASE.replace('/api/v1', '')}/${cleaned}`;
}

function formatThaiRelativeTime(rawDate: string | null | undefined): string {
  if (!rawDate) return '';
  try {
    const dateString = rawDate.endsWith('Z') || rawDate.includes('+') ? rawDate : rawDate + 'Z';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'เมื่อสักครู่';
    if (diffMin < 60) return `เมื่อ ${diffMin} นาทีที่แล้ว`;
    if (diffHour < 24) return `เมื่อ ${diffHour} ชั่วโมงที่แล้ว`;
    if (diffDay === 1) return 'เมื่อวานนี้';
    if (diffDay < 7) return `เมื่อ ${diffDay} วันที่แล้ว`;

    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const d = date.getDate();
    const m = thaiMonths[date.getMonth()];
    const y = date.getFullYear() + 543;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${d} ${m} ${y} ${hh}:${mm} น.`;
  } catch {
    return '';
  }
}


function getTicketCode(problem: Problem): string {
  if (problem.ticket_id) return problem.ticket_id;
  const pid = problem.problem_id || problem.id;
  return `UP-CASE-${pid}`;
}

export default function HomeFeed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const roleId = Number(localStorage.getItem('role_id') ?? 0);
  const isPrivileged = roleId === 2 || roleId === 4;

  const [problems, setProblems] = useState<Problem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = Public, 1 = Internal (Staff)
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({});

  // ─── Extract Unique Locations ───────────────────────────────────────────────
  const locations = useMemo(() => {
    const locSet = new Set<string>();
    problems.forEach(p => {
      const loc = p.building_name || p.location;
      if (loc && loc.trim()) locSet.add(loc.trim());
    });
    return Array.from(locSet).sort();
  }, [problems]);

  // ─── Fetch Categories ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadCategories() {
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE}/problems/categories`, { headers });
        if (res.data.success && res.data.data?.items) {
          const formatted = res.data.data.items.map((c: any) => ({
            id: c.category_id ?? c.id,
            name: c.category_name ?? c.name,
            ticket_prefix: c.ticket_prefix,
          }));
          setCategories(formatted);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    loadCategories();
  }, []);

  // ─── Fetch Problems ──────────────────────────────────────────────────────────
  const fetchProblems = useCallback(async (tab: 0 | 1 = activeTab) => {
    setIsLoading(true);
    try {
      const visibility = tab === 0 ? 'public' : 'internal';
      const token = localStorage.getItem('access_token');
      const res = await axios.get(`${API_BASE}/problems/list`, {
        params: { visibility_name: visibility, page_size: 100 },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.data.success) {
        let items: Problem[] = [];
        if (Array.isArray(res.data.data)) {
          items = res.data.data;
        } else if (res.data.data?.items && Array.isArray(res.data.data.items)) {
          items = res.data.data.items;
        }
        setProblems(items);
      }
    } catch (err) {
      console.error('Failed to load problems', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchProblems(activeTab);
  }, [activeTab, fetchProblems]);


  // ─── Filtering & Sorting Logic ───────────────────────────────────────────────
  const filteredProblems = useMemo(() => {
    let result = [...problems];

    // 0. Strict Tab Visibility Filter
    if (activeTab === 1) {
      // Internal News (Staff Only)
      result = result.filter(p => {
        const v = (p.visibility_name || p.visibility || '').toUpperCase();
        return v === 'STAFF_ONLY' || v === 'INTERNAL' || p.visibility_id === 2 || p.is_staff_only === true;
      });
    } else {
      // Public Feed
      result = result.filter(p => {
        const v = (p.visibility_name || p.visibility || '').toUpperCase();
        return (v === 'PUBLIC' || !v || p.visibility_id === 1) && v !== 'STAFF_ONLY' && v !== 'INTERNAL' && p.visibility_id !== 2;
      });
    }

    // 1. Text Search Filter (URL query)
    if (urlSearch.trim()) {
      const q = urlSearch.toLowerCase();
      result = result.filter(
        p =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.building_name && p.building_name.toLowerCase().includes(q)) ||
          (p.category_name && p.category_name.toLowerCase().includes(q)) ||
          (p.ticket_id && p.ticket_id.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter(p => {
        const catId = p.category_id || p.category?.id;
        const catName = p.category_name || p.category?.category_name || p.category?.name;
        return String(catId) === selectedCategory || catName === selectedCategory;
      });
    }

    // 3. Location Filter
    if (selectedLocation !== 'all') {
      result = result.filter(p => {
        const loc = p.building_name || p.location;
        return loc === selectedLocation;
      });
    }

    // 4. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(p => {
        const s = (p.status_name || 'OPEN').toUpperCase();
        if (statusFilter === 'pending') return s === 'OPEN' || s === 'PENDING' || s === 'RECEIVED';
        if (statusFilter === 'in_progress') return s === 'IN_PROGRESS' || s === 'INVESTIGATING';
        if (statusFilter === 'resolved') return s === 'RESOLVED' || s === 'CLOSED';
        return true;
      });
    }

    // 5. Sorting
    if (sortBy === 'latest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'upvotes') {
      result.sort((a, b) => (b.like_count ?? b.upvote_count ?? 0) - (a.like_count ?? a.upvote_count ?? 0));
    } else if (sortBy === 'urgent') {
      // Prioritize urgent or unresolved
      result.sort((a, b) => {
        const statusOrder: Record<string, number> = { OPEN: 1, IN_PROGRESS: 2, RESOLVED: 3, CLOSED: 4 };
        const aVal = statusOrder[(a.status_name || 'OPEN').toUpperCase()] || 99;
        const bVal = statusOrder[(b.status_name || 'OPEN').toUpperCase()] || 99;
        return aVal - bVal;
      });
    }

    return result;
  }, [problems, urlSearch, selectedCategory, selectedLocation, statusFilter, sortBy]);

  // ─── Category Counts ────────────────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: problems.length };
    problems.forEach(p => {
      const catId = p.category_id || p.category?.id;
      const catName = p.category_name || p.category?.category_name || p.category?.name;
      if (catId) counts[String(catId)] = (counts[String(catId)] || 0) + 1;
      if (catName) counts[catName] = (counts[catName] || 0) + 1;
    });
    return counts;
  }, [problems]);


  return (
    <div className="w-full flex flex-col bg-[#FAF8FF]">
      
      {/* ── Ambient Hero Section with University Royal Purple Gradient ── */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4B267D] via-[#3B1B67] to-[#250849] p-6 sm:p-8 lg:p-12 shadow-xl text-white">
          {/* Subtle Decorative Background Glow Elements */}
          <div className="absolute -right-16 -top-24 w-96 h-96 rounded-full bg-[#fed65b]/15 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-20 w-80 h-80 rounded-full bg-[#d7baff]/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 lg:gap-12">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-[#fed65b] text-xs font-bold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[16px] text-[#fed65b]">verified</span>
                ระบบฟีดและติดตามปัญหา มหาวิทยาลัยพะเยา
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
                ร่วมกันแจ้ง ร่วมกันแก้<br />เพื่อมหาวิทยาลัยที่ดีขึ้น
              </h1>
              <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed font-normal">
                ศูนย์กลางรับฟังเสียงนิสิต ตรวจสอบ และติดตามการแก้ไขปัญหาในมหาวิทยาลัยพะเยา ทุกเสียงขับเคลื่อนการเปลี่ยนแปลงจริงอย่างโปร่งใสและตรวจสอบได้
              </p>
            </div>

            {/* Action Callouts */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:w-72">
              <NavLink
                to="/report"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#c39e2a] active:scale-[0.98] text-[#1e1300] font-bold text-base shadow-md transition-all duration-150"
              >
                <span className="material-symbols-outlined text-[22px] font-bold">add_circle</span>
                แจ้งปัญหาใหม่
              </NavLink>

              {isPrivileged && (
                <div className="flex rounded-xl bg-white/10 p-1 border border-white/20">
                  <button
                    onClick={() => setActiveTab(0)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 0 ? 'bg-white text-[#340866] shadow-sm' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    🌐 ฟีดสาธารณะ
                  </button>
                  <button
                    onClick={() => setActiveTab(1)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === 1 ? 'bg-white text-[#340866] shadow-sm' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    🔒 ข่าวสารภายใน
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Primary Layout: Feed ── */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col gap-5 pb-12">
          
          {/* Interactive Filter & Dropdown Navigation Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#340866] text-[22px]">tune</span>
                <h2 className="text-base sm:text-lg font-bold text-[#131b2e]">ค้นหาและคัดกรองปัญหา</h2>
              </div>
              {(selectedCategory !== 'all' || selectedLocation !== 'all' || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedLocation('all');
                    setStatusFilter('all');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>

            {/* Dropdown Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* 1. Category Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#340866]">category</span>
                  หมวดหมู่ปัญหา
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full bg-[#f2f3ff] text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 border border-slate-200/80 focus:outline-none focus:border-[#4B267D] focus:ring-1 focus:ring-[#4B267D] cursor-pointer appearance-none pr-8"
                  >
                    <option value="all">ทุกหมวดหมู่ ({problems.length})</option>
                    {categories.map(cat => {
                      const count = categoryCounts[String(cat.id)] || categoryCounts[cat.name] || 0;
                      return (
                        <option key={cat.id} value={String(cat.id)}>
                          {cat.name} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* 2. Location Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#340866]">location_on</span>
                  สถานที่ / อาคาร
                </label>
                <div className="relative">
                  <select
                    value={selectedLocation}
                    onChange={e => setSelectedLocation(e.target.value)}
                    className="w-full bg-[#f2f3ff] text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 border border-slate-200/80 focus:outline-none focus:border-[#4B267D] focus:ring-1 focus:ring-[#4B267D] cursor-pointer appearance-none pr-8"
                  >
                    <option value="all">ทุกสถานที่ ({locations.length})</option>
                    {locations.map((loc, i) => (
                      <option key={i} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* 3. Status Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#340866]">verified</span>
                  สถานะการดำเนินงาน
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full bg-[#f2f3ff] text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 border border-slate-200/80 focus:outline-none focus:border-[#4B267D] focus:ring-1 focus:ring-[#4B267D] cursor-pointer appearance-none pr-8"
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="pending">รับเรื่องแล้ว / รอดำเนินการ</option>
                    <option value="in_progress">กำลังดำเนินการ</option>
                    <option value="resolved">แก้ไขเสร็จสิ้น</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* 4. Sort Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-[#340866]">sort</span>
                  เรียงลำดับตาม
                </label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full bg-[#f2f3ff] text-slate-700 text-xs font-semibold rounded-xl px-3 py-2.5 border border-slate-200/80 focus:outline-none focus:border-[#4B267D] focus:ring-1 focus:ring-[#4B267D] cursor-pointer appearance-none pr-8"
                  >
                    <option value="latest">เรียงตาม: ล่าสุด</option>
                    <option value="upvotes">จำนวนคนร่วมแจ้งสูงสุด</option>
                    <option value="urgent">ความเร่งด่วน</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* ── Loading State ── */}
          {isLoading && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-32 bg-slate-200 rounded-full" />
                    <div className="h-6 w-24 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-12 w-full bg-slate-200 rounded" />
                  <div className="h-8 w-full bg-slate-100 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* ── Empty State ── */}
          {!isLoading && filteredProblems.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200/80 flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-5xl text-slate-300">
                {activeTab === 1 ? 'lock' : 'feed'}
              </span>
              <p className="text-base font-bold text-slate-700">
                {activeTab === 1 ? 'ยังไม่มีข่าวสารหรือข้อร้องเรียนภายในสำหรับบุคลากร' : 'ไม่พบรายการปัญหาตามเงื่อนไขที่เลือก'}
              </p>
              <p className="text-xs text-slate-400">
                {activeTab === 1 ? 'เฉพาะโพสต์ที่บุคลากรตั้งค่าเป็น "ข่าวสารภายใน" เท่านั้นที่จะแสดงในแท็บนี้' : 'ลองเปลี่ยนหมวดหมู่ คำค้นหา หรือตัวกรองสถานะ'}
              </p>
              {activeTab === 0 && (
                <button
                  onClick={() => { setSelectedCategory('all'); setStatusFilter('all'); }}
                  className="mt-2 px-4 py-2 text-xs font-bold text-[#340866] bg-[#f2f3ff] rounded-xl hover:bg-[#eaedff] transition"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          )}

          {/* ── Feed Cards ── */}
          {!isLoading && filteredProblems.map(problem => {
            const pid = problem.problem_id || problem.id;
            const isExpanded = !!expandedMap[pid];
            const ticketCode = getTicketCode(problem);
            const relativeTime = formatThaiRelativeTime(problem.created_at);

            // Raw images extraction
            let rawImages: string[] = [];
            if ((problem as any).images) rawImages = (problem as any).images;
            else if (problem.attachments && problem.attachments.length > 0) rawImages = problem.attachments.map(a => a.file_url);
            else if (problem.image_url || problem.image || problem.photo) rawImages = [problem.image_url || problem.image || problem.photo!];
            const images = rawImages.map(url => resolveImageUrl(url)).filter(Boolean) as string[];

            // Author Badge logic
            const authorRole = problem.author?.role || '';
            const authorName = problem.author?.display_name || problem.author_name || '';
            const isStudent = authorRole === 'student' || authorName.includes('นิสิต');
            const isStaff = authorRole === 'staff' || authorName.includes('บุคลากร');
            const isAnon = authorRole === 'anonymous' || authorName.includes('ไม่ประสงค์') || authorName.includes('ไม่ระบุ');

            // Status Badge logic
            const statusUpper = (problem.status_name || 'OPEN').toUpperCase();
            const isInProgress = statusUpper === 'IN_PROGRESS' || statusUpper === 'INVESTIGATING';
            const isResolved = statusUpper === 'RESOLVED' || statusUpper === 'CLOSED';

            return (
              <article
                key={pid}
                onClick={() => navigate(`/issue/${pid}`, { state: { problem } })}
                className="feed-ticket-card relative bg-white rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200/80 cursor-pointer group"
              >
                <div className="flex flex-col gap-3.5">
                  
                  {/* Header Badges: Reporter + Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isStudent && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#340866] text-white text-xs font-bold shadow-xs">
                          <span className="material-symbols-outlined text-[15px]">school</span>
                          {authorName.includes('นิสิต') ? authorName : 'นิสิต มพ.'}
                        </span>
                      )}
                      {isStaff && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4B267D] text-white text-xs font-bold shadow-xs">
                          <span className="material-symbols-outlined text-[15px]">apartment</span>
                          บุคลากร มพ.
                        </span>
                      )}
                      {isAnon && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dae2fd] text-[#131b2e] text-xs font-bold">
                          <span className="material-symbols-outlined text-[15px]">person_off</span>
                          ไม่ระบุตัวตน (Anonymous)
                        </span>
                      )}
                      {!isStudent && !isStaff && !isAnon && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                          <span className="material-symbols-outlined text-[15px]">person</span>
                          {authorName || 'ผู้แจ้งทั่วไป'}
                        </span>
                      )}
                    </div>

                    {/* Status Chip */}
                    <div>
                      {isInProgress && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          กำลังดำเนินการ
                        </span>
                      )}
                      {isResolved && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                          <span className="material-symbols-outlined text-[16px] text-emerald-600 font-bold">check_circle</span>
                          แก้ไขเสร็จสิ้น
                        </span>
                      )}
                      {!isInProgress && !isResolved && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          รับเรื่องแล้ว / รอดำเนินการ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Timestamp & Location */}
                  <div className="flex flex-wrap items-center gap-2 text-slate-500 text-xs">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">schedule</span>
                    <span>{relativeTime}</span>
                    <span className="text-slate-300">•</span>
                    <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
                    <span className="font-semibold text-slate-700">
                      {problem.building_name || problem.location || 'มหาวิทยาลัยพะเยา'}
                    </span>
                  </div>

                  {/* Title & Body Content */}
                  <div className="space-y-1">
                    {problem.title && (
                      <h3 className="text-base font-bold text-[#131b2e] leading-snug group-hover:text-[#340866] transition-colors">
                        {problem.title}
                      </h3>
                    )}
                    <p className={`text-sm text-slate-600 leading-relaxed font-normal ${!isExpanded ? 'line-clamp-3' : ''}`}>
                      {problem.description || problem.title || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </p>
                    {(problem.description || '').length > 180 && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setExpandedMap(p => ({ ...p, [pid]: !p[pid] }));
                        }}
                        className="text-xs font-bold text-[#340866] hover:underline inline-block mt-0.5"
                      >
                        {isExpanded ? 'ย่อเนื้อหา' : 'อ่านเพิ่มเติม...'}
                      </button>
                    )}
                  </div>

                  {/* Attachment Images */}
                  {images.length > 0 && (
                    <div className="w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100 max-h-72 flex items-center justify-center">
                      <img
                        src={images[0]}
                        alt="รูปภาพประกอบเรื่องร้องเรียน"
                        className="w-full h-full object-cover max-h-72 transition-transform duration-200 group-hover:scale-[1.01]"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Responsible Category & Case Info Meta Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 bg-[#f2f3ff]/70 rounded-xl px-3.5 py-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-500 font-medium">หมวดหมู่ที่รับผิดชอบ:</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-white text-[#340866] font-bold shadow-xs border border-slate-200/60">
                        {problem.category_name || 'ทั่วไป'}
                      </span>
                    </div>
                    <div className="font-mono text-slate-500 font-medium">
                      รหัสเคส: {ticketCode}
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-end pt-1">
                    {/* View Details Link */}
                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#340866] group-hover:translate-x-0.5 transition-transform">
                      ดูรายละเอียด
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
      </div>

    </div>
  );
}
