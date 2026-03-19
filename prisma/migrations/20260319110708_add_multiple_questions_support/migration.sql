-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TEXT', 'VOICE');

-- AlterTable
ALTER TABLE "LessonQuizQuestion" ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE';

-- CreateTable
CREATE TABLE "QuestionSubmission" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "textAnswer" TEXT,
    "voiceMimeType" TEXT,
    "voiceData" BYTEA,
    "voiceDurationMs" INTEGER,
    "voiceUrl" TEXT,
    "status" "QuizSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "checkedById" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionSubmission_studentId_createdAt_idx" ON "QuestionSubmission"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionSubmission_questionId_createdAt_idx" ON "QuestionSubmission"("questionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSubmission_questionId_studentId_key" ON "QuestionSubmission"("questionId", "studentId");

-- AddForeignKey
ALTER TABLE "QuestionSubmission" ADD CONSTRAINT "QuestionSubmission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LessonQuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSubmission" ADD CONSTRAINT "QuestionSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSubmission" ADD CONSTRAINT "QuestionSubmission_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
