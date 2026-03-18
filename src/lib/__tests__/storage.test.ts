import { describe, it, expect, beforeEach } from "vitest";
import {
  generateVoiceKey,
  getExtensionFromMimeType,
  isStorageConfigured,
} from "../storage";

describe("storage", () => {
  describe("generateVoiceKey", () => {
    it("should generate keys with correct format", () => {
      const quizId = "quiz-123";
      const studentId = "student-456";
      const extension = "webm";

      const key = generateVoiceKey(quizId, studentId, extension);

      expect(key).toMatch(/^voice-recordings\/quiz-123\/student-456-\d+\.webm$/);
      expect(key).toContain("quiz-123");
      expect(key).toContain("student-456");
      expect(key).toContain(".webm");
    });

    it("should handle different extensions", () => {
      const key = generateVoiceKey("quiz-1", "student-1", "mp3");
      expect(key).toMatch(/\.mp3$/);
    });
  });

  describe("getExtensionFromMimeType", () => {
    it("should map common audio MIME types", () => {
      expect(getExtensionFromMimeType("audio/webm")).toBe("webm");
      expect(getExtensionFromMimeType("audio/ogg")).toBe("ogg");
      expect(getExtensionFromMimeType("audio/mp4")).toBe("m4a");
      expect(getExtensionFromMimeType("audio/mpeg")).toBe("mp3");
      expect(getExtensionFromMimeType("audio/wav")).toBe("wav");
    });

    it("should return default extension for unknown MIME types", () => {
      expect(getExtensionFromMimeType("audio/unknown")).toBe("webm");
      expect(getExtensionFromMimeType("video/mp4")).toBe("webm");
    });
  });

  describe("isStorageConfigured", () => {
    beforeEach(() => {
      // Clear environment variables
      delete process.env.S3_BUCKET;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;
    });

    it("should return false when storage is not configured", () => {
      expect(isStorageConfigured()).toBe(false);
    });

    it("should return false when only bucket is set", () => {
      process.env.S3_BUCKET = "test-bucket";
      expect(isStorageConfigured()).toBe(false);
    });

    it("should return false when only credentials are set", () => {
      process.env.S3_ACCESS_KEY_ID = "key";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      expect(isStorageConfigured()).toBe(false);
    });

    it("should return true when all required variables are set", () => {
      process.env.S3_BUCKET = "test-bucket";
      process.env.S3_ACCESS_KEY_ID = "key";
      process.env.S3_SECRET_ACCESS_KEY = "secret";
      expect(isStorageConfigured()).toBe(true);
    });
  });
});
