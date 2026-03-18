/**
 * API error handler middleware
 * Wraps API route handlers with centralized error handling
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { AppError, ValidationError } from "./errors";
import { logger } from "./logger";

type ApiHandler<T = unknown> = (
  req: Request,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T | Record<string, unknown>> | Response>;

/**
 * Wraps an API route handler with error handling
 * @param handler - The API route handler function
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling<T = unknown>(
  handler: ApiHandler<T>
): ApiHandler<T> {
  return async (req: Request, context?: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Structured logging with context
      const url = new URL(req.url);
      const logContext = {
        path: url.pathname,
        method: req.method,
        query: Object.fromEntries(url.searchParams),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        statusCode: error instanceof AppError ? error.statusCode : 500,
      };

      logger.error(logContext, "API request failed");

      // Send to Sentry in production (only for unexpected errors, not validation/auth)
      if (
        process.env.NODE_ENV === "production" &&
        !(error instanceof AppError && error.statusCode < 500)
      ) {
        Sentry.captureException(error, {
          contexts: {
            request: {
              url: url.pathname,
              method: req.method,
              query_string: url.search,
            },
          },
        });
      }

      // Handle known application errors
      if (error instanceof AppError) {
        const response: Record<string, unknown> = {
          error: error.message,
          code: error.code,
        };

        // Add fields for ValidationError
        if (error instanceof ValidationError && error.fields) {
          response.fields = error.fields;
        }

        return NextResponse.json(response, { status: error.statusCode });
      }

      // Handle Prisma errors
      if (error && typeof error === "object" && "code" in error) {
        const prismaError = error as { code: string; meta?: Record<string, unknown> };

        // Unique constraint violation
        if (prismaError.code === "P2002") {
          return NextResponse.json(
            { error: "A record with this value already exists", code: "DUPLICATE" },
            { status: 409 }
          );
        }

        // Record not found
        if (prismaError.code === "P2025") {
          return NextResponse.json(
            { error: "Record not found", code: "NOT_FOUND" },
            { status: 404 }
          );
        }
      }

      // Handle unexpected errors
      return NextResponse.json(
        {
          error: "An unexpected error occurred",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }
  };
}
