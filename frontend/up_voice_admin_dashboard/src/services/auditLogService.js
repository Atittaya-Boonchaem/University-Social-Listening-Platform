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

/**
 * Fetch IDS & WAF security alerts.
 */
export async function fetchSecurityAlerts(limit = 100) {
  const res = await api.get('/audit/security-alerts', { params: { limit } });
  return res.data?.data || { waf_alerts: [], brute_force_locked_targets: [], total_waf_blocks: 0 };
}

/**
 * Fetch overall security engine status.
 */
export async function fetchSecurityStatus() {
  const res = await api.get('/auth/security-status');
  return res.data?.data || null;
}

