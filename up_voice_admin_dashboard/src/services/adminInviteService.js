// src/services/adminInviteService.js
import api from './api';
import { fetchUsers } from './userService';

/**
 * Fetch all categories.
 */
export async function fetchCategories() {
  const res = await api.get('/problems/categories');
  return res.data?.data?.items || [];
}

/**
 * Fetch all valid users to invite (staff, students, public).
 */
export async function fetchEligibleUsers() {
  const allUsers = await fetchUsers();
  return allUsers.filter((u) => ['student', 'staff', 'public'].includes(u.role));
}

/**
 * Fetch active category admins.
 */
export async function fetchCategoryAdmins() {
  const res = await api.get('/users/category-admins');
  return res.data?.data?.items || [];
}

/**
 * Assign a user as a Category Admin.
 * @param {number} userId - The user ID
 * @param {number} categoryId - The category ID
 */
export async function assignCategoryAdmin(userId, categoryId) {
  const res = await api.post(`/users/${userId}/assign/category-admin?category_id=${categoryId}`);
  return res.data;
}

/**
 * Revoke Category Admin access for a user.
 * @param {number} userId - The user ID to revoke
 */
export async function revokeCategoryAdmin(userId) {
  const res = await api.patch(`/users/${userId}/revoke/category-admin`);
  return res.data;
}

/**
 * Send an invite.
 * @param {Object} payload - { email, role, category_id }
 */
export async function sendInvite(payload) {
  const res = await api.post('/users/invites', payload);
  return res.data;
}

/**
 * Fetch pending invites.
 */
export async function fetchPendingInvites() {
  const res = await api.get('/users/invites');
  return res.data?.data?.items || [];
}

/**
 * Revoke a pending invite.
 * @param {number} inviteId - The ID of the invite to delete
 */
export async function revokePendingInvite(inviteId) {
  const res = await api.delete(`/users/invites/${inviteId}`);
  return res.data;
}

/**
 * Accept an invite (register).
 * @param {Object} payload - { token, first_name, last_name, password }
 */
export async function acceptInvite(payload) {
  const res = await api.post('/users/register-invite', payload);
  return res.data;
}
