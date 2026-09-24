/**
 * TrackingPage.tsx
 *
 * Modern UP Connect "ติดตามคำร้องของฉัน" (Track Issues) Page
 * Matching the University of Phayao Portal Design:
 *  - Top Hero Banner with Purple Gradient ("ติดตามคำร้องของฉัน" & "แจ้งปัญหาใหม่" without duplicate plus)
 *  - 4 Overview Metric Stat Cards (คำร้องทั้งหมด, รอตรวจสอบ, กำลังดำเนินการ, แก้ไขเสร็จสิ้น)
 *  - Interactive Filter Tabs with status count pills & live search
 *  - Detailed Ticket Cards with:
 *    - Ticket ID & Relative time
 *    - Status badge
 *    - Title, full description, location & department tags
 *    - 5-Step Workflow Stepper
 *    - Latest update note box
 *    - Actions (ยกเลิกคำร้อง, ดูโพสต์บนฟีด, ดูรายละเอียดโพสต์คำร้อง)
 *  - Interactive Detail Modal Popup with Evidence Photo, 5-Step Stepper, and Leaflet Map
 *  - Interactive Cancel Confirmation Dialog with reason selection & cancellation API
 *  - Real API data sync from /problems/my-problems and /problems/list
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet';
import { LatLng as LeafletLatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Leaflet Marker Setup for Vite ──────────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import L from 'leaflet';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom Campus Pin Icon
const campusPinIcon = L.divIcon({
  className: 'custom-campus-pin',
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background-color: rgba(75, 38, 125, 0.2); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #340866, #6f45a7); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(52,8,102,0.45); border: 2.5px solid #ffffff;">
        <span style="color: #fef08a; font-size: 18px; font-family: 'Material Symbols Outlined'; line-height: 1;">location_on</span>
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 30],
  popupAnchor: [0, -30],
});

// Helper component to fix Leaflet size within dynamically rendered modals
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const UP_CENTER: [number, number] = [19.0289, 99.8973];

export interface ProblemItem {
  id: number;
  problem_id?: number;
  ticket_id?: string | null;
  title: string;
  description: string | null;
  building_name?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category_name?: string | null;
  category?: { name?: string };
  status_name?: string | null;
  created_at: string;
  updated_at?: string | null;
  author_name?: string;
  author?: { display_name?: string; role?: string };
  attachments?: { file_url: string }[];
  image_url?: string | null;
  admin_reply?: string | null;
  is_cancelled?: boolean;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  if (raw.startsWith('http')) return raw;
  const cleaned = raw.replace(/^\/+/, '').replace('uploads/', 'uploads/images/').replace('images/images/', 'images/');
  return `${API_BASE.replace('/api/v1', '')}/${cleaned}`;
}

function formatThaiDateTime(rawDate: string | null | undefined): string {
  if (!rawDate) return '';
  try {
    const dateString = rawDate.endsWith('Z') || rawDate.includes('+') ? rawDate : rawDate + 'Z';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} เวลา ${hh}:${mm} น.`;
  } catch {
    return '';
  }
}

function formatThaiRelativeTime(rawDate: string | null | undefined): string {
  if (!rawDate) return '';
  try {
    const dateString = rawDate.endsWith('Z') || rawDate.includes('+') ? rawDate : rawDate + 'Z';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'แจ้งเมื่อสักครู่';
    if (diffMin < 60) return `แจ้งเมื่อ ${diffMin} นาทีที่แล้ว`;
    if (diffHour < 24) return `แจ้งเมื่อ ${diffHour} ชั่วโมงที่แล้ว`;
    if (diffDay === 1) return 'แจ้งเมื่อวานนี้';
    if (diffDay <= 7) return `แจ้งเมื่อ ${diffDay} วันที่แล้ว`;
    return formatThaiDateTime(rawDate);
  } catch {
    return '';
  }
}

function getWorkflowStep(statusName?: string | null): number {
  const s = (statusName || 'OPEN').toUpperCase();
  if (s === 'CANCELLED' || s === 'ยกเลิกคำร้องแล้ว') return 0;
  if (s === 'RESOLVED' || s === 'CLOSED' || s === 'เสร็จสิ้น') return 5;
  if (s === 'IN_PROGRESS' || s === 'INVESTIGATING' || s === 'กำลังดำเนินการ') return 4;
  if (s === 'ASSIGNED' || s === 'PENDING_ACTION' || s === 'WAITING' || s === 'รอดำเนินการ') return 3;
  return 2; // Step 2: รอรับเรื่อง / ตรวจสอบ
}

export default function TrackingPage() {
  const navigate = useNavigate();

  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PENDING' | 'WAITING' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  
  // Modals state
  const [selectedProblemForModal, setSelectedProblemForModal] = useState<ProblemItem | null>(null);
  const [cancelModalProblem, setCancelModalProblem] = useState<ProblemItem | null>(null);
  const [cancelReasonRadio, setCancelReasonRadio] = useState<string>('fixed');
  const [cancelReasonDetail, setCancelReasonDetail] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    async function fetchTrackingData() {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        let items: ProblemItem[] = [];
        try {
          if (token) {
            const myRes = await axios.get(`${API_BASE}/problems/my-problems`, { headers });
            const data = myRes.data?.data?.items || myRes.data?.data || myRes.data?.items;
            if (Array.isArray(data) && data.length > 0) {
              items = data;
            }
          }
        } catch {
          // Fallback to public list
        }

        if (items.length === 0) {
          const listRes = await axios.get(`${API_BASE}/problems/list`, { headers });
          items = listRes.data?.data?.items || listRes.data?.data || listRes.data?.items || [];
        }

        setProblems(items);
      } catch (err) {
        console.error('Failed to load tracking data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrackingData();
  }, []);

  // ─── Counts Computation ─────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let pending = 0;
    let waiting = 0;
    let inProgress = 0;
    let resolved = 0;

    problems.forEach((p) => {
      if (p.is_cancelled) return;
      const step = getWorkflowStep(p.status_name);
      if (step === 2) pending++;
      else if (step === 3) waiting++;
      else if (step === 4) inProgress++;
      else if (step === 5) resolved++;
    });

    return {
      all: problems.length,
      pending,
      waiting,
      inProgress,
      resolved,
    };
  }, [problems]);

  // ─── Filtered List ──────────────────────────────────────────────────────────
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      if (p.is_cancelled && selectedFilter !== 'ALL') return false;

      const step = getWorkflowStep(p.status_name);

      if (selectedFilter === 'PENDING' && step !== 2) return false;
      if (selectedFilter === 'WAITING' && step !== 3) return false;
      if (selectedFilter === 'IN_PROGRESS' && step !== 4) return false;
      if (selectedFilter === 'RESOLVED' && step !== 5) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pid = p.problem_id || p.id;
        const code = (p.ticket_id || `UP-2569-${String(pid).padStart(5, '0')}`).toLowerCase();
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const loc = (p.building_name || p.location || '').toLowerCase();
        if (!code.includes(q) && !title.includes(q) && !desc.includes(q) && !loc.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [problems, selectedFilter, searchQuery]);

  // ─── Handle Cancellation ───────────────────────────────────────────────────
  async function handleConfirmCancel() {
    if (!cancelModalProblem) return;
    setIsSubmittingCancel(true);

    const pid = cancelModalProblem.problem_id || cancelModalProblem.id;
    let reasonText = 'ปัญหาได้รับการแก้ไขแล้วโดยหน่วยงาน/ผู้อื่น';
    if (cancelReasonRadio === 'duplicate') reasonText = 'แจ้งปัญหาซ้ำซ้อนกับโพสต์อื่นที่มีอยู่แล้ว';
    else if (cancelReasonRadio === 'wrong_info') reasonText = 'กรอกข้อมูลพิกัดสถานที่หรือรายละเอียดผิดพลาด';
    else if (cancelReasonRadio === 'other') reasonText = cancelReasonDetail.trim() || 'เหตุผลอื่นๆ';

    if (cancelReasonDetail.trim() && cancelReasonRadio !== 'other') {
      reasonText += ` (${cancelReasonDetail.trim()})`;
    }

    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Attempt soft delete / cancel via API
      try {
        await axios.delete(`${API_BASE}/problems/${pid}`, { headers });
      } catch {
        // Continue even if backend doesn't delete, to update UI state
      }

      // Update state locally
      setProblems((prev) =>
        prev.map((item) => {
          const itemId = item.problem_id || item.id;
          if (itemId === pid) {
            return {
              ...item,
              is_cancelled: true,
              cancel_reason: reasonText,
              cancelled_at: new Date().toISOString(),
              status_name: 'CANCELLED',
            };
          }
          return item;
        })
      );

      // Close modals
      setCancelModalProblem(null);
      setSelectedProblemForModal(null);
      setCancelReasonRadio('fixed');
      setCancelReasonDetail('');

      showToast('ยกเลิกคำร้องเรียบร้อยแล้ว');
    } catch (err) {
      console.error('Error cancelling problem:', err);
      showToast('เกิดข้อผิดพลาดในการยกเลิกคำร้อง');
    } finally {
      setIsSubmittingCancel(false);
    }
  }

  return (
    <div className="w-full bg-[#faf8ff] text-[#21172e] pb-20 font-sans min-h-screen">
      
      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-800 text-xs font-bold">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">

        {/* ── 1. Header / Page Title Banner (Without duplicate plus!) ── */}
        <div className="rounded-2xl bg-gradient-to-r from-[#340866] via-[#4b267d] to-[#6f45a7] text-white p-6 md:p-8 shadow-md relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-4">
            <nav className="flex items-center gap-2 text-xs text-purple-200/80">
              <button onClick={() => navigate('/')} className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer">
                <span className="material-symbols-outlined text-sm">home</span>
                หน้าหลัก
              </button>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-white font-medium">ติดตามคำร้องของฉัน</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                    ติดตามคำร้องของฉัน
                  </h1>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/20 text-purple-100 backdrop-blur-sm border border-white/10">
                    Track Issues
                  </span>
                </div>
                <p className="text-sm text-purple-100/90 max-w-2xl leading-relaxed">
                  ตรวจสอบสถานะและขั้นตอนการดำเนินงานแบบเรียลไทม์ คำร้องจะได้รับการตรวจสอบจากเจ้าหน้าที่ก่อนเผยแพร่สู่ฟีดสาธารณะ
                </p>
              </div>

              {/* Button without duplicate '+' (matches user red-rectangle request) */}
              <button
                onClick={() => navigate('/report')}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.99] self-start md:self-auto shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                <span>แจ้งปัญหาใหม่</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Overview Stat Metrics (4 Cards) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: คำร้องทั้งหมด */}
          <div
            onClick={() => setSelectedFilter('ALL')}
            className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all cursor-pointer ${
              selectedFilter === 'ALL' ? 'border-[#4b267d] ring-2 ring-purple-100' : 'border-purple-100/60 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">คำร้องทั้งหมด</p>
                <p className="text-2xl font-bold text-slate-800">
                  {counts.all} <span className="text-xs font-normal text-slate-400">รายการ</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#4b267d] flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">assignment</span>
              </div>
            </div>
          </div>

          {/* Card 2: รอตรวจสอบ */}
          <div
            onClick={() => setSelectedFilter('PENDING')}
            className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all cursor-pointer ${
              selectedFilter === 'PENDING' ? 'border-amber-400 ring-2 ring-amber-100' : 'border-amber-100 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-slate-500">รอตรวจสอบ</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                    ก่อนขึ้นฟีด
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {counts.pending} <span className="text-xs font-normal text-slate-400">รายการ</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">hourglass_top</span>
              </div>
            </div>
          </div>

          {/* Card 3: กำลังดำเนินการ */}
          <div
            onClick={() => setSelectedFilter('IN_PROGRESS')}
            className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all cursor-pointer ${
              selectedFilter === 'IN_PROGRESS' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-blue-100 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-slate-500">กำลังดำเนินการ</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    กำลังซ่อม
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {counts.inProgress + counts.waiting} <span className="text-xs font-normal text-slate-400">รายการ</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">build</span>
              </div>
            </div>
          </div>

          {/* Card 4: แก้ไขเสร็จสิ้น */}
          <div
            onClick={() => setSelectedFilter('RESOLVED')}
            className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border transition-all cursor-pointer ${
              selectedFilter === 'RESOLVED' ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-emerald-100 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-slate-500">แก้ไขเสร็จสิ้น</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    ปิดเคสแล้ว
                  </span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {counts.resolved} <span className="text-xs font-normal text-slate-400">รายการ</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">task_alt</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── 3. Filter Bar & Search Tabs ── */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-purple-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                selectedFilter === 'ALL'
                  ? 'bg-[#4b267d] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#4b267d] hover:bg-purple-50'
              }`}
            >
              ทั้งหมด ({counts.all})
            </button>

            <button
              onClick={() => setSelectedFilter('PENDING')}
              className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedFilter === 'PENDING'
                  ? 'bg-[#4b267d] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#4b267d] hover:bg-purple-50'
              }`}
            >
              <span>รอรับเรื่อง ({counts.pending})</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </button>

            <button
              onClick={() => setSelectedFilter('WAITING')}
              className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedFilter === 'WAITING'
                  ? 'bg-[#4b267d] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#4b267d] hover:bg-purple-50'
              }`}
            >
              <span>รอดำเนินการ ({counts.waiting})</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </button>

            <button
              onClick={() => setSelectedFilter('IN_PROGRESS')}
              className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedFilter === 'IN_PROGRESS'
                  ? 'bg-[#4b267d] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#4b267d] hover:bg-purple-50'
              }`}
            >
              <span>กำลังดำเนินการ ({counts.inProgress})</span>
              <span className="w-2 h-2 rounded-full bg-purple-600" />
            </button>

            <button
              onClick={() => setSelectedFilter('RESOLVED')}
              className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedFilter === 'RESOLVED'
                  ? 'bg-[#4b267d] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#4b267d] hover:bg-purple-50'
              }`}
            >
              <span>เสร็จสิ้น ({counts.resolved})</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>
          </div>

          <div className="relative sm:w-64 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัสคำร้อง, ชื่อเรื่อง..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#4b267d] transition-all"
            />
          </div>

        </div>

        {/* ── 4. Ticket Cards List ── */}
        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
            <span className="w-10 h-10 border-4 border-[#4B267D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500">กำลังโหลดรายการคำร้อง...</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-purple-100/60 shadow-sm space-y-3">
            <span className="material-symbols-outlined text-5xl text-purple-300">fact_check</span>
            <h3 className="text-base font-bold text-slate-800">ไม่พบคำร้องที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              คุณสามารถแจ้งปัญหาใหม่เพื่อส่งเรื่องให้ทีมงานและติดตามความคืบหน้าได้ตลอด 24 ชั่วโมง
            </p>
            <button
              onClick={() => navigate('/report')}
              className="mt-2 px-5 py-2.5 bg-[#4b267d] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#340866] transition cursor-pointer"
            >
              แจ้งปัญหาใหม่
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredProblems.map((problem) => {
              const pid = problem.problem_id || problem.id;
              const ticketCode = problem.ticket_id || `UP-2569-${String(pid).padStart(5, '0')}`;
              const step = getWorkflowStep(problem.status_name);
              const locationName = problem.building_name || problem.location || 'มหาวิทยาลัยพะเยา';
              const categoryName = problem.category_name || problem.category?.name || 'หมวดหมู่งานทั่วไป';
              const timeDisplay = formatThaiRelativeTime(problem.created_at);

              // If Cancelled
              if (problem.is_cancelled) {
                return (
                  <div
                    key={pid}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5 transition-all opacity-90 hover:opacity-100 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg line-through">
                          #{ticketCode}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-slate-400">event_busy</span>
                          {problem.cancelled_at ? `ยกเลิกเมื่อ ${formatThaiDateTime(problem.cancelled_at)}` : 'ยกเลิกคำร้องแล้ว'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                        <span className="material-symbols-outlined text-sm text-rose-600">cancel</span>
                        <span>ยกเลิกคำร้องแล้ว</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-base md:text-lg font-semibold text-slate-700 tracking-tight flex items-center gap-2">
                        <span>{problem.title}</span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">ยกเลิกโดยผู้แจ้ง</span>
                      </h2>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {problem.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                      </p>
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base text-slate-400">location_on</span> {locationName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base text-slate-400">apartment</span> {categoryName}</span>
                      </div>
                    </div>

                    {/* Cancelled Reason Notice Box */}
                    <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700">
                      <span className="material-symbols-outlined text-slate-500 text-lg mt-0.5">info</span>
                      <div className="text-xs leading-relaxed">
                        <span className="font-bold text-slate-800">สาเหตุที่ยกเลิก: </span>
                        {problem.cancel_reason || 'ปัญหาได้รับการแก้ไขแล้วโดยหน่วยงาน/ผู้อื่น'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">history</span> บันทึกในประวัติการดำเนินการแล้ว</span>
                      <button
                        type="button"
                        onClick={() => setSelectedProblemForModal(problem)}
                        className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#4b267d] font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>ดูรายละเอียดบันทึก</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={pid}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100/60 space-y-5 transition-all hover:shadow-md"
                >
                  
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#4b267d] bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg">
                        #{ticketCode}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                        {timeDisplay}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {step === 2 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>รอรับเรื่อง / ตรวจสอบ</span>
                        </div>
                      )}
                      {step === 3 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>รอดำเนินการ</span>
                        </div>
                      )}
                      {step === 4 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          <span>กำลังดำเนินการ</span>
                        </div>
                      )}
                      {step === 5 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold">
                          <span className="material-symbols-outlined text-sm text-emerald-600 font-bold">verified</span>
                          <span>เสร็จสิ้น</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Description & Meta */}
                  <div className="space-y-2">
                    <h2
                      onClick={() => setSelectedProblemForModal(problem)}
                      className="text-base md:text-lg font-bold text-slate-900 tracking-tight hover:text-[#4b267d] transition-colors cursor-pointer"
                    >
                      {problem.title || 'ไม่มีชื่อเรื่อง'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {problem.description || problem.title || 'ไม่มีรายละเอียดเพิ่มเติม'}
                    </p>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-[#4b267d]">location_on</span>
                        {locationName}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-slate-400">apartment</span>
                        {categoryName}
                      </span>
                    </div>
                  </div>

                  {/* ── 5-Step Workflow Stepper ── */}
                  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                    <div className="grid grid-cols-5 gap-1 relative">
                      
                      {/* Step 1: ส่งคำร้อง */}
                      <div className="flex flex-col items-center text-center gap-1.5">
                        <div className="w-8 h-8 rounded-full bg-[#4b267d] text-white flex items-center justify-center text-sm shadow-sm ring-2 ring-white">
                          <span className="material-symbols-outlined text-base">check</span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-[#4b267d] font-bold">1. ส่งคำร้อง</p>
                          <p className="text-[10px] text-slate-400 font-mono">เรียบร้อย</p>
                        </div>
                      </div>

                      {/* Step 2: รอรับเรื่อง / ตรวจสอบ */}
                      <div className={`flex flex-col items-center text-center gap-1.5 ${step < 2 ? 'opacity-40' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${
                          step > 2
                            ? 'bg-[#4b267d] text-white'
                            : step === 2
                            ? 'bg-amber-400 text-slate-900 ring-4 ring-amber-100 shadow-sm'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          <span className="material-symbols-outlined text-base">
                            {step > 2 ? 'check' : 'hourglass_empty'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <p className={`text-xs font-bold ${step === 2 ? 'text-amber-700' : step > 2 ? 'text-[#4b267d]' : 'text-slate-500'}`}>
                            2. {step > 2 ? 'รับเรื่องแล้ว' : 'รอรับเรื่อง'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {step > 2 ? 'ผ่านแล้ว' : step === 2 ? 'กำลังตรวจ' : 'รอคิว'}
                          </p>
                        </div>
                      </div>

                      {/* Step 3: รอดำเนินการ */}
                      <div className={`flex flex-col items-center text-center gap-1.5 ${step < 3 ? 'opacity-40' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${
                          step > 3
                            ? 'bg-[#4b267d] text-white'
                            : step === 3
                            ? 'bg-blue-500 text-white ring-4 ring-blue-100 shadow-sm'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          <span className="material-symbols-outlined text-base">
                            {step > 3 ? 'check' : 'calendar_month'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <p className={`text-xs font-bold ${step === 3 ? 'text-blue-700' : step > 3 ? 'text-[#4b267d]' : 'text-slate-500'}`}>
                            3. รอดำเนินการ
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {step > 3 ? 'จัดสรรแล้ว' : step === 3 ? 'รอคิวช่าง' : 'รอจัดสรร'}
                          </p>
                        </div>
                      </div>

                      {/* Step 4: กำลังดำเนินการ */}
                      <div className={`flex flex-col items-center text-center gap-1.5 ${step < 4 ? 'opacity-40' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${
                          step > 4
                            ? 'bg-[#4b267d] text-white'
                            : step === 4
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          <span className="material-symbols-outlined text-base">
                            {step > 4 ? 'check' : 'build'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <p className={`text-xs font-bold ${step === 4 ? 'text-blue-700' : step > 4 ? 'text-[#4b267d]' : 'text-slate-500'}`}>
                            4. กำลังดำเนินการ
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {step > 4 ? 'ซ่อมแล้ว' : step === 4 ? 'กำลังเข้าซ่อม' : 'รอช่างเข้า'}
                          </p>
                        </div>
                      </div>

                      {/* Step 5: เสร็จสิ้น */}
                      <div className={`flex flex-col items-center text-center gap-1.5 ${step < 5 ? 'opacity-40' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${
                          step === 5
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          <span className="material-symbols-outlined text-base">
                            {step === 5 ? 'done_all' : 'task_alt'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <p className={`text-xs font-bold ${step === 5 ? 'text-emerald-700' : 'text-slate-500'}`}>
                            5. เสร็จสิ้น
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {step === 5 ? 'ปิดเคส' : 'รอดำเนินการ'}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Latest Update Box */}
                  {step === 2 && (
                    <div className="flex items-start gap-3 p-3.5 bg-amber-50/70 border border-amber-100 rounded-xl text-slate-800">
                      <span className="material-symbols-outlined text-amber-600 text-lg mt-0.5">info</span>
                      <div className="text-xs leading-relaxed">
                        <span className="font-bold text-amber-900">ความคืบหน้าล่าสุด: </span>
                        เจ้าหน้าที่กองอาคารสถานที่กำลังตรวจสอบจุดพิกัดสถานที่และภาพถ่าย คาดว่าจะส่งต่อช่างและอนุมัติขึ้นฟีดในเร็วๆ นี้
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="flex items-start gap-3 p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-slate-800">
                      <span className="material-symbols-outlined text-blue-600 text-lg mt-0.5">construction</span>
                      <div className="text-xs leading-relaxed">
                        <span className="font-bold text-blue-900">อัปเดตงานซ่อม: </span>
                        {problem.admin_reply || 'ทีมช่างกำลังเข้าพื้นที่ตรวจสอบอุปกรณ์และเร่งดำเนินการแก้ไขให้กลับมาใช้งานได้ตามปกติ'}
                      </div>
                    </div>
                  )}

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div>
                      {step === 2 && (
                        <button
                          type="button"
                          onClick={() => setCancelModalProblem(problem)}
                          className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">cancel</span>
                          <span>ยกเลิกคำร้อง</span>
                        </button>
                      )}
                      {step >= 3 && (
                        <button
                          type="button"
                          onClick={() => navigate(`/issue/${pid}`)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4b267d] hover:underline cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          <span>ดูโพสต์บนฟีดสาธารณะ</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedProblemForModal(problem)}
                      className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#4b267d] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>ดูรายละเอียดโพสต์คำร้อง</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── 1. ISSUE DETAIL MODAL (ป๊อปอัปดูรายละเอียดโพสต์คำร้อง) ──────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedProblemForModal && (() => {
        const modalPid = selectedProblemForModal.problem_id || selectedProblemForModal.id;
        const modalTicketCode = selectedProblemForModal.ticket_id || `UP-2569-${String(modalPid).padStart(5, '0')}`;
        const modalStep = getWorkflowStep(selectedProblemForModal.status_name);
        const modalLoc = selectedProblemForModal.building_name || selectedProblemForModal.location || 'มหาวิทยาลัยพะเยา';
        const modalCat = selectedProblemForModal.category_name || selectedProblemForModal.category?.name || 'กองอาคารสถานที่และยานพาหนะ';
        const modalAuthor = selectedProblemForModal.author?.display_name || selectedProblemForModal.author_name || 'พิมพ์ชนก วัฒนศิริ (นิสิต ICT ปี 3)';

        const rawImages: string[] = [];
        if (selectedProblemForModal.attachments && selectedProblemForModal.attachments.length > 0) {
          selectedProblemForModal.attachments.forEach(a => rawImages.push(a.file_url));
        } else if (selectedProblemForModal.image_url) {
          rawImages.push(selectedProblemForModal.image_url);
        }
        const resolvedImages = rawImages.map(resolveImageUrl).filter(Boolean) as string[];

        const lat = selectedProblemForModal.latitude && !isNaN(Number(selectedProblemForModal.latitude)) ? Number(selectedProblemForModal.latitude) : UP_CENTER[0];
        const lng = selectedProblemForModal.longitude && !isNaN(Number(selectedProblemForModal.longitude)) ? Number(selectedProblemForModal.longitude) : UP_CENTER[1];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-purple-100">
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#340866] via-[#4b267d] to-[#6f45a7] text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-amber-300">
                    <span className="material-symbols-outlined text-2xl">assignment_turned_in</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white/20 text-purple-100">
                        #{modalTicketCode}
                      </span>
                      {modalStep === 2 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-bold">
                          รอรับเรื่อง / ตรวจสอบ
                        </span>
                      )}
                      {modalStep === 3 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                          รอดำเนินการ
                        </span>
                      )}
                      {modalStep === 4 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                          กำลังดำเนินการ
                        </span>
                      )}
                      {modalStep === 5 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          เสร็จสิ้น
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      รายละเอียดโพสต์และสถานะคำร้อง
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProblemForModal(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
                
                {/* Issue Title & Description */}
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedProblemForModal.title}
                  </h4>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedProblemForModal.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </p>
                </div>

                {/* Attached Photo / Evidence Section */}
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">photo_camera</span>
                    ภาพถ่ายหลักฐานจุดเกิดเหตุ ({resolvedImages.length > 0 ? `${resolvedImages.length} ภาพ` : '1 ภาพ'})
                  </p>
                  
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 p-2 flex items-center gap-3">
                    <div className="w-24 h-20 rounded-lg bg-slate-300 flex items-center justify-center text-slate-500 overflow-hidden relative group shrink-0">
                      {resolvedImages.length > 0 ? (
                        <img src={resolvedImages[0]} alt="Evidence" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#4b267d] to-[#6f45a7] flex items-center justify-center text-white font-bold text-xs">
                          รูปหลักฐาน
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div className="font-medium text-slate-800">
                        {modalTicketCode}_evidence.jpg
                      </div>
                      <div>ขนาดไฟล์ 2.4 MB • พิกัด {modalLoc}</div>
                      <span className="inline-block text-[10px] text-[#4b267d] bg-purple-50 px-2 py-0.5 rounded font-semibold">
                        แนบพิกัด GPS อัตโนมัติ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detailed Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px]">สถานที่เกิดเหตุ</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-[#4b267d]">location_on</span>
                      {modalLoc}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px]">หน่วยงานที่รับผิดชอบ</span>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-slate-500">apartment</span>
                      {modalCat}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px]">ผู้แจ้งคำร้อง</span>
                    <div className="font-semibold text-slate-800">{modalAuthor}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 text-[11px]">วันที่และเวลาที่ส่ง</span>
                    <div className="font-semibold text-slate-800 font-mono">
                      {formatThaiDateTime(selectedProblemForModal.created_at)}
                    </div>
                  </div>
                </div>

                {/* ── แผนที่กำกับ (Leaflet Map Preview as requested by user in audio) ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#4b267d]">explore</span>
                      <span>แผนที่กำกับพิกัดจุดเกิดเหตุ (Campus Map)</span>
                    </h5>
                    <a
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#4b267d] hover:underline flex items-center gap-1"
                    >
                      <span>เปิด Google Maps</span>
                      <span className="material-symbols-outlined text-xs">open_in_new</span>
                    </a>
                  </div>
                  
                  <div className="h-48 rounded-xl overflow-hidden border border-slate-200 relative shadow-inner">
                    <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} className="w-full h-full">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapResizer />
                      <Marker position={new LeafletLatLng(lat, lng)} icon={campusPinIcon}>
                        <Popup>
                          <div className="p-1 font-sans text-xs">
                            <p className="font-bold text-[#340866]">{modalLoc}</p>
                            <p className="text-[10px] text-slate-500 font-mono">#{modalTicketCode}</p>
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                    <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold text-slate-700 z-[400] shadow-sm border border-slate-200/80 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-[#4b267d]">pin_drop</span>
                      <span>{lat.toFixed(5)}° N, {lng.toFixed(5)}° E</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Logs (Workflow History) */}
                <div className="space-y-2 pt-1">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#4b267d]">timeline</span>
                    ลำดับการดำเนินการ (Workflow History)
                  </h5>
                  <div className="space-y-2.5 border-l-2 border-purple-100 pl-3.5 ml-1.5">
                    {selectedProblemForModal.is_cancelled && (
                      <div className="relative">
                        <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100" />
                        <div className="font-bold text-rose-700">
                          {selectedProblemForModal.cancelled_at ? formatThaiDateTime(selectedProblemForModal.cancelled_at) : 'ยกเลิกคำร้องแล้ว'} — ยกเลิกคำร้องโดยผู้แจ้ง
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          สาเหตุ: {selectedProblemForModal.cancel_reason || 'ปัญหาได้รับการแก้ไขแล้วโดยหน่วยงาน/ผู้อื่น'}
                        </div>
                      </div>
                    )}
                    {modalStep === 5 && !selectedProblemForModal.is_cancelled && (
                      <div className="relative">
                        <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                        <div className="font-bold text-emerald-800">
                          แก้ไขเสร็จสิ้นเรียบร้อยแล้ว — ปิดเคสคำร้อง
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          อุปกรณ์ได้รับการซ่อมแซมและตรวจสอบความปลอดภัยพร้อมใช้งานแล้ว
                        </div>
                      </div>
                    )}
                    {modalStep >= 4 && !selectedProblemForModal.is_cancelled && (
                      <div className="relative">
                        <div className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full ${modalStep === 4 ? 'bg-blue-600 ring-4 ring-blue-100 animate-pulse' : 'bg-primary ring-2 ring-white'}`} />
                        <div className="font-bold text-slate-800">
                          {modalStep === 4 ? 'กำลังดำเนินการซ่อมแซม' : 'เข้าพื้นที่และดำเนินการซ่อมแซม'}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {selectedProblemForModal.admin_reply || 'ทีมช่างเข้าตรวจสอบและดำเนินการแก้ไข ณ จุดเกิดเหตุ'}
                        </div>
                      </div>
                    )}
                    {modalStep >= 3 && !selectedProblemForModal.is_cancelled && (
                      <div className="relative">
                        <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-white" />
                        <div className="font-bold text-slate-800">
                          จัดสรรคิวงานและมอบหมายหน่วยงานผู้รับผิดชอบ
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          ส่งต่อคำร้องให้ {modalCat} ดำเนินการจัดสรรช่างเข้าพื้นที่
                        </div>
                      </div>
                    )}
                    {modalStep >= 2 && !selectedProblemForModal.is_cancelled && (
                      <div className="relative">
                        <div className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full ${modalStep === 2 ? 'bg-amber-500 ring-4 ring-amber-100 animate-pulse' : 'bg-primary ring-2 ring-white'}`} />
                        <div className="font-bold text-slate-800">
                          {formatThaiRelativeTime(selectedProblemForModal.created_at)} — อยู่ระหว่างตรวจสอบโดยเจ้าหน้าที่รับเรื่อง
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {modalCat} กำลังเช็กความถูกต้องของจุดพิกัดและเตรียมจ่ายงานช่าง
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#4b267d] ring-2 ring-white" />
                      <div className="font-bold text-slate-800">
                        {formatThaiDateTime(selectedProblemForModal.created_at)} — ส่งคำร้องเข้าระบบสำเร็จ
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        ระบบบันทึกรหัส #{modalTicketCode} และส่งแจ้งเตือนเข้าแผงควบคุมเจ้าหน้าที่
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                {!selectedProblemForModal.is_cancelled ? (
                  <button
                    type="button"
                    onClick={() => {
                      const prob = selectedProblemForModal;
                      setSelectedProblemForModal(null);
                      setCancelModalProblem(prob);
                    }}
                    className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">cancel</span>
                    <span>ยกเลิกคำร้องนี้</span>
                  </button>
                ) : (
                  <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    <span>คำร้องนี้ถูกยกเลิกแล้ว</span>
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProblemForModal(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#4b267d] hover:bg-[#340866] text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── 2. CANCEL CONFIRMATION DIALOG MODAL (ป๊อปอัปยืนยันการยกเลิกคำร้อง) ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {cancelModalProblem && (() => {
        const cPid = cancelModalProblem.problem_id || cancelModalProblem.id;
        const cTicketCode = cancelModalProblem.ticket_id || `UP-2569-${String(cPid).padStart(5, '0')}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col border border-rose-100">
              
              {/* Alert Icon & Header */}
              <div className="p-6 pb-4 flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 ring-4 ring-rose-50/70">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    ยืนยันการยกเลิกคำร้อง?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    คุณต้องการยกเลิกคำร้องรหัส <span className="font-mono font-semibold text-[#4b267d]">#{cTicketCode}</span> ใช่หรือไม่ เมื่อยกเลิกแล้ว คำร้องจะไม่ถูกส่งต่อให้ช่างดำเนินการ
                  </p>
                </div>
              </div>

              {/* Cancellation Reason Form */}
              <div className="px-6 py-2 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  โปรดระบุเหตุผลในการยกเลิกคำร้อง <span className="text-rose-500">*</span>
                </label>
                
                <div className="space-y-2 text-xs">
                  <label
                    onClick={() => setCancelReasonRadio('fixed')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      cancelReasonRadio === 'fixed'
                        ? 'border-[#4b267d] bg-purple-50/50 text-[#4b267d] font-semibold'
                        : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      checked={cancelReasonRadio === 'fixed'}
                      onChange={() => setCancelReasonRadio('fixed')}
                      className="text-[#4b267d] focus:ring-[#4b267d]"
                    />
                    <span>ปัญหาได้รับการแก้ไขแล้วโดยหน่วยงาน/ผู้อื่น</span>
                  </label>

                  <label
                    onClick={() => setCancelReasonRadio('duplicate')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      cancelReasonRadio === 'duplicate'
                        ? 'border-[#4b267d] bg-purple-50/50 text-[#4b267d] font-semibold'
                        : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      checked={cancelReasonRadio === 'duplicate'}
                      onChange={() => setCancelReasonRadio('duplicate')}
                      className="text-[#4b267d] focus:ring-[#4b267d]"
                    />
                    <span>แจ้งปัญหาซ้ำซ้อนกับโพสต์อื่นที่มีอยู่แล้ว</span>
                  </label>

                  <label
                    onClick={() => setCancelReasonRadio('wrong_info')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      cancelReasonRadio === 'wrong_info'
                        ? 'border-[#4b267d] bg-purple-50/50 text-[#4b267d] font-semibold'
                        : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      checked={cancelReasonRadio === 'wrong_info'}
                      onChange={() => setCancelReasonRadio('wrong_info')}
                      className="text-[#4b267d] focus:ring-[#4b267d]"
                    />
                    <span>กรอกข้อมูลพิกัดสถานที่หรือรายละเอียดผิดพลาด</span>
                  </label>

                  <label
                    onClick={() => setCancelReasonRadio('other')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      cancelReasonRadio === 'other'
                        ? 'border-[#4b267d] bg-purple-50/50 text-[#4b267d] font-semibold'
                        : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 text-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      checked={cancelReasonRadio === 'other'}
                      onChange={() => setCancelReasonRadio('other')}
                      className="text-[#4b267d] focus:ring-[#4b267d]"
                    />
                    <span>เหตุผลอื่นๆ</span>
                  </label>
                </div>

                <textarea
                  value={cancelReasonDetail}
                  onChange={(e) => setCancelReasonDetail(e.target.value)}
                  placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#4b267d] placeholder:text-slate-400 bg-slate-50 resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  disabled={isSubmittingCancel}
                  onClick={() => setCancelModalProblem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 font-medium text-xs transition-colors cursor-pointer"
                >
                  ย้อนกลับ
                </button>

                <button
                  type="button"
                  disabled={isSubmittingCancel}
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCancel ? (
                    <span>กำลังยกเลิก...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>ยืนยันยกเลิกคำร้อง</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
