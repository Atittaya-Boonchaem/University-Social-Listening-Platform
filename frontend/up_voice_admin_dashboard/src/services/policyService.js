// src/services/policyService.js
import api from './api';

/**
 * Fetch all policies (Super Admin only - includes inactive)
 */
export async function fetchAllPolicies() {
  const res = await api.get('/policies/all');
  return res.data?.data?.items || [];
}

/**
 * Fetch active policies (Public / User client)
 */
export async function fetchActivePolicies(params = {}) {
  const res = await api.get('/policies', { params });
  return res.data?.data?.items || [];
}

/**
 * Create a new policy
 */
export async function createPolicy(payload) {
  const res = await api.post('/policies', payload);
  return res.data;
}

/**
 * Update an existing policy
 */
export async function updatePolicy(id, payload) {
  const res = await api.put(`/policies/${id}`, payload);
  return res.data;
}

/**
 * Toggle active state of a policy
 */
export async function togglePolicyActive(id) {
  const res = await api.patch(`/policies/${id}/toggle-active`);
  return res.data;
}

/**
 * Delete a policy
 */
export async function deletePolicy(id) {
  const res = await api.delete(`/policies/${id}`);
  return res.data;
}

