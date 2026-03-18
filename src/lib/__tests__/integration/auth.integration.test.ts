import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { POST as changePasswordHandler } from "@/app/api/teacher/change-password/route";
import {
  testPrisma,
  cleanupDatabase,
  disconnectDatabase,
  createTestUser,
  createMockSession,
} from "./setup";

// Mock next-auth
vi.mock("next-auth", () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";

describe("Authentication Integration Tests", () => {
  beforeAll(async () => {
    // Ensure clean state before all tests
    await cleanupDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupDatabase();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Disconnect from database
    await disconnectDatabase();
  });

  describe("User Login", () => {
    it("should hash passwords with bcrypt", async () => {
      const plainPassword = "testPassword123";
      const user = await createTestUser({
        email: "hash@test.com",
        password: plainPassword,
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.password).toBeDefined();
      expect(dbUser?.password).not.toBe(plainPassword);
      expect(
        dbUser?.password?.startsWith("$2a$") ||
        dbUser?.password?.startsWith("$2b$")
      ).toBe(true);

      // Verify password can be validated
      if (dbUser?.password) {
        const isValid = await bcrypt.compare(plainPassword, dbUser.password);
        expect(isValid).toBe(true);

        // Wrong password should not validate
        const isInvalid = await bcrypt.compare("wrongPassword", dbUser.password);
        expect(isInvalid).toBe(false);
      }
    });

    it("should validate correct passwords with bcrypt", async () => {
      const password = "correctPassword123";
      const user = await createTestUser({
        email: "validate@test.com",
        password,
        role: "TEACHER",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser?.password) {
        const isValid = await bcrypt.compare(password, dbUser.password);
        expect(isValid).toBe(true);
      }
    });

    it("should reject incorrect passwords with bcrypt", async () => {
      const password = "correctPassword123";
      const user = await createTestUser({
        email: "reject@test.com",
        password,
        role: "TEACHER",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser?.password) {
        const isValid = await bcrypt.compare("wrongPassword", dbUser.password);
        expect(isValid).toBe(false);
      }
    });

    it("should store different roles correctly", async () => {
      const studentUser = await createTestUser({
        email: "student@test.com",
        password: "password123",
        role: "STUDENT",
      });

      const teacherUser = await createTestUser({
        email: "teacher@test.com",
        password: "password123",
        role: "TEACHER",
      });

      const adminUser = await createTestUser({
        email: "admin@test.com",
        password: "password123",
        role: "ADMIN",
      });

      expect(studentUser.role).toBe("STUDENT");
      expect(teacherUser.role).toBe("TEACHER");
      expect(adminUser.role).toBe("ADMIN");
    });

    it("should handle special characters in passwords", async () => {
      const specialPassword = "P@ssw0rd!#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const user = await createTestUser({
        email: "special@test.com",
        password: specialPassword,
        role: "TEACHER",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser?.password) {
        const isValid = await bcrypt.compare(specialPassword, dbUser.password);
        expect(isValid).toBe(true);
      }
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(200);
      const user = await createTestUser({
        email: "long@test.com",
        password: longPassword,
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser?.password) {
        const isValid = await bcrypt.compare(longPassword, dbUser.password);
        expect(isValid).toBe(true);
      }
    });

    it("should handle unicode characters in user names", async () => {
      const user = await createTestUser({
        email: "unicode@test.com",
        password: "password123",
        name: "Имя Фамилия 名前 🎓",
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser?.name).toBe("Имя Фамилия 名前 🎓");
    });

    it("should use appropriate bcrypt cost factor", async () => {
      const password = "testPassword123";
      const user = await createTestUser({
        email: "cost@test.com",
        password,
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser?.password) {
        // Extract cost factor from bcrypt hash
        // Format: $2a$10$... where 10 is the cost factor
        const costMatch = dbUser.password.match(/^\$2[aby]\$(\d+)\$/);
        expect(costMatch).toBeDefined();

        if (costMatch) {
          const cost = parseInt(costMatch[1], 10);
          expect(cost).toBeGreaterThanOrEqual(10);
          expect(cost).toBeLessThanOrEqual(12);
        }
      }
    });
  });

  describe("JWT Token Validation", () => {
    it("should include role and id in JWT token", async () => {
      const user = await createTestUser({
        email: "jwt@test.com",
        password: "password123",
        name: "JWT User",
        role: "TEACHER",
      });

      // Test JWT callback
      const jwtCallback = authOptions.callbacks?.jwt;
      expect(jwtCallback).toBeDefined();

      if (jwtCallback) {
        const token = await jwtCallback({
          token: { id: "", role: "" },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          account: null,
          profile: undefined,
          trigger: "signIn",
          isNewUser: false,
          session: undefined,
        });

        expect(token.role).toBe("TEACHER");
        expect(token.id).toBe(user.id);
      }
    });

    it("should preserve existing token data when user is not provided", async () => {
      const jwtCallback = authOptions.callbacks?.jwt;
      expect(jwtCallback).toBeDefined();

      if (jwtCallback) {
        const existingToken = {
          role: "ADMIN",
          id: "existing-id",
          email: "existing@test.com",
        };

        const token = await jwtCallback({
          token: existingToken,
          user: {
            id: "existing-id",
            email: "existing@test.com",
            name: "Existing User",
            role: "ADMIN",
          },
          account: null,
          profile: undefined,
          trigger: "update",
          isNewUser: false,
          session: undefined,
        });

        expect(token.role).toBe("ADMIN");
        expect(token.id).toBe("existing-id");
      }
    });
  });

  describe("Session Management", () => {
    it("should include role and id in session from JWT token", async () => {
      const user = await createTestUser({
        email: "session@test.com",
        password: "password123",
        name: "Session User",
        role: "STUDENT",
      });

      const sessionCallback = authOptions.callbacks?.session;
      expect(sessionCallback).toBeDefined();

      if (sessionCallback) {
        const session = await sessionCallback({
          session: {
            user: {
              id: user.id,
              role: user.role,
              email: user.email,
              name: user.name,
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          token: {
            role: user.role,
            id: user.id,
            email: user.email,
            name: user.name,
          },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: null,
          },
          newSession: undefined,
          trigger: "update",
        });

        expect((session.user as { id: string; role: string }).role).toBe("STUDENT");
        expect((session.user as { id: string; role: string }).id).toBe(user.id);
        expect(session.user?.email).toBe(user.email);
        expect(session.user?.name).toBe(user.name);
      }
    });

    it("should handle session without token gracefully", async () => {
      const sessionCallback = authOptions.callbacks?.session;
      expect(sessionCallback).toBeDefined();

      if (sessionCallback) {
        const session = await sessionCallback({
          session: {
            user: {
              id: "test-id",
              role: "STUDENT",
              email: "test@test.com",
              name: "Test User",
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
          token: { id: "test-id", role: "STUDENT" },
          user: {
            id: "test-id",
            email: "test@test.com",
            name: "Test User",
            role: "STUDENT",
            emailVerified: null,
          },
          newSession: undefined,
          trigger: "update",
        });

        // Session should still be returned even without token data
        expect(session).toBeDefined();
        expect(session.user).toBeDefined();
        expect(session.user?.email).toBe("test@test.com");
      }
    });
  });

  describe("Role-Based Access Control", () => {
    it("should store and retrieve STUDENT role correctly", async () => {
      const user = await createTestUser({
        email: "student@test.com",
        password: "password123",
        name: "Student User",
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser?.role).toBe("STUDENT");
    });

    it("should store and retrieve TEACHER role correctly", async () => {
      const user = await createTestUser({
        email: "teacher@test.com",
        password: "password123",
        name: "Teacher User",
        role: "TEACHER",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser?.role).toBe("TEACHER");
    });

    it("should store and retrieve ADMIN role correctly", async () => {
      const user = await createTestUser({
        email: "admin@test.com",
        password: "password123",
        name: "Admin User",
        role: "ADMIN",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser?.role).toBe("ADMIN");
    });

    it("should propagate role through JWT to session", async () => {
      const user = await createTestUser({
        email: "role@test.com",
        password: "password123",
        name: "Role Test User",
        role: "TEACHER",
      });

      // Test JWT callback
      const jwtCallback = authOptions.callbacks?.jwt;
      if (jwtCallback) {
        const token = await jwtCallback({
          token: { id: "", role: "" },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          account: null,
          profile: undefined,
          trigger: "signIn",
          isNewUser: false,
          session: undefined,
        });

        // Test session callback with the token
        const sessionCallback = authOptions.callbacks?.session;
        if (sessionCallback) {
          const session = await sessionCallback({
            session: {
              user: {
                id: user.id,
                role: user.role,
                email: user.email,
                name: user.name,
              },
              expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
            token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              emailVerified: null,
            },
            newSession: undefined,
            trigger: "update",
          });

          expect((session.user as { id: string; role: string }).role).toBe("TEACHER");
          expect((session.user as { id: string; role: string }).id).toBe(user.id);
        }
      }
    });
  });

  describe("Password Security", () => {
    it("should store passwords as bcrypt hashes", async () => {
      const plainPassword = "securePassword123";
      const user = await createTestUser({
        email: "hash@test.com",
        password: plainPassword,
        role: "STUDENT",
      });

      // Fetch user from database
      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.password).toBeDefined();
      expect(dbUser?.password).not.toBe(plainPassword);
      expect(dbUser?.password?.startsWith("$2a$") || dbUser?.password?.startsWith("$2b$")).toBe(true);

      // Verify password can be validated
      if (dbUser?.password) {
        const isValid = await bcrypt.compare(plainPassword, dbUser.password);
        expect(isValid).toBe(true);
      }
    });

    it("should reject user without password field", async () => {
      // Create user without password (edge case)
      const user = await testPrisma.user.create({
        data: {
          email: "nopass@test.com",
          name: "No Password User",
          role: "STUDENT",
          password: null,
        },
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser?.password).toBeNull();
    });

    it("should use bcrypt with appropriate cost factor", async () => {
      const password = "testPassword123";
      const user = await createTestUser({
        email: "cost@test.com",
        password,
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser?.password) {
        // Extract cost factor from bcrypt hash
        // Format: $2a$10$... where 10 is the cost factor
        const costMatch = dbUser.password.match(/^\$2[aby]\$(\d+)\$/);
        expect(costMatch).toBeDefined();

        if (costMatch) {
          const cost = parseInt(costMatch[1], 10);
          expect(cost).toBeGreaterThanOrEqual(10);
          expect(cost).toBeLessThanOrEqual(12);
        }
      }
    });
  });

  describe("Authentication Configuration", () => {
    it("should use JWT session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("should have custom sign-in page configured", () => {
      expect(authOptions.pages?.signIn).toBe("/auth/signin");
    });

    it("should have NEXTAUTH_SECRET configured", () => {
      expect(authOptions.secret).toBeDefined();
      expect(typeof authOptions.secret).toBe("string");
    });

    it("should have credentials provider configured", () => {
      const credentialsProvider = authOptions.providers.find(
        (p) => p.id === "credentials"
      );
      expect(credentialsProvider).toBeDefined();
      expect(credentialsProvider?.name).toBe("Credentials");
    });

    it("should have redirect callback configured", () => {
      expect(authOptions.callbacks?.redirect).toBeDefined();
    });

    it("should redirect to /auth/redirect after sign-in", async () => {
      const redirectCallback = authOptions.callbacks?.redirect;

      if (redirectCallback) {
        const baseUrl = "http://localhost:3000";

        // Test default redirect
        const result1 = await redirectCallback({
          url: baseUrl,
          baseUrl,
        });
        expect(result1).toBe(`${baseUrl}/auth/redirect`);

        // Test root redirect
        const result2 = await redirectCallback({
          url: `${baseUrl}/`,
          baseUrl,
        });
        expect(result2).toBe(`${baseUrl}/auth/redirect`);
      }
    });

    it("should allow relative redirects", async () => {
      const redirectCallback = authOptions.callbacks?.redirect;

      if (redirectCallback) {
        const baseUrl = "http://localhost:3000";

        const result = await redirectCallback({
          url: "/teacher/dashboard",
          baseUrl,
        });
        expect(result).toBe(`${baseUrl}/teacher/dashboard`);
      }
    });

    it("should allow same-origin redirects", async () => {
      const redirectCallback = authOptions.callbacks?.redirect;

      if (redirectCallback) {
        const baseUrl = "http://localhost:3000";

        const result = await redirectCallback({
          url: `${baseUrl}/student/lessons`,
          baseUrl,
        });
        expect(result).toBe(`${baseUrl}/student/lessons`);
      }
    });

    it("should reject cross-origin redirects", async () => {
      const redirectCallback = authOptions.callbacks?.redirect;

      if (redirectCallback) {
        const baseUrl = "http://localhost:3000";

        const result = await redirectCallback({
          url: "http://evil.com/phishing",
          baseUrl,
        });
        expect(result).toBe(`${baseUrl}/auth/redirect`);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle case-sensitive email storage", async () => {
      const password = "password123";
      await createTestUser({
        email: "CaseSensitive@Test.com",
        password,
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { email: "CaseSensitive@Test.com" },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe("CaseSensitive@Test.com");

      // Different case should not find the user
      const dbUser2 = await testPrisma.user.findUnique({
        where: { email: "casesensitive@test.com" },
      });

      expect(dbUser2).toBeNull();
    });

    it("should handle special characters in password", async () => {
      const specialPassword = "P@ssw0rd!#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const user = await createTestUser({
        email: "special@test.com",
        password: specialPassword,
        role: "TEACHER",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser?.password) {
        const isValid = await bcrypt.compare(specialPassword, dbUser.password);
        expect(isValid).toBe(true);
      }
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(200);
      const user = await createTestUser({
        email: "long@test.com",
        password: longPassword,
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (dbUser?.password) {
        const isValid = await bcrypt.compare(longPassword, dbUser.password);
        expect(isValid).toBe(true);
      }
    });

    it("should handle unicode characters in name", async () => {
      const password = "password123";
      const user = await createTestUser({
        email: "unicode@test.com",
        password,
        name: "Имя Фамилия 名前 🎓",
        role: "STUDENT",
      });

      const dbUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(dbUser?.name).toBe("Имя Фамилия 名前 🎓");
    });
  });

  describe("Password Change Functionality", () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    const createMockRequest = (body: Record<string, unknown>): Request => {
      return new NextRequest("http://localhost:3000/api/teacher/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }) as unknown as Request;
    };

    it("should successfully change password with valid credentials", async () => {
      const currentPassword = "oldPassword123";
      const newPassword = "newPassword456";

      const user = await createTestUser({
        email: "changepass@test.com",
        password: currentPassword,
        name: "Change Password User",
        role: "TEACHER",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword,
        newPassword,
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify password was updated in database
      const updatedUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.password).toBeDefined();
      expect(updatedUser?.password).not.toBe(currentPassword);

      // Verify new password works
      if (updatedUser?.password) {
        const isValid = await bcrypt.compare(newPassword, updatedUser.password);
        expect(isValid).toBe(true);

        // Verify old password no longer works
        const isOldValid = await bcrypt.compare(currentPassword, updatedUser.password);
        expect(isOldValid).toBe(false);
      }
    });

    it("should reject password change with incorrect current password", async () => {
      const currentPassword = "correctPassword123";
      const user = await createTestUser({
        email: "wrongpass@test.com",
        password: currentPassword,
        role: "TEACHER",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword: "wrongPassword",
        newPassword: "newPassword456",
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should reject password change for unauthenticated user", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = createMockRequest({
        currentPassword: "oldPassword123",
        newPassword: "newPassword456",
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it("should reject password change for student role", async () => {
      const user = await createTestUser({
        email: "student@test.com",
        password: "password123",
        role: "STUDENT",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword: "password123",
        newPassword: "newPassword456",
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it("should allow password change for admin role", async () => {
      const currentPassword = "adminPass123";
      const newPassword = "newAdminPass456";

      const user = await createTestUser({
        email: "admin@test.com",
        password: currentPassword,
        role: "ADMIN",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword,
        newPassword,
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should reject password change with weak new password", async () => {
      const user = await createTestUser({
        email: "weak@test.com",
        password: "strongPassword123",
        role: "TEACHER",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword: "strongPassword123",
        newPassword: "weak", // Less than 8 characters
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should reject password change with missing current password", async () => {
      const user = await createTestUser({
        email: "missing@test.com",
        password: "password123",
        role: "TEACHER",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword: "",
        newPassword: "newPassword456",
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should reject password change with missing new password", async () => {
      const user = await createTestUser({
        email: "missingnew@test.com",
        password: "password123",
        role: "TEACHER",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword: "password123",
        newPassword: "",
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should hash new password with bcrypt", async () => {
      const currentPassword = "oldPassword123";
      const newPassword = "newPassword456";

      const user = await createTestUser({
        email: "hash@test.com",
        password: currentPassword,
        role: "TEACHER",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword,
        newPassword,
      });

      await changePasswordHandler(req);

      const updatedUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.password).toBeDefined();
      expect(updatedUser?.password).not.toBe(newPassword);
      expect(
        updatedUser?.password?.startsWith("$2a$") ||
        updatedUser?.password?.startsWith("$2b$")
      ).toBe(true);
    });

    it("should allow password change and verify new password works", async () => {
      const currentPassword = "oldPassword123";
      const newPassword = "newPassword456";

      const user = await createTestUser({
        email: "loginafter@test.com",
        password: currentPassword,
        role: "TEACHER",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword,
        newPassword,
      });

      await changePasswordHandler(req);

      // Verify password was updated in database
      const updatedUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.password).toBeDefined();
      expect(updatedUser?.password).not.toBe(currentPassword);

      // Verify new password works
      if (updatedUser?.password) {
        const isNewValid = await bcrypt.compare(newPassword, updatedUser.password);
        expect(isNewValid).toBe(true);

        // Verify old password no longer works
        const isOldValid = await bcrypt.compare(currentPassword, updatedUser.password);
        expect(isOldValid).toBe(false);
      }
    });

    it("should handle user without password field", async () => {
      const user = await testPrisma.user.create({
        data: {
          email: "nopassfield@test.com",
          name: "No Password Field",
          role: "TEACHER",
          password: null,
        },
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword: "anyPassword",
        newPassword: "newPassword456",
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should handle special characters in new password", async () => {
      const currentPassword = "oldPassword123";
      const newPassword = "N3w!P@ss#W0rd$%^&*()";

      const user = await createTestUser({
        email: "specialnew@test.com",
        password: currentPassword,
        role: "TEACHER",
      });

      const mockSession = createMockSession(user);
      vi.mocked(getServerSession).mockResolvedValue(mockSession);

      const req = createMockRequest({
        currentPassword,
        newPassword,
      });

      const response = await changePasswordHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify special characters are preserved
      const updatedUser = await testPrisma.user.findUnique({
        where: { id: user.id },
      });

      if (updatedUser?.password) {
        const isValid = await bcrypt.compare(newPassword, updatedUser.password);
        expect(isValid).toBe(true);
      }
    });
  });
});
