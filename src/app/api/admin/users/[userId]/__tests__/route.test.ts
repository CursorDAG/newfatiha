import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "../route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("next-auth");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
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

describe("GET /api/admin/users/[userId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1");
    const response = await GET(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(401);
  });

  it("should return 404 if user not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1");
    const response = await GET(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(404);
  });

  it("should return user profile for ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    const mockUser = {
      id: "user-1",
      email: "student@test.com",
      name: "Student",
      role: "STUDENT",
      gender: "MALE",
      isBlocked: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      password: "hashed",
      avatar: null,
      bio: null,
      skills: [],
      enrollments: [],
      courses: [],
      activitySessions: [],
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1");
    const response = await GET(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.id).toBe("user-1");
  });
});

describe("PATCH /api/admin/users/[userId]", () => {
  it("should update user successfully", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    const updatedUser = {
      id: "user-1",
      email: "newemail@test.com",
      name: "New Name",
      role: "TEACHER",
      gender: "MALE",
      isBlocked: false,
      updatedAt: new Date(),
    };

    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as never);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name", email: "newemail@test.com" }),
    });

    const response = await PATCH(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.name).toBe("New Name");
  });
});

describe("DELETE /api/admin/users/[userId]", () => {
  it("should soft delete user", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const req = new NextRequest("http://localhost:3000/api/admin/users/user-1", {
      method: "DELETE",
    });

    const response = await DELETE(req, { params: Promise.resolve({ userId: "user-1" }) });

    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      })
    );
  });
});
