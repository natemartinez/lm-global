/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's info from the JWT token.
 * Requires Authorization: Bearer <token> header.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyJWT } from './signup';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
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
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing or invalid authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh user data from DB (in case subscription status changed)
    const user = await env.DB.prepare(
      'SELECT id, email, name, is_subscribed, created_at FROM users WHERE id = ?'
    ).bind(payload.userId).first<{
      id: number;
      email: string;
      name: string;
      is_subscribed: number;
      created_at: string;
    }>();

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_subscribed: user.is_subscribed === 1,
          created_at: user.created_at,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Auth me error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
