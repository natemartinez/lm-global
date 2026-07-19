/**
 * GET /api/auth/me
 *
 * Returns the current authenticated user's info from the JWT token.
 * Requires Authorization: Bearer <token> header.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyJWT } from './signup';
import { jsonResponse, errorResponse } from '../_helpers';
import type { EnvWithDB, EnvWithJWT } from '../_types';

interface Env extends EnvWithDB, EnvWithJWT {}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Missing or invalid authorization header', 401);
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return errorResponse('Invalid or expired token', 401);
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
      return errorResponse('User not found', 404);
    }

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_subscribed: user.is_subscribed === 1,
        created_at: user.created_at,
      },
    }, 200);

  } catch (err) {
    console.error('Auth me error:', err);
    return errorResponse('Internal server error', 500);
  }
};
