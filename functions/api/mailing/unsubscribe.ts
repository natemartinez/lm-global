/**
 * POST /api/mailing/unsubscribe
 *
 * Removes an email from the active mailing list.
 * Supports unsubscribe via email or authenticated user.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { jsonResponse, errorResponse } from '../_helpers';
import type { EnvWithDB } from '../_types';

interface Env extends EnvWithDB {}

interface UnsubscribePayload {
  email: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body: UnsubscribePayload = await request.json();

    if (!body.email) {
      return errorResponse('Missing required field: email', 400);
    }

    const email = body.email.trim().toLowerCase();

    // Check if subscriber exists
    const subscriber = await env.DB.prepare(
      'SELECT id, is_active FROM mailing_list_subscribers WHERE email = ?'
    ).bind(email).first<{ id: number; is_active: number }>();

    if (!subscriber) {
      return errorResponse('Email not found in the mailing list', 404);
    }

    if (!subscriber.is_active) {
      return errorResponse('This email is already unsubscribed', 409);
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

    return jsonResponse({ success: true, message: 'Successfully unsubscribed from the mailing list' }, 200);

  } catch (err) {
    console.error('Mailing unsubscribe error:', err);
    return errorResponse('Internal server error', 500);
  }
};
