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
import { isValidEmail, jsonResponse, errorResponse } from '../_helpers';
import type { EnvWithDB, EnvWithR2, EnvWithStripe, EnvWithJWT } from '../_types';

interface Env extends EnvWithDB, EnvWithR2, EnvWithStripe, EnvWithJWT {}

interface PurchasePayload {
  book_slug: string;
  email: string;
  name?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body: PurchasePayload = await request.json();

    if (!body.book_slug || !body.email) {
      return errorResponse('Missing required fields: book_slug, email', 400);
    }

    // Validate email
    if (!isValidEmail(body.email)) {
      return errorResponse('Invalid email format', 400);
    }

    // Look up the book to verify it exists and is active
    const book = await env.DB.prepare(
      'SELECT id, title, slug, price_cents, pdf_path FROM books WHERE slug = ? AND is_active = 1'
    ).bind(body.book_slug).first<{ id: number; title: string; slug: string; price_cents: number; pdf_path: string }>();

    if (!book) {
      return errorResponse('Book not found or not available', 404);
    }

    // Read Payment Link URLs from environment variable (JSON string).
    // Falls back to an empty object if not set.
    const paymentLinksRaw = env.STRIPE_PAYMENT_LINKS || '{}';
    let PAYMENT_LINKS: Record<string, string>;
    try {
      PAYMENT_LINKS = JSON.parse(paymentLinksRaw);
    } catch {
      return errorResponse('Invalid STRIPE_PAYMENT_LINKS configuration', 500);
    }

    // Get the pre-built Payment Link URL
    const paymentLink = PAYMENT_LINKS[body.book_slug];
    if (!paymentLink) {
      return errorResponse('Payment link not configured for this book', 500);
    }

    // Return the Payment Link URL — the frontend will redirect the user there.
    // The webhook will create the order on-the-fly when payment succeeds.
    return jsonResponse({
      success: true,
      checkout_url: paymentLink,
      book_id: book.id,
      book_title: book.title,
    }, 200);

  } catch (err) {
    console.error('Book purchase error:', err);
    return errorResponse('Internal server error', 500);
  }
};
