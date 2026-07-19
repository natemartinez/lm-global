/**
 * POST /api/mailing/subscribe
 *
 * Adds an email to the mailing list.
 * Sends a confirmation email.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { sendEmail } from '../_email';
import { escapeHtml, isValidEmail, jsonResponse, errorResponse } from '../_helpers';
import type { EnvWithDB, EnvWithEmail } from '../_types';

interface Env extends EnvWithDB, EnvWithEmail {}

interface SubscribePayload {
  email: string;
  name?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body: SubscribePayload = await request.json();

    if (!body.email) {
      return errorResponse('Missing required field: email', 400);
    }

    // Validate email
    if (!isValidEmail(body.email)) {
      return errorResponse('Invalid email format', 400);
    }

    const email = body.email.trim().toLowerCase();
    const name = body.name?.trim() || '';

    // Check if already subscribed
    const existing = await env.DB.prepare(
      'SELECT id, is_active FROM mailing_list_subscribers WHERE email = ?'
    ).bind(email).first<{ id: number; is_active: number }>();

    if (existing) {
      if (existing.is_active) {
        return errorResponse('This email is already subscribed to the mailing list', 409);
      }

      // Re-activate unsubscribed user
      await env.DB.prepare(
        `UPDATE mailing_list_subscribers
         SET is_active = 1, unsubscribed_at = NULL, subscribed_at = datetime('now')
         WHERE id = ?`
      ).bind(existing.id).run();
    } else {
      // New subscriber
      await env.DB.prepare(
        `INSERT INTO mailing_list_subscribers (email, name, source, is_active)
         VALUES (?, ?, 'manual', 1)`
      ).bind(email, name).run();

      // Also update users table if this email has an account
      await env.DB.prepare(
        'UPDATE users SET is_subscribed = 1 WHERE email = ?'
      ).bind(email).run();
    }

    // Send confirmation email via Resend (from updates@lmministries.org)
    await sendEmail(env.RESEND_API_KEY, {
      to: email,
      subject: 'You\'re Subscribed — LM Ministries Updates',
      html: buildConfirmationEmailHtml(name),
      text: buildConfirmationEmailText(name),
    }, 'mailing');

    return jsonResponse({ success: true, message: 'Successfully subscribed to the mailing list' }, 201);

  } catch (err) {
    console.error('Mailing subscribe error:', err);
    return errorResponse('Internal server error', 500);
  }
};

function buildConfirmationEmailHtml(name: string): string {
  const greeting = name ? `Dear ${escapeHtml(name)},` : 'Dear Subscriber,';
  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0B0D13; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-family: 'Crimson Pro', serif; color: #D4AF37; font-size: 24px; margin: 0;">Subscription Confirmed!</h1>
        <p style="color: #A0AAB5; font-size: 14px; margin-top: 4px;">You're now on the LM Ministries mailing list.</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6;">${greeting}</p>
      <p style="font-size: 14px; line-height: 1.6;">Thank you for subscribing! You'll receive updates on new apostolic resources, speaking engagements, prophetic declarations, and ministry news from Apostle Lee Martinez.</p>
      <p style="font-size: 12px; color: #A0AAB5;">You can unsubscribe at any time using the link in any email you receive from us.</p>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <p style="font-size: 11px; color: #A0AAB5;">LM Ministries — Apostle Lee Martinez</p>
      </div>
    </div>
  `;
}

function buildConfirmationEmailText(name: string): string {
  const greeting = name ? `Dear ${name},` : 'Dear Subscriber,';
  return `Subscription Confirmed!\n\n${greeting}\n\nThank you for subscribing! You'll receive updates on new apostolic resources, speaking engagements, prophetic declarations, and ministry news from Apostle Lee Martinez.\n\nYou can unsubscribe at any time.\n\nLM Ministries — Apostle Lee Martinez`;
}
