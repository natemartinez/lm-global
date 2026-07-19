/**
 * GET /api/admin/bookings
 *
 * Returns all speaking invitations, sorted by most recent first.
 * Requires Bearer token authentication (handled by _middleware.ts).
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { jsonResponse, errorResponse } from '../_helpers';
import type { EnvWithDB } from '../_types';

interface Env extends EnvWithDB {
  ADMIN_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status'); // Optional: Pending, Approved, Declined

    let query = `SELECT * FROM speaking_invitations`;
    const bindings: string[] = [];

    if (statusFilter) {
      query += ` WHERE status = ?`;
      bindings.push(statusFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const { results } = await env.DB.prepare(query).bind(...bindings).all();

    return jsonResponse({ success: true, bookings: results }, 200);

  } catch (err) {
    console.error('Admin bookings error:', err);
    return errorResponse('Internal server error', 500);
  }
};
