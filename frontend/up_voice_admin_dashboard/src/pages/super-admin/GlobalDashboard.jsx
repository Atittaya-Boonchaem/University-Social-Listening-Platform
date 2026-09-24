// src/pages/super-admin/GlobalDashboard.jsx
/**
 * UP Connect — Super Admin Executive Global Dashboard
 * Unified Command Center for the University of Phayao Social Listening Platform.
 * 
 * Features:
 *  - Executive KPI Cards (Total Issues, Pending Moderation Queue, In Progress, Resolved, SLA Health, Total Users)
 *  - Dedicated Moderation Queue with 1-click Approve to Live Feed & Reject
 *  - Campus GIS Problem Map (Leaflet) with Category Pin Colors & Popups
 *  - Problems by Category with Proportional Bars & Metrics
 *  - Normalized Top Problem Buildings Leaderboard
 *  - Recent Problem Activity Feed
 *  - Category & Status Filters
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart3, MapPin, Users, CheckCircle, Clock,
  RefreshCw, Building2, Layers, AlertTriangle, Shield,
  CheckCircle2, XCircle, ArrowUpRight, Filter, ChevronRight,
  Sparkles, Calendar, Search, Eye, AlertOctagon, Check,
  ExternalLink, UserCheck, ShieldAlert
} from 'lucide-react';
import { fetchAnalytics, fetchProblems, updateProblemStatus } from '../../services/problemService';
import { fetchUsers } from '../../services/userService';
import { fetchBuildings } from '../../services/buildingService';

const PHAYAO_CENTER = [19.0289, 99.8967];
const PHAYAO_BOUNDS = [
  [18.9600, 99.8200],
  [19.1200, 99.9800],
];
const BRAND_PURPLE = '#2B164D';
const BRAND_GOLD = '#F59E0B';
const BAR_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#14B8A6'];

// ── Category Progress Bar Component ─────────────────────────────
const CategoryBar = ({ name, count, max, color, totalAll }) => {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const pctOfTotal = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
  const barColor = color || '#6366F1';
  return (
    <div className="group p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-slate-700 font-bold truncate flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 shadow-xs" style={{ backgroundColor: barColor }} />
          {name}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-400">{pctOfTotal}%</span>
          <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{count} เคส</span>
        </div>
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
  const [userList, setUserList] = useState([]);
  const [geoPointsState, setGeoPoints] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [pendingProblems, setPendingProblems] = useState([]);
  const [masterBuildings, setMasterBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'moderation' | 'map' | 'buildings'
  const [toastMessage, setToastMessage] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Show temporary toast notification
  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAll = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [analyticsData, usersData, bldData, probRes, pendingRes] = await Promise.all([
        fetchAnalytics(),
        fetchUsers().catch(() => []),
        fetchBuildings().catch(() => []),
        fetchProblems({ page_size: 300 }, true).catch(() => ({ items: [] })),
        fetchProblems({ status_name: 'PENDING_REVIEW', page_size: 50 }).catch(() => ({ items: [] })),
      ]);

      setAnalytics(analyticsData);
      const uList = Array.isArray(usersData) ? usersData : usersData?.items || [];
      setUserList(uList);
      setTotalUsers(uList.length || 0);
      setGeoPoints(analyticsData?.geo_points ?? []);
      setMasterBuildings(Array.isArray(bldData) ? bldData : bldData?.data || []);
      
      const pItems = probRes?.items || probRes || [];
      setAllProblems(pItems);

      // Pending problems (can be from pendingRes or filtered from allProblems)
      const pendingList = pendingRes?.items || pItems.filter(p => (p.status_name || '').toUpperCase() === 'PENDING_REVIEW');
      setPendingProblems(pendingList);
    } catch (e) {
      console.error('GlobalDashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Handle Super Admin Moderation: Approve to OPEN or Reject to CLOSED
  const handleModerateTicket = async (problemId, action) => {
    setActionLoadingId(problemId);
    try {
      const newStatus = action === 'approve' ? 'OPEN' : 'CLOSED';
      const notes = action === 'approve' ? 'อนุมัติเผยแพร่ขึ้นฟีดโดย Super Admin' : 'ปฏิเสธคำร้องโดย Super Admin';
      await updateProblemStatus(problemId, newStatus, notes);
      
      // Update local state immediately
      setPendingProblems(prev => prev.filter(p => p.problem_id !== problemId));
      setAllProblems(prev => prev.map(p => p.problem_id === problemId ? { ...p, status_name: newStatus } : p));
      
      showToast(action === 'approve' ? '✅ อนุมัติคำร้องขึ้นฟีดเรียบร้อยแล้ว' : '❌ ปฏิเสธคำร้องแล้ว', 'success');
      // Background sync
      loadAll(true);
    } catch (err) {
      console.error('Moderation error:', err);
      showToast('เกิดข้อผิดพลาดในการปรับสถานะ: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Categories list
  const categoryOptions = useMemo(() => {
    return Array.from(new Set([
      ...(analytics?.by_category || []).map(c => c.category_name),
      ...allProblems.map(p => p.category_name).filter(Boolean),
    ]));
  }, [analytics, allProblems]);

  // Filtered problems based on selected category
  const visibleProblems = useMemo(() => {
    if (selectedCategory === 'ALL') return allProblems;
    return allProblems.filter(p => p.category_name === selectedCategory);
  }, [allProblems, selectedCategory]);

  const byStatus = useMemo(() => {
    if (selectedCategory === 'ALL') return (analytics?.by_status ?? {});
    return visibleProblems.reduce((acc, p) => {
      const key = (p.status_name || 'UNKNOWN').toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [analytics, visibleProblems, selectedCategory]);

  const byCategory = useMemo(() => {
    if (selectedCategory === 'ALL') return (analytics?.by_category ?? []);
    return [{ category_name: selectedCategory, count: visibleProblems.length }];
  }, [analytics, visibleProblems, selectedCategory]);

  const total = selectedCategory === 'ALL' ? (analytics?.total ?? allProblems.length) : visibleProblems.length;
  const geoPoints = useMemo(() => {
    if (selectedCategory === 'ALL') return geoPointsState;
    return geoPointsState.filter(p => p.category_name === selectedCategory);
  }, [geoPointsState, selectedCategory]);

  const resolved = (byStatus['RESOLVED'] ?? 0) + (byStatus['CLOSED'] ?? 0);
  const pendingReviewCount = byStatus['PENDING_REVIEW'] ?? pendingProblems.length;
  const inProgressCount = (byStatus['OPEN'] ?? 0) + (byStatus['IN_PROGRESS'] ?? 0);
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const maxCatCount = Math.max(...byCategory.map((c) => c.count), 1);

  // SLA calculation
  const slaMetrics = useMemo(() => {
    let onTrack = 0;
    let atRisk = 0;
    let breached = 0;
    const now = new Date();

    visibleProblems.forEach(p => {
      if ((p.status_name || '').toUpperCase() === 'RESOLVED' || (p.status_name || '').toUpperCase() === 'CLOSED') {
        onTrack++;
        return;
      }
      const created = p.created_at ? new Date(p.created_at) : now;
      const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      if (daysOpen < 3) onTrack++;
      else if (daysOpen <= 7) atRisk++;
      else breached++;
    });

    const activeTotal = onTrack + atRisk + breached || 1;
    return {
      onTrack,
      atRisk,
      breached,
      onTrackPct: Math.round((onTrack / activeTotal) * 100),
    };
  }, [visibleProblems]);

  // Aggregate problem counts + dominant category per building
  const topBuildings = useMemo(() => {
    const buildingMap = {};
    const problemSource = visibleProblems.length > 0 ? visibleProblems : geoPoints;

    problemSource.forEach(p => {
      const rawName = p.building_name || p.location || p.building?.name;
      if (rawName && String(rawName).trim()) {
        const clean = String(rawName).trim();
        let matchedName = clean;

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

        if (matchedMaster) matchedName = matchedMaster.name;

        if (!buildingMap[matchedName]) {
          buildingMap[matchedName] = { count: 0, categoryCounts: {} };
        }
        buildingMap[matchedName].count += 1;

        const catName = p.category_name || 'อื่นๆ';
        const catColor = p.color_code ||
          geoPoints.find(g => g.category_name === catName)?.color_code ||
          byCategory.find(c => c.category_name === catName)?.color_code ||
          '#6366F1';

        if (!buildingMap[matchedName].categoryCounts[catName]) {
          buildingMap[matchedName].categoryCounts[catName] = { count: 0, color: catColor };
        }
        buildingMap[matchedName].categoryCounts[catName].count += 1;
      }
    });

    return Object.entries(buildingMap)
      .map(([name, data]) => {
        const dominantCat = Object.entries(data.categoryCounts)
          .sort((a, b) => b[1].count - a[1].count)[0];
        const dominantColor = dominantCat ? dominantCat[1].color : '#6366F1';
        const dominantCatName = dominantCat ? dominantCat[0] : '';
        return { name, count: data.count, color: dominantColor, category: dominantCatName };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [visibleProblems, geoPoints, masterBuildings, byCategory]);

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-4 text-[#2B164D] font-sans">
        <div className="w-12 h-12 border-4 border-[#2B164D]/20 border-t-[#2B164D] rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-600">กำลังเชื่อมต่อฐานข้อมูล UP Connect และประมวลผลข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* ─── Toast Notification ─── */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold text-white transition-all transform animate-bounce ${
            toastMessage.type === 'success' ? 'bg-[#2B164D]' : 'bg-rose-600'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} className="text-[#F59E0B]" /> : <XCircle size={18} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* ─── Header & Executive Hero Banner ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2B164D] via-[#3B1C66] to-[#51238C] text-white p-6 sm:p-8 shadow-xl shadow-[#2B164D]/15 border border-[#4B267D]">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#D8B4FE]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-[#FDE68A]">
              <Shield size={14} className="text-[#F59E0B]" />
              <span>ศูนย์ควบคุมและบริหารจัดการภาพรวมระดับผู้บริหาร (Executive Command Center)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">
              UP Connect Global Overview
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/80 max-w-2xl leading-relaxed">
              ติดตามรายงานเรื่องร้องเรียน สถิติการแก้ไขปัญหาแบบเรียลไทม์ และการกระจายงานข้ามหมวดหมู่ทั่วทั้งมหาวิทยาลัยพะเยา
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown Filter */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-3 py-2 text-white">
              <Filter size={15} className="text-[#F59E0B]" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-2 text-white [&>option]:text-slate-800"
                aria-label="เลือกหมวดหมู่ที่ต้องการดู"
              >
                <option value="ALL">ภาพรวมทุกหมวดหมู่ ({allProblems.length} เคส)</option>
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#2B164D] hover:bg-[#FAF8FC] rounded-2xl text-xs font-black transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#F59E0B]' : 'text-[#2B164D]'} />
              <span>{refreshing ? 'กำลังซิงค์...' : 'รีเฟรชข้อมูล'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 6 Executive KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Issues */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#2B164D] flex items-center justify-center mb-3">
            <BarChart3 size={20} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ปัญหาทั้งหมด</p>
          <p className="text-2xl font-black text-slate-800 mt-0.5">{total}</p>
          <span className="text-[10px] text-purple-600 font-bold mt-1 inline-block">
            {selectedCategory === 'ALL' ? 'ทุกหมวดหมู่ในระบบ' : selectedCategory}
          </span>
        </div>

        {/* Card 2: Pending Moderation (Critical for Super Admin!) */}
        <div
          onClick={() => setActiveTab('moderation')}
          className={`rounded-2xl border p-4 shadow-xs transition-all cursor-pointer hover:shadow-md relative overflow-hidden ${
            pendingReviewCount > 0
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200/80'
          }`}
        >
          {pendingReviewCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          )}
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <AlertTriangle size={20} />
          </div>
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">รอตรวจ/อนุมัติ</p>
          <p className="text-2xl font-black text-amber-700 mt-0.5">{pendingReviewCount}</p>
          <span className="text-[10px] text-amber-700 font-bold mt-1 flex items-center gap-1">
            <span>คิวกลั่นกรอง</span>
            <ArrowUpRight size={12} />
          </span>
        </div>

        {/* Card 3: In Progress & Open */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Clock size={20} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">อยู่ระหว่างแก้ไข</p>
          <p className="text-2xl font-black text-blue-600 mt-0.5">{inProgressCount}</p>
          <span className="text-[10px] text-blue-500 font-bold mt-1 inline-block">รับเรื่องแล้ว</span>
        </div>

        {/* Card 4: Resolved & Closed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle size={20} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">แก้ไขเสร็จสิ้น</p>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{resolved}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
              {resolutionRate}% สำเร็จ
            </span>
          </div>
        </div>

        {/* Card 5: SLA Performance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <ShieldAlert size={20} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ความเร็ว SLA</p>
          <p className="text-2xl font-black text-indigo-600 mt-0.5">{slaMetrics.onTrackPct}%</p>
          <span className="text-[10px] text-slate-500 font-bold mt-1 inline-block">
            {slaMetrics.onTrack} ตรงเวลา / {slaMetrics.breached} เกินกำหนด
          </span>
        </div>

        {/* Card 6: Total Users */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
            <Users size={20} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ผู้ใช้งานในระบบ</p>
          <p className="text-2xl font-black text-violet-600 mt-0.5">{totalUsers}</p>
          <span className="text-[10px] text-slate-500 font-bold mt-1 inline-block">นิสิต & บุคลากร</span>
        </div>
      </div>

      {/* ─── Interactive Navigation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#2B164D] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 size={16} />
          <span>ภาพรวมและสถิติ (Overview & Analytics)</span>
        </button>
      </div>

      {/* ─── TAB 1: MODERATION QUEUE (PENDING_REVIEW) ─── */}
      {activeTab === 'moderation' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-[#F59E0B]" />
                <span>คิวกลั่นกรองคำร้องใหม่ (Ticket Moderation Queue)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                คำร้องที่นิสิตและบุคลากรแจ้งเข้ามาและมีสถานะ PENDING_REVIEW เพื่อให้แอดมินหมวดหมู่หรือ Super Admin ตรวจสอบก่อนขึ้นฟีดสาธารณะ
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              รอการตรวจสอบ {pendingProblems.length} รายการ
            </span>
          </div>

          {pendingProblems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-base font-bold text-slate-700">ไม่มีคำร้องค้างตรวจสอบในระบบ!</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                ทุกเรื่องร้องเรียนได้รับการกลั่นกรองและอนุมัติขึ้นสู่ระบบเรียบร้อยแล้ว เมื่อมีคำร้องใหม่เข้ามาจะปรากฏที่นี่ทันที
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProblems.map((prob) => {
                const isLoading = actionLoadingId === prob.problem_id;
                return (
                  <div
                    key={prob.problem_id}
                    className="p-5 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50/30 to-white hover:border-amber-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {prob.ticket_id || `#${prob.problem_id}`}
                        </span>
                        <span
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: (prob.color_code || '#F59E0B') + '22',
                            color: prob.color_code || '#B45309',
                            border: `1px solid ${(prob.color_code || '#F59E0B')}55`,
                          }}
                        >
                          📁 {prob.category_name || 'หมวดหมู่ทั่วไป'}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {prob.visibility_name === 'staff_only' || prob.visibility_id === 2 ? '🔒 ภายใน' : '🌐 สาธารณะ'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {prob.created_at ? new Date(prob.created_at).toLocaleString('th-TH') : 'ไม่ระบุเวลา'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-800 leading-snug">
                        {prob.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {prob.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        {prob.building_name && (
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <MapPin size={14} className="text-[#2B164D]" />
                            {prob.building_name} {prob.location_detail ? `(${prob.location_detail})` : ''}
                          </span>
                        )}
                        <span>ผู้แจ้ง: <strong className="text-slate-700">{prob.user?.display_name || 'นิสิต/บุคลากร'}</strong></span>
                      </div>
                    </div>

                    {/* Moderate Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button
                        onClick={() => handleModerateTicket(prob.problem_id, 'approve')}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        <Check size={16} />
                        <span>อนุมัติขึ้นฟีด</span>
                      </button>

                      <button
                        onClick={() => handleModerateTicket(prob.problem_id, 'reject')}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        <span>ปฏิเสธคำร้อง</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: OVERVIEW & ANALYTICS ─── */}
      {(activeTab === 'overview' || activeTab === 'map') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heatmap & Leaflet GIS (Spans 2 columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2B164D] text-white flex items-center justify-center shadow-xs">
                  <MapPin size={17} className="text-[#F59E0B]" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm md:text-base">แผนที่พิกัดปัญหาและจุดเสี่ยง (Campus GIS Map)</h2>
                  <p className="text-[11px] text-slate-400">พิกัดดาวเทียมจริงของข้อร้องเรียนรอบมหาวิทยาลัยพะเยา</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-purple-50 text-[#2B164D] border border-purple-200 px-3 py-1 rounded-full">
                {geoPoints.length} พิกัด
              </span>
            </div>

            <div className="h-[380px] relative">
              <MapContainer
                center={PHAYAO_CENTER}
                zoom={15}
                minZoom={13}
                maxZoom={18}
                maxBounds={PHAYAO_BOUNDS}
                maxBoundsViscosity={1.0}
                scrollWheelZoom={false}
                className="h-full w-full absolute inset-0 z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoPoints.map((pt, idx) => {
                  const color = pt.color_code || (pt.status === 'RESOLVED' ? '#10B981' : '#6366F1');
                  return (
                    <CircleMarker
                      key={pt.id || idx}
                      center={[parseFloat(pt.latitude), parseFloat(pt.longitude)]}
                      pathOptions={{ color: color, fillColor: color, fillOpacity: 0.85 }}
                      radius={10}
                    >
                      <Popup>
                        <div className="p-1 text-left font-sans max-w-[240px]">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded text-white mb-1.5 inline-block"
                            style={{ backgroundColor: color }}
                          >
                            📁 {pt.category_name || 'หมวดหมู่ทั่วไป'}
                          </span>
                          <strong className="block text-sm text-slate-800 font-bold leading-snug">{pt.title}</strong>
                          {pt.building_name && (
                            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                              📍 <span>{pt.building_name}</span>
                            </p>
                          )}
                          <span className="text-xs text-slate-500 mt-1 block">
                            สถานะ: <strong className="text-purple-700">{pt.status}</strong>
                          </span>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Category Color Legend */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 overflow-x-auto text-xs font-medium text-slate-600">
              <span className="text-slate-400 font-bold flex-shrink-0 text-[11px] uppercase">สัญลักษณ์สี:</span>
              {byCategory.map((cat, i) => {
                const catColor = geoPoints.find(g => g.category_name === cat.category_name)?.color_code || BAR_COLORS[i % BAR_COLORS.length];
                return (
                  <div key={cat.category_name} className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full shadow-xs border border-black/10" style={{ backgroundColor: catColor }} />
                    <span className="text-slate-700 text-xs font-semibold">{cat.category_name} ({cat.count})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Problems by Category Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#2B164D] flex items-center justify-center">
                    <Layers size={18} />
                  </div>
                  <h2 className="font-bold text-slate-800 text-sm md:text-base">ปัญหาแยกตามหมวดหมู่</h2>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {byCategory.length} หมวด
                </span>
              </div>

              {byCategory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10">ไม่มีข้อมูลหมวดหมู่</p>
              ) : (
                <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                  {byCategory.map((c, idx) => {
                    const color = geoPoints.find(g => g.category_name === c.category_name)?.color_code || BAR_COLORS[idx % BAR_COLORS.length];
                    return (
                      <CategoryBar
                        key={c.category_name}
                        name={c.category_name}
                        count={c.count}
                        max={maxCatCount}
                        totalAll={total}
                        color={color}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-center">
              <p className="text-[11px] text-slate-400">
                สัดส่วนเปอร์เซ็นต์คำร้องของแต่ละหมวดหมู่เทียบกับภาพรวมทั้งหมด
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: TOP PROBLEM BUILDINGS TABLE ─── */}
      {(activeTab === 'overview' || activeTab === 'buildings') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#2B164D] flex items-center justify-center">
                <Building2 size={22} className="text-[#F59E0B]" />
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-base">สถิติพื้นที่เกิดเหตุบ่อย (Top Problem Hotspots)</h2>
                <p className="text-xs text-slate-400">จัดกลุ่มรายงานปัญหาตามรายชื่ออาคารสถานที่หลัก Master Building ของมหาวิทยาลัยพะเยา</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#2B164D] bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
              บันทึกแล้ว {topBuildings.reduce((sum, b) => sum + b.count, 0)} เคส
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
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="px-5 py-3.5 w-16 text-center">อันดับ</th>
                    <th className="px-5 py-3.5">ชื่ออาคารสถานที่ (Master Building)</th>
                    <th className="px-5 py-3.5">หมวดหมู่หลักที่พบ</th>
                    <th className="px-5 py-3.5 w-52">สัดส่วนเคสปัญหา</th>
                    <th className="px-5 py-3.5 w-32 text-right">จำนวนเคส</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {topBuildings.map((b, idx) => {
                    const totalCount = topBuildings.reduce((sum, item) => sum + item.count, 0);
                    const pct = totalCount > 0 ? Math.round((b.count / totalCount) * 100) : 0;
                    const barColor = b.color || '#6366F1';
                    return (
                      <tr key={b.name} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black shadow-xs ${
                            idx === 0 ? 'bg-amber-400 text-white' :
                            idx === 1 ? 'bg-slate-300 text-slate-700' :
                            idx === 2 ? 'bg-amber-600 text-white' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-800 text-xs md:text-sm">
                          {b.name}
                        </td>
                        <td className="px-5 py-4">
                          {b.category ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: barColor + '22', color: barColor, border: `1px solid ${barColor}44` }}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
                              {b.category}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${pct}%`, backgroundColor: barColor }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 w-9 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span
                            className="inline-block px-3 py-1 font-extrabold text-xs rounded-xl"
                            style={{ backgroundColor: barColor + '18', color: barColor, border: `1px solid ${barColor}33` }}
                          >
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
      )}
    </div>
  );
}
