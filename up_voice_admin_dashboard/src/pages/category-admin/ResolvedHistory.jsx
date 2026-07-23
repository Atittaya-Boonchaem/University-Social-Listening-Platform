// src/pages/category-admin/ResolvedHistory.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { fetchProblems, updateProblemStatus } from '../../services/problemService';
import { fetchCategories } from '../../services/categoryService';
import TicketDetailModal from '../../components/TicketDetailModal';
import { CheckCircle2, Clock, Download, Search, RefreshCw, Layers, Shield, ShieldOff, Eye, Filter, Calendar, Award, Sparkles } from 'lucide-react';

export default function ResolvedHistory() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

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

      // Filter RESOLVED / CLOSED problems & attach nested duplicates
      const parents = unique.filter(p => !p.parent_problem_id && (p.status_name === 'RESOLVED' || p.status_name === 'CLOSED'));
      const children = unique.filter(p => p.parent_problem_id);

      const resolvedProblems = parents.map(parent => {
        const dups = children.filter(child => child.parent_problem_id === parent.problem_id);
        return {
          ...parent,
          reportCount: 1 + dups.length,
          duplicates: dups
        };
      });

      setTickets(resolvedProblems);
    } catch (e) {
      console.error(e);
      setError('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusChange = async (problemId, newStatus) => {
    try {
      await updateProblemStatus(problemId, newStatus);
      if (newStatus !== 'RESOLVED' && newStatus !== 'CLOSED') {
        setTickets(prev => prev.filter(t => t.problem_id !== problemId));
        showToast(`⚡ ย้ายตั๋ว #${problemId} กลับไปยังตารางงานย้อนหลังสำเร็จ`);
      } else {
        setTickets(prev => prev.map(t => t.problem_id === problemId ? { ...t, status_name: newStatus } : t));
      }
    } catch (err) {
      showToast("❌ ไม่สามารถเปลี่ยนสถานะได้: " + err.message);
    }
  };

  // Export CSV Report
  const handleExportCSV = () => {
    if (tickets.length === 0) {
      showToast('⚠️ ไม่มีข้อมูลสำหรับส่งออก CSV');
      return;
    }
    const headers = ['Problem ID', 'Ticket ID', 'Title', 'Category', 'Date', 'Status'];
    const rows = tickets.map(t => [
      t.problem_id,
      t.ticket_id || `#${t.problem_id}`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.category_name || '').replace(/"/g, '""')}"`,
      new Date(t.created_at).toLocaleDateString('th-TH'),
      t.status_name
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `resolved_history_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 ดาวน์โหลดรายงานประวัติการแก้ไข CSV สำเร็จ');
  };

  // Filter items
  const filteredTickets = tickets.filter(t => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || (t.ticket_id || '').toLowerCase().includes(search.toLowerCase());
    const isoDate = t.created_at?.split('T')[0];
    const matchDate = !dateFilter || isoDate === dateFilter;
    return matchSearch && matchDate;
  });

  const categoryName = tickets[0]?.category_name || 'หมวดหมู่ของคุณ';

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
              <CheckCircle2 size={24} className="text-emerald-600" />
              <span>ประวัติการแก้ไขและคลังผลงาน (Resolved History)</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">คลังจัดเก็บและสรุปผลงานปัญหาที่ดำเนินการเสร็จสิ้นแล้ว</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all shadow-xs"
            >
              <Download size={14} />
              ส่งออกรายงาน CSV
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs"
            >
              <RefreshCw size={14} />
              รีเฟรช
            </button>
          </div>
        </div>

        {/* KPI Stats Strip */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">แก้ไขเสร็จสิ้นทั้งหมด</p>
              <h3 className="text-3xl font-black text-emerald-600">{tickets.length} เคส</h3>
              <p className="text-[11px] text-slate-400 mt-1">ในหมวดหมู่ {categoryName}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-inner">🏆</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          
          {/* Search & Filter */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">รายการประวัติผลงานการแก้ไข</h2>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาเนื้อหาหรือรหัส..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-300 transition-all placeholder:text-slate-400"
                />
              </div>
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-300 transition-all text-slate-600"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">รหัสปัญหา</th>
                  <th className="px-6 py-4">ชื่อเรื่องปัญหา</th>
                  <th className="px-6 py-4">วันที่แจ้งเรื่อง</th>
                  <th className="px-6 py-4">สถานที่</th>
                  <th className="px-6 py-4 text-center">สถานะ</th>
                  <th className="px-6 py-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                      <div className="max-w-md mx-auto space-y-3">
                        <span className="text-4xl block">🎉</span>
                        <p className="font-bold text-slate-700 text-base">ไม่พบประวัติปัญหาที่แก้ไขเสร็จสิ้น</p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          เมื่อแอดมินหมวดหมู่ทำการเปลี่ยนสถานะตั๋วปัญหาเป็น <strong className="text-emerald-600">"แก้ไขสำเร็จ (RESOLVED)"</strong> ตั๋วนั้นจะถูกย้ายมาบันทึกจัดเก็บเป็นประวัติผลงานในหน้านี้โดยอัตโนมัติครับ
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTickets.map((ticket) => (
                  <tr key={ticket.problem_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all"
                      >
                        {ticket.ticket_id || `#${ticket.problem_id}`}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 leading-relaxed">{ticket.title}</span>
                        {ticket.duplicates && ticket.duplicates.length > 0 && (
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold rounded-full shrink-0 flex items-center gap-1">
                            <Sparkles size={11} /> รวม {1 + ticket.duplicates.length} รายการ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(ticket.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-6 py-5 text-slate-500 max-w-[200px] truncate text-xs" title={ticket.building_name || ticket.location}>
                      {ticket.building_name || ticket.location || 'ไม่ระบุสถานที่'}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                        <CheckCircle2 size={13} /> เสร็จสิ้น
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setSelectedTicket(ticket)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-xs"
                        >
                          <Eye size={13} /> ดูรายละเอียด
                        </button>
                        <select 
                          value={ticket.status_name}
                          onChange={(e) => handleStatusChange(ticket.problem_id, e.target.value)}
                          className="text-xs font-semibold rounded-lg px-2 py-1.5 border border-slate-200 bg-slate-50 text-slate-600 outline-none cursor-pointer"
                          title="เปลี่ยนสถานะย้อนกลับ"
                        >
                          <option value="RESOLVED">✅ เสร็จสิ้น</option>
                          <option value="IN_PROGRESS">⚙️ กำลังทำ</option>
                          <option value="OPEN">⏳ รอดำเนินการ</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-800 text-white text-sm font-semibold rounded-2xl shadow-xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
