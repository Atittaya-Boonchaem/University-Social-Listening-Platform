// src/components/ForwardModal.jsx
/**
 * Forward Ticket Modal — allows admin to reassign a ticket to a different category.
 *
 * Props:
 *  - ticket: the problem being forwarded
 *  - categories: array of { category_id, category_name, ticket_prefix }
 *  - onForward(ticket, newCategoryId): callback
 *  - onClose(): close modal
 *  - forwarding: boolean
 */
import React, { useState } from 'react';
import { Send, X, ChevronRight } from 'lucide-react';

export default function ForwardModal({ ticket, categories = [], onForward, onClose, forwarding = false }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [note, setNote] = useState('');

  const currentCat = categories.find(c => c.category_id === ticket?.category_id);
  const targetCat = categories.find(c => c.category_id === selectedCategoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Send size={18} />
            </div>
            <div>
              <h2 className="font-bold">โอนย้ายตั๋วปัญหา</h2>
              <p className="text-white/70 text-xs">Forward Ticket to Another Category</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Ticket info */}
          <div className="bg-slate-50 rounded-xl p-3 text-sm">
            <p className="text-xs text-slate-400 mb-1">ตั๋วที่ต้องการโอน</p>
            <p className="font-semibold text-slate-800 line-clamp-1">{ticket?.title}</p>
            {ticket?.ticket_id && (
              <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                {ticket.ticket_id}
              </span>
            )}
          </div>

          {/* Path visualization */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold">
              {currentCat?.category_name ?? 'หมวดหมู่ปัจจุบัน'}
            </span>
            <ChevronRight size={14} className="text-slate-400 shrink-0" />
            <span className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              targetCat ? 'bg-sky-100 text-sky-700' : 'bg-slate-50 text-slate-400 border border-dashed border-slate-200'
            }`}>
              {targetCat?.category_name ?? 'เลือกหมวดหมู่ใหม่'}
            </span>
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              โอนไปยังหมวดหมู่
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {categories
                .filter(c => c.category_id !== ticket?.category_id)
                .map(cat => (
                  <button
                    key={cat.category_id}
                    onClick={() => setSelectedCategoryId(cat.category_id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                      selectedCategoryId === cat.category_id
                        ? 'border-sky-500 bg-sky-50 text-sky-800 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{cat.category_name}</span>
                      {cat.ticket_prefix && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded">
                          {cat.ticket_prefix}-**-****
                        </span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              หมายเหตุ (ไม่บังคับ)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เหตุผลในการโอนย้าย..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100"
          >
            ยกเลิก
          </button>
          <button
            id="confirm-forward-btn"
            onClick={() => onForward?.(ticket, selectedCategoryId, note)}
            disabled={!selectedCategoryId || forwarding}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {forwarding ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
            ยืนยันโอนย้าย
          </button>
        </div>
      </div>
    </div>
  );
}
