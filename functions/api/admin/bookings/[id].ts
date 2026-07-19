/**
 * PATCH /api/admin/bookings/:id
 *
 * Updates the status of a speaking invitation (Approve / Decline).
 * Requires Bearer token authentication (handled by _middleware.ts).
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { jsonResponse, errorResponse } from '../../_helpers';
import type { EnvWithDB } from '../../_types';

interface Env extends EnvWithDB {
  ADMIN_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (request.method !== 'PATCH') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const id = parseInt(params.id as string, 10);
    if (isNaN(id)) {
      return errorResponse('Invalid booking ID', 400);
    }

    const body = await request.json() as { status?: string };
    const validStatuses = ['Approved', 'Declined', 'Pending'];

    if (!body.status || !validStatuses.includes(body.status)) {
      return errorResponse(`Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // Check the booking exists
    const booking = await env.DB.prepare(
      'SELECT id, event_date FROM speaking_invitations WHERE id = ?'
    ).bind(id).first<{ id: number; event_date: string }>();

    if (!booking) {
      return errorResponse('Booking not found', 404);
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

    return jsonResponse({ success: true, message: `Booking #${id} ${body.status.toLowerCase()}.` }, 200);

  } catch (err) {
    console.error('Admin booking update error:', err);
    return errorResponse('Internal server error', 500);
  }
};
