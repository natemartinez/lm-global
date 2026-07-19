/**
 * POST /api/book-speaking
 *
 * Receives a speaking invitation booking request, validates for date
 * collisions, saves to D1, and sends an email notification via Resend.
 */

import type { PagesFunction } from '@cloudflare/workers-types';
import { sendEmail } from './_email';
import { escapeHtml, isValidEmail, jsonResponse, errorResponse } from './_helpers';
import type { EnvWithDB, EnvWithEmail, EnvWithBookingNotifications } from './_types';

interface Env extends EnvWithDB, EnvWithEmail, EnvWithBookingNotifications {}

interface BookingPayload {
  organization: string;
  host: string;
  email: string;
  engagement_type: string;
  date: string;
  time: string;
  comments?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body: BookingPayload = await request.json();

    // Validate required fields
    const required = ['organization', 'host', 'email', 'engagement_type', 'date', 'time'];
    for (const field of required) {
      if (!body[field as keyof BookingPayload]?.trim()) {
        return errorResponse(`Missing required field: ${field}`, 400);
      }
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return errorResponse('Invalid email format', 400);
    }

    // Check for date collision in blocked_dates
    // Parse the date string like "July 19, 2026" into "2026-07-19"
    const parsedDate = new Date(body.date);
    if (isNaN(parsedDate.getTime())) {
      return errorResponse('Invalid date format', 400);
    }
    const dateStr = parsedDate.toISOString().split('T')[0]; // "2026-07-19"

    const blocked = await env.DB.prepare(
      'SELECT id FROM blocked_dates WHERE blocked_date = ?'
    ).bind(dateStr).first();

    if (blocked) {
      return errorResponse('This date is already booked. Please select another date.', 409);
    }

    // Insert the booking
    const result = await env.DB.prepare(
      `INSERT INTO speaking_invitations (organization_name, host_name, host_email, engagement_type, event_date, event_time, additional_comments)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.organization.trim(),
      body.host.trim(),
      body.email.trim(),
      body.engagement_type,
      body.date,
      body.time,
      body.comments?.trim() || ''
    ).run();

    // Send email notification via Resend to the configured notification address
    await sendEmail(env.RESEND_API_KEY, {
      to: env.BOOKING_NOTIFICATIONS_EMAIL,
      subject: `New Speaking Invitation - ${body.organization}`,
      html: buildEmailHtml(body),
      text: buildEmailText(body),
    });

    return jsonResponse({ success: true, message: 'Invitation submitted successfully.', id: result.meta.last_row_id }, 201);

  } catch (err) {
    console.error('Booking error:', err);
    return errorResponse('Internal server error. Please try again later.', 500);
  }
};

function buildEmailHtml(body: BookingPayload): string {
  return `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0B0D13; color: #e2e8f0; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-family: 'Crimson Pro', serif; color: #D4AF37; font-size: 24px; margin: 0;">New Speaking Invitation</h1>
        <p style="color: #A0AAB5; font-size: 14px; margin-top: 4px;">A new booking request has been submitted</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: #A0AAB5; width: 140px;">Organization</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${escapeHtml(body.organization)}</td></tr>
        <tr><td style="padding: 8px 0; color: #A0AAB5;">Host</td><td style="padding: 8px 0; color: #ffffff;">${escapeHtml(body.host)}</td></tr>
        <tr><td style="padding: 8px 0; color: #A0AAB5;">Email</td><td style="padding: 8px 0; color: #ffffff;">${escapeHtml(body.email)}</td></tr>
        <tr><td style="padding: 8px 0; color: #A0AAB5;">Engagement Type</td><td style="padding: 8px 0; color: #ffffff;">${escapeHtml(body.engagement_type)}</td></tr>
        <tr><td style="padding: 8px 0; color: #A0AAB5;">Date</td><td style="padding: 8px 0; color: #ffffff;">${escapeHtml(body.date)}</td></tr>
        <tr><td style="padding: 8px 0; color: #A0AAB5;">Time</td><td style="padding: 8px 0; color: #ffffff;">${escapeHtml(body.time)}</td></tr>
        ${body.comments ? `<tr><td style="padding: 8px 0; color: #A0AAB5;">Comments</td><td style="padding: 8px 0; color: #ffffff;">${escapeHtml(body.comments)}</td></tr>` : ''}
      </table>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <span style="display: inline-block; padding: 6px 16px; background: #0F4C81; color: white; border-radius: 20px; font-size: 12px; font-weight: 600;">Status: Pending Review</span>
      </div>
      <p style="text-align: center; color: #A0AAB5; font-size: 12px; margin-top: 24px;">
        <a href="https://lmministries.org/admin" style="color: #0F4C81;">Manage bookings in the admin panel</a>
      </p>
    </div>
  `;
}

function buildEmailText(body: BookingPayload): string {
  return `New Speaking Invitation\n\nOrganization: ${body.organization}\nHost: ${body.host}\nEmail: ${body.email}\nType: ${body.engagement_type}\nDate: ${body.date}\nTime: ${body.time}\nComments: ${body.comments || 'N/A'}\n\nStatus: Pending Review`;
}
