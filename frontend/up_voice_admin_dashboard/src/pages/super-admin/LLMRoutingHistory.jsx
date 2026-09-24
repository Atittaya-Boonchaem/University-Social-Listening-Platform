// src/pages/super-admin/LLMRoutingHistory.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Search, Filter, Sparkles, CheckCircle2, AlertTriangle, 
  Clock, Shield, BarChart3, ChevronRight, X, ExternalLink, RefreshCw, 
  Send, Layers, Eye, Check, Activity
} from 'lucide-react';
import { getAIRoutingHistory, UP_OFFICIAL_CATEGORIES } from '../../services/aiRoutingHistoryService';

const LLMRoutingHistory = () => {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState(() => getAIRoutingHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [minConfidenceFilter, setMinConfidenceFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return historyData.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchText = (item.post_text || '').toLowerCase().includes(q);
        const matchId = (item.ticket_id || '').toLowerCase().includes(q);
        if (!matchText && !matchId) return false;
      }

      // Status
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'auto_routed' && item.status !== 'auto_routed') return false;
        if (selectedStatus === 'manual_review' && item.status !== 'manual_review') return false;
      }

      // Category filter (whether category is in routed list)
      if (selectedCategory !== 'ALL') {
        const hasCat = (item.all_scores || []).some(
          (sc) => sc.category_name === selectedCategory && sc.score >= item.cutoff_threshold
        );
        if (!hasCat) return false;
      }

      // Min confidence filter
      if (minConfidenceFilter !== 'ALL') {
        const minConf = parseInt(minConfidenceFilter, 10);
        if (item.top_confidence < minConf) return false;
      }

      return true;
    });
  }, [historyData, searchQuery, selectedCategory, selectedStatus, minConfidenceFilter]);

  // Metric stats
  const totalCount = historyData.length;
  const autoRoutedCount = historyData.filter(i => i.status === 'auto_routed').length;
  const manualReviewCount = historyData.filter(i => i.status === 'manual_review').length;
  const avgConfidence = totalCount > 0 
    ? Math.round(historyData.reduce((acc, curr) => acc + (curr.top_confidence || 0), 0) / totalCount)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[pageFadeIn_0.2s_ease]">
      {/* Top Breadcrumb & Page Header */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200/60">
              <Shield size={12} className="text-amber-600" /> Super Admin
            </span>
            <ChevronRight size={12} className="text-slate-400" />
            <Link to="/super-admin/llm-settings" className="hover:text-[#4B267D] hover:underline font-semibold">
              การตั้งค่า AI & กฎกระจายงาน
            </Link>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-slate-800 font-bold">ประวัติการวิเคราะห์และกระจายงาน (Routing Audit History)</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4B267D] flex items-center justify-center shrink-0 border border-purple-100">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                ประวัติการวิเคราะห์และกระจายงาน AI (AI Routing Audit History)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ตรวจสอบย้อนหลังการประเมินเปอร์เซ็นต์ความมั่นใจของทุกหมวดหมู่ (0% - 100%) และการจัดส่งงานอัตโนมัติข้ามหน่วยงาน มหาวิทยาลัยพะเยา
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => navigate('/super-admin/llm-settings')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center gap-1.5 transition-colors bg-white shadow-xs cursor-pointer"
          >
            <ArrowLeft size={14} className="text-slate-500" />
            <span>กลับหน้าตั้งค่า AI</span>
          </button>
          <button
            type="button"
            onClick={() => setHistoryData(getAIRoutingHistory())}
            className="px-3.5 py-2 rounded-xl bg-[#4B267D] text-white font-semibold text-xs hover:bg-[#381C5F] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>รีเฟรชประวัติ</span>
          </button>
        </div>
      </section>

      {/* KPI Metric Summary Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">โพสต์ที่วิเคราะห์ทั้งหมด</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#4B267D] flex items-center justify-center">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalCount}</span>
            <span className="text-[11px] text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">กระจายงานสำเร็จ (Auto-routed)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">{autoRoutedCount}</span>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              {totalCount > 0 ? Math.round((autoRoutedCount / totalCount) * 100) : 0}% สำเร็จ
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">รอตรวจสอบด้วยตนเอง</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 font-mono">{manualReviewCount}</span>
            <span className="text-[11px] text-slate-400">ต่ำกว่าเกณฑ์ Cutoff</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ความมั่นใจเฉลี่ยสูงสุด</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-700 font-mono">{avgConfidence}%</span>
            <span className="text-[11px] text-slate-400">PhayaoBERT Cluster</span>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาด้วยรหัสตั๋ว เช่น #UP-9828 หรือคำในโพสต์ เช่น รถเมล์, แอร์, อาหาร..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#4B267D] bg-slate-50/50 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="w-full lg:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4B267D] bg-white cursor-pointer"
            >
              <option value="ALL">ทุกหมวดหมู่ปลายทาง (All Categories)</option>
              {UP_OFFICIAL_CATEGORIES.map((c) => (
                <option key={c.category_id} value={c.category_name}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-52">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4B267D] bg-white cursor-pointer"
            >
              <option value="ALL">สถานะทั้งหมด</option>
              <option value="auto_routed">กระจายงานสำเร็จ (Auto-routed)</option>
              <option value="manual_review">ต่ำกว่าเกณฑ์ (Manual Review)</option>
            </select>
          </div>

          {/* Min Confidence */}
          <div className="w-full lg:w-44">
            <select
              value={minConfidenceFilter}
              onChange={(e) => setMinConfidenceFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4B267D] bg-white cursor-pointer"
            >
              <option value="ALL">คะแนนความมั่นใจ: ทั้งหมด</option>
              <option value="80">มั่นใจสูง (≥ 80%)</option>
              <option value="60">ปานกลาง (≥ 60%)</option>
              <option value="40">ผ่านเกณฑ์ มพ. (≥ 40%)</option>
            </select>
          </div>
        </div>

        {/* Filter stats bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            แสดงผล <strong className="text-slate-800 font-bold">{filteredLogs.length}</strong> จากทั้งหมด {totalCount} รายการ
          </span>
          {(searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || minConfidenceFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setMinConfidenceFilter('ALL');
              }}
              className="text-[#4B267D] font-bold hover:underline cursor-pointer"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </section>

      {/* Main Audit History Table / Feed */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">ไม่พบบันทึกการกระจายงานที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              ลองปรับเปลี่ยนคำค้นหา หรือเลือกตัวกรองหมวดหมู่และสถานะใหม่
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const cutoff = log.cutoff_threshold || 40;
              const routedCategories = (log.all_scores || []).filter(s => s.score >= cutoff);
              const droppedCategories = (log.all_scores || []).filter(s => s.score < cutoff);

              return (
                <article
                  key={log.ticket_id}
                  className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Header line: Ticket ID, timestamp, and status badge */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-extrabold text-xs text-[#4B267D] bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-lg">
                        #{log.ticket_id}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {log.created_at} ({log.relative_time})
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        Cutoff: {cutoff}%
                      </span>
                      {log.status === 'auto_routed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <Check size={12} className="stroke-[3]" /> กระจายงานสำเร็จ ({routedCategories.length} หมวดหมู่)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <AlertTriangle size={12} /> ต่ำกว่าเกณฑ์ (รอ Triage)
                        </span>
                      )}
                    </div>

                    {/* Problem Post Text */}
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                      "{log.post_text}"
                    </p>

                    {/* Routing Destinations Breakdown */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      {/* Routed tags */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          หน่วยงานที่ได้รับงาน:
                        </span>
                        {routedCategories.length === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">ไม่มีหน่วยงานคะแนนถึงเกณฑ์</span>
                        ) : (
                          routedCategories.map((rc, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg shadow-2xs"
                            >
                              <span>{rc.category_name}</span>
                              <span className="font-mono bg-emerald-600 text-white px-1.5 py-0.2 rounded text-[10px]">
                                {rc.score}%
                              </span>
                              <span className="text-[10px] text-emerald-600 font-normal">({rc.sla})</span>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Dropped preview tags (showing % even for dropped/low items) */}
                      {droppedCategories.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            ไม่ผ่านเกณฑ์ (&lt; {cutoff}%):
                          </span>
                          {droppedCategories.slice(0, 3).map((dc, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-500 px-2 py-0.2 rounded font-mono text-[10px]">
                              {dc.category_name} ({dc.score}%)
                            </span>
                          ))}
                          {droppedCategories.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              + อีก {droppedCategories.length - 3} หมวดหมู่ (0%)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action button: Full breakdown */}
                  <div className="shrink-0 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#4B267D] font-bold text-xs flex items-center gap-1.5 transition-colors border border-purple-200/80 cursor-pointer shadow-2xs"
                    >
                      <Eye size={14} />
                      <span>ดูคะแนนทั้ง 9 หมวดหมู่</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Detail Modal: Full 9-Category Score Breakdown */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-[pageFadeIn_0.15s_ease]">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-purple-950 to-[#4B267D] text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <BarChart3 size={18} className="text-purple-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-2">
                    <span>ผลการวิเคราะห์คะแนนครบทั้ง 9 หมวดหมู่</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/20 text-white font-bold">
                      #{selectedLog.ticket_id}
                    </span>
                  </h3>
                  <p className="text-[11px] text-purple-200 mt-0.5">
                    ประมวลผลด้วยโมเดล {selectedLog.model} • เกณฑ์ส่งต่องาน {selectedLog.cutoff_threshold}%
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Post Text Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  ข้อความปัญหาต้นฉบับ (ORIGINAL POST TEXT)
                </span>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  "{selectedLog.post_text}"
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                  <span>บันทึกเมื่อ: {selectedLog.created_at}</span>
                  <span className="text-[#4B267D] font-bold">
                    ส่งต่องานสำเร็จ: {(selectedLog.all_scores || []).filter(s => s.score >= selectedLog.cutoff_threshold).length} จาก 9 หมวดหมู่
                  </span>
                </div>
              </div>

              {/* 9 Categories List with Progress Bars & Badges */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Layers size={14} className="text-[#4B267D]" />
                    <span>คะแนนความมั่นใจของแต่ละหมวดหมู่ (ตั้งแต่ 0% ถึง 100%)</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    เกณฑ์ Cutoff = <strong className="text-[#4B267D]">{selectedLog.cutoff_threshold}%</strong>
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(selectedLog.all_scores || []).map((item, idx) => {
                    const isPassed = item.score >= selectedLog.cutoff_threshold;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isPassed
                            ? 'border-emerald-200 bg-emerald-50/40 shadow-xs'
                            : 'border-slate-200 bg-slate-50/50 opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                                isPassed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {item.category_name}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono border ${
                                isPassed
                                  ? 'bg-white border-emerald-200 text-emerald-800'
                                  : 'bg-white border-slate-200 text-slate-500'
                              }`}
                            >
                              {item.sla}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-mono font-black text-sm ${
                                isPassed ? 'text-emerald-700' : 'text-slate-500'
                              }`}
                            >
                              {item.score}%
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPassed
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isPassed ? '✓ ส่งต่องานอัตโนมัติ' : `ตัดทิ้ง (< ${selectedLog.cutoff_threshold}%)`}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Visual */}
                        <div className="relative w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPassed
                                ? item.score >= 80 ? 'bg-emerald-500' : 'bg-sky-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.max(item.score, item.score > 0 ? 3 : 0)}%` }}
                          />
                        </div>

                        {item.reason && (
                          <p className="text-[11px] text-slate-500 mt-1.5">
                            {item.reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-slate-400">
                ระบบ Social Listening & Auto-Triage • มหาวิทยาลัยพะเยา
              </span>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMRoutingHistory;
