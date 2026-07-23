// src/components/MergeModal.jsx
import React, { useState } from 'react';
import { GitMerge, AlertCircle, X, CheckCircle2, Sparkles, MapPin, FileText } from 'lucide-react';

export default function MergeModal({ parentTicket, duplicates = [], onMerge, onClose, merging = false }) {
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [confirmStep, setConfirmStep] = useState(false);

  const handleMergeClick = () => {
    if (!selectedChildId) return;
    setConfirmStep(true);
  };

  const handleConfirm = () => {
    onMerge?.(selectedChildId);
    setConfirmStep(false);
  };

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
              <Sparkles size={20} className="text-amber-300" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-2">
                <span>AI ช่วยรวมปัญหาที่ซ้ำซ้อน</span>
                <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-2 py-0.5 rounded-full">AI Smart Merge</span>
              </h2>
              <p className="text-white/80 text-xs mt-0.5">วิเคราะห์และคำนวณเปอร์เซ็นต์ความคล้ายกันของตั๋วปัญหา</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
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
            {parentTicket.ticket_id && (
              <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                {parentTicket.ticket_id}
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
              <p className="font-bold text-slate-700 text-sm">ไม่พบปัญหาที่ซ้ำซ้อนในระบบ</p>
              <p className="text-xs mt-1 text-slate-400">AI สแกนแล้ว ไม่พบตั๋วอื่นที่มีหัวข้อและสถานที่ตรงกัน</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-600" />
                <span>ผลวิเคราะห์ AI จับคู่ตั๋วที่คล้ายกัน ({duplicates.length} รายการ)</span>
              </p>
              
              {duplicates.map((dup) => {
                const isSelected = selectedChildId === dup.problem_id;
                const confidence = dup.confidencePercent || 92;

                return (
                  <div
                    key={dup.problem_id}
                    onClick={() => setSelectedChildId(dup.problem_id)}
                    className={`cursor-pointer rounded-2xl border-2 p-4 transition-all relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Top Row: Ticket ID & AI Confidence Score % */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        🎫 {dup.ticket_id || `#${dup.problem_id}`}
                      </span>

                      {/* Confidence Score Badge */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 hidden sm:block">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs flex items-center gap-1">
                          <Sparkles size={11} />
                          {confidence}% ความมั่นใจ AI
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-slate-800 mb-2">{dup.title}</h4>

                    {/* AI Matching Analysis Bullet Points */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-100 mb-2">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <FileText size={13} className="text-indigo-500 shrink-0" />
                        <span>เรื่องซ้ำกัน: <strong className="text-slate-800">{dup.category_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={13} className="text-emerald-500 shrink-0" />
                        <span>สถานที่: <strong className="text-slate-800">{dup.building_name || 'สถานที่เดียวกัน'}</strong></span>
                      </div>
                    </div>

                    {/* Selection Radio Indicator */}
                    <div className="flex justify-end items-center gap-2 pt-1">
                      <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isSelected ? '✓ เลือกตั๋วนี้เพื่อรวม' : 'คลิกเพื่อเลือกตั๋วนี้'}
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
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleMergeClick}
            disabled={!selectedChildId || merging}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-40 transition-all flex items-center gap-2"
          >
            <GitMerge size={15} />
            <span>ยืนยันรวมตั๋วที่เลือกเข้าตั๋วหลัก</span>
          </button>
        </div>

        {/* Confirm step popup */}
        {confirmStep && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-20 flex items-center justify-center p-6 text-center">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <GitMerge size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">ยืนยันการรวมตั๋วปัญหา</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ตั๋วที่เลือกจะถูกย้ายเป็นเคสย่อยของตั๋วหลัก <strong>#{parentTicket.ticket_id}</strong> และจะถูกตั้งสถานะเป็น CLOSED โดยอัตโนมัติ
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmStep(false)}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={merging}
                  className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
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
