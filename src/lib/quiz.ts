/**
 * Quiz submission status utilities
 */

import { QuizSubmissionStatus } from "@prisma/client";

/**
 * Selects the best quiz status from multiple submissions
 * Priority: PASSED > FAILED > SUBMITTED (most recent of each)
 * @param submissions - Array of quiz submissions with status and timestamp
 * @returns The best submission with its timestamp
 */
export function bestQuizStatusWithTimestamp(
  submissions: { status: QuizSubmissionStatus; createdAt: Date }[]
): { status: QuizSubmissionStatus; createdAt: Date } {
  const byStatus: Record<
    QuizSubmissionStatus,
    { status: QuizSubmissionStatus; createdAt: Date }[]
  > = {
    SUBMITTED: [],
    PASSED: [],
    FAILED: [],
  };

  for (const s of submissions) {
    byStatus[s.status].push(s);
  }

  // Priority: PASSED > FAILED > SUBMITTED
  if (byStatus.PASSED.length) {
    return byStatus.PASSED.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }
  if (byStatus.FAILED.length) {
    return byStatus.FAILED.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }
  return byStatus.SUBMITTED.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0];
}
