// src/components/TicketCard.jsx
/**
 * Reusable TicketCard component.
 * Displays ticket_id, title, category, SLA badge, and status.
 *
 * Props:
 *  - ticket: problem object from API
 *  - onQuarantine(ticket): callback when admin clicks Hide/Show
 *  - onForward(ticket): callback when admin clicks Forward
 *  - onViewDetail(ticket): callback for detail view
 */
import React from 'react';
import SLABadge from './SLABadge';
import { Eye, Forward, ShieldOff, Shield } from 'lucide-react';

const statusStyles = {
  OPEN:        'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-sky-100 text-sky-700',
  RESOLVED:    'bg-emerald-100 text-emerald-700',
  CLOSED:      'bg-slate-100 text-slate-500',
};

export default function TicketCard({ ticket, onQuarantine, onForward, onViewDetail }) {
  const sla = ticket.sla_status ?? { level: 'grey', label: 'Unknown', days_open: 0 };
  const statusStyle = statusStyles[ticket.status_name] ?? 'bg-slate-100 text-slate-500';
  const isHidden = ticket.is_hidden;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-3 ${
        isHidden ? 'opacity-60 border-rose-200 bg-rose-50/30' : 'border-slate-100'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          {/* Ticket ID badge */}
          {ticket.ticket_id && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md w-fit">
              🎫 {ticket.ticket_id}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
            {ticket.title}
          </h3>
        </div>
        {/* Status pill */}
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
      <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-auto">
        <button
          id={`view-ticket-${ticket.problem_id}`}
          onClick={() => onViewDetail?.(ticket)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
        >
          <Eye size={13} /> ดูรายละเอียด
        </button>
        <button
          id={`forward-ticket-${ticket.problem_id}`}
          onClick={() => onForward?.(ticket)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors px-2 py-1 rounded-lg hover:bg-sky-50"
        >
          <Forward size={13} /> โอนย้าย
        </button>
        <button
          id={`quarantine-ticket-${ticket.problem_id}`}
          onClick={() => onQuarantine?.(ticket)}
          className={`flex items-center gap-1.5 text-xs font-semibold ml-auto transition-colors px-2 py-1 rounded-lg ${
            isHidden
              ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
              : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
          }`}
        >
          {isHidden ? <Shield size={13} /> : <ShieldOff size={13} />}
          {isHidden ? 'แสดงโพสต์' : 'ซ่อน'}
        </button>
      </div>
    </div>
  );
}
