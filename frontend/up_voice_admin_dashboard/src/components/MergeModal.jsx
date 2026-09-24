// src/components/MergeModal.jsx
import React, { useState } from 'react';
import { GitMerge, X, CheckCircle2, Sparkles, MapPin, FileText, Check } from 'lucide-react';

export default function MergeModal({ parentTicket, duplicates = [], onMerge, onClose, merging = false }) {
  // Default to selecting all duplicates provided in the list
  const [selectedChildIds, setSelectedChildIds] = useState(() => 
    new Set(duplicates.map(d => d.problem_id))
  );
  const [confirmStep, setConfirmStep] = useState(false);

  const toggleSelect = (id) => {
    setSelectedChildIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMergeClick = () => {
    if (selectedChildIds.size === 0) return;
    setConfirmStep(true);
  };

  const handleConfirm = () => {
    onMerge?.(Array.from(selectedChildIds));
    setConfirmStep(false);
  };

  const selectedCount = selectedChildIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-left border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <GitMerge size={20} className="text-amber-300" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-2">
                <span>รวมปัญหาที่ซ้ำซ้อน (Merge Cases)</span>
                <span className="text-[10px] bg-white/20 text-white font-extrabold px-2.5 py-0.5 rounded-full">
                  รวมกลุ่มคำร้อง
                </span>
              </h2>
              <p className="text-white/80 text-xs mt-0.5">รวมคำร้องที่มีหัวข้อหรือสถานที่ใกล้เคียงกันเข้าเป็นกลุ่มเดียวกัน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Parent ticket info */}
        <div className="px-6 py-4 bg-indigo-50/70 border-b border-indigo-100">
          <p className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>📌 ตั๋วหลักตั้งต้น (Parent Ticket)</span>
          </p>
          <div className="flex items-center gap-3">
            {(parentTicket.ticket_id || parentTicket.formatted_ticket_id) && (
              <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                {parentTicket.formatted_ticket_id || parentTicket.ticket_id}
              </span>
            )}
            <span className="text-sm font-bold text-slate-800">{parentTicket.title}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 font-medium">
            <span>📁 {parentTicket.category_name}</span>
            {parentTicket.building_name && <span>📍 {parentTicket.building_name}</span>}
          </div>
        </div>

        {/* Duplicate list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {duplicates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle2 size={40} className="mb-3 text-emerald-400" />
              <p className="font-bold text-slate-700 text-sm">ไม่พบคำร้องที่เลือกเพื่อรวมกลุ่ม</p>
              <p className="text-xs mt-1 text-slate-400">กรุณาเลือกคำร้องที่ต้องการรวมกลุ่มจากตาราง</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <GitMerge size={14} className="text-indigo-600" />
                <span>รายการคำร้องที่ต้องการรวมเข้ากลุ่ม ({duplicates.length} รายการ)</span>
              </p>
              
              {duplicates.map((dup) => {
                const isSelected = selectedChildIds.has(dup.problem_id);
                const confidence = dup.confidencePercent || 95;

                return (
                  <div
                    key={dup.problem_id}
                    onClick={() => toggleSelect(dup.problem_id)}
                    className={`cursor-pointer rounded-2xl border-2 p-4 transition-all relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Ticket ID & Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        🎫 {dup.formatted_ticket_id || dup.ticket_id || `#${dup.problem_id}`}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center gap-1 shadow-2xs">
                          <Sparkles size={11} className="text-indigo-600" />
                          รายการที่มีความคล้ายคลึงกัน
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-slate-800 mb-2">{dup.title}</h4>

                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-100 mb-2">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <FileText size={13} className="text-indigo-500 shrink-0" />
                        <span>หมวดหมู่: <strong className="text-slate-800">{dup.category_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={13} className="text-emerald-500 shrink-0" />
                        <span>สถานที่: <strong className="text-slate-800">{dup.building_name || 'สถานที่เดียวกัน'}</strong></span>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    <div className="flex justify-end items-center gap-2 pt-1">
                      <span className={`text-xs font-bold flex items-center gap-1 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isSelected ? (
                          <>
                            <Check size={14} className="stroke-[3]" />
                            <span>เลือกคำร้องนี้เพื่อรวมกลุ่ม</span>
                          </>
                        ) : (
                          <span>คลิกเพื่อเลือกคำร้องนี้</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleMergeClick}
            disabled={selectedCount === 0 || merging}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <GitMerge size={15} />
            <span>ยืนยันรวมตั๋วที่เลือกเข้าตั๋วหลัก ({selectedCount} รายการ)</span>
          </button>
        </div>

        {/* Confirm step popup */}
        {confirmStep && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-20 flex items-center justify-center p-6 text-center animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150 text-left">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <GitMerge size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-800">ยืนยันการรวมตั๋วปัญหา</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  คำร้องที่เลือกจำนวน <strong>{selectedCount} รายการ</strong> จะถูกรวมเข้าเป็นคำร้องย่อยของตั๋วหลัก <strong>#{parentTicket.formatted_ticket_id || parentTicket.ticket_id}</strong> และจะถูกตั้งสถานะเป็น CLOSED บนตารางรายการคำร้องโดยอัตโนมัติ
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={merging}
                  className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer active:scale-95"
                >
                  {merging ? 'กำลังรวมเคส...' : 'ยืนยันรวมตั๋ว'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
