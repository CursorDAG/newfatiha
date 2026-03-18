import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("next-auth");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/users");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("should return 401 if user is not ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "student@test.com", role: "STUDENT" },
      expires: "2024-12-31",
    });

    const req = new NextRequest("http://localhost:3000/api/admin/users");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("should return users list with default pagination", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    const mockUsers = [
      {
        id: "user-1",
        email: "student1@test.com",
        name: "Student 1",
        role: "STUDENT",
        gender: "MALE",
        isBlocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "user-2",
        email: "teacher1@test.com",
        name: "Teacher 1",
        role: "TEACHER",
        gender: "FEMALE",
        isBlocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);
    vi.mocked(prisma.user.count).mockResolvedValue(2);

    const req = new NextRequest("http://localhost:3000/api/admin/users");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.users).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(data.limit).toBe(50);
    expect(data.offset).toBe(0);
  });

  it("should filter users by role", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    const req = new NextRequest("http://localhost:3000/api/admin/users?role=TEACHER");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "TEACHER",
        }),
      })
    );
  });

  it("should filter users by blocked status", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    const req = new NextRequest("http://localhost:3000/api/admin/users?isBlocked=true");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isBlocked: true,
        }),
      })
    );
  });

  it("should search users by email or name", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    const req = new NextRequest("http://localhost:3000/api/admin/users?search=john");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { email: { contains: "john", mode: "insensitive" } },
            { name: { contains: "john", mode: "insensitive" } },
          ]),
        }),
      })
    );
  });
});
