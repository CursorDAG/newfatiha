import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "./logger";

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Optional message to return when rate limit is exceeded
   */
  message?: string;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory store for rate limiting
 * In production, this should be replaced with Redis or similar
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get current count for a key
   */
  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  /**
   * Increment count for a key
   */
  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const existing = this.get(key);

    if (existing) {
      existing.count++;
      this.store.set(key, existing);
      return existing;
    }

    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    this.store.set(key, newEntry);
    return newEntry;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug({ msg: "Rate limit store cleanup", removed });
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get store size (for monitoring)
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Global store instance
const store = new RateLimitStore();

/**
 * Get rate limit key for a request
 * Uses IP address + user ID (if authenticated) for better accuracy
 */
function getRateLimitKey(req: Request, userId?: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const path = new URL(req.url).pathname;

  // Include user ID if available for authenticated requests
  if (userId) {
    return `${ip}:${userId}:${path}`;
  }

  return `${ip}:${path}`;
}

/**
 * Rate limit middleware
 * Returns a NextResponse with 429 status if rate limit is exceeded
 */
export async function rateLimit(
  req: Request,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  // Get user ID if authenticated
  let userId: string | undefined;
  try {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;
  } catch {
    // Ignore session errors for rate limiting
  }

  const key = getRateLimitKey(req, userId);
  const entry = store.increment(key, config.windowMs);

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetTime = Math.ceil(entry.resetTime / 1000);

  // Add rate limit headers
  const headers = {
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
  };

  // Check if rate limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);

    logger.warn({
      msg: "Rate limit exceeded",
      key,
      count: entry.count,
      limit: config.maxRequests,
      retryAfter,
    });

    return NextResponse.json(
      {
        error: config.message || "Слишком много запросов. Попробуйте позже.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": retryAfter.toString(),
        },
      }
    );
  }

  // Rate limit not exceeded, return null to continue
  return null;
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  /**
   * Authentication endpoints (login, signup)
   * 5 requests per 15 minutes per IP
   */
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    message: "Слишком много попыток входа. Попробуйте через 15 минут.",
  },

  /**
   * Token generation endpoints
   * 30 requests per minute per user
   */
  token: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    message: "Слишком много запросов токенов. Попробуйте через минуту.",
  },

  /**
   * Quiz submission endpoints
   * 10 submissions per minute per user
   */
  quiz: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    message: "Слишком много отправок тестов. Попробуйте через минуту.",
  },

  /**
   * Homework submission endpoints
   * 5 submissions per minute per user
   */
  homework: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    message: "Слишком много отправок заданий. Попробуйте через минуту.",
  },

  /**
   * Activity heartbeat endpoints
   * 120 requests per minute per user (one every 30 seconds is normal)
   */
  heartbeat: {
    maxRequests: 120,
    windowMs: 60 * 1000,
    message: "Слишком много heartbeat запросов.",
  },

  /**
   * General API endpoints
   * 100 requests per minute per user
   */
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    message: "Слишком много запросов. Попробуйте через минуту.",
  },
} as const;

/**
 * Export store for testing
 */
export { store };
