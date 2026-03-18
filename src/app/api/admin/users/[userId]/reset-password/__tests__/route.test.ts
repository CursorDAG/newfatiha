import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

vi.mock("next-auth");
vi.mock("bcryptjs");
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

describe("POST /api/admin/users/[userId]/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1/reset-password", {
      method: "POST",
    });
    const response = await POST(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(401);
  });

  it("should generate temporary password and update user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    vi.mocked(bcrypt.hash).mockResolvedValue("hashed_temp_password" as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1/reset-password", {
      method: "POST",
    });
    const response = await POST(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.temporaryPassword).toBeDefined();
    expect(data.temporaryPassword).toHaveLength(8);
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { password: "hashed_temp_password" },
      })
    );
  });
});
