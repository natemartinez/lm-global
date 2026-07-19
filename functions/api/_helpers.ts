/**
 * Shared utility helpers for Pages Functions.
 *
 * Centralizes patterns that are duplicated across multiple endpoints:
 * - HTML escaping
 * - Email validation
 * - JSON response formatting
 * - UUID generation
 */

/**
 * Escape HTML special characters for safe interpolation into HTML strings.
 * Order matters: `&` must be replaced first to avoid double-escaping.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

/**
 * Validate an email address using a basic regex.
 * Returns true if the email has a valid format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate a UUID v4 string using crypto.getRandomValues.
 * Compatible with all Cloudflare Workers compatibility flags,
 * unlike crypto.randomUUID() which requires a specific compatibility date.
 */
export function generateUUID(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Set version 4 (0100 in binary)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant (10xx in binary)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Create a JSON response with the given data and status code.
 * Sets Content-Type: application/json automatically.
 */
export function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create a JSON error response with a message and status code.
 * Shorthand for jsonResponse({ success: false, message }, status).
 */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, message }, status);
}
