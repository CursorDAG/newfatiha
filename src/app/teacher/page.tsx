import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import TeacherDashboard from "@/components/TeacherDashboard"
import { getJitsiConfig } from "@/lib/jitsi-jwt"

export default async function TeacherPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    redirect("/api/auth/signin")
  }

  // Fetch Teacher's streams along with enrolled students
  const streams = await prisma.stream.findMany({
    where: { teacherId: session.user.id },
    include: {
      enrollments: {
        include: {
          user: true
        }
      },
      lessons: {
        orderBy: { sortOrder: "asc" },
        take: 50,
      },
      inviteToken: {
        select: { token: true }
      }
    }
  })

  // Fetch Teacher's courses with stats
  const courses = await prisma.course.findMany({
    where: { teacherId: session.user.id },
    include: {
      streams: {
        include: {
          enrollments: { select: { id: true } },
          _count: { select: { enrollments: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Serialize to pass to the Client Component
  const serializedStreams = streams.map(s => ({
    id: s.id,
    name: s.name,
    level: s.level,
    schedule: s.schedule,
    color: s.color,
    courseId: s.courseId,
    inviteToken: s.inviteToken ? { token: s.inviteToken.token } : null,
    enrollments: s.enrollments.map(e => ({
      id: e.id,
      userId: e.userId,
      status: e.status,
      name: e.user.name,
    })),
    lessons: s.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      content: l.content,
      sortOrder: l.sortOrder,
      teacherNotes: l.teacherNotes,
      published: l.published,
      createdAt: l.createdAt.toISOString(),
    })),
  }))

  const serializedCourses = courses.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    capacity: c.capacity,
    published: c.published,
    streamCount: c.streams.length,
    studentCount: c.streams.reduce((acc, stream) => acc + stream._count.enrollments, 0),
    streams: c.streams.map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      schedule: s.schedule,
      studentCount: s._count.enrollments,
    })),
  }))

  // Get Jitsi configuration
  const jitsiConfig = getJitsiConfig()
  const jitsiDomain = jitsiConfig?.domain ?? "meet.jit.si"

  return (
    <TeacherDashboard
      initialStreams={serializedStreams}
      initialCourses={serializedCourses}
      jitsiDomain={jitsiDomain}
      teacherId={session.user.id}
      teacherName={session.user.name ?? "Teacher"}
      teacherEmail={session.user.email ?? ""}
    />
  )
}
