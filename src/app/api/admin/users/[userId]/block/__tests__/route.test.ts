import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("next-auth");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("POST /api/admin/users/[userId]/block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1/block", {
      method: "POST",
    });
    const response = await POST(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(401);
  });

  it("should return 401 if user is not ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "teacher@test.com", role: "TEACHER" },
      expires: "2024-12-31",
    });

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1/block", {
      method: "POST",
    });
    const response = await POST(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(401);
  });

  it("should block user successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    const blockedUser = {
      id: "user-1",
      email: "student@test.com",
      name: "Student",
      isBlocked: true,
    };

    vi.mocked(prisma.user.update).mockResolvedValue(blockedUser as never);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1/block", {
      method: "POST",
    });
    const response = await POST(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.isBlocked).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { isBlocked: true },
      })
    );
  });
});
