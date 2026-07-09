// src/pages/super-admin/GlobalHeatmap.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { fetchProblems, deriveGeoPoints, deriveCategoryBreakdown, deriveStatusBreakdown } from '../../services/problemService';
import {
  MapPin, TrendingUp, AlertCircle, CheckCircle2, Clock, Layers,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

// ── Map Component (Powered by react-leaflet) ─────────────
const HeatmapPlaceholder = ({ geoPoints }) => {
  const center = [19.0286, 99.8958]; // University of Phayao
  return (
    <div className="relative w-full h-full rounded-b-2xl overflow-hidden" style={{ zIndex: 0 }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {geoPoints.map((pt) => {
          if (!pt.latitude || !pt.longitude) return null;
          return (
            <Marker key={pt.id} position={[pt.latitude, pt.longitude]}>
              <Popup>
                <div className="text-sm min-w-[150px]">
                  <p className="font-bold text-slate-800">{pt.title || 'Untitled Report'}</p>
                  <p className="text-slate-600 mt-1">Category: {pt.category_name}</p>
                  <p className="text-slate-600">Status: <span className="font-semibold">{pt.status}</span></p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

// ── Category bar ───────────────────────────────────────────────
const CategoryBar = ({ name, count, max }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-slate-700 font-medium truncate">{name}</span>
        <span className="text-sm text-slate-500 ml-2 flex-shrink-0">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ── Skeleton Loader ────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
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
  const [data, setData] = useState({
    total: 0,
    byStatus: {},
    byCategory: [],
    geoPoints: [],
    byRole: {} // If we want to derive this manually we need user roles in the problem object
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all problems across pages
      const res = await fetchProblems({}, true);
      const allProblems = res.items || [];
      
      // Manually derive the data sets based on user requirements
      // We filter out is_deleted inside the derive helpers, though fetchProblems also does it.
      const statusBreakdown = deriveStatusBreakdown(allProblems);
      const categoryBreakdown = deriveCategoryBreakdown(allProblems);
      const geoPoints = deriveGeoPoints(allProblems);
      
      // Optional: derive roles if 'author.role' exists in the problem response
      const roleBreakdown = {};
      allProblems.forEach(p => {
        const r = p.author?.role || 'unknown';
        roleBreakdown[r] = (roleBreakdown[r] || 0) + 1;
      });

      setData({
        total: allProblems.length,
        byStatus: statusBreakdown,
        byCategory: categoryBreakdown,
        geoPoints: geoPoints,
        byRole: roleBreakdown
      });
      
    } catch (err) {
      console.error(err);
      setError('Failed to fetch and process problem data from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <LoadingSkeleton />;
  }

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

  const { total, byStatus, byCategory, geoPoints, byRole } = data;
  const maxCatCount = Math.max(...byCategory.map((c) => c.count), 1);

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Reports"   value={total}                          sub="All active reports" gradient="stat-card-indigo"  icon={TrendingUp}   />
        <StatCard label="Open"            value={byStatus.OPEN ?? 0}             sub="Awaiting action"    gradient="stat-card-amber"   icon={Clock}        />
        <StatCard label="In Progress"     value={byStatus.IN_PROGRESS ?? 0}      sub="Being handled"      gradient="stat-card-indigo"  icon={AlertCircle}  />
        <StatCard label="Resolved"        value={(byStatus.RESOLVED ?? 0) + (byStatus.CLOSED ?? 0)} sub="Closed + Resolved" gradient="stat-card-emerald" icon={CheckCircle2} />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Heatmap — spans 2 cols */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-800">Problem Distribution Map</h3>
              <p className="text-xs text-slate-500 mt-0.5">Plotting reports with valid GPS coordinates</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
              <MapPin size={16} />
            </div>
          </div>
          <div className="flex-1 min-h-[400px]">
            <HeatmapPlaceholder geoPoints={geoPoints} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* By category */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Problems by Category</h3>
            {byCategory.length === 0
              ? <p className="text-sm text-slate-400 text-center py-6">No categorised data yet</p>
              : <div className="space-y-4">
                  {byCategory.slice(0, 6).map((c) => (
                    <CategoryBar key={c.category_name} name={c.category_name} count={c.count} max={maxCatCount} />
                  ))}
                </div>
            }
          </div>

          {/* By role */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Reports by User Type</h3>
            <div className="space-y-4">
              {[
                { key: 'student', label: 'Students',  color: 'bg-indigo-500' },
                { key: 'staff',   label: 'Staff',     color: 'bg-violet-500' },
                { key: 'public',  label: 'Public',    color: 'bg-emerald-500' },
              ].map(({ key, label, color }) => {
                const cnt = byRole[key] ?? 0;
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
              {Object.keys(byRole).length === 0 && (
                 <p className="text-sm text-slate-400 text-center py-4">No role data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalHeatmap;
