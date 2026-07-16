/**
 * PATCH /api/admin/bookings/:id
 *
 * Updates the status of a speaking invitation (Approve / Decline).
 * Requires Bearer token authentication (handled by _middleware.ts).
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method !== 'PATCH') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const id = parseInt(params.id as string, 10);
    if (isNaN(id)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid booking ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json() as { status?: string };
    const validStatuses = ['Approved', 'Declined', 'Pending'];

    if (!body.status || !validStatuses.includes(body.status)) {
      return new Response(
        JSON.stringify({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check the booking exists
    const booking = await env.DB.prepare(
      'SELECT id, event_date FROM speaking_invitations WHERE id = ?'
    ).bind(id).first<{ id: number; event_date: string }>();

    if (!booking) {
      return new Response(
        JSON.stringify({ success: false, message: 'Booking not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update the status
    await env.DB.prepare(
      'UPDATE speaking_invitations SET status = ? WHERE id = ?'
    ).bind(body.status, id).run();

    // If approved, also block the date to prevent double-booking
    if (body.status === 'Approved') {
      // Parse date string like "July 19, 2026" into "2026-07-19"
      const parsedDate = new Date(booking.event_date);
      const dateStr = !isNaN(parsedDate.getTime())
        ? parsedDate.toISOString().split('T')[0]
        : booking.event_date; // fallback: store as-is

      // Insert into blocked_dates (ignore if already exists)
      await env.DB.prepare(
        'INSERT OR IGNORE INTO blocked_dates (blocked_date, reason) VALUES (?, ?)'
      ).bind(dateStr, `Approved booking #${id}`).run();
    }

    return new Response(
      JSON.stringify({ success: true, message: `Booking #${id} ${body.status.toLowerCase()}.` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Admin booking update error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
