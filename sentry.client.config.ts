/**
 * Sentry client-side configuration
 * Captures errors in the browser
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.1,

  // Capture Replay for 10% of all sessions,
  // plus 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          // Remove password fields
          if (breadcrumb.data.password) delete breadcrumb.data.password;
          if (breadcrumb.data.currentPassword) delete breadcrumb.data.currentPassword;
          if (breadcrumb.data.newPassword) delete breadcrumb.data.newPassword;
        }
        return breadcrumb;
      });
    }

    return event;
  },
});
