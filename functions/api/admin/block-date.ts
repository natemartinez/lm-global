/**
 * POST /api/admin/block-date
 * DELETE /api/admin/block-date?id=<id>
 *
 * Manually block or unblock a date on the calendar.
 * Requires Bearer token authentication (handled by _middleware.ts).
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
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

      return new Response(
        JSON.stringify({ success: true, blocked_dates: results }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // DELETE: Unblock a date by ID
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const id = parseInt(url.searchParams.get('id') || '', 10);

      if (isNaN(id)) {
        return new Response(
          JSON.stringify({ success: false, message: 'Missing or invalid id parameter' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await env.DB.prepare(
        'DELETE FROM blocked_dates WHERE id = ?'
      ).bind(id).run();

      if (result.meta.changes === 0) {
        return new Response(
          JSON.stringify({ success: false, message: 'Blocked date not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Date unblocked successfully.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // POST: Block a date
    if (request.method === 'POST') {
      const body = await request.json() as { date?: string; reason?: string };

      if (!body.date) {
        return new Response(
          JSON.stringify({ success: false, message: 'Missing required field: date' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.date)) {
        return new Response(
          JSON.stringify({ success: false, message: 'Date must be in YYYY-MM-DD format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        await env.DB.prepare(
          'INSERT INTO blocked_dates (blocked_date, reason) VALUES (?, ?)'
        ).bind(body.date, body.reason?.trim() || '').run();
      } catch (insertErr: any) {
        if (insertErr.message?.includes('UNIQUE constraint')) {
          return new Response(
            JSON.stringify({ success: false, message: 'This date is already blocked.' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw insertErr;
      }

      return new Response(
        JSON.stringify({ success: true, message: `Date ${body.date} blocked successfully.` }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Admin block-date error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
