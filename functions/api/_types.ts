/**
 * Shared type definitions for Pages Functions.
 *
 * Centralizes Env interface definitions that are duplicated across
 * multiple endpoint files. Each endpoint imports only the bindings
 * it actually needs.
 */

/**
 * Base environment with D1 database binding.
 * Used by most endpoints that need database access.
 */
export interface EnvWithDB {
  DB: D1Database;
}

/**
 * Environment with Resend email API key.
 */
export interface EnvWithEmail {
  RESEND_API_KEY: string;
}

/**
 * Environment with JWT secret for auth tokens.
 */
export interface EnvWithJWT {
  JWT_SECRET: string;
}

/**
 * Environment with Stripe webhook secret.
 */
export interface EnvWithStripeWebhook {
  STRIPE_WEBHOOK_SECRET: string;
}

/**
 * Environment with Stripe secret key and payment links config.
 */
export interface EnvWithStripe {
  STRIPE_SECRET_KEY: string;
  STRIPE_PAYMENT_LINKS?: string;
}

/**
 * Environment with R2 bucket binding.
 */
export interface EnvWithR2 {
  BOOKS_BUCKET: R2Bucket;
}

/**
 * Environment with admin secret for admin endpoints.
 */
export interface EnvWithAdmin {
  ADMIN_SECRET: string;
}

/**
 * Booking notification email address.
 */
export interface EnvWithBookingNotifications {
  BOOKING_NOTIFICATIONS_EMAIL: string;
}
