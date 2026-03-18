import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

// Mock dependencies
vi.mock("next-auth");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    course: {
      count: vi.fn(),
    },
    stream: {
      count: vi.fn(),
    },
    lesson: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    activitySession: {
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

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/dashboard");
    const response = await GET(req);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 if user is not ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "teacher@test.com", role: "TEACHER" },
      expires: "2024-12-31",
    });

    const req = new NextRequest("http://localhost:3000/api/admin/dashboard");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("should return dashboard metrics for ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    // Mock Prisma responses
    vi.mocked(prisma.user.count).mockResolvedValueOnce(100); // total users
    vi.mocked(prisma.user.groupBy).mockResolvedValueOnce([
      { role: "STUDENT", _count: 80 },
      { role: "TEACHER", _count: 15 },
      { role: "ADMIN", _count: 5 },
    ] as never);
    vi.mocked(prisma.user.count).mockResolvedValueOnce(2); // blocked users
    vi.mocked(prisma.user.count).mockResolvedValueOnce(50); // active 7 days
    vi.mocked(prisma.user.count).mockResolvedValueOnce(75); // active 30 days
    vi.mocked(prisma.course.count).mockResolvedValue(10);
    vi.mocked(prisma.stream.count).mockResolvedValueOnce(25);
    vi.mocked(prisma.stream.count).mockResolvedValueOnce(20); // active streams
    vi.mocked(prisma.lesson.count).mockResolvedValue(150);
    vi.mocked(prisma.lesson.groupBy).mockResolvedValue([
      { type: "LIVE", _count: 50 },
      { type: "VIDEO", _count: 60 },
      { type: "TEXT", _count: 40 },
    ] as never);
    vi.mocked(prisma.activitySession.count).mockResolvedValue(5);

    const req = new NextRequest("http://localhost:3000/api/admin/dashboard");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.users.total).toBe(100);
    expect(data.users.byRole.STUDENT).toBe(80);
    expect(data.users.byRole.TEACHER).toBe(15);
    expect(data.users.blocked).toBe(2);
    expect(data.courses.total).toBe(10);
    expect(data.streams.total).toBe(25);
    expect(data.lessons.total).toBe(150);
    expect(data.jitsi.activeSessions).toBe(5);
  });
});
