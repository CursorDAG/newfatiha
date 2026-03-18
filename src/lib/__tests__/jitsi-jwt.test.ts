import { describe, it, expect, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import { generateJitsiToken, getJitsiConfig, isJitsiJwtEnabled } from "../jitsi-jwt";

interface JwtPayload {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  nbf: number;
  room: string;
  context: {
    user: {
      id: string;
      name: string;
      email: string;
      moderator: boolean;
    };
    features: {
      livestreaming: boolean;
      recording: boolean;
      transcription: boolean;
    };
  };
}

describe("jitsi-jwt", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("getJitsiConfig", () => {
    it("should return null when environment variables are not set", () => {
      delete process.env.JITSI_DOMAIN;
      delete process.env.JITSI_JWT_APP_ID;
      delete process.env.JITSI_JWT_SECRET;

      const config = getJitsiConfig();
      expect(config).toBeNull();
    });

    it("should return null when only some variables are set", () => {
      process.env.JITSI_DOMAIN = "meet.example.com";
      process.env.JITSI_JWT_APP_ID = "test-app";
      delete process.env.JITSI_JWT_SECRET;

      const config = getJitsiConfig();
      expect(config).toBeNull();
    });

    it("should return config when all variables are set", () => {
      process.env.JITSI_DOMAIN = "meet.example.com";
      process.env.JITSI_JWT_APP_ID = "test-app";
      process.env.JITSI_JWT_SECRET = "test-secret";

      const config = getJitsiConfig();
      expect(config).toEqual({
        domain: "meet.example.com",
        appId: "test-app",
        secret: "test-secret",
      });
    });
  });

  describe("isJitsiJwtEnabled", () => {
    it("should return false when config is not available", () => {
      delete process.env.JITSI_DOMAIN;
      delete process.env.JITSI_JWT_APP_ID;
      delete process.env.JITSI_JWT_SECRET;

      expect(isJitsiJwtEnabled()).toBe(false);
    });

    it("should return true when config is available", () => {
      process.env.JITSI_DOMAIN = "meet.example.com";
      process.env.JITSI_JWT_APP_ID = "test-app";
      process.env.JITSI_JWT_SECRET = "test-secret";

      expect(isJitsiJwtEnabled()).toBe(true);
    });
  });

  describe("generateJitsiToken", () => {
    const config = {
      domain: "meet.example.com",
      appId: "test-app",
      secret: "test-secret-key-for-signing",
    };

    const user = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
      role: "participant" as const,
    };

    it("should generate a valid JWT token", () => {
      const token = generateJitsiToken("room-123", user, config);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      // Verify token can be decoded
      const decoded = jwt.verify(token, config.secret) as JwtPayload;
      expect(decoded).toBeTruthy();
    });

    it("should include correct standard JWT claims", () => {
      const token = generateJitsiToken("room-123", user, config);
      const decoded = jwt.verify(token, config.secret) as JwtPayload;

      expect(decoded.iss).toBe(config.appId);
      expect(decoded.aud).toBe("jitsi");
      expect(decoded.sub).toBe(config.domain);
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(decoded.nbf).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });

    it("should include correct room name", () => {
      const roomName = "test-room-456";
      const token = generateJitsiToken(roomName, user, config);
      const decoded = jwt.verify(token, config.secret) as JwtPayload;

      expect(decoded.room).toBe(roomName);
    });

    it("should include user context for participant", () => {
      const token = generateJitsiToken("room-123", user, config);
      const decoded = jwt.verify(token, config.secret) as JwtPayload;

      expect(decoded.context.user.id).toBe(user.id);
      expect(decoded.context.user.name).toBe(user.name);
      expect(decoded.context.user.email).toBe(user.email);
      expect(decoded.context.user.moderator).toBe(false);
    });

    it("should set moderator flag for teacher role", () => {
      const teacher = { ...user, role: "moderator" as const };
      const token = generateJitsiToken("room-123", teacher, config);
      const decoded = jwt.verify(token, config.secret) as JwtPayload;

      expect(decoded.context.user.moderator).toBe(true);
    });

    it("should grant livestreaming and recording to moderators only", () => {
      const participantToken = generateJitsiToken("room-123", user, config);
      const participantDecoded = jwt.verify(participantToken, config.secret) as JwtPayload;

      expect(participantDecoded.context.features.livestreaming).toBe(false);
      expect(participantDecoded.context.features.recording).toBe(false);

      const moderator = { ...user, role: "moderator" as const };
      const moderatorToken = generateJitsiToken("room-123", moderator, config);
      const moderatorDecoded = jwt.verify(moderatorToken, config.secret) as JwtPayload;

      expect(moderatorDecoded.context.features.livestreaming).toBe(true);
      expect(moderatorDecoded.context.features.recording).toBe(true);
    });

    it("should disable transcription for all users", () => {
      const token = generateJitsiToken("room-123", user, config);
      const decoded = jwt.verify(token, config.secret) as JwtPayload;

      expect(decoded.context.features.transcription).toBe(false);
    });

    it("should generate token valid for 24 hours", () => {
      const token = generateJitsiToken("room-123", user, config);
      const decoded = jwt.verify(token, config.secret) as JwtPayload;

      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 60 * 60 * 24;

      // Allow 5 seconds tolerance for test execution time
      expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp - 5);
      expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5);
    });

    it("should throw error with invalid secret", () => {
      const token = generateJitsiToken("room-123", user, config);

      expect(() => {
        jwt.verify(token, "wrong-secret");
      }).toThrow();
    });

    it("should use HS256 algorithm", () => {
      const token = generateJitsiToken("room-123", user, config);
      const decoded = jwt.decode(token, { complete: true }) as jwt.Jwt | null;

      expect(decoded?.header.alg).toBe("HS256");
    });
  });
});
