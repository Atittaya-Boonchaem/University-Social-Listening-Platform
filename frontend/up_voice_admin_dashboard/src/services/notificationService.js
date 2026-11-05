// src/services/notificationService.js
import api from './api';

/**
 * Fetch paginated list of notifications.
 * @param {Object} params
 * @param {boolean} [params.unreadOnly=false]
 * @param {string} [params.notificationType]
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 */
export async function fetchNotifications({ unreadOnly = false, notificationType = null, page = 1, pageSize = 20 } = {}) {
  try {
    const params = {
      unread_only: unreadOnly,
      page,
      page_size: pageSize,
    };
    if (notificationType && notificationType !== 'ALL') {
      params.notification_type = notificationType;
    }
    const res = await api.get('/notifications', { params });
    return res.data;
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return {
      success: false,
      total: 0,
      unread_count: 0,
      data: [],
    };
  }
}

/**
 * Fetch quick unread notifications count for badge.
 */
export async function fetchUnreadCount() {
  try {
    const res = await api.get('/notifications/unread-count');
    return res.data?.unread_count ?? 0;
  } catch (err) {
    console.error('Error fetching unread count:', err);
    return 0;
  }
}

/**
 * Mark a single notification as read.
 * @param {number} notificationId
 */
export async function markAsRead(notificationId) {
  try {
    const res = await api.patch(`/notifications/${notificationId}/read`);
    return res.data;
  } catch (err) {
    console.error('Error marking notification read:', err);
    return { success: false };
  }
}

/**
 * Mark all user notifications as read.
 */
export async function markAllAsRead() {
  try {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    return { success: false };
  }
}

/**
 * Delete a notification.
 * @param {number} notificationId
 */
export async function deleteNotification(notificationId) {
  try {
    const res = await api.delete(`/notifications/${notificationId}`);
    return res.data;
  } catch (err) {
    console.error('Error deleting notification:', err);
    return { success: false };
  }
}

