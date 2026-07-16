// src/components/MergeModal.jsx
/**
 * Duplicate Merge Interface.
 * Shows a list of potentially-duplicate tickets and lets admin merge them.
 *
 * Props:
 *  - parentTicket: the canonical ticket
 *  - duplicates: array of similar tickets (AI-suggested or admin-selected)
 *  - onMerge(childId): callback to execute the merge
 *  - onClose(): close the modal
 *  - merging: boolean — is a merge in progress
 */
import React, { useState } from 'react';
import { GitMerge, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import SLABadge from './SLABadge';

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <GitMerge size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base">รวมปัญหาที่ซ้ำซ้อน</h2>
              <p className="text-white/70 text-xs mt-0.5">Merge Duplicate Tickets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Parent ticket info */}
        <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">
            📌 ตั๋วหลัก (Parent Ticket)
          </p>
          <div className="flex items-center gap-3">
            {parentTicket.ticket_id && (
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                {parentTicket.ticket_id}
              </span>
            )}
            <span className="text-sm font-semibold text-slate-800">{parentTicket.title}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{parentTicket.category_name}</p>
        </div>

        {/* Duplicate list */}
        <div className="flex-1 overflow-y-auto p-6">
          {duplicates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle2 size={40} className="mb-3 text-slate-300" />
              <p className="font-semibold">ไม่พบตั๋วที่ซ้ำซ้อน</p>
              <p className="text-xs mt-1">AI ไม่พบตั๋วที่คล้ายกันในระบบ</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                เลือกตั๋วที่ต้องการรวม ({duplicates.length} รายการที่พบ)
              </p>
              {duplicates.map((dup) => {
                const isSelected = selectedChildId === dup.problem_id;
                const sla = dup.sla_status ?? { level: 'grey', label: 'Unknown', days_open: 0 };
                return (
                  <div
                    key={dup.problem_id}
                    onClick={() => setSelectedChildId(dup.problem_id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Radio indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        isSelected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {dup.ticket_id && (
                            <span className="text-[11px] font-mono font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                              {dup.ticket_id}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-slate-700">{dup.title}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">
                          {dup.category_name} · {new Date(dup.created_at).toLocaleDateString('th-TH')}
                        </p>
                        <SLABadge level={sla.level} label={sla.label} daysOpen={sla.days_open} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-xs text-slate-500">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <span>ตั๋วที่ถูกรวมจะถูกซ่อนจาก Feed สาธารณะ</span>
          </div>

          {/* Confirm step */}
          {confirmStep ? (
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-rose-600">ยืนยันการรวม?</p>
              <button
                onClick={() => setConfirmStep(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirm}
                disabled={merging}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {merging ? (
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <GitMerge size={12} />
                )}
                ยืนยันรวม
              </button>
            </div>
          ) : (
            <button
              id="merge-duplicate-btn"
              onClick={handleMergeClick}
              disabled={!selectedChildId || merging}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <GitMerge size={16} />
              รวมปัญหา
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
