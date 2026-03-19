import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError } from "@/lib/errors";
import { aggregateQuizSubmission } from "@/lib/quiz-aggregation";

export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new AuthError("Unauthorized");
  }

  const body = await req.json().catch(() => null);
  if (!body) throw new ValidationError("Invalid JSON");

  const { quizId, userId }: { quizId?: string; userId?: string } = body;

  if (!quizId || !userId) {
    const errors: Record<string, string> = {};
    if (!quizId) errors.quizId = "Quiz ID is required";
    if (!userId) errors.userId = "User ID is required";
    throw new ValidationError("quizId and userId are required", errors);
  }

  const result = await aggregateQuizSubmission(quizId, userId);

  if (!result.allAnswered) {
    return NextResponse.json({
      success: false,
      message: "Not all questions answered yet",
      totalQuestions: result.totalQuestions,
      answeredQuestions: result.totalQuestions - (result.totalQuestions - result.correctAnswers),
    });
  }

  return NextResponse.json({
    success: true,
    submissionId: result.submissionId,
    status: result.status,
    totalQuestions: result.totalQuestions,
    correctAnswers: result.correctAnswers,
    totalMCQuestions: result.totalMCQuestions,
  });
});
