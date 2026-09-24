// src/services/problemService.js
/**
 * Data-fetching functions for the Problems domain.
 *
 * All functions return the unwrapped `.data` payload from the backend's
 * StandardResponse envelope: { success, message, data, timestamp }
 */
import api from './api';

/**
 * Fetch pre-aggregated analytics:
 *  { total, by_status, by_category, by_role, geo_points }
 *
 * geo_points already excludes rows with null coordinates (filtered by backend).
 * is_deleted=false is also enforced by the backend.
 */
export async function fetchAnalytics() {
  const res = await api.get('/problems/analytics');
  return res.data?.data ?? null;
}

/**
 * Fetch the 30-day time-series breakdown:
 *  { series: [{ date, total, [category]: count }], categories: [...] }
 */
export async function fetchTimeSeries() {
  const res = await api.get('/problems/analytics/time-series');
  return res.data?.data ?? null;
}

// In-memory cache & in-flight request deduplication to prevent redundant network trips to cloud database
const problemsCache = new Map();
const inFlightRequests = new Map();
const CACHE_TTL_MS = 30000; // 30 seconds fresh cache

export function invalidateProblemsCache() {
  problemsCache.clear();
  inFlightRequests.clear();
}

/**
 * Fetch paginated problem list.
 * Automatically pages through all results if fetchAll=true.
 * Each item already has is_deleted filtered server-side.
 *
 * @param {object} params - { page, page_size, visibility_name, category_id, status_name }
 * @param {boolean} fetchAll - If true, accumulates all pages (max 3 pages / 300 items safety cap)
 */
export async function fetchProblems(params = {}, fetchAll = false) {
  const cacheKey = JSON.stringify({ params, fetchAll });

  // 1. Check fresh cache
  const cached = problemsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  // 2. Deduplicate concurrent in-flight requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      if (!fetchAll) {
        const res = await api.get('/problems/list', { params });
        const data = res.data?.data ?? { items: [], total: 0 };
        problemsCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }

      // Paginate through all results (safety cap: 3 pages × 100)
      let page = 1;
      const page_size = 100;
      let allItems = [];

      while (page <= 3) {
        const res = await api.get('/problems/list', {
          params: { ...params, page, page_size },
        }).catch(() => null);

        const payload = res?.data?.data;
        if (!payload) break;

        const items = payload.items || [];
        allItems = [...allItems, ...items];

        if (allItems.length >= payload.total || items.length === 0) break;
        page++;
      }

      const result = {
        items: allItems.filter((p) => !p.is_deleted),
        total: allItems.length,
      };

      problemsCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Derive geo points directly from a problem list.
 * Filters out entries with null/undefined latitude or longitude.
 * Maps to: { id, latitude, longitude, status_name, category_name, title }
 *
 * Use this as a fallback if /analytics does not return geo_points.
 */
export function deriveGeoPoints(problems = []) {
  return problems
    .filter((p) => p.latitude != null && p.longitude != null && !p.is_deleted)
    .map((p) => ({
      id:            p.problem_id,
      latitude:      parseFloat(p.latitude),
      longitude:     parseFloat(p.longitude),
      status:        p.status_name || 'UNKNOWN',
      category_name: p.category_name || '',
      title:         p.title || '',
    }));
}

/**
 * Derive a by-category summary from a raw problem list.
 * Returns [{ category_name, count }] sorted descending.
 */
export function deriveCategoryBreakdown(problems = []) {
  const map = {};
  for (const p of problems) {
    if (!p.is_deleted) {
      const key = p.category_name || 'Uncategorized';
      map[key] = (map[key] || 0) + 1;
    }
  }
  return Object.entries(map)
    .map(([category_name, count]) => ({ category_name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Derive a by-status summary from a raw problem list.
 * Returns { OPEN: n, IN_PROGRESS: n, RESOLVED: n, CLOSED: n }
 */
export function deriveStatusBreakdown(problems = []) {
  const map = {};
  for (const p of problems) {
    if (!p.is_deleted) {
      const key = p.status_name || 'UNKNOWN';
      map[key] = (map[key] || 0) + 1;
    }
  }
  return map;
}

/**
 * Fetch problems for a specific category (used by Category Admin Dashboard).
 * @param {object} params - { category_id, status_name, page, page_size }
 */
export async function fetchCategoryProblems(params = {}) {
  const res = await api.get('/problems/list', { params: { page_size: 100, ...params } });
  return res.data?.data ?? { items: [], total: 0 };
}

/**
 * Update the status of a problem.
 * PATCH /problems/:id/status?new_status_name=X&notes=Y
 * @param {number} problemId
 * @param {string} newStatusName  - 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
 * @param {string} [notes]        - optional admin note logged in status history
 */
export async function updateProblemStatus(problemId, newStatusName, notes = '') {
  invalidateProblemsCache();
  const res = await api.patch(`/problems/${problemId}/status`, null, {
    params: { new_status_name: newStatusName, ...(notes ? { notes } : {}) },
  });
  return res.data;
}

/**
 * Add an admin comment / response to a problem.
 * POST /problems/:id/comments
 * @param {number} problemId
 * @param {string} commentText
 */
export async function addProblemComment(problemId, commentText) {
  const res = await api.post(`/problems/${problemId}/comments`, { comment_text: commentText });
  return res.data?.data?.comment || null;
}

/**
 * Fetch comments for a problem.
 * GET /problems/:id/comments
 * @param {number} problemId
 */
export async function fetchProblemComments(problemId) {
  const res = await api.get(`/problems/${problemId}/comments`);
  return res.data?.data?.items || [];
}

