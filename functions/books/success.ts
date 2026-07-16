/**
 * GET /books/success
 *
 * Success/confirmation page shown after a successful Stripe Payment Link purchase.
 * Stripe redirects here with ?session_id={CHECKOUT_SESSION_ID}.
 *
 * Looks up the order by session_id and displays a thank-you message
 * with the book title and instructions to check email for the download link.
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session_id') || '';

  let bookTitle = 'your book';
  let orderFound = false;

  if (sessionId) {
    // Try to look up the order by Stripe session ID
    const order = await env.DB.prepare(
      `SELECT b.title
       FROM orders o
       JOIN books b ON b.id = o.book_id
       WHERE o.stripe_session_id = ?`
    ).bind(sessionId).first<{ title: string }>();

    if (order) {
      bookTitle = order.title;
      orderFound = true;
    }
  }

  const html = buildSuccessPage(bookTitle, orderFound, sessionId);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function buildSuccessPage(bookTitle: string, orderFound: boolean, sessionId: string): string {
  const title = escapeHtml(bookTitle);

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Successful — LM Ministries</title>
  <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0B0D13;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      max-width: 520px;
      width: 100%;
      background: #161A24;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 48px 36px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .icon {
      width: 72px;
      height: 72px;
      background: rgba(15, 76, 129, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 36px; height: 36px; }
    h1 {
      font-family: 'Crimson Pro', serif;
      font-size: 28px;
      color: #D4AF37;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #A0AAB5;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .book-title {
      display: inline-block;
      background: rgba(15, 76, 129, 0.15);
      border: 1px solid rgba(15, 76, 129, 0.3);
      border-radius: 12px;
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 24px;
    }
    .email-note {
      background: rgba(212, 175, 55, 0.08);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 12px;
      padding: 16px 20px;
      font-size: 13px;
      color: #D4AF37;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .email-note strong { color: #fff; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      background: #0F4C81;
      color: #fff;
      text-decoration: none;
      border-radius: 30px;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn:hover { background: #0A3D6B; }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      background: transparent;
      color: #A0AAB5;
      text-decoration: none;
      border-radius: 30px;
      font-weight: 500;
      font-size: 14px;
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.2s;
      margin-top: 12px;
    }
    .btn-secondary:hover {
      border-color: rgba(255,255,255,0.3);
      color: #fff;
    }
    .footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 11px;
      color: #6B7280;
    }
    .order-ref {
      font-size: 11px;
      color: #6B7280;
      margin-top: 16px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
    <h1>Thank You for Your Purchase!</h1>
    <p class="subtitle">Your order has been received and is being processed.</p>

    <div class="book-title">${title}</div>

    <div class="email-note">
      <strong>📬 Check your email</strong><br>
      The download link for <strong>${title}</strong> has been sent to the email address you provided during checkout. If you don't see it within a few minutes, please check your spam folder.
    </div>

    <a href="/#books" class="btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Back to Books
    </a>
    <a href="/" class="btn-secondary">Return to Home</a>

    ${sessionId ? `<div class="order-ref">Order reference: ${escapeHtml(sessionId)}</div>` : ''}
    <div class="footer">LM Ministries — Apostle Lee Martinez</div>
  </div>
</body>
</html>`;
}
