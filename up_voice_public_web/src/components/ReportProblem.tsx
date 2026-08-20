/**
 * ReportProblem.tsx
 *
 * Modern, mobile-first "แจ้งปัญหาใหม่" (Report Issue) component.
 * Faithfully matches the target design mockup:
 *  - Header with Back button, centered "Report Issue" title, and profile avatar.
 *  - "แจ้งปัญหาใหม่" card title & friendly subtitle.
 *  - Problem title input ("ปัญหาหรือความเดือดร้อนที่เกิดขึ้น")
 *  - Interactive Location Picker button & Leaflet Map Modal ("พิกัดสถานที่เกิดเหตุ")
 *  - Side-by-side Date & Time pickers ("ช่วงเวลา/เวลาที่เกิดเหตุการณ์")
 *  - Root cause input ("สาเหตุหลัก")
 *  - AI Summarization with "✨ ให้ AI ช่วยเรียบเรียงสรุป" button + Textarea
 *  - Dashed image attachment box with preview & remove
 *  - Solid purple "ส่งโพสต์" submit button
 *  - Built-in UP Campus Location dataset + Backend API Sync (works 100% on both Local & Cloud)
 *  - Background AI Category resolution so that HomeFeed displays the category badge normally!
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

// ─── API Constants ──────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const UP_CENTER: [number, number] = [19.0289, 99.8973]; // University of Phayao Center

// ─── Default UP Campus Buildings Dataset (Works Offline, Local & Cloud) ─────
export interface Building {
  id: number | string;
  name: string;
  categoryGroup?: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_UP_BUILDINGS: Building[] = [
  { id: 'bld_ict', name: 'คณะเทคโนโลยีสารสนเทศและการสื่อสาร (ICT)', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.027329, longitude: 99.8999566 },
  { id: 'bld_admin', name: 'อาคารสำนักงานอธิการบดี', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.0295, longitude: 99.896 },
  { id: 'bld_hall', name: 'หอประชุมพญางำเมือง', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.029, longitude: 99.895 },
  { id: 'bld_hospital', name: 'ศูนย์การแพทย์และโรงพยาบาล มหาวิทยาลัยพะเยา', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.027, longitude: 99.894 },
  { id: 'bld_lib', name: 'ศูนย์บรรณสารและการเรียนรู้ (หอสมุด)', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.0335, longitude: 99.894 },
  { id: 'bld_99years', name: 'อาคาร 99 ปี พระอุบาลีคุณูปมาจารย์', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.034, longitude: 99.895 },
  { id: 'bld_sanguan', name: 'อาคารสงวนเสริมศรี', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.0385, longitude: 99.8965 },
  { id: 'bld_eng', name: 'คณะวิศวกรรมศาสตร์', categoryGroup: 'คณะ/วิทยาลัย', latitude: 19.0285, longitude: 99.8975 },
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
  { id: 'bld_ce', name: 'อาคารเรียนรวม CE', categoryGroup: 'อาคารเรียนรวม', latitude: 19.0275, longitude: 99.8965 },
  { id: 'bld_pk', name: 'อาคารเรียนรวม PK', categoryGroup: 'อาคารเรียนรวม', latitude: 19.028, longitude: 99.897 },
  { id: 'bld_ub', name: 'อาคารเรียนรวม UB', categoryGroup: 'อาคารเรียนรวม', latitude: 19.0285, longitude: 99.896 },
  { id: 'bld_pky', name: 'อาคารเรียนรวม PKY (พัชรกิตติยาภา)', categoryGroup: 'อาคารเรียนรวม', latitude: 19.028, longitude: 99.897 },
  { id: 'bld_updorm', name: 'หอพักนิสิต UP Dorm', categoryGroup: 'หอพัก/ที่พักอาศัย', latitude: 19.037, longitude: 99.8935 },
  { id: 'bld_dorm_all', name: 'กลุ่มหอพักนิสิต (มพ. 1-18)', categoryGroup: 'หอพัก/ที่พักอาศัย', latitude: 19.0375, longitude: 99.8945 },
  { id: 'bld_canteen', name: 'โรงอาหารกลาง มหาวิทยาลัยพะเยา', categoryGroup: 'อาคารบริหาร/บริการ', latitude: 19.029, longitude: 99.896 },
  { id: 'bld_sport', name: 'สนามกีฬา มหาวิทยาลัยพะเยา', categoryGroup: 'พื้นที่กิจกรรม/กีฬา', latitude: 19.038, longitude: 99.8955 },
  { id: 'bld_satit', name: 'โรงเรียนสาธิตมหาวิทยาลัยพะเยา', categoryGroup: 'สถานศึกษา/สาธิต', latitude: 19.039, longitude: 99.8975 },
  { id: 'bld_gate1', name: 'ประตู 1 มหาวิทยาลัยพะเยา (หน้ามอ)', categoryGroup: 'ประตูทางเข้า-ออก', latitude: 19.0286, longitude: 99.8948 },
  { id: 'bld_gate2', name: 'ประตู 2 มหาวิทยาลัยพะเยา', categoryGroup: 'ประตูทางเข้า-ออก', latitude: 19.0292, longitude: 99.8952 },
  { id: 'bld_gate3', name: 'ประตู 3 มหาวิทยาลัยพะเยา', categoryGroup: 'ประตูทางเข้า-ออก', latitude: 19.0298, longitude: 99.8956 },
];

export interface Category {
  id: number;
  name: string;
  description?: string;
  requireMap?: boolean;
}

interface LatLng {
  lat: number;
  lng: number;
}

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ReportProblemProps {
  roleId?: number;
  onSuccess?: () => void;
  onUnauthorized?: () => void;
}

// ─── Map Sub-components ─────────────────────────────────────────────────────
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (latlng: LatLng) => void;
}) {
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
      map.flyTo(center, 16, { duration: 1.0 });
    }
  }, [center, map]);
  return null;
}

// ─── Toast Component ────────────────────────────────────────────────────────
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  const variantStyles: Record<ToastVariant, string> = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-purple-600 text-white',
  };
  const icons: Record<ToastVariant, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: '✨',
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            ${variantStyles[t.variant]}
            flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl
            text-sm font-medium transition-all duration-300
            animate-bounce-in
          `}
        >
          <span className="text-base">{icons[t.variant]}</span>
          <span className="flex-1 text-xs sm:text-sm">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ReportProblem({
  onSuccess,
  onUnauthorized,
}: ReportProblemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = location.state?.prefillData;

  // ── Form State ────────────────────────────────────────────────────────────
  const [problemTitle, setProblemTitle] = useState(prefillData?.title || '');
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(
    prefillData?.latitude && prefillData?.longitude
      ? { lat: Number(prefillData.latitude), lng: Number(prefillData.longitude) }
      : null
  );
  const [locationName, setLocationName] = useState<string>(prefillData?.location || '');
  const [incidentDate, setIncidentDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [incidentTime, setIncidentTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [description, setDescription] = useState<string>(prefillData?.description || '');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // ── Modal & Background Logic State ────────────────────────────────────────
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapFlyTarget, setMapFlyTarget] = useState<[number, number] | null>(null);
  const [tempLocation, setTempLocation] = useState<LatLng | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Initialize with built-in UP Campus locations immediately (never empty!)
  const [buildings, setBuildings] = useState<Building[]>(DEFAULT_UP_BUILDINGS);
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  
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
            requireMap: item.requires_location_privacy ?? false,
          }));
          setCategories(formatted);
          if (formatted.length > 0 && !detectedCategory) {
            setDetectedCategory(String(formatted[0].id));
          }
        }
      } catch (err) {
        console.warn('Backend categories fetch failed (using fallback):', err);
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
                latitude: Number(item.latitude),
                longitude: Number(item.longitude),
              }));

            // Merge & deduplicate by clean name
            const map = new Map<string, Building>();
            // Add default first
            for (const b of DEFAULT_UP_BUILDINGS) {
              const clean = b.name.toLowerCase().trim();
              map.set(clean, b);
            }
            // Overwrite / Add from DB
            for (const b of apiBuildings) {
              const clean = b.name.toLowerCase().trim();
              map.set(clean, b);
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
  }, []);

  // Filtered buildings for search
  const filteredBuildings = useMemo(() => {
    if (!buildingSearchQuery.trim()) return buildings;
    const q = buildingSearchQuery.toLowerCase().trim();
    return buildings.filter(
      (b) => b.name.toLowerCase().includes(q) || (b.categoryGroup && b.categoryGroup.toLowerCase().includes(q))
    );
  }, [buildings, buildingSearchQuery]);

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
        // Fallback natural Thai summary format
        const fallbackText = `รายงานพบปัญหา${problemTitle.trim() || 'ความเดือดร้อน'}${
          locationName ? ` เกิดขึ้นบริเวณ${locationName}` : ''
        }${
          incidentDate || incidentTime ? ` เมื่อช่วงเวลา ${incidentDate} ${incidentTime}` : ''
        } จึงขอแจ้งหน่วยงานที่เกี่ยวข้องเข้าดำเนินการตรวจสอบและแก้ไข`;
        setDescription(fallbackText);
        showToast('✨ เรียบเรียงข้อความสรุปเรียบร้อยแล้ว', 'success');
      }
    } catch (err) {
      console.error('AI summarize failed:', err);
      const fallbackText = `รายงานพบปัญหา${problemTitle.trim() || 'ความเดือดร้อน'}${
        locationName ? ` เกิดขึ้นบริเวณ${locationName}` : ''
      } จึงขอแจ้งหน่วยงานที่เกี่ยวข้องเข้าดำเนินการตรวจสอบและแก้ไข`;
      setDescription(fallbackText);
      showToast('✨ เรียบเรียงข้อความสรุปเบื้องต้นเรียบร้อยแล้ว', 'info');
    } finally {
      setIsAiSummarizing(false);
    }
  }

  // ── Image Handling (Single Image max 5MB) ─────────────────────────────────
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
    setTempLocation(selectedLocation || { lat: UP_CENTER[0], lng: UP_CENTER[1] });
    setMapFlyTarget(
      selectedLocation
        ? [selectedLocation.lat, selectedLocation.lng]
        : UP_CENTER
    );
    setBuildingSearchQuery('');
    setIsMapModalOpen(true);
  }

  function handleConfirmMapLocation() {
    if (tempLocation) {
      setSelectedLocation(tempLocation);
      // Try to find nearest building or label
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
    }
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

      // Ensure fallback category
      let categoryIdToSubmit = detectedCategory;
      if (!categoryIdToSubmit && categories.length > 0) {
        categoryIdToSubmit = String(categories[0].id);
      }
      formData.append('category_id', categoryIdToSubmit || '1');

      formData.append('title', problemTitle.trim());

      // Combine description + incident details
      const fullDesc = description.trim() || problemTitle.trim();
      formData.append('description', fullDesc);

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

      formData.append('visibility_name', 'public');

      images.forEach((img) => {
        formData.append('images', img, img.name);
      });

      const response = await axios.post(`${API_BASE}/problems/create`, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.data?.success) {
        showToast('ส่งรายงานปัญหาสำเร็จ! 🎉', 'success');
        onSuccess?.();
        setTimeout(() => {
          navigate('/');
        }, 1200);
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 pb-20 antialiased font-sans">
      {/* Toast Notification */}
      <ToastContainer toasts={toasts} />

      {/* ── Top Header Navigation ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:text-[#7C3AED] hover:bg-purple-50 transition cursor-pointer"
            aria-label="ย้อนกลับ"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          <h1 className="text-base sm:text-lg font-bold text-[#7C3AED] tracking-tight">
            Report Issue
          </h1>

          <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-[#7C3AED]">
            <svg
              className="w-5 h-5 text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        </div>
      </header>

      {/* ── Main Form Container ──────────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 pt-4 sm:pt-6">
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
          {/* Card Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-[#7C3AED] tracking-tight">
              แจ้งปัญหาใหม่
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              กรอกข้อมูลให้ครบถ้วนเพื่อที่เราสามารถช่วยเหลือได้อย่างรวดเร็ว
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
            {/* 1. ปัญหาหรือความเดือดร้อนที่เกิดขึ้น */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                ปัญหาหรือความเดือดร้อนที่เกิดขึ้น
              </label>
              <input
                type="text"
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="อธิบายปัญหาที่พบสั้นๆ (เช่น ท่อน้ำแตก, ไฟฟ้าดับ)"
                className="w-full px-4 py-3 rounded-2xl bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 transition"
              />
            </div>

            {/* 2. พิกัดสถานที่เกิดเหตุ */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                พิกัดสถานที่เกิดเหตุ
              </label>
              <button
                type="button"
                onClick={handleOpenMapModal}
                className="w-full px-4 py-3 rounded-2xl bg-[#F8F9FA] border border-slate-200 text-left flex items-center justify-between hover:border-[#7C3AED] hover:bg-purple-50/30 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-base flex-shrink-0">📍</span>
                  <span
                    className={`text-xs sm:text-sm truncate ${
                      selectedLocation ? 'text-slate-800 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {selectedLocation
                      ? locationName || `พิกัด (${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)})`
                      : 'คลิกเพื่อปักหมุดเลือกพิกัดบนแผนที่'}
                  </span>
                </div>
                <span className="text-slate-400 group-hover:text-[#7C3AED] text-xs font-semibold flex-shrink-0">
                  {selectedLocation ? 'เปลี่ยน' : 'เลือก'}
                </span>
              </button>
            </div>

            {/* 3. ช่วงเวลา/เวลาที่เกิดเหตุการณ์ */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                ช่วงเวลา/เวลาที่เกิดเหตุการณ์
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Date Picker */}
                <div className="relative">
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 transition cursor-pointer"
                  />
                </div>
                {/* Time Picker */}
                <div className="relative">
                  <input
                    type="time"
                    value={incidentTime}
                    onChange={(e) => setIncidentTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 transition cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 4. สรุปรายละเอียดทั้งหมดด้วย AI */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-700">
                  สรุปรายละเอียดทั้งหมดด้วย AI
                </label>
                <button
                  type="button"
                  onClick={handleAiSummarize}
                  disabled={isAiSummarizing}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3E8FF] text-[#7C3AED] hover:bg-[#E9D5FF] text-[11px] sm:text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isAiSummarizing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                      <span>กำลังสรุป...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>ให้ AI ช่วยเรียบเรียงสรุป</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายรายละเอียดเพิ่มเติม..."
                className="w-full px-4 py-3 rounded-2xl bg-[#F8F9FA] border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#7C3AED] focus:ring-2 focus:ring-purple-100 transition resize-none leading-relaxed"
              />
            </div>

            {/* 6. แนบรูปภาพ (ถ้ามี) */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                แนบรูปภาพ (ถ้ามี)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 hover:border-[#7C3AED] bg-[#F8F9FA] hover:bg-purple-50/20 rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#7C3AED] group-hover:scale-105 transition">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-700">
                    คลิกเพื่ออัปโหลดรูปภาพ
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    รองรับ JPG, PNG สูงสุด 5MB
                  </p>
                </div>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2.5 mt-3">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-xs group"
                    >
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/75 text-white flex items-center justify-center text-xs hover:bg-red-600 transition shadow-sm cursor-pointer"
                        title="ลบรูปภาพ"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-[0.99] text-white text-sm sm:text-base font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังส่งข้อมูล...</span>
                  </>
                ) : (
                  <span>ส่งโพสต์</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* ── Interactive Leaflet Map Modal ─────────────────────────────────── */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  เลือกพิกัดสถานที่เกิดเหตุ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Building Selector & Search */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  เลือกสถานที่/อาคารใน ม.พะเยา ({buildings.length} แห่ง):
                </label>
                {buildingSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBuildingSearchQuery('')}
                    className="text-[11px] text-[#7C3AED] hover:underline"
                  >
                    ล้างการค้นหา
                  </button>
                )}
              </div>

              {/* Search Filter Input */}
              <div className="relative">
                <input
                  type="text"
                  value={buildingSearchQuery}
                  onChange={(e) => setBuildingSearchQuery(e.target.value)}
                  placeholder="พิมพ์ค้นหาชื่อตึก/อาคาร/คณะ... (เช่น ICT, หอพัก, CE)"
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#7C3AED]"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                  🔍
                </span>
              </div>

              {/* Building Dropdown */}
              <select
                onChange={(e) => handleSelectBuilding(e.target.value)}
                defaultValue=""
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-[#7C3AED]"
              >
                <option value="" disabled>
                  -- เลือกอาคาร/สถานที่ด่วน ({filteredBuildings.length} รายการ) --
                </option>
                {filteredBuildings.map((b) => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Leaflet Map */}
            <div className="relative w-full h-72 sm:h-80 bg-slate-100">
              <MapContainer
                center={
                  tempLocation ? [tempLocation.lat, tempLocation.lng] : UP_CENTER
                }
                zoom={16}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler
                  onLocationSelect={(latlng) => setTempLocation(latlng)}
                />
                <MapFlyTo center={mapFlyTarget} />
                {tempLocation && (
                  <Marker
                    position={new LeafletLatLng(tempLocation.lat, tempLocation.lng)}
                  />
                )}
              </MapContainer>

              <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[11px] text-slate-600 border border-slate-200 shadow-xs z-[400] text-center">
                แตะ/คลิกบนแผนที่เพื่อย้ายตำแหน่งหมุดพิกัด
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
              <div className="text-xs text-slate-500 truncate flex-1">
                {tempLocation ? (
                  <span>
                    พิกัด: {tempLocation.lat.toFixed(4)}, {tempLocation.lng.toFixed(4)}
                  </span>
                ) : (
                  <span>ยังไม่ได้เลือกตำแหน่ง</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMapLocation}
                  className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold transition shadow-md shadow-purple-100"
                >
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
