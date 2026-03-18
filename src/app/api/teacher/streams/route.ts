import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isValidSlot, overlaps, slotsToScheduleText, type SlotInput } from "@/lib/schedule";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

type CreateStreamBody = {
  courseId?: string;
  name?: string;
  level?: string;
  scheduleText?: string;
  slots?: SlotInput[];
  color?: string;
};

const STREAM_COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
];

function isHexColor(input: string) {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(input);
}

function pickRandomColor() {
  return STREAM_COLOR_PALETTE[Math.floor(Math.random() * STREAM_COLOR_PALETTE.length)];
}

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const streams = await prisma.stream.findMany({
    where: { teacherId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, streams });
});

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = (await req.json().catch(() => null)) as CreateStreamBody | null;
  if (!body) {
    throw new ValidationError("Invalid JSON");
  }

  const { courseId, name, level, scheduleText, slots, color } = body;
  if (!courseId || !name?.trim() || !level?.trim()) {
    const errors: Record<string, string> = {};
    if (!courseId) errors.courseId = "Course ID is required";
    if (!name?.trim()) errors.name = "Name is required";
    if (!level?.trim()) errors.level = "Level is required";
    throw new ValidationError("courseId, name, level обязательны", errors);
  }

  const inputSlots = Array.isArray(slots) ? slots : [];
  if (!inputSlots.length) {
    throw new ValidationError("Выберите хотя бы один слот расписания", {
      slots: "At least one schedule slot is required",
    });
  }
  if (!inputSlots.every(isValidSlot)) {
    throw new ValidationError("Некорректные слоты расписания", {
      slots: "Invalid schedule slots",
    });
  }
  // prevent self-overlaps
  for (let i = 0; i < inputSlots.length; i++) {
    for (let j = i + 1; j < inputSlots.length; j++) {
      if (overlaps(inputSlots[i], inputSlots[j])) {
        throw new ValidationError("Слоты текущего потока пересекаются между собой", {
          slots: "Schedule slots overlap with each other",
        });
      }
    }
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true },
  });
  if (!course) {
    throw new NotFoundError("Курс не найден");
  }
  if (session.user.role !== "ADMIN" && course.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this course");
  }

  // check conflicts against other streams of teacher
  const existing = await prisma.streamScheduleSlot.findMany({
    where: { stream: { teacherId: session.user.id } },
    include: { stream: { select: { id: true, name: true } } },
  });
  for (const proposed of inputSlots) {
    for (const ex of existing) {
      if (
        overlaps(proposed, {
          dayOfWeek: ex.dayOfWeek,
          startMinutes: ex.startMinutes,
          durationMinutes: ex.durationMinutes,
        })
      ) {
        throw new ConflictError(`Конфликт расписания: слот пересекается с потоком «${ex.stream.name}»`);
      }
    }
  }

  const computedText = scheduleText?.trim() || slotsToScheduleText(inputSlots);
  const computedColor =
    typeof color === "string" && isHexColor(color.trim()) ? color.trim() : pickRandomColor();

  const stream = await prisma.$transaction(async (tx) => {
    const created = await tx.stream.create({
      data: {
        courseId: course.id,
        teacherId: session.user.id,
        name: name.trim(),
        level: level.trim(),
        schedule: computedText,
        color: computedColor,
      },
    });
    await tx.streamScheduleSlot.createMany({
      data: inputSlots.map((s) => ({
        streamId: created.id,
        dayOfWeek: s.dayOfWeek,
        startMinutes: s.startMinutes,
        durationMinutes: s.durationMinutes,
      })),
    });
    return created;
  });

  return NextResponse.json({ success: true, stream });
});

