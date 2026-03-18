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

describe("POST /api/admin/users/[userId]/unblock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1/unblock", {
      method: "POST",
    });
    const response = await POST(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(401);
  });

  it("should unblock user successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    const unblockedUser = {
      id: "user-1",
      email: "student@test.com",
      name: "Student",
      isBlocked: false,
    };

    vi.mocked(prisma.user.update).mockResolvedValue(unblockedUser as never);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1/unblock", {
      method: "POST",
    });
    const response = await POST(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.isBlocked).toBe(false);
  });
});
