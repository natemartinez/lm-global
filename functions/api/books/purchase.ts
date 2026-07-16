/**
 * POST /api/books/purchase
 *
 * Returns the pre-built Stripe Payment Link URL for the requested book.
 * Payment Link URLs are read from the STRIPE_PAYMENT_LINKS environment
 * variable (a JSON string), allowing different URLs per environment
 * (production vs preview) without code changes.
 *
 * The frontend collects name/email before redirecting so we can validate
 * the book exists and return the correct Payment Link URL.
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
  BOOKS_BUCKET: R2Bucket;
  STRIPE_SECRET_KEY: string;
  JWT_SECRET: string;
  STRIPE_PAYMENT_LINKS?: string;
}

interface PurchasePayload {
  book_slug: string;
  email: string;
  name?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: PurchasePayload = await request.json();

    if (!body.book_slug || !body.email) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: book_slug, email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Look up the book to verify it exists and is active
    const book = await env.DB.prepare(
      'SELECT id, title, slug, price_cents, pdf_path FROM books WHERE slug = ? AND is_active = 1'
    ).bind(body.book_slug).first<{ id: number; title: string; slug: string; price_cents: number; pdf_path: string }>();

    if (!book) {
      return new Response(
        JSON.stringify({ success: false, message: 'Book not found or not available' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read Payment Link URLs from environment variable (JSON string).
    // Falls back to an empty object if not set.
    const paymentLinksRaw = env.STRIPE_PAYMENT_LINKS || '{}';
    let PAYMENT_LINKS: Record<string, string>;
    try {
      PAYMENT_LINKS = JSON.parse(paymentLinksRaw);
    } catch {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid STRIPE_PAYMENT_LINKS configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the pre-built Payment Link URL
    const paymentLink = PAYMENT_LINKS[body.book_slug];
    if (!paymentLink) {
      return new Response(
        JSON.stringify({ success: false, message: 'Payment link not configured for this book' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return the Payment Link URL — the frontend will redirect the user there.
    // The webhook will create the order on-the-fly when payment succeeds.
    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: paymentLink,
        book_id: book.id,
        book_title: book.title,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Book purchase error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
