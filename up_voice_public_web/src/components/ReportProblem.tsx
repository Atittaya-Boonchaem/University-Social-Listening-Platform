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
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import AIChatWidget from './AIChatWidget';
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
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// University of Phayao default map centre
const UP_CENTER: [number, number] = [19.0289, 99.8973];

// ─── TypeScript Interfaces ───────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  description?: string;
  requireMap?: boolean;
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
  const location = useLocation();
  const prefillData = location.state?.prefillData;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [description, setDescription] = useState(prefillData?.description || '');
  const [title, setTitle] = useState(prefillData?.title || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');
  const [locationConfidence, setLocationConfidence] = useState<number | null>(null);
  const [needsLocationConfirmation, setNeedsLocationConfirmation] = useState<boolean>(false);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [isAiExpanding, setIsAiExpanding] = useState(false);
  const [customBuildingName, setCustomBuildingName] = useState('');

  const handleAiChatComplete = (data: any) => {
    if (data.description && data.description.trim()) {
      setDescription(data.description);
    }
    if (data.title && data.title.trim()) {
      setTitle(data.title);
    }
    if (data.category_id) {
      setSelectedCategory(String(data.category_id));
    } else if (data.category_name) {
      const matchedCat = categories.find(c => c.name.includes(data.category_name) || data.category_name.includes(c.name));
      if (matchedCat) setSelectedCategory(String(matchedCat.id));
    }
    if (data.location && !data.location.includes('ไม่ระบุ') && !data.location.includes('ไม่พบ')) {
      const matchedBuilding = buildings.find(b => data.location.includes(b.name) || b.name.includes(data.location));
      if (matchedBuilding) {
        setSelectedBuilding(String(matchedBuilding.id));
        if (matchedBuilding.latitude && matchedBuilding.longitude) {
          setSelectedLocation({ lat: matchedBuilding.latitude, lng: matchedBuilding.longitude });
          setMapFlyTarget([matchedBuilding.latitude, matchedBuilding.longitude]);
        }
      } else {
        setSelectedBuilding('other');
        setCustomBuildingName(data.location);
      }
    }
    if (data.latitude && data.longitude) {
      setSelectedLocation({ lat: data.latitude, lng: data.longitude });
      setMapFlyTarget([data.latitude, data.longitude]);
    }
    if (data.location_confidence !== undefined) {
      setLocationConfidence(data.location_confidence);
    }
    if (data.needs_location_confirmation !== undefined) {
      setNeedsLocationConfirmation(data.needs_location_confirmation);
    }
    showToast('✨ AI ช่วยเลือกหมวดหมู่และปักพิกัดตำแหน่งบนแผนที่ให้อัตโนมัติเรียบร้อยแล้ว!', 'success');
  };

  const handleAiSuggest = async () => {
    if (description.trim().length < 10) {
      showToast('โปรดพิมพ์รายละเอียดปัญหาอย่างน้อย 10 ตัวอักษรก่อนให้ AI ช่วยเลือก', 'warning');
      return;
    }
    
    setIsAiSuggesting(true);
    try {
      const response = await axios.post(`${API_BASE}/problems/ai/suggest-category`, {
        description: description.trim()
      });
      if (response.data?.success && response.data?.data?.category_id) {
        const suggestedId = String(response.data.data.category_id);
        setSelectedCategory(suggestedId);
        showToast('🪄 AI ช่วยเลือกหมวดหมู่ให้แล้ว!', 'success');
      } else {
        showToast('AI ไม่สามารถแนะนำหมวดหมู่ได้', 'warning');
      }
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI', 'error');
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleAiExpand = async () => {
    if (description.trim().length < 5) {
      showToast('โปรดพิมพ์รายละเอียดปัญหาเบื้องต้นก่อนให้ AI ช่วยเขียน', 'warning');
      return;
    }
    
    setIsAiExpanding(true);
    try {
      const response = await axios.post(`${API_BASE}/problems/ai/expand-description`, {
        description: description.trim()
      });
      if (response.data?.success && response.data?.data?.expanded_text) {
        setDescription(response.data.data.expanded_text);
        showToast('🪄 AI ช่วยขยายความรายละเอียดปัญหาให้แล้ว!', 'success');
      } else {
        showToast('AI ไม่สามารถขยายความได้ในขณะนี้', 'warning');
      }
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI', 'error');
    } finally {
      setIsAiExpanding(false);
    }
  };

  // ─── Reset map location when selected building changes ──────────────────────────────────────────────────────────────
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Map state ────────────────────────────────────────────────────────────────
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [mapFlyTarget, setMapFlyTarget] = useState<[number, number] | null>(null);

  // ── Toast state ──────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  // ── Role (may be overridden by token stored in localStorage) ─────────────────
  const [currentRoleId, setCurrentRoleId] = useState(roleId);

  // ── Smart Location Privacy: hide map based on category requires_location_privacy ───────────
  const { requiresMap, isTeachingCategory } = React.useMemo(() => {
    if (!selectedCategory) return { requiresMap: false, isTeachingCategory: false };
    const cat = categories.find((c) => String(c.id) === selectedCategory);
    return {
      requiresMap: cat?.requireMap ?? false,
      isTeachingCategory: cat?.name === 'การเรียนการสอน',
    };
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
          let itemsArray: any[] = [];
          if (Array.isArray(rawData)) itemsArray = rawData;
          else if (rawData?.data && Array.isArray(rawData.data)) itemsArray = rawData.data;
          else if (rawData?.data?.items && Array.isArray(rawData.data.items)) itemsArray = rawData.data.items;
          else if (rawData?.items && Array.isArray(rawData.items)) itemsArray = rawData.items;
          // Normalize to match Category interface
          const formatted = itemsArray.map((item: any) => ({
            id: item.category_id ?? item.id,
            name: item.category_name ?? item.name,
            description: item.description,
            requireMap: item.requires_location_privacy ?? false,
          }));
          setCategories(formatted);
          if (formatted.length > 0) {
            // Do not select default category to force user to choose or use AI
          }
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
          let itemsArray: any[] = [];
          if (Array.isArray(rawData)) itemsArray = rawData;
          else if (rawData?.data && Array.isArray(rawData.data)) itemsArray = rawData.data;
          else if (rawData?.data?.items && Array.isArray(rawData.data.items)) itemsArray = rawData.data.items;
          else if (rawData?.items && Array.isArray(rawData.items)) itemsArray = rawData.items;
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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    if (images.length + files.length > 1) {
      showToast('สามารถอัปโหลดรูปภาพได้สูงสุด 1 รูปเท่านั้น', 'warning');
      return;
    }
    
    setImages(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  function clearAllImages() {
    setImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ─── Building selection → auto-pan map ───────────────────────────────────────
  function handleBuildingChange(buildingId: string) {
    setSelectedBuilding(buildingId);
    if (buildingId === 'other') {
      setMapFlyTarget(null);
      return;
    }
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

  // ─── Category change + clear location when not requiresMap ──────────────────────────


  // ─── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation (mirrors Flutter)
    if (!selectedCategory) {
      showToast('กรุณาเลือกหมวดหมู่ปัญหาอย่างน้อย 1 หมวดหมู่', 'warning');
      return;
    }
    if (requiresMap && !selectedBuilding) {
      showToast('กรุณาเลือกสถานที่เกิดเหตุ (หรือระบุอาคาร/สถานที่)', 'warning');
      return;
    }
    if (description.trim().length < 10) {
      showToast('กรุณากรอกรายละเอียดปัญหาอย่างน้อย 10 ตัวอักษร', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');

      const formData = new FormData();
      formData.append('category_id', selectedCategory);
      if (selectedBuilding === 'other') {
        if (!customBuildingName.trim()) {
          showToast('กรุณาระบุชื่อสถานที่', 'warning');
          setIsSubmitting(false);
          return;
        }
        formData.append('building_name', customBuildingName.trim());
      } else {
        formData.append('building_id', selectedBuilding);
      }
      
      // Auto-generate title from the first 50 characters of description
      const generatedTitle = description.trim().length > 50 
        ? description.trim().substring(0, 50) + '...' 
        : description.trim();
      formData.append('title', title || generatedTitle);
      formData.append('description', description.trim());
      formData.append('visibility_name', visibility);
      if (selectedLocation && requiresMap) {
        formData.append('latitude', String(selectedLocation.lat));
        formData.append('longitude', String(selectedLocation.lng));
      }
      if (images.length > 0) {
        if (locationConfidence !== null) {
        formData.append('location_confidence', String(locationConfidence));
      }
      formData.append('is_location_confirmed', String(!needsLocationConfirmation));

      images.forEach((img) => {
          formData.append('images', img, img.name);
        });
      }

      console.log("Submitting Payload:", Object.fromEntries(formData.entries()));
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
        setDescription('');
        setSelectedCategory('');
        setSelectedBuilding('');
        setCustomBuildingName('');
        setSelectedLocation(null);
        setMapFlyTarget(null);
        setVisibility('public');
        const ticketId = data?.data?.item?.ticket_id;
        const msg = ticketId ? `ส่งรายงานปัญหาสำเร็จ! 🎉 (รหัสติดตามปัญหา: ${ticketId})` : 'ส่งรายงานปัญหาสำเร็จ! 🎉';
        showToast(msg, 'success');
        onSuccess?.();
      } else {
        showToast(data.message ?? 'เกิดข้อผิดพลาดในการส่งข้อมูล', 'error');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response) {
          console.error("Backend Validation Error (400/422):", err.response.data);
          if (err.response.status === 401) {
            showToast('หมดอายุการเชื่อมต่อ กรุณาเข้าสู่ระบบใหม่', 'error');
            localStorage.removeItem('access_token');
            localStorage.removeItem('role_id');
            onUnauthorized?.();
            return;
          }
          const detail = err.response.data.detail || err.response.data;
          showToast(
            typeof detail === 'string' ? detail : JSON.stringify(detail),
            'error'
          );
        } else {
          console.error("Network Error:", err.message);
          showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (network error)', 'error');
        }
      } else {
        console.error("Unexpected Error:", err);
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
  const { label: _roleLabel, icon: _roleIcon } =
    roleMeta[currentRoleId] ?? roleMeta[0];

  const canSetVisibility = currentRoleId === 2 || currentRoleId === 4;

  // ─── Leaflet marker position ──────────────────────────────────────────────────
  const markerPosition: LeafletLatLng | null = selectedLocation
    ? new LeafletLatLng(selectedLocation.lat, selectedLocation.lng)
    : null;

  // ─── Shared input classes ─────────────────────────────────────────────────────


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
    <div className="min-h-screen bg-surface text-on-surface antialiased pb-24 font-body-md">
      {/* Desktop Sticky TopAppBar */}
      <header className="md:hidden fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-3xl">hub</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-extrabold text-primary tracking-tight">UP Connect</h1>
        </div>
      </header>

      <main className="pt-24 md:pt-8 pb-32 px-4 md:px-8 flex justify-center">
        <div className="w-full max-w-2xl">
          {/* Header Section */}
          <div className="mb-8 text-center">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">แจ้งปัญหา (Report Issue)</h2>
            <p className="font-body-md text-body-md text-outline">รายงานปัญหาหรือข้อเสนอแนะเพื่อพัฒนาพื้นที่ภายในมหาวิทยาลัยพะเยา</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl overflow-hidden shadow-sm" noValidate>
            <div className="p-6 md:p-10 space-y-8">
              


              {/* Category Selection Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="block font-label-md text-label-md text-on-surface-variant font-bold">หมวดหมู่ปัญหา (Category) <span className="text-error">*</span></label>
                  <button type="button" onClick={handleAiSuggest} disabled={isAiSuggesting || isFetchingData} className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50">
                    {isAiSuggesting ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> : '🪄'}
                    {isAiSuggesting ? 'กำลังวิเคราะห์...' : 'ให้ AI ช่วยเลือก'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === String(cat.id);
                    


                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(String(cat.id))}
                        disabled={isSubmitting || isFetchingData}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-outline-variant bg-surface hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        <span className={`font-label-sm text-label-sm text-center ${isSelected ? 'text-primary font-bold' : 'text-on-surface'}`}>
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Chat Widget */}
              <div className="mb-6">
                <AIChatWidget onComplete={handleAiChatComplete} />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <label className="block font-label-md text-label-md text-on-surface-variant font-bold">รายละเอียดปัญหา <span className="text-error">*</span></label>
                  <button type="button" onClick={handleAiExpand} disabled={isAiExpanding} className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50">
                    {isAiExpanding ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> : '🪄'}
                    {isAiExpanding ? 'กำลังเขียน...' : 'ให้ AI ช่วยเขียน'}
                  </button>
                </div>
                <textarea
                  className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-xl font-body-md text-body-md p-4 transition-all min-h-[140px] resize-none outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="ระบุรายละเอียดเพิ่มเติมเพื่อช่วยให้เจ้าหน้าที่เข้าใจสถานการณ์ได้ดีขึ้น... (อย่างน้อย 10 ตัวอักษร)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={2000}
                />
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center h-5">
                  </div>
                  <div className="text-[11px] text-outline text-right">{description.length}/2000</div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block font-label-md text-label-md text-on-surface-variant font-bold">หลักฐานรูปภาพ <span className="text-outline font-normal">(สูงสุด 1 รูป)</span></label>
                  {images.length > 0 && <span className="text-[11px] text-outline font-medium">{images.length}/1</span>}
                </div>
                
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2 mb-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative rounded-xl overflow-hidden border border-outline-variant group/preview aspect-video bg-surface-container-low">
                        <img src={preview} alt={`preview-${index}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" onClick={() => removeImage(index)} className="bg-error text-white px-4 py-2 rounded-full font-label-md flex items-center gap-1 shadow-lg">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            ลบรูป
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {images.length < 1 && (
                  <div 
                    className="relative group cursor-pointer flex flex-col items-center justify-center py-8 border-2 border-dashed border-outline-variant rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={isSubmitting}
                    />
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                        <span className="material-symbols-outlined text-2xl">upload_file</span>
                      </div>
                      <p className="font-label-md text-label-md text-on-surface font-semibold">อัปโหลดรูปภาพ</p>
                      <p className="font-label-sm text-label-sm text-outline mt-1">คลิกเพื่อเลือกรูปภาพ</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              {(requiresMap || customBuildingName || selectedLocation || selectedBuilding) ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="font-label-md text-label-md text-on-surface-variant font-bold">ระบุพิกัดที่เกิดปัญหา <span className="text-error">*</span></label>
                    {selectedLocation && (
                      <button type="button" onClick={() => { setSelectedLocation(null); setMapFlyTarget(null); }} className="flex items-center gap-1 text-error text-label-sm font-bold hover:underline transition-all">
                        <span className="material-symbols-outlined text-base">location_off</span>
                        ล้างพิกัด
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">apartment</span>
                    <select
                      className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-xl font-body-md text-body-md p-3 pl-12 transition-all appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedBuilding}
                      onChange={(e) => handleBuildingChange(e.target.value)}
                      disabled={isSubmitting || isFetchingData}
                    >
                      <option value="" disabled>{isFetchingData ? 'กำลังโหลด...' : 'ค้นหาจุดสำคัญ หรือระบุอาคาร...'}</option>
                      {buildings.map((bld, idx) => (
                        <option key={bld.id || `bld-${idx}`} value={String(bld.id)}>{bld.name}</option>
                      ))}
                      <option value="other">อื่นๆ (ระบุเอง)</option>
                    </select>
                  </div>

                  {selectedBuilding === 'other' && (
                    <div className="animate-[slideUp_0.2s_ease-out_forwards]">
                      <input
                        type="text"
                        placeholder="กรุณาระบุชื่อสถานที่..."
                        value={customBuildingName}
                        onChange={(e) => setCustomBuildingName(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-xl font-body-md text-body-md p-3 transition-all outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )}

                  <div className="h-48 rounded-xl border border-outline-variant overflow-hidden relative bg-surface-container-low">
                    <MapContainer center={UP_CENTER} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                      <MapClickHandler onLocationSelect={setSelectedLocation} />
                      <MapFlyTo center={mapFlyTarget} />
                      {markerPosition && <Marker position={markerPosition} />}
                    </MapContainer>
                    {!selectedLocation && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/5 pointer-events-none z-[400]">
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-outline-variant flex items-center gap-2">
                          <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                          <span className="text-label-sm font-medium text-on-surface">คลิกเพื่อระบุพิกัด หรือเลือกอาคาร</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Smart Privacy Notice */}
              {isTeachingCategory && (
                <div className="flex items-start gap-2 rounded-xl bg-error-container/30 border border-error-container px-4 py-3">
                  <span className="material-symbols-outlined text-error mt-0.5 text-lg">lock</span>
                  <p className="font-label-sm text-label-sm text-on-error-container leading-relaxed m-0">
                    <strong>Smart Location Privacy:</strong> ปิดการระบุพิกัดแผนที่สำหรับหมวดหมู่ "การเรียนการสอน" เพื่อปกป้องความเป็นส่วนตัว
                  </p>
                </div>
              )}

              {/* Visibility Settings (Role 2 or 4 only) */}
              {canSetVisibility && (
                <div className="space-y-4 pt-2 border-t border-outline-variant/50">
                  <label className="block font-label-md text-label-md text-on-surface font-bold">สิทธิ์การเข้าถึงข้อมูล</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all group ${visibility === 'public' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-outline-variant hover:border-primary hover:bg-primary/5'}`}>
                      <input type="radio" name="visibility" value="public" checked={visibility === 'public'} onChange={() => setVisibility('public')} className="w-5 h-5 text-primary border-outline-variant focus:ring-primary accent-primary" />
                      <div className="ml-3">
                        <span className="block font-label-md text-label-md text-on-surface font-semibold">สาธารณะ</span>
                        <span className="block text-[11px] text-outline leading-tight mt-0.5">ทุกคนสามารถเห็นได้</span>
                      </div>
                      <span className={`material-symbols-outlined ml-auto text-xl transition-colors ${visibility === 'public' ? 'text-primary' : 'text-outline group-hover:text-primary'}`}>public</span>
                    </label>
                    <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all group ${visibility === 'internal' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-outline-variant hover:border-primary hover:bg-primary/5'}`}>
                      <input type="radio" name="visibility" value="internal" checked={visibility === 'internal'} onChange={() => setVisibility('internal')} className="w-5 h-5 text-primary border-outline-variant focus:ring-primary accent-primary" />
                      <div className="ml-3">
                        <span className="block font-label-md text-label-md text-on-surface font-semibold">ภายใน</span>
                        <span className="block text-[11px] text-outline leading-tight mt-0.5">เฉพาะบุคลากร</span>
                      </div>
                      <span className={`material-symbols-outlined ml-auto text-xl transition-colors ${visibility === 'internal' ? 'text-primary' : 'text-outline group-hover:text-primary'}`}>lock</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || isFetchingData}
                  className="w-full bg-primary text-white py-4 rounded-xl font-headline-md shadow-md hover:bg-primary/90 hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      ส่งรายงานปัญหา
                      <span className="material-symbols-outlined text-2xl">send</span>
                    </>
                  )}
                </button>
                <button type="button" onClick={() => window.history.back()} disabled={isSubmitting} className="w-full bg-transparent text-outline py-3 rounded-xl font-label-md hover:text-on-surface-variant hover:bg-surface-variant/30 transition-all">
                  ยกเลิก
                </button>
              </div>

            </div>
          </form>
        </div>
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} />
      
      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
