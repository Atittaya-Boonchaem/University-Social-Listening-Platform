// src/services/ticketService.js
/**
 * Ticket-specific API calls:
 *  - Forward (change category)
 *  - Quarantine (toggle is_hidden)
 *  - Merge duplicate
 *  - SLA breached list
 */
import api from './api';

/**
 * Forward a ticket to a different category.
 * PATCH /problems/:id  { category_id }
 */
export async function forwardTicket(problemId, newCategoryId) {
  const res = await api.patch(`/problems/${problemId}`, { category_id: newCategoryId });
  return res.data?.data?.problem ?? null;
}

/**
 * Toggle quarantine (hide/show) a problem.
 * PATCH /problems/:id  { is_hidden: true|false }
 */
export async function quarantineTicket(problemId, isHidden) {
  const res = await api.patch(`/problems/${problemId}`, { is_hidden: isHidden });
  return res.data?.data?.problem ?? null;
}

/**
 * Merge a duplicate ticket (child) into a parent ticket.
 * POST /problems/merge-duplicate?parent_id=X&child_id=Y
 */
export async function mergeDuplicate(parentId, childId) {
  const res = await api.post('/problems/merge-duplicate', null, {
    params: { parent_id: parentId, child_id: childId },
  });
  return res.data;
}

/**
 * Get top N SLA-breached (or at-risk) tickets.
 * GET /problems/analytics/sla-breached?limit=N
 */
export async function fetchSlaBreached(limit = 10) {
  const res = await api.get('/problems/analytics/sla-breached', { params: { limit } });
  return res.data?.data?.items ?? [];
}
