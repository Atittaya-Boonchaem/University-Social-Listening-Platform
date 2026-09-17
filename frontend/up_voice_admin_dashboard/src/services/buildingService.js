// src/services/buildingService.js
import api from './api';

/**
 * Fetch all active campus buildings.
 * GET /api/v1/buildings/
 */
export async function fetchBuildings() {
  const res = await api.get('/buildings/');
  return res.data?.data?.items || [];
}

/**
 * Create a new campus building.
 * POST /api/v1/buildings/
 * @param {{ name: string, latitude: number|null, longitude: number|null }} payload
 */
export async function createBuilding(payload) {
  const res = await api.post('/buildings/', payload);
  return res.data?.data?.item || null;
}

/**
 * Update an existing campus building.
 * PUT /api/v1/buildings/:id
 * @param {number} buildingId
 * @param {{ name?: string, latitude?: number, longitude?: number }} payload
 */
export async function updateBuilding(buildingId, payload) {
  const res = await api.put(`/buildings/${buildingId}`, payload);
  return res.data?.data?.item || null;
}

/**
 * Delete a campus building.
 * DELETE /api/v1/buildings/:id
 * @param {number} buildingId
 */
export async function deleteBuilding(buildingId) {
  const res = await api.delete(`/buildings/${buildingId}`);
  return res.data;
}
