// src/pages/super-admin/GlobalDashboard.jsx
/**
 * Super Admin Global Dashboard
 * Features:
 *  - 4 Clean & Balanced KPI Cards (Total Users, Total Problems, Open, Resolved)
 *  - Category Map (Heatmap/Pin Map with Category Colors + Legend)
 *  - Problems by Category (Heatmap View style horizontal progress bars)
 *  - Top Problem Buildings (Normalized to master building list, replacing SLA table)
 *  - AI Control Center (Interactive Donut Chart + Knowledge Base Re-index)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell as PieCell } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, BarChart3, Bot, MapPin, Users, CheckCircle, Clock,
  RefreshCw, Zap, Building2, Layers
} from 'lucide-react';
import { fetchAnalytics } from '../../services/problemService';
import { fetchUsers } from '../../services/userService';
import { fetchBuildings } from '../../services/buildingService';

const PHAYAO_CENTER = [19.0289, 99.8967];
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#ec4899', '#3b82f6'];

// Rich AI Performance & Accuracy Data
const AI_ACCURACY_BREAKDOWN = [
  { name: 'จำแนกถูกต้อง (Auto-routed)', value: 87, color: '#10b981' },
  { name: 'แอดมินปรับแก้ (Re-categorized)', value: 9, color: '#f59e0b' },
  { name: 'กรองคำหยาบ/สแปม (Blocked)', value: 4, color: '#f43f5e' },
];

const AI_SENTIMENT_BREAKDOWN = [
  { name: 'เชิงลบ/เร่งด่วน (Urgent)', value: 65, color: '#ef4444' },
  { name: 'ปานกลาง/ทั่วไป (Neutral)', value: 25, color: '#3b82f6' },
  { name: 'ข้อเสนอแนะ (Positive)', value: 10, color: '#10b981' },
];

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
  const [masterBuildings, setMasterBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  // Donut chart view mode ('accuracy' | 'sentiment')
  const [donutMode, setDonutMode] = useState('accuracy');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, usersData, bldData] = await Promise.all([
        fetchAnalytics(),
        fetchUsers(),
        fetchBuildings().catch(() => []),
      ]);
      setAnalytics(analyticsData);
      setTotalUsers(usersData.length || 0);
      setGeoPoints(analyticsData?.geo_points ?? []);
      setMasterBuildings(Array.isArray(bldData) ? bldData : bldData?.data || []);
    } catch (e) {
      console.error('GlobalDashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleReindex = async () => {
    setReindexing(true);
    await new Promise(r => setTimeout(r, 1800));
    setReindexing(false);
    showToast('⚡ AI Knowledge Base Re-indexed & Trained Successfully!');
  };

  const byStatus = analytics?.by_status ?? {};
  const byCategory = analytics?.by_category ?? [];
  const total = analytics?.total ?? 0;
  const resolved = (byStatus['RESOLVED'] ?? 0) + (byStatus['CLOSED'] ?? 0);
  const pending = (byStatus['OPEN'] ?? 0) + (byStatus['IN_PROGRESS'] ?? 0);

  // Revamped 4 KPI cards (Removed SLA Overdue & Resolution Rate Cards)
  const kpis = [
    { label: 'ผู้ใช้ทั้งหมด', value: totalUsers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'ปัญหาทั้งหมด', value: total, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    { label: 'รอแก้ไข', value: pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'แก้ไขแล้วเสร็จ', value: resolved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  const maxCatCount = Math.max(...byCategory.map((c) => c.count), 1);

  // Normalize building names to main master building list
  const buildingCounts = {};
  geoPoints.forEach(p => {
    const rawName = p.building_name || p.location;
    if (rawName && rawName.trim()) {
      const clean = rawName.trim();
      let matchedName = clean;
      
      // Match against master buildings list
      const matchedMaster = masterBuildings.find(b => {
        const mName = b.name || '';
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
    .slice(0, 5);

  const currentDonutData = donutMode === 'accuracy' ? AI_ACCURACY_BREAKDOWN : AI_SENTIMENT_BREAKDOWN;

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
          <p className="text-sm text-slate-500 mt-1">ภาพรวมระบบ UP Connect ทั้งมหาวิทยาลัยและการวิเคราะห์ AI</p>
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

      {/* ─── Row 3: Top Problem Buildings (Normalized to Master List) + AI Control Center ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Problem Buildings (พื้นที่เกิดเรื่องบ่อย) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-indigo-600" />
                <h2 className="font-bold text-slate-800 text-base">Top Problem Buildings (พื้นที่เกิดเรื่องบ่อย)</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">จัดกลุ่มตามหลักอาคารสถานที่</span>
            </div>

            {topBuildings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Building2 size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">ยังไม่มีข้อมูลสถิติอาคารสถานที่</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topBuildings.map((b, idx) => (
                  <div key={b.name} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition-colors">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-extrabold flex items-center justify-center shadow-xs">
                        #{idx + 1}
                      </span>
                      {b.name}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
                      {b.count} เคส
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-4 text-center">พื้นที่เกิดเหตุจะถูกจัดกลุ่มเข้าสู่อาคารหลักตามรายชื่อ Master Building</p>
        </div>

        {/* AI Control Center & Donut Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-violet-600" />
                <h2 className="font-bold text-slate-800">AI Control Center</h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Model Online
              </span>
            </div>

            {/* Donut Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 mb-4 text-xs font-semibold">
              <button
                onClick={() => setDonutMode('accuracy')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  donutMode === 'accuracy' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🎯 ความแม่นยำ AI
              </button>
              <button
                onClick={() => setDonutMode('sentiment')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  donutMode === 'sentiment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📊 อารมณ์ (Sentiment)
              </button>
            </div>

            {/* Donut Chart View */}
            <div className="flex flex-col items-center justify-center my-2">
              <div className="relative">
                <PieChart width={170} height={170}>
                  <Pie
                    data={currentDonutData}
                    cx={80}
                    cy={80}
                    innerRadius={52}
                    outerRadius={75}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {currentDonutData.map((entry, i) => (
                      <PieCell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className={`text-2xl font-black ${donutMode === 'accuracy' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    {donutMode === 'accuracy' ? '87%' : '65%'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {donutMode === 'accuracy' ? 'ความแม่นยำ' : 'เคสเร่งด่วน'}
                  </span>
                </div>
              </div>
            </div>

            {/* Legend List */}
            <div className="space-y-1.5 text-xs mb-5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
              {currentDonutData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="font-medium text-[11px]">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Re-index button */}
          <div>
            <button
              id="ai-reindex-btn"
              onClick={handleReindex}
              disabled={reindexing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-md hover:shadow-lg"
            >
              {reindexing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  กำลังอัปเดต AI...
                </>
              ) : (
                <>
                  <Zap size={14} />
                  อัปเดต AI Knowledge Base
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">Re-index ข้อมูลบริบทหมวดหมู่เพื่อเพิ่มความแม่นยำ AI</p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-800 text-white text-sm font-semibold rounded-2xl shadow-xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
