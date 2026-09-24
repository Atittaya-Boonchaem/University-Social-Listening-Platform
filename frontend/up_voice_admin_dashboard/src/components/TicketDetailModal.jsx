// src/components/TicketDetailModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAnonymousAuthor } from '../utils/authorUtils';

// Phayao University Default Coordinates & Phayao Province Bounds
const PHAYAO_CENTER = [19.0286, 99.8946];
const PHAYAO_BOUNDS = [
  [18.9000, 99.7500], // Southwest
  [19.2000, 100.1000], // Northeast
];

// Helper to resolve coordinates based on ticket data or UP buildings
const getTicketCoordinates = (ticket) => {
  let lat = parseFloat(ticket?.latitude);
  let lng = parseFloat(ticket?.longitude);

  if (!isNaN(lat) && !isNaN(lng) && lat > 18.0 && lat < 20.5 && lng > 98.5 && lng < 101.5) {
    return [lat, lng];
  }

  const name = `${ticket?.building_name || ''} ${ticket?.location || ''} ${ticket?.location_label || ''}`.toLowerCase();
  if (name.includes('ict') || name.includes('สารสนเทศ')) return [19.0298, 99.8961];
  if (name.includes('pky') || name.includes('เรียนรวม')) return [19.0286, 99.8946];
  if (name.includes('หอ') || name.includes('dorm')) return [19.0335, 99.8932];
  if (name.includes('canteen') || name.includes('อาหาร')) return [19.0275, 99.8980];
  if (name.includes('ประตู') || name.includes('พหลโยธิน')) return [19.0284, 99.8972];
  if (name.includes('en') || name.includes('วิศว')) return [19.0270, 99.8940];
  if (name.includes('การแพทย์') || name.includes('โรงพยาบาล')) return [19.0340, 99.9040];

  return PHAYAO_CENTER;
};

// Custom Leaflet marker matching the UI design pin
const createPinIcon = (label) => L.divIcon({
  className: 'custom-leaflet-pin',
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
      <div style="position: absolute; top: -6px; width: 34px; height: 34px; border-radius: 50%; background: rgba(186, 26, 26, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <span class="material-symbols-outlined" style="font-size: 32px; color: #ba1a1a; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">location_on</span>
      ${label ? `<div style="background: rgba(40, 48, 68, 0.95); color: #ffffff; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; white-space: nowrap; margin-top: -2px; box-shadow: 0 1px 4px rgba(0,0,0,0.25); max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${label}</div>` : ''}
    </div>
  `,
  iconSize: [32, 44],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Ensures Leaflet map renders correctly inside modal
function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

const resolveImageUrl = (img) => {
  if (!img) return '';
  const urlStr = typeof img === 'string' ? img : (img.file_url || img.url || '');
  if (!urlStr) return '';
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.startsWith('data:')) {
    return urlStr;
  }
  const cleanPath = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '');
  return `${apiBase}${cleanPath}`;
};

const formatThaiDate = (dateStr) => {
  if (!dateStr) return '18 ก.ย. 2568 • 19:40 น.';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' • ' + d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' น.';
  } catch {
    return dateStr;
  }
};

const formatAuditTime = (dateStr, fallback = '19:40 น.') => {
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  } catch {
    return fallback;
  }
};

const getRelatedCategories = (ticket) => {
  const primary = (ticket?.category_name || '').trim().toLowerCase();
  const result = [];

  const multi = ticket?.llm_analysis?.multi_categories || [];
  multi.forEach(m => {
    const name = (m.category_name || m.name || '').trim();
    if (name && name.toLowerCase() !== primary && !result.includes(name)) {
      result.push(name);
    }
  });

  const topScores = ticket?.llm_analysis?.all_category_scores || [];
  topScores
    .filter(s => (s.confidence >= 0.20 || s.score >= 0.20 || s.score_percent >= 20) && s.category_name)
    .forEach(s => {
      const name = s.category_name.trim();
      if (name && name.toLowerCase() !== primary && !result.includes(name)) {
        result.push(name);
      }
    });

  if (result.length === 0) {
    const text = `${ticket?.title || ''} ${ticket?.description || ''}`.toLowerCase();
    if (text.includes('ไฟ') || text.includes('สว่าง') || text.includes('ทางเท้า') || text.includes('ถนน') || text.includes('จราจร')) {
      const cat = 'ความปลอดภัยและการจราจร';
      if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
    } else if (text.includes('ท่อ') || text.includes('ระบายน้ำ') || text.includes('ขยะ') || text.includes('กลิ่น')) {
      const cat = 'ระบบระบายน้ำ';
      if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
    } else if (text.includes('เน็ต') || text.includes('wifi') || text.includes('สแกน') || text.includes('access control')) {
      const cat = 'ระบบรักษาความปลอดภัย';
      if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
    } else if (text.includes('แอร์') || text.includes('พัดลม') || text.includes('ห้องเรียน')) {
      const cat = 'อาคารเรียนรวม';
      if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
    } else if (text.includes('อาหาร') || text.includes('น้ำ') || text.includes('ก๊อก')) {
      const cat = 'ศูนย์อาหาร';
      if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
    } else {
      result.push('ความปลอดภัยและการจราจร');
    }
  }

  return result.filter(c => c.toLowerCase() !== primary);
};

export default function TicketDetailModal({ 
  ticket, 
  onClose, 
  onStatusChange, 
  onForward, 
  onUnmerge,
  onUnmergeAll 
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [unmergeTarget, setUnmergeTarget] = useState(null);
  const [localStatus, setLocalStatus] = useState(() => {
    const s = (ticket?.status_name || '').toUpperCase();
    if (s === 'PENDING_REVIEW' || s === 'PENDING' || s === 'NEW') return 'pending';
    if (s === 'IN_PROGRESS') return 'in_progress';
    if (s === 'RESOLVED' || s === 'CLOSED') return 'resolved';
    return 'pending';
  });

  const duplicates = ticket?.duplicates || [];
  const isGrouped = duplicates.length > 0;
  const totalPosts = 1 + duplicates.length;

  // Accordion state for grouped posts (Post 0 is master, Post 1..N are duplicates)
  const [expandedPosts, setExpandedPosts] = useState({ 0: true, 1: true });
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  const toggleExpand = (idx) => {
    setExpandedPosts(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSelectPostFromDropdown = (idx) => {
    setSelectedPostIndex(idx);
    setExpandedPosts(prev => ({ ...prev, [idx]: true }));
    const el = document.getElementById(`post-card-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  if (!ticket) return null;

  const masterAuthor = getAnonymousAuthor(ticket);
  const attachments = ticket.attachments || [];
  const primaryCat = (ticket?.category_name || '').trim().toLowerCase();
  const relatedCategories = [...getRelatedCategories(ticket)];
  duplicates.forEach(d => {
    getRelatedCategories(d).forEach(c => {
      if (!relatedCategories.includes(c) && c.toLowerCase() !== primaryCat) {
        relatedCategories.push(c);
      }
    });
  });
  const coords = getTicketCoordinates(ticket);

  const statusNormal = (ticket.status_name || 'PENDING_REVIEW').toUpperCase();
  const isPending = statusNormal === 'PENDING_REVIEW' || statusNormal === 'PENDING' || statusNormal === 'NEW';
  const isOpen = statusNormal === 'OPEN';
  const isInProgress = statusNormal === 'IN_PROGRESS';
  const isResolved = statusNormal === 'RESOLVED' || statusNormal === 'CLOSED';

  // Handle Save & Close
  const handleSaveAndClose = () => {
    if (localStatus === 'transfer') {
      onForward?.(ticket);
      return;
    }

    let targetStatus = 'OPEN';
    if (localStatus === 'pending') {
      targetStatus = isPending ? 'PENDING_REVIEW' : 'OPEN';
    } else if (localStatus === 'in_progress') {
      targetStatus = 'IN_PROGRESS';
    } else if (localStatus === 'resolved') {
      targetStatus = 'RESOLVED';
    }

    onStatusChange?.(ticket, targetStatus);
    onClose();
  };

  const handleStatusSelect = (val) => {
    setLocalStatus(val);
    if (val === 'transfer') {
      onForward?.(ticket);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 lg:p-6 overflow-y-auto animate-in fade-in duration-200"
      id="issueDetailModal"
      onClick={onClose}
    >
      {/* Lightbox Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Attachment Full View" 
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10" 
            />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full text-[#131b2e] font-bold shadow-lg flex items-center justify-center hover:bg-slate-100 transition-transform active:scale-95 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Modal Container */}
      <div 
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#eaedff] transition-all my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#eaedff] bg-[#f2f3ff]/70 flex items-start justify-between gap-4 sticky top-0 z-20">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            {/* Breadcrumbs & Grouped Badge */}
            {isGrouped ? (
              <div className="flex items-center gap-2 flex-wrap text-[12px]">
                <span className="text-[#4a4450]">รายการคำร้อง</span>
                <span className="text-[#ccc3d2]">/</span>
                <span className="font-mono font-bold text-[#340866]">
                  {ticket.formatted_ticket_id || ticket.ticket_id || `#UP-68-${ticket.problem_id}`} (กลุ่มรวม {totalPosts} โพสต์)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#fed65b]/40 text-[#745c00] font-bold text-xs flex items-center gap-1 border border-[#745c00]/20 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px] text-[#745c00]">merge</span>
                  <span>✨ รวม {totalPosts} โพสต์คล้ายกัน</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap text-[12px]">
                <span className="text-[#4a4450]">รายการคำร้อง</span>
                <span className="text-[#ccc3d2]">/</span>
                <span className="font-mono font-bold text-[#340866]">
                  {ticket.formatted_ticket_id || ticket.ticket_id || `#UP-68-${ticket.problem_id}`}
                </span>
              </div>
            )}

            {/* Main Title */}
            <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
              <h2 className="text-xl sm:text-2xl font-bold text-[#131b2e] tracking-tight leading-snug">
                {ticket.title}
              </h2>
            </div>

            {/* Dropdown / Post Switcher Row for Grouped Mode */}
            {isGrouped ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 mt-1">
                <div className="flex items-center gap-2 shrink-0 text-[#4a4450] text-xs font-bold">
                  <span className="material-symbols-outlined text-[18px] text-[#745c00]">account_tree</span>
                  <span className="font-semibold text-[#131b2e]">เลือกกางโพสต์เจาะจง:</span>
                </div>
                <div className="relative flex-1 max-w-xl">
                  <select 
                    value={selectedPostIndex}
                    onChange={(e) => handleSelectPostFromDropdown(Number(e.target.value))}
                    className="w-full h-9 pl-3 pr-8 rounded-lg bg-white border border-[#eaedff] text-xs font-semibold text-[#131b2e] appearance-none focus:outline-none focus:ring-2 focus:ring-[#340866] cursor-pointer shadow-xs"
                  >
                    <option value={0}>
                      📌 โพสต์ 1/{totalPosts} (ตั๋วหลัก {ticket.formatted_ticket_id || `#UP-68-${ticket.problem_id}`}): {masterAuthor.name} ({formatAuditTime(ticket.created_at)}) • {expandedPosts[0] ? 'กางเนื้อหาอยู่' : 'แบบพับย่อ'}
                    </option>
                    {duplicates.map((dup, dIdx) => {
                      const dAuth = getAnonymousAuthor(dup);
                      const postNum = dIdx + 2;
                      const isExp = expandedPosts[dIdx + 1];
                      return (
                        <option key={dup.problem_id} value={dIdx + 1}>
                          📄 โพสต์ {postNum}/{totalPosts} (รวมโพสต์ {dup.formatted_ticket_id || `#UP-68-${dup.problem_id}`}): {dAuth.name} ({formatAuditTime(dup.created_at)}) • {isExp ? 'กางเนื้อหาอยู่' : 'แบบพับย่อ'}
                        </option>
                      );
                    })}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4450] text-[18px]">
                    unfold_more
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping" />
                      1. รอดำเนินการ
                    </span>
                  )}
                  {isOpen && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      1. รอดำเนินการ
                    </span>
                  )}
                  {isInProgress && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fed65b]/30 text-[#745c00] text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#745c00] animate-pulse" />
                      2. กำลังดำเนินการ
                    </span>
                  )}
                  {isResolved && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      3. เสร็จสิ้น
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#4b267d] text-white text-xs font-semibold">
                    <span className="material-symbols-outlined text-[13px]">bolt</span>
                    {ticket.category_name || 'อาคารและสิ่งอำนวยความสะดวก'}
                  </span>
                </div>
              </div>
            ) : (
              /* Single Post Tags Row */
              <div className="flex items-center gap-2 flex-wrap text-xs mt-0.5">
                {isPending && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping" />
                    1. รอดำเนินการ (ใหม่)
                  </span>
                )}
                {isOpen && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    1. รอดำเนินการ (ใหม่)
                  </span>
                )}
                {isInProgress && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fed65b]/30 text-[#745c00] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#745c00] animate-pulse" />
                    2. กำลังดำเนินการ
                  </span>
                )}
                {isResolved && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#340866]/10 text-[#340866] font-bold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    3. ดำเนินการเสร็จสิ้น
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#4b267d] text-white font-semibold">
                  <span className="material-symbols-outlined text-[13px]">bolt</span>
                  {ticket.category_name || 'อาคารและสิ่งอำนวยความสะดวก'}
                </span>
                <span className="text-[#4a4450] font-mono text-[12px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#7b7482]">schedule</span>
                  แจ้งเมื่อ {formatThaiDate(ticket.created_at)}
                </span>
              </div>
            )}
          </div>

          {/* Modal Actions / Close */}
          <div className="flex items-center gap-2 shrink-0 pt-1">
            <button 
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#eaedff] text-[#4a4450] hover:bg-[#ffdad6] hover:text-[#ba1a1a] transition-colors cursor-pointer"
              onClick={onClose}
              title="ปิดหน้าต่าง"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Two Column Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white">
          {/* Left Column: 60% Detailed Info */}
          {isGrouped ? (
            /* GROUPED POSTS LEFT COLUMN */
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Top Summary Notice Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#fed65b]/20 border border-[#fed65b] shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#735c00] text-white flex items-center justify-center font-bold shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">merge</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#745c00]">รวมกลุ่มคำร้องอัตโนมัติ {totalPosts} โพสต์</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#fed65b]/50 text-[#745c00] text-[11px] font-bold border border-[#745c00]/30">เนื้อหาและสถานที่ตรงกัน</span>
                    </div>
                    <span className="text-[11px] text-[#4a4450]">ปัญหาจุดเดียวกันบริเวณ{ticket.building_name || ticket.location || 'มหาวิทยาลัยพะเยา'} แต่ละโพสต์มีการ์ดข้อมูลแยกอิสระ</span>
                  </div>
                </div>
                {onUnmergeAll && (
                  <button 
                    onClick={() => setUnmergeTarget({ type: 'all', tickets: duplicates })}
                    className="text-xs font-bold text-[#745c00] hover:underline flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-lg border border-[#fed65b] shadow-xs cursor-pointer active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[15px]">call_split</span>
                    <span>แยกกลุ่มทั้งหมด</span>
                  </button>
                )}
              </div>

              {/* ================= POST 1 (ตั๋วหลัก) ================= */}
              <div id="post-card-0" className="rounded-xl border-2 border-[#340866]/30 bg-white shadow-xs overflow-hidden flex flex-col transition-all">
                {/* Header */}
                <div className="p-3.5 bg-[#340866]/5 border-b border-[#340866]/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-[#340866] text-white font-mono text-[12px] font-bold shadow-xs">
                      โพสต์ 1/{totalPosts} (ตั๋วหลัก)
                    </span>
                    <span className="font-mono font-bold text-[#340866] text-sm">
                      {ticket.formatted_ticket_id || ticket.ticket_id || `#UP-68-${ticket.problem_id}`}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#f2f3ff] text-[#131b2e] text-[11px] font-semibold">
                      แจ้งเป็นคนแรก
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#4a4450] font-mono flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatAuditTime(ticket.created_at)}
                    </span>
                    <button 
                      onClick={() => toggleExpand(0)}
                      className="w-7 h-7 rounded-lg bg-[#340866]/10 text-[#340866] flex items-center justify-center hover:bg-[#340866]/20 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {expandedPosts[0] ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Body */}
                {expandedPosts[0] && (
                  <div className="p-4 flex flex-col gap-4 animate-in fade-in duration-150">
                    {/* Reporter Profile */}
                    <div className="p-3 rounded-lg bg-[#f2f3ff] border border-[#eaedff] flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-2xs ${masterAuthor.avatarBg}`}>
                          <span className="material-symbols-outlined text-[20px]">{masterAuthor.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                              <span>{masterAuthor.name}</span>
                              <span className="text-base select-none" title={masterAuthor.roleTitle}>{masterAuthor.emoji}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white font-mono text-[10px] text-[#4a4450] border border-[#eaedff]">
                              {masterAuthor.passTag}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-white text-[#131b2e] font-mono text-[11px] font-semibold flex items-center gap-1 border border-[#eaedff]">
                        <span className="material-symbols-outlined text-[14px] text-[#340866]">pin_drop</span>
                        พิกัด {coords[0].toFixed(4)}° N, {coords[1].toFixed(4)}° E
                      </span>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-[#340866]">description</span>
                        รายละเอียดข้อร้องเรียน
                      </span>
                      <div className="p-3 rounded-lg bg-[#f2f3ff]/50 border border-[#eaedff] text-[#131b2e] text-sm leading-relaxed">
                        "{ticket.description || 'ไม่มีคำอธิบายเพิ่มเติม'}"
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-[#735c00]">photo_library</span>
                          ภาพถ่ายหลักฐาน {attachments.length > 0 ? `(${attachments.length} ภาพ)` : ''}
                        </span>
                        {attachments.length > 0 && (
                          <span className="text-[11px] text-[#340866] font-semibold flex items-center gap-1 font-mono">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            พิกัดภาพตรงจุดเกิดเหตุ
                          </span>
                        )}
                      </div>
                      {attachments.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {attachments.map((att, attIdx) => {
                            const url = resolveImageUrl(att);
                            return (
                              <div 
                                key={attIdx}
                                onClick={() => setSelectedImage(url)}
                                className="group relative rounded-xl overflow-hidden bg-slate-900 border border-[#eaedff] aspect-video flex flex-col justify-end p-2.5 cursor-pointer shadow-xs hover:shadow-md transition-all"
                              >
                                <img src={url} alt={`Evidence ${attIdx + 1}`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                <div className="relative z-20 flex items-center justify-between text-white text-[11px]">
                                  <span className="font-mono font-medium">รูปที่ {attIdx + 1}</span>
                                  <span className="material-symbols-outlined text-[16px] group-hover:scale-125 transition-transform">zoom_in</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border-2 border-dashed border-[#eaedff] flex flex-col items-center justify-center text-center p-4 text-[#7b7482] bg-[#f2f3ff]/30">
                          <span className="material-symbols-outlined text-[24px] text-slate-400">image_not_supported</span>
                          <span className="text-xs font-mono mt-1 font-medium">ไม่มีรูปเพิ่มเติมจากผู้แจ้งรายนี้</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* End Divider for Post 1 */}
                <div className="px-4 py-2 bg-[#f2f3ff] border-t border-[#eaedff] flex items-center justify-between text-[11px] text-[#4a4450] font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#340866]" />
                    --- สิ้นสุดรายละเอียดโพสต์ที่ 1 ({ticket.formatted_ticket_id || ticket.ticket_id}) ---
                  </span>
                  <span className="text-[#340866] font-bold">
                    สถานะ: {isPending ? 'รอดำเนินการ' : isInProgress ? 'กำลังดำเนินการ' : isResolved ? 'เสร็จสิ้น' : 'รอดำเนินการ'}
                  </span>
                </div>
              </div>

              {/* Visual Inter-post connector */}
              <div className="flex items-center justify-center gap-3 my-1">
                <div className="h-[1px] flex-1 bg-[#eaedff]" />
                <span className="text-[11px] text-[#7b7482] font-mono font-semibold px-2 py-0.5 rounded bg-[#f2f3ff] border border-[#eaedff]">
                  โพสต์ที่รวมอยู่ในปัญหาเดียวกัน ({duplicates.length} โพสต์)
                </span>
                <div className="h-[1px] flex-1 bg-[#eaedff]" />
              </div>

              {/* ================= POST 2, 3, ... (DUPLICATES) ================= */}
              {duplicates.map((dup, dIdx) => {
                const postIdx = dIdx + 1;
                const postNum = dIdx + 2;
                const isExp = expandedPosts[postIdx];
                const dupAuth = getAnonymousAuthor(dup);
                const dupCoords = getTicketCoordinates(dup);
                const dupAttachments = dup.attachments || [];

                return (
                  <div 
                    key={dup.problem_id} 
                    id={`post-card-${postIdx}`}
                    className={`rounded-xl border-2 transition-all bg-white shadow-xs overflow-hidden flex flex-col ${
                      isExp ? 'border-[#fed65b]' : 'border-[#eaedff] hover:border-[#fed65b]'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-3.5 bg-[#fed65b]/15 border-b border-[#fed65b]/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-[#735c00] text-white font-mono text-[12px] font-bold shadow-xs">
                          โพสต์ {postNum}/{totalPosts} (รวมโพสต์)
                        </span>
                        <span className="font-mono font-bold text-[#340866] text-sm">
                          {dup.formatted_ticket_id || `#UP-68-${dup.problem_id}`}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#fed65b]/40 text-[#745c00] text-[11px] font-bold flex items-center gap-1 border border-[#745c00]/20">
                          <span className="material-symbols-outlined text-[13px]">layers</span>
                          โพสต์ที่มีความคล้ายคลึงกัน
                        </span>
                        {!isExp && (
                          <span className="text-xs text-[#131b2e] font-semibold hidden sm:inline-block truncate max-w-[200px]">
                            • {dupAuth.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#4a4450] font-mono flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {formatAuditTime(dup.created_at)}
                        </span>
                        {onUnmerge && (
                          <button
                            onClick={() => setUnmergeTarget({ type: 'single', ticket: dup })}
                            className="px-2 py-1 rounded text-[11px] font-bold text-[#7b7482] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors flex items-center gap-1 border border-[#eaedff] bg-white cursor-pointer active:scale-95"
                            title="แยกโพสต์นี้ออกจากกลุ่ม"
                          >
                            <span className="material-symbols-outlined text-[13px]">call_split</span>
                            <span>แยกโพสต์นี้</span>
                          </button>
                        )}
                        <button 
                          onClick={() => toggleExpand(postIdx)}
                          className="w-7 h-7 rounded-lg bg-[#fed65b] text-[#745c00] flex items-center justify-center hover:bg-[#ffe088] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isExp ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Collapsed Preview */}
                    {!isExp && (
                      <div 
                        onClick={() => toggleExpand(postIdx)}
                        className="px-4 py-3 bg-white flex items-center justify-between gap-3 text-xs text-[#4a4450] cursor-pointer hover:bg-[#f2f3ff]/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-outlined text-[#340866] text-[18px] shrink-0">format_quote</span>
                          <span className="truncate italic">"{dup.description || dup.title || 'ไม่มีคำอธิบายเพิ่มเติม'}"</span>
                        </div>
                        <span className="text-[11px] font-mono shrink-0 bg-[#eaedff] px-2 py-0.5 rounded text-[#4a4450]">
                          แนบ {dupAttachments.length} ภาพ • GPS ในรัศมี 25 ม.
                        </span>
                      </div>
                    )}

                    {/* Expanded Content */}
                    {isExp && (
                      <div className="p-4 flex flex-col gap-4 animate-in fade-in duration-150">
                        {/* Reporter Profile */}
                        <div className="p-3 rounded-lg bg-[#f2f3ff] border border-[#eaedff] flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-2xs ${dupAuth.avatarBg}`}>
                              <span className="material-symbols-outlined text-[20px]">{dupAuth.icon}</span>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                                  <span>{dupAuth.name}</span>
                                  <span className="text-base select-none" title={dupAuth.roleTitle}>{dupAuth.emoji}</span>
                                </span>
                                <span className="px-2 py-0.5 rounded bg-white font-mono text-[10px] text-[#4a4450] border border-[#eaedff]">
                                  {dupAuth.passTag}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded bg-white text-[#131b2e] font-mono text-[11px] font-semibold flex items-center gap-1 border border-[#eaedff]">
                            <span className="material-symbols-outlined text-[14px] text-[#735c00]">pin_drop</span>
                            พิกัด {dupCoords[0].toFixed(4)}° N, {dupCoords[1].toFixed(4)}° E
                          </span>
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px] text-[#340866]">description</span>
                            รายละเอียดข้อร้องเรียน
                          </span>
                          <div className="p-3 rounded-lg bg-[#f2f3ff]/50 border border-[#eaedff] text-[#131b2e] text-sm leading-relaxed">
                            "{dup.description || dup.title || 'ไม่มีคำอธิบายเพิ่มเติม'}"
                          </div>
                        </div>

                        {/* Photos */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-[#735c00]">photo_library</span>
                              ภาพถ่ายหลักฐาน {dupAttachments.length > 0 ? `(${dupAttachments.length} ภาพ)` : ''}
                            </span>
                            <span className="text-[11px] text-[#735c00] font-semibold flex items-center gap-1 font-mono">
                              <span className="material-symbols-outlined text-[13px]">distance</span>
                              ระยะห่างจุดเกิดเหตุ 15 ม.
                            </span>
                          </div>
                          {dupAttachments.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {dupAttachments.map((att, attIdx) => {
                                const url = resolveImageUrl(att);
                                return (
                                  <div 
                                    key={attIdx}
                                    onClick={() => setSelectedImage(url)}
                                    className="group relative rounded-xl overflow-hidden bg-slate-900 border border-[#eaedff] aspect-video flex flex-col justify-end p-2.5 cursor-pointer shadow-xs hover:shadow-md transition-all"
                                  >
                                    <img src={url} alt={`Evidence ${attIdx + 1}`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                    <div className="relative z-20 flex items-center justify-between text-white text-[11px]">
                                      <span className="font-mono font-medium">รูปที่ {attIdx + 1}</span>
                                      <span className="material-symbols-outlined text-[16px] group-hover:scale-125 transition-transform">zoom_in</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border-2 border-dashed border-[#eaedff] flex flex-col items-center justify-center text-center p-4 text-[#7b7482] bg-[#f2f3ff]/30">
                              <span className="material-symbols-outlined text-[24px] text-slate-400">image_not_supported</span>
                              <span className="text-xs font-mono mt-1 font-medium">ไม่มีรูปเพิ่มเติมจากผู้แจ้งรายนี้</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* End Divider for duplicate post */}
                    <div className="px-4 py-2 bg-[#fed65b]/20 border-t border-[#fed65b] flex items-center justify-between text-[11px] text-[#4a4450] font-mono">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#735c00]" />
                        --- สิ้นสุดรายละเอียดโพสต์ที่ {postNum} ({dup.formatted_ticket_id || `#UP-68-${dup.problem_id}`}) ---
                      </span>
                      <span className="text-[#745c00] font-bold">
                        {isExp ? `สถานะ: ${dup.status_name || 'รอดำเนินการ'}` : 'คลิกแถบเพื่อกางเนื้อหาเต็ม'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Activity Audit Timeline */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#eaedff]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#7b7482]">history</span>
                  บันทึกการรวมเคสอัตโนมัติ (Activity Audit)
                </span>
                <div className="border-l-2 border-[#340866]/30 pl-4 ml-2 flex flex-col gap-2.5 text-xs text-[#4a4450]">
                  <div className="relative flex flex-col">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#fed65b] ring-4 ring-white" />
                    <span className="font-semibold text-[#131b2e]">
                      {formatAuditTime(ticket.created_at, '20:06 น.')} • รวมกลุ่มโพสต์ {totalPosts} รายการสำเร็จ
                    </span>
                    <span className="text-[11px] text-[#7b7482]">
                      จับคู่ {ticket.formatted_ticket_id || `#UP-68-${ticket.problem_id}`} (หลัก), {duplicates.map(d => d.formatted_ticket_id || `#UP-68-${d.problem_id}`).join(', ')} ร่วมกันในโซน{ticket.building_name || ticket.location || 'ม.พะเยา'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SINGLE POST LEFT COLUMN */
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Reporter Profile Card */}
              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold shadow-2xs ${masterAuthor.avatarBg}`}>
                    <span className="material-symbols-outlined text-[24px]">{masterAuthor.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                        <span>{masterAuthor.name}</span>
                        <span className="text-base select-none" title={masterAuthor.roleTitle}>{masterAuthor.emoji}</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-[#7b7482]">{masterAuthor.roleTitle}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-semibold text-[#4a4450] bg-white px-2.5 py-1 rounded-lg border border-[#eaedff] shadow-2xs">
                  {masterAuthor.passTag}
                </span>
              </div>

              {/* Full Problem Description */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#340866]">description</span>
                  รายละเอียดข้อร้องเรียนจาก{masterAuthor.name.startsWith('นิสิต') ? 'นิสิต' : masterAuthor.name.startsWith('บุคลากร') ? 'บุคลากร' : 'ผู้แจ้ง'}
                </span>
                <div className="p-4 rounded-xl bg-[#f2f3ff]/40 border border-[#eaedff] text-[#131b2e] leading-relaxed text-sm font-sans">
                  "{ticket.description || 'ไม่มีคำอธิบายเพิ่มเติม'}"
                </div>
              </div>

              {/* Photo Evidence Gallery */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#735c00]">photo_library</span>
                    ภาพถ่ายหลักฐานในที่เกิดเหตุ {attachments.length > 0 ? `(${attachments.length} ภาพ)` : ''}
                  </span>
                  {attachments.length > 0 ? (
                    <span className="text-xs text-[#340866] font-semibold">
                      พิกัดภาพตรงกับ GPS
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      ไม่มีรูปภาพ
                    </span>
                  )}
                </div>

                {attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {attachments.map((att, idx) => {
                      const url = resolveImageUrl(att);
                      return (
                        <div 
                          key={idx}
                          onClick={() => setSelectedImage(url)}
                          className="group relative rounded-xl overflow-hidden bg-slate-900 border border-[#eaedff] aspect-video flex flex-col justify-end p-3 cursor-pointer shadow-xs hover:shadow-md transition-all"
                        >
                          <img 
                            src={url} 
                            alt={`Evidence ${idx + 1}`} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                          <div className="relative z-20 flex items-center justify-between text-white text-xs">
                            <span className="font-mono font-medium">ภาพที่ {idx + 1}</span>
                            <span className="material-symbols-outlined text-[18px] group-hover:scale-125 transition-transform">zoom_in</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-[#f2f3ff]/30 border-2 border-dashed border-[#eaedff] flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-[28px]">image_not_supported</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#131b2e]">ไม่มีการแนบรูปภาพ</span>
                      <span className="text-[11px] text-[#7b7482]">ผู้แจ้งไม่ได้แนบไฟล์รูปถ่ายสำหรับคำร้องนี้</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Track (Audit) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#eaedff]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#7b7482]">history</span>
                  บันทึกความคืบหน้าระบบ (ACTIVITY AUDIT)
                </span>
                <div className="border-l-2 border-[#340866]/30 pl-4 ml-2 flex flex-col gap-2.5 text-xs text-[#4a4450]">
                  <div className="relative flex flex-col">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#340866] ring-4 ring-white" />
                    <span className="font-semibold text-[#131b2e]">
                      {formatAuditTime(ticket.created_at, '19:42 น.')} • ระบบตรวจสอบหมวดหมู่และจัดส่งข้อมูล
                    </span>
                    <span className="text-[11px] text-[#7b7482]">
                      ตรวจสอบความถูกต้องของลักษณะปัญหาและส่งต่อหน่วยงาน
                    </span>
                  </div>
                  <div className="relative flex flex-col">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#fed65b] ring-4 ring-white" />
                    <span className="font-semibold text-[#131b2e]">
                      {formatAuditTime(ticket.created_at, '06:05 น.')} • สร้างคำร้อง {ticket.formatted_ticket_id || ticket.ticket_id} สำเร็จ
                    </span>
                    <span className="text-[11px] text-[#7b7482]">
                      ผู้แจ้งส่งเรื่องผ่าน LINE Mini App / UP Connect Web
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Column: 40% Map & Status Management */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:border-l lg:border-[#eaedff] lg:pl-6">
            {/* Campus Map Box (Leaflet locked to UP) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#340866]">pin_drop</span>
                  พิกัดสถานที่เกิดเหตุ (แผนที่ ม.พะเยา)
                </span>
                <span className="text-[11px] font-mono text-[#340866] font-semibold">
                  {coords[0].toFixed(4)}° N, {coords[1].toFixed(4)}° E
                </span>
              </div>

              {/* Map Canvas */}
              <div className="rounded-xl overflow-hidden border border-[#eaedff] h-48 sm:h-52 relative shadow-xs flex flex-col">
                <MapContainer
                  center={coords}
                  zoom={16}
                  minZoom={13}
                  maxZoom={18}
                  maxBounds={PHAYAO_BOUNDS}
                  maxBoundsViscosity={1.0}
                  scrollWheelZoom={false}
                  attributionControl={false}
                  className="w-full h-full z-10"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                  <Marker 
                    position={coords} 
                    icon={createPinIcon(ticket.building_name || ticket.location || 'จุดเกิดเหตุ')} 
                  />
                  <MapInvalidator />
                </MapContainer>

                <div className="absolute top-2 right-2 z-20 pointer-events-none">
                  <span className="px-2 py-0.5 rounded bg-[#340866] text-white text-[10px] font-bold shadow-xs">
                    {ticket.building_name || ticket.location || 'มหาวิทยาลัยพะเยา'}
                  </span>
                </div>

                <div className="absolute bottom-2 left-2 right-2 z-20 bg-white/95 backdrop-blur-xs p-2 rounded-lg text-[11px] text-[#4a4450] flex items-center justify-between border border-[#eaedff] shadow-xs pointer-events-none">
                  <span className="truncate font-medium">{ticket.location_label || ticket.location || 'โซนมหาวิทยาลัยพะเยา'}</span>
                  <span className="text-[#340866] font-bold shrink-0 text-[10px]">พิกัด ม.พะเยา</span>
                </div>
              </div>
            </div>

            {/* Related Categories (Shows beneath map for both Single & Grouped) */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#340866]">category</span>
                  หมวดหมู่ที่อาจจะเกี่ยวข้อง
                </span>
                <span className="text-[11px] font-mono font-semibold text-[#340866] bg-[#f2f3ff] px-2 py-0.5 rounded-full">
                  เกี่ยวข้อง {1 + relatedCategories.length} หมวดหมู่
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="p-2.5 rounded-lg bg-white border border-[#eaedff] flex flex-col gap-1 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#340866]">bolt</span>
                      <span className="text-xs font-bold text-[#131b2e]">
                        {ticket.category_name || 'อาคารและสิ่งอำนวยความสะดวก'}
                      </span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-[#340866] text-white text-[10px] font-bold">
                      หมวดหลัก
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-ping" />
                  </div>
                </div>

                {relatedCategories.map((catName, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#eaedff] flex flex-col gap-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#735c00]">shield</span>
                        <span className="text-xs font-bold text-[#131b2e]">{catName}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-[#fed65b]/40 text-[#745c00] text-[10px] font-bold border border-[#745c00]/20">
                        หมวดที่เกี่ยวข้อง
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#735c00]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Manage Status Card */}
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4a4450] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#340866]">tune</span>
                  {isGrouped ? 'จัดการสถานะและมอบหมายงาน' : 'จัดการสถานะคำร้อง'}
                </span>
                {isGrouped && (
                  <span className="px-2 py-0.5 rounded bg-[#340866]/10 text-[#340866] font-mono text-[11px] font-bold">
                    มีผลพร้อมกัน {totalPosts} โพสต์
                  </span>
                )}
              </div>

              {/* Status Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase text-[#4a4450]">
                  {isGrouped ? 'ปรับสถานะคำร้องทั้งกลุ่ม' : 'ปรับสถานะของคำร้อง'}
                </label>
                <div className="relative">
                  <select
                    value={localStatus}
                    onChange={(e) => handleStatusSelect(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 rounded-lg bg-white border border-[#eaedff] text-xs font-semibold text-[#131b2e] appearance-none focus:outline-none focus:ring-2 focus:ring-[#340866] cursor-pointer shadow-xs"
                  >
                    <option value="pending">
                      {isGrouped ? '🔴 1. รอดำเนินการ (ใหม่ - รอจ่ายงาน)' : '🔴 1. รอดำเนินการ (ใหม่)'}
                    </option>
                    <option value="in_progress">
                      {isGrouped ? '🟡 2. กำลังดำเนินการ (ช่างลงพื้นที่ทั้งกลุ่ม)' : '🟡 2. กำลังดำเนินการ'}
                    </option>
                    <option value="resolved">
                      {isGrouped ? `🟢 3. ดำเนินการเสร็จสิ้น (ปิดงานสำเร็จพร้อมกัน ${totalPosts} รายการ)` : '🟢 3. ดำเนินการเสร็จสิ้น'}
                    </option>
                    <option value="transfer">
                      {isGrouped ? '🔄 โอนย้ายทั้งกลุ่มไปยังหน่วยงานอื่น' : '🔄 โอนย้ายไปยังหน่วยงานอื่น'}
                    </option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4450] text-[18px]">
                    unfold_more
                  </span>
                </div>
              </div>

              {/* Forward Category Button */}
              <div className="pt-1">
                <button
                  onClick={() => onForward?.(ticket)}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#eaedff] hover:bg-[#e2e7ff] text-[#131b2e] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#eaedff] cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#4a4450]">swap_horiz</span>
                  <span>โอนหมวดหมู่</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#eaedff] bg-[#f2f3ff] flex items-center justify-between text-xs text-[#4a4450]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#fed65b] animate-pulse" />
            <span className="font-mono text-[12px] text-[#131b2e] font-semibold">
              Ticket ID: {ticket.ticket_id || ticket.formatted_ticket_id || `UP-2568-OCT-0422-FL01`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-1.5 rounded-lg text-[#131b2e] text-xs font-medium hover:bg-[#eaedff] transition-colors cursor-pointer"
              onClick={onClose}
            >
              ปิดหน้าต่าง
            </button>
            <button
              className="px-4 py-1.5 rounded-lg bg-[#340866] text-white text-xs font-semibold hover:bg-[#4b267d] transition-colors shadow-xs cursor-pointer"
              onClick={handleSaveAndClose}
            >
              บันทึกการดำเนินการ
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Unmerging Tickets */}
      {unmergeTarget && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setUnmergeTarget(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 text-left flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">call_split</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800">
                  {unmergeTarget.type === 'single'
                    ? 'ยืนยันการแยกโพสต์คำร้องออกจากกลุ่ม'
                    : 'ยืนยันการแยกกลุ่มคำร้องทั้งหมด'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug truncate">
                  {unmergeTarget.type === 'single'
                    ? `รหัสคำร้อง: ${unmergeTarget.ticket.formatted_ticket_id || unmergeTarget.ticket.ticket_id || `#UP-68-${unmergeTarget.ticket.problem_id}`} • "${unmergeTarget.ticket.title || ''}"`
                    : `ยกเลิกการรวมกลุ่มสำหรับคำร้องย่อยทั้งหมดจำนวน ${unmergeTarget.tickets.length} รายการ`}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-slate-700 space-y-2 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <span className="material-symbols-outlined text-[17px]">info</span>
                <span>ผลลัพธ์และขั้นตอนหลังจากยืนยัน:</span>
              </div>
              {unmergeTarget.type === 'single' ? (
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li>
                    คำร้องนี้จะถูกแยกออกจากกลุ่มของตั๋วหลัก <strong>{ticket.formatted_ticket_id || ticket.ticket_id || `#UP-68-${ticket.problem_id}`}</strong> ทันที
                  </li>
                  <li>
                    ระบบจะนำคำร้องกลับไปแสดงเป็น <strong className="text-slate-800">"คำร้องเดี่ยว" ในสถานะ "รอดำเนินการ"</strong> บนหน้าตารางรายการคำร้องทั้งหมด
                  </li>
                  <li>
                    เจ้าหน้าที่สามารถเข้าตรวจสอบ คัดกรอง หรือมอบหมายงานและติดตามการแก้ไขแยกต่างหากได้อย่างอิสระ
                  </li>
                </ul>
              ) : (
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li>
                    คำร้องย่อยทั้งหมดจำนวน <strong>{unmergeTarget.tickets.length} รายการ</strong> จะถูกแยกออกจากกลุ่ม
                  </li>
                  <li>
                    คำร้องทุกรายการจะกลับไปแสดงเป็น <strong className="text-slate-800">"คำร้องเดี่ยว" ในสถานะ "รอดำเนินการ"</strong> บนหน้าตารางรายการคำร้องทั้งหมด
                  </li>
                  <li>
                    ตั๋วหลักจะกลับเป็นคำร้องเดี่ยวตามเดิม
                  </li>
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUnmergeTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (unmergeTarget.type === 'single') {
                    onUnmerge?.(unmergeTarget.ticket.problem_id);
                  } else {
                    onUnmergeAll?.(unmergeTarget.tickets);
                  }
                  setUnmergeTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">call_split</span>
                <span>ยืนยันการแยก{unmergeTarget.type === 'single' ? 'โพสต์นี้' : 'กลุ่มทั้งหมด'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
