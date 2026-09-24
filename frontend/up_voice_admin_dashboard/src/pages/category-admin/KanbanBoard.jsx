// src/pages/category-admin/KanbanBoard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import TicketDetailModal from '../../components/TicketDetailModal';
import MergeModal from '../../components/MergeModal';
import ForwardModal from '../../components/ForwardModal';
import { fetchProblems, updateProblemStatus } from '../../services/problemService';
import { quarantineTicket, mergeDuplicate, unmergeDuplicate, forwardTicket } from '../../services/ticketService';
import { fetchCategories } from '../../services/categoryService';
import { getAnonymousAuthor } from '../../utils/authorUtils';

// ── 4-Stage Kanban Columns ───────────────────────────────────────
const KANBAN_COLUMNS = [
  {
    key: 'PENDING_REVIEW',
    label: '1. รอรับเรื่อง / คัดกรอง',
    shortLabel: 'รอรับเรื่อง',
    emoji: '📥',
    headerBg: 'bg-[#ffdad6]/40 border-[#ba1a1a]/30 text-[#93000a]',
    pillBg: 'bg-[#ffdad6] text-[#93000a]',
    accentColor: '#ba1a1a',
    isNew: true
  },
  {
    key: 'OPEN',
    label: '2. รอดำเนินการ',
    shortLabel: 'รอดำเนินการ',
    emoji: '⏳',
    headerBg: 'bg-[#e2e7ff] border-[#340866]/20 text-[#340866]',
    pillBg: 'bg-[#e2e7ff] text-[#340866]',
    accentColor: '#4b267d',
  },
  {
    key: 'IN_PROGRESS',
    label: '3. กำลังดำเนินการ',
    shortLabel: 'กำลังดำเนินการ',
    emoji: '⚙️',
    headerBg: 'bg-[#fed65b]/30 border-[#745c00]/30 text-[#745c00]',
    pillBg: 'bg-[#fed65b] text-[#745c00]',
    accentColor: '#d97706',
  },
  {
    key: 'RESOLVED',
    label: '4. ดำเนินการเสร็จสิ้น',
    shortLabel: 'เสร็จสิ้น',
    emoji: '✅',
    headerBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    pillBg: 'bg-emerald-100 text-emerald-800',
    accentColor: '#059669',
  },
];

export default function KanbanBoard() {
  // User & Department state
  const [assignedCatName, setAssignedCatName] = useState('');
  const [assignedCatId, setAssignedCatId] = useState(null);
  const [userRole, setUserRole] = useState('');

  // Data state
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // URL Search Parameters
  const [searchParams] = useSearchParams();

  // View state: 'table' or 'kanban'
  const [viewMode, setViewMode] = useState(() => searchParams.get('view') || 'table');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [groupFilter, setGroupFilter] = useState(() => searchParams.get('group') || 'all');
  const [zoneFilter, setZoneFilter] = useState(() => searchParams.get('location') || searchParams.get('zone') || 'all');

  // Sync filters if URL search params change
  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatusFilter(s);
    const loc = searchParams.get('location') || searchParams.get('zone');
    if (loc) setZoneFilter(loc);
    const q = searchParams.get('search');
    if (q) setSearchQuery(q);
    const g = searchParams.get('group');
    if (g) setGroupFilter(g);
    const v = searchParams.get('view');
    if (v) setViewMode(v);
  }, [searchParams]);

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  // Table pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [detailTarget, setDetailTarget] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);

  // Drag and drop state
  const [draggedTicketId, setDraggedTicketId] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // 1. Fetch user info to scope data to the real assigned category
  useEffect(() => {
    api.get('/users/me')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          const u = res.data.data;
          if (u.category_name) setAssignedCatName(u.category_name);
          if (u.category_id) setAssignedCatId(u.category_id);
          if (u.role) setUserRole(u.role);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Load live data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pubRes, intRes, catsData] = await Promise.all([
        fetchProblems({ page_size: 150, visibility_name: 'public' }, true),
        fetchProblems({ page_size: 150, visibility_name: 'internal' }, true),
        fetchCategories(),
      ]);

      const merged = [...(pubRes.items || []), ...(intRes.items || [])];
      const unique = Array.from(new Map(merged.map(t => [t.problem_id, t])).values());

      // Format ticket_id if not present
      const formatted = unique.map(t => {
        let tid = t.ticket_id;
        if (!tid) {
          const yr = t.created_at ? new Date(t.created_at).getFullYear().toString().slice(-2) : '68';
          const pfx = t.ticket_prefix || 'UP';
          tid = `#${pfx}-${yr}-${String(t.problem_id).padStart(4, '0')}`;
        }
        return {
          ...t,
          formatted_ticket_id: tid
        };
      });

      setTickets(formatted);
      setCategories(catsData || []);
    } catch (e) {
      console.error(e);
      setError('ไม่สามารถโหลดข้อมูลคำร้องได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 3. Scope tickets to real assigned category of this Category Admin
  const scopedTickets = useMemo(() => {
    if (userRole === 'category_admin' && assignedCatId) {
      return tickets.filter(t => t.category_id === assignedCatId);
    }
    // If assignedCatName is available and matches a category
    if (userRole === 'category_admin' && assignedCatName) {
      return tickets.filter(t => t.category_name === assignedCatName);
    }
    return tickets;
  }, [tickets, userRole, assignedCatId, assignedCatName]);

  // 4. Derived duplicate clusters and parent map (Scoped to real data)
  const { parentTickets, duplicatesMap } = useMemo(() => {
    const dupsMap = {};
    const parents = [];

    scopedTickets.forEach(t => {
      if (t.parent_problem_id) {
        if (!dupsMap[t.parent_problem_id]) {
          dupsMap[t.parent_problem_id] = [];
        }
        dupsMap[t.parent_problem_id].push(t);
      } else {
        parents.push(t);
      }
    });

    return { parentTickets: parents, duplicatesMap: dupsMap };
  }, [scopedTickets]);

  // 5. Status Metrics Counts (Scoped to real category data)
  const metrics = useMemo(() => {
    let pending = 0;
    let open = 0;
    let progress = 0;
    let resolved = 0;
    let mergedCount = 0;
    let mergedPostsTotal = 0;
    let transferred = 0;

    parentTickets.forEach(t => {
      if (t.is_hidden) {
        transferred++;
      }

      const st = (t.status_name || '').toUpperCase();
      if (st === 'PENDING_REVIEW' || st === 'PENDING' || st === 'NEW') {
        pending++;
      } else if (st === 'OPEN') {
        open++;
      } else if (st === 'IN_PROGRESS') {
        progress++;
      } else if (st === 'RESOLVED' || st === 'CLOSED') {
        resolved++;
      }

      const dups = duplicatesMap[t.problem_id] || [];
      if (dups.length > 0) {
        mergedCount++;
        mergedPostsTotal += 1 + dups.length;
      }
    });

    return {
      pending,
      open,
      progress,
      resolved,
      total: parentTickets.length,
      mergedCount,
      mergedPostsTotal,
      transferred
    };
  }, [parentTickets, duplicatesMap]);

  // 5b. Dynamic Real Locations from the actual tickets in database
  const availableLocations = useMemo(() => {
    const map = new Map();
    parentTickets.forEach(t => {
      const loc = (t.building_name || t.location || 'ไม่ระบุสถานที่').trim();
      map.set(loc, (map.get(loc) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [parentTickets]);

  // 6. Filtered Tickets for Table and Kanban
  const filteredTickets = useMemo(() => {
    return parentTickets.filter(ticket => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const authorInfo = getAnonymousAuthor(ticket);
        const text = [
          ticket.formatted_ticket_id,
          ticket.title,
          ticket.description,
          ticket.building_name,
          ticket.location,
          authorInfo.name,
          ticket.category_name
        ].filter(Boolean).join(' ').toLowerCase();

        if (!text.includes(q)) return false;
      }

      // 2. Status Filter
      const st = (ticket.status_name || '').toUpperCase();
      if (statusFilter === 'pending') {
        if (st !== 'PENDING_REVIEW' && st !== 'PENDING' && st !== 'NEW') return false;
      } else if (statusFilter === 'open') {
        if (st !== 'OPEN') return false;
      } else if (statusFilter === 'in-progress') {
        if (st !== 'IN_PROGRESS') return false;
      } else if (statusFilter === 'resolved') {
        if (st !== 'RESOLVED' && st !== 'CLOSED') return false;
      }

      // 3. Merged / Transferred Filter (No AI reference)
      const dups = duplicatesMap[ticket.problem_id] || [];
      if (groupFilter === 'merged') {
        if (dups.length === 0) return false;
      } else if (groupFilter === 'transferred') {
        if (!ticket.is_hidden && !ticket.flagged_reason) return false;
      }

      // 4. Real Location / Building Filter
      if (zoneFilter !== 'all') {
        const loc = (ticket.building_name || ticket.location || 'ไม่ระบุสถานที่').trim();
        if (loc !== zoneFilter && !loc.includes(zoneFilter) && !zoneFilter.includes(loc)) return false;
      }

      return true;
    });
  }, [parentTickets, duplicatesMap, searchQuery, statusFilter, groupFilter, zoneFilter]);

  // Paginated Tickets for Table View
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;

  // Selection handlers
  const isAllSelected = paginatedTickets.length > 0 && paginatedTickets.every(t => selectedIds.has(t.problem_id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedIds);
      paginatedTickets.forEach(t => next.delete(t.problem_id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paginatedTickets.forEach(t => next.add(t.problem_id));
      setSelectedIds(next);
    }
  };

  const handleToggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Status Change Handler (Single)
  const handleMoveStatus = async (ticket, newStatus) => {
    const oldStatus = (ticket.status_name || '').toUpperCase();
    if (oldStatus === newStatus) return;

    try {
      await updateProblemStatus(ticket.problem_id, newStatus);
      setTickets(prev => prev.map(t =>
        t.problem_id === ticket.problem_id ? { ...t, status_name: newStatus } : t
      ));

      const statusLabels = {
        PENDING_REVIEW: '📥 รอรับเรื่อง/คัดกรอง',
        OPEN: '🔴 รอดำเนินการ (เผยแพร่แล้ว)',
        IN_PROGRESS: '🟡 กำลังดำเนินการ',
        RESOLVED: '🟢 ดำเนินการเสร็จสิ้น'
      };

      if (oldStatus === 'PENDING_REVIEW' && newStatus === 'OPEN') {
        showToast(`✨ อนุมัติรับเรื่องคำร้อง ${ticket.formatted_ticket_id} เรียบร้อยแล้ว (เผยแพร่สู่สาธารณะ)`);
      } else {
        showToast(`⚡ อัปเดตสถานะ ${ticket.formatted_ticket_id} เป็น "${statusLabels[newStatus] || newStatus}"`);
      }
    } catch (e) {
      showToast(`❌ อัปเดตสถานะไม่สำเร็จ: ${e.message}`);
    }
  };

  // Bulk Status Change
  const handleBulkChangeStatus = async (targetStatus, actionLabel) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setActionLoading(true);

    try {
      await Promise.all(ids.map(id => updateProblemStatus(id, targetStatus).catch(() => null)));
      setTickets(prev => prev.map(t =>
        ids.includes(t.problem_id) ? { ...t, status_name: targetStatus } : t
      ));
      showToast(`✅ ${actionLabel} สำเร็จทั้งหมด ${ids.length} รายการ`);
      setSelectedIds(new Set());
      setBulkMenuOpen(false);
    } catch (e) {
      showToast(`❌ ดำเนินการไม่สำเร็จ: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Drag and Drop handlers for Kanban
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

  // Merge & Forward Modals
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

  // Bulk Merge action from Selection Bar
  const handleBulkMerge = () => {
    if (selectedIds.size === 0) return;
    const selectedList = tickets.filter(t => selectedIds.has(t.problem_id));
    if (selectedList.length === 1) {
      handleOpenMerge(selectedList[0]);
      return;
    }

    // 2 or more selected items: first is parent, others are duplicates
    const parentTicket = selectedList[0];
    const duplicates = selectedList.slice(1).map(t => ({
      ...t,
      confidencePercent: 99,
      matchReason: 'รายการที่เลือกพร้อมกันจากตาราง'
    }));

    setMergeTarget({
      parentTicket,
      duplicates,
      isBulk: true
    });
  };

  // Bulk Forward action from Selection Bar
  const handleBulkForward = () => {
    if (selectedIds.size === 0) return;
    const selectedList = tickets.filter(t => selectedIds.has(t.problem_id));
    setForwardTarget(selectedList[0]);
  };

  // Helper to extract secondary / related categories for multi-department analysis
  const getRelatedCategories = (ticket) => {
    const primary = (ticket.category_name || assignedCatName || '').trim().toLowerCase();
    const result = [];

    // 1. From multi_categories in llm_analysis
    const multi = ticket.llm_analysis?.multi_categories || [];
    multi.forEach(m => {
      const name = (m.category_name || m.name || '').trim();
      if (name && name.toLowerCase() !== primary && !result.includes(name)) {
        result.push(name);
      }
    });

    // 2. From all_category_scores with high confidence
    const topScores = ticket.llm_analysis?.all_category_scores || [];
    topScores
      .filter(s => (s.confidence >= 0.20 || s.score >= 0.20 || s.score_percent >= 20) && s.category_name)
      .forEach(s => {
        const name = s.category_name.trim();
        if (name && name.toLowerCase() !== primary && !result.includes(name)) {
          result.push(name);
        }
      });

    // 3. Fallback semantic heuristics based on title / description / keywords
    if (result.length === 0) {
      const text = `${ticket.title || ''} ${ticket.description || ''}`.toLowerCase();
      if (text.includes('ไฟ') || text.includes('สว่าง') || text.includes('ทางเท้า') || text.includes('ถนน') || text.includes('จราจร')) {
        const cat = 'การเดินทางและจราจร';
        if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
      }
      if (text.includes('ท่อ') || text.includes('ระบายน้ำ') || text.includes('ขยะ') || text.includes('กลิ่น') || text.includes('สุนัข') || text.includes('หมา')) {
        const cat = 'ระบบระบายน้ำ';
        if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
      }
      if (text.includes('เน็ต') || text.includes('wifi') || text.includes('สแกน') || text.includes('กล้อง') || text.includes('access control') || text.includes('คอม')) {
        const cat = 'ระบบรักษาความปลอดภัย';
        if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
      }
      if (text.includes('แอร์') || text.includes('พัดลม') || text.includes('ห้องเรียน') || text.includes('ลิฟต์') || text.includes('ประตู')) {
        const cat = 'อาคารเรียนรวม';
        if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
      }
      if (text.includes('อาหาร') || text.includes('น้ำดื่ม') || text.includes('ห้องน้ำ') || text.includes('ส้วม') || text.includes('ก๊อก')) {
        const cat = 'ศูนย์อาหาร';
        if (cat.toLowerCase() !== primary && !result.includes(cat)) result.push(cat);
      }
    }

    return result.filter(c => c.toLowerCase() !== primary);
  };

  const handleMerge = async (childIds) => {
    if (!mergeTarget) return;
    const ids = Array.isArray(childIds) ? childIds : [childIds];
    if (ids.length === 0) return;

    setActionLoading(true);
    try {
      for (const id of ids) {
        await mergeDuplicate(mergeTarget.parentTicket.problem_id, id);
      }
      setTickets(prev => prev.map(t =>
        ids.includes(t.problem_id)
          ? { ...t, is_hidden: true, parent_problem_id: mergeTarget.parentTicket.problem_id, status_name: 'CLOSED' }
          : t
      ));
      // Remove merged children from selectedIds if present
      setSelectedIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      showToast(`✅ รวมตั๋ว ${ids.length} รายการเข้ากลุ่มสำเร็จ`);
      setMergeTarget(null);
    } catch (e) {
      showToast(`❌ รวมตั๋วไม่สำเร็จ: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Unmerge child ticket from cluster
  const handleUnmergeChild = async (childId) => {
    setActionLoading(true);
    try {
      await unmergeDuplicate(childId);
      setTickets(prev => prev.map(t =>
        t.problem_id === childId
          ? { ...t, parent_problem_id: null, is_hidden: false, status_name: 'OPEN' }
          : t
      ));
      if (detailTarget) {
        const nextDups = (detailTarget.duplicates || []).filter(d => d.problem_id !== childId);
        setDetailTarget(prev => ({ ...prev, duplicates: nextDups }));
      }
      showToast(`✅ แยกตั๋ว #${childId} ออกจากกลุ่มสำเร็จ`);
    } catch (e) {
      showToast(`❌ แยกตั๋วไม่สำเร็จ: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Unmerge all tickets in cluster
  const handleUnmergeAll = async (duplicates) => {
    if (!duplicates || duplicates.length === 0) return;
    setActionLoading(true);
    try {
      await Promise.all(duplicates.map(d => unmergeDuplicate(d.problem_id).catch(() => null)));
      const unmergedIds = duplicates.map(d => d.problem_id);
      setTickets(prev => prev.map(t =>
        unmergedIds.includes(t.problem_id)
          ? { ...t, parent_problem_id: null, is_hidden: false, status_name: 'OPEN' }
          : t
      ));
      if (detailTarget) {
        setDetailTarget(prev => ({ ...prev, duplicates: [] }));
      }
      showToast(`✅ แยกกลุ่มคำร้องทั้งหมด (${duplicates.length} รายการ) สำเร็จ`);
    } catch (e) {
      showToast(`❌ แยกกลุ่มไม่สำเร็จ: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForward = async (ticketOrCatId, maybeCatId) => {
    const newCategoryId = typeof ticketOrCatId === 'object' ? maybeCatId : ticketOrCatId;
    if (!forwardTarget || !newCategoryId) return;
    setActionLoading(true);
    try {
      const idsToForward = selectedIds.size > 1 && selectedIds.has(forwardTarget.problem_id)
        ? Array.from(selectedIds)
        : [forwardTarget.problem_id];

      await Promise.all(idsToForward.map(id => forwardTicket(id, newCategoryId).catch(() => null)));
      const targetCat = categories.find(c => c.category_id === Number(newCategoryId));
      const targetCatName = targetCat?.category_name || 'หมวดหมู่ใหม่';

      setTickets(prev => prev.map(t =>
        idsToForward.includes(t.problem_id)
          ? { ...t, category_id: Number(newCategoryId), category_name: targetCatName }
          : t
      ));

      if (idsToForward.length > 1) {
        showToast(`✅ โอนย้ายคำร้อง ${idsToForward.length} รายการไปยัง "${targetCatName}" สำเร็จ`);
        setSelectedIds(new Set());
      } else {
        showToast(`🔄 โอนย้ายคำร้องไปยัง "${targetCatName}" เรียบร้อยแล้ว`);
      }
      setForwardTarget(null);
      setDetailTarget(null);
    } catch (e) {
      showToast(`❌ โอนย้ายไม่สำเร็จ: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const listToExport = selectedIds.size > 0
      ? filteredTickets.filter(t => selectedIds.has(t.problem_id))
      : filteredTickets;

    const headers = ['Ticket ID', 'Title', 'Status', 'Author', 'Location', 'Category', 'Created At'];
    const rows = listToExport.map(t => [
      `"${t.formatted_ticket_id || t.problem_id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.status_name || ''}"`,
      `"${getAnonymousAuthor(t).name}"`,
      `"${t.building_name || t.location || 'ม.พะเยา'}"`,
      `"${t.category_name || ''}"`,
      `"${t.created_at ? new Date(t.created_at).toLocaleString('th-TH') : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `up_voice_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 ส่งออกไฟล์ CSV จำนวน ${listToExport.length} รายการเรียบร้อยแล้ว`);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#faf8ff] text-[#131b2e] pb-24 text-left font-sans">
      {/* ── Ambient Glow Background ── */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#340866]/5 blur-3xl pointer-events-none" />
        <div className="absolute -top-24 right-1/4 w-80 h-80 rounded-full bg-[#fed65b]/20 blur-3xl pointer-events-none" />

        {/* ── Page Title & Metrics Bar ── */}
        <div className="px-6 md:px-10 py-6 md:py-8 flex flex-col gap-6">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[#4a4450] mb-1.5 flex-wrap">
                <span className="text-xs uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#340866] text-white font-bold shadow-xs">
                  {assignedCatName || 'อาคารและสิ่งอำนวยความสะดวก'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-[#4a4450]">แผงควบคุมแอดมินประจำหมวดหมู่</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-[#735c00]">UP Connect ระบบจัดการคำร้อง</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#131b2e] tracking-tight">
                รายการคำร้องทั้งหมด
              </h1>
              <p className="text-sm text-[#4a4450] mt-1">
                ศูนย์กลางตรวจคัดกรอง รับเรื่อง มอบหมายงานช่าง และติดตามความคืบหน้าทั่วทั้งมหาวิทยาลัยพะเยา
              </p>
            </div>

            {/* Quick Status Metrics Bar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Metric 1: Pending Review */}
              <div
                onClick={() => setStatusFilter(prev => prev === 'pending' ? 'all' : 'pending')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white shadow-xs border-l-4 border-[#ba1a1a] cursor-pointer transition-all ${
                  statusFilter === 'pending' ? 'ring-2 ring-[#ba1a1a]/30 bg-rose-50/20' : 'hover:shadow-md'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#4a4450] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping" />
                    รอรับเรื่อง (ใหม่)
                  </span>
                  <span className="text-xl font-black text-[#ba1a1a] font-mono leading-none mt-1">
                    {metrics.pending}
                  </span>
                </div>
              </div>

              {/* Metric 2: Open */}
              <div
                onClick={() => setStatusFilter(prev => prev === 'open' ? 'all' : 'open')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white shadow-xs border-l-4 border-indigo-500 cursor-pointer transition-all ${
                  statusFilter === 'open' ? 'ring-2 ring-indigo-500/30 bg-indigo-50/20' : 'hover:shadow-md'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#4a4450] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    รอดำเนินการ
                  </span>
                  <span className="text-xl font-black text-indigo-600 font-mono leading-none mt-1">
                    {metrics.open}
                  </span>
                </div>
              </div>

              {/* Metric 3: In Progress */}
              <div
                onClick={() => setStatusFilter(prev => prev === 'in-progress' ? 'all' : 'in-progress')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white shadow-xs border-l-4 border-[#d97706] cursor-pointer transition-all ${
                  statusFilter === 'in-progress' ? 'ring-2 ring-amber-500/30 bg-amber-50/20' : 'hover:shadow-md'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#4a4450] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#d97706] animate-pulse" />
                    กำลังดำเนินการ
                  </span>
                  <span className="text-xl font-black text-[#d97706] font-mono leading-none mt-1">
                    {metrics.progress}
                  </span>
                </div>
              </div>

              {/* Metric 4: Resolved */}
              <div
                onClick={() => setStatusFilter(prev => prev === 'resolved' ? 'all' : 'resolved')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white shadow-xs border-l-4 border-[#340866] cursor-pointer transition-all ${
                  statusFilter === 'resolved' ? 'ring-2 ring-[#340866]/30 bg-purple-50/20' : 'hover:shadow-md'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#4a4450] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#340866]" />
                    ดำเนินการเสร็จสิ้น
                  </span>
                  <span className="text-xl font-black text-[#340866] font-mono leading-none mt-1">
                    {metrics.resolved}
                  </span>
                </div>
              </div>

              {/* Metric 5: Merged Duplicate Clusters (Clean, No AI Word) */}
              <div
                onClick={() => setGroupFilter(prev => prev === 'merged' ? 'all' : 'merged')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#fed65b]/20 shadow-xs border border-[#fed65b] cursor-pointer transition-all ${
                  groupFilter === 'merged' ? 'ring-2 ring-[#745c00]/30' : 'hover:shadow-md'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#745c00] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#745c00]">layers</span>
                    รวมกลุ่มปัญหาแล้ว
                  </span>
                  <span className="text-base font-black text-[#745c00] font-mono leading-none mt-1">
                    {metrics.mergedCount} กลุ่ม ({metrics.mergedPostsTotal} โพสต์)
                  </span>
                </div>
              </div>

              {/* Metric 6: Refresh */}
              <button
                onClick={loadData}
                className="w-10 h-10 rounded-xl bg-white border border-[#eaedff] text-[#340866] hover:bg-[#eaedff] flex items-center justify-center transition-colors shadow-xs"
                title="รีเฟรชข้อมูล"
              >
                <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
              </button>
            </div>
          </div>

          {/* ── Action & Filter Bar ── */}
          <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-[#eaedff] flex flex-col gap-4">
            {/* Search & View Switcher Row */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Live Smart Search */}
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a4450] text-[20px]">
                  manage_search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="ค้นหารหัสคำร้อง (#UP-68-...), หัวข้อปัญหา, ผู้แจ้ง, อาคารเรียน หรือชื่อช่าง..."
                  className="w-full h-11 pl-11 pr-10 rounded-xl bg-[#f2f3ff] text-sm text-[#131b2e] placeholder:text-[#7b7482] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4b267d] transition-all border border-transparent focus:border-[#4b267d]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>

              {/* View Switcher & Bulk Dispatch Trigger */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {/* View Mode Pills */}
                <div className="flex p-1 bg-[#eaedff] rounded-xl">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-[#340866] shadow-xs'
                        : 'text-[#4a4450] hover:text-[#131b2e]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">table_rows</span>
                    <span>ตารางรายการ</span>
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'kanban'
                        ? 'bg-white text-[#340866] shadow-xs'
                        : 'text-[#4a4450] hover:text-[#131b2e]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">view_kanban</span>
                    <span>กระดานคัมบัง</span>
                  </button>
                </div>

                {/* Bulk Actions Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setBulkMenuOpen(prev => !prev)}
                    className="flex items-center gap-2 h-11 px-4 rounded-xl bg-[#eaedff] hover:bg-[#dae2fd] text-[#131b2e] text-xs font-bold transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">library_add_check</span>
                    <span>การจัดการหลายรายการ</span>
                    <span className="material-symbols-outlined text-[18px]">expand_more</span>
                  </button>

                  {bulkMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl p-2 z-30 flex flex-col gap-1 border border-[#eaedff]">
                      <button
                        onClick={() => handleBulkChangeStatus('OPEN', 'รับเรื่องและอนุมัติ')}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#131b2e] hover:bg-[#f2f3ff] text-left transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[18px] text-emerald-600">done_all</span>
                        <span>รับเรื่อง & อนุมัติเผยแพร่ ({selectedIds.size})</span>
                      </button>
                      <button
                        onClick={() => handleBulkChangeStatus('IN_PROGRESS', 'ปรับสถานะเป็นกำลังดำเนินการ')}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#131b2e] hover:bg-[#f2f3ff] text-left transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[18px] text-amber-600">engineering</span>
                        <span>จ่ายงาน / กำลังดำเนินการ ({selectedIds.size})</span>
                      </button>
                      <button
                        onClick={() => handleBulkChangeStatus('RESOLVED', 'ปิดงานเสร็จสิ้น')}
                        disabled={selectedIds.size === 0}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#131b2e] hover:bg-[#f2f3ff] text-left transition-colors disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[18px] text-[#340866]">fact_check</span>
                        <span>เสร็จสิ้นทั้งหมด ({selectedIds.size})</span>
                      </button>
                      <div className="h-[1px] bg-slate-100 my-1" />
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#4a4450] hover:bg-[#f2f3ff] text-left transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-500">download</span>
                        <span>ส่งออกรายงาน (Excel / CSV)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Selects Mosaic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-[#eaedff]">
              {/* Select 1: Main 4-Stage Status */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#4a4450] uppercase tracking-wider">
                  สถานะหลัก 4 ลำดับ
                </label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 pl-3 pr-8 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] appearance-none focus:outline-none focus:ring-1 focus:ring-[#340866] cursor-pointer border border-[#eaedff]"
                  >
                    <option value="all">ทั้งหมด ({parentTickets.length} รายการ)</option>
                    <option value="pending">📥 1. รอรับเรื่อง / คัดกรอง ({metrics.pending} รายการ)</option>
                    <option value="open">🔴 2. รอดำเนินการ ({metrics.open} รายการ)</option>
                    <option value="in-progress">🟡 3. กำลังดำเนินการ ({metrics.progress} รายการ)</option>
                    <option value="resolved">🟢 4. ดำเนินการเสร็จสิ้น ({metrics.resolved} รายการ)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4450] text-[18px]">
                    unfold_more
                  </span>
                </div>
              </div>

              {/* Select 2: Grouping & Transferred (No AI Word) */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#4a4450] uppercase tracking-wider">
                  การจัดกลุ่มคำร้อง & โอนย้าย
                </label>
                <div className="relative">
                  <select
                    value={groupFilter}
                    onChange={(e) => {
                      setGroupFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 pl-3 pr-8 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] appearance-none focus:outline-none focus:ring-1 focus:ring-[#340866] cursor-pointer border border-[#eaedff]"
                  >
                    <option value="all">ทุกรูปแบบงาน</option>
                    <option value="merged">รวมกลุ่มโพสต์ซ้ำแล้ว ({metrics.mergedCount} กลุ่ม)</option>
                    <option value="transferred">มีหมายเหตุโอนย้าย / สถานะพิเศษ</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4450] text-[18px]">
                    unfold_more
                  </span>
                </div>
              </div>

              {/* Select 3: UP Zones */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#4a4450] uppercase tracking-wider">
                  สถานที่ / อาคารที่เกิดเหตุ
                </label>
                <div className="relative">
                  <select
                    value={zoneFilter}
                    onChange={(e) => {
                      setZoneFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-9 pl-3 pr-8 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] appearance-none focus:outline-none focus:ring-1 focus:ring-[#340866] cursor-pointer border border-[#eaedff]"
                  >
                    <option value="all">ทุกสถานที่ ({parentTickets.length} ปัญหา)</option>
                    {zoneFilter !== 'all' && !availableLocations.find(l => l.name === zoneFilter) && (
                      <option value={zoneFilter}>📍 {zoneFilter} (จากแดชบอร์ด)</option>
                    )}
                    {availableLocations.map((loc) => (
                      <option key={loc.name} value={loc.name}>
                        {loc.name} ({loc.count} ปัญหา)
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#4a4450] text-[18px]">
                    unfold_more
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Primary Content Area: Table / Kanban ── */}
      <div className="px-6 md:px-10 flex flex-col gap-4">
        {/* Active Filter Banner when filters are applied (e.g. from Dashboard or user selection) */}
        {(statusFilter !== 'all' || zoneFilter !== 'all' || searchQuery || groupFilter !== 'all') && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#eddcff]/70 to-[#e2e7ff]/70 border border-[#340866]/20 text-xs text-[#340866] font-medium flex-wrap shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              <span className="font-bold">กำลังกรองข้อมูล:</span>
              {statusFilter !== 'all' && (
                <span className="px-2.5 py-1 rounded-full bg-white text-[#131b2e] border border-[#eaedff] font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>สถานะ: {statusFilter === 'pending' ? 'รอรับเรื่อง' : statusFilter === 'open' ? 'รอดำเนินการ' : statusFilter === 'in-progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}</span>
                  <button onClick={() => setStatusFilter('all')} className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
                </span>
              )}
              {zoneFilter !== 'all' && (
                <span className="px-2.5 py-1 rounded-full bg-white text-[#131b2e] border border-[#eaedff] font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>📍 สถานที่: {zoneFilter}</span>
                  <button onClick={() => setZoneFilter('all')} className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
                </span>
              )}
              {searchQuery && (
                <span className="px-2.5 py-1 rounded-full bg-white text-[#131b2e] border border-[#eaedff] font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>🔍 ค้นหา: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
                </span>
              )}
              {groupFilter !== 'all' && (
                <span className="px-2.5 py-1 rounded-full bg-white text-[#131b2e] border border-[#eaedff] font-bold flex items-center gap-1.5 shadow-2xs">
                  <span>กลุ่ม: {groupFilter === 'merged' ? 'รวมกลุ่มแล้ว' : 'โอนย้าย'}</span>
                  <button onClick={() => setGroupFilter('all')} className="text-slate-400 hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setStatusFilter('all');
                setZoneFilter('all');
                setSearchQuery('');
                setGroupFilter('all');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-1 ml-auto"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
              <span>ล้างตัวกรองทั้งหมด ({filteredTickets.length} / {parentTickets.length})</span>
            </button>
          </div>
        )}

        {/* Floating Bulk Action Bar (When selectedIds.size > 0) */}
        {selectedIds.size > 0 && (
          <div className="items-center justify-between p-3.5 px-6 rounded-2xl bg-[#340866] text-white shadow-xl border border-[#4b267d] flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#ffe088]">check_circle</span>
                <span className="text-sm font-bold">
                  เลือกแล้ว{' '}
                  <span className="font-mono underline decoration-[#ffe088] text-[#ffe088] text-base">
                    {selectedIds.size}
                  </span>{' '}
                  รายการ
                </span>
              </div>
              <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />
              <span className="hidden md:inline text-xs text-purple-200">
                จัดการคำร้องหลายรายการพร้อมกันในคลิกเดียว
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleBulkChangeStatus('OPEN', 'รับเรื่องและอนุมัติ')}
                className="px-3.5 py-1.5 rounded-xl bg-white text-[#340866] text-xs font-bold hover:bg-purple-50 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-emerald-600">done_all</span>
                <span>รับเรื่องทั้งหมด</span>
              </button>

              <button
                onClick={() => handleBulkChangeStatus('IN_PROGRESS', 'กำลังดำเนินการ')}
                className="px-3.5 py-1.5 rounded-xl bg-[#fed65b] text-[#745c00] text-xs font-bold hover:bg-[#ffe088] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">engineering</span>
                <span>กำลังดำเนินการ</span>
              </button>

              <button
                onClick={handleBulkMerge}
                className="px-3.5 py-1.5 rounded-xl bg-[#4b267d] hover:bg-[#5c2f99] text-white text-xs font-bold border border-white/20 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="รวมโพสต์ที่ซ้ำซ้อนเข้าด้วยกัน"
              >
                <span className="material-symbols-outlined text-[16px]">merge</span>
                <span>รวมโพสต์</span>
              </button>

              <button
                onClick={handleBulkForward}
                className="px-3.5 py-1.5 rounded-xl bg-[#4b267d] hover:bg-[#5c2f99] text-white text-xs font-bold border border-white/20 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="โอนย้ายไปยังหมวดหมู่อื่น"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                <span>โอนย้ายหมวด</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>ยกเลิก</span>
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW 1: TABLE VIEW ── */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl shadow-sm border border-[#eaedff] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f2f3ff] text-[#4a4450] text-[11px] font-bold uppercase tracking-wider border-b border-[#eaedff]">
                  <tr>
                    <th className="py-3.5 pl-4 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-[#ccc3d2] text-[#340866] focus:ring-[#340866] w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3 font-semibold">รหัสคำร้อง / ผู้แจ้ง</th>
                    <th className="py-3.5 px-3 font-semibold min-w-[280px]">หัวข้อปัญหา & รายละเอียด</th>
                    <th className="py-3.5 px-3 font-semibold">สถานที่เกิดเหตุ</th>
                    <th className="py-3.5 px-3 font-semibold">หมวดหมู่ & วิเคราะห์</th>
                    <th className="py-3.5 px-3 font-semibold text-right pr-4">สถานะ</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eaedff] text-sm font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-[#4a4450]">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#340866] mb-2" />
                        <p className="text-xs">กำลังโหลดรายการคำร้องทั้งหมด...</p>
                      </td>
                    </tr>
                  ) : paginatedTickets.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center text-[#4a4450]">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
                        <p className="text-sm font-semibold">ไม่พบรายการคำร้องที่ตรงกับเงื่อนไขการค้นหา</p>
                        <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองด้านบน</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map((ticket) => {
                      const dups = duplicatesMap[ticket.problem_id] || [];
                      const isSelected = selectedIds.has(ticket.problem_id);
                      const st = (ticket.status_name || '').toUpperCase();
                      const isPending = st === 'PENDING_REVIEW' || st === 'PENDING' || st === 'NEW';
                      const isOpen = st === 'OPEN';
                      const isInProgress = st === 'IN_PROGRESS';
                      const isResolved = st === 'RESOLVED' || st === 'CLOSED';

                      return (
                        <tr
                          key={ticket.problem_id}
                          className={`hover:bg-[#f2f3ff]/60 transition-colors ${
                            isSelected ? 'bg-purple-50/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 pl-4 pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(ticket.problem_id)}
                              className="rounded border-[#ccc3d2] text-[#340866] focus:ring-[#340866] w-4 h-4 cursor-pointer"
                            />
                          </td>

                          {/* Ticket ID & Submitter */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-[#340866] text-xs">
                                {ticket.formatted_ticket_id}
                              </span>
                              {(() => {
                                const authorInfo = getAnonymousAuthor(ticket);
                                return (
                                  <span className="text-xs text-[#4a4450] mt-0.5 flex items-center gap-1 truncate max-w-[150px]" title={authorInfo.roleTitle}>
                                    <span className="material-symbols-outlined text-[14px] text-slate-400">
                                      {authorInfo.icon}
                                    </span>
                                    <span className="truncate">{authorInfo.name}</span>
                                    <span className="text-xs select-none">{authorInfo.emoji}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </td>

                          {/* Topic & Description */}
                          <td className="py-3.5 px-3">
                            <div 
                              onClick={() => setDetailTarget({ ...ticket, duplicates: dups })}
                              className="flex flex-col max-w-sm cursor-pointer group/title"
                              title="คลิกเพื่อดูรายละเอียดคำร้อง"
                            >
                              <span className="font-bold text-[#131b2e] group-hover/title:text-[#340866] line-clamp-1 text-sm transition-colors">
                                {ticket.title}
                              </span>
                              <span className="text-xs text-[#4a4450] line-clamp-1 mt-0.5">
                                {ticket.description}
                              </span>

                              {/* Badges: Duplicates & Attachments (No AI word) */}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {dups.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-[#fed65b]/40 text-[#745c00] font-mono text-[10px] font-bold">
                                    รวม {1 + dups.length} โพสต์ซ้ำ
                                  </span>
                                )}
                                {ticket.attachments?.length > 0 && (
                                  <span className="text-[11px] text-[#4a4450] flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[13px] text-slate-400">image</span>
                                    {ticket.attachments.length} ภาพแนบ
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 text-[#131b2e]">
                              <span className="material-symbols-outlined text-[#7b7482] text-[18px]">pin_drop</span>
                              <span className="text-xs font-semibold">
                                {ticket.building_name || ticket.location || 'มหาวิทยาลัยพะเยา'}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#4a4450] pl-6 block truncate max-w-[160px]">
                              {ticket.location_label || 'โซนมหาวิทยาลัย'}
                            </span>
                          </td>

                          {/* Category & Multi-Department Badges */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-col gap-1 max-w-[200px]">
                              <span className="text-xs font-bold text-[#b91c1c] truncate" title={ticket.category_name || assignedCatName}>
                                {ticket.category_name || assignedCatName || 'หมวดหมู่ทั่วไป'}
                              </span>

                              {(() => {
                                const related = getRelatedCategories(ticket);
                                if (related.length === 0) return null;
                                const firstBadge = related[0];
                                const restCount = related.length - 1;

                                return (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#eef1ff] border border-[#d8dfff] text-[10px] font-semibold text-[#3b4b8a] truncate max-w-[130px]"
                                      title={`หมวดหมู่ร่วม: ${firstBadge}`}
                                    >
                                      {firstBadge}
                                    </span>
                                    {restCount > 0 && (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#eef1ff] border border-[#d8dfff] text-[10px] font-bold text-[#3b4b8a]"
                                        title={`หมวดหมู่ร่วมอื่นๆ: ${related.slice(1).join(', ')}`}
                                      >
                                        +{restCount}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 pr-4 pl-3 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              {/* 1. Pending Review */}
                              {isPending && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#93000a] text-xs font-bold whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping" />
                                  รอรับเรื่อง
                                </span>
                              )}

                              {/* 2. Open / Waiting */}
                              {isOpen && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                                  รอดำเนินการ
                                </span>
                              )}

                              {/* 3. In Progress */}
                              {isInProgress && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fed65b]/30 text-[#745c00] text-xs font-bold whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full bg-[#745c00] animate-pulse" />
                                  กำลังดำเนินการ
                                </span>
                              )}

                              {/* 4. Resolved */}
                              {isResolved && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold whitespace-nowrap">
                                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                  เสร็จสิ้น
                                </span>
                              )}

                              {/* Detail Modal Trigger */}
                              <button
                                onClick={() => setDetailTarget({ ...ticket, duplicates: dups })}
                                className="p-1.5 rounded-lg hover:bg-[#eaedff] text-[#4a4450] hover:text-[#131b2e] transition-colors"
                                title="ดูรายละเอียดคำร้อง"
                              >
                                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Bar */}
            <div className="px-4 py-3.5 bg-white border-t border-[#eaedff] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#4a4450]">
                <span className="font-mono font-bold text-[#131b2e]">
                  {filteredTickets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
                  {Math.min(currentPage * pageSize, filteredTickets.length)}
                </span>
                <span>จากทั้งหมด</span>
                <span className="font-mono font-bold text-[#131b2e]">{filteredTickets.length}</span>
                <span>รายการคำร้อง</span>
                <span className="text-slate-300">|</span>
                <span>แถวต่อหน้า:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 rounded-lg bg-[#f2f3ff] text-xs font-bold text-[#131b2e] focus:outline-none border border-[#eaedff] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-[#f2f3ff] hover:text-[#131b2e] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-slate-300 text-xs">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all ${
                            currentPage === page
                              ? 'bg-[#340866] text-white shadow-xs'
                              : 'hover:bg-[#f2f3ff] text-[#131b2e]'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-[#f2f3ff] hover:text-[#131b2e] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: KANBAN BOARD VIEW ── */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {KANBAN_COLUMNS.map((col) => {
              const colTickets = filteredTickets.filter(t => {
                const st = (t.status_name || '').toUpperCase();
                if (col.key === 'PENDING_REVIEW') {
                  return st === 'PENDING_REVIEW' || st === 'PENDING' || st === 'NEW';
                }
                if (col.key === 'OPEN') {
                  return st === 'OPEN';
                }
                if (col.key === 'IN_PROGRESS') {
                  return st === 'IN_PROGRESS';
                }
                if (col.key === 'RESOLVED') {
                  return st === 'RESOLVED' || st === 'CLOSED';
                }
                return false;
              });

              return (
                <div
                  key={col.key}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className="bg-[#f2f3ff] rounded-2xl p-3.5 flex flex-col gap-3 min-h-[550px] border border-[#eaedff]"
                >
                  {/* Column Header */}
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border ${col.headerBg}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{col.emoji}</span>
                      <span className="font-bold text-xs">{col.label}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white text-[#131b2e] text-[11px] font-mono font-bold shadow-xs">
                      {colTickets.length}
                    </span>
                  </div>

                  {/* Ticket Cards List */}
                  <div className="flex flex-col gap-2.5 flex-1">
                    {colTickets.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-[#eaedff] rounded-xl text-slate-400">
                        <span className="text-3xl mb-1.5 opacity-60">📭</span>
                        <p className="text-xs font-semibold">ไม่มีตั๋วในหมวดหมู่นี้</p>
                      </div>
                    ) : (
                      colTickets.map(ticket => {
                        const dups = duplicatesMap[ticket.problem_id] || [];
                        return (
                          <div
                            key={ticket.problem_id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ticket.problem_id)}
                            className="p-3.5 rounded-xl bg-white shadow-xs border border-[#eaedff] hover:shadow-md transition-all flex flex-col gap-2 cursor-grab active:cursor-grabbing text-left"
                            style={{ borderLeftWidth: 4, borderLeftColor: col.accentColor }}
                          >
                            {/* Card Top: Ticket ID + Action Trigger */}
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#340866] text-xs">
                                {ticket.formatted_ticket_id}
                              </span>
                              <div className="flex items-center gap-1">
                                {dups.length > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#fed65b]/40 text-[#745c00] text-[10px] font-bold font-mono">
                                    +{dups.length} ซ้ำ
                                  </span>
                                )}
                                <button
                                  onClick={() => setDetailTarget({ ...ticket, duplicates: dups })}
                                  className="text-slate-400 hover:text-slate-700 p-0.5"
                                  title="ดูรายละเอียด"
                                >
                                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                </button>
                              </div>
                            </div>

                            {/* Card Title */}
                            <h3 
                              onClick={() => setDetailTarget({ ...ticket, duplicates: dups })}
                              className="font-bold text-sm text-[#131b2e] leading-snug line-clamp-2 hover:text-[#340866] cursor-pointer transition-colors"
                              title="คลิกเพื่อดูรายละเอียดคำร้อง"
                            >
                              {ticket.title}
                            </h3>

                            {/* Location */}
                            <p className="text-xs text-[#4a4450] flex items-center gap-1 line-clamp-1">
                              <span className="material-symbols-outlined text-[14px] text-slate-400">pin_drop</span>
                              <span>{ticket.building_name || ticket.location || 'ม.พะเยา'}</span>
                            </p>

                            {/* Quick Action Button on Card */}
                            {col.key === 'PENDING_REVIEW' && (
                              <button
                                onClick={() => handleMoveStatus(ticket, 'OPEN')}
                                className="mt-1 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                              >
                                <span className="material-symbols-outlined text-[15px]">done</span>
                                <span>อนุมัติรับเรื่อง (เผยแพร่)</span>
                              </button>
                            )}

                            {col.key === 'OPEN' && (
                              <button
                                onClick={() => handleMoveStatus(ticket, 'IN_PROGRESS')}
                                className="mt-1 w-full py-1.5 rounded-lg bg-[#340866] hover:bg-[#4b267d] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                              >
                                <span className="material-symbols-outlined text-[15px]">engineering</span>
                                <span>จ่ายงานช่าง</span>
                              </button>
                            )}

                            {col.key === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleMoveStatus(ticket, 'RESOLVED')}
                                className="mt-1 w-full py-1.5 rounded-lg bg-[#fed65b] hover:bg-[#ffe088] text-[#745c00] text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                              >
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                <span>บันทึกงานเสร็จสิ้น</span>
                              </button>
                            )}

                            {col.key === 'RESOLVED' && (
                              <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold pt-1 border-t border-slate-100">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">verified</span>
                                  ปิดงานเรียบร้อย
                                </span>
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  เสร็จสิ้น
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {detailTarget && (
        <TicketDetailModal
          ticket={detailTarget}
          onClose={() => setDetailTarget(null)}
          onStatusChange={handleMoveStatus}
          onForward={(t) => setForwardTarget(t)}
          onQuarantine={(t) => quarantineTicket(t.problem_id, !t.is_hidden)}
          onMerge={(t) => handleOpenMerge(t)}
          onUnmerge={handleUnmergeChild}
          onUnmergeAll={handleUnmergeAll}
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

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-[#131b2e] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
