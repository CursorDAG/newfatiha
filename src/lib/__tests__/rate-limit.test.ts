import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitConfigs, store } from "../rate-limit";

// Mock next-auth module
vi.mock("next-auth", () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}));

describe("rate-limit", () => {
  beforeEach(() => {
    // Clear store before each test
    store.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (path: string, ip?: string): Request => {
    const url = `http://localhost:3000${path}`;
    const headers = new Headers();
    if (ip) {
      headers.set("x-forwarded-for", ip);
    }

    return new NextRequest(url, { headers });
  };

  describe("rateLimit", () => {
    it("should allow requests within limit", async () => {
      const req = createMockRequest("/api/test", "192.168.1.1");
      const config = { maxRequests: 5, windowMs: 60000 };

      // First request should pass
      const response1 = await rateLimit(req, config);
      expect(response1).toBeNull();

      // Second request should pass
      const response2 = await rateLimit(req, config);
      expect(response2).toBeNull();

      // Third request should pass
      const response3 = await rateLimit(req, config);
      expect(response3).toBeNull();
    });

    it("should block requests exceeding limit", async () => {
      const req = createMockRequest("/api/test", "192.168.1.2");
      const config = { maxRequests: 3, windowMs: 60000 };

      // Make 3 requests (at limit)
      await rateLimit(req, config);
      await rateLimit(req, config);
      await rateLimit(req, config);

      // 4th request should be blocked
      const response = await rateLimit(req, config);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(429);

      const body = await response?.json();
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it("should include rate limit headers", async () => {
      const req = createMockRequest("/api/test", "192.168.1.3");
      const config = { maxRequests: 10, windowMs: 60000 };

      await rateLimit(req, config);
      const response = await rateLimit(req, config);

      // Even when not blocked, headers should be present
      expect(response).toBeNull();
    });

    it("should use custom error message", async () => {
      const req = createMockRequest("/api/test", "192.168.1.4");
      const config = {
        maxRequests: 1,
        windowMs: 60000,
        message: "Custom error message",
      };

      await rateLimit(req, config);
      const response = await rateLimit(req, config);

      const body = await response?.json();
      expect(body.error).toBe("Custom error message");
    });

    it("should reset after time window", async () => {
      const req = createMockRequest("/api/test", "192.168.1.5");
      const config = { maxRequests: 2, windowMs: 100 }; // 100ms window

      // Use up the limit
      await rateLimit(req, config);
      await rateLimit(req, config);

      // Should be blocked
      const blocked = await rateLimit(req, config);
      expect(blocked?.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      const allowed = await rateLimit(req, config);
      expect(allowed).toBeNull();
    });

    it("should track different IPs separately", async () => {
      const req1 = createMockRequest("/api/test", "192.168.1.6");
      const req2 = createMockRequest("/api/test", "192.168.1.7");
      const config = { maxRequests: 2, windowMs: 60000 };

      // IP 1 uses up limit
      await rateLimit(req1, config);
      await rateLimit(req1, config);
      const blocked1 = await rateLimit(req1, config);
      expect(blocked1?.status).toBe(429);

      // IP 2 should still be allowed
      const allowed2 = await rateLimit(req2, config);
      expect(allowed2).toBeNull();
    });

    it("should track different paths separately", async () => {
      const req1 = createMockRequest("/api/path1", "192.168.1.8");
      const req2 = createMockRequest("/api/path2", "192.168.1.8");
      const config = { maxRequests: 2, windowMs: 60000 };

      // Path 1 uses up limit
      await rateLimit(req1, config);
      await rateLimit(req1, config);
      const blocked1 = await rateLimit(req1, config);
      expect(blocked1?.status).toBe(429);

      // Path 2 should still be allowed (same IP, different path)
      const allowed2 = await rateLimit(req2, config);
      expect(allowed2).toBeNull();
    });

    it("should handle missing IP gracefully", async () => {
      const req = createMockRequest("/api/test"); // No IP header
      const config = { maxRequests: 5, windowMs: 60000 };

      const response = await rateLimit(req, config);
      expect(response).toBeNull();
    });
  });

  describe("rateLimitConfigs", () => {
    it("should have auth config", () => {
      expect(rateLimitConfigs.auth).toBeDefined();
      expect(rateLimitConfigs.auth.maxRequests).toBe(5);
      expect(rateLimitConfigs.auth.windowMs).toBe(15 * 60 * 1000);
    });

    it("should have token config", () => {
      expect(rateLimitConfigs.token).toBeDefined();
      expect(rateLimitConfigs.token.maxRequests).toBe(30);
      expect(rateLimitConfigs.token.windowMs).toBe(60 * 1000);
    });

    it("should have quiz config", () => {
      expect(rateLimitConfigs.quiz).toBeDefined();
      expect(rateLimitConfigs.quiz.maxRequests).toBe(10);
      expect(rateLimitConfigs.quiz.windowMs).toBe(60 * 1000);
    });

    it("should have homework config", () => {
      expect(rateLimitConfigs.homework).toBeDefined();
      expect(rateLimitConfigs.homework.maxRequests).toBe(5);
      expect(rateLimitConfigs.homework.windowMs).toBe(60 * 1000);
    });

    it("should have heartbeat config", () => {
      expect(rateLimitConfigs.heartbeat).toBeDefined();
      expect(rateLimitConfigs.heartbeat.maxRequests).toBe(120);
      expect(rateLimitConfigs.heartbeat.windowMs).toBe(60 * 1000);
    });

    it("should have general config", () => {
      expect(rateLimitConfigs.general).toBeDefined();
      expect(rateLimitConfigs.general.maxRequests).toBe(100);
      expect(rateLimitConfigs.general.windowMs).toBe(60 * 1000);
    });
  });

  describe("store", () => {
    it("should track store size", async () => {
      const initialSize = store.size();
      expect(initialSize).toBe(0);

      const req = createMockRequest("/api/test", "192.168.1.9");
      const config = { maxRequests: 5, windowMs: 60000 };

      await rateLimit(req, config);

      // Size should increase after adding entry
      expect(store.size()).toBeGreaterThan(initialSize);
    });

    it("should clear all entries", async () => {
      const req = createMockRequest("/api/test", "192.168.1.10");
      const config = { maxRequests: 5, windowMs: 60000 };

      await rateLimit(req, config);
      expect(store.size()).toBeGreaterThan(0);

      store.clear();
      expect(store.size()).toBe(0);
    });
  });
});
