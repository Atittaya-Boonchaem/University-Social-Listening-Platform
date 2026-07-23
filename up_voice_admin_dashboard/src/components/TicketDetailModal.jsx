// src/components/TicketDetailModal.jsx
import React, { useState } from 'react';
import { X, Calendar, MapPin, User, FileText, Image as ImageIcon, Forward, Shield, ShieldOff, Layers, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import SLABadge from './SLABadge';

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

export default function TicketDetailModal({ ticket, onClose, onStatusChange, onForward, onQuarantine, onMerge }) {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!ticket) return null;

  const sla = ticket.sla_status ?? { level: 'grey', label: 'Unknown', days_open: 0 };
  const authorName = ticket.author_name || ticket.author?.display_name || 'ไม่ระบุชื่อผู้แจ้ง';
  const authorEmail = ticket.author?.email || '—';
  const authorRole = ticket.author?.role || 'user';

  const attachments = ticket.attachments || [];
  const dups = ticket.duplicates || [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      {/* Lightbox Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={resolveImageUrl(selectedImage)} alt="Attachment Full View" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full text-slate-800 font-bold shadow-lg flex items-center justify-center">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-[pageFadeIn_0.2s_ease] text-left">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
              🎫 {ticket.ticket_id || `#${ticket.problem_id}`}
            </span>
            <div>
              <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                ticket.status_name === 'OPEN' ? 'bg-amber-100 text-amber-700' :
                ticket.status_name === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {ticket.status_name === 'OPEN' ? 'ยังไม่รับเรื่อง' : ticket.status_name === 'IN_PROGRESS' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-snug">{ticket.title}</h2>
          </div>

          {/* User Author & Time Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {authorName[0]?.toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">ผู้รายงานปัญหา</span>
                <span className="text-xs font-bold text-slate-800">{authorName}</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded ml-1 font-mono uppercase">
                  {authorRole}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Clock size={16} className="text-slate-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">เวลาที่แจ้ง</span>
                <span className="font-medium text-slate-700">
                  {new Date(ticket.created_at).toLocaleString('th-TH', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })} น.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <MapPin size={16} className="text-slate-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block">สถานที่เกิดเหตุ</span>
                <span className="font-medium text-slate-700 truncate block max-w-[160px]" title={ticket.building_name || ticket.location}>
                  {ticket.building_name || ticket.location || 'ไม่ระบุพิกัด'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายละเอียดปัญหา (Description)</h4>
            <div className="p-4 bg-white rounded-2xl border border-slate-200 text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
              {ticket.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
            </div>
          </div>

          {/* Image Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={14} className="text-indigo-500" /> รูปภาพแนบจากผู้รายงาน ({attachments.length} รูป)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((att, idx) => {
                  const imgUrl = resolveImageUrl(att);
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(imgUrl)}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video cursor-pointer hover:shadow-md transition-all"
                    >
                      <img src={imgUrl} alt="Attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                        🔍 คลิกขยายภาพ
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Merged Duplicates Section */}
          {dups.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" /> รายงานปัญหาซ้ำที่ถูกรวมอยู่ในตั๋วนี้ ({dups.length} รายการ)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {dups.map((dup, idx) => (
                  <div key={dup.problem_id || idx} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-1 text-left">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span>#{dup.ticket_id || dup.problem_id} &bull; {dup.author_name || dup.author?.display_name || "ไม่ระบุชื่อ"}</span>
                      <span className="text-[11px] text-slate-400">{dup.created_at ? new Date(dup.created_at).toLocaleDateString('th-TH') : ''}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{dup.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLA Badge */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">สถานะกำหนดเวลา SLA:</span>
            <SLABadge level={sla.level} label={sla.label} daysOpen={sla.days_open} />
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">เปลี่ยนสถานะ:</span>
            <select
              value={ticket.status_name}
              onChange={(e) => onStatusChange?.(ticket.problem_id, e.target.value)}
              className="text-xs font-bold rounded-lg px-3 py-1.5 border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="OPEN">⏳ รอดำเนินการ</option>
              <option value="IN_PROGRESS">⚙️ กำลังดำเนินการ</option>
              <option value="RESOLVED">✅ แก้ไขสำเร็จ (เสร็จสิ้น)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {onMerge && (
              <button
                onClick={() => { onClose(); onMerge(ticket); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Layers size={13} /> รวมตั๋วซ้ำ
              </button>
            )}

            {onForward && (
              <button
                onClick={() => { onClose(); onForward(ticket); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold rounded-lg hover:bg-sky-100 transition-colors"
              >
                <Forward size={13} /> โอนย้าย
              </button>
            )}

            {onQuarantine && (
              <button
                onClick={() => { onClose(); onQuarantine(ticket); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"
              >
                {ticket.is_hidden ? <Shield size={13} /> : <ShieldOff size={13} />}
                {ticket.is_hidden ? 'แสดงโพสต์' : 'ซ่อน'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
