/**
 * POST /api/books/stripe-webhook
 *
 * Stripe webhook endpoint — listens for checkout.session.completed events.
 * On successful payment via a Payment Link: creates the order, generates a
 * download token, sends the download link email.
 *
 * Unlike the old flow (dynamic Checkout Sessions), Payment Links don't
 * pre-create a pending order in D1. This webhook creates the order
 * on-the-fly when the payment succeeds.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { sendEmail } from '../_email';
import { escapeHtml, generateUUID, jsonResponse, errorResponse } from '../_helpers';
import type { EnvWithDB, EnvWithEmail, EnvWithStripeWebhook, EnvWithJWT } from '../_types';

interface Env extends EnvWithDB, EnvWithEmail, EnvWithStripeWebhook, EnvWithJWT {}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, ctx } = context;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    // Verify webhook signature
    const stripeEvent = await verifyStripeWebhook(body, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!stripeEvent) {
      return errorResponse('Invalid webhook signature', 401);
    }

    // Only process checkout.session.completed
    if (stripeEvent.type !== 'checkout.session.completed') {
      return jsonResponse({ success: true, received: true }, 200);
    }

    const session = stripeEvent.data.object as {
      id: string;
      payment_intent: string;
      metadata: Record<string, string>;
      customer_details: {
        email: string;
        name?: string;
      };
      custom_fields?: Array<{
        key: string;
        label: { custom: string; type: string };
        text?: { value: string };
        dropdown?: { value: string };
      }>;
    };

    const sessionId = session.id;
    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : '';
    const customerEmail = session.customer_details?.email || '';
    const customerName = session.customer_details?.name || '';

    // Extract metadata set on the Payment Link in the Stripe Dashboard
    const bookSlug = session.metadata?.book_slug || '';
    const bookIdStr = session.metadata?.book_id || '';

    if (!bookSlug || !bookIdStr) {
      console.error('Missing book metadata in Payment Link session:', sessionId);
      return errorResponse('Missing book metadata', 400);
    }

    const bookId = parseInt(bookIdStr, 10);

    // Look up the book
    const book = await env.DB.prepare(
      'SELECT id, title, slug, price_cents, pdf_path FROM books WHERE id = ? AND is_active = 1'
    ).bind(bookId).first<{ id: number; title: string; slug: string; price_cents: number; pdf_path: string }>();

    if (!book) {
      console.error('Book not found for id:', bookId);
      return errorResponse('Book not found', 404);
    }

    // Idempotency check — if we've already processed this Stripe session, return 200
    // to stop Stripe from retrying. This prevents wasted requests from webhook retries.
    const existingOrder = await env.DB.prepare(
      'SELECT id FROM orders WHERE stripe_session_id = ?'
    ).bind(sessionId).first();

    if (existingOrder) {
      console.log('Duplicate webhook received for session:', sessionId, '- returning 200');
      return jsonResponse({ success: true, received: true }, 200);
    }

    // Generate a unique download token using crypto.getRandomValues
    // (crypto.randomUUID() is not available in all Workers compatibility flags)
    const downloadToken = generateUUID();

    // Create the order as fulfilled (no pending state needed — payment already succeeded)
    const insertResult = await env.DB.prepare(
      `INSERT INTO orders (book_id, email, stripe_session_id, stripe_payment_intent, amount_cents, status, download_token, fulfilled_at)
       VALUES (?, ?, ?, ?, ?, 'fulfilled', ?, datetime('now'))`
    ).bind(
      book.id,
      customerEmail,
      sessionId,
      paymentIntent,
      book.price_cents,
      downloadToken
    ).run();

    if (!insertResult.meta.changes || insertResult.meta.changes === 0) {
      console.error('Failed to insert order for session:', sessionId);
      return errorResponse('Failed to create order', 500);
    }

    // Send download link email via Resend in the background.
    // Using ctx.waitUntil() means we respond to Stripe immediately (preventing retries)
    // while the email sends asynchronously. This avoids CPU timeouts on the free plan.
    const origin = new URL(request.url).origin;
    const downloadUrl = `${origin}/api/books/download?token=${downloadToken}`;

    ctx.waitUntil(sendEmail(env.RESEND_API_KEY, {
      to: customerEmail,
      subject: `Your Download — ${book.title}`,
      html: buildDownloadEmailHtml(book.title, downloadUrl, customerName),
      text: buildDownloadEmailText(book.title, downloadUrl, customerName),
    }, 'mailing'));

    return jsonResponse({ success: true, received: true }, 200);

  } catch (err) {
    console.error('Stripe webhook error:', err);
    return errorResponse('Internal server error', 500);
  }
};

/**
 * Verify Stripe webhook signature using HMAC-SHA256.
 * Stripe sends the signature in the `stripe-signature` header.
 */
async function verifyStripeWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<{ type: string; data: { object: any } } | null> {
  try {
    // Parse the signature header to extract the timestamp and signatures
    const parts = signature.split(',').map((p) => p.trim());
    let timestamp = '';
    const sigs: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') sigs.push(value);
    }

    if (!timestamp || sigs.length === 0) return null;

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSig = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures (constant-time comparison not critical for webhook)
    if (!sigs.includes(expectedSig)) return null;

    return JSON.parse(payload);
  } catch (err) {
    console.error('Webhook verification error:', err);
    return null;
  }
}

function buildDownloadEmailHtml(bookTitle: string, downloadUrl: string, name: string): string {
  const greeting = name ? `Dear ${escapeHtml(name)},` : 'Dear Reader,';
  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0B0D13; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-family: 'Crimson Pro', serif; color: #D4AF37; font-size: 24px; margin: 0;">Thank You for Your Purchase!</h1>
        <p style="color: #A0AAB5; font-size: 14px; margin-top: 4px;">Your download for <strong style="color: #fff;">${escapeHtml(bookTitle)}</strong> is ready.</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6;">${greeting}</p>
      <p style="font-size: 14px; line-height: 1.6;">Click the button below to download your book. This link will expire in 7 days or after 5 downloads.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${escapeHtml(downloadUrl)}" style="display: inline-block; padding: 14px 36px; background: #0F4C81; color: #fff; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 15px;">Download Your Book</a>
      </div>
      <p style="font-size: 12px; color: #A0AAB5; text-align: center;">If the button doesn't work, copy and paste this URL into your browser:<br><span style="color: #0F4C81;">${escapeHtml(downloadUrl)}</span></p>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <p style="font-size: 11px; color: #A0AAB5;">LM Ministries — Apostle Lee Martinez</p>
      </div>
    </div>
  `;
}

function buildDownloadEmailText(bookTitle: string, downloadUrl: string, name: string): string {
  const greeting = name ? `Dear ${name},` : 'Dear Reader,';
  return `Thank You for Your Purchase!\n\n${greeting}\n\nYour download for "${bookTitle}" is ready.\n\nDownload here: ${downloadUrl}\n\nThis link will expire in 7 days or after 5 downloads.\n\nLM Ministries — Apostle Lee Martinez`;
}
