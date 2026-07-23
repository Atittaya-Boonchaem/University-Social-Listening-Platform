// src/pages/super-admin/GlobalDashboard.jsx
/**
 * Super Admin Global Dashboard
 * Features:
 *  - 4 Clean & Balanced KPI Cards (Total Users, Total Problems, Open, Resolved)
 *  - Category Map (Heatmap/Pin Map with Category Colors + Legend)
 *  - Problems by Category (Heatmap View style horizontal progress bars)
 *  - Top Problem Buildings (Normalized to master building list, full width 100%)
 *  - AI Control Center (Disabled/Hidden per requirement)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart3, MapPin, Users, CheckCircle, Clock,
  RefreshCw, Building2, Layers
} from 'lucide-react';
import { fetchAnalytics, fetchProblems } from '../../services/problemService';
import { fetchUsers } from '../../services/userService';
import { fetchBuildings } from '../../services/buildingService';

const PHAYAO_CENTER = [19.0289, 99.8967];
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#ec4899', '#3b82f6'];

// ── Category bar component from Heatmap View ───────────────────
const CategoryBar = ({ name, count, max, color }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const barColor = color || '#6366f1';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-700 font-semibold truncate flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: barColor }} />
          {name}
        </span>
        <span className="text-xs text-slate-500 font-bold ml-2 flex-shrink-0">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
};

export default function GlobalDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [geoPoints, setGeoPoints] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [masterBuildings, setMasterBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, usersData, bldData, probRes] = await Promise.all([
        fetchAnalytics(),
        fetchUsers(),
        fetchBuildings().catch(() => []),
        fetchProblems({ page_size: 200 }, true).catch(() => ({ items: [] })),
      ]);
      setAnalytics(analyticsData);
      setTotalUsers(usersData.length || 0);
      setGeoPoints(analyticsData?.geo_points ?? []);
      setMasterBuildings(Array.isArray(bldData) ? bldData : bldData?.data || []);
      setAllProblems(probRes?.items || probRes || []);
    } catch (e) {
      console.error('GlobalDashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const byStatus = analytics?.by_status ?? {};
  const byCategory = analytics?.by_category ?? [];
  const total = analytics?.total ?? 0;
  const resolved = (byStatus['RESOLVED'] ?? 0) + (byStatus['CLOSED'] ?? 0);
  const pending = (byStatus['OPEN'] ?? 0) + (byStatus['IN_PROGRESS'] ?? 0);

  // 4 KPI cards
  const kpis = [
    { label: 'ผู้ใช้ทั้งหมด', value: totalUsers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'ปัญหาทั้งหมด', value: total, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    { label: 'รอแก้ไข', value: pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'แก้ไขแล้วเสร็จ', value: resolved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  const maxCatCount = Math.max(...byCategory.map((c) => c.count), 1);

  // Aggregate problem counts by building across ALL problems in DB
  const buildingCounts = {};
  const problemSource = allProblems.length > 0 ? allProblems : geoPoints;
  
  problemSource.forEach(p => {
    const rawName = p.building_name || p.location || p.building?.name;
    if (rawName && String(rawName).trim()) {
      const clean = String(rawName).trim();
      let matchedName = clean;
      
      // Match against master buildings list
      const matchedMaster = masterBuildings.find(b => {
        const mName = b.name || '';
        if (!mName) return false;
        return clean.toLowerCase().includes(mName.toLowerCase()) ||
               mName.toLowerCase().includes(clean.toLowerCase()) ||
               (clean.toUpperCase().includes('ICT') && mName.includes('สารสนเทศ')) ||
               (clean.includes('อธิการ') && mName.includes('อธิการบดี')) ||
               (clean.includes('วิศว') && mName.includes('วิศวกรรม')) ||
               (clean.includes('พยาบาล') && mName.includes('พยาบาล')) ||
               (clean.includes('นิติ') && mName.includes('นิติศาสตร์'));
      });

      if (matchedMaster) {
        matchedName = matchedMaster.name;
      }

      buildingCounts[matchedName] = (buildingCounts[matchedName] || 0) + 1;
    }
  });

  const topBuildings = Object.entries(buildingCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center gap-3 text-indigo-600 font-semibold animate-pulse">
        <span className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        กำลังโหลด Global Dashboard...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2B164D] flex items-center gap-2">
            <span>🌐 Super Admin Dashboard</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">ภาพรวมระบบ UP Connect ทั้งมหาวิทยาลัย</p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
        >
          <RefreshCw size={14} />
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* ─── 4 Clean Balanced KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className={`bg-white rounded-2xl border ${kpi.border} shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
              <div className={`w-12 h-12 rounded-2xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={24} className={kpi.color} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-2xl font-black ${kpi.color} mt-0.5`}>{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Row 2: Category Map + Problems by Category (Heatmap View Style) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap (Pins Color-coded by Category) — Spans 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#2B164D]" />
              <h2 className="font-bold text-slate-800">แผนที่ความร้อนแยกตามหมวดหมู่ (Category Map)</h2>
            </div>
            <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">
              {geoPoints.length} ตำแหน่ง
            </span>
          </div>

          <div className="h-[320px] relative">
            <MapContainer center={PHAYAO_CENTER} zoom={15} scrollWheelZoom={false} className="h-full w-full absolute inset-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geoPoints.map((pt, idx) => {
                const color = pt.color_code || (pt.status === 'RESOLVED' ? '#10b981' : '#3b82f6');
                return (
                  <CircleMarker
                    key={pt.id || idx}
                    center={[parseFloat(pt.latitude), parseFloat(pt.longitude)]}
                    pathOptions={{ color: color, fillColor: color, fillOpacity: 0.85 }}
                    radius={10}
                  >
                    <Popup>
                      <div className="p-1 text-left font-sans">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white mb-1.5 inline-block" style={{ backgroundColor: color }}>
                          📁 {pt.category_name || 'หมวดหมู่ทั่วไป'}
                        </span>
                        <strong className="block text-sm text-slate-800 font-bold leading-tight">{pt.title}</strong>
                        {pt.building_name && <p className="text-xs text-slate-600 mt-1">📍 {pt.building_name}</p>}
                        <span className="text-xs text-slate-500 mt-1 block">สถานะ: <strong className="text-indigo-600">{pt.status}</strong></span>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Category Color Legend */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 overflow-x-auto text-xs font-medium text-slate-600">
            <span className="text-slate-400 font-bold flex-shrink-0">สัญลักษณ์สี:</span>
            {byCategory.map((cat, i) => {
              const catColor = geoPoints.find(g => g.category_name === cat.category_name)?.color_code || BAR_COLORS[i % BAR_COLORS.length];
              return (
                <div key={cat.category_name} className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-3 h-3 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: catColor }} />
                  <span className="text-slate-700">{cat.category_name} ({cat.count})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Problems by Category (Heatmap View Progress Bars) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Layers size={18} className="text-[#2B164D]" />
              <h2 className="font-bold text-slate-800">ปัญหาแยกตามหมวดหมู่ (Problems by Category)</h2>
            </div>
            
            {byCategory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">ไม่มีข้อมูลหมวดหมู่</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {byCategory.map((c, idx) => {
                  const color = geoPoints.find(g => g.category_name === c.category_name)?.color_code || BAR_COLORS[idx % BAR_COLORS.length];
                  return (
                    <CategoryBar
                      key={c.category_name}
                      name={c.category_name}
                      count={c.count}
                      max={maxCatCount}
                      color={color}
                    />
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-4 text-center">สัดส่วนจำนวนปัญหาแยกตามแต่ละหมวดหมู่</p>
        </div>
      </div>

      {/* ─── Row 3: Top Problem Buildings (Full Width 100%) ─── */}
      <div className="w-full">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 size={22} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">Top Problem Buildings (พื้นที่เกิดเรื่องบ่อย)</h2>
                  <p className="text-xs text-slate-400">จัดกลุ่มรายงานปัญหาตามรายชื่ออาคารสถานที่หลัก Master Building</p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                รวมทั้งหมด {topBuildings.reduce((sum, b) => sum + b.count, 0)} รายการ
              </span>
            </div>

            {topBuildings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Building2 size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-500">ยังไม่มีข้อมูลสถิติอาคารสถานที่</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xs">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-3.5 w-16 text-center">อันดับ</th>
                      <th className="px-5 py-3.5">ชื่ออาคารสถานที่ (Master Building)</th>
                      <th className="px-5 py-3.5 w-48">สัดส่วนเคสปัญหา</th>
                      <th className="px-5 py-3.5 w-32 text-right">จำนวนเคส</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {topBuildings.map((b, idx) => {
                      const totalCount = topBuildings.reduce((sum, item) => sum + item.count, 0);
                      const pct = totalCount > 0 ? Math.round((b.count / totalCount) * 100) : 0;
                      return (
                        <tr key={b.name} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black shadow-xs ${
                              idx === 0 ? 'bg-amber-500 text-white' :
                              idx === 1 ? 'bg-slate-400 text-white' :
                              idx === 2 ? 'bg-amber-700 text-white' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-800 text-xs md:text-sm">
                            {b.name}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-500" 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-500 w-9 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl shadow-2xs">
                              {b.count} เคส
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-6 text-center">พื้นที่เกิดเหตุย่อยจะถูกนำมารวมสถิติเข้าสู่อาคารหลักตามรายชื่อ Master Building</p>
        </div>
      </div>

      {/* ─── AI Control Center (Disabled / Hidden per user request) ─── */}
      {/* 
      <div className="hidden">
        AI Control Center Component
      </div> 
      */}
    </div>
  );
}
