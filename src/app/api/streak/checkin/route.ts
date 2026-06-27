/**
 * POST /api/streak/checkin
 *
 * Check in for a streak type (STUDY, READING, HASANAT).
 * Idempotent: calling twice on the same day does not double-count.
 * Logic:
 *   - lastActiveDate == yesterday  →  currentStreak++
 *   - lastActiveDate == today     →  no-op (already checked in)
 *   - anything else               →  reset to 1
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";
import { awardHasanat } from "@/lib/hasanat-service";
import { logger } from "@/lib/logger";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Необходима авторизация");
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    throw new ValidationError("Неверный формат запроса");
  }

  const { type } = body;
  if (!type || !["STUDY", "READING", "HASANAT"].includes(type)) {
    throw new ValidationError("Неверный тип стрик-трекера. Допустимые значения: STUDY, READING, HASANAT");
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const existing = await prisma.streak.findUnique({
    where: {
      userId_type: {
        userId: session.user.id,
        type: type as "STUDY" | "READING" | "HASANAT",
      },
    },
    select: { id: true, currentStreak: true, maxStreak: true, lastActiveDate: true, type: true },
  });

  if (existing) {
    const last = new Date(Date.UTC(
      existing.lastActiveDate.getUTCFullYear(),
      existing.lastActiveDate.getUTCMonth(),
      existing.lastActiveDate.getUTCDate(),
    ));

    let newStreak: number;
    if (last.getTime() === today.getTime()) {
      // Already checked in today — no-op
      return NextResponse.json({
        success: true,
        streak: {
          id: existing.id,
          currentStreak: existing.currentStreak,
          maxStreak: existing.maxStreak,
          type: existing.type,
          lastActiveDate: existing.lastActiveDate,
        },
        isNew: false,
      });
    } else if (last.getTime() === yesterday.getTime()) {
      newStreak = existing.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const maxStreak = Math.max(existing.maxStreak, newStreak);
    await prisma.streak.update({
      where: { id: existing.id },
      data: { currentStreak: newStreak, maxStreak, lastActiveDate: today },
    });

    // Award hasanat for streak milestones
    if (newStreak === 7 || newStreak === 14 || newStreak === 21 || newStreak === 28) {
      awardHasanat(session.user.id, "STREAK_7_DAYS", `Стрик ${newStreak} дней`).catch((err) =>
        logger.error({ error: err, userId: session.user.id, streak: newStreak }, "Failed to award hasanat"),
      );
    }
    if (newStreak >= 30) {
      awardHasanat(session.user.id, "STREAK_30_DAYS", `Стрик ${newStreak} дней`).catch((err) =>
        logger.error({ error: err, userId: session.user.id, streak: newStreak }, "Failed to award hasanat"),
      );
    }

    return NextResponse.json({
      success: true,
      streak: {
        id: existing.id,
        currentStreak: newStreak,
        maxStreak,
        type: existing.type,
        lastActiveDate: today,
      },
      isNew: false,
    });
  }

  // Create new streak
  const created = await prisma.streak.create({
    data: {
      userId: session.user.id,
      type: type as "STUDY" | "READING" | "HASANAT",
      currentStreak: 1,
      maxStreak: 1,
      lastActiveDate: today,
    },
    select: {
      id: true,
      currentStreak: true,
      maxStreak: true,
      type: true,
      lastActiveDate: true,
    },
  });

  return NextResponse.json({ success: true, streak: created, isNew: true });
});
