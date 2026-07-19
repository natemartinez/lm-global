/**
 * Pages Functions middleware for LM Ministries Booking API.
 *
 * - Adds CORS headers to all API responses
 * - Validates admin authentication for /api/admin/* routes
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { jsonResponse } from './api/_helpers';
import type { EnvWithDB } from './api/_types';

interface Env extends EnvWithDB {
  ADMIN_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Admin auth check for /api/admin/* routes
  if (url.pathname.startsWith('/api/admin/')) {
    const authHeader = request.headers.get('Authorization');
    const expectedSecret = context.env.ADMIN_SECRET;

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedSecret) {
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }
  }

  const response = await next();

  // Add CORS headers to all responses
  const corsResponse = new Response(response.body, response);
  corsResponse.headers.set('Access-Control-Allow-Origin', '*');
  corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return corsResponse;
};
