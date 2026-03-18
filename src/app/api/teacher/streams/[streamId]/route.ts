import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

type SlotInput = {
  dayOfWeek: number;
  startMinutes: number;
  durationMinutes: number;
};

type UpdateStreamBody = {
  courseId?: string;
  name?: string;
  level?: string;
  scheduleText?: string;
  slots?: SlotInput[];
  color?: string;
};

function isHexColor(input: string) {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(input);
}

function isValidSlot(slot: SlotInput) {
  return (
    Number.isInteger(slot.dayOfWeek) &&
    slot.dayOfWeek >= 0 &&
    slot.dayOfWeek <= 6 &&
    Number.isInteger(slot.startMinutes) &&
    slot.startMinutes >= 0 &&
    slot.startMinutes < 24 * 60 &&
    Number.isInteger(slot.durationMinutes) &&
    slot.durationMinutes > 0 &&
    slot.durationMinutes % 30 === 0 &&
    slot.startMinutes + slot.durationMinutes <= 24 * 60
  );
}

function slotsToScheduleText(slots: SlotInput[]) {
  if (!slots.length) return "";
  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const toTime = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const normalized = [...slots].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinutes - b.startMinutes
  );
  return normalized
    .map((s) => `${dayNames[s.dayOfWeek]} ${toTime(s.startMinutes)}–${toTime(s.startMinutes + s.durationMinutes)}`)
    .join(", ");
}

function overlaps(a: SlotInput, b: SlotInput) {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  const aEnd = a.startMinutes + a.durationMinutes;
  const bEnd = b.startMinutes + b.durationMinutes;
  return a.startMinutes < bEnd && b.startMinutes < aEnd;
}

function sameSlots(a: SlotInput[], b: SlotInput[]) {
  if (a.length !== b.length) return false;
  const normalize = (slots: SlotInput[]) =>
    [...slots]
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startMinutes: s.startMinutes,
        durationMinutes: s.durationMinutes,
      }))
      .sort(
        (x, y) =>
          x.dayOfWeek - y.dayOfWeek ||
          x.startMinutes - y.startMinutes ||
          x.durationMinutes - y.durationMinutes,
      );
  const na = normalize(a);
  const nb = normalize(b);
  for (let i = 0; i < na.length; i++) {
    if (
      na[i].dayOfWeek !== nb[i].dayOfWeek ||
      na[i].startMinutes !== nb[i].startMinutes ||
      na[i].durationMinutes !== nb[i].durationMinutes
    ) {
      return false;
    }
  }
  return true;
}

export const PATCH = withErrorHandling(async (
  req: Request,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const params = await context!.params;
  const streamId = params.streamId;

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    select: { id: true, teacherId: true, courseId: true },
  });
  if (!stream) {
    throw new NotFoundError("Поток не найден");
  }
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
  }

  const body = (await req.json().catch(() => null)) as UpdateStreamBody | null;
  if (!body) {
    throw new ValidationError("Invalid JSON");
  }

  const data: UpdateStreamBody = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.level === "string" && body.level.trim()) data.level = body.level.trim();
  if (typeof body.color === "string" && body.color.trim()) {
    const c = body.color.trim();
    if (!isHexColor(c)) {
      throw new ValidationError("Некорректный цвет (hex)", { color: "Invalid hex color" });
    }
    data.color = c;
  }

  if (typeof body.courseId === "string" && body.courseId.trim() && body.courseId !== stream.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: body.courseId },
      select: { id: true, teacherId: true },
    });
    if (!course) throw new NotFoundError("Курс не найден");
    if (session.user.role !== "ADMIN" && course.teacherId !== session.user.id) {
      throw new ForbiddenError("You do not have permission to access this course");
    }
    data.courseId = course.id;
  }

  const inputSlots = Array.isArray(body.slots) ? body.slots : null;
  if (!inputSlots) {
    throw new ValidationError("slots обязательны (полная замена расписания)", {
      slots: "Slots are required",
    });
  }

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
  for (let i = 0; i < inputSlots.length; i++) {
    for (let j = i + 1; j < inputSlots.length; j++) {
      if (overlaps(inputSlots[i], inputSlots[j])) {
        throw new ValidationError("Слоты текущего потока пересекаются между собой", {
          slots: "Schedule slots overlap with each other",
        });
      }
    }
  }

  // Если слоты фактически не меняются, не пересчитываем конфликты с другими потоками,
  // чтобы позволить править только цвет/название даже при старых пересечениях.
  const currentSlotsRows = await prisma.streamScheduleSlot.findMany({
    where: { streamId: stream.id },
  });
  const currentSlots: SlotInput[] = currentSlotsRows.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startMinutes: s.startMinutes,
    durationMinutes: s.durationMinutes,
  }));

  if (!sameSlots(currentSlots, inputSlots)) {
    const existing = await prisma.streamScheduleSlot.findMany({
      where: { stream: { teacherId: session.user.id }, NOT: { streamId: stream.id } },
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
  }

  const computedText = body.scheduleText?.trim() || slotsToScheduleText(inputSlots);

  const updated = await prisma.$transaction(async (tx) => {
    const up = await tx.stream.update({
      where: { id: stream.id },
      data: {
        ...data,
        schedule: computedText,
      },
    });
    await tx.streamScheduleSlot.deleteMany({ where: { streamId: stream.id } });
    await tx.streamScheduleSlot.createMany({
      data: inputSlots.map((s) => ({
        streamId: stream.id,
        dayOfWeek: s.dayOfWeek,
        startMinutes: s.startMinutes,
        durationMinutes: s.durationMinutes,
      })),
    });
    return up;
  });

  return NextResponse.json({ success: true, stream: updated });
});

export const DELETE = withErrorHandling(async (
  _req: Request,
  context?: { params: Promise<Record<string, string>> }
) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const params = await context!.params;
  const streamId = params.streamId;

  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: { _count: { select: { enrollments: true, lessons: true } } },
  });
  if (!stream) {
    throw new NotFoundError("Поток не найден");
  }
  if (session.user.role !== "ADMIN" && stream.teacherId !== session.user.id) {
    throw new ForbiddenError("You do not have permission to access this stream");
  }

  if (stream._count.enrollments > 0 || stream._count.lessons > 0) {
    throw new ConflictError("Нельзя удалить поток: в нём есть ученики или уроки");
  }

  await prisma.stream.delete({ where: { id: stream.id } });
  return NextResponse.json({ success: true });
});

