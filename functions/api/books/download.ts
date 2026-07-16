/**
 * GET /api/books/download?token=<uuid>
 *
 * Verifies a download token, streams the PDF from R2, and increments
 * the download counter. Tokens expire after 7 days or 5 downloads.
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  BOOKS_BUCKET: R2Bucket;
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
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing download token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid download token' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check order status
    if (order.status !== 'fulfilled') {
      return new Response(
        JSON.stringify({ success: false, message: 'Order has not been fulfilled yet' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check download limit (max 5 downloads)
    if (order.download_count >= 5) {
      return new Response(
        JSON.stringify({ success: false, message: 'Download limit reached (max 5 downloads). Please contact support.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry (7 days from fulfillment)
    if (order.fulfilled_at) {
      const fulfilledDate = new Date(order.fulfilled_at + 'Z');
      const now = new Date();
      const daysSinceFulfillment = (now.getTime() - fulfilledDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFulfillment > 7) {
        return new Response(
          JSON.stringify({ success: false, message: 'Download link has expired (valid for 7 days). Please contact support.' }),
          { status: 410, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch the PDF from R2
    const pdfObject = await env.BOOKS_BUCKET.get(order.pdf_path);
    if (!pdfObject) {
      console.error('PDF not found in R2:', order.pdf_path);
      return new Response(
        JSON.stringify({ success: false, message: 'Book file not found. Please contact support.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
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
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
