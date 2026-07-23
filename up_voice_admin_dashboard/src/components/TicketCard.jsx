// src/components/TicketCard.jsx
import React from 'react';
import SLABadge from './SLABadge';
import { Eye, ShieldOff, Layers, Sparkles } from 'lucide-react';

const statusStyles = {
  OPEN:        'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-[#2B164D] text-white',
  RESOLVED:    'bg-emerald-100 text-emerald-700',
  CLOSED:      'bg-slate-100 text-slate-500',
};

export default function TicketCard({ ticket, onQuarantine, onForward, onViewDetail, onMerge, aiMatch }) {
  const sla = ticket.sla_status ?? { level: 'grey', label: 'Unknown', days_open: 0 };
  const statusStyle = statusStyles[ticket.status_name] ?? 'bg-slate-100 text-slate-500';
  const isHidden = ticket.is_hidden;

  // AI confidence score calculation for display
  const matchScore = aiMatch?.score ?? 0;
  const confidencePercent = aiMatch ? Math.min(Math.round(matchScore), 98) : 0;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col gap-3 relative ${
        isHidden ? 'opacity-60 border-rose-200 bg-rose-50/30' : 'border-slate-100'
      }`}
    >
      {/* AI Confidence Badge at Top-Right if match found */}
      {confidencePercent >= 70 && !ticket.parent_problem_id && (
        <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs animate-pulse">
            <Sparkles size={12} />
            AI มั่นใจ {confidencePercent}% มีปัญหาซ้ำ
          </span>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {aiMatch.count} ตั๋วคล้ายกัน
          </span>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          {ticket.ticket_id && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md w-fit">
              🎫 {ticket.ticket_id}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
            {ticket.title}
          </h3>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${statusStyle}`}>
          {ticket.status_name}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="text-slate-300">📁</span>
          {ticket.category_name || 'Uncategorized'}
        </span>
        {ticket.building_name && (
          <span className="flex items-center gap-1">
            <span className="text-slate-300">📍</span>
            {ticket.building_name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="text-slate-300">🕐</span>
          {new Date(ticket.created_at).toLocaleDateString('th-TH')}
        </span>
        {isHidden && (
          <span className="text-rose-500 font-semibold flex items-center gap-1">
            <ShieldOff size={11} /> ซ่อนอยู่
          </span>
        )}
        {ticket.parent_problem_id && (
          <span className="text-violet-500 font-semibold text-[10px]">
            ↳ รวมเข้า #{ticket.parent_problem_id}
          </span>
        )}
      </div>

      {/* SLA Badge */}
      <SLABadge level={sla.level} label={sla.label} daysOpen={sla.days_open} />

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-50 mt-auto flex-wrap">
        <button
          id={`view-ticket-${ticket.problem_id}`}
          onClick={() => onViewDetail?.(ticket)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
        >
          <Eye size={13} /> ดูรายละเอียด
        </button>

        {onMerge && (
          <button
            id={`merge-ticket-${ticket.problem_id}`}
            onClick={() => onMerge?.(ticket)}
            className={`flex items-center gap-1 text-xs font-bold transition-all px-2.5 py-1 rounded-lg ${
              confidencePercent >= 70
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs hover:opacity-90'
                : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
            }`}
            title="รวมปัญหาที่ซ้ำซ้อนด้วย AI"
          >
            <Sparkles size={13} />
            <span>รวมปัญหา</span>
            {confidencePercent >= 70 && (
              <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                {confidencePercent}%
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
