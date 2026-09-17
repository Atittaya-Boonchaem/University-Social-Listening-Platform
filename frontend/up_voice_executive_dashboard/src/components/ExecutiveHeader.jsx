import React from 'react';
import { Search, Bell, Filter, Calendar, FileDown, Database, Sparkles } from 'lucide-react';

export default function ExecutiveHeader({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  categories = [],
  timeframe,
  setTimeframe,
  onOpenReport,
  user,
  useRealData,
  setUseRealData,
}) {
  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* Search Input */}
      <div className="flex-1 min-w-[260px] max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาตั๋ว, หมวดหมู่, หรือปัญหา..."
          className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
        />
      </div>

      {/* Filter and Action Controls */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Real Data vs Demo Toggle Button */}
        <button
          onClick={() => setUseRealData(!useRealData)}
          title="สลับระหว่างข้อมูลจริงจากฐานข้อมูล กับ ข้อมูลชุดจำลองนำเสนอ"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
            useRealData
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          {useRealData ? (
            <>
              <Database className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>ข้อมูลจริง (Live DB)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ข้อมูลจำลอง (Demo 1,248)</span>
            </>
          )}
        </button>

        {/* Category Filter Dropdown */}
        <div className="relative flex items-center">
          <Filter className="w-4 h-4 text-purple-700 absolute left-3 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-9 pr-8 py-2 bg-purple-50/70 hover:bg-purple-100/60 border border-purple-200/80 rounded-xl text-xs font-semibold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 cursor-pointer transition-all max-w-[220px] truncate"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe Selector */}
        <div className="relative flex items-center hidden sm:flex">
          <Calendar className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer transition-all"
          >
            <option value="30days">30 วันล่าสุด</option>
            <option value="term1">ภาคเรียนที่ 1/2567</option>
            <option value="term2">ภาคเรียนที่ 2/2567</option>
            <option value="year">ปีการศึกษา 2567</option>
          </select>
        </div>

        {/* Export Executive Summary Report Button */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-2 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all active:scale-95"
        >
          <FileDown className="w-4 h-4" />
          <span className="hidden md:inline">รายงานสรุปผู้บริหาร</span>
        </button>

        {/* Notification Bell */}
        <button
          title="การแจ้งเตือน"
          className="relative p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors border border-slate-200"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white"></span>
        </button>

        {/* User Identity in Header */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="hidden lg:block text-right">
            <div className="text-xs font-bold text-slate-800">
              {user?.name || 'ผู้ดูแลระบบ UP'}
            </div>
            <div className="text-[11px] text-purple-700 font-medium">
              ผู้บริหารระดับสูง
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-purple-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-purple-200">
            {user?.name ? user.name.charAt(0) : 'UP'}
          </div>
        </div>
      </div>
    </header>
  );
}
