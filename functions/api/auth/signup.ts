/**
 * POST /api/auth/signup
 *
 * Creates a new user account with hashed password.
 * Optionally subscribes the user to the mailing list.
 * Returns a JWT token for immediate login.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { sendEmail } from '../_email';

interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  JWT_SECRET: string;
}

// Re-export for use by login.ts and me.ts
export type { Env as AuthEnv };

interface SignupPayload {
  email: string;
  password: string;
  name?: string;
  subscribe_to_list?: boolean;
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
    const body: SignupPayload = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields: email, password' }),
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

    // Validate password strength (min 8 chars)
    if (body.password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, message: 'Password must be at least 8 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const existing = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(body.email.trim().toLowerCase()).first();

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, message: 'An account with this email already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash the password using PBKDF2
    const passwordHash = await hashPassword(body.password);

    // Insert the user
    const email = body.email.trim().toLowerCase();
    const name = body.name?.trim() || '';
    const subscribeToList = body.subscribe_to_list === true;

    const result = await env.DB.prepare(
      `INSERT INTO users (email, password_hash, name, is_subscribed)
       VALUES (?, ?, ?, ?)`
    ).bind(email, passwordHash, name, subscribeToList ? 1 : 0).run();

    const userId = result.meta.last_row_id;

    // Optionally subscribe to mailing list
    if (subscribeToList) {
      try {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO mailing_list_subscribers (email, name, user_id, source, is_active)
           VALUES (?, ?, ?, 'signup', 1)`
        ).bind(email, name, userId).run();
      } catch (subErr) {
        console.error('Failed to subscribe new user:', subErr);
      }
    }

    // Send welcome email via Resend (from updates@lmministries.org)
    await sendEmail(env.RESEND_API_KEY, {
      to: email,
      subject: 'Welcome to LM Ministries!',
      html: buildWelcomeEmailHtml(name),
      text: buildWelcomeEmailText(name),
    }, 'mailing');

    // Generate JWT
    const token = await createJWT({ userId, email, name }, env.JWT_SECRET);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: { id: userId, email, name, is_subscribed: subscribeToList },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Signup error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Hash a password using PBKDF2 with SHA-256.
 * Returns a string in the format: pbkdf2:iterations:salt:hash
 */
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    key,
    256
  );

  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `pbkdf2:${iterations}:${saltHex}:${hashHex}`;
}

/**
 * Verify a password against a PBKDF2 hash string.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':');
    if (parts[0] !== 'pbkdf2' || parts.length !== 4) return false;

    const iterations = parseInt(parts[1], 10);
    const salt = new Uint8Array(parts[2].match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const storedHashHex = parts[3];

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256
    );

    const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex === storedHashHex;
  } catch {
    return false;
  }
}

/**
 * Create a simple JWT token using HMAC-SHA256.
 * Format: base64url(header).base64url(payload).base64url(signature)
 */
export async function createJWT(
  payload: { userId: number; email: string; name: string },
  secret: string
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + 86400 * 7, // 7 days
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(tokenPayload)));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = base64url(new Uint8Array(signature));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/**
 * Verify and decode a JWT token.
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<{ userId: number; email: string; name: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();

    // Verify signature
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlDecode(signatureB64),
      encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return null;

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name || '',
    };
  } catch {
    return null;
  }
}

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function buildWelcomeEmailHtml(name: string): string {
  const greeting = name ? `Dear ${escapeHtml(name)},` : 'Dear Friend,';
  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0B0D13; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-family: 'Crimson Pro', serif; color: #D4AF37; font-size: 24px; margin: 0;">Welcome to LM Ministries!</h1>
        <p style="color: #A0AAB5; font-size: 14px; margin-top: 4px;">You're now part of our global community.</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6;">${greeting}</p>
      <p style="font-size: 14px; line-height: 1.6;">Thank you for joining the LM Ministries family. You'll now receive updates on new apostolic resources, speaking engagements, and prophetic declarations from Apostle Lee Martinez.</p>
      <p style="font-size: 14px; line-height: 1.6;">May you be empowered to walk in your divine assignment!</p>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <p style="font-size: 11px; color: #A0AAB5;">LM Ministries — Apostle Lee Martinez</p>
      </div>
    </div>
  `;
}

function buildWelcomeEmailText(name: string): string {
  const greeting = name ? `Dear ${name},` : 'Dear Friend,';
  return `Welcome to LM Ministries!\n\n${greeting}\n\nThank you for joining the LM Ministries family. You'll now receive updates on new apostolic resources, speaking engagements, and prophetic declarations from Apostle Lee Martinez.\n\nMay you be empowered to walk in your divine assignment!\n\nLM Ministries — Apostle Lee Martinez`;
}
