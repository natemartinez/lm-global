/**
 * POST /api/mailing/unsubscribe
 *
 * Removes an email from the active mailing list.
 * Supports unsubscribe via email or authenticated user.
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

interface UnsubscribePayload {
  email: string;
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
    const body: UnsubscribePayload = await request.json();

    if (!body.email) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required field: email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const email = body.email.trim().toLowerCase();

    // Check if subscriber exists
    const subscriber = await env.DB.prepare(
      'SELECT id, is_active FROM mailing_list_subscribers WHERE email = ?'
    ).bind(email).first<{ id: number; is_active: number }>();

    if (!subscriber) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email not found in the mailing list' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriber.is_active) {
      return new Response(
        JSON.stringify({ success: false, message: 'This email is already unsubscribed' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Deactivate the subscriber
    await env.DB.prepare(
      `UPDATE mailing_list_subscribers
       SET is_active = 0, unsubscribed_at = datetime('now')
       WHERE id = ?`
    ).bind(subscriber.id).run();

    // Also update users table if this email has an account
    await env.DB.prepare(
      'UPDATE users SET is_subscribed = 0 WHERE email = ?'
    ).bind(email).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Successfully unsubscribed from the mailing list' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Mailing unsubscribe error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
