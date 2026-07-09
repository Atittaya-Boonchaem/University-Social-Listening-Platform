// src/services/categoryService.js
import api from './api';

/**
 * Fetch all active problem categories.
 * GET /api/v1/problems/categories
 */
export async function fetchCategories() {
  const res = await api.get('/problems/categories');
  return res.data?.data?.items || [];
}

/**
 * Create a new problem category.
 * POST /api/v1/problems/categories
 * @param {{ category_name: string, description: string, requires_location_privacy: boolean }} payload
 */
export async function createCategory(payload) {
  const res = await api.post('/problems/categories', payload);
  return res.data?.data?.item || null;
}

/**
 * Update an existing problem category.
 * PUT /api/v1/problems/categories/:id
 * @param {number} categoryId
 * @param {{ category_name?: string, description?: string, requires_location_privacy?: boolean }} payload
 */
export async function updateCategory(categoryId, payload) {
  const res = await api.put(`/problems/categories/${categoryId}`, payload);
  return res.data?.data?.item || null;
}

/**
 * Delete a problem category.
 * DELETE /api/v1/problems/categories/:id
 * @param {number} categoryId
 */
export async function deleteCategory(categoryId) {
  const res = await api.delete(`/problems/categories/${categoryId}`);
  return res.data;
}
