// src/pages/category-admin/KanbanBoard.jsx
/**
 * Kanban Board for Category Admin.
 * Columns: OPEN → IN_PROGRESS → RESOLVED
 * Each card uses <TicketCard /> and supports status updates via drag-and-drop click
 * (using simple column click since react-beautiful-dnd is not installed).
 */
import React, { useState, useEffect, useCallback } from 'react';
import TicketCard from '../../components/TicketCard';
import MergeModal from '../../components/MergeModal';
import ForwardModal from '../../components/ForwardModal';
import { fetchProblems, updateProblemStatus } from '../../services/problemService';
import { quarantineTicket, mergeDuplicate, forwardTicket } from '../../services/ticketService';
import { fetchCategories } from '../../services/categoryService';
import { LayoutGrid, RefreshCw } from 'lucide-react';

const COLUMNS = [
  { key: 'OPEN',        label: 'รอดำเนินการ',     color: 'bg-amber-500',   headerBg: 'bg-amber-50 border-amber-200',   emoji: '⏳' },
  { key: 'IN_PROGRESS', label: 'กำลังดำเนินการ', color: 'bg-sky-500',    headerBg: 'bg-sky-50 border-sky-200',       emoji: '⚙️' },
  { key: 'RESOLVED',    label: 'แก้ไขสำเร็จ',    color: 'bg-emerald-500', headerBg: 'bg-emerald-50 border-emerald-200', emoji: '✅' },
];

export default function KanbanBoard() {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [mergeTarget, setMergeTarget] = useState(null); // { parentTicket, duplicates }
  const [forwardTarget, setForwardTarget] = useState(null); // ticket
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pubData, internalData, cats] = await Promise.all([
        fetchProblems({ page_size: 100, visibility_name: 'public' }, true),
        fetchProblems({ page_size: 100, visibility_name: 'internal' }, true),
        fetchCategories(),
      ]);
      const merged = [...(pubData.items || []), ...(internalData.items || [])];
      const unique = Array.from(new Map(merged.map(p => [p.problem_id, p])).values());
      setTickets(unique);
      setCategories(cats);
    } catch (e) {
      setError('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getColumnTickets = (statusKey) =>
    tickets.filter(t => t.status_name === statusKey && !t.is_hidden && !t.parent_problem_id);

  const handleMoveStatus = async (ticket, targetStatus) => {
    if (ticket.status_name === targetStatus) return;
    try {
      await updateProblemStatus(ticket.problem_id, targetStatus);
      setTickets(prev => prev.map(t =>
        t.problem_id === ticket.problem_id ? { ...t, status_name: targetStatus } : t
      ));
      showToast(`✅ ย้าย "${ticket.title.slice(0, 30)}…" ไปยัง ${targetStatus}`);
    } catch {
      showToast('❌ ย้ายสถานะไม่สำเร็จ');
    }
  };

  const handleQuarantine = async (ticket) => {
    setActionLoading(true);
    try {
      const newHidden = !ticket.is_hidden;
      await quarantineTicket(ticket.problem_id, newHidden);
      setTickets(prev => prev.map(t =>
        t.problem_id === ticket.problem_id ? { ...t, is_hidden: newHidden } : t
      ));
      showToast(newHidden ? `🙈 ซ่อน "${ticket.title.slice(0, 30)}…" แล้ว` : `👁 แสดง "${ticket.title.slice(0, 30)}…" แล้ว`);
    } catch {
      showToast('❌ ดำเนินการไม่สำเร็จ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenMerge = (ticket) => {
    // Find similar tickets by same category (simple heuristic)
    const duplicates = tickets.filter(t =>
      t.problem_id !== ticket.problem_id &&
      t.category_id === ticket.category_id &&
      !t.is_hidden &&
      t.status_name !== 'RESOLVED' &&
      t.status_name !== 'CLOSED'
    ).slice(0, 5);
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
      showToast(`❌ ${e.response?.data?.message || 'รวมตั๋วไม่สำเร็จ'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForward = async (ticket, newCategoryId) => {
    if (!newCategoryId) return;
    setActionLoading(true);
    try {
      const updated = await forwardTicket(ticket.problem_id, newCategoryId);
      setTickets(prev => prev.map(t =>
        t.problem_id === ticket.problem_id
          ? { ...t, category_id: newCategoryId, category_name: updated?.category_name ?? t.category_name, ticket_id: updated?.ticket_id ?? t.ticket_id }
          : t
      ));
      showToast(`✅ โอนย้ายตั๋วสำเร็จ`);
      setForwardTarget(null);
    } catch (e) {
      showToast(`❌ ${e.response?.data?.message || 'โอนย้ายไม่สำเร็จ'}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-indigo-600 font-semibold">
        <span className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        กำลังโหลด Kanban Board...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2B164D] rounded-xl flex items-center justify-center">
            <LayoutGrid size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Kanban Board</h1>
            <p className="text-xs text-slate-500 mt-0.5">จัดการตั๋วปัญหาด้วยระบบ Kanban</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
        >
          <RefreshCw size={14} />
          รีเฟรช
        </button>
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
            <div key={col.key} className="flex flex-col gap-3">
              {/* Column header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{col.emoji}</span>
                  <span className="font-bold text-sm text-slate-700">{col.label}</span>
                </div>
                <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 shadow-sm">
                  {colTickets.length}
                </span>
              </div>

              {/* Ticket cards */}
              <div className="flex flex-col gap-3 min-h-[200px]">
                {colTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                    <span className="text-2xl mb-2">📭</span>
                    <p className="text-xs font-medium">ไม่มีตั๋วในคอลัมน์นี้</p>
                  </div>
                ) : (
                  colTickets.map(ticket => (
                    <div key={ticket.problem_id}>
                      <TicketCard
                        ticket={ticket}
                        onQuarantine={handleQuarantine}
                        onForward={() => setForwardTarget(ticket)}
                        onViewDetail={() => handleOpenMerge(ticket)}
                      />
                      {/* Move to column buttons */}
                      <div className="flex gap-1 mt-1 px-1">
                        {otherStatuses.map(other => (
                          <button
                            key={other.key}
                            onClick={() => handleMoveStatus(ticket, other.key)}
                            className="flex-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg py-1 hover:bg-slate-50 transition-colors"
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

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-800 text-white text-sm font-semibold rounded-2xl shadow-xl animate-[fadeIn_0.2s_ease]">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
