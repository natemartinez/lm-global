/**
 * API client for the Tech Care Dashboard.
 *
 * Requests are proxied through our Express server, which handles
 * upstream authentication. No credentials are sent from the client.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
