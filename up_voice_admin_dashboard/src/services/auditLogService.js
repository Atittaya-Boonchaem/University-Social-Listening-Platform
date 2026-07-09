// src/services/auditLogService.js
import api from './api';

/**
 * Fetch recent user login logs.
 */
export async function fetchLoginLogs(limit = 100) {
  const res = await api.get('/audit/login-logs', { params: { limit } });
  return res.data?.data?.items || [];
}

/**
 * Fetch recent system audit logs (admin actions).
 */
export async function fetchSystemLogs(limit = 100) {
  const res = await api.get('/audit/system-logs', { params: { limit } });
  return res.data?.data?.items || [];
}
