// src/services/llmSettingService.js
import api from './api';

/**
 * Fetch the current LLM configuration.
 */
export async function fetchLLMSettings() {
  const res = await api.get('/settings/llm-settings');
  return res.data?.data?.item || null;
}

/**
 * Update the LLM configuration.
 * @param {object} settings - The settings object to patch.
 */
export async function updateLLMSettings(settings) {
  const res = await api.patch('/settings/llm-settings', settings);
  return res.data?.data?.item || null;
}
