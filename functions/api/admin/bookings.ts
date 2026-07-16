/**
 * GET /api/admin/bookings
 *
 * Returns all speaking invitations, sorted by most recent first.
 * Requires Bearer token authentication (handled by _middleware.ts).
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
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

    return new Response(
      JSON.stringify({ success: true, bookings: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Admin bookings error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
