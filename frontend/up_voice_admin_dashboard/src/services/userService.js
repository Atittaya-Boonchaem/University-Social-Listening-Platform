// src/services/userService.js
import api from './api';

/**
 * Fetch all users (Super Admin or Staff required).
 * Returns array of user objects.
 */
export async function fetchUsers() {
  const res = await api.get('/users/list');
  return res.data?.data?.items || res.data?.data || [];
}

export async function fetchUserById(userId) {
  const res = await api.get(`/users/${userId}`);
  return res.data?.data || null;
}

/**
 * Ban a user by ID.
 * @param {number} userId - The user ID to ban.
 * @param {string} reason - The reason for banning.
 */
export async function banUser(userId, reason = 'Banned by Super Admin') {
  const res = await api.post(`/users/${userId}/ban`, { reason });
  return res.data;
}

/**
 * Unban a user by ID.
 * @param {number} userId - The user ID to unban.
 */
export async function unbanUser(userId) {
  const res = await api.patch(`/users/${userId}/unban`);
  return res.data;
}
