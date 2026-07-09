/**
 * ReportProblem.tsx
 *
 * React + TypeScript migration of Flutter's CreateProblemScreen.
 * Faithfully reproduces:
 *  - Dynamic category / building fetching
 *  - "Smart Location Privacy" (hide map when category = 'การเรียนการสอน')
 *  - Building selection → auto-pan Leaflet map
 *  - Image upload with preview
 *  - Visibility dropdown (roleId 2 or 4 only)
 *  - Multipart form submit to /api/v1/problems/create
 *  - 401 redirect to login
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L, { LatLng as LeafletLatLng } from 'leaflet';

// ─── Fix Leaflet default marker icon in Vite ────────────────────────────────
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

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE = 'http://127.0.0.1:8000/api/v1';

// University of Phayao default map centre
const UP_CENTER: [number, number] = [19.0289, 99.8973];

// ─── TypeScript Interfaces ───────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Building {
  id: number;
  name: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

// (ApiListResponse interface removed)

interface LatLng {
  lat: number;
  lng: number;
}

// ─── Toast types ─────────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

// ─── Props ───────────────────────────────────────────────────────────────────
export interface ReportProblemProps {
  /** Mirrors Flutter's roleId: 0 = general public, 1 = student, 2 = staff, 4 = admin */
  roleId?: number;
  /** Called on successful submit so parent can navigate away */
  onSuccess?: () => void;
  /** Called when session expires (401) so parent can redirect to login */
  onUnauthorized?: () => void;
}

// (extractItems helper removed)

// ─── Sub-component: Map click handler ────────────────────────────────────────
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

// ─── Sub-component: Fly to a position programmatically ───────────────────────
function MapFlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// ─── Toast component ─────────────────────────────────────────────────────────
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  const variantStyles: Record<ToastVariant, string> = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-amber-500 text-white',
  };
  const icons: Record<ToastVariant, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            ${variantStyles[t.variant]}
            flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl
            text-sm font-medium
            animate-[slideUp_0.3s_ease-out_forwards]
          `}
        >
          <span>{icons[t.variant]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportProblem({
  roleId = 0,
  onSuccess,
  onUnauthorized,
}: ReportProblemProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');

  // ── Data state ──────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Image state ──────────────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Map state ────────────────────────────────────────────────────────────────
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [mapFlyTarget, setMapFlyTarget] = useState<[number, number] | null>(null);

  // ── Toast state ──────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  // ── Role (may be overridden by token stored in localStorage) ─────────────────
  const [currentRoleId, setCurrentRoleId] = useState(roleId);

  // ── Smart Location Privacy: hide map for 'การเรียนการสอน' category ───────────
  const isTeachingCategory = React.useMemo(() => {
    if (!selectedCategory) return false;
    const cat = categories.find((c) => String(c.id) === selectedCategory);
    return cat?.name === 'การเรียนการสอน';
  }, [selectedCategory, categories]);

  // ─── Toast helpers ────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, variant: ToastVariant = 'error') => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ─── Fetch dropdown data on mount ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchDropdownData() {
      setIsFetchingData(true);
      
      const savedRoleId = localStorage.getItem('role_id');
      if (savedRoleId && !cancelled) {
        setCurrentRoleId(Number(savedRoleId));
      }

      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch Categories
      try {
        const catRes = await axios.get(`${API_BASE}/problems/categories`, { headers });
        console.log('Categories Raw Data:', catRes.data);
        if (!cancelled) {
          const rawData = catRes.data;
          // Extract array from nested payload like { data: { items: [...] } }
          const itemsArray = Array.isArray(rawData) ? rawData : (rawData?.data?.items || rawData?.data || rawData?.items || []);
          // Normalize to match Category interface
          const formatted = itemsArray.map((item: any) => ({
            id: item.category_id ?? item.id,
            name: item.category_name ?? item.name,
            description: item.description,
          }));
          setCategories(formatted);
        }
      } catch (err) {
        if (!cancelled) console.error('🚨 ไม่สามารถดึงข้อมูลหมวดหมู่ได้:', err);
      }

      // 2. Fetch Buildings (Trailing slash added to prevent 307 redirect)
      try {
        const bldRes = await axios.get(`${API_BASE}/buildings/`, { headers });
        console.log('Buildings Raw Data:', bldRes.data);
        if (!cancelled) {
          const rawData = bldRes.data;
          const itemsArray = Array.isArray(rawData) ? rawData : (rawData?.data?.items || rawData?.data || rawData?.items || []);
          // Normalize to match Building interface
          const formatted = itemsArray.map((item: any) => ({
            id: item.building_id ?? item.id,
            name: item.name ?? item.building_name,
            latitude: item.latitude,
            longitude: item.longitude,
          }));
          setBuildings(formatted);
        }
      } catch (err) {
        if (!cancelled) console.error('🚨 ไม่สามารถดึงข้อมูลอาคารได้:', err);
      }

      if (!cancelled) setIsFetchingData(false);
    }

    fetchDropdownData();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Image picker ─────────────────────────────────────────────────────────────
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ─── Building selection → auto-pan map ───────────────────────────────────────
  function handleBuildingChange(buildingId: string) {
    setSelectedBuilding(buildingId);
    const b = buildings.find((bld) => String(bld.id) === buildingId);
    if (b?.latitude != null && b?.longitude != null) {
      const lat = parseFloat(String(b.latitude));
      const lng = parseFloat(String(b.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        setSelectedLocation({ lat, lng });
        setMapFlyTarget([lat, lng]);
      }
    }
  }

  // ─── Category change + clear location when teaching ──────────────────────────
  function handleCategoryChange(catId: string) {
    setSelectedCategory(catId);
    const cat = categories.find((c) => String(c.id) === catId);
    if (cat?.name === 'การเรียนการสอน') {
      setSelectedLocation(null);
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation (mirrors Flutter)
    if (title.trim().length < 5) {
      showToast('กรุณาระบุหัวข้อปัญหาอย่างน้อย 5 ตัวอักษร', 'warning');
      return;
    }
    if (description.trim().length < 10) {
      showToast('กรุณาอธิบายรายละเอียดอย่างน้อย 10 ตัวอักษร', 'warning');
      return;
    }
    if (!selectedCategory || !selectedBuilding) {
      showToast('กรุณาเลือกหมวดหมู่และสถานที่', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');

      const formData = new FormData();
      formData.append('category_id', selectedCategory);
      formData.append('building_id', selectedBuilding);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('visibility_name', visibility);
      if (selectedLocation) {
        formData.append('latitude', String(selectedLocation.lat));
        formData.append('longitude', String(selectedLocation.lng));
      }
      if (imageFile) {
        formData.append('image', imageFile, imageFile.name);
      }

      const response = await axios.post(
        `${API_BASE}/problems/create`,
        formData,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Let axios set multipart boundary automatically
          },
        }
      );

      const data = response.data;

      if (data.success === true) {
        // Reset form (mirrors Flutter setState reset)
        setTitle('');
        setDescription('');
        setSelectedCategory('');
        setSelectedBuilding('');
        setSelectedLocation(null);
        setMapFlyTarget(null);
        setVisibility('public');
        clearImage();
        showToast('ส่งรายงานปัญหาสำเร็จ! 🎉', 'success');
        onSuccess?.();
      } else {
        showToast(data.message ?? 'เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          showToast('หมดอายุการเชื่อมต่อ กรุณาเข้าสู่ระบบใหม่', 'error');
          localStorage.removeItem('access_token');
          localStorage.removeItem('role_id');
          onUnauthorized?.();
          return;
        }
        const msg = err.response?.data?.message;
        showToast(
          msg ??
            `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (${err.response?.status ?? 'network error'})`,
          'error'
        );
      } else {
        showToast('เกิดข้อผิดพลาดที่ไม่คาดคิด', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Role badge ───────────────────────────────────────────────────────────────
  const roleMeta: Record<number, { label: string; icon: string }> = {
    0: { label: 'บุคคลทั่วไป', icon: '👤' },
    1: { label: 'นิสิต มพ.', icon: '🎓' },
    2: { label: 'บุคลากร มพ.', icon: '🪪' },
    4: { label: 'ผู้ดูแลระบบ', icon: '🛡️' },
    5: { label: localStorage.getItem('display_name') || 'ผู้เยี่ยมชม', icon: '👤' },
  };
  const { label: roleLabel, icon: roleIcon } =
    roleMeta[currentRoleId] ?? roleMeta[0];

  const canSetVisibility = currentRoleId === 2 || currentRoleId === 4;

  // ─── Leaflet marker position ──────────────────────────────────────────────────
  const markerPosition: LeafletLatLng | null = selectedLocation
    ? new LeafletLatLng(selectedLocation.lat, selectedLocation.lng)
    : null;

  // ─── Shared input classes ─────────────────────────────────────────────────────
  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 ' +
    'outline-none transition focus:border-[#2B164D] focus:ring-2 focus:ring-[#2B164D]/20 disabled:opacity-50';

  const selectCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 ' +
    'outline-none transition focus:border-[#2B164D] focus:ring-2 focus:ring-[#2B164D]/20 disabled:opacity-50 cursor-pointer';

  // ─── Loading skeleton while fetching dropdown data ────────────────────────────
  if (isFetchingData && categories.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#2B164D] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Page wrapper ── */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100 py-8 px-4">
        {/* ── Header ── */}
        <header className="max-w-[550px] mx-auto mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2B164D] flex items-center justify-center shadow-md shadow-[#2B164D]/20">
            <span className="text-lg">📝</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#2B164D] leading-tight m-0">
              สร้างโพสต์แจ้งปัญหา
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              University Social Listening Platform
            </p>
          </div>
        </header>

        {/* ── Card ── */}
        <main className="max-w-[550px] mx-auto">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6">
            {/* Subtitle */}
            <p className="text-center text-xs text-slate-500 font-medium mb-5 m-0">
              กรุณากรอกข้อมูลและสถานที่ให้ชัดเจนเพื่อการแก้ไขที่รวดเร็ว
            </p>

            {/* ── Role badge ── */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-slate-700">
                บทบาทของคุณ:
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-semibold text-[#2B164D]">
                <span>{roleIcon}</span>
                {roleLabel}
              </span>
            </div>

            <hr className="border-slate-100 mb-5" />

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5"
              noValidate
            >
              {/* ── Visibility ── */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700">
                  ระดับการมองเห็น
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={visibility === 'public'}
                      onChange={() => setVisibility('public')}
                      disabled={isSubmitting}
                      className="accent-[#2B164D] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-slate-700 font-medium">สาธารณะ (Public)</span>
                  </label>
                  
                  {/* ซ่อนตัวเลือกภายในสำหรับ Guest/บุคคลทั่วไป/นิสิต */}
                  {(currentRoleId === 2 || currentRoleId === 4 || currentRoleId === 5) && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="internal"
                        checked={visibility === 'internal'}
                        onChange={() => setVisibility('internal')}
                        disabled={isSubmitting}
                        className="accent-[#2B164D] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 font-medium">เฉพาะบุคลากร (Staff Only)</span>
                    </label>
                  )}
                </div>
              </div>

              {/* ── Title ── */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="report-title"
                  className="text-xs font-bold text-slate-700"
                >
                  หัวข้อปัญหา
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  id="report-title"
                  type="text"
                  className={inputCls}
                  placeholder="ระบุหัวข้อปัญหาที่ต้องการแจ้ง (อย่างน้อย 5 ตัวอักษร)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={200}
                />
                <span className="text-[11px] text-slate-400 self-end">
                  {title.length}/200
                </span>
              </div>

              {/* ── Category ── */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="report-category"
                  className="text-xs font-bold text-slate-700"
                >
                  หมวดหมู่ปัญหา
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <select
                  id="report-category"
                  className={selectCls}
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={isSubmitting || isFetchingData}
                >
                  <option value="" disabled>
                    {isFetchingData ? 'กำลังโหลด...' : 'เลือกหมวดหมู่'}
                  </option>
                  {categories.map((cat, idx) => (
                    <option key={cat.id || `cat-${idx}`} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Building / Location ── */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="report-building"
                  className="text-xs font-bold text-slate-700"
                >
                  สถานที่ / อาคาร
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <select
                  id="report-building"
                  className={selectCls}
                  value={selectedBuilding}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  disabled={isSubmitting || isFetchingData}
                >
                  <option value="" disabled>
                    {isFetchingData
                      ? 'กำลังโหลด...'
                      : 'เลือกสถานที่ / อาคาร'}
                  </option>
                  {buildings.map((bld, idx) => (
                    <option key={bld.id || `bld-${idx}`} value={String(bld.id)}>
                      {bld.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Description ── */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="report-description"
                  className="text-xs font-bold text-slate-700"
                >
                  รายละเอียดปัญหาที่พบเจอ
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <textarea
                  id="report-description"
                  className={`${inputCls} resize-none`}
                  rows={4}
                  placeholder="พิมพ์ข้อความบรรยายปัญหาของคุณ... (อย่างน้อย 10 ตัวอักษร)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={2000}
                />
                <span className="text-[11px] text-slate-400 self-end">
                  {description.length}/2000
                </span>
              </div>

              {/* ── Image Upload ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  รูปภาพประกอบ
                  <span className="text-slate-400 font-normal ml-1">
                    (ไม่บังคับ)
                  </span>
                </label>

                {imagePreview ? (
                  /* Preview with remove button */
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full object-cover max-h-52"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition"
                      aria-label="Remove image"
                    >
                      <span className="text-white text-sm leading-none">
                        ✕
                      </span>
                    </button>
                  </div>
                ) : (
                  /* Upload zone */
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="
                      w-full h-28 rounded-xl border-2 border-dashed border-slate-200
                      bg-slate-50 hover:bg-purple-50/50 hover:border-[#2B164D]/30
                      flex flex-col items-center justify-center gap-2
                      transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    <span className="text-3xl">☁️</span>
                    <span className="text-xs text-slate-500">
                      คลิกเพื่ออัปโหลดรูปภาพ
                    </span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* ── Leaflet Map (hidden for 'การเรียนการสอน') ── */}
              {!isTeachingCategory && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      พิกัดสถานที่
                      <span className="text-slate-400 font-normal ml-1">
                        (ไม่บังคับ)
                      </span>
                    </label>
                    {selectedLocation && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLocation(null);
                          setMapFlyTarget(null);
                        }}
                        className="text-[11px] text-red-500 hover:text-red-700 transition font-medium"
                      >
                        ล้างพิกัด
                      </button>
                    )}
                  </div>

                  {/* Map container */}
                  <div className="rounded-xl overflow-hidden border border-slate-200 h-52">
                    <MapContainer
                      center={UP_CENTER}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <MapClickHandler onLocationSelect={setSelectedLocation} />
                      <MapFlyTo center={mapFlyTarget} />
                      {markerPosition && <Marker position={markerPosition} />}
                    </MapContainer>
                  </div>

                  <p className="text-[11px] text-slate-500 m-0">
                    {selectedLocation
                      ? `📍 พิกัดที่เลือก: ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`
                      : '📍 แตะบนแผนที่เพื่อระบุตำแหน่ง'}
                  </p>
                </div>
              )}

              {/* ── Smart Privacy Notice ── */}
              {isTeachingCategory && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                  <span className="text-amber-500 mt-0.5">🔒</span>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed m-0">
                    <strong>Smart Location Privacy:</strong>{' '}
                    ปิดการระบุพิกัดแผนที่สำหรับหมวดหมู่{' '}
                    &ldquo;การเรียนการสอน&rdquo; เพื่อปกป้องความเป็นส่วนตัว
                  </p>
                </div>
              )}

              {/* ── Submit button ── */}
              <button
                id="report-submit-btn"
                type="submit"
                disabled={isSubmitting || isFetchingData}
                className="
                  w-full h-12 rounded-xl font-bold text-sm text-white
                  bg-[#2B164D] hover:bg-[#3d2268]
                  active:scale-[0.98]
                  shadow-lg shadow-[#2B164D]/25
                  transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
                  flex items-center justify-center gap-2
                "
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังส่ง...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>ส่งโพสต์แจ้งปัญหา</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-[11px] text-slate-400 mt-4 pb-4 m-0">
            ข้อมูลของคุณจะถูกส่งไปยังทีมงานที่รับผิดชอบโดยตรง
          </p>
        </main>
      </div>

      {/* ── Toast notifications ── */}
      <ToastContainer toasts={toasts} />

      {/* ── Slide-up animation ── */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
