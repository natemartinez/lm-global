/**
 * POST /api/auth/login
 *
 * Authenticates a user by email and password.
 * Returns a JWT token on success.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyPassword, createJWT } from './signup';
import { jsonResponse, errorResponse } from '../_helpers';
import type { EnvWithDB, EnvWithJWT } from '../_types';

interface Env extends EnvWithDB, EnvWithJWT {}

interface LoginPayload {
  email: string;
  password: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body: LoginPayload = await request.json();

    if (!body.email || !body.password) {
      return errorResponse('Missing required fields: email, password', 400);
    }

    const email = body.email.trim().toLowerCase();

    // Look up the user
    const user = await env.DB.prepare(
      'SELECT id, email, password_hash, name, is_subscribed FROM users WHERE email = ?'
    ).bind(email).first<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      is_subscribed: number;
    }>();

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) {
      return errorResponse('Invalid email or password', 401);
    }

    // Update last login timestamp
    await env.DB.prepare(
      'UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?'
    ).bind(user.id).run();

    // Generate JWT
    const token = await createJWT(
      { userId: user.id, email: user.email, name: user.name },
      env.JWT_SECRET
    );

    return jsonResponse({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_subscribed: user.is_subscribed === 1,
      },
    }, 200);

  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('Internal server error', 500);
  }
};
