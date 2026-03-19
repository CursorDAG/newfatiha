/**
 * Instrumentation file for Next.js
 * This file is used to initialize Sentry and other monitoring tools
 * It runs once when the Next.js server starts
 */

export async function register() {
  // Only initialize Sentry in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      // Server-side instrumentation
      await import('./sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      // Edge runtime instrumentation
      await import('./sentry.edge.config');
    }
  }
}
