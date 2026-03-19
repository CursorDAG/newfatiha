/**
 * Quiz submission aggregation logic
 * Aggregates individual question submissions into a single quiz submission
 */

import { prisma } from "@/lib/prisma";
import { QuizSubmissionStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

interface AggregationResult {
  submissionId: string;
  status: QuizSubmissionStatus;
  correctAnswers: number;
  totalMCQuestions: number;
  totalQuestions: number;
  allAnswered: boolean;
}

/**
 * Aggregates question submissions into a quiz submission
 * @param quizId - The quiz ID
 * @param userId - The student user ID
 * @returns Aggregation result with submission details
 */
export async function aggregateQuizSubmission(
  quizId: string,
  userId: string
): Promise<AggregationResult> {
  const quiz = await prisma.lessonQuiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      lesson: { include: { stream: true } },
    },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  const questionSubmissions = await prisma.questionSubmission.findMany({
    where: {
      questionId: { in: quiz.questions.map((q) => q.id) },
      studentId: userId,
    },
    include: { question: { include: { options: true } } },
  });

  const allQuestionsAnswered = quiz.questions.every((q) =>
    questionSubmissions.some((sub) => sub.questionId === q.id)
  );

  if (!allQuestionsAnswered) {
    return {
      submissionId: "",
      status: "SUBMITTED",
      correctAnswers: 0,
      totalMCQuestions: 0,
      totalQuestions: quiz.questions.length,
      allAnswered: false,
    };
  }

  let correctAnswers = 0;
  let totalMCQuestions = 0;

  const questionDetails = quiz.questions.map((question) => {
    const submission = questionSubmissions.find((sub) => sub.questionId === question.id);
    if (!submission) {
      return { questionId: question.id, prompt: question.prompt, type: question.type, status: "NOT_ANSWERED" };
    }

    const detail: Record<string, unknown> = {
      questionId: question.id,
      prompt: question.prompt,
      type: question.type,
      submissionId: submission.id,
      status: submission.status,
    };

    if (question.type === "MULTIPLE_CHOICE") {
      totalMCQuestions++;
      const selectedOption = question.options.find((o) => o.id === submission.selectedOptionId);
      const correctOption = question.options.find((o) => o.isCorrect);
      detail.selectedOptionId = submission.selectedOptionId;
      detail.selectedOptionText = selectedOption?.text;
      detail.correctOptionId = correctOption?.id;
      detail.correctOptionText = correctOption?.text;
      detail.isCorrect = selectedOption?.isCorrect || false;
      if (selectedOption?.isCorrect) correctAnswers++;
    } else if (question.type === "TEXT") {
      detail.textAnswer = submission.textAnswer;
    } else if (question.type === "VOICE") {
      detail.voiceMimeType = submission.voiceMimeType;
      detail.voiceDurationMs = submission.voiceDurationMs;
      detail.voiceUrl = submission.voiceUrl;
      detail.hasVoiceData = !!submission.voiceData;
    }

    return detail;
  });

  let overallStatus: QuizSubmissionStatus = "SUBMITTED";
  if (totalMCQuestions > 0 && correctAnswers === totalMCQuestions) {
    overallStatus = "PASSED";
  } else if (totalMCQuestions === quiz.questions.length) {
    overallStatus = "FAILED";
  }

  const lessonQuizSubmission = await prisma.lessonQuizSubmission.upsert({
    where: { quizId_studentId: { quizId: quiz.id, studentId: userId } },
    update: {
      questionDetails: JSON.parse(JSON.stringify(questionDetails)),
      status: overallStatus,
      updatedAt: new Date(),
    },
    create: {
      quizId: quiz.id,
      studentId: userId,
      questionDetails: JSON.parse(JSON.stringify(questionDetails)),
      status: overallStatus,
    },
  });

  logger.info({
    msg: "Quiz submissions aggregated",
    quizId,
    userId,
    submissionId: lessonQuizSubmission.id,
    totalQuestions: quiz.questions.length,
    correctAnswers,
    totalMCQuestions,
    status: overallStatus,
  });

  return {
    submissionId: lessonQuizSubmission.id,
    status: overallStatus,
    correctAnswers,
    totalMCQuestions,
    totalQuestions: quiz.questions.length,
    allAnswered: true,
  };
}

/**
 * Checks if all questions in a quiz have been answered by a student
 * @param quizId - The quiz ID
 * @param userId - The student user ID
 * @returns True if all questions are answered
 */
export async function areAllQuestionsAnswered(
  quizId: string,
  userId: string
): Promise<boolean> {
  const [totalQuestions, submittedQuestions] = await Promise.all([
    prisma.lessonQuizQuestion.count({
      where: { quizId },
    }),
    prisma.questionSubmission.count({
      where: {
        question: { quizId },
        studentId: userId,
      },
    }),
  ]);

  return totalQuestions > 0 && totalQuestions === submittedQuestions;
}
