/**
 * Sentry server-side configuration
 * Captures errors in API routes and server components
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1,

  // Filter out sensitive data
  beforeSend(event, _hint) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    // Remove sensitive data from request body
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      if (typeof data === "object" && data !== null) {
        if ("password" in data) delete data.password;
        if ("currentPassword" in data) delete data.currentPassword;
        if ("newPassword" in data) delete data.newPassword;
      }
    }

    return event;
  },
});
