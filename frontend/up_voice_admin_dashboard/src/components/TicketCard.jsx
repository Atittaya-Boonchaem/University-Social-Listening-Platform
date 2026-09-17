// src/components/TicketCard.jsx
import React from 'react';
import SLABadge from './SLABadge';
import { Eye, ShieldOff, Layers, Sparkles, Image as ImageIcon, MapPin, Tag } from 'lucide-react';

const statusStyles = {
  OPEN:        'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-[#2B164D] text-white',
  RESOLVED:    'bg-emerald-100 text-emerald-700',
  CLOSED:      'bg-slate-100 text-slate-500',
};

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

export default function TicketCard({ ticket, onQuarantine, onForward, onViewDetail, onMerge, aiMatch }) {
  const sla = ticket.sla_status ?? { level: 'grey', label: 'Unknown', days_open: 0 };
  const statusStyle = statusStyles[ticket.status_name] ?? 'bg-slate-100 text-slate-500';
  const isHidden = ticket.is_hidden;

  const matchScore = aiMatch?.score ?? 0;
  const confidencePercent = aiMatch ? Math.min(Math.round(matchScore), 98) : 0;
  const dups = ticket.duplicates || [];
  const reportCount = ticket.reportCount || (1 + dups.length);
  const attachments = ticket.attachments || [];

  return (
    <div
      onClick={() => onViewDetail?.(ticket)}
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col gap-3 relative cursor-pointer group ${
        isHidden ? 'opacity-60 border-rose-200 bg-rose-50/30' : 'border-slate-100 hover:border-indigo-200'
      }`}
    >
      {/* Auto-Cluster Header Banner if Merged */}
      {reportCount > 1 && (
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white px-3 py-1.5 rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Sparkles size={13} className="text-amber-300 animate-pulse" />
            <span>AI รวมกลุ่มอัตโนมัติ ({reportCount} รายงานย่อย)</span>
          </div>
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
          <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
            {ticket.title}
          </h3>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 ${statusStyle}`}>
          {ticket.status_name}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-wrap">
        <span className="flex items-center gap-1 font-medium text-slate-600">
          <span className="text-slate-300">📁</span>
          {ticket.category_name || 'หมวดหมู่ทั่วไป'}
        </span>
        {ticket.building_name && (
          <span className="flex items-center gap-1 text-slate-500">
            <MapPin size={12} className="text-indigo-400" />
            {ticket.building_name}
          </span>
        )}
        <span className="flex items-center gap-1 text-slate-400">
          <span>🕐</span>
          {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('th-TH') : ''}
        </span>
        {isHidden && (
          <span className="text-rose-500 font-semibold flex items-center gap-1">
            <ShieldOff size={11} /> ซ่อนอยู่
          </span>
        )}
      </div>

      {/* Multi-Department Collaboration & Routing Badges (No % shown) */}
      {(() => {
        const multi = ticket.llm_analysis?.multi_categories || [];
        const topScores = (ticket.llm_analysis?.all_category_scores || [])
          .filter(s => s.confidence >= 0.20 && s.category_name !== ticket.category_name);
        const related = multi.length > 1 ? multi : topScores;

        if (related.length === 0) return null;

        return (
          <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-[11px] space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1">
              <Tag size={12} className="text-amber-700" />
              <span>ส่งต่องานร่วมกับหมวดหมู่:</span>
            </div>
            <div className="text-amber-900 font-medium leading-relaxed">
              {related.map((c, i) => (
                <span key={i} className="inline-block mr-1">
                  <span className="font-bold bg-white px-2 py-0.5 rounded-lg border border-amber-300 text-[11px] text-amber-950 shadow-2xs">
                    {c.category_name}
                  </span>
                  {i < related.length - 1 && <span className="text-amber-500 font-bold ml-1">,</span>}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Clustered Sub-reports preview on Card */}
      {dups.length > 0 && (
        <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] space-y-1.5">
          <span className="font-bold text-indigo-800 flex items-center gap-1">
            <Layers size={12} className="text-indigo-600" /> รายงานที่ถูกรวมเข้ามา ({dups.length} รายการ):
          </span>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {dups.map((d, idx) => (
              <div key={d.problem_id || idx} className="text-slate-600 truncate pl-2 border-l-2 border-indigo-300">
                <span className="font-bold text-indigo-700">#{d.ticket_id || d.problem_id}:</span> {d.title || d.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Thumbnails on Card */}
      {attachments.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1">
          {attachments.slice(0, 3).map((att, idx) => (
            <img
              key={idx}
              src={resolveImageUrl(att)}
              alt="Attachment thumb"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-100"
            />
          ))}
          {attachments.length > 3 && (
            <span className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
              +{attachments.length - 3}
            </span>
          )}
        </div>
      )}

      {/* SLA Badge */}
      <SLABadge level={sla.level} label={sla.label} daysOpen={sla.days_open} />

      {/* Action buttons */}
      <div 
        className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-50 mt-auto flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
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
