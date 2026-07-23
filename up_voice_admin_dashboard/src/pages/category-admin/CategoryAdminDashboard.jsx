import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { fetchProblems, updateProblemStatus, fetchAnalytics } from '../../services/problemService';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Filter, Layers, CheckCircle2, Clock, AlertTriangle, RefreshCw, X, Eye, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

const PHAYAO_CENTER = [19.0289, 99.8967];

export default function CategoryAdminDashboard() {
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [allRawProblems, setAllRawProblems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(null);

  // Status Filter State for Interactive Stat Cards
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  const [showMap, setShowMap] = useState(false);
  const [assignedCatName, setAssignedCatName] = useState('');

  useEffect(() => {
    api.get('/users/me')
      .then(res => {
        if (res.data?.success && res.data?.data?.category_name) {
          setAssignedCatName(res.data.data.category_name);
        }
      })
      .catch(() => {});
  }, []);

  // Get Admin Name from token
  const getAdminName = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.display_name || payload.email || 'แอดมินปัญหา';
      }
    } catch {}
    return 'แอดมินปัญหา';
  };
  const adminName = getAdminName();

  // Format today's date in Thai format
  const today = new Date().toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pubData, internalData, analyticsData] = await Promise.all([
        fetchProblems({ page_size: 150, visibility_name: 'public' }, true),
        fetchProblems({ page_size: 150, visibility_name: 'internal' }, true),
        fetchAnalytics(),
      ]);

      const merged = [...(pubData.items || []), ...(internalData.items || [])];
      const unique = Array.from(new Map(merged.map(p => [p.problem_id, p])).values());

      setAllRawProblems(unique);

      // Separate parents and children across ALL statuses (including RESOLVED)
      const parents = unique.filter(p => !p.parent_problem_id);
      const children = unique.filter(p => p.parent_problem_id);

      const constructedClusters = parents.map(parent => {
        const dups = children.filter(child => child.parent_problem_id === parent.problem_id);
        const allPostsInCluster = [
          {
            id: parent.problem_id,
            text: parent.description,
            author: parent.author_name || parent.author?.display_name || "ไม่ระบุชื่อ",
            time: new Date(parent.created_at).toLocaleString('th-TH'),
            locationDetail: parent.building_name || parent.location || "ไม่ระบุสถานที่",
            images: parent.attachments?.map(a => a.file_url) || []
          },
          ...dups.map(dup => ({
            id: dup.problem_id,
            text: dup.description,
            author: dup.author_name || dup.author?.display_name || "ไม่ระบุชื่อ",
            time: new Date(dup.created_at).toLocaleString('th-TH'),
            locationDetail: dup.building_name || dup.location || "ไม่ระบุสถานที่",
            images: dup.attachments?.map(a => a.file_url) || []
          }))
        ];

        return {
          id: parent.ticket_id || (parent.ticket_prefix ? `${parent.ticket_prefix}-${new Date(parent.created_at).getFullYear().toString().slice(-2)}-${String(parent.problem_id).padStart(4, '0')}` : `#${parent.problem_id}`),
          problem_id: parent.problem_id,
          topic: parent.title,
          date: new Date(parent.created_at).toLocaleDateString('th-TH'),
          isoDate: parent.created_at.split('T')[0],
          location: parent.building_name || parent.location || "ไม่ระบุสถานที่",
          latitude: parent.latitude,
          longitude: parent.longitude,
          category_name: parent.category_name,
          color_code: parent.color_code || '#2B164D',
          reportCount: allPostsInCluster.length,
          status: parent.status_name,
          posts: allPostsInCluster
        };
      });

      setClusters(constructedClusters);
      setAnalytics(analyticsData);

      // Automatically show map if category has GPS coordinates
      const hasGps = constructedClusters.some(c => c.latitude && c.longitude);
      setShowMap(hasGps);

    } catch (e) {
      console.error(e);
      setError('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadData(); 
  }, [loadData]);

  const handleStatusChange = async (problemId, newStatus) => {
    setIsUpdatingStatus(problemId);
    try {
      await updateProblemStatus(problemId, newStatus);
      setClusters(prev => prev.map(c => 
        c.problem_id === problemId ? { ...c, status: newStatus } : c
      ));
      const newAnalytics = await fetchAnalytics();
      setAnalytics(newAnalytics);
    } catch (err) {
      alert("ไม่สามารถเปลี่ยนสถานะได้: " + err.message);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const openModal = (cluster) => {
    setSelectedCluster(cluster);
    setExpandedPostId(null);
  };

  // Filter clusters by search, date, AND active status card filter
  const filteredClusters = clusters.filter(c => {
    const matchSearch = !search || c.topic.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchDate = !dateFilter || c.isoDate === dateFilter;
    
    let matchStatus = true;
    if (statusFilter === 'OPEN') {
      matchStatus = c.status === 'OPEN';
    } else if (statusFilter === 'IN_PROGRESS') {
      matchStatus = c.status === 'IN_PROGRESS';
    } else if (statusFilter === 'RESOLVED') {
      matchStatus = c.status === 'RESOLVED' || c.status === 'CLOSED';
    }

    return matchSearch && matchDate && matchStatus;
  });

  // Calculate real counts across all loaded items
  const openCount = clusters.filter(c => c.status === 'OPEN').length;
  const progressCount = clusters.filter(c => c.status === 'IN_PROGRESS').length;
  const resolvedCount = clusters.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  // GPS points for location map
  const geoPoints = clusters.filter(c => c.latitude && c.longitude);
  const categoryTitle = assignedCatName || clusters[0]?.category_name || 'หมวดหมู่ปัญหาของคุณ';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B164D]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-left space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span>Category Admin Dashboard</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full font-bold">
                📁 {categoryTitle}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">บริหารจัดการและติดตามปัญหากลุ่มงานที่คุณรับผิดชอบ</p>
          </div>
          <div className="flex items-center gap-4">
            {geoPoints.length > 0 && (
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  showMap 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MapPin size={14} />
                {showMap ? 'ซ่อนแผนที่' : 'แสดงแผนที่จุดเกิดเหตุ'}
              </button>
            )}
            <div className="text-left md:text-right border-l pl-4 border-slate-200">
              <p className="font-bold text-[#2B164D] flex items-center md:justify-end gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {adminName}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{today}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Category Location Map (Collapsible / Shows if Category has GPS data) */}
        {showMap && geoPoints.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-[pageFadeIn_0.2s_ease]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <MapPin size={15} className="text-indigo-600" />
                แผนที่แสดงจุดเกิดเหตุในหมวดหมู่ {categoryTitle} ({geoPoints.length} ตำแหน่ง)
              </span>
              <button onClick={() => setShowMap(false)} className="text-xs text-slate-400 hover:text-slate-600">
                ✕ ปิด
              </button>
            </div>
            <div className="h-[280px] relative">
              <MapContainer center={PHAYAO_CENTER} zoom={15} scrollWheelZoom={false} className="h-full w-full absolute inset-0">
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoPoints.map((pt) => (
                  <CircleMarker
                    key={pt.problem_id}
                    center={[parseFloat(pt.latitude), parseFloat(pt.longitude)]}
                    pathOptions={{ 
                      color: pt.status === 'OPEN' ? '#f59e0b' : pt.status === 'IN_PROGRESS' ? '#0284c7' : '#10b981',
                      fillColor: pt.status === 'OPEN' ? '#f59e0b' : pt.status === 'IN_PROGRESS' ? '#0284c7' : '#10b981',
                      fillOpacity: 0.85 
                    }}
                    radius={10}
                  >
                    <Popup>
                      <div className="p-1 text-left font-sans min-w-[150px]">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white mb-1 inline-block" style={{ backgroundColor: pt.color_code || '#2B164D' }}>
                          {pt.id}
                        </span>
                        <strong className="block text-sm text-slate-800 font-bold leading-tight">{pt.topic}</strong>
                        <p className="text-xs text-slate-500 mt-1">📍 {pt.location}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* Interactive KPI Cards (Clicking any card filters the table below!) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: OPEN */}
          <div 
            onClick={() => setStatusFilter(prev => prev === 'OPEN' ? 'ALL' : 'OPEN')}
            className={`bg-white p-6 rounded-2xl shadow-sm border transition-all cursor-pointer select-none ${
              statusFilter === 'OPEN' 
                ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20 shadow-md' 
                : 'border-slate-100 hover:border-amber-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ยังไม่รับเรื่อง (Open)</p>
                <h3 className="text-3xl font-black text-amber-500">{openCount}</h3>
                <p className="text-[11px] text-amber-600 font-medium mt-1">
                  {statusFilter === 'OPEN' ? '✓ กำลังแสดงเฉพาะรายการนี้' : 'คลิกเพื่อดูรายการยังไม่รับเรื่อง'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 text-xl shadow-inner">⏳</div>
            </div>
          </div>
          
          {/* Card 2: IN_PROGRESS */}
          <div 
            onClick={() => setStatusFilter(prev => prev === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
            className={`bg-white p-6 rounded-2xl shadow-sm border transition-all cursor-pointer select-none ${
              statusFilter === 'IN_PROGRESS' 
                ? 'border-sky-400 ring-2 ring-sky-400/20 bg-sky-50/20 shadow-md' 
                : 'border-slate-100 hover:border-sky-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">กำลังดำเนินการ (In Progress)</p>
                <h3 className="text-3xl font-black text-sky-500">{progressCount}</h3>
                <p className="text-[11px] text-sky-600 font-medium mt-1">
                  {statusFilter === 'IN_PROGRESS' ? '✓ กำลังแสดงเฉพาะรายการนี้' : 'คลิกเพื่อดูรายการกำลังทำ'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 text-xl shadow-inner">⚙️</div>
            </div>
          </div>
          
          {/* Card 3: RESOLVED */}
          <div 
            onClick={() => setStatusFilter(prev => prev === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
            className={`bg-white p-6 rounded-2xl shadow-sm border transition-all cursor-pointer select-none ${
              statusFilter === 'RESOLVED' 
                ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20 shadow-md' 
                : 'border-slate-100 hover:border-emerald-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">เสร็จสิ้น (Resolved)</p>
                <h3 className="text-3xl font-black text-emerald-500">{resolvedCount}</h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  {statusFilter === 'RESOLVED' ? '✓ กำลังแสดงเฉพาะรายการนี้' : 'คลิกเพื่อดูรายการเสร็จสิ้น'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 text-xl shadow-inner">✅</div>
            </div>
          </div>
        </div>

        {/* Smart Clustered Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          
          {/* Search Bar & Status Filter Tag */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-800">รายการกลุ่มปัญหาล่าสุด (Clustered Topics)</h2>
              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <span>กรองสถานะ: {statusFilter === 'OPEN' ? 'ยังไม่รับเรื่อง' : statusFilter === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}</span>
                  <button onClick={() => setStatusFilter('ALL')} className="text-indigo-400 hover:text-indigo-900 ml-1 font-bold">✕</button>
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาเนื้อหาหรือรหัส..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] transition-all placeholder:text-slate-400"
                />
              </div>
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] transition-all text-slate-600"
              />
              <button onClick={loadData} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600" title="รีเฟรชข้อมูล">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17.79"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">รหัสปัญหา</th>
                  <th className="px-6 py-4">เนื้อหาสรุป</th>
                  <th className="px-6 py-4">วันที่โพสต์</th>
                  <th className="px-6 py-4">ตำแหน่ง</th>
                  <th className="px-6 py-4 text-center">จำนวนโพสต์</th>
                  <th className="px-6 py-4 text-center">สถานะและจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClusters.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">ไม่พบข้อมูลปัญหาระบบตามเงื่อนไขที่เลือก</td>
                  </tr>
                ) : filteredClusters.map((cluster) => (
                  <tr key={cluster.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <button 
                        onClick={() => openModal(cluster)}
                        className="font-bold text-[#2B164D] bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100/50 hover:bg-indigo-100 hover:text-indigo-700 transition-all font-mono"
                      >
                        {cluster.id}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-slate-700 leading-relaxed line-clamp-2">{cluster.topic}</span>
                        {cluster.reportCount >= 5 && (
                          <span className="shrink-0 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 text-[10px] font-black rounded-full flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            ด่วนมาก
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-500 whitespace-nowrap">{cluster.date}</td>
                    <td className="px-6 py-5 text-slate-500 max-w-[200px] truncate" title={cluster.location}>{cluster.location}</td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-600 shadow-sm">
                        {cluster.reportCount}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <select 
                          value={cluster.status}
                          disabled={isUpdatingStatus === cluster.problem_id}
                          onChange={(e) => handleStatusChange(cluster.problem_id, e.target.value)}
                          className={`text-xs font-bold rounded-lg px-3 py-2 outline-none cursor-pointer transition-all shadow-sm disabled:opacity-50 appearance-none text-center min-w-[120px] ${
                            cluster.status === 'OPEN' ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' :
                            cluster.status === 'IN_PROGRESS' ? 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <option value="OPEN">รอดำเนินการ</option>
                          <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                          <option value="RESOLVED">เสร็จสิ้น</option>
                        </select>
                        
                        <button 
                          onClick={() => openModal(cluster)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:border-[#2B164D] hover:bg-[#2B164D] hover:text-white transition-all shadow-sm"
                          title="ตรวจสอบรายละเอียด (Drill-down)"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drill-down Modal (Nested Details) */}
      {selectedCluster && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedCluster(null)}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-left z-[100000]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-[#2B164D] mb-1">
                  รายละเอียดกลุ่มปัญหา: {selectedCluster.id}
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {selectedCluster.topic}
                  </span>
                  &bull; 
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {selectedCluster.location}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCluster(null)}
                className="w-8 h-8 bg-white border border-slate-200 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            {/* Modal Body - Scrollable Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              <div className="p-6 pb-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                <h4 className="font-bold text-slate-700 text-sm">
                  รายงานย่อยที่เกี่ยวข้อง ({(selectedCluster.posts || []).length} รายการ)
                </h4>
              </div>

              <div className="p-6 space-y-4">
                {(selectedCluster.posts || []).map((post, idx) => {
                  const isExpanded = expandedPostId === post.id;
                  return (
                    <div key={post.id || idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-200 transition-colors">
                      <div 
                        onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {post.author[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800">{post.author}</p>
                            <p className="text-xs text-slate-400">{post.time} &bull; {post.locationDetail}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-indigo-600 font-semibold">
                            {isExpanded ? 'ย่อรายละเอียด' : 'ดูขยาย'}
                          </span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/40 text-sm space-y-3">
                          <p className="text-slate-700 leading-relaxed mt-3">{post.text}</p>

                          {post.images && post.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pt-2">
                              {post.images.map((img, i) => {
                                const srcUrl = !img ? '' : (img.startsWith('http') ? img : `http://localhost:8000${img.startsWith('/') ? '' : '/'}${img}`);
                                return (
                                  <img key={i} src={srcUrl} alt="attachment" className="h-24 w-24 object-cover rounded-lg border border-slate-200" />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
