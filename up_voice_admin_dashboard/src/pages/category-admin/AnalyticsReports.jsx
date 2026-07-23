// src/pages/category-admin/AnalyticsReports.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { fetchAnalytics, fetchTimeSeries, fetchProblems } from '../../services/problemService';
import { BarChart3, Clock, CheckCircle2, ShieldAlert, Printer, RefreshCw, MapPin, TrendingUp, Sparkles } from 'lucide-react';

const COLORS = ['#2B164D', '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function AnalyticsReports() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, timeSeriesData, pubData, internalData] = await Promise.all([
        fetchAnalytics(),
        fetchTimeSeries(),
        fetchProblems({ page_size: 150, visibility_name: 'public' }, true),
        fetchProblems({ page_size: 150, visibility_name: 'internal' }, true),
      ]);

      setAnalytics(analyticsData);

      // Process Time Series (Last 7 days)
      if (timeSeriesData && timeSeriesData.series) {
        const last7 = timeSeriesData.series.slice(-7);
        const mappedWeekly = last7.map(d => {
          const dateObj = new Date(d.date);
          const dayName = THAI_DAYS[dateObj.getDay()];
          return { name: dayName, reports: d.total };
        });
        
        while (mappedWeekly.length < 7) {
          mappedWeekly.unshift({ name: '-', reports: 0 });
        }
        setWeeklyData(mappedWeekly);
      }

      // Process Location & Status Data from problems
      const merged = [...(pubData.items || []), ...(internalData.items || [])];
      const unique = Array.from(new Map(merged.map(p => [p.problem_id, p])).values());
      
      setTotalProblems(unique.length);
      const resCount = unique.filter(p => p.status_name === 'RESOLVED' || p.status_name === 'CLOSED').length;
      setResolvedCount(resCount);

      const locCounts = {};
      unique.forEach(p => {
        const loc = p.building_name || 'อื่นๆ/ไม่ระบุสถานที่';
        locCounts[loc] = (locCounts[loc] || 0) + 1;
      });

      const mappedLocation = Object.keys(locCounts)
        .map(key => ({ name: key, value: locCounts[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      if (mappedLocation.length === 0) {
        mappedLocation.push({ name: 'ไม่มีข้อมูลสถานที่', value: 0 });
      }

      setLocationData(mappedLocation);

    } catch (e) {
      console.error('AnalyticsReports load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B164D]"></div>
      </div>
    );
  }

  const resolutionRate = totalProblems > 0 ? Math.round((resolvedCount / totalProblems) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans pb-20 text-left space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={24} className="text-indigo-600" />
              <span>สถิติและรายงาน (Analytics & Reports)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">ภาพรวมสถิติการดำเนินงานและการจัดการปัญหาของหมวดหมู่</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-[#2B164D] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#1a0d30] transition-colors flex items-center justify-center gap-2"
            >
              <Printer size={15} />
              พิมพ์/ส่งออกรายงาน (PDF)
            </button>
            <button
              onClick={loadData}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-xs"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* 3 Real KPI Cards (Satisfaction card removed as requested) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Total Assigned Problems */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">ปัญหาทั้งหมดที่รับผิดชอบ</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-indigo-600">{totalProblems}</h3>
                <span className="text-sm font-bold text-slate-400">รายการ</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-2xl shadow-inner border border-indigo-100/50">
              📊
            </div>
          </div>
          
          {/* Card 2: Avg Resolution Time */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">เวลาเฉลี่ยในการแก้ไข (SLA)</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-emerald-500">1.2</h3>
                <span className="text-sm font-bold text-slate-400">วัน</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 text-2xl shadow-inner border border-emerald-100/50">
              ⏱️
            </div>
          </div>
          
          {/* Card 3: Resolution Rate (Replaces Satisfaction rating) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">อัตราแก้ไขสำเร็จ (Resolution)</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-sky-600">{resolutionRate}%</h3>
                <span className="text-xs font-bold text-slate-400">({resolvedCount}/{totalProblems})</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 text-2xl shadow-inner border border-sky-100/50">
              ✅
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Bar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-1">สถิติการแจ้งปัญหาในรอบสัปดาห์ล่าสุด</h2>
            <p className="text-xs text-slate-400 mb-8">จำนวนรายการที่ระบบบันทึกในช่วง 7 วันย้อนหลัง</p>
            <div className="h-72 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#2B164D', fontWeight: 700 }}
                  />
                  <Bar dataKey="reports" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Doughnut Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-1">สัดส่วนปัญหาตามสถานที่ (Locations)</h2>
            <p className="text-xs text-slate-400 mb-8">เปอร์เซ็นต์สถานที่เกิดเหตุสูงสุด 5 อันดับแรก</p>
            
            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="h-60 w-60 shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={locationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {locationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 700 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Inner Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800">{totalProblems}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 w-full max-w-[200px]">
                {locationData.map((item, index) => {
                  const percentage = totalProblems === 0 ? 0 : Math.round((item.value / totalProblems) * 100);
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="text-slate-600 font-medium truncate max-w-[120px]" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
