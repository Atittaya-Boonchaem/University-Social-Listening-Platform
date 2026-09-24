// src/pages/category-admin/ResolvedHistory.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchProblems, updateProblemStatus } from '../../services/problemService';
import TicketDetailModal from '../../components/TicketDetailModal';
import { getAnonymousAuthor } from '../../utils/authorUtils';

const resolveImageUrl = (img) => {
  if (!img) return '';
  const urlStr = typeof img === 'string' ? img : (img.file_url || img.url || '');
  if (!urlStr) return '';
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.startsWith('data:')) {
    return urlStr;
  }
  const cleanPath = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/v1\/?$/, '');
  return `${apiBase}${cleanPath}`;
};

const formatThaiDate = (dateStr) => {
  if (!dateStr) return 'ไม่ระบุวันที่';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const formatAuditTime = (dateStr) => {
  if (!dateStr) return '19:40 น.';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  } catch {
    return '19:40 น.';
  }
};

export default function ResolvedHistory() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // ── Filters & Controls ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [activeTab, setActiveTab] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL'); // ALL, 7DAYS, 30DAYS, THIS_MONTH, CUSTOM
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState('LATEST_RESOLVED'); // LATEST_RESOLVED, NEWEST, OLDEST

  // ── Pagination ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pubData, internalData] = await Promise.all([
        fetchProblems({ page_size: 200, visibility_name: 'public' }, true),
        fetchProblems({ page_size: 200, visibility_name: 'internal' }, true),
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
      setError('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (problem, newStatus) => {
    const problemId = problem.problem_id;
    try {
      await updateProblemStatus(problemId, newStatus);
      if (newStatus !== 'RESOLVED' && newStatus !== 'CLOSED') {
        setTickets(prev => prev.filter(t => t.problem_id !== problemId));
        showToast(`⚡ ย้ายตั๋ว #${problemId} กลับไปยังตารางงานสำเร็จ`);
      } else {
        setTickets(prev => prev.map(t => t.problem_id === problemId ? { ...t, status_name: newStatus } : t));
      }
      setSelectedTicket(null);
    } catch (err) {
      showToast("❌ ไม่สามารถเปลี่ยนสถานะได้: " + err.message);
    }
  };

  // ── Export CSV / Excel ──────────────────────────────────────────────
  const handleExportExcel = () => {
    if (tickets.length === 0) {
      showToast('⚠️ ไม่มีข้อมูลสำหรับส่งออก Excel');
      return;
    }
    const headers = ['รหัสคำร้อง', 'หัวข้อปัญหา', 'หมวดหมู่งาน', 'สถานที่', 'ผู้แจ้งเรื่อง', 'วันที่เสร็จสิ้น', 'สถานะ'];
    const rows = filteredTickets.map(t => {
      const author = getAnonymousAuthor(t);
      return [
        t.formatted_ticket_id || t.ticket_id || `#UP-68-${t.problem_id}`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.category_name || '').replace(/"/g, '""')}"`,
        `"${(t.building_name || t.location || '').replace(/"/g, '""')}"`,
        `"${author.name}"`,
        formatThaiDate(t.updated_at || t.created_at),
        t.status_name === 'RESOLVED' ? 'เสร็จสิ้น' : 'ปิดเคส'
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานประวัติการให้บริการ_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 ส่งออกข้อมูล Excel / CSV สำเร็จ');
  };

  const handlePrintReport = () => {
    window.print();
  };

  // ── Filter & Sort Logic ─────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // 1. Search Query
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchId = (t.ticket_id || t.formatted_ticket_id || `#${t.problem_id}`).toLowerCase().includes(q);
        const matchLoc = (t.building_name || t.location || '').toLowerCase().includes(q);
        const matchAuthor = getAnonymousAuthor(t).name.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchId && !matchLoc && !matchAuthor) return false;
      }

      // 2. Zone / Building Dropdown
      const loc = `${t.building_name || ''} ${t.location || ''}`.toLowerCase();
      if (selectedZone === 'DORM' && !loc.includes('หอ') && !loc.includes('dorm')) return false;
      if (selectedZone === 'PKY_CE' && !loc.includes('pky') && !loc.includes('เรียนรวม') && !loc.includes('ce')) return false;
      if (selectedZone === 'ICT_ENG' && !loc.includes('ict') && !loc.includes('สารสนเทศ') && !loc.includes('วิศว') && !loc.includes('en')) return false;
      if (selectedZone === 'ADMIN' && !loc.includes('อธิการ') && !loc.includes('สำนักงาน') && !loc.includes('กอง')) return false;

      // 3. Tab Pills
      if (activeTab === 'DORM' && !loc.includes('หอ') && !loc.includes('dorm')) return false;
      if (activeTab === 'CLASSROOM' && !loc.includes('เรียน') && !loc.includes('pky') && !loc.includes('ce')) return false;
      if (activeTab === 'FACULTY' && !loc.includes('คณะ') && !loc.includes('ict') && !loc.includes('วิศว')) return false;

      // 4. Date Presets & Custom Date Range
      const ticketTime = new Date(t.created_at || t.updated_at).getTime();
      const now = new Date().getTime();

      if (datePreset === '7DAYS') {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        if (ticketTime < sevenDaysAgo) return false;
      } else if (datePreset === '30DAYS') {
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        if (ticketTime < thirtyDaysAgo) return false;
      } else if (datePreset === 'THIS_MONTH') {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const tDate = new Date(t.created_at || t.updated_at);
        if (tDate.getMonth() !== currentMonth || tDate.getFullYear() !== currentYear) return false;
      } else if (datePreset === 'CUSTOM') {
        if (customStartDate) {
          const start = new Date(customStartDate).setHours(0, 0, 0, 0);
          if (ticketTime < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate).setHours(23, 59, 59, 999);
          if (ticketTime > end) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.updated_at || a.created_at).getTime();
      const timeB = new Date(b.updated_at || b.created_at).getTime();
      if (sortBy === 'LATEST_RESOLVED' || sortBy === 'NEWEST') return timeB - timeA;
      if (sortBy === 'OLDEST') return timeA - timeB;
      return 0;
    });
  }, [tickets, search, selectedZone, activeTab, datePreset, customStartDate, customEndDate, sortBy]);

  // ── Real KPI Metrics ──────────────────────────────────────────────
  const totalResolved = tickets.length;
  const repeatCount = useMemo(() => {
    return tickets.filter(t => t.duplicates && t.duplicates.length > 0).length;
  }, [tickets]);

  const reworkRate = useMemo(() => {
    if (totalResolved === 0) return '0.0%';
    return `${((repeatCount / totalResolved) * 100).toFixed(1)}%`;
  }, [totalResolved, repeatCount]);

  // Total pages
  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedZone, activeTab, datePreset, customStartDate, customEndDate, sortBy]);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#340866]/30 border-t-[#340866] rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-[#4a4450]">กำลังโหลดประวัติผลงาน...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-16 text-left">
      <div className="flex flex-col gap-6 max-w-[1560px] mx-auto w-full">
        
        {/* ── Top Bar & Breadcrumb & Action ────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-[#4a4450]">
              <span className="hover:text-[#340866] cursor-pointer transition-colors font-medium">กองอาคารสถานที่และยานพาหนะ</span>
              <span className="material-symbols-outlined text-[15px] text-[#7b7482]">chevron_right</span>
              <span className="text-[#340866] font-bold">ประวัติผลงานและการแก้ไขปัญหา (Resolved History)</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#340866] tracking-tight">
                ประวัติการทำงาน & ผลงานที่เสร็จสิ้น
              </h1>
            </div>
            <p className="text-xs text-[#4a4450]">
              บันทึกประวัติการดำเนินงาน ตรวจสอบรายการปัญหาที่ดำเนินการแก้ไขแล้วเสร็จ และสรุปสถิติคลังผลงานอาคาร มหาวิทยาลัยพะเยา
            </p>
          </div>

          {/* Export & Date Range Pill */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-[#f2f3ff] px-3.5 py-2 rounded-xl flex items-center gap-2 text-[#131b2e] border border-[#eaedff]">
              <span className="material-symbols-outlined text-[18px] text-[#340866]">calendar_month</span>
              <span className="text-xs font-semibold">
                {datePreset === '7DAYS' ? '7 วันล่าสุด' :
                 datePreset === '30DAYS' ? '30 วันล่าสุด' :
                 datePreset === 'THIS_MONTH' ? 'เดือนปัจจุบัน' :
                 datePreset === 'CUSTOM' ? `${customStartDate || '...'} ถึง ${customEndDate || '...'}` :
                 'ทุกช่วงเวลา'}
              </span>
            </div>

            <button
              onClick={handleExportExcel}
              className="bg-white hover:bg-[#f2f3ff] text-[#131b2e] border border-[#eaedff] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#735c00]">table_view</span>
              <span>ส่งออก Excel</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="bg-[#340866] hover:bg-[#4b267d] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
              <span>รายงานผู้บริหาร (PDF)</span>
            </button>
          </div>
        </div>

        {/* ── Hero KPI Grid (2 Real Data Cards) ────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          {/* Metric 1: แก้ไขสำเร็จ */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#eaedff] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-[#340866]/5 pointer-events-none group-hover:scale-110 transition-transform"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4a4450] uppercase tracking-wider">แก้ไขสำเร็จ</span>
              <div className="w-8 h-8 rounded-xl bg-[#eddcff] flex items-center justify-center text-[#340866]">
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 my-3">
              <span className="text-3xl font-black text-[#131b2e] leading-none">{totalResolved}</span>
              <span className="text-xs text-[#7b7482] font-semibold">เคส</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#4a4450]">
              <div className="flex items-center gap-1.5 text-[#340866] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#340866] animate-pulse"></span>
                <span>{totalResolved > 0 ? 'ดำเนินการเรียบร้อย 100%' : 'ยังไม่มีเคสที่ปิดงาน'}</span>
              </div>
            </div>
          </div>

          {/* Metric 2: อัตราการทำซ้ำ (Repeat / Rework Rate) คำนวณจากข้อมูลจริง */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#eaedff] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#4a4450] uppercase tracking-wider">อัตราการทำซ้ำ (Repeat Rate)</span>
              <div className="w-8 h-8 rounded-xl bg-[#e2e7ff] flex items-center justify-center text-[#131b2e]">
                <span className="material-symbols-outlined text-[20px]">replay</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 my-3">
              <span className="text-3xl font-black text-[#131b2e] leading-none">{reworkRate}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#4a4450]">
              <span className="text-[#7b7482]">พบ {repeatCount} จาก {totalResolved} งาน</span>
            </div>
          </div>
        </div>

        {/* ── Filters & Search Controls ────────────────────────────── */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-[#eaedff] flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7b7482] text-[20px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหารหัสคำร้อง เช่น #UP-68-0412, ตึก ICT, คีย์เวิร์ด, ผู้แจ้ง..."
                className="w-full h-10 pl-10 pr-4 bg-[#f2f3ff] text-[#131b2e] placeholder:text-[#7b7482] rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#340866]/20 border border-[#eaedff] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#7b7482] hover:text-[#131b2e] p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Scope Dropdowns & Date Preset Filter */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Building & Zone Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#f2f3ff] px-3 py-1.5 rounded-xl border border-[#eaedff]">
                <span className="material-symbols-outlined text-[18px] text-[#7b7482]">domain</span>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="bg-transparent text-[#131b2e] text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">ทุกอาคาร & โซนหอพัก</option>
                  <option value="DORM">กลุ่มหอพักนิสิต (หอ 1 - หอ 18)</option>
                  <option value="PKY_CE">กลุ่มอาคารเรียนรวม PKY / CE</option>
                  <option value="ICT_ENG">กลุ่มคณะ ICT / วิศวกรรมศาสตร์</option>
                  <option value="ADMIN">อาคารสำนักงานอธิการบดี</option>
                </select>
              </div>

              {/* Date Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#f2f3ff] px-3 py-1.5 rounded-xl border border-[#eaedff]">
                <span className="material-symbols-outlined text-[18px] text-[#340866]">date_range</span>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                  className="bg-transparent text-[#131b2e] text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">ทุกช่วงเวลา</option>
                  <option value="7DAYS">7 วันล่าสุด</option>
                  <option value="30DAYS">30 วันล่าสุด</option>
                  <option value="THIS_MONTH">เดือนปัจจุบัน</option>
                  <option value="CUSTOM">ระบุวันที่เอง...</option>
                </select>
              </div>

              {/* Custom Date Range Pickers (shown when CUSTOM is selected) */}
              {datePreset === 'CUSTOM' && (
                <div className="flex items-center gap-2 bg-[#f2f3ff] p-1.5 rounded-xl border border-[#eaedff] animate-in fade-in duration-150">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white px-2 py-1 rounded-lg text-xs font-semibold text-[#131b2e] border border-[#eaedff] focus:outline-none focus:ring-1 focus:ring-[#340866]"
                    title="วันที่เริ่มต้น"
                  />
                  <span className="text-xs text-[#7b7482] font-bold">ถึง</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white px-2 py-1 rounded-lg text-xs font-semibold text-[#131b2e] border border-[#eaedff] focus:outline-none focus:ring-1 focus:ring-[#340866]"
                    title="วันที่สิ้นสุด"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Filter Pills / Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-[#eaedff]">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-[#340866] text-white shadow-xs'
                  : 'bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#4a4450]'
              }`}
            >
              ทั้งหมดที่เสร็จสิ้น ({tickets.length})
            </button>

            <button
              onClick={() => setActiveTab('DORM')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'DORM'
                  ? 'bg-[#340866] text-white shadow-xs'
                  : 'bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#4a4450]'
              }`}
            >
              หอพักนิสิต
            </button>

            <button
              onClick={() => setActiveTab('CLASSROOM')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'CLASSROOM'
                  ? 'bg-[#340866] text-white shadow-xs'
                  : 'bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#4a4450]'
              }`}
            >
              อาคารเรียนรวม
            </button>

            <button
              onClick={() => setActiveTab('FACULTY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'FACULTY'
                  ? 'bg-[#340866] text-white shadow-xs'
                  : 'bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#4a4450]'
              }`}
            >
              คณะ & หน่วยงาน
            </button>
          </div>
        </div>

        {/* ── Resolved Case Cards Section ──────────────────────────── */}
        <div className="flex flex-col gap-4">
          
          {/* Section Header & Counters */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span>รายการเคสที่ปิดแล้วล่าสุด</span>
              <span className="font-mono bg-[#eaedff] text-[#340866] px-2.5 py-0.5 rounded-full text-xs font-bold">
                {filteredTickets.length > 0
                  ? `${Math.min((currentPage - 1) * pageSize + 1, filteredTickets.length)} - ${Math.min(currentPage * pageSize, filteredTickets.length)} จาก ${filteredTickets.length} เคส`
                  : '0 เคส'}
              </span>
            </h2>

            <div className="flex items-center gap-2 text-xs text-[#4a4450]">
              <span>เรียงตาม:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="font-bold text-[#340866] bg-transparent focus:outline-none cursor-pointer hover:underline"
              >
                <option value="LATEST_RESOLVED">เวลาปิดงานล่าสุด</option>
                <option value="NEWEST">วันที่แจ้งเรื่องล่าสุด</option>
                <option value="OLDEST">วันที่แจ้งเรื่องเก่าสุด</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          {paginatedTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#eaedff] shadow-xs">
              <span className="text-4xl block mb-2">🔍</span>
              <p className="font-bold text-slate-800 text-sm">ไม่พบประวัติผลงานตามเงื่อนไขที่เลือก</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกช่วงเวลาการกรองใหม่</p>
            </div>
          ) : (
            paginatedTickets.map((ticket) => {
              const author = getAnonymousAuthor(ticket);
              const attachments = ticket.attachments || [];
              const hasImage = attachments.length > 0;
              const imageUrl = hasImage ? resolveImageUrl(attachments[0]) : '';
              const isGrouped = ticket.duplicates && ticket.duplicates.length > 0;
              const totalInGroup = isGrouped ? 1 + ticket.duplicates.length : 1;

              return (
                <div
                  key={ticket.problem_id}
                  className="bg-white rounded-2xl shadow-xs border border-[#eaedff] p-5 sm:p-6 flex flex-col lg:flex-row gap-5 hover:shadow-md hover:border-[#340866]/30 transition-all text-left"
                >
                  {/* Left Info Column */}
                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <div>
                      {/* Meta Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#340866] bg-[#eaedff] px-2.5 py-0.5 rounded-md text-xs border border-[#eaedff]">
                            {ticket.formatted_ticket_id || ticket.ticket_id || `#UP-68-${ticket.problem_id}`}
                          </span>

                          {isGrouped && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#fed65b]/40 text-[#745c00] font-bold text-xs flex items-center gap-1 border border-[#745c00]/20 shadow-2xs">
                              <span className="material-symbols-outlined text-[14px]">merge</span>
                              <span>รวม {totalInGroup} โพสต์</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            เสร็จสิ้น
                          </span>
                        </div>

                        <span className="text-xs text-[#7b7482] font-mono flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          แจ้งเมื่อ {formatThaiDate(ticket.created_at)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-bold text-[#131b2e] mb-1.5 leading-snug">
                        {ticket.title}
                      </h3>

                      {/* Location */}
                      <p className="text-xs text-[#4a4450] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#7b7482] shrink-0">
                          location_on
                        </span>
                        <span className="truncate">
                          {ticket.building_name || ticket.location || ticket.location_label || 'มหาวิทยาลัยพะเยา'}
                        </span>
                      </p>

                      {/* Short Description */}
                      {ticket.description && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic bg-[#faf8ff] p-2.5 rounded-xl border border-[#eaedff]">
                          "{ticket.description}"
                        </p>
                      )}
                    </div>

                    {/* Tech / Submitter Row & Action */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#eaedff]">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${author.avatarBg} flex items-center justify-center font-bold text-xs shadow-2xs`}>
                          {author.emoji || '👤'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[#131b2e] leading-tight">
                            {author.name}
                          </span>
                          <span className="text-[11px] text-[#7b7482] leading-tight">
                            เสร็จสิ้นเมื่อ {formatThaiDate(ticket.updated_at || ticket.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="px-4 py-2 rounded-xl bg-[#eaedff] hover:bg-[#e2e7ff] text-[#340866] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>ดูข้อมูลเต็ม</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Visual Column */}
                  <div className="w-full lg:w-80 shrink-0 flex flex-col justify-center">
                    {hasImage ? (
                      <div
                        onClick={() => setSelectedTicket(ticket)}
                        className="group relative h-40 sm:h-44 rounded-xl overflow-hidden bg-slate-900 border border-[#eaedff] cursor-pointer shadow-2xs"
                      >
                        <img
                          src={imageUrl}
                          alt="Resolved Attachment"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent z-10" />
                        <div className="absolute bottom-2 left-2 right-2 z-20 flex items-center justify-between text-white text-[11px]">
                          <span className="bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded font-mono">
                            หลักฐานการแก้ไข ({attachments.length} ภาพ)
                          </span>
                          <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">
                            zoom_in
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setSelectedTicket(ticket)}
                        className="h-40 sm:h-44 rounded-xl border border-dashed border-[#eaedff] bg-[#f2f3ff]/50 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-[#eaedff]/40 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[32px] text-[#340866]/40 mb-1">
                          domain_verification
                        </span>
                        <span className="text-xs font-bold text-[#131b2e]">ตรวจสอบแล้วเสร็จ</span>
                        <span className="text-[11px] text-[#7b7482] mt-0.5">พิกัด ม.พะเยา</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Pagination Strip ─────────────────────────────────────── */}
        {filteredTickets.length > 0 && (
          <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl shadow-xs border border-[#eaedff] text-xs text-[#4a4450]">
            <span>
              แสดงรายการที่ {Math.min((currentPage - 1) * pageSize + 1, filteredTickets.length)} - {Math.min(currentPage * pageSize, filteredTickets.length)} จากทั้งหมด {filteredTickets.length} คำร้อง
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                // Show first, last, and around current
                if (
                  num === 1 ||
                  num === totalPages ||
                  (num >= currentPage - 1 && num <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-lg font-bold transition-colors cursor-pointer ${
                        currentPage === num
                          ? 'bg-[#340866] text-white shadow-xs'
                          : 'bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e]'
                      }`}
                    >
                      {num}
                    </button>
                  );
                } else if (
                  num === currentPage - 2 ||
                  num === currentPage + 2
                ) {
                  return <span key={num} className="px-1 text-slate-400">...</span>;
                }
                return null;
              })}

              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#f2f3ff] hover:bg-[#eaedff] text-[#131b2e] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Ticket Detail Modal ─────────────────────────────────────── */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* ── Toast Notification ──────────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#131b2e] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
