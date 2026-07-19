/**
 * GET /api/books/download?token=<uuid>
 *
 * Verifies a download token, streams the PDF from R2, and increments
 * the download counter. Tokens expire after 7 days or 5 downloads.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { errorResponse } from '../_helpers';
import type { EnvWithDB, EnvWithR2 } from '../_types';

interface Env extends EnvWithDB, EnvWithR2 {}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, ctx } = context;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return errorResponse('Missing download token', 400);
    }

    // Rate limiting — prevent brute-force bots from cycling through tokens.
    // Log this attempt in the background so it doesn't block the response.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    ctx.waitUntil(env.DB.prepare(
      'INSERT INTO download_attempts (ip_address) VALUES (?)'
    ).bind(ip).run());

    // Check if this IP has exceeded the rate limit (more than 10 attempts in the last minute)
    const recentAttempts = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM download_attempts
       WHERE ip_address = ? AND attempted_at > datetime('now', '-1 minute')`
    ).bind(ip).first<{ count: number }>();

    if (recentAttempts && recentAttempts.count > 10) {
      return new Response(
        JSON.stringify({ success: false, message: 'Too many download attempts. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    // Look up the order by download token
    const order = await env.DB.prepare(
      `SELECT o.id, o.book_id, o.status, o.download_count, o.fulfilled_at, o.email, b.pdf_path, b.title
       FROM orders o
       JOIN books b ON o.book_id = b.id
       WHERE o.download_token = ?`
    ).bind(token).first<{
      id: number;
      book_id: number;
      status: string;
      download_count: number;
      fulfilled_at: string;
      email: string;
      pdf_path: string;
      title: string;
    }>();

    if (!order) {
      return errorResponse('Invalid download token', 404);
    }

    // Check order status
    if (order.status !== 'fulfilled') {
      return errorResponse('Order has not been fulfilled yet', 403);
    }

    // Check download limit (max 5 downloads)
    if (order.download_count >= 5) {
      return errorResponse('Download limit reached (max 5 downloads). Please contact support.', 403);
    }

    // Check expiry (7 days from fulfillment)
    if (order.fulfilled_at) {
      const fulfilledDate = new Date(order.fulfilled_at + 'Z');
      const now = new Date();
      const daysSinceFulfillment = (now.getTime() - fulfilledDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFulfillment > 7) {
        return errorResponse('Download link has expired (valid for 7 days). Please contact support.', 410);
      }
    }

    // Fetch the PDF from R2
    const pdfObject = await env.BOOKS_BUCKET.get(order.pdf_path);
    if (!pdfObject) {
      console.error('PDF not found in R2:', order.pdf_path);
      return errorResponse('Book file not found. Please contact support.', 404);
    }

    // Increment download count
    await env.DB.prepare(
      'UPDATE orders SET download_count = download_count + 1 WHERE id = ?'
    ).bind(order.id).run();

    // Stream the PDF to the user
    const headers = new Headers();
    pdfObject.writeHttpMetadata(headers);
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${order.title}.pdf"`);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new Response(pdfObject.body, {
      status: 200,
      headers,
    });

  } catch (err) {
    console.error('Download error:', err);
    return errorResponse('Internal server error', 500);
  }
};
