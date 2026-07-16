/**
 * POST /api/auth/login
 *
 * Authenticates a user by email and password.
 * Returns a JWT token on success.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { verifyPassword, createJWT } from './signup';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface LoginPayload {
  email: string;
  password: string;
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
    const body: LoginPayload = await request.json();

    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: email, password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_subscribed: user.is_subscribed === 1,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Login error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
