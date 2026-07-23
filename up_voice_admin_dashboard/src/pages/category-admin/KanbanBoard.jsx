// src/pages/category-admin/KanbanBoard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TicketCard from '../../components/TicketCard';
import MergeModal from '../../components/MergeModal';
import ForwardModal from '../../components/ForwardModal';
import TicketDetailModal from '../../components/TicketDetailModal';
import { fetchProblems, updateProblemStatus } from '../../services/problemService';
import { quarantineTicket, mergeDuplicate, forwardTicket } from '../../services/ticketService';
import { fetchCategories } from '../../services/categoryService';
import { LayoutGrid, RefreshCw, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

const COLUMNS = [
  { key: 'OPEN', label: 'รอดำเนินการ', emoji: '⏳', headerBg: 'bg-amber-50 border-amber-200 text-amber-700' },
  { key: 'IN_PROGRESS', label: 'กำลังดำเนินการ', emoji: '⚙️', headerBg: 'bg-sky-50 border-sky-200 text-sky-700' },
  { key: 'RESOLVED', label: 'แก้ไขสำเร็จ', emoji: '✅', headerBg: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

export default function KanbanBoard() {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [detailTarget, setDetailTarget] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);

  // Drag and drop state
  const [draggedTicketId, setDraggedTicketId] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pubRes, intRes, catsData] = await Promise.all([
        fetchProblems({ page_size: 100, visibility_name: 'public' }),
        fetchProblems({ page_size: 100, visibility_name: 'internal' }),
        fetchCategories(),
      ]);
      const merged = [...(pubRes.items || []), ...(intRes.items || [])];
      const unique = Array.from(new Map(merged.map(t => [t.problem_id, t])).values());
      setTickets(unique);
      setCategories(catsData || []);
    } catch (e) {
      console.error(e);
      setError('ไม่สามารถโหลดข้อมูล Kanban Board ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // AI Confidence Map for each ticket
  const aiMatchMap = useMemo(() => {
    const map = {};
    tickets.forEach(ticket => {
      if (ticket.is_hidden || ticket.parent_problem_id) return;
      const t1 = ((ticket.title || '') + ' ' + (ticket.building_name || '')).toLowerCase();
      
      let highestScore = 0;
      let matchCount = 0;

      tickets.forEach(other => {
        if (other.problem_id === ticket.problem_id || other.is_hidden || other.category_id !== ticket.category_id) return;
        const t2 = ((other.title || '') + ' ' + (other.building_name || '')).toLowerCase();
        
        let score = 0;
        const words = t1.split(/[\s,]+/);
        words.forEach(w => {
          if (w.length >= 2 && t2.includes(w)) score += 25;
        });

        // Location match boost
        if (ticket.building_name && other.building_name && ticket.building_name === other.building_name) {
          score += 45;
        }

        if (score >= 60) {
          matchCount++;
          if (score > highestScore) highestScore = score;
        }
      });

      if (matchCount > 0) {
        map[ticket.problem_id] = {
          score: Math.min(highestScore, 98),
          count: matchCount
        };
      }
    });
    return map;
  }, [tickets]);

  const getColumnTickets = (colKey) => {
    return tickets.filter(t => {
      if (t.is_hidden || t.parent_problem_id) return false;
      if (colKey === 'RESOLVED') return t.status_name === 'RESOLVED' || t.status_name === 'CLOSED';
      return t.status_name === colKey;
    });
  };

  const handleMoveStatus = async (ticket, newStatus) => {
    if (ticket.status_name === newStatus) return;
    try {
      await updateProblemStatus(ticket.problem_id, newStatus);
      setTickets(prev => prev.map(t =>
        t.problem_id === ticket.problem_id ? { ...t, status_name: newStatus } : t
      ));
      const statusLabels = { OPEN: 'รอดำเนินการ', IN_PROGRESS: 'กำลังดำเนินการ', RESOLVED: 'แก้ไขสำเร็จ' };
      showToast(`⚡ ย้ายตั๋ว #${ticket.ticket_id || ticket.problem_id} ไปยัง ${statusLabels[newStatus] || newStatus}`);
    } catch (e) {
      showToast(`❌ ย้ายสถานะไม่สำเร็จ: ${e.message}`);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, ticketId) => {
    setDraggedTicketId(ticketId);
    e.dataTransfer.setData('text/plain', String(ticketId));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const problemId = Number(e.dataTransfer.getData('text/plain') || draggedTicketId);
    if (!problemId) return;

    const targetTicket = tickets.find(t => t.problem_id === problemId);
    if (targetTicket) {
      await handleMoveStatus(targetTicket, targetStatus);
    }
    setDraggedTicketId(null);
  };

  const handleQuarantine = async (ticket) => {
    try {
      const isHiding = !ticket.is_hidden;
      await quarantineTicket(ticket.problem_id, isHiding);
      setTickets(prev => prev.map(t =>
        t.problem_id === ticket.problem_id ? { ...t, is_hidden: isHiding } : t
      ));
      showToast(isHiding ? `🔒 ซ่อนตั๋ว #${ticket.problem_id} สำเร็จ` : `🔓 แสดงตั๋ว #${ticket.problem_id} สำเร็จ`);
    } catch (e) {
      showToast(`❌ ดำเนินการไม่สำเร็จ`);
    }
  };

  const handleOpenMerge = (ticket) => {
    const duplicates = tickets
      .filter(t => t.problem_id !== ticket.problem_id && t.category_id === ticket.category_id && !t.is_hidden)
      .map(t => {
        const t1 = ((ticket.title || '') + ' ' + (ticket.building_name || '')).toLowerCase();
        const t2 = ((t.title || '') + ' ' + (t.building_name || '')).toLowerCase();
        let score = 50;
        const words = t1.split(/[\s,]+/);
        words.forEach(w => {
          if (w.length >= 2 && t2.includes(w)) score += 20;
        });
        if (ticket.building_name && t.building_name && ticket.building_name === t.building_name) {
          score += 25;
        }
        return { ticket: { ...t, confidencePercent: Math.min(score, 98) }, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.ticket)
      .slice(0, 5);

    setMergeTarget({ parentTicket: ticket, duplicates });
  };

  const handleMerge = async (childId) => {
    if (!mergeTarget) return;
    setActionLoading(true);
    try {
      await mergeDuplicate(mergeTarget.parentTicket.problem_id, childId);
      setTickets(prev => prev.map(t =>
        t.problem_id === childId
          ? { ...t, is_hidden: true, parent_problem_id: mergeTarget.parentTicket.problem_id, status_name: 'CLOSED' }
          : t
      ));
      showToast(`✅ รวมตั๋ว #${childId} เข้าตั๋วหลักสำเร็จ`);
      setMergeTarget(null);
    } catch (e) {
      showToast(`❌ รวมตั๋วไม่สำเร็จ: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans pb-20 text-left space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2B164D] rounded-xl flex items-center justify-center shadow-md">
            <LayoutGrid size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>Kanban Board (กระดานจัดการตั๋วปัญหา)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">ลากวางตั๋วเปลี่ยนสถานะ และให้ AI ช่วยคำนวณ % จับคู่รวมปัญหาที่ซ้ำซ้อน</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Auto-Merge Scan Button */}
          <button
            onClick={() => {
              const ticketWithMatch = tickets.find(t => aiMatchMap[t.problem_id]?.score >= 70);
              if (ticketWithMatch) {
                handleOpenMerge(ticketWithMatch);
              } else {
                showToast('✨ AI สแกนแล้ว ไม่พบตั๋วซ้ำที่มีค่าความมั่นใจสูงเกิน 70%');
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition-all"
          >
            <Sparkles size={14} className="text-amber-300 animate-pulse" />
            AI สแกนจับคู่ตั๋วซ้ำ
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            รีเฟรช
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 font-semibold">
          {error}
        </div>
      )}

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const colTickets = getColumnTickets(col.key);
          const otherStatuses = COLUMNS.filter(c => c.key !== col.key);
          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
              className="flex flex-col gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 min-h-[500px]"
            >
              {/* Column header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 shadow-sm ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{col.emoji}</span>
                  <span className="font-bold text-sm">{col.label}</span>
                </div>
                <span className="w-6 h-6 rounded-full bg-white border border-black/10 flex items-center justify-center text-xs font-black text-slate-700 shadow-sm">
                  {colTickets.length}
                </span>
              </div>

              {/* Ticket cards */}
              <div className="flex flex-col gap-3 flex-1">
                {colTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                    <span className="text-3xl mb-2">📭</span>
                    <p className="text-xs font-medium">ไม่มีตั๋วในคอลัมน์นี้</p>
                  </div>
                ) : (
                  colTickets.map(ticket => (
                    <div
                      key={ticket.problem_id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ticket.problem_id)}
                      className="cursor-grab active:cursor-grabbing transition-transform"
                    >
                      <TicketCard
                        ticket={ticket}
                        aiMatch={aiMatchMap[ticket.problem_id]}
                        onQuarantine={handleQuarantine}
                        onForward={() => setForwardTarget(ticket)}
                        onViewDetail={() => setDetailTarget(ticket)}
                        onMerge={() => handleOpenMerge(ticket)}
                      />
                      {/* Move to column buttons */}
                      <div className="flex gap-1 mt-1.5">
                        {otherStatuses.map(other => (
                          <button
                            key={other.key}
                            onClick={() => handleMoveStatus(ticket, other.key)}
                            className="flex-1 text-[10px] font-bold text-slate-500 hover:text-indigo-700 border border-slate-200 bg-white rounded-lg py-1 hover:bg-indigo-50 transition-colors shadow-xs"
                          >
                            → {other.emoji} {other.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {detailTarget && (
        <TicketDetailModal
          ticket={detailTarget}
          onClose={() => setDetailTarget(null)}
          onStatusChange={handleMoveStatus}
          onForward={(t) => setForwardTarget(t)}
          onQuarantine={handleQuarantine}
          onMerge={(t) => handleOpenMerge(t)}
        />
      )}

      {mergeTarget && (
        <MergeModal
          parentTicket={mergeTarget.parentTicket}
          duplicates={mergeTarget.duplicates}
          onMerge={handleMerge}
          onClose={() => setMergeTarget(null)}
          merging={actionLoading}
        />
      )}

      {forwardTarget && (
        <ForwardModal
          ticket={forwardTarget}
          categories={categories}
          onForward={handleForward}
          onClose={() => setForwardTarget(null)}
          forwarding={actionLoading}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-xl">
          {toastMsg}
        </div>
      )}

    </div>
  );
}
