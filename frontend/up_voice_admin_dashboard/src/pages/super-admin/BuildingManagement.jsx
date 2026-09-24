// src/pages/super-admin/BuildingManagement.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  fetchBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} from '../../services/buildingService';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Search,
  MapPin,
  Navigation,
  Download,
  RotateCw,
  Landmark,
  Compass,
  Check,
  ChevronLeft,
  ChevronRight,
  School,
  Bed,
  Laptop,
  HeartPulse,
  Trees,
  Wrench,
  Sparkles,
} from 'lucide-react';

// ── Coord formatter ────────────────────────────────────────────
const fmtCoord = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  return parseFloat(val).toFixed(6);
};

// ── Smart Icon Selector based on Building Name ─────────────────
const getBuildingIconComponent = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('หอพัก') || n.includes('dorm')) {
    return <Bed size={18} className="text-[#4B267D]" />;
  }
  if (n.includes('โรงพยาบาล') || n.includes('แพทย์') || n.includes('hospital') || n.includes('ทันต')) {
    return <HeartPulse size={18} className="text-[#4B267D]" />;
  }
  if (n.includes('ict') || n.includes('สารสนเทศ') || n.includes('คอมพิวเตอร์') || n.includes('เทคโนโลยี')) {
    return <Laptop size={18} className="text-[#4B267D]" />;
  }
  if (n.includes('วิศว') || n.includes('engineer') || n.includes('workshop')) {
    return <Wrench size={18} className="text-[#4B267D]" />;
  }
  if (n.includes('สิ่งแวดล้อม') || n.includes('เกษตร') || n.includes('พลังงาน')) {
    return <Trees size={18} className="text-[#4B267D]" />;
  }
  if (n.includes('อธิการบดี') || n.includes('สำนักงาน') || n.includes('หอประชุม') || n.includes('พญางำเมือง')) {
    return <Landmark size={18} className="text-[#4B267D]" />;
  }
  return <Building2 size={18} className="text-[#4B267D]" />;
};

// ── Leaflet Custom Marker Icon ─────────────────────────────────
const createMarkerIcon = (label) =>
  new L.DivIcon({
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background-color: #131b2e; color: #faf8ff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; box-shadow: 0 4px 12px rgba(0,0,0,0.25); white-space: nowrap; margin-bottom: 2px; border: 1px solid rgba(255,255,255,0.2);">
          ${label || 'UP Pin'}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#4B267D" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.3));">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="#fed65b"></circle>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

// ── Map Click Event & Recenter Helpers ─────────────────────────
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], map.getZoom() < 16 ? 16 : map.getZoom(), { animate: true });
    }
  }, [lat, lng, map]);
  return null;
};

// ── Skeleton Loader ────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <div className="w-56 h-8 bg-slate-200 rounded-xl" />
        <div className="w-80 h-4 bg-slate-100 rounded-lg" />
      </div>
      <div className="w-36 h-11 bg-slate-200 rounded-xl" />
    </div>
    <div className="w-full h-12 bg-slate-100 rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-28 bg-white rounded-2xl border border-slate-100" />
      <div className="h-28 bg-white rounded-2xl border border-slate-100" />
    </div>
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-xl" />
      ))}
    </div>
  </div>
);

// ── Toast Notification ─────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div
    className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl z-[70] animate-[pageFadeIn_0.2s_ease] flex items-center gap-2.5 text-sm font-semibold ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`}
  >
    {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
    {msg}
  </div>
);

// ── Confirm Delete Dialog ──────────────────────────────────────
const ConfirmDeleteDialog = ({ building, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[pageFadeIn_0.15s_ease]">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100">
      <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
        <Trash2 size={20} />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1.5">ยืนยันการลบอาคาร</h3>
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        คุณต้องการลบข้อมูลอาคาร <strong className="text-slate-800">"{building.name}"</strong> ออกจากระบบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          ยกเลิก (Cancel)
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              กำลังลบ...
            </>
          ) : (
            'ยืนยันการลบ'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Spacious Add / Edit Building Modal (ปรับให้กว้าง สบายตา สวยงาม) ────────────────────────
const UP_DEFAULT_CENTER = { lat: 19.0286, lng: 99.8958 };

const BuildingModal = ({ mode, initial, onClose, onSave }) => {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(
    initial
      ? {
          name: initial.name || '',
          latitude:
            initial.latitude !== null && initial.latitude !== undefined
              ? String(initial.latitude)
              : String(UP_DEFAULT_CENTER.lat),
          longitude:
            initial.longitude !== null && initial.longitude !== undefined
              ? String(initial.longitude)
              : String(UP_DEFAULT_CENTER.lng),
        }
      : {
          name: '',
          latitude: String(UP_DEFAULT_CENTER.lat),
          longitude: String(UP_DEFAULT_CENTER.lng),
        }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parsedLat = parseFloat(form.latitude);
  const parsedLng = parseFloat(form.longitude);
  const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng);

  // Handle map click
  const handleMapClick = (lat, lng) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  // Reset to UP Center
  const handleResetToUPCenter = () => {
    setForm((prev) => ({
      ...prev,
      latitude: UP_DEFAULT_CENTER.lat.toFixed(6),
      longitude: UP_DEFAULT_CENTER.lng.toFixed(6),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('กรุณากรอกชื่ออาคาร (Building Name)');
      return;
    }
    const lat = form.latitude !== '' ? parseFloat(form.latitude) : null;
    const lng = form.longitude !== '' ? parseFloat(form.longitude) : null;
    if (form.latitude !== '' && isNaN(lat)) {
      setError('Latitude ต้องเป็นตัวเลขทศนิยมที่ถูกต้อง (เช่น 19.028600)');
      return;
    }
    if (form.longitude !== '' && isNaN(lng)) {
      setError('Longitude ต้องเป็นตัวเลขทศนิยมที่ถูกต้อง (เช่น 99.895800)');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({ name: form.name.trim(), latitude: lat, longitude: lng });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'เกิดข้อผิดพลาดในการบันทึกข้อมูลอาคาร'
      );
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-[pageFadeIn_0.15s_ease]">
      {/* Container: Spacious max-w-2xl */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#4B267D] flex items-center justify-center flex-shrink-0 border border-purple-100 shadow-2xs">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                  {isEdit ? 'แก้ไขข้อมูลอาคารและพิกัด' : 'เพิ่มอาคารสถานที่ใหม่ (Add Building)'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#4B267D] border border-purple-200">
                  {isEdit ? `ID: #${initial?.building_id}` : 'GIS Center'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดชื่ออาคาร คณะ หอพัก และปักหมุดพิกัด GPS สำหรับใช้ในระบบแผนที่ปัญหา
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6 sm:p-7 space-y-5">
            {error && (
              <div className="p-3.5 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Field 1: Building Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="modal-building-name">
                ชื่ออาคาร / สถานที่ (Building Name) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Building2 size={16} />
                </span>
                <input
                  id="modal-building-name"
                  type="text"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={saving}
                  placeholder="เช่น อาคารเรียนรวม PKY (ภูกามยาว), คณะ ICT, หอพัก UP DORM"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:border-transparent bg-slate-50/50 hover:bg-white transition-all disabled:opacity-50 font-medium"
                />
              </div>
            </div>

            {/* Field 2 & 3: Latitude / Longitude Dual Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="modal-lat">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#4B267D]" />
                    <span>ละติจูด (Latitude)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                </label>
                <input
                  id="modal-lat"
                  type="text"
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                  disabled={saving}
                  placeholder="19.028600"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:border-transparent bg-slate-50/50 hover:bg-white transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="modal-lng">
                  <span className="inline-flex items-center gap-1.5">
                    <Navigation size={14} className="text-[#4B267D]" />
                    <span>ลองจิจูด (Longitude)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                </label>
                <input
                  id="modal-lng"
                  type="text"
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                  disabled={saving}
                  placeholder="99.895800"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:border-transparent bg-slate-50/50 hover:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Interactive Leaflet Map Preview (กว้าง สวย เต็มตา) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Compass size={15} className="text-[#4B267D]" />
                  <span>แผนที่จำลองพิกัด (Interactive Map Preview)</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/70">
                    คลิกบนแผนที่เพื่อเปลี่ยนพิกัด
                  </span>
                  <button
                    type="button"
                    onClick={handleResetToUPCenter}
                    className="text-[11px] text-slate-600 hover:text-[#4B267D] font-bold underline cursor-pointer"
                  >
                    รีเซ็ตเป็น มพ.
                  </button>
                </div>
              </div>

              <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-0 bg-slate-100">
                <MapContainer
                  center={[
                    hasValidCoords ? parsedLat : UP_DEFAULT_CENTER.lat,
                    hasValidCoords ? parsedLng : UP_DEFAULT_CENTER.lng,
                  ]}
                  zoom={16}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapClickHandler onMapClick={handleMapClick} />
                  {hasValidCoords && <RecenterMap lat={parsedLat} lng={parsedLng} />}
                  {hasValidCoords && (
                    <Marker
                      position={[parsedLat, parsedLng]}
                      icon={createMarkerIcon(form.name || 'พิกัดที่เลือก')}
                    />
                  )}
                </MapContainer>

                {/* Floating Pin Coordinate Indicator */}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-[11px] font-mono font-bold text-slate-700 pointer-events-none z-[1000] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{form.latitude}, {form.longitude}</span>
                </div>
              </div>
            </div>

            {/* Helper Note Banner */}
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
              <Compass size={18} className="text-[#4B267D] shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                พิกัดเหล่านี้จะทำหน้าที่เป็นจุดศูนย์กลางแผนที่เริ่มต้น (Default GIS Center) เมื่อนิสิตหรือผู้ใช้งานเลือกแจ้งปัญหาที่อาคารนี้โดยไม่ได้เปิด GPS ประจำเครื่อง
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              ยกเลิก (Cancel)
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#4B267D] hover:bg-[#381C5F] text-white text-xs font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-purple-900/20 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : isEdit ? (
                <>
                  <Check size={16} />
                  <span>บันทึกการแก้ไข (Save Changes)</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>เพิ่มอาคาร (Add Building)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────
const BuildingManagement = () => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [modal, setModal] = useState(null); // null | { mode: 'create' | 'edit', data?: object }
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 4000);
  };

  const loadBuildings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await fetchBuildings();
      setBuildings(data);
      if (isRefresh) showToast('รีเฟรชข้อมูลอาคารสถานที่ล่าสุดเรียบร้อย');
    } catch {
      showToast('ไม่สามารถโหลดข้อมูลอาคารสถานที่ได้ กรุณารีเฟรช', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('building-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered list
  const filtered = buildings
    .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.building_id - b.building_id);

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedBuildings = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  // Stats
  const withCoords = buildings.filter(
    (b) =>
      b.latitude !== null &&
      b.latitude !== undefined &&
      b.longitude !== null &&
      b.longitude !== undefined
  ).length;

  const syncPercentage = buildings.length
    ? Math.round((withCoords / buildings.length) * 100)
    : 100;

  // ── Save (Create / Edit) ─────────────────────────────────────
  const handleSave = async (form) => {
    if (modal?.mode === 'edit' && modal.data) {
      const updated = await updateBuilding(modal.data.building_id, form);
      setBuildings((prev) =>
        prev.map((b) =>
          b.building_id === modal.data.building_id ? { ...b, ...updated } : b
        )
      );
      showToast('อัปเดตข้อมูลอาคารและพิกัดเรียบร้อยแล้ว');
    } else {
      const created = await createBuilding(form);
      const newBld = created || { ...form, building_id: Date.now() };
      setBuildings((prev) => [...prev, newBld]);
      showToast('เพิ่มข้อมูลอาคารสถานที่ใหม่เรียบร้อยแล้ว');
    }
    setModal(null);
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      await deleteBuilding(deleteDialog.building_id);
      setBuildings((prev) => prev.filter((b) => b.building_id !== deleteDialog.building_id));
      showToast(`ลบข้อมูลอาคาร "${deleteDialog.name}" เรียบร้อย`);
      setDeleteDialog(null);
    } catch (err) {
      showToast(
        err.response?.data?.detail || err.response?.data?.message || 'ไม่สามารถลบข้อมูลอาคารนี้ได้',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Export CSV ───────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!buildings.length) {
      showToast('ไม่มีข้อมูลอาคารสำหรับส่งออก', 'error');
      return;
    }
    const headers = ['ID', 'Building Name', 'Latitude', 'Longitude'];
    const rows = buildings.map((b) => [
      b.building_id,
      `"${(b.name || '').replace(/"/g, '""')}"`,
      b.latitude ?? '',
      b.longitude ?? '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `up_phayao_buildings_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ส่งออกไฟล์ CSV อาคารและพิกัดเรียบร้อย');
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.msg && <Toast msg={toast.msg} type={toast.type} />}

      {/* Delete dialog */}
      {deleteDialog && (
        <ConfirmDeleteDialog
          building={deleteDialog}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteDialog(null)}
          isLoading={deleting}
        />
      )}

      {/* Spacious Modal Dialog */}
      {modal && (
        <BuildingModal
          mode={modal.mode}
          initial={modal.data}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Top Utility Bar & Actions (Matching HTML Mockup) */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#4B267D] shadow-2xs shrink-0">
            <Landmark size={24} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Building Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#4B267D] font-bold text-[10px] uppercase tracking-wider border border-purple-200">
                GIS Master
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage campus buildings and their center coordinates used for problem location mapping.
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          id="add-building-btn"
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#340866] hover:bg-[#4B267D] text-white transition-all shadow-md shadow-purple-950/20 font-bold text-xs sm:text-sm cursor-pointer self-start md:self-auto"
        >
          <Plus size={18} />
          <span>Add Building</span>
        </button>
      </section>

      {/* Search Filter Component */}
      <div className="w-full">
        <div className="relative w-full max-w-2xl">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            id="building-search"
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by building name..."
            className="w-full h-11 pl-11 pr-14 rounded-xl bg-white border border-slate-200/90 text-slate-800 placeholder:text-slate-400 text-xs sm:text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4B267D] focus:border-transparent transition-all"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-mono text-slate-500">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards (2 Grid Cards matching Mockup) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Total Buildings */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4 transition-transform hover:-translate-y-0.5">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#4B267D] border border-purple-100 flex items-center justify-center shrink-0">
            <Building2 size={26} />
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-extrabold text-slate-900 leading-none tracking-tight font-mono">
              {buildings.length}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1.5">
              Total Buildings
            </span>
          </div>
        </div>

        {/* Card 2: With Coordinates */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4 transition-transform hover:-translate-y-0.5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Compass size={26} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 leading-none tracking-tight font-mono">
                {withCoords}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                {syncPercentage}% Synced
              </span>
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1.5">
              With Coordinates
            </span>
          </div>
        </div>
      </div>

      {/* Data Table Card Container (Matching HTML Mockup) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col mb-8">
        {/* Table Header Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
              {filtered.length} {filtered.length === 1 ? 'BUILDING' : 'BUILDINGS'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="text-xs text-slate-400 font-medium">Phayao Campus Geo-Registry</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Export CSV"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={() => loadBuildings(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Database"
            >
              <RotateCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Building2 size={24} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-600">ไม่พบข้อมูลอาคาร</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search ? 'ลองค้นหาด้วยคำอื่น' : 'กดปุ่ม "Add Building" ด้านบนเพื่อเริ่มเพิ่มอาคาร'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="buildings-table">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6 w-20">ID</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Building Name</th>
                  <th className="py-3.5 px-4 w-48">Latitude</th>
                  <th className="py-3.5 px-4 w-48">Longitude</th>
                  <th className="py-3.5 px-6 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/70 text-slate-800 text-xs">
                {paginatedBuildings.map((bld) => (
                  <tr
                    key={bld.building_id}
                    className="hover:bg-purple-50/40 transition-colors group"
                  >
                    {/* ID */}
                    <td className="py-4 px-6 font-mono text-xs font-bold text-slate-400">
                      #{bld.building_id}
                    </td>

                    {/* Building Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100/80 text-[#4B267D] flex items-center justify-center shrink-0">
                          {getBuildingIconComponent(bld.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm leading-snug">
                            {bld.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            University of Phayao Geo-Node
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Latitude */}
                    <td className="py-4 px-4">
                      {bld.latitude !== null && bld.latitude !== undefined ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-[#4B267D] border border-purple-100 font-mono text-xs font-semibold">
                          <MapPin size={13} className="text-[#4B267D]" />
                          <span>{fmtCoord(bld.latitude)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic font-mono">—</span>
                      )}
                    </td>

                    {/* Longitude */}
                    <td className="py-4 px-4">
                      {bld.longitude !== null && bld.longitude !== undefined ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-[#4B267D] border border-purple-100 font-mono text-xs font-semibold">
                          <Navigation size={13} className="text-[#4B267D]" />
                          <span>{fmtCoord(bld.longitude)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic font-mono">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          id={`edit-bld-${bld.building_id}`}
                          title="แก้ไขข้อมูลอาคาร"
                          onClick={() => setModal({ mode: 'edit', data: bld })}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-purple-50 hover:text-[#4B267D] hover:border-purple-200 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          id={`delete-bld-${bld.building_id}`}
                          title="ลบข้อมูลอาคาร"
                          onClick={() => setDeleteDialog(bld)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <span className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-800">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * itemsPerPage, filtered.length)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{filtered.length}</span> buildings
            </span>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-[#340866] text-white shadow-xs'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingManagement;
