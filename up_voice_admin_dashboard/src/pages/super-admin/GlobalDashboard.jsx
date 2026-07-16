// src/pages/super-admin/GlobalDashboard.jsx
/**
 * Super Admin Global Dashboard (Phase 3)
 * Features:
 *  - Real KPI cards with live data
 *  - Heatmap (existing Leaflet map, re-used)
 *  - Bar chart: Issues by Category (recharts)
 *  - SLA Breached Tickets table (Top 5)
 *  - AI Accuracy placeholder donut chart
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Cell as PieCell,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, BarChart3, Bot, MapPin, ShieldAlert,
  Users, CheckCircle, Clock, RefreshCw, Zap
} from 'lucide-react';
import SLABadge from '../../components/SLABadge';
import { fetchAnalytics } from '../../services/problemService';
import { fetchSlaBreached } from '../../services/ticketService';
import { fetchUsers } from '../../services/userService';
import api from '../../services/api';

const PHAYAO_CENTER = [19.0289, 99.8967];
const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe'];

// Fake AI accuracy data (replace with real LLM metric endpoint when ready)
const AI_ACCURACY_DATA = [
  { name: 'ถูกต้อง', value: 87, color: '#10b981' },
  { name: 'ผิดพลาด', value: 13, color: '#f43f5e' },
];

export default function GlobalDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [slaItems, setSlaItems] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [geoPoints, setGeoPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

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
      setSlaItems(slaData);
      setTotalUsers(usersData.length);
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
    // Placeholder: call your actual re-index endpoint when ready
    await new Promise(r => setTimeout(r, 2000));
    setReindexing(false);
    showToast('✅ AI Knowledge Base อัปเดตสำเร็จ!');
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-indigo-600 font-semibold">
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
          <h1 className="text-2xl font-bold text-[#2B164D]">🌐 Super Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">ภาพรวมระบบ UP Connect ทั้งมหาวิทยาลัย</p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
        >
          <RefreshCw size={14} />
          รีเฟรช
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

      {/* ─── Row 2: Map + Bar Chart ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin size={18} className="text-[#2B164D]" />
            <h2 className="font-bold text-slate-800">แผนที่ความร้อน (Heatmap)</h2>
          </div>
          <div className="h-[320px] relative">
            <MapContainer center={PHAYAO_CENTER} zoom={15} scrollWheelZoom={false} className="h-full w-full absolute inset-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {geoPoints.map(pt => {
                const color = pt.status === 'RESOLVED' || pt.status === 'CLOSED' ? '#10b981' : pt.status === 'IN_PROGRESS' ? '#3b82f6' : '#ef4444';
                return (
                  <CircleMarker
                    key={pt.id}
                    center={[parseFloat(pt.latitude), parseFloat(pt.longitude)]}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.7 }}
                    radius={9}
                  >
                    <Popup>
                      <strong className="block text-sm">{pt.title}</strong>
                      <span className="text-xs text-slate-500">{pt.category_name} — {pt.status}</span>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Bar Chart: Issues by Category */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-[#2B164D]" />
            <h2 className="font-bold text-slate-800">ปัญหาแยกตามหมวดหมู่</h2>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} margin={{ left: -20, bottom: 20 }}>
                <XAxis dataKey="category_name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} ปัญหา`, '']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {byCategory.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Row 3: SLA Table + AI Donut ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SLA Breached Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock size={18} className="text-rose-500" />
            <h2 className="font-bold text-slate-800">Top 5 ตั๋วที่ SLA เกินกำหนด</h2>
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

        {/* AI Accuracy Donut + Re-index button */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-violet-500" />
            <h2 className="font-bold text-slate-800">AI Control Center</h2>
          </div>

          {/* Donut */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <PieChart width={160} height={160}>
                <Pie data={AI_ACCURACY_DATA} cx={75} cy={75} innerRadius={50} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270}>
                  {AI_ACCURACY_DATA.map((entry, i) => <PieCell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-emerald-600">87%</span>
                <span className="text-[10px] text-slate-400 font-medium">ความแม่นยำ</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center text-xs mb-4">
            {AI_ACCURACY_DATA.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600">{d.name} {d.value}%</span>
              </div>
            ))}
          </div>

          {/* Re-index button */}
          <button
            id="ai-reindex-btn"
            onClick={handleReindex}
            disabled={reindexing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-md hover:shadow-lg"
          >
            {reindexing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                กำลังอัปเดต AI...
              </>
            ) : (
              <>
                <Zap size={15} />
                อัปเดต AI Knowledge Base
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2">Re-index ข้อมูลเพื่อเพิ่มความแม่นยำ AI</p>
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
