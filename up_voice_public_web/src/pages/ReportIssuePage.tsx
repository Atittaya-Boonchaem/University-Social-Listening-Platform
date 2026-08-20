/**
 * ReportIssuePage.tsx
 *
 * Mobile-first "แจ้งปัญหาใหม่" (Report Issue) page.
 * Mirrors the Flutter mobile UI design with:
 *  - Top app bar with back nav + user avatar
 *  - Description field
 *  - Map location picker (Leaflet) with toggle
 *  - Date + Time pickers side by side
 *  - Root cause textarea
 *  - AI summary section with toggle button
 *  - Image attachment (up to 3)
 *  - Fixed bottom submit button with gradient
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L, { LatLng as LeafletLatLng } from 'leaflet';
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const UP_CENTER: [number, number] = [19.0289, 99.8973];

// ─── Sub-components ──────────────────────────────────────────────────────────

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (latlng: { lat: number; lng: number }) => void;
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
    if (center) map.flyTo(center, 16, { duration: 1 });
  }, [center, map]);
  return null;
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning';
interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

function MiniToast({ toasts }: { toasts: ToastItem[] }) {
  const colors: Record<ToastVariant, string> = {
    success: '#059669',
    error: '#DC2626',
    warning: '#D97706',
  };
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '92vw',
        maxWidth: '380px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: colors[t.variant],
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            padding: '12px 16px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'ripIn 0.3s ease-out',
          }}
        >
          <span>
            {t.variant === 'success' ? '✅' : t.variant === 'warning' ? '⚠️' : '❌'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Reusable Label ──────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: '13px',
        fontWeight: 700,
        color: '#374151',
        marginBottom: '6px',
      }}
    >
      {children}
    </label>
  );
}

// ─── Shared textarea/input style ─────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '16px',
  border: '1.5px solid #E5E7EB',
  background: '#F8F8FF',
  padding: '12px 14px',
  fontSize: '14px',
  color: '#1F2937',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Sarabun', 'Inter', sans-serif",
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportIssuePage() {
  const navigate = useNavigate();

  // Form state
  const [description, setDescription] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapFlyTarget, setMapFlyTarget] = useState<[number, number] | null>(
    null
  );
  const [showMap, setShowMap] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Toast
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'error') => {
      const id = ++toastCounter.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3500
      );
    },
    []
  );

  // AI summary
  const handleAiToggle = async () => {
    if (aiEnabled) {
      setAiEnabled(false);
      return;
    }
    if (!description.trim() && !rootCause.trim()) {
      showToast('กรุณากรอกรายละเอียดปัญหาหรือสาเหตุหลักก่อน', 'warning');
      return;
    }
    setAiEnabled(true);
    setIsAiLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_BASE}/problems/ai/summarize`,
        { description: description.trim(), root_cause: rootCause.trim() },
        { headers }
      );
      if (res.data?.data?.summary) {
        setAiSummary(res.data.data.summary);
      } else {
        const combined = [description.trim(), rootCause.trim()]
          .filter(Boolean)
          .join(' | ');
        setAiSummary(combined || 'ไม่สามารถสรุปได้');
      }
    } catch {
      const combined = [description.trim(), rootCause.trim()]
        .filter(Boolean)
        .join(' — ');
      setAiSummary(combined ? `สรุป: ${combined}` : 'ไม่พบข้อมูลสำหรับสรุป');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Image
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > 3) {
      showToast('สามารถอัปโหลดรูปภาพได้สูงสุด 3 รูป', 'warning');
      return;
    }
    setImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 5) {
      showToast('กรุณากรอกรายละเอียดปัญหาอย่างน้อย 5 ตัวอักษร', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('root_cause', rootCause.trim());
      if (date) formData.append('incident_date', date);
      if (time) formData.append('incident_time', time);
      if (selectedLocation) {
        formData.append('latitude', String(selectedLocation.lat));
        formData.append('longitude', String(selectedLocation.lng));
      }
      if (aiEnabled && aiSummary) formData.append('ai_summary', aiSummary);
      images.forEach((img) => formData.append('images', img, img.name));

      await axios.post(`${API_BASE}/problems/create`, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      showToast('ส่งรายงานปัญหาสำเร็จ! 🎉', 'success');
      setTimeout(() => navigate(-1), 1800);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        showToast('หมดอายุการเชื่อมต่อ กรุณาเข้าสู่ระบบใหม่', 'error');
        navigate('/login');
        return;
      }
      showToast('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const markerPosition = selectedLocation
    ? new LeafletLatLng(selectedLocation.lat, selectedLocation.lng)
    : null;

  const focusStyle = (field: string): React.CSSProperties => ({
    ...inputStyle,
    borderColor: focusedField === field ? '#7B2FF7' : '#E5E7EB',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(123,47,247,0.12)' : 'none',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F5FA',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Sarabun', 'Inter', sans-serif",
      }}
    >
      {/* ── Top App Bar ──────────────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #F0F0F0',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          aria-label="ย้อนกลับ"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#F3F4F6')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#310065" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        {/* Title */}
        <h1
          style={{
            fontSize: '16px',
            fontWeight: 800,
            color: '#6200EE',
            letterSpacing: '0.3px',
            margin: 0,
          }}
        >
          Report Issue
        </h1>

        {/* User icon */}
        <button
          onClick={() => navigate('/profile')}
          aria-label="โปรไฟล์"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: 'none',
            background: '#EDE9FE',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6200EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
      </header>

      {/* ── Scrollable Body ──────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '110px' }}>
        <form onSubmit={handleSubmit} noValidate>
          {/* White card */}
          <div
            style={{
              margin: '16px 14px',
              background: '#FFFFFF',
              borderRadius: '24px',
              boxShadow: '0 2px 16px rgba(98,0,238,0.06)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 18px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* ── Heading ── */}
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
                  แจ้งปัญหาใหม่
                </h2>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, lineHeight: '1.5' }}>
                  กรอกข้อมูลให้ครบเพื่อให้เราสามารถช่วยเหลือได้อย่างรวดเร็ว
                </p>
              </div>

              {/* ── Description ── */}
              <div>
                <FieldLabel>ปัญหาหรือความต้องการด้อคล้อยที่เกิดขึ้น</FieldLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setFocusedField('desc')}
                  onBlur={() => setFocusedField(null)}
                  rows={3}
                  placeholder="อธิบายปัญหาที่พบสั้นๆ (เช่น ท่อน้ำแตก, ไฟฟ้าดับ)"
                  disabled={isSubmitting}
                  style={{
                    ...focusStyle('desc'),
                    resize: 'none',
                  }}
                />
              </div>

              {/* ── Location ── */}
              <div>
                <FieldLabel>พิกัดสถานที่เกิดเหตุ</FieldLabel>
                {!showMap ? (
                  <button
                    type="button"
                    onClick={() => setShowMap(true)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderRadius: '16px',
                      border: '1.5px dashed rgba(123,47,247,0.4)',
                      background: 'rgba(237,233,254,0.5)',
                      padding: '13px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#6D28D9',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        background: '#7B2FF7',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(123,47,247,0.35)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                      </svg>
                    </span>
                    {selectedLocation
                      ? `📍 ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`
                      : 'คลิกเพื่อปักหมุดบนแผนที่'}
                  </button>
                ) : (
                  <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #E5E7EB' }}>
                    <div style={{ height: '180px', position: 'relative' }}>
                      <MapContainer
                        center={UP_CENTER}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapClickHandler
                          onLocationSelect={(latlng) => {
                            setSelectedLocation(latlng);
                            setMapFlyTarget([latlng.lat, latlng.lng]);
                          }}
                        />
                        <MapFlyTo center={mapFlyTarget} />
                        {markerPosition && <Marker position={markerPosition} />}
                      </MapContainer>
                      {!selectedLocation && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(98,0,238,0.04)',
                            pointerEvents: 'none',
                            zIndex: 400,
                          }}
                        >
                          <div
                            style={{
                              background: 'rgba(255,255,255,0.92)',
                              backdropFilter: 'blur(4px)',
                              padding: '8px 16px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#374151',
                              border: '1px solid #E5E7EB',
                            }}
                          >
                            📍 คลิกบนแผนที่เพื่อเลือกตำแหน่ง
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedLocation && (
                      <div
                        style={{
                          background: 'rgba(237,233,254,0.6)',
                          padding: '8px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#6D28D9', fontWeight: 600 }}>
                          📍 {selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setSelectedLocation(null); setMapFlyTarget(null); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '12px',
                            color: '#DC2626',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ล้างพิกัด
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Date + Time ── */}
              <div>
                <FieldLabel>ช่วงเวลา/เวลาที่เกิดเหตุการณ์</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    onFocus={() => setFocusedField('date')}
                    onBlur={() => setFocusedField(null)}
                    disabled={isSubmitting}
                    style={{ ...focusStyle('date'), colorScheme: 'light' }}
                  />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    onFocus={() => setFocusedField('time')}
                    onBlur={() => setFocusedField(null)}
                    disabled={isSubmitting}
                    style={{ ...focusStyle('time'), colorScheme: 'light' }}
                  />
                </div>
              </div>

              {/* ── Root Cause ── */}
              <div>
                <FieldLabel>สาเหตุหลัก</FieldLabel>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  onFocus={() => setFocusedField('cause')}
                  onBlur={() => setFocusedField(null)}
                  rows={3}
                  placeholder="ระบุสาเหตุที่คาดว่าจะเป็น (เช่น น้ำท่วมสภาพ, อม)"
                  disabled={isSubmitting}
                  style={{ ...focusStyle('cause'), resize: 'none' }}
                />
              </div>

              {/* ── AI Summary ── */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <FieldLabel>สรุปรายละเอียดทั้งหมดด้วย AI</FieldLabel>
                  <button
                    type="button"
                    onClick={handleAiToggle}
                    disabled={isSubmitting || isAiLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: aiEnabled ? '1.5px solid #7B2FF7' : '1.5px solid rgba(123,47,247,0.3)',
                      background: aiEnabled
                        ? 'linear-gradient(135deg, #6200EE, #7B2FF7)'
                        : 'rgba(237,233,254,0.5)',
                      color: aiEnabled ? '#fff' : '#7B2FF7',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: aiEnabled ? '0 4px 12px rgba(123,47,247,0.3)' : 'none',
                      opacity: isAiLoading ? 0.7 : 1,
                    }}
                  >
                    {isAiLoading ? (
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L9 9H2l5.5 4-2 7L12 16l6.5 4-2-7L22 9h-7z" />
                      </svg>
                    )}
                    {aiEnabled ? 'ปิด AI' : 'ให้ AI ช่วยเขียนเรียงสรุป'}
                  </button>
                </div>

                <div
                  style={{
                    borderRadius: '16px',
                    border: aiEnabled
                      ? '1.5px solid rgba(123,47,247,0.3)'
                      : '1.5px solid #E5E7EB',
                    background: aiEnabled
                      ? 'linear-gradient(135deg, rgba(243,232,255,0.8), rgba(237,233,254,0.6))'
                      : '#F8F8FF',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    position: 'relative',
                  }}
                >
                  <textarea
                    value={aiSummary}
                    onChange={(e) => setAiSummary(e.target.value)}
                    rows={3}
                    placeholder="อธิบายรายละเอียดเพิ่มเติม..."
                    disabled={isSubmitting || isAiLoading}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '12px 14px',
                      fontSize: '14px',
                      color: '#1F2937',
                      fontFamily: "'Sarabun', 'Inter', sans-serif",
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                      opacity: isAiLoading ? 0.6 : 1,
                    }}
                  />
                  {isAiLoading && (
                    <div
                      style={{
                        padding: '0 14px 10px',
                        fontSize: '12px',
                        color: '#7B2FF7',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>✨</span>
                      AI กำลังสรุปข้อมูล...
                    </div>
                  )}
                </div>
              </div>

              {/* ── Image Upload ── */}
              <div>
                <FieldLabel>
                  แนบรูปภาพ{' '}
                  <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(ถ้ามี)</span>
                </FieldLabel>

                {/* Previews */}
                {imagePreviews.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    {imagePreviews.map((src, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        <img
                          src={src}
                          alt={`preview-${i}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: '#EF4444',
                            border: 'none',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 800,
                            lineHeight: '1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload zone */}
                {images.length < 3 && (
                  <button
                    type="button"
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      borderRadius: '16px',
                      border: '2px dashed #D1D5DB',
                      background: '#F9FAFB',
                      padding: '28px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = '#7B2FF7';
                      el.style.background = 'rgba(237,233,254,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = '#D1D5DB';
                      el.style.background = '#F9FAFB';
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: '#EDE9FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7B2FF7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                        คลิกเพื่ออัปโหลดรูปภาพ
                      </p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF' }}>
                        รองรับ JPG, PNG สูงสุด 5MB
                      </p>
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* ── Fixed Bottom Submit ───────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #F0F0F0',
          padding: '12px 16px 20px',
        }}
      >
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting || description.trim().length < 5}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '18px',
            background:
              isSubmitting || description.trim().length < 5
                ? 'rgba(98,0,238,0.45)'
                : 'linear-gradient(135deg, #6200EE 0%, #7B2FF7 100%)',
            border: 'none',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            cursor:
              isSubmitting || description.trim().length < 5
                ? 'not-allowed'
                : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow:
              isSubmitting || description.trim().length < 5
                ? 'none'
                : '0 8px 24px rgba(98,0,238,0.35)',
            transition: 'all 0.2s',
            fontFamily: "'Sarabun', 'Inter', sans-serif",
          }}
        >
          {isSubmitting ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 00-9-9" />
                </svg>
              </span>
              กำลังส่ง...
            </>
          ) : (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              ส่งโพสต์
            </>
          )}
        </button>
      </div>

      {/* Toasts */}
      <MiniToast toasts={toasts} />

      <style>{`
        @keyframes ripIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
