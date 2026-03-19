/**
 * Progress calculation utilities
 * Recalculates student progress metrics for a given stream
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Recalculate all progress metrics for a student in a stream
 * Called after: video completion, quiz check, homework check
 */
export async function recalculateStudentProgress(
  userId: string,
  streamId: string
): Promise<void> {
  try {
    // 1. Count lessons
    const lessonsTotal = await prisma.lesson.count({
      where: { streamId, published: true },
    });

    const lessonsCompleted = await prisma.lessonProgress.count({
      where: { userId, streamId, completed: true },
    });

    // 2. Count quizzes
    const quizzesTotal = await prisma.lessonQuiz.count({
      where: { lesson: { streamId } },
    });

    const quizzesPassed = await prisma.lessonQuizSubmission.count({
      where: {
        studentId: userId,
        quiz: { lesson: { streamId } },
        status: "PASSED",
      },
    });

    // 3. Calculate average quiz score (only MULTIPLE_CHOICE with graded results)
    const quizSubmissions = await prisma.lessonQuizSubmission.findMany({
      where: {
        studentId: userId,
        quiz: { lesson: { streamId }, type: "MULTIPLE_CHOICE" },
        status: { in: ["PASSED", "FAILED"] },
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    let totalScore = 0;
    let scoredQuizzes = 0;

    for (const submission of quizSubmissions) {
      const question = submission.quiz.questions[0];
      if (!question) continue;

      const correctOption = question.options.find((o) => o.isCorrect);
      if (correctOption && submission.selectedOptionId === correctOption.id) {
        totalScore += 100;
      }
      scoredQuizzes++;
    }

    const averageQuizScore =
      scoredQuizzes > 0 ? Math.round(totalScore / scoredQuizzes) : null;

    // 4. Count homework
    const homeworksTotal = await prisma.homeworkAssignment.count({
      where: { streamId },
    });

    const homeworksAccepted = await prisma.homeworkSubmission.count({
      where: {
        enrollment: { userId, streamId },
        status: "ACCEPTED",
      },
    });

    // 5. Calculate total watch time
    const totalWatchTime = await prisma.lessonProgress.aggregate({
      where: { userId, streamId },
      _sum: { watchedSeconds: true },
    });

    const totalWatchTimeSeconds = totalWatchTime._sum.watchedSeconds || 0;

    // 6. Upsert StudentProgress
    await prisma.studentProgress.upsert({
      where: {
        userId_streamId: {
          userId,
          streamId,
        },
      },
      create: {
        userId,
        streamId,
        lessonsCompleted,
        lessonsTotal,
        quizzesPassed,
        quizzesTotal,
        homeworksAccepted,
        homeworksTotal,
        averageQuizScore,
        totalWatchTimeSeconds,
        lastActivityAt: new Date(),
      },
      update: {
        lessonsCompleted,
        lessonsTotal,
        quizzesPassed,
        quizzesTotal,
        homeworksAccepted,
        homeworksTotal,
        averageQuizScore,
        totalWatchTimeSeconds,
        lastActivityAt: new Date(),
      },
    });

    logger.debug({
      userId,
      streamId,
      lessonsCompleted,
      quizzesPassed,
      homeworksAccepted,
    }, "Progress recalculated");
  } catch (error) {
    logger.error({
      userId,
      streamId,
      error: error instanceof Error ? error.message : String(error),
    }, "Failed to recalculate progress");
    throw error;
  }
}
