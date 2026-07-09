import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const thaiMonths = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

function formatDateTime(raw: string | Date | undefined): string {
  if (!raw) return 'ไม่ระบุเวลา';
  try {
    let dateObj: Date;
    if (typeof raw === 'string') {
      const dateStr = raw.endsWith('Z') ? raw : `${raw}Z`;
      dateObj = new Date(dateStr);
    } else {
      dateObj = raw;
    }
    if (isNaN(dateObj.getTime())) return 'ไม่ระบุเวลา';
    const day = dateObj.getDate();
    const month = thaiMonths[dateObj.getMonth()];
    const year = dateObj.getFullYear() + 543; // CE → BE
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const mm = String(dateObj.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} เวลา ${hh}:${mm} น.`;
  } catch {
    return 'ไม่ระบุเวลา';
  }
}

function resolveImageUrl(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  if (raw.startsWith('http')) return raw;
  const cleaned = raw.replace(/^\/+/, '').replace('uploads/', 'uploads/images/').replace('images/images/', 'images/');
  return `${API_BASE.replace('/api/v1', '')}/${cleaned}`;
}

function getStatusColor(statusName: string): string {
  switch (statusName.toUpperCase()) {
    case 'OPEN':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'IN_PROGRESS':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'RESOLVED':
    case 'CLOSED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getStatusText(statusName: string): string {
  switch (statusName.toUpperCase()) {
    case 'OPEN':
      return 'รอรับเรื่อง';
    case 'IN_PROGRESS':
      return 'กำลังดำเนินการ';
    case 'RESOLVED':
      return 'แก้ไขเรียบร้อย';
    case 'CLOSED':
      return 'ปิดงานแล้ว';
    default:
      return 'ไม่ระบุ';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);

  const token = localStorage.getItem('access_token');

  useEffect(() => {
    let cancelled = false;

    async function fetchMyProblems() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const res = await axios.get(`${API_BASE}/problems/my-problems`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) {
          const data = res.data?.data?.items || res.data?.items || res.data || [];
          setReports(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch tracking data:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchMyProblems();

    return () => { cancelled = true; };
  }, [token]);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const status = (report.status_name || '').toUpperCase();
      if (selectedFilterIndex === 1) return status === 'OPEN';
      if (selectedFilterIndex === 2) return status === 'IN_PROGRESS';
      if (selectedFilterIndex === 3) return status === 'RESOLVED' || status === 'CLOSED';
      return true;
    });
  }, [reports, selectedFilterIndex]);



  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-100">
        <div className="px-4 h-[60px] flex items-center justify-center relative">
          <h1 className="text-[17px] font-bold text-slate-800 flex items-center gap-2">
            <span>🔔</span> ติดตามสถานะปัญหา
          </h1>
        </div>
        
        {/* Filters */}
        <div className="flex overflow-x-auto hide-scrollbar px-4 py-3 gap-2 bg-white">
          <FilterChip 
            label="ทั้งหมด" 
            isActive={selectedFilterIndex === 0} 
            onClick={() => setSelectedFilterIndex(0)} 
          />
          <FilterChip 
            label="รอรับเรื่อง" 
            isActive={selectedFilterIndex === 1} 
            colorClass="amber"
            onClick={() => setSelectedFilterIndex(1)} 
          />
          <FilterChip 
            label="กำลังดำเนินการ" 
            isActive={selectedFilterIndex === 2} 
            colorClass="sky"
            onClick={() => setSelectedFilterIndex(2)} 
          />
          <FilterChip 
            label="แก้ไขเรียบร้อย" 
            isActive={selectedFilterIndex === 3} 
            colorClass="emerald"
            onClick={() => setSelectedFilterIndex(3)} 
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium">กำลังโหลด...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-4xl">📭</span>
            </div>
            <h2 className="text-lg font-bold text-slate-700">ไม่มีข้อมูล</h2>
            <p className="text-sm text-slate-500">ไม่พบประวัติการแจ้งปัญหาในหมวดหมู่นี้</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredReports.map(report => (
              <TrackingCard key={report.problem_id || report.id} report={report} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FilterChip({ 
  label, 
  isActive, 
  onClick, 
  colorClass 
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
  colorClass?: string;
}) {
  let activeStyles = 'bg-[#2B164D] text-white border-[#2B164D] shadow-md shadow-[#2B164D]/20';
  
  if (isActive && colorClass === 'amber') activeStyles = 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20';
  if (isActive && colorClass === 'sky') activeStyles = 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20';
  if (isActive && colorClass === 'emerald') activeStyles = 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20';

  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-bold border transition-all duration-200 ${
        isActive 
          ? activeStyles 
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function TrackingCard({ report }: { report: any }) {
  const statusName = report.status_name || '';
  const badgeClasses = getStatusColor(statusName);
  const statusText = getStatusText(statusName);
  
  const categoryName = report.category_name || (report.category?.name ?? 'ทั่วไป');
  const imageUrl = resolveImageUrl(report.image_url);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header row: Status and Date */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${badgeClasses}`}>
            {statusText}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {formatDateTime(report.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-800 mb-1.5 leading-snug">
          {report.title || 'ไม่มีหัวข้อ'}
        </h3>
        
        {/* Description snippet */}
        {report.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
            {report.description}
          </p>
        )}

        {/* Image thumbnail (if any) */}
        {imageUrl && !imgError && (
          <div className="mt-2 mb-3 rounded-lg overflow-hidden border border-slate-100 h-32">
            <img 
              src={imageUrl} 
              alt="report" 
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        )}

        <hr className="border-slate-100 my-3" />

        {/* Footer info */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
              📁
            </span>
            {categoryName}
          </span>
          {report.building_name && (
            <span className="text-[11px] text-slate-500 max-w-[150px] truncate flex items-center gap-1">
              📍 {report.building_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
