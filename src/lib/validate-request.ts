/**
 * Request validation middleware using Zod
 * Provides automatic validation with type-safe error messages
 */

import { z } from "zod";
import { ValidationError } from "./errors";

/**
 * Validates request body against a Zod schema
 * Throws ValidationError with field-specific messages on failure
 */
export async function validateRequest<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      throw new ValidationError("Invalid JSON");
    }

    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Convert Zod errors to our ValidationError format
      const fields: Record<string, string> = {};

      for (const issue of error.issues) {
        const path = issue.path.join(".");
        fields[path] = issue.message;
      }

      throw new ValidationError("Validation failed", fields);
    }

    throw error;
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodType>(
  req: Request,
  schema: T
): z.infer<T> {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);

    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields: Record<string, string> = {};

      for (const issue of error.issues) {
        const path = issue.path.join(".");
        fields[path] = issue.message;
      }

      throw new ValidationError("Invalid query parameters", fields);
    }

    throw error;
  }
}
