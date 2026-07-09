import React, { useEffect, useState, useCallback } from 'react';
import StatCard from '../components/StatCard';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ── Palette for per-category lines ──────────────────────────────────────────
const CAT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// ── Reputation badge styles ──────────────────────────────────────────────────
const reputationStyle = {
  Trusted: 'bg-emerald-100 text-emerald-800',
  Active:  'bg-indigo-100  text-indigo-800',
  Regular: 'bg-amber-100   text-amber-800',
  New:     'bg-gray-100    text-gray-600',
};

const ROLE_LABELS = { 1: 'Student', 2: 'Staff', 3: 'Public', 4: 'Admin', 5: 'ไม่ระบุตัวตน' };

// ── Paginated fetch helper (backend max page_size = 100) ─────────────────────
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

const Dashboard = () => {
  const [stats,        setStats]        = useState({ totalUsers: 0, totalProblems: 0, resolvedProblems: 0, pendingProblems: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [buildingData, setBuildingData] = useState([]);
  const [timeSeries,   setTimeSeries]   = useState({ series: [], categories: [] });
  const [reputation,   setReputation]   = useState([]);
  const [loading,      setLoading]      = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [usersRes, publicItems, internalItems, tsRes, repRes] = await Promise.all([
        api.get('/users/list').catch(() => null),
        fetchAllPages('public'),
        fetchAllPages('internal'),
        api.get('/problems/analytics/time-series').catch(() => null),
        api.get('/problems/analytics/user-reputation').catch(() => null),
      ]);

      // ── Stats cards ────────────────────────────────────────────────────────
      const allProblems  = [...publicItems, ...internalItems];
      const uniqueProblems = Array.from(new Map(allProblems.map(p => [p.id, p])).values());
      setStats({
        totalUsers:       usersRes?.data?.data?.items?.length || 0,
        totalProblems:    uniqueProblems.length,
        resolvedProblems: uniqueProblems.filter(p => p.status_name === 'CLOSED').length,
        pendingProblems:  uniqueProblems.filter(p => p.status_name === 'OPEN').length,
      });

      // ── Bar chart category data ────────────────────────────────────────────
      const catMap = {};
      uniqueProblems.forEach(p => {
        const name = p.category_name || 'Uncategorized';
        catMap[name] = (catMap[name] || 0) + 1;
      });
      setCategoryData(
        Object.entries(catMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
      );

      // ── Bar chart location data ────────────────────────────────────────────
      const bldgMap = {};
      uniqueProblems.forEach(p => {
        const loc = p.building_name || 'Unknown Location';
        bldgMap[loc] = (bldgMap[loc] || 0) + 1;
      });
      setBuildingData(
        Object.entries(bldgMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      );

      // ── Time-series ────────────────────────────────────────────────────────
      const tsData = tsRes?.data?.data;
      if (tsData) {
        setTimeSeries({ series: tsData.series || [], categories: tsData.categories || [] });
      }

      // ── User reputation ────────────────────────────────────────────────────
      const repData = repRes?.data?.data?.items;
      if (repData) {
        setReputation(repData.slice(0, 10)); // Top 10
      }

    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-xl font-semibold text-indigo-600 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500 mt-1">Live analytics for the UP Voice platform.</p>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Users"    value={stats.totalUsers}       icon={Users}       colorClass="bg-blue-50   text-blue-600" />
        <StatCard title="Total Problems" value={stats.totalProblems}    icon={FileText}    colorClass="bg-indigo-50 text-indigo-600" />
        <StatCard title="Pending"        value={stats.pendingProblems}  icon={Clock}       colorClass="bg-orange-50 text-orange-600" />
        <StatCard title="Resolved"       value={stats.resolvedProblems} icon={CheckCircle} colorClass="bg-green-50  text-green-600" />
      </div>

      {/* ── Location Chart + Insights row (2/3 + 1/3) ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Location BarChart — 2/3 width */}
        <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm p-6">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-gray-800">Problems by Location</h3>
            <p className="text-xs text-gray-400 mt-0.5">Top 10 locations with highest problem reports</p>
          </div>
          {buildingData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buildingData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis
                    dataKey="name"
                    axisLine={false} tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 11 }} dy={8}
                    tickFormatter={v => v.length > 15 ? v.slice(0, 15) + '...' : v}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dx={-5} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} name="Total Problems" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
              No location data available.
            </div>
          )}
        </div>

        {/* Insights panel — 1/3 width */}
        <div className="bg-white border rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-gray-800">Quick Insights</h3>

          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Top Category</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">
              {categoryData.length > 0 ? categoryData[0].name : 'N/A'}
            </p>
            <p className="text-xs text-indigo-400 mt-1">{categoryData[0]?.count || 0} problems</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-xs font-semibold text-green-500 uppercase tracking-wide">Resolution Rate</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {stats.totalProblems > 0 ? Math.round((stats.resolvedProblems / stats.totalProblems) * 100) : 0}%
            </p>
            <p className="text-xs text-green-400 mt-1">{stats.resolvedProblems} of {stats.totalProblems} resolved</p>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Open Tickets</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pendingProblems}</p>
            <p className="text-xs text-amber-400 mt-1">Need attention</p>
          </div>

          {/* Category mini-bars */}
          <div className="mt-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">By Category</p>
            <div className="space-y-2">
              {categoryData.slice(0, 4).map((cat, i) => (
                <div key={cat.name}>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span className="truncate">{cat.name}</span>
                    <span className="font-semibold">{cat.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((cat.count / (categoryData[0]?.count || 1)) * 100)}%`,
                        backgroundColor: CAT_COLORS[i % CAT_COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── User Reputation Table ─────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">User Reputation</h3>
          <p className="text-xs text-gray-400 mt-0.5">Top contributors ranked by post count. Status is based on upvote-to-post ratio.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3 text-center">Total Posts</th>
                <th className="px-6 py-3 text-center">Total Upvotes</th>
                <th className="px-6 py-3 text-center">Ratio</th>
                <th className="px-6 py-3 text-center">Reputation</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reputation.map((user, idx) => (
                <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                        {(user.display_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.display_name}</p>
                        <p className="text-xs text-gray-400">#{user.user_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {ROLE_LABELS[user.role] || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-gray-700">{user.total_posts}</td>
                  <td className="px-6 py-4 text-center font-semibold text-indigo-600">{user.total_upvotes}</td>
                  <td className="px-6 py-4 text-center text-gray-500">{Number(user.ratio || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${reputationStyle[user.reputation_status] || reputationStyle.New}`}>
                      {user.reputation_status}
                    </span>
                  </td>
                </tr>
              ))}
              {reputation.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No user data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
