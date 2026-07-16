/**
 * API client for the Tech Care Dashboard.
 *
 * In development (VITE_USE_MOCK_DATA=true), requests go to the local
 * Express mock server. In production, they go to the live API endpoint
 * configured via VITE_API_BASE_URL.
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const BASE_URL = USE_MOCK
  ? 'http://localhost:3001'
  : (import.meta.env.VITE_API_BASE_URL || '/api');

/**
 * Fetch wrapper with JSON content type.
 *
 * @param {string} endpoint - API path (e.g. '/api/dashboard')
 * @returns {Promise<any>} Parsed JSON response
 */
async function request(endpoint) {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error(`API Error: ${response.status} ${response.statusText}`);
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch {
      error.data = null;
    }
    throw error;
  }

  return response.json();
}

/**
 * Fetch all patients with their full medical data.
 *
 * @returns {Promise<import('../types').PatientsResponse>}
 */
export function fetchPatients() {
  return request('/api/dashboard');
}

const api = { fetchPatients };

export default api;
