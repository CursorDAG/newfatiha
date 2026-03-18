import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("next-auth");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    course: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("GET /api/admin/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/admin/courses");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("should return all courses for ADMIN", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    const mockCourses = [
      {
        id: "course-1",
        title: "Course 1",
        description: "Description 1",
        capacity: 30,
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        teacherId: "teacher-1",
        teacher: {
          id: "teacher-1",
          name: "Teacher 1",
          email: "teacher1@test.com",
        },
        _count: {
          streams: 3,
        },
      },
    ];

    vi.mocked(prisma.course.findMany).mockResolvedValue(mockCourses as never);

    const req = new NextRequest("http://localhost:3000/api/admin/courses");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.courses).toHaveLength(1);
    expect(data.courses[0].title).toBe("Course 1");
  });

  it("should filter courses by teacherId", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
      expires: "2024-12-31",
    });

    vi.mocked(prisma.course.findMany).mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/admin/courses?teacherId=teacher-1");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { teacherId: "teacher-1" },
      })
    );
  });
});
