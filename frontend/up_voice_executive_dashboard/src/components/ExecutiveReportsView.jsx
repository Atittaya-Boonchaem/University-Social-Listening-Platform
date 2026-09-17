import React, { useState, useMemo } from 'react';
import {
  Download,
  Filter,
  Search,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

export default function ExecutiveReportsView({ data }) {
  const rawProblems = data.rawProblems || [];
  const categories = data.categories || [];

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedReporter, setSelectedReporter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper for reporter role label
  const getReporterInfo = (author) => {
    const role = (author?.role || 'unknown').toLowerCase();
    if (role.includes('anonymous')) {
      return { label: 'ไม่ระบุตัวตน', badge: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    if (role.includes('student')) {
      return { label: 'นิสิต', badge: 'bg-purple-100 text-purple-800 border-purple-200' };
    }
    if (role.includes('staff') || role.includes('admin')) {
      return { label: 'บุคลากร', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    }
    return { label: 'บุคคลทั่วไป', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  // Helper for status label
  const getStatusInfo = (statusName) => {
    switch (statusName) {
      case 'RESOLVED':
      case 'CLOSED':
        return { label: 'แก้ไขเสร็จสิ้น', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'IN_PROGRESS':
        return { label: 'กำลังดำเนินการ', badge: 'bg-blue-100 text-blue-800 border-blue-200' };
      default:
        return { label: 'เปิดเรื่อง (Open)', badge: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
  };

  // Filter problems based on user selections
  const filteredProblems = useMemo(() => {
    return rawProblems.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && String(p.category_id) !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'OPEN' && p.status_name !== 'OPEN') return false;
        if (selectedStatus === 'IN_PROGRESS' && p.status_name !== 'IN_PROGRESS') return false;
        if (selectedStatus === 'RESOLVED' && p.status_name !== 'RESOLVED' && p.status_name !== 'CLOSED') return false;
      }

      // Reporter filter
      if (selectedReporter !== 'all') {
        const role = (p.author?.role || '').toLowerCase();
        if (selectedReporter === 'anonymous' && !role.includes('anonymous')) return false;
        if (selectedReporter === 'student' && !role.includes('student')) return false;
        if (selectedReporter === 'staff' && !role.includes('staff') && !role.includes('admin')) return false;
        if (selectedReporter === 'public' && (role.includes('student') || role.includes('staff') || role.includes('anonymous'))) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchTicket = (p.ticket_id || '').toLowerCase().includes(q);
        const matchBuilding = (p.building_name || '').toLowerCase().includes(q);
        if (!matchTitle && !matchTicket && !matchBuilding) return false;
      }

      return true;
    });
  }, [rawProblems, selectedCategory, selectedStatus, selectedReporter, searchQuery]);

  // Export to CSV with UTF-8 BOM for Microsoft Excel
  const handleExportCSV = () => {
    const headers = [
      'รหัสตั๋ว (Ticket ID)',
      'หัวข้อปัญหา',
      'หมวดหมู่',
      'สถานที่/อาคาร',
      'กลุ่มผู้แจ้ง',
      'สถานะ',
      'วันที่แจ้ง',
    ];

    const rows = filteredProblems.map((p) => {
      const reporter = getReporterInfo(p.author).label;
      const status = getStatusInfo(p.status_name).label;
      const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('th-TH') : '-';

      return [
        `"${p.ticket_id || p.id}"`,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        `"${(p.category_name || 'ทั่วไป').replace(/"/g, '""')}"`,
        `"${(p.building_name || 'ม.พะเยา').replace(/"/g, '""')}"`,
        `"${reporter}"`,
        `"${status}"`,
        `"${dateStr}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UP_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedReporter('all');
    setSearchQuery('');
  };

  const openCount = filteredProblems.filter((p) => p.status_name === 'OPEN').length;
  const inProgressCount = filteredProblems.filter((p) => p.status_name === 'IN_PROGRESS').length;
  const resolvedCount = filteredProblems.filter((p) => p.status_name === 'RESOLVED' || p.status_name === 'CLOSED').length;

  return (
    <div className="space-y-5 max-w-7xl w-full mx-auto font-sans">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <span className="p-2 bg-purple-100 rounded-xl text-purple-900">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <span>ตารางรายงานข้อมูลปัญหาและข้อร้องเรียน</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหา กรองข้อมูลตามหมวดหมู่/สถานะ และส่งออกข้อมูลเป็นไฟล์ Excel / CSV
          </p>
        </div>

        {/* Action Buttons: Export CSV & Print */}
        <div className="flex items-center gap-2.5 no-print">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export ข้อมูล (Excel / CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2d0c52] hover:bg-[#401275] text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-purple-200" />
            <span>พิมพ์ตาราง</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card (Hidden when printing) */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-purple-700" />
            <span>ตัวกรองข้อมูล (Filter Data)</span>
          </div>
          {(selectedCategory !== 'all' || selectedStatus !== 'all' || selectedReporter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">หมวดหมู่ปัญหา</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">สถานะการแก้ไข</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="OPEN">เปิดเรื่อง (Open)</option>
              <option value="IN_PROGRESS">กำลังดำเนินการ (In Progress)</option>
              <option value="RESOLVED">แก้ไขเสร็จสิ้น (Resolved)</option>
            </select>
          </div>

          {/* 3. Reporter Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">กลุ่มผู้แจ้ง</label>
            <select
              value={selectedReporter}
              onChange={(e) => setSelectedReporter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              <option value="all">ทุกกลุ่มผู้แจ้ง</option>
              <option value="student">นิสิต (Student)</option>
              <option value="staff">บุคลากร (Staff)</option>
              <option value="anonymous">ไม่ระบุตัวตน (Anonymous)</option>
              <option value="public">บุคคลทั่วไป (Public)</option>
            </select>
          </div>

          {/* 4. Search Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">ค้นหาคำสำคัญ</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="พิมพ์ชื่อเรื่อง, ตั๋ว, หรือตึก..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary Badges */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-600">
            พบข้อมูลตามตัวกรอง: <strong className="text-purple-950 font-bold">{filteredProblems.length}</strong> รายการ (จากทั้งหมด {rawProblems.length})
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-rose-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              เปิดเรื่อง: {openCount}
            </span>
            <span className="flex items-center gap-1 text-blue-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              กำลังดำเนินการ: {inProgressCount}
            </span>
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              เสร็จสิ้น: {resolvedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card (Clean, Printable Data Table) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden printable-document">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-[#2d0c52] text-white font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">#</th>
                <th className="py-3 px-3.5 whitespace-nowrap">รหัสตั๋ว</th>
                <th className="py-3 px-4 min-w-[240px]">หัวข้อปัญหา</th>
                <th className="py-3 px-3.5 whitespace-nowrap">หมวดหมู่</th>
                <th className="py-3 px-3.5 whitespace-nowrap">สถานที่ / อาคาร</th>
                <th className="py-3 px-3.5 whitespace-nowrap">กลุ่มผู้แจ้ง</th>
                <th className="py-3 px-3.5 whitespace-nowrap">สถานะ</th>
                <th className="py-3 px-3.5 whitespace-nowrap">วันที่แจ้ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProblems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <div>ไม่พบรายการปัญหาตามตัวกรองที่เลือก</div>
                  </td>
                </tr>
              ) : (
                filteredProblems.map((p, idx) => {
                  const reporter = getReporterInfo(p.author);
                  const status = getStatusInfo(p.status_name);

                  return (
                    <tr
                      key={p.ticket_id || p.id || idx}
                      className="hover:bg-purple-50/40 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-purple-900 whitespace-nowrap">
                        #{p.ticket_id || p.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 leading-snug">
                        {p.title}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {p.category_name || 'ทั่วไป'}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                        {p.building_name || 'ม.พะเยา'}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${reporter.badge}`}>
                          {reporter.label}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${status.badge}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('th-TH') : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <div>
            กำลังแสดง {filteredProblems.length} จากทั้งหมด {rawProblems.length} รายการ
          </div>
          <div className="font-semibold text-purple-900">
            ระบบข้อมูลตั๋ว มหาวิทยาลัยพะเยา
          </div>
        </div>
      </div>
    </div>
  );
}
