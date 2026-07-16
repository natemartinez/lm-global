/**
 * Shared email helper — sends transactional emails via Resend REST API.
 *
 * Cloudflare Email Sending is not available on this account, so we use
 * Resend (resend.com) which has a generous free tier (100 emails/day)
 * and works perfectly from Cloudflare Workers without any SDK.
 *
 * Usage:
 *   import { sendEmail } from '../_email';
 *   await sendEmail(env.RESEND_API_KEY, {
 *     to: 'user@example.com',
 *     subject: 'Hello',
 *     html: '<p>Hi</p>',
 *     text: 'Hi',
 *   });
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const DEFAULT_FROM_NAME = 'LM Ministries';
const DEFAULT_FROM_EMAIL = 'bookings@lmministries.org';
const MAILING_FROM_NAME = 'LM Ministries';
const MAILING_FROM_EMAIL = 'updates@lmministries.org';

/**
 * Send an email via the Resend API.
 * Returns true if the send was accepted, false on failure.
 * Errors are logged but never thrown — callers should never fail a
 * request just because the email notification failed.
 *
 * @param apiKey - Resend API key
 * @param payload - email content (to, subject, html, text)
 * @param from - optional sender override; use 'mailing' for updates@lmministries.org,
 *               or pass a full '"Name" <email>' string. Defaults to bookings@lmministries.org.
 */
export async function sendEmail(
  apiKey: string,
  payload: EmailPayload,
  from?: string
): Promise<boolean> {
  try {
    let fromAddress: string;
    if (from === 'mailing') {
      fromAddress = `${MAILING_FROM_NAME} <${MAILING_FROM_EMAIL}>`;
    } else if (from) {
      fromAddress = from;
    } else {
      fromAddress = `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text || '',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Resend API error:', response.status, errorBody);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to send email via Resend:', err);
    return false;
  }
}
