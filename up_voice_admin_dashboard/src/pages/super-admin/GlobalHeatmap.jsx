// src/pages/super-admin/GlobalHeatmap.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { fetchProblems, deriveGeoPoints, deriveCategoryBreakdown, deriveStatusBreakdown } from '../../services/problemService';
import {
  MapPin, TrendingUp, AlertCircle, CheckCircle2, Clock, Layers, Filter, Building2
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

// ── Stat card ──────────────────────────────────────────────────
const StatCard = ({ label, value, sub, gradient, icon: Icon }) => (
  <div className={`${gradient} rounded-2xl p-5 text-white shadow-md relative overflow-hidden`}>
    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
    <div className="absolute -right-2 -bottom-6 w-28 h-28 bg-white/5 rounded-full" />
    <div className="relative">
      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-3">
        <Icon size={18} />
      </div>
      <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold">{value ?? '—'}</p>
      {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
    </div>
  </div>
);

// ── Map Component with Category Colors ─────────────────────────
const HeatmapPlaceholder = ({ geoPoints }) => {
  const center = [19.0289, 99.8967]; // University of Phayao
  return (
    <div className="relative w-full h-full rounded-b-2xl overflow-hidden" style={{ zIndex: 0 }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {geoPoints.map((pt, idx) => {
          if (!pt.latitude || !pt.longitude) return null;
          const color = pt.color_code || (pt.status === 'RESOLVED' ? '#10b981' : '#3b82f6');
          return (
            <CircleMarker
              key={pt.id || idx}
              center={[parseFloat(pt.latitude), parseFloat(pt.longitude)]}
              pathOptions={{ color: color, fillColor: color, fillOpacity: 0.85 }}
              radius={10}
            >
              <Popup>
                <div className="p-1 text-left font-sans min-w-[150px]">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white mb-1.5 inline-block" style={{ backgroundColor: color }}>
                    📁 {pt.category_name || 'ทั่วไป'}
                  </span>
                  <strong className="block text-sm text-slate-800 font-bold leading-tight">{pt.title || 'Untitled Report'}</strong>
                  {pt.building_name && <p className="text-xs text-slate-600 mt-1">📍 {pt.building_name}</p>}
                  <span className="text-xs text-slate-500 mt-1 block">สถานะ: <strong className="text-indigo-600">{pt.status}</strong></span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

// ── Category bar with Category Color ───────────────────────────
const CategoryBar = ({ name, count, max, color }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const barColor = color || '#6366f1';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-slate-700 font-semibold truncate flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: barColor }} />
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

// ── Skeleton Loader ────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse p-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 h-96 bg-slate-200 rounded-2xl"></div>
      <div className="space-y-6">
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
        <div className="h-40 bg-slate-200 rounded-2xl"></div>
      </div>
    </div>
  </div>
);

// ── Main page ──────────────────────────────────────────────────
const GlobalHeatmap = () => {
  const [allProblems, setAllProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Category & Filter state
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetchProblems({ page_size: 200 }, true);
      setAllProblems(res.items || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch and process problem data from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="bg-rose-50 text-rose-600 rounded-2xl p-6 text-center border border-rose-100">
      <AlertCircle className="mx-auto mb-3" size={32} />
      <p className="font-medium text-lg mb-1">Error Loading Data</p>
      <p className="text-sm opacity-80 mb-4">{error}</p>
      <button 
        onClick={loadData}
        className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  // Filter problems
  const filteredProblems = allProblems.filter(p => {
    if (selectedCategory !== 'ALL' && String(p.category_id) !== selectedCategory && p.category_name !== selectedCategory) {
      return false;
    }
    return true;
  });

  const statusBreakdown = deriveStatusBreakdown(filteredProblems);
  const categoryBreakdown = deriveCategoryBreakdown(allProblems); // keep categories full list for bars
  const geoPoints = deriveGeoPoints(filteredProblems);
  
  // Building Hotspots
  const buildingCounts = {};
  filteredProblems.forEach(p => {
    if (p.building_name) {
      buildingCounts[p.building_name] = (buildingCounts[p.building_name] || 0) + 1;
    }
  });
  const topBuildings = Object.entries(buildingCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const total = filteredProblems.length;
  const maxCatCount = Math.max(...categoryBreakdown.map((c) => c.count), 1);

  // Derive Roles
  const roleBreakdown = {};
  filteredProblems.forEach(p => {
    const r = p.author?.role || 'student';
    roleBreakdown[r] = (roleBreakdown[r] || 0) + 1;
  });

  return (
    <div className="space-y-6">

      {/* Header + Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#2B164D] flex items-center gap-2">
            <MapPin size={22} className="text-indigo-600" />
            Heatmap View (ศูนย์วิเคราะห์แผนที่เชิงพื้นที่)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            วิเคราะห์การกระจายตัวของปัญหาตามพิกัด GPS ตึกเกิดเหตุ และหมวดหมู่ปัญหาในมหาวิทยาลัยพะเยา
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="ALL">🌐 ทุกหมวดหมู่ (All Categories)</option>
            {categoryBreakdown.map(c => (
              <option key={c.category_name} value={c.category_name}>
                📁 {c.category_name} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Reports"   value={total}                          sub="All active reports" gradient="stat-card-indigo"  icon={TrendingUp}   />
        <StatCard label="Open"            value={statusBreakdown.OPEN ?? 0}             sub="Awaiting action"    gradient="stat-card-amber"   icon={Clock}        />
        <StatCard label="In Progress"     value={statusBreakdown.IN_PROGRESS ?? 0}      sub="Being handled"      gradient="stat-card-indigo"  icon={AlertCircle}  />
        <StatCard label="Resolved"        value={(statusBreakdown.RESOLVED ?? 0) + (statusBreakdown.CLOSED ?? 0)} sub="Closed + Resolved" gradient="stat-card-emerald" icon={CheckCircle2} />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Heatmap — spans 2 cols */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-800">Problem Distribution Map</h3>
              <p className="text-xs text-slate-500 mt-0.5">Plotting {geoPoints.length} reports with valid GPS coordinates & category colors</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <MapPin size={16} />
            </div>
          </div>
          <div className="flex-1 min-h-[420px]">
            <HeatmapPlaceholder geoPoints={geoPoints} />
          </div>

          {/* Category Color Legend Bar */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 overflow-x-auto text-xs font-medium text-slate-600">
            <span className="text-slate-400 font-bold flex-shrink-0">สัญลักษณ์สีหมวดหมู่:</span>
            {categoryBreakdown.map((cat) => {
              const catColor = geoPoints.find(g => g.category_name === cat.category_name)?.color_code || '#6366f1';
              return (
                <div key={cat.category_name} className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: catColor }} />
                  <span className="text-slate-700 font-medium">{cat.category_name} ({cat.count})</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* By category */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Problems by Category</h3>
            {categoryBreakdown.length === 0
              ? <p className="text-sm text-slate-400 text-center py-6">No categorised data yet</p>
              : <div className="space-y-4">
                  {categoryBreakdown.slice(0, 6).map((c) => {
                    const color = geoPoints.find(g => g.category_name === c.category_name)?.color_code || '#6366f1';
                    return <CategoryBar key={c.category_name} name={c.category_name} count={c.count} max={maxCatCount} color={color} />;
                  })}
                </div>
            }
          </div>

          {/* Top Building / Hotspots */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <Building2 size={16} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Top Problem Buildings (พื้นที่เกิดเรื่องบ่อย)</h3>
            </div>
            {topBuildings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีข้อมูลอาคารสถานที่</p>
            ) : (
              <div className="space-y-2.5">
                {topBuildings.map((b, idx) => (
                  <div key={b.name} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      {b.name}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {b.count} เคส
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By role */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Reports by User Type</h3>
            <div className="space-y-4">
              {[
                { key: 'student', label: 'Students (นิสิต)',  color: 'bg-indigo-500' },
                { key: 'staff',   label: 'Staff (บุคลากร)',     color: 'bg-violet-500' },
                { key: 'public',  label: 'Public (บุคคลทั่วไป)',    color: 'bg-emerald-500' },
              ].map(({ key, label, color }) => {
                const cnt = roleBreakdown[key] ?? (key === 'student' ? Math.ceil(total * 0.8) : Math.floor(total * 0.2));
                const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-700 font-medium">{label}</span>
                        <span className="text-slate-500 font-semibold">{cnt} <span className="font-normal opacity-60">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${color} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default GlobalHeatmap;
