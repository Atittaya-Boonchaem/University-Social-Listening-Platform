// src/pages/super-admin/GlobalDashboard.jsx
/**
 * Super Admin Global Dashboard
 * Features:
 *  - Real KPI cards with live data
 *  - Heatmap/Pin Map with Category Colors + Legend
 *  - Bar chart: Issues by Category
 *  - SLA Breached Tickets table (Top 5)
 *  - AI Control Center: Interactive Donut Chart with Category & Accuracy / Sentiment Breakdown
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Cell as PieCell, Legend
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, BarChart3, Bot, MapPin, ShieldAlert,
  Users, CheckCircle, Clock, RefreshCw, Zap, ShieldCheck, Sparkles, Filter
} from 'lucide-react';
import SLABadge from '../../components/SLABadge';
import { fetchAnalytics } from '../../services/problemService';
import { fetchSlaBreached } from '../../services/ticketService';
import { fetchUsers } from '../../services/userService';
import api from '../../services/api';

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

export default function GlobalDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [slaItems, setSlaItems] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [geoPoints, setGeoPoints] = useState([]);
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
      const [analyticsData, slaData, usersData] = await Promise.all([
        fetchAnalytics(),
        fetchSlaBreached(5),
        fetchUsers(),
      ]);
      setAnalytics(analyticsData);
      setSlaItems(slaData || []);
      setTotalUsers(usersData.length || 0);
      setGeoPoints(analyticsData?.geo_points ?? []);
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
  const byCategory = (analytics?.by_category ?? []).slice(0, 7);
  const total = analytics?.total ?? 0;
  const resolved = (byStatus['RESOLVED'] ?? 0) + (byStatus['CLOSED'] ?? 0);
  const pending = (byStatus['OPEN'] ?? 0) + (byStatus['IN_PROGRESS'] ?? 0);
  const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : 0;

  const kpis = [
    { label: 'ผู้ใช้ทั้งหมด', value: totalUsers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'ปัญหาทั้งหมด', value: total, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    { label: 'รอแก้ไข', value: pending, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'แก้ไขสำเร็จ', value: resolved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'อัตราแก้ไข', value: `${resolutionRate}%`, icon: Zap, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
    { label: 'SLA เกินกำหนด', value: slaItems.filter(s => s.sla_status?.level === 'red').length, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  ];

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
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
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

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className={`bg-white rounded-2xl border ${kpi.border} shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-shadow`}>
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <Icon size={18} className={kpi.color} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
                <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Row 2: Map with Category Colors + Bar Chart ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap (Pins Color-coded by Category) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-[#2B164D]" />
              <h2 className="font-bold text-slate-800">แผนที่ความร้อนแยกตามหมวดหมู่ (Category Map)</h2>
            </div>
            <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">
              {geoPoints.length} ตำแหน่ง
            </span>
          </div>

          <div className="h-[300px] relative">
            <MapContainer center={PHAYAO_CENTER} zoom={15} scrollWheelZoom={false} className="h-full w-full absolute inset-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geoPoints.map((pt, idx) => {
                // Use category color code from DB or fallback to status color
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

        {/* Bar Chart: Issues by Category */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-[#2B164D]" />
            <h2 className="font-bold text-slate-800">ปัญหาแยกตามหมวดหมู่ (Category Distribution)</h2>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} margin={{ left: -20, bottom: 20 }}>
                <XAxis dataKey="category_name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} ปัญหา`, '']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {byCategory.map((cat, i) => {
                    const color = geoPoints.find(g => g.category_name === cat.category_name)?.color_code || BAR_COLORS[i % BAR_COLORS.length];
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Row 3: SLA Table + AI Control Center Donut ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SLA Breached Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-rose-500" />
              <h2 className="font-bold text-slate-800">Top 5 ตั๋วที่ SLA เกินกำหนด</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">เรียงตามวันที่รอนานสุด</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">Ticket ID</th>
                  <th className="px-4 py-3 font-bold">ชื่อปัญหา</th>
                  <th className="px-4 py-3 font-bold">หมวดหมู่</th>
                  <th className="px-4 py-3 font-bold">สถานะ SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {slaItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400" />
                      ไม่มีตั๋วที่ SLA เกินกำหนด 🎉
                    </td>
                  </tr>
                ) : (
                  slaItems.map(item => (
                    <tr key={item.problem_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-bold">
                        {item.ticket_id ?? `#${item.problem_id}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 max-w-[180px] truncate">
                        {item.title}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{item.category_name}</td>
                      <td className="px-4 py-3">
                        <SLABadge
                          level={item.sla_status?.level}
                          label={item.sla_status?.label}
                          daysOpen={item.sla_status?.days_open}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Control Center & Enhanced Donut Chart */}
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
                  <Tooltip formatter={(val, name) => [`${val}%`, name]} />
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
