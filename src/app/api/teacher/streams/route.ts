import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

type SlotInput = {
  dayOfWeek: number;
  startMinutes: number;
  durationMinutes: number;
};

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
  const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const normalized = [...slots].sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || (a.startMinutes - b.startMinutes));
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const streams = await prisma.stream.findMany({
    where: { teacherId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, streams });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CreateStreamBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { courseId, name, level, scheduleText, slots, color } = body;
  if (!courseId || !name?.trim() || !level?.trim()) {
    return NextResponse.json(
      { error: "courseId, name, level обязательны" },
      { status: 400 }
    );
  }

  const inputSlots = Array.isArray(slots) ? slots : [];
  if (!inputSlots.length) {
    return NextResponse.json({ error: "Выберите хотя бы один слот расписания" }, { status: 400 });
  }
  if (!inputSlots.every(isValidSlot)) {
    return NextResponse.json({ error: "Некорректные слоты расписания" }, { status: 400 });
  }
  // prevent self-overlaps
  for (let i = 0; i < inputSlots.length; i++) {
    for (let j = i + 1; j < inputSlots.length; j++) {
      if (overlaps(inputSlots[i], inputSlots[j])) {
        return NextResponse.json({ error: "Слоты текущего потока пересекаются между собой" }, { status: 400 });
      }
    }
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Курс не найден" }, { status: 404 });
  }
  if (session.user.role !== "ADMIN" && course.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        return NextResponse.json(
          { error: `Конфликт расписания: слот пересекается с потоком «${ex.stream.name}»` },
          { status: 400 }
        );
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
}

