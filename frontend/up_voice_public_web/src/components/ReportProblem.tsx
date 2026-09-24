/**
 * ReportProblem.tsx
 *
 * Modern UP Connect "แจ้งปัญหาใหม่" (Report Issue) Page
 * Fully tuned to the University of Phayao Portal Design:
 *  - Full-width hero banner with brand gradient ("ร่วมกันแจ้ง ร่วมกันแก้ เพื่อมหาวิทยาลัยที่ดีขึ้น")
 *  - 2-Column Responsive Layout:
 *    - Left: Section 1 (What & Where), Section 2 (When & AI Details), Section 3 (Visual Evidence), Submit Button
 *    - Right: Mini Campus Map Preview card with live pin + SLA / Helpful Tips Card
 *  - Interactive Calendar Modal for Date picking with status badge ("วันนี้", "เมื่อวานนี้", ฯลฯ)
 *  - Interactive Time Picker Modal with quick presets and time-of-day badges ("(กลางคืน)", "(หัวค่ำ)", ฯลฯ)
 *  - UP Connect Branded Leaflet Map Picker Modal:
 *    - Purple & Gold gradient header with university icon
 *    - Zone filter chips (อาคารเรียนรวม, คณะ, หอพัก, บริการ)
 *    - Quick-jump buttons to campus landmarks (ICT, CE, PK, หอพัก 8, หอสมุด)
 *    - Custom pulsating UP Connect pin marker
 *    - Floating coordinates HUD and status indicator
 *  - AI Summarization with "✨ ช่วยเรียบเรียงสรุป"
 *  - Single/Multi Image Upload with Drag & Drop and Preview Thumbnails
 *  - Production-ready FastAPI integration
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L, { LatLng as LeafletLatLng } from 'leaflet';

// ─── Leaflet Marker Setup for Vite ──────────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom UP Connect Pulsating Pin Icon
const upCustomPinIcon = L.divIcon({
  className: 'up-custom-marker',
  html: `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; transform: translate(-2px, -8px);">
      <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(75, 38, 125, 0.28); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 36px; height: 36px; border-radius: 50% 50% 50% 4px; transform: rotate(-45deg); background: linear-gradient(135deg, #4b267d, #6f45a7); border: 2.5px solid #ffffff; box-shadow: 0 6px 16px rgba(75, 38, 125, 0.45); display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 16px; color: #fed65b; font-weight: bold; line-height: 1;">📍</span>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

// ─── API Constants ──────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const UP_CENTER: [number, number] = [19.0289, 99.8973]; // University of Phayao Center

// ─── Default UP Campus Buildings Dataset ────────────────────────────────────
export interface Building {
  id: number | string;
  name: string;
  categoryGroup: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_UP_BUILDINGS: Building[] = [
  { id: 'bld_ict', name: 'อาคารเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.027329, longitude: 99.8999566 },
  { id: 'bld_ce', name: 'อาคารเรียนรวม CE', categoryGroup: 'อาคารเรียนรวม', latitude: 19.0275, longitude: 99.8965 },
  { id: 'bld_pk', name: 'อาคารเรียนรวม PK', categoryGroup: 'อาคารเรียนรวม', latitude: 19.028, longitude: 99.897 },
  { id: 'bld_ub', name: 'อาคารเรียนรวม UB', categoryGroup: 'อาคารเรียนรวม', latitude: 19.0285, longitude: 99.896 },
  { id: 'bld_pky', name: 'อาคารเรียนรวม PKY (พัชรกิตติยาภา)', categoryGroup: 'อาคารเรียนรวม', latitude: 19.028, longitude: 99.897 },
  { id: 'bld_eng', name: 'คณะวิศวกรรมศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0285, longitude: 99.8975 },
  { id: 'bld_updorm8', name: 'หอพักนิสิต UP Dorm 8', categoryGroup: 'หอพักนิสิต', latitude: 19.037, longitude: 99.8935 },
  { id: 'bld_dorm_all', name: 'กลุ่มหอพักนิสิต (มพ. 1-18)', categoryGroup: 'หอพักนิสิต', latitude: 19.0375, longitude: 99.8945 },
  { id: 'bld_lib', name: 'ศูนย์บรรณสารและการเรียนรู้ (หอสมุดกลาง)', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.0335, longitude: 99.894 },
  { id: 'bld_admin', name: 'อาคารสำนักงานอธิการบดี', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.0295, longitude: 99.896 },
  { id: 'bld_hall', name: 'หอประชุมพญางำเมือง', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.029, longitude: 99.895 },
  { id: 'bld_hospital', name: 'ศูนย์การแพทย์และโรงพยาบาล มหาวิทยาลัยพะเยา', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.027, longitude: 99.894 },
  { id: 'bld_med', name: 'คณะแพทยศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.031, longitude: 99.8975 },
  { id: 'bld_nurse', name: 'คณะพยาบาลศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0315, longitude: 99.8985 },
  { id: 'bld_dent', name: 'คณะทันตแพทยศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0275, longitude: 99.8945 },
  { id: 'bld_pharm', name: 'คณะเภสัชศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0295, longitude: 99.8985 },
  { id: 'bld_ah', name: 'คณะสหเวชศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.029, longitude: 99.898 },
  { id: 'bld_law', name: 'คณะนิติศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0345, longitude: 99.896 },
  { id: 'bld_pol', name: 'คณะรัฐศาสตร์และสังคมศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0365, longitude: 99.9 },
  { id: 'bld_sci', name: 'คณะวิทยาศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.032, longitude: 99.8995 },
  { id: 'bld_ms', name: 'คณะวิทยาศาสตร์การแพทย์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0325, longitude: 99.9005 },
  { id: 'bld_bca', name: 'คณะวิทยาการจัดการและสารสนเทศศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.035, longitude: 99.897 },
  { id: 'bld_agr', name: 'คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0305, longitude: 99.8965 },
  { id: 'bld_arch', name: 'คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.03, longitude: 99.8955 },
  { id: 'bld_la', name: 'คณะศิลปศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.033, longitude: 99.893 },
  { id: 'bld_energy', name: 'คณะพลังงานและสิ่งแวดล้อม', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.028, longitude: 99.897 },
  { id: 'bld_edu', name: 'วิทยาลัยการศึกษา', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0355, longitude: 99.898 },
  { id: 'bld_canteen', name: 'โรงอาหารกลาง มหาวิทยาลัยพะเยา', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.029, longitude: 99.896 },
  { id: 'bld_sport', name: 'สนามกีฬา มหาวิทยาลัยพะเยา', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.038, longitude: 99.8955 },
  { id: 'bld_gate1', name: 'ประตู 1 มหาวิทยาลัยพะเยา (หน้ามอ)', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.0286, longitude: 99.8948 },
];

const QUICK_CAMPUS_LANDMARKS = [
  { name: 'อาคาร ICT', lat: 19.027329, lng: 99.8999566 },
  { name: 'อาคารเรียนรวม CE', lat: 19.0275, lng: 99.8965 },
  { name: 'อาคารเรียนรวม PK', lat: 19.028, lng: 99.897 },
  { name: 'หอพักนิสิต 8', lat: 19.037, lng: 99.8935 },
  { name: 'หอสมุดกลาง', lat: 19.0335, lng: 99.894 },
  { name: 'หน้ามอ (ประตู 1)', lat: 19.0286, lng: 99.8948 },
];

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

// ─── Sub-components for Leaflet Map ──────────────────────────────────────────
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapFlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16.5, { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

// ─── Toast System ────────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'warning' | 'info';
interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        let bg = 'bg-slate-900 text-white';
        let icon = '•';
        if (t.variant === 'success') {
          bg = 'bg-emerald-600 text-white';
          icon = '✓';
        } else if (t.variant === 'error') {
          bg = 'bg-rose-600 text-white';
          icon = '✕';
        } else if (t.variant === 'warning') {
          bg = 'bg-amber-600 text-white';
          icon = '⚠';
        }
        return (
          <div
            key={t.id}
            className={`${bg} px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold pointer-events-auto transition-all`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {icon}
            </span>
            <span className="flex-1">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers for Thai Date / Time & Badges ────────────────────────────────────
function formatThaiDateDisplay(isoDateStr: string): string {
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    if (!y || !m || !d) return isoDateStr;
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    return `${d} ${months[m - 1]} ${y}`;
  } catch {
    return isoDateStr;
  }
}

function getDateBadgeInfo(isoDateStr: string): { label: string; bg: string; text: string } {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (isoDateStr === todayStr) {
      return { label: 'วันนี้', bg: 'bg-[#ece2f5]', text: 'text-[#4b267d]' };
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (isoDateStr === yesterdayStr) {
      return { label: 'เมื่อวานนี้', bg: 'bg-amber-100', text: 'text-amber-800' };
    }
    const target = new Date(isoDateStr);
    const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1 && diffDays <= 7) {
      return { label: `${diffDays} วันก่อน`, bg: 'bg-purple-50', text: 'text-purple-700' };
    }
    return { label: 'ระบุแล้ว', bg: 'bg-slate-100', text: 'text-slate-700' };
  } catch {
    return { label: 'ระบุ', bg: 'bg-slate-100', text: 'text-slate-600' };
  }
}

function getTimeBadgeInfo(timeStr: string): { label: string; periodText: string; bg: string; text: string } {
  try {
    const [h] = timeStr.split(':').map(Number);
    if (isNaN(h)) return { label: 'ระบุ', periodText: '', bg: 'bg-slate-100', text: 'text-slate-600' };
    if (h >= 5 && h < 11) {
      return { label: 'ช่วงเช้า', periodText: '(เช้า)', bg: 'bg-amber-50', text: 'text-amber-700' };
    }
    if (h >= 11 && h < 14) {
      return { label: 'ช่วงเที่ยง', periodText: '(กลางวัน)', bg: 'bg-orange-50', text: 'text-orange-700' };
    }
    if (h >= 14 && h < 18) {
      return { label: 'ช่วงบ่าย', periodText: '(บ่าย)', bg: 'bg-blue-50', text: 'text-blue-700' };
    }
    if (h >= 18 && h < 21) {
      return { label: 'ช่วงหัวค่ำ', periodText: '(หัวค่ำ)', bg: 'bg-indigo-50', text: 'text-indigo-700' };
    }
    return { label: 'กลางคืน', periodText: '(กลางคืน)', bg: 'bg-purple-100', text: 'text-purple-800' };
  } catch {
    return { label: 'ระบุ', periodText: '', bg: 'bg-slate-100', text: 'text-slate-600' };
  }
}

function formatThaiTimeDisplay(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const { periodText } = getTimeBadgeInfo(timeStr);
    return `${hh}:${mm} น. ${periodText}`.trim();
  } catch {
    return `${timeStr} น.`;
  }
}

// ─── Token & Role Resolver ───────────────────────────────────────────────────
function parseTokenRole(): { role: string; roleId: number } {
  try {
    const token = localStorage.getItem('access_token');
    if (token) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const binaryStr = window.atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const decoded = new TextDecoder().decode(bytes);
        const payload = JSON.parse(decoded);
        const r = String(payload.role || '').toLowerCase();
        const roleMap: Record<string, number> = {
          student: 1,
          staff: 2,
          public: 3,
          super_admin: 4,
          category_admin: 5,
          anonymous: 6,
        };
        const rId = roleMap[r] || Number(payload.role_id || 0);
        return { role: r, roleId: rId };
      }
    }
  } catch {
    // fallback
  }
  const storedId = Number(localStorage.getItem('role_id') || 0);
  const storedRole = String(localStorage.getItem('role') || '').toLowerCase();
  return { role: storedRole, roleId: storedId };
}

// ─── Main Component Props ─────────────────────────────────────────────────────
interface ReportProblemProps {
  roleId?: number;
  onSuccess?: () => void;
  onUnauthorized?: () => void;
}

export default function ReportProblem({
  roleId: propRoleId,
  onSuccess,
  onUnauthorized,
}: ReportProblemProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const { role: tokenRole, roleId: tokenRoleId } = parseTokenRole();
  const storedRoleId = Number(localStorage.getItem('role_id') || 0);
  const storedRoleName = String(localStorage.getItem('role') || '').toLowerCase();
  const displayName = String(localStorage.getItem('display_name') || '');

  // 1. ตรวจสอบเงื่อนไขไม่ระบุตัวตน (Anonymous) ให้ครอบคลุมทุกจุด
  const isAnonymous =
    tokenRole === 'anonymous' ||
    tokenRoleId === 6 ||
    storedRoleName === 'anonymous' ||
    storedRoleId === 6 ||
    displayName.includes('ไม่ระบุตัวตน') ||
    displayName.toLowerCase().includes('anonymous') ||
    localStorage.getItem('is_anonymous') === 'true' ||
    Boolean(localStorage.getItem('raw_ip'));

  // 2. ตรวจสอบเงื่อนไขนิสิต (Student)
  const isStudent =
    tokenRole === 'student' ||
    tokenRoleId === 1 ||
    storedRoleName === 'student' ||
    storedRoleId === 1;

  // 3. ตรวจสอบเงื่อนไขบุคคลทั่วไป (Citizen / Public)
  const isPublic =
    tokenRole === 'public' ||
    tokenRoleId === 3 ||
    storedRoleName === 'public' ||
    storedRoleId === 3;

  // 4. เฉพาะ "บุคลากร" (Staff / Category Admin / Super Admin) เท่านั้นที่จะเห็นกล่องเลือกการเผยแพร่
  // ไม่ระบุตัวตน (Anonymous), นิสิต (Student), บุคคลทั่วไป (Public) จะไม่เห็นโดยเด็ดขาด
  const isStaffOrAdmin =
    !isAnonymous &&
    !isStudent &&
    !isPublic &&
    (tokenRole === 'staff' ||
      tokenRole === 'super_admin' ||
      tokenRole === 'category_admin' ||
      tokenRoleId === 2 ||
      tokenRoleId === 4 ||
      tokenRoleId === 5 ||
      storedRoleName === 'staff' ||
      storedRoleName === 'super_admin' ||
      storedRoleName === 'category_admin' ||
      storedRoleId === 2 ||
      storedRoleId === 4 ||
      storedRoleId === 5 ||
      propRoleId === 2 ||
      propRoleId === 4 ||
      propRoleId === 5);

  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');

  const prefillData = location.state as
    | {
        title?: string;
        description?: string;
        location?: string;
        latitude?: number | string;
        longitude?: number | string;
      }
    | undefined;

  // ── Form State ────────────────────────────────────────────────────────────
  const [problemTitle, setProblemTitle] = useState(
    prefillData?.title || 'ไฟทางเดินดับ บริเวณทางเชื่อมอาคาร CE และ ICT'
  );
  
  // Default location set to ICT building or UP_CENTER
  const [selectedLocation, setSelectedLocation] = useState<LatLng>({
    lat: prefillData?.latitude ? Number(prefillData.latitude) : UP_CENTER[0],
    lng: prefillData?.longitude ? Number(prefillData.longitude) : UP_CENTER[1],
  });
  const [locationName, setLocationName] = useState<string>(
    prefillData?.location || 'อาคารเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)'
  );
  const [locationDetail, setLocationDetail] = useState<string>(
    'ทางเชื่อมชั้น 2 ฝั่งทิศตะวันออก มุ่งหน้าตึก CE'
  );

  const [incidentDate, setIncidentDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [incidentTime, setIncidentTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const [description, setDescription] = useState<string>(
    prefillData?.description ||
      'ไฟนีออนตรงทางเดินเชื่อมกระพริบถี่ๆ แล้วดับสนิท มืดมากในช่วงหัวค่ำ เกรงว่าจะเกิดอันตรายแก่นิสิตที่เดินกลับหอพักหลังคาบเรียนแลปเลิกดึก'
  );

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // ── Modal States ──────────────────────────────────────────────────────────
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  // Calendar View Navigation
  const [calViewDate, setCalViewDate] = useState<Date>(() => new Date());

  // Map Filter & Building Selection
  const [mapFlyTarget, setMapFlyTarget] = useState<[number, number] | null>(null);
  const [tempLocation, setTempLocation] = useState<LatLng>(selectedLocation);
  const [categories, setCategories] = useState<Category[]>([]);
  const [buildings, setBuildings] = useState<Building[]>(DEFAULT_UP_BUILDINGS);
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ทั้งหมด');
  const [detectedCategory, setDetectedCategory] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);

  // ── Toast State ───────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, variant: ToastVariant = 'error') => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ── Fetch Categories & Merge Buildings from Backend API ───────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch Categories
      try {
        const catRes = await axios.get(`${API_BASE}/problems/categories`, { headers });
        if (!cancelled) {
          const rawData = catRes.data;
          let items: any[] = [];
          if (Array.isArray(rawData)) items = rawData;
          else if (rawData?.data && Array.isArray(rawData.data)) items = rawData.data;
          else if (rawData?.data?.items && Array.isArray(rawData.data.items)) items = rawData.data.items;
          else if (rawData?.items && Array.isArray(rawData.items)) items = rawData.items;

          const formatted: Category[] = items.map((item: any) => ({
            id: item.category_id ?? item.id,
            name: item.category_name ?? item.name,
            description: item.description,
          }));
          setCategories(formatted);
          if (formatted.length > 0 && !detectedCategory) {
            setDetectedCategory(String(formatted[0].id));
          }
        }
      } catch (err) {
        console.warn('Backend categories fetch failed (using default):', err);
      }

      // 2. Fetch Buildings from API and Merge with Default Dataset
      try {
        const bldRes = await axios.get(`${API_BASE}/buildings/`, { headers });
        if (!cancelled) {
          const rawData = bldRes.data;
          let items: any[] = [];
          if (Array.isArray(rawData)) items = rawData;
          else if (rawData?.data && Array.isArray(rawData.data)) items = rawData.data;
          else if (rawData?.data?.items && Array.isArray(rawData.data.items)) items = rawData.data.items;
          else if (rawData?.items && Array.isArray(rawData.items)) items = rawData.items;

          if (items.length > 0) {
            const apiBuildings: Building[] = items
              .filter((item: any) => item.latitude && item.longitude && (item.name || item.building_name))
              .map((item: any) => ({
                id: item.building_id ?? item.id,
                name: item.name ?? item.building_name,
                categoryGroup: item.category_group || 'อาคารทั่วไป',
                latitude: Number(item.latitude),
                longitude: Number(item.longitude),
              }));

            const map = new Map<string, Building>();
            for (const b of DEFAULT_UP_BUILDINGS) {
              map.set(b.name.toLowerCase().trim(), b);
            }
            for (const b of apiBuildings) {
              map.set(b.name.toLowerCase().trim(), b);
            }
            setBuildings(Array.from(map.values()));
          }
        }
      } catch (err) {
        console.warn('Backend buildings fetch failed (using built-in UP locations):', err);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [detectedCategory]);

  // Filtered buildings for search & zone chips
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => {
      const matchZone =
        selectedZoneFilter === 'ทั้งหมด' ||
        b.categoryGroup.includes(selectedZoneFilter) ||
        (selectedZoneFilter === 'อาคารเรียนรวม' && (b.name.includes('CE') || b.name.includes('PK') || b.name.includes('UB'))) ||
        (selectedZoneFilter === 'หอพักนิสิต' && (b.name.includes('หอ') || b.name.includes('Dorm')));

      if (!matchZone) return false;

      if (!buildingSearchQuery.trim()) return true;
      const q = buildingSearchQuery.toLowerCase().trim();
      return b.name.toLowerCase().includes(q) || b.categoryGroup.toLowerCase().includes(q);
    });
  }, [buildings, buildingSearchQuery, selectedZoneFilter]);

  // ── Auto Category Detection in Background ─────────────────────────────────
  useEffect(() => {
    const combinedText = `${problemTitle} ${description}`.trim();
    if (combinedText.length < 5) return;

    const timer = setTimeout(async () => {
      try {
        const res = await axios.post(`${API_BASE}/problems/ai/suggest-category`, {
          description: combinedText,
        });
        if (res.data?.success && res.data?.data?.category_id) {
          setDetectedCategory(String(res.data.data.category_id));
        }
      } catch (err) {
        console.error('Auto category suggestion error:', err);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [problemTitle, description]);

  // ── AI Summarization Button Click ─────────────────────────────────────────
  async function handleAiSummarize() {
    if (!problemTitle.trim() && !description.trim()) {
      showToast('กรุณากรอกปัญหาหรือรายละเอียดก่อน เพื่อให้ AI ช่วยสรุป', 'warning');
      return;
    }

    setIsAiSummarizing(true);
    const contentToSummarize = [
      problemTitle.trim() ? `ปัญหาที่พบ: ${problemTitle.trim()}` : '',
      description.trim() ? `รายละเอียด: ${description.trim()}` : '',
      locationName ? `สถานที่: ${locationName}` : '',
      locationDetail ? `จุดสังเกต: ${locationDetail}` : '',
      incidentDate ? `วันที่: ${incidentDate}` : '',
      incidentTime ? `เวลา: ${incidentTime}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    try {
      const res = await axios.post(`${API_BASE}/problems/ai/expand-description`, {
        description: contentToSummarize,
      });
      if (res.data?.success && res.data?.data?.expanded_text) {
        setDescription(res.data.data.expanded_text);
        showToast('✨ AI ช่วยเรียบเรียงสรุปรายละเอียดให้เรียบร้อยแล้ว!', 'success');
      } else {
        const fallbackText = `ขอแจ้งปัญหา${problemTitle.trim() || 'ความเดือดร้อน'}${
          locationName ? ` บริเวณ${locationName}` : ''
        }${
          locationDetail ? ` (${locationDetail})` : ''
        }${
          incidentDate || incidentTime ? ` ซึ่งเกิดขึ้นเมื่อวันที่ ${incidentDate} เวลา ${incidentTime}` : ''
        } เพื่อให้หน่วยงานที่เกี่ยวข้องเข้าตรวจสอบและดำเนินการแก้ไข`;
        setDescription(fallbackText);
        showToast('✨ เรียบเรียงข้อความสรุปเรียบร้อยแล้ว', 'success');
      }
    } catch (err) {
      console.error('AI summarize failed:', err);
      const fallbackText = `ขอแจ้งปัญหา${problemTitle.trim() || 'ความเดือดร้อน'}${
        locationName ? ` บริเวณ${locationName}` : ''
      }${
        locationDetail ? ` (${locationDetail})` : ''
      } เพื่อให้หน่วยงานที่เกี่ยวข้องเข้าตรวจสอบและดำเนินการแก้ไข`;
      setDescription(fallbackText);
      showToast('✨ เรียบเรียงข้อความสรุปเบื้องต้นเรียบร้อยแล้ว', 'info');
    } finally {
      setIsAiSummarizing(false);
    }
  }

  // ── Image Handling ────────────────────────────────────────────────────────
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      showToast(`ไฟล์ ${file.name} มีขนาดเกิน 5MB`, 'warning');
      return;
    }

    setImages([file]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreviews([ev.target?.result as string]);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage() {
    setImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Map Location Picker Confirmation ──────────────────────────────────────
  function handleOpenMapModal() {
    setTempLocation(selectedLocation);
    setMapFlyTarget([selectedLocation.lat, selectedLocation.lng]);
    setBuildingSearchQuery('');
    setSelectedZoneFilter('ทั้งหมด');
    setIsMapModalOpen(true);
  }

  function handleConfirmMapLocation() {
    setSelectedLocation(tempLocation);
    const matched = buildings.find((b) => {
      if (!b.latitude || !b.longitude) return false;
      const dLat = Math.abs(Number(b.latitude) - tempLocation.lat);
      const dLng = Math.abs(Number(b.longitude) - tempLocation.lng);
      return dLat < 0.0015 && dLng < 0.0015;
    });
    if (matched) {
      setLocationName(matched.name);
    } else if (!locationName) {
      setLocationName(`พิกัด (${tempLocation.lat.toFixed(4)}, ${tempLocation.lng.toFixed(4)})`);
    }
    showToast('📍 บันทึกพิกัดสถานที่เรียบร้อยแล้ว', 'success');
    setIsMapModalOpen(false);
  }

  function handleSelectBuilding(buildingId: string) {
    const b = buildings.find((item) => String(item.id) === String(buildingId));
    if (b && b.latitude && b.longitude) {
      const lat = Number(b.latitude);
      const lng = Number(b.longitude);
      setTempLocation({ lat, lng });
      setMapFlyTarget([lat, lng]);
      setLocationName(b.name);
    }
  }

  function handleJumpToLandmark(landmark: { name: string; lat: number; lng: number }) {
    setTempLocation({ lat: landmark.lat, lng: landmark.lng });
    setMapFlyTarget([landmark.lat, landmark.lng]);
    setLocationName(landmark.name);
  }

  // ── Interactive Calendar Computation ─────────────────────────────────────
  const calendarDays = useMemo(() => {
    const year = calViewDate.getFullYear();
    const month = calViewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: ({ day: number; dateStr: string; isCurrentMonth: boolean } | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push({
        day: d,
        dateStr: `${year}-${mm}-${dd}`,
        isCurrentMonth: true,
      });
    }
    return days;
  }, [calViewDate]);

  const thaiMonthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  // ── Submit Form ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!problemTitle.trim()) {
      showToast('กรุณากรอกปัญหาหรือความเดือดร้อนที่เกิดขึ้น', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();

      let categoryIdToSubmit = detectedCategory;
      if (!categoryIdToSubmit && categories.length > 0) {
        categoryIdToSubmit = String(categories[0].id);
      }
      formData.append('category_id', categoryIdToSubmit || '1');
      formData.append('title', problemTitle.trim());

      const fullDesc = [
        description.trim(),
        locationDetail.trim() ? `\n(จุดสังเกต: ${locationDetail.trim()})` : '',
      ]
        .filter(Boolean)
        .join('');

      formData.append('description', fullDesc || problemTitle.trim());

      if (incidentDate) {
        formData.append('incident_date', incidentDate);
      }
      if (incidentTime) {
        formData.append('incident_time', incidentTime);
      }

      if (locationName) {
        formData.append('building_name', locationName);
      }

      if (selectedLocation) {
        formData.append('latitude', String(selectedLocation.lat));
        formData.append('longitude', String(selectedLocation.lng));
      }

      formData.append('visibility_name', isStaffOrAdmin ? visibility : 'public');

      images.forEach((img) => {
        formData.append('images', img, img.name);
      });

      const response = await axios.post(`${API_BASE}/problems/create`, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.data?.success) {
        showToast('ส่งรายงานปัญหาสำเร็จ! คำร้องถูกส่งไปยังแอดมินหมวดหมู่เพื่อตรวจสอบก่อนเผยแพร่ 🎉', 'success');
        onSuccess?.();
        setTimeout(() => {
          navigate('/tracking');
        }, 1300);
      } else {
        showToast(response.data?.message || 'เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
      }
    } catch (err: unknown) {
      console.error('Submit problem error:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          showToast('หมดอายุการเชื่อมต่อ กรุณาเข้าสู่ระบบใหม่', 'error');
          localStorage.removeItem('access_token');
          onUnauthorized?.();
          navigate('/login');
          return;
        }
        const detail = err.response?.data?.detail || err.response?.data?.message;
        showToast(
          typeof detail === 'string' ? detail : 'ไม่สามารถส่งข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          'error'
        );
      } else {
        showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const dateBadge = getDateBadgeInfo(incidentDate);
  const timeBadge = getTimeBadgeInfo(incidentTime);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-[#f7f5f9] text-[#21172e] pb-16 font-sans">
      <ToastContainer toasts={toasts} />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 pt-4 pb-12">
        
        {/* ── Hero Welcome Banner ── */}
        <section className="relative overflow-hidden rounded-[26px] text-white p-7 sm:p-9 mb-6 shadow-lg bg-gradient-to-r from-[#4b267d] via-[#663d96] to-[#7a51a5] min-h-[148px] flex items-center justify-between">
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
              ร่วมกันแจ้ง ร่วมกันแก้ เพื่อมหาวิทยาลัยที่ดีขึ้น
            </h1>
            <p className="text-sm sm:text-base text-purple-100/90 font-normal leading-relaxed">
              พื้นที่กลางที่ทุกเสียงนำไปสู่การเปลี่ยนแปลง ส่งตรงถึงหน่วยงานที่เกี่ยวข้องและติดตามได้ทุกขั้นตอน
            </p>
          </div>
        </section>

        {/* ── 2-Column Responsive Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ════════ LEFT COLUMN (8 Cols): Main Form ════════ */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 flex flex-col gap-5">
            
            {/* ── SECTION 1: What & Where ── */}
            <div className="bg-white rounded-2xl border border-purple-900/10 shadow-sm p-6 sm:p-7">
              {/* Section Header */}
              <div className="flex items-center gap-3.5 pb-4 mb-5 border-b border-[#f2ecf7]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4b267d] to-[#6f45a7] text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-purple-900/20 shrink-0">
                  1
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#21172e]">
                    ข้อมูลปัญหาและสถานที่ (What &amp; Where)
                  </h2>
                  <p className="text-xs text-[#766d80] mt-0.5">
                    ระบุประเภทปัญหาที่พบและพิกัดตำแหน่งเกิดเหตุให้ชัดเจนเพื่อความแม่นยำ
                  </p>
                </div>
              </div>

              {/* Staff / Admin Visibility Selection */}
              {isStaffOrAdmin && (
                <div className="mb-5 p-4 rounded-xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-white to-amber-50/40">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-[#21172e]">
                      <span className="material-symbols-outlined text-[#4b267d] text-base">tune</span>
                      ระดับการเผยแพร่โพสต์ (สำหรับบุคลากร)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#4b267d]">
                      สิทธิ์บุคลากร
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Public Option */}
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        visibility === 'public'
                          ? 'border-[#4b267d] bg-white ring-2 ring-[#4b267d]/20 shadow-sm'
                          : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">🌐</span>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1">
                          ฟีดสาธารณะ (Public)
                          {visibility === 'public' && (
                            <span className="material-symbols-outlined text-xs text-[#4b267d]">check_circle</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          นิสิต บุคลากร และทุกคนสามารถเห็นและติดตามความคืบหน้าได้
                        </div>
                      </div>
                    </button>

                    {/* Internal Option */}
                    <button
                      type="button"
                      onClick={() => setVisibility('internal')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        visibility === 'internal'
                          ? 'border-[#4b267d] bg-white ring-2 ring-[#4b267d]/20 shadow-sm'
                          : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">🔒</span>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1">
                          ข่าวสารภายใน (Internal)
                          {visibility === 'internal' && (
                            <span className="material-symbols-outlined text-xs text-[#4b267d]">check_circle</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          เฉพาะบุคลากรและเจ้าหน้าที่เท่านั้นที่เห็นในแท็บข่าวสารภายใน
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Problem Title */}
              <div className="mb-5">
                <label className="flex items-baseline justify-between font-bold text-xs sm:text-sm text-[#21172e] mb-1.5">
                  <span>
                    ปัญหาหรือความเดือดร้อนที่เกิดขึ้น <span className="text-rose-600">*</span>
                  </span>
                  <small className="text-[#766d80] font-normal text-[11px]">ระบุสั้นกระชับเข้าใจง่าย</small>
                </label>
                <input
                  type="text"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  placeholder="อธิบายปัญหาที่พบสั้นๆ (เช่น ท่อน้ำแตก, ไฟทางเดินดับ)"
                  className="w-full border-[1.5px] border-[#d4c8e5] bg-[#fdfcfe] focus:bg-white rounded-xl px-4 py-3 text-sm text-[#21172e] outline-none focus:border-[#4b267d] transition-colors"
                />
              </div>

              {/* Location Picker & Sub-location */}
              <div className="space-y-2.5">
                <label className="block font-bold text-xs sm:text-sm text-[#21172e]">
                  พิกัดและสถานที่เกิดเหตุ <span className="text-rose-600">*</span>
                </label>
                
                {/* Location Selection Box */}
                <div
                  onClick={handleOpenMapModal}
                  className="flex items-center justify-between border-[1.5px] border-[#d4c8e5] bg-[#faf8fd] hover:bg-purple-50/50 rounded-xl p-3.5 sm:p-4 cursor-pointer transition-all hover:border-[#4b267d] group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fed65b]/30 to-[#fbf5dc] text-[#4b267d] border border-amber-300/40 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                      📍
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[#21172e] truncate">
                        {locationName}
                      </div>
                      <div className="text-xs text-[#766d80] font-mono mt-0.5">
                        พิกัด GPS: {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E (ปักหมุดแล้ว)
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenMapModal();
                    }}
                    className="shrink-0 text-xs font-bold text-[#4b267d] bg-white border border-[#d4c8e5] px-3.5 py-2 rounded-xl shadow-xs hover:bg-[#f5f0fa] transition flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#4b267d]">pin_drop</span>
                    เปลี่ยนหมุดแผนที่
                  </button>
                </div>

                {/* Sub-location / Landmark Details */}
                <input
                  type="text"
                  value={locationDetail}
                  onChange={(e) => setLocationDetail(e.target.value)}
                  placeholder="ระบุจุดสังเกตหรือห้อง เช่น ชั้น 2 ทางเชื่อมไปตึกวิศวกรรมศาสตร์ หน้าห้อง ICT204"
                  className="w-full border-[1.5px] border-[#e6dfef] bg-white focus:bg-[#fdfcfe] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#21172e] outline-none focus:border-[#4b267d] transition-colors"
                />
              </div>
            </div>

            {/* ── SECTION 2: When & Details with AI ── */}
            <div className="bg-white rounded-2xl border border-purple-900/10 shadow-sm p-6 sm:p-7">
              {/* Section Header */}
              <div className="flex items-center gap-3.5 pb-4 mb-5 border-b border-[#f2ecf7]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4b267d] to-[#6f45a7] text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-purple-900/20 shrink-0">
                  2
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#21172e]">
                    วันเวลาและรายละเอียด
                  </h2>
                </div>
              </div>

              {/* Date & Time Grid */}
              <div className="mb-5">
                <label className="block font-bold text-xs sm:text-sm text-[#21172e] mb-2">
                  ช่วงเวลาที่พบเหตุการณ์ (คลิกเพื่อเลือกวัน/เวลา)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* Date Card (Clickable to open interactive Calendar Dialog) */}
                  <div
                    onClick={() => {
                      setCalViewDate(new Date(incidentDate || new Date()));
                      setIsDatePickerOpen(true);
                    }}
                    className="relative flex items-center justify-between border-[1.5px] border-[#e6dfef] bg-[#fdfcfe] hover:bg-white rounded-xl px-4 py-3 hover:border-[#4b267d] transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 text-sm font-bold text-[#21172e]">
                      <span className="material-symbols-outlined text-[20px] text-[#4b267d]">calendar_month</span>
                      <span>{formatThaiDateDisplay(incidentDate)}</span>
                    </div>
                    <span className={`text-[11px] font-bold ${dateBadge.bg} ${dateBadge.text} px-2.5 py-0.5 rounded-md`}>
                      {dateBadge.label}
                    </span>
                  </div>

                  {/* Time Card (Clickable to open interactive Time Dialog) */}
                  <div
                    onClick={() => setIsTimePickerOpen(true)}
                    className="relative flex items-center justify-between border-[1.5px] border-[#e6dfef] bg-[#fdfcfe] hover:bg-white rounded-xl px-4 py-3 hover:border-[#4b267d] transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 text-sm font-bold text-[#21172e]">
                      <span className="material-symbols-outlined text-[20px] text-[#4b267d]">schedule</span>
                      <span>{formatThaiTimeDisplay(incidentTime)}</span>
                    </div>
                    <span className={`text-[11px] font-bold ${timeBadge.bg} ${timeBadge.text} px-2.5 py-0.5 rounded-md`}>
                      {timeBadge.label}
                    </span>
                  </div>

                </div>
              </div>

              {/* Detailed Description + AI Assistant Button */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-xs sm:text-sm text-[#21172e]">
                    สรุปรายละเอียดปัญหา
                  </label>
                  <button
                    type="button"
                    onClick={handleAiSummarize}
                    disabled={isAiSummarizing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-white text-xs font-bold shadow-md shadow-purple-900/15 transition-transform hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, rgb(112, 76, 163) 0%, rgb(75, 38, 125) 100%)' }}
                  >
                    {isAiSummarizing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>กำลังเรียบเรียง...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                        <span>ช่วยเรียบเรียงสรุป</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="อธิบายรายละเอียดเพิ่มเติม เช่น อาการที่พบ ผลกระทบ หรือจำนวนผู้เดือดร้อน..."
                  className="w-full border-[1.5px] border-[#d4c8e5] bg-[#fdfcfe] focus:bg-white rounded-xl p-3.5 text-xs sm:text-sm text-[#21172e] outline-none focus:border-[#4b267d] transition-colors resize-y min-h-[95px] leading-relaxed"
                />
              </div>

            </div>

            {/* ── SECTION 3: Visual Evidence ── */}
            <div className="bg-white rounded-2xl border border-purple-900/10 shadow-sm p-6 sm:p-7">
              {/* Section Header */}
              <div className="flex items-center gap-3.5 pb-4 mb-5 border-b border-[#f2ecf7]">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4b267d] to-[#6f45a7] text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-purple-900/20 shrink-0">
                  3
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#21172e]">
                    ภาพถ่ายหลักฐาน (Visual Evidence)
                  </h2>
                  <p className="text-xs text-[#766d80] mt-0.5">
                    แนบรูปถ่ายเพื่อให้ช่างหรือเจ้าหน้าที่เตรียมอุปกรณ์ได้ตรงจุด
                  </p>
                </div>
              </div>

              {/* Upload Box & Previews */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleImageChange}
                className="hidden"
              />

              <div className={`grid ${imagePreviews.length > 0 ? 'grid-cols-1 sm:grid-cols-[1fr_140px]' : 'grid-cols-1'} gap-4 items-stretch`}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#cfbfe3] hover:border-[#6b35d6] bg-[#faf7fd] hover:bg-purple-50/50 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center group min-h-[140px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#efe6fa] text-[#6b35d6] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[26px]">add_photo_alternate</span>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-[#21172e] mb-1">
                    คลิกเพื่ออัปโหลด หรือลากไฟล์มาวางที่นี่
                  </div>
                  <div className="text-[11px] text-[#766d80]">
                    รองรับไฟล์ JPG, PNG, HEIC (สูงสุด 5MB ต่อรูป)
                  </div>
                </div>

                {/* Uploaded Thumbnail Preview */}
                {imagePreviews.length > 0 && (
                  <div className="relative rounded-2xl overflow-hidden border border-[#cfbfe3] bg-white h-[140px] shadow-xs group">
                    <img
                      src={imagePreviews[0]}
                      alt="Uploaded preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-xs hover:bg-rose-600 transition"
                      title="ลบรูปภาพ"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white text-[10px] py-1 px-2 text-center truncate">
                      {images[0]?.name || 'ภาพหลักฐาน'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Submit Button & Action Footnote ── */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[54px] rounded-2xl text-white font-bold text-base shadow-lg shadow-purple-900/20 transition-all hover:opacity-95 active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, rgb(75, 38, 125) 0%, rgb(107, 53, 214) 100%)' }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังส่งโพสต์แจ้งปัญหา...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    <span>ส่งโพสต์แจ้งปัญหา</span>
                  </>
                )}
              </button>

              <p className="text-center text-[11px] sm:text-xs text-[#766d80] mt-3">
                คำร้องของคุณจะได้รับการรักษาความปลอดภัยตามนโยบายคุ้มครองข้อมูลส่วนบุคคลของมหาวิทยาลัยพะเยา
              </p>
            </div>

          </form>

          {/* ════════ RIGHT COLUMN (4 Cols): Helper & Insight Sidebar ════════ */}
          <aside className="lg:col-span-4 space-y-5">
            
            {/* Mini Campus Map Preview Card */}
            <div className="bg-white rounded-2xl border border-purple-900/10 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-sm sm:text-base text-[#21172e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#4b267d]">map</span>
                  พิกัดบนแผนที่ มพ.
                </h3>
                <span className="text-[11px] text-[#6b35d6] font-bold bg-[#f5f0fa] px-2 py-0.5 rounded-md truncate max-w-[150px]">
                  {locationName.split(' ')[0] || 'โซนการศึกษา'}
                </span>
              </div>

              {/* Map Preview Container */}
              <div className="h-[155px] rounded-xl overflow-hidden border border-[#e9e3ee] relative bg-slate-100">
                <MapContainer
                  center={[selectedLocation.lat, selectedLocation.lng]}
                  zoom={16}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  className="w-full h-full z-0"
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={upCustomPinIcon} />
                  <MapFlyTo center={[selectedLocation.lat, selectedLocation.lng]} />
                </MapContainer>

                {/* Bottom Overlay Badge */}
                <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#4b267d] border border-slate-200 shadow-xs z-[400] flex items-center gap-1">
                  <span>📍</span>
                  <span>โซนการศึกษา มพ.</span>
                </div>
              </div>

              <div className="mt-3 text-xs text-[#766d80] flex items-center justify-between">
                <span className="font-mono text-[11px]">
                  {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
                </span>
                <button
                  type="button"
                  onClick={handleOpenMapModal}
                  className="text-[#6b35d6] font-bold hover:underline text-xs"
                >
                  ปรับพิกัด
                </button>
              </div>
            </div>

            {/* Quick Tips Card */}
            <div className="bg-white rounded-2xl border border-purple-900/10 shadow-sm p-5 space-y-3">
              <h3 className="font-extrabold text-sm sm:text-base text-[#21172e] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-500">tips_and_updates</span>
                ข้อแนะนำในการแจ้งเรื่อง
              </h3>
              
              <ul className="text-xs text-[#766d80] space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>แนบภาพถ่ายให้เห็นจุดชำรุดและมุมกว้างเพื่อให้ช่างระบุอุปกรณ์ได้ถูกต้อง</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>ระบุชื่อชั้น ห้อง หรือจุดสังเกต เช่น "หน้าห้อง ICT204"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>ระบบ AI จะช่วยแนะนำหมวดหมู่และหน่วยงานที่รับผิดชอบให้ทันที</span>
                </li>
              </ul>
            </div>

          </aside>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── INTERACTIVE DATE PICKER DIALOG (CALENDAR) ───────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-purple-100 animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#4b267d] to-[#6f45a7] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#fed65b]">calendar_month</span>
                <span className="font-bold text-sm">ปฏิทินระบุวันที่เกิดเหตุ</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Date Presets */}
            <div className="p-3 bg-[#faf8fd] border-b border-purple-100/60 flex items-center gap-2 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setIncidentDate(d.toISOString().split('T')[0]);
                  setCalViewDate(d);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 ${
                  incidentDate === new Date().toISOString().split('T')[0]
                    ? 'bg-[#4b267d] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-purple-50'
                }`}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setIncidentDate(d.toISOString().split('T')[0]);
                  setCalViewDate(d);
                }}
                className="px-3 py-1.5 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 hover:bg-purple-50 transition shrink-0"
              >
                เมื่อวานนี้
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 2);
                  setIncidentDate(d.toISOString().split('T')[0]);
                  setCalViewDate(d);
                }}
                className="px-3 py-1.5 rounded-lg font-bold bg-white text-slate-700 border border-slate-200 hover:bg-purple-50 transition shrink-0"
              >
                2 วันก่อน
              </button>
            </div>

            {/* Month & Year Navigation */}
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <span className="font-extrabold text-sm text-[#21172e]">
                {thaiMonthNames[calViewDate.getMonth()]} {calViewDate.getFullYear() + 543}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const prev = new Date(calViewDate);
                    prev.setMonth(prev.getMonth() - 1);
                    setCalViewDate(prev);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(calViewDate);
                    next.setMonth(next.getMonth() + 1);
                    setCalViewDate(next);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 px-4 py-1.5">
              <span>อา</span>
              <span>จ</span>
              <span>อ</span>
              <span>พ</span>
              <span>พฤ</span>
              <span>ศ</span>
              <span>ส</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 px-4 pb-4">
              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <div key={`empty-${idx}`} className="h-9" />;
                }
                const isSelected = item.dateStr === incidentDate;
                const isToday = item.dateStr === new Date().toISOString().split('T')[0];

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => {
                      setIncidentDate(item.dateStr);
                    }}
                    className={`h-9 rounded-xl flex items-center justify-center text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#4b267d] text-white font-bold shadow-md shadow-purple-900/30 scale-105'
                        : isToday
                        ? 'bg-purple-100/70 text-[#4b267d] font-bold border border-purple-200'
                        : 'text-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    {item.day}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-600">
                วันที่เลือก: <strong>{formatThaiDateDisplay(incidentDate)}</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-[#4b267d] text-white text-xs font-bold shadow-sm hover:bg-[#340866] transition"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── INTERACTIVE TIME PICKER DIALOG ──────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isTimePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col border border-purple-100 animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-[#4b267d] to-[#6f45a7] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#fed65b]">schedule</span>
                <span className="font-bold text-sm">เลือกระบุเวลาเกิดเหตุการณ์</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Time Display & Period Status */}
            <div className="p-5 text-center bg-[#faf8fd] border-b border-purple-100/60 flex flex-col items-center">
              <div className="text-3xl font-extrabold text-[#4b267d] font-mono tracking-wider mb-1">
                {incidentTime} น.
              </div>
              <span className={`inline-block text-xs font-bold ${timeBadge.bg} ${timeBadge.text} px-3 py-1 rounded-full`}>
                {timeBadge.label} {timeBadge.periodText}
              </span>
            </div>

            {/* Quick Time Preset Chips */}
            <div className="p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                เลือกช่วงเวลาเร่งด่วน:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    setIncidentTime(t);
                  }}
                  className="px-3 py-2 rounded-xl bg-purple-50 text-[#4b267d] font-bold border border-purple-200 hover:bg-purple-100 transition text-left flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>เวลานี้ (ปัจจุบัน)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentTime('08:30')}
                  className="px-3 py-2 rounded-xl bg-slate-50 text-slate-700 font-semibold border border-slate-200 hover:bg-purple-50 transition text-left flex items-center gap-1.5"
                >
                  <span>🌅</span>
                  <span>ช่วงเช้า (08:30 น.)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentTime('12:15')}
                  className="px-3 py-2 rounded-xl bg-slate-50 text-slate-700 font-semibold border border-slate-200 hover:bg-purple-50 transition text-left flex items-center gap-1.5"
                >
                  <span>☀️</span>
                  <span>พักเที่ยง (12:15 น.)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentTime('15:30')}
                  className="px-3 py-2 rounded-xl bg-slate-50 text-slate-700 font-semibold border border-slate-200 hover:bg-purple-50 transition text-left flex items-center gap-1.5"
                >
                  <span>🌤️</span>
                  <span>ช่วงบ่าย (15:30 น.)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentTime('19:00')}
                  className="px-3 py-2 rounded-xl bg-slate-50 text-slate-700 font-semibold border border-slate-200 hover:bg-purple-50 transition text-left flex items-center gap-1.5"
                >
                  <span>🌆</span>
                  <span>ช่วงหัวค่ำ (19:00 น.)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncidentTime('21:30')}
                  className="px-3 py-2 rounded-xl bg-slate-50 text-slate-700 font-semibold border border-slate-200 hover:bg-purple-50 transition text-left flex items-center gap-1.5"
                >
                  <span>🌙</span>
                  <span>ช่วงกลางคืน (21:30 น.)</span>
                </button>
              </div>

              {/* Exact Time Input */}
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  หรือระบุเวลาด้วยตนเอง:
                </label>
                <input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-[#21172e] focus:outline-none focus:border-[#4b267d]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#4b267d] text-white text-xs font-bold shadow-sm hover:bg-[#340866] transition"
              >
                ยืนยันเวลานี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── UP CONNECT BRANDED LEAFLET MAP MODAL ────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[26px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-purple-200">
            
            {/* Modal Header with UP Brand Gradient */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#4b267d] via-[#663d96] to-[#7a51a5] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-[#fed65b] border border-white/20 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">map</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                    เลือกพิกัดสถานที่เกิดเหตุ มหาวิทยาลัยพะเยา
                  </h3>
                  <p className="text-xs text-purple-200/90 font-normal">
                    แตะบนแผนที่ หรือเลือกจากจุดสำคัญและอาคารใน มพ.
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                title="ปิด"
              >
                ✕
              </button>
            </div>

            {/* Quick Landmarks Jump Bar */}
            <div className="px-6 py-2.5 bg-[#fbf9fe] border-b border-purple-100 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="font-bold text-[#4b267d] shrink-0 text-[11px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">near_me</span>
                จุดหลัก:
              </span>
              {QUICK_CAMPUS_LANDMARKS.map((lm) => (
                <button
                  key={lm.name}
                  type="button"
                  onClick={() => handleJumpToLandmark(lm)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#e6dfef] hover:border-[#4b267d] hover:bg-purple-50 text-slate-700 text-[11px] font-semibold transition shrink-0"
                >
                  {lm.name}
                </button>
              ))}
            </div>

            {/* Building Search & Category Chips */}
            <div className="p-4 sm:p-5 bg-white border-b border-slate-100 space-y-3">
              {/* Search Filter Input */}
              <div className="relative">
                <input
                  type="text"
                  value={buildingSearchQuery}
                  onChange={(e) => setBuildingSearchQuery(e.target.value)}
                  placeholder="พิมพ์ค้นหาชื่อตึก/อาคาร/คณะ... (เช่น ICT, หอพัก 8, CE, หอสมุด)"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#faf8fd] border border-[#d4c8e5] text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4b267d] focus:bg-white transition"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[19px]">
                  search
                </span>
                {buildingSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBuildingSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Zone Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {['ทั้งหมด', 'อาคารเรียนรวม', 'คณะ/วิทยาลัย', 'หอพักนิสิต', 'อาคารบริหาร/บริการ'].map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => setSelectedZoneFilter(zone)}
                    className={`px-3 py-1 rounded-full font-bold transition shrink-0 ${
                      selectedZoneFilter === zone
                        ? 'bg-[#4b267d] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-[#4b267d]'
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>

              {/* Building Dropdown */}
              <select
                onChange={(e) => handleSelectBuilding(e.target.value)}
                defaultValue=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf8fd] border border-[#d4c8e5] text-xs sm:text-sm text-slate-800 font-semibold focus:outline-none focus:border-[#4b267d] cursor-pointer"
              >
                <option value="" disabled>
                  -- เลือกอาคาร/สถานที่ ({filteredBuildings.length} แห่ง) --
                </option>
                {filteredBuildings.map((b) => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {b.name} [{b.categoryGroup}]
                  </option>
                ))}
              </select>
            </div>

            {/* Leaflet Map Preview with Custom Pin */}
            <div className="relative w-full h-80 sm:h-96 bg-slate-100">
              <MapContainer
                center={[tempLocation.lat, tempLocation.lng]}
                zoom={16.5}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler
                  onLocationSelect={(latlng) => setTempLocation(latlng)}
                />
                <MapFlyTo center={mapFlyTarget} />
                <Marker position={new LeafletLatLng(tempLocation.lat, tempLocation.lng)} icon={upCustomPinIcon} />
              </MapContainer>

              {/* Floating Coordinates HUD */}
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-100 shadow-md z-[400] text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono font-bold text-[#4b267d]">
                  {tempLocation.lat.toFixed(4)}° N, {tempLocation.lng.toFixed(4)}° E
                </span>
              </div>

              {/* Floating Instruction Banner */}
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl text-xs text-slate-700 border border-slate-200 shadow-md z-[400] text-center font-medium flex items-center justify-center gap-2">
                <span className="text-[#4b267d] font-bold">💡 คำแนะนำ:</span>
                <span>แตะหรือคลิกบริเวณใดก็ได้บนแผนที่เพื่อย้ายตำแหน่งหมุดพิกัด</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-purple-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="text-xs text-slate-600 truncate flex-1">
                สถานที่ที่เลือก: <strong className="text-[#4b267d] text-sm">{locationName}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMapLocation}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4b267d] to-[#6f45a7] hover:from-[#340866] hover:to-[#55278c] text-white text-xs font-bold transition shadow-md shadow-purple-900/20 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  ยืนยันตำแหน่งนี้
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
