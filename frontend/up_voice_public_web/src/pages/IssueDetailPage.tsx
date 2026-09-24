/**
 * IssueDetailPage.tsx
 *
 * Detailed View for a Problem/Ticket in UP Connect
 * Matching the University of Phayao Portal Design:
 *  - Subheader Breadcrumb & Back Navigation
 *  - Primary Issue Card with Category Header, Reporter Badge, Description & Photo Gallery
 *  - Resolution Timeline with 4 Milestone Steps (SLA progress)
 *  - Location Pinpoint Card with Interactive Leaflet Map & Coordinate Overlay
 *  - Image Lightbox Modal for zooming evidence photos
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import type { Problem } from './HomeFeed';

// ─── Leaflet Marker Setup ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const UP_CENTER: [number, number] = [19.0289, 99.8973];

// ─── Helper Functions ─────────────────────────────────────────────────────────
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
    return `${day} ${month} ${year}, ${hh}:${mm} น.`;
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
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'เมื่อสักครู่';
    if (diffMin < 60) return `เมื่อ ${diffMin} นาทีที่แล้ว`;
    if (diffHour < 24) return `เมื่อ ${diffHour} ชั่วโมงที่แล้ว`;
    if (diffDay === 1) return 'เมื่อวานนี้';
    if (diffDay < 7) return `เมื่อ ${diffDay} วันที่แล้ว`;

    return formatThaiDateTime(rawDate);
  } catch {
    return '';
  }
}

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const passedProblem = location.state?.problem as Problem | undefined;
  const [problem, setProblem] = useState<Problem | null>(passedProblem || null);
  const [isLoading, setIsLoading] = useState(!passedProblem);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!problem && id) {
      const fetchProblem = async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('access_token');
          const res = await axios.get(`${API_BASE}/problems/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.data.success) {
            setProblem(res.data.data.problem || res.data.data);
          } else {
            setError(res.data.message || 'ไม่พบปัญหา');
          }
        } catch {
          setError('เกิดข้อผิดพลาดในการโหลดข้อมูลคำร้อง');
        } finally {
          setIsLoading(false);
        }
      };
      fetchProblem();
    }
  }, [id, problem]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <span className="w-10 h-10 border-4 border-[#4B267D] border-t-transparent rounded-full animate-spin"></span>
        <p className="text-sm font-semibold text-slate-500">กำลังโหลดรายละเอียดคำร้อง...</p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center gap-3">
        <span className="material-symbols-outlined text-5xl text-rose-500">error</span>
        <h2 className="text-xl font-bold text-slate-800">{error || 'ไม่พบข้อมูลคำร้อง'}</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-5 py-2.5 bg-[#4B267D] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#340866] transition"
        >
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  // ─── Extract Images ─────────────────────────────────────────────────────────
  let rawImages: string[] = [];
  if ((problem as any).images) rawImages = (problem as any).images;
  else if ((problem as any).imageUrls) rawImages = (problem as any).imageUrls;
  else if (problem.attachments && problem.attachments.length > 0) {
    rawImages = problem.attachments.map(a => a.file_url);
  } else {
    const single = problem.image_url || problem.image || problem.photo;
    if (single) rawImages = [single];
  }
  const images = rawImages.map(url => resolveImageUrl(url)).filter(Boolean) as string[];

  // ─── Metadata ───────────────────────────────────────────────────────────────
  const pid = problem.problem_id || problem.id;
  const ticketCode = problem.ticket_id || `UP-68-${String(pid).padStart(4, '0')}`;
  const locationName = problem.building_name || problem.building?.name || problem.location || 'มหาวิทยาลัยพะเยา';
  const categoryName = problem.category_name || problem.category?.name || 'หมวดหมู่ทั่วไป';

  const authorRole = problem.author?.role || '';
  const authorName = problem.author?.display_name || problem.author_name || 'ผู้แจ้งทั่วไป';
  const isStudent = authorRole === 'student' || authorName.includes('นิสิต');
  const isStaff = authorRole === 'staff' || authorName.includes('บุคลากร');
  const isAnon = authorRole === 'anonymous' || authorName.includes('ไม่ประสงค์') || authorName.includes('ไม่ระบุ');

  const avatarInitials = isStudent ? 'นส' : isStaff ? 'บค' : isAnon ? 'ผจ' : 'พช';

  // ─── Status Step Computation ────────────────────────────────────────────────
  const statusUpper = (problem.status_name || 'OPEN').toUpperCase();
  const isInProgress = statusUpper === 'IN_PROGRESS' || statusUpper === 'INVESTIGATING';
  const isResolved = statusUpper === 'RESOLVED' || statusUpper === 'CLOSED';
  const isPending = !isInProgress && !isResolved;

  // Map coordinates
  const lat = problem.latitude && !isNaN(Number(problem.latitude)) ? Number(problem.latitude) : UP_CENTER[0];
  const lng = problem.longitude && !isNaN(Number(problem.longitude)) ? Number(problem.longitude) : UP_CENTER[1];
  const mapCenter: [number, number] = [lat, lng];
  const hasCoordinates = !!(problem.latitude && problem.longitude);

  return (
    <div className="w-full flex flex-col bg-[#faf8ff] text-[#1f162b] pb-16">
      
      {/* ── Subheader Breadcrumb & Back Navigation ── */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Back button & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4B267D] bg-[#f5f0fa] hover:bg-[#ece2f5] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              ย้อนกลับหน้าหลัก
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span>/</span>
              <button onClick={() => navigate('/')} className="hover:text-[#4B267D] transition-colors">
                หน้าหลัก
              </button>
              <span className="text-slate-300">/</span>
              <span className="hover:text-[#4B267D] transition-colors truncate max-w-[200px]">
                {locationName}
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-[#4B267D] font-bold">#{ticketCode}</span>
            </div>
          </div>

          {/* Status Badge & Timestamp */}
          <div className="flex items-center gap-3">
            {isInProgress && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                กำลังดำเนินการ
              </span>
            )}
            {isResolved && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 font-bold">check_circle</span>
                แก้ไขเสร็จสิ้น
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                รับเรื่องแล้ว / รอดำเนินการ
              </span>
            )}

            <span className="text-xs text-slate-400 font-mono hidden md:inline-block">
              {formatThaiRelativeTime(problem.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Container (Grid: Left 8 Cols, Right 4 Cols) ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ════════ LEFT COLUMN (8 Cols): Issue Card & Resolution Timeline ════════ */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* ── Primary Issue Card ── */}
            <article className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
              
              {/* Category & Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-[#f5f0fa] text-[#4B267D] flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[22px]">lightbulb_circle</span>
                  </span>
                  <div>
                    <span className="text-xs font-extrabold text-[#4B267D] uppercase tracking-wide">
                      {categoryName}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-slate-400">location_on</span>
                        {locationName}
                      </span>
                      <span>•</span>
                      <span>{formatThaiDateTime(problem.created_at)}</span>
                    </div>
                  </div>
                </div>

                <span className="font-mono text-xs text-slate-400 font-semibold">
                  #{ticketCode}
                </span>
              </div>

              {/* Reporter Identity Box */}
              <div className="mb-6 p-4 rounded-xl bg-[#f5f0fa]/60 border border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4B267D] to-[#340866] text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                    {avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{authorName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-[#4B267D]">location_city</span>
                        {locationName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              {problem.title && (
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 leading-snug">
                  {problem.title}
                </h2>
              )}

              <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-6 font-normal whitespace-pre-wrap">
                {problem.description || problem.title || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </p>

              {/* Evidence Photo Gallery */}
              {images.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[#4B267D]">photo_library</span>
                      ภาพถ่ายจุดเกิดเหตุและหลักฐาน ({images.length} รูป)
                    </span>
                    <span className="text-xs text-slate-400">คลิกที่รูปเพื่อขยาย</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(imgUrl)}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/10] cursor-pointer"
                      >
                        <img
                          src={imgUrl}
                          alt={`ภาพหลักฐาน ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
                          <span className="font-medium truncate">ภาพจุดเกิดเหตุ ({idx + 1})</span>
                          <span className="p-1 rounded-md bg-black/40 backdrop-blur-sm group-hover:bg-white group-hover:text-black transition-colors">
                            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* ── RESOLUTION TIMELINE (4 Milestone Steps) ── */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4B267D] text-2xl">timeline</span>
                    ไทม์ไลน์ความคืบหน้าการแก้ปัญหา
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    การปฏิบัติงานจริงและตรวจสอบย้อนกลับได้ตามมาตรฐาน Service Level Agreement (SLA)
                  </p>
                </div>
              </div>

              {/* Timeline Container */}
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 sm:before:left-6 before:w-0.5 before:bg-slate-200 before:top-4 before:bottom-6">
                
                {/* Step 1: ส่งคำร้อง / รออนุมัติ (Completed) */}
                <div className="relative flex items-start gap-4 sm:gap-5">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-white z-10">
                    <span className="material-symbols-outlined text-[20px] font-bold">check</span>
                  </div>
                  <div className="flex-1 bg-[#f5f0fa]/60 rounded-xl p-4 sm:p-5 border border-slate-200/70">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">1. ส่งคำร้อง / รออนุมัติ</h3>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold tracking-wide">
                          เสร็จสิ้น
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {formatThaiDateTime(problem.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      ระบบได้รับเรื่องร้องเรียนของคุณและบันทึกเข้าระบบเรียบร้อยแล้ว
                    </p>
                  </div>
                </div>

                {/* Step 2: รับเรื่องและอนุมัติคำร้อง */}
                <div className="relative flex items-start gap-4 sm:gap-5">
                  <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full ${isInProgress || isResolved ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'} flex items-center justify-center shrink-0 shadow-sm ring-4 ring-white z-10`}>
                    <span className="material-symbols-outlined text-[20px] font-bold">
                      {isInProgress || isResolved ? 'check' : 'hourglass_empty'}
                    </span>
                  </div>
                  <div className="flex-1 bg-[#f5f0fa]/60 rounded-xl p-4 sm:p-5 border border-slate-200/70">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">2. รับเรื่องและอนุมัติคำร้อง</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide border ${
                          isInProgress || isResolved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isInProgress || isResolved ? 'อนุมัติแล้ว' : 'รอดำเนินการ'}
                        </span>
                      </div>
                      {(isInProgress || isResolved) && (
                        <span className="text-xs font-mono text-slate-400">
                          {formatThaiDateTime(problem.updated_at || problem.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      เจ้าหน้าที่ตรวจสอบข้อมูลและมอบหมายงานให้ทีมช่างหรือหน่วยงานผู้รับผิดชอบ
                    </p>
                  </div>
                </div>

                {/* Step 3: กำลังดำเนินการ (ลงพื้นที่ซ่อมแซม) */}
                <div className="relative flex items-start gap-4 sm:gap-5">
                  <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full ${
                    isResolved
                      ? 'bg-emerald-500 text-white ring-white'
                      : isInProgress
                      ? 'bg-[#4B267D] text-white ring-purple-100 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-300 ring-white'
                  } flex items-center justify-center shrink-0 shadow-md ring-4 z-10`}>
                    <span className="material-symbols-outlined text-[22px]">
                      {isResolved ? 'check' : 'engineering'}
                    </span>
                  </div>
                  <div className={`flex-1 rounded-xl p-4 sm:p-5 border ${
                    isInProgress
                      ? 'bg-[#f5f0fa] border-[#4B267D]/40 shadow-sm'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm sm:text-base font-bold ${isInProgress ? 'text-[#4B267D]' : 'text-slate-800'}`}>
                          3. กำลังดำเนินการ
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isInProgress
                            ? 'bg-amber-400 text-amber-950'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isResolved ? 'เสร็จสิ้น' : isInProgress ? 'กำลังดำเนินการ' : 'รอขั้นตอนก่อนหน้า'}
                        </span>
                      </div>
                      {isInProgress && (
                        <span className="text-xs font-mono font-medium text-[#4B267D]">
                          {formatThaiDateTime(problem.updated_at || problem.created_at)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 p-3 rounded-lg bg-white border border-purple-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#4B267D] text-white flex items-center justify-center font-bold text-xs">
                          ม
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block leading-tight">
                            หน่วยงานรับผิดชอบ : <span className="font-normal text-slate-500 text-[11px]">{categoryName}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4: แก้ไขเสร็จสิ้นและตรวจรับ */}
                <div className={`relative flex items-start gap-4 sm:gap-5 ${!isResolved ? 'opacity-70' : ''}`}>
                  <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full ${
                    isResolved
                      ? 'bg-emerald-500 text-white ring-4 ring-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-300 ring-4 ring-white'
                  } flex items-center justify-center shrink-0 z-10`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {isResolved ? 'check' : 'verified'}
                    </span>
                  </div>
                  <div className="flex-1 bg-white rounded-xl p-4 sm:p-5 border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-slate-700">4. แก้ไขเสร็จสิ้นและตรวจรับ</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide border ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {isResolved ? 'แก้ไขเสร็จสิ้น' : 'รอขั้นตอนก่อนหน้า'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      ทีมงานเสร็จสิ้นภารกิจและทำการตรวจสอบความเรียบร้อย
                    </p>
                  </div>
                </div>

              </div>
            </section>

          </div>

          {/* ════════ RIGHT COLUMN (4 Cols): Location Pinpoint Card ════════ */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Location Pinpoint Card */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4B267D] text-[20px]">explore</span>
                  ตำแหน่งเกิดเหตุ
                </h3>
              </div>

              {/* Map Preview Container */}
              <div className="rounded-xl overflow-hidden border border-slate-200 relative group aspect-[4/3] bg-slate-100">
                {hasCoordinates ? (
                  <MapContainer
                    center={mapCenter}
                    zoom={16}
                    scrollWheelZoom={false}
                    className="w-full h-full z-0"
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={mapCenter} />
                    <MapCenterController center={mapCenter} />
                  </MapContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
                    <span className="material-symbols-outlined text-4xl mb-1 text-slate-300">map</span>
                    <p className="text-xs font-medium">ไม่พบข้อมูลพิกัดละติจูด/ลองจิจูด</p>
                  </div>
                )}

                {/* Pin Badge Overlay */}
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm p-2.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2.5 z-10">
                  <span className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">pin_drop</span>
                  </span>
                  <div className="text-xs min-w-0">
                    <strong className="block text-slate-900 leading-tight truncate">{locationName}</strong>
                    <span className="text-[10px] font-mono text-slate-500">
                      {hasCoordinates ? `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E` : 'พิกัดมหาวิทยาลัยพะเยา'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-600 leading-normal">
                <span className="font-semibold text-slate-800">สถานที่ : </span>
                {locationName}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (hasCoordinates) {
                    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                  } else {
                    showToast('เปิดพิกัดมหาวิทยาลัยพะเยา');
                  }
                }}
                className="mt-3.5 w-full py-2.5 rounded-xl bg-[#f5f0fa] hover:bg-[#ece2f5] text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-[#4B267D]">map</span>
                เปิดดูบนแผนที่มหาลัย (Campus Map)
              </button>
            </section>

          </aside>

        </div>
      </main>

      {/* ── Image Lightbox Modal ── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <img
              src={selectedImage}
              alt="ภาพขยาย"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* ── Interactive Toast Notification ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-800 text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[12px] font-bold">
              ✓
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

    </div>
  );
}
