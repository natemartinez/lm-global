/**
 * POST /api/admin/block-date
 * DELETE /api/admin/block-date?id=<id>
 *
 * Manually block or unblock a date on the calendar.
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

  try {
    // GET: List all blocked dates with IDs
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, blocked_date, reason, created_at FROM blocked_dates ORDER BY blocked_date ASC'
      ).all();

      return jsonResponse({ success: true, blocked_dates: results }, 200);
    }

    // DELETE: Unblock a date by ID
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = parseInt(url.searchParams.get('id') || '', 10);

      if (isNaN(id)) {
        return errorResponse('Missing or invalid id parameter', 400);
      }

      const result = await env.DB.prepare(
        'DELETE FROM blocked_dates WHERE id = ?'
      ).bind(id).run();

      if (result.meta.changes === 0) {
        return errorResponse('Blocked date not found', 404);
      }

      return jsonResponse({ success: true, message: 'Date unblocked successfully.' }, 200);
    }

    // POST: Block a date
    if (request.method === 'POST') {
      const body = await request.json() as { date?: string; reason?: string };

      if (!body.date) {
        return errorResponse('Missing required field: date', 400);
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.date)) {
        return errorResponse('Date must be in YYYY-MM-DD format', 400);
      }

      try {
        await env.DB.prepare(
          'INSERT INTO blocked_dates (blocked_date, reason) VALUES (?, ?)'
        ).bind(body.date, body.reason?.trim() || '').run();
      } catch (insertErr: any) {
        if (insertErr.message?.includes('UNIQUE constraint')) {
          return errorResponse('This date is already blocked.', 409);
        }
        throw insertErr;
      }

      return jsonResponse({ success: true, message: `Date ${body.date} blocked successfully.` }, 201);
    }

    return errorResponse('Method not allowed', 405);

  } catch (err) {
    console.error('Admin block-date error:', err);
    return errorResponse('Internal server error', 500);
  }
};
