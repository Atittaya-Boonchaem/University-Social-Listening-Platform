import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { fetchProblems, updateProblemStatus, fetchAnalytics } from '../../services/problemService';

export default function ResolvedHistory() {
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pubData, internalData] = await Promise.all([
        fetchProblems({ page_size: 150, visibility_name: 'public' }, true),
        fetchProblems({ page_size: 150, visibility_name: 'internal' }, true),
      ]);

      const merged = [...(pubData.items || []), ...(internalData.items || [])];
      const unique = Array.from(new Map(merged.map(p => [p.problem_id, p])).values());

      // Filter only RESOLVED / CLOSED problems
      const resolvedProblems = unique.filter(p => p.status_name === 'RESOLVED' || p.status_name === 'CLOSED');

      // Separate parents and children
      const parents = resolvedProblems.filter(p => !p.parent_problem_id);
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
          reportCount: allPostsInCluster.length,
          status: parent.status_name,
          posts: allPostsInCluster
        };
      });

      setClusters(constructedClusters);
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
      // Remove it from the resolved list if it is no longer resolved
      if (newStatus !== 'RESOLVED' && newStatus !== 'CLOSED') {
        setClusters(prev => prev.filter(c => c.problem_id !== problemId));
      } else {
        setClusters(prev => prev.map(c => 
          c.problem_id === problemId ? { ...c, status: newStatus } : c
        ));
      }
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

  // Filter clusters by search and date
  const filteredClusters = clusters.filter(c => {
    const matchSearch = !search || c.topic.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchDate = !dateFilter || c.isoDate === dateFilter;
    return matchSearch && matchDate;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B164D]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-left">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ประวัติการแก้ไข (Resolved History)</h1>
            <p className="text-sm text-slate-500 mt-1">ประวัติกลุ่มปัญหาที่ดำเนินการเสร็จสิ้นแล้ว</p>
          </div>
        </div>

        {/* Smart Table Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          
          {/* Search Bar & Date Filter UI */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
            <h2 className="text-lg font-bold text-slate-800">รายการที่แก้ไขเรียบร้อยแล้ว</h2>
            
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
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] transition-all placeholder:text-slate-400"
                />
              </div>
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2B164D]/20 focus:border-[#2B164D] transition-all text-slate-600"
              />
              <button onClick={loadData} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600" title="รีเฟรชข้อมูล">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17.79"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Data Table */}
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
                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">ไม่พบประวัติปัญหาที่แก้ไขเสร็จสิ้น</td>
                  </tr>
                ) : filteredClusters.map((cluster) => (
                  <tr key={cluster.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <button 
                        onClick={() => openModal(cluster)}
                        className="font-bold text-[#2B164D] bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100/50 hover:bg-indigo-100 hover:text-indigo-700 transition-all"
                      >
                        {cluster.id}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-slate-700 leading-relaxed line-clamp-2">{cluster.topic}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedCluster(null)}
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
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
              
              <div className="p-6 pt-4 space-y-3">
                {(selectedCluster.posts || []).map((post) => {
                  const isExpanded = expandedPostId === post.id;
                  return (
                    <div 
                      key={post.id} 
                      className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer overflow-hidden ${
                        isExpanded ? 'border-[#2B164D] ring-1 ring-[#2B164D]/10' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                    >
                      <div className="p-4 flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border transition-colors ${
                          isExpanded ? 'bg-[#2B164D] text-white border-[#2B164D]' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                        }`}>
                          #{post.id}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">"{post.text}"</p>
                          
                          {/* Level 3 Deep Inspection */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">ผู้โพสต์</span>
                                  <span className="text-xs text-slate-600 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    {post.author}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">เวลาที่โพสต์</span>
                                  <span className="text-xs text-slate-600 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    {post.time}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">ตำแหน่งที่เกิดเหตุ</span>
                                  <span className="text-xs text-slate-600 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    {post.locationDetail}
                                  </span>
                                </div>
                              </div>
                              
                              {post.images && post.images.length > 0 && (
                                <div>
                                  <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2">รูปภาพแนบ</span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {post.images.map((img, i) => (
                                      <img key={i} src={img} alt="Attachment" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-slate-300 flex-shrink-0 mt-0.5">
                          <svg 
                            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#2B164D]' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedCluster(null)}
                className="px-6 py-2 bg-[#2B164D] text-white text-sm font-bold rounded-lg hover:bg-[#1a0d30] transition-colors shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
