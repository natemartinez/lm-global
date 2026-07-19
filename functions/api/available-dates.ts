/**
 * GET /api/available-dates?month=7&year=2026
 *
 * Returns blocked dates for a given month so the frontend calendar
 * can dynamically disable unavailable days.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { jsonResponse, errorResponse } from './_helpers';
import type { EnvWithDB } from './_types';

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
    const month = parseInt(url.searchParams.get('month') || '0', 10);
    const year = parseInt(url.searchParams.get('year') || '0', 10);

    if (!month || !year || month < 1 || month > 12) {
      return errorResponse('Invalid month or year parameters', 400);
    }

    // Calculate date range for the month
    const paddedMonth = String(month).padStart(2, '0');
    const startDate = `${year}-${paddedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`;

    // Query blocked dates within this month
    const { results } = await env.DB.prepare(
      `SELECT blocked_date FROM blocked_dates
       WHERE blocked_date >= ? AND blocked_date <= ?
       ORDER BY blocked_date ASC`
    ).bind(startDate, endDate).all<{ blocked_date: string }>();

    const blocked = results.map((row) => row.blocked_date);

    return jsonResponse({
      success: true,
      month,
      year,
      blocked,
      // All days of the week are available; only explicitly blocked dates are restricted
      available_days: [0, 1, 2, 3, 4, 5, 6],
    }, 200);

  } catch (err) {
    console.error('Available dates error:', err);
    return errorResponse('Internal server error', 500);
  }
};
