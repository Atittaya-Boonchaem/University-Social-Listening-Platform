import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, CheckCircle, ShieldAlert, MapPin, BarChart3, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { fetchUsers } from '../services/userService';
// --- MOCK DATA FALLBACKS REMOVED ---
const phayaoCenter = [19.0289, 99.8967];

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const usersData = await fetchUsers();
        setUsers(usersData);

        const fetchAllPages = async (visibility) => {
          let page = 1;
          let allItems = [];
          while (true) {
            const res = await api.get('/problems/list', {
              params: { page, page_size: 100, visibility }
            }).catch(() => null);

            const items = res?.data?.data?.items || [];
            allItems = [...allItems, ...items];

            const total = res?.data?.data?.total || 0;
            if (allItems.length >= total || items.length === 0) break;
            page++;
          }
          return allItems;
        };

        const [publicItems, internalItems] = await Promise.all([
          fetchAllPages('public'),
          fetchAllPages('internal'),
        ]);

        const merged = [...publicItems, ...internalItems];
        const unique = Array.from(new Map(merged.map(p => [p.id, p])).values());
        
        console.log("Dashboard Fetched Problems:", unique);
        if (unique.length > 0) {
          console.log("Sample Problem Status:", unique[0]?.status_name);
        }
        setProblems(unique);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // --- DYNAMIC DATA BINDINGS ---
  const totalUsers = users.length;
  const pendingProblems = problems.filter(p => p.status_name === 'OPEN' || p.status_name === 'IN_PROGRESS').length;
  const resolvedProblems = problems.filter(p => p.status_name === 'RESOLVED' || p.status_name === 'CLOSED').length;
  const aiAutoBans = 0; // Placeholder

  const kpiStats = [
    { title: 'Total Users', value: totalUsers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Pending Problems', value: pendingProblems, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Resolved Problems', value: resolvedProblems, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'AI Auto-Bans', value: aiAutoBans, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const openCount = problems.filter(p => p.status_name === 'OPEN').length;
  const inProgressCount = problems.filter(p => p.status_name === 'IN_PROGRESS').length;
  
  const statusData = [
    { name: 'Open', value: openCount, color: '#f59e0b' },
    { name: 'In Progress', value: inProgressCount, color: '#3b82f6' },
    { name: 'Resolved', value: resolvedProblems, color: '#10b981' },
  ];

  const categoryMap = {};
  problems.forEach(p => {
    const cat = p.category_name || 'อื่นๆ';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  const categoryData = Object.keys(categoryMap).map(key => ({
    name: key,
    count: categoryMap[key]
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const sortedProblems = [...problems].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const recentActivity = sortedProblems.slice(0, 5).map(p => {
    const isResolved = p.status_name === 'RESOLVED' || p.status_name === 'CLOSED';
    return {
      id: p.id,
      title: p.title,
      category: p.category_name || 'N/A',
      time: new Date(p.created_at).toLocaleDateString(),
      status: p.status_name,
      statusColor: isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    };
  });

  if (loading) {
    return <div className="p-8 text-center text-indigo-600 font-semibold animate-pulse">Loading dashboard...</div>;
  }
  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2B164D]">Super Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">ภาพรวมและสถิติการแจ้งปัญหาของระบบ UP Connect</p>
        </div>
      </div>

      {/* ─── Task 1: KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Task 2: Map Section (Heatmap/Pin Map Simulation) ─── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
          <MapPin className="text-[#2B164D]" size={20} />
          <h2 className="text-lg font-bold text-slate-800">Problem Heatmap (Phayao University)</h2>
        </div>
        <div className="h-[400px] w-full z-0 relative">
          <MapContainer
            center={phayaoCenter}
            zoom={15}
            scrollWheelZoom={false}
            className="h-full w-full absolute inset-0 z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {problems.map((point) => {
              if (!point.latitude || !point.longitude) return null;
              const isResolved = point.status_name === 'RESOLVED' || point.status_name === 'CLOSED';
              const color = isResolved ? '#10b981' : (point.status_name === 'IN_PROGRESS' ? '#3b82f6' : '#ef4444');
              return (
                <CircleMarker
                  key={point.id}
                  center={[parseFloat(point.latitude), parseFloat(point.longitude)]}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.6 }}
                  radius={8}
                >
                  <Popup>
                    <div className="font-sans">
                      <strong className="block text-sm text-gray-900">{point.title}</strong>
                      <span className="text-xs text-gray-500">{point.category_name} - {point.status_name}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        </div>
      </div>

      {/* ─── Task 3: Analytics Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Problem Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="text-[#2B164D]" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Status Distribution</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {statusData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart B: Problems by Category */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-[#2B164D]" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Problems by Category</h2>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ─── Task 4: Recent Activity Table ─── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="text-[#2B164D]" size={20} />
          <h2 className="text-lg font-bold text-slate-800">Recent Activity Feed</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-3 font-semibold w-16">ID</th>
                <th className="pb-3 font-semibold">Title</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Time Reported</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentActivity.map((prob) => (
                <tr key={prob.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 font-medium text-slate-400">#{prob.id}</td>
                  <td className="py-3 font-medium text-slate-700 pr-4">{prob.title}</td>
                  <td className="py-3 text-slate-500 pr-4">{prob.category}</td>
                  <td className="py-3 text-slate-500 pr-4">{prob.time}</td>
                  <td className="py-3 text-right">
                    <span className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full ${prob.statusColor}`}>
                      {prob.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
