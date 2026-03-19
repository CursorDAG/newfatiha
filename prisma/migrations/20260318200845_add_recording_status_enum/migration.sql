-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "LessonRecording" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "fileSize" BIGINT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" "RecordingStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalSeconds" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "lessonsCompleted" INTEGER NOT NULL DEFAULT 0,
    "lessonsTotal" INTEGER NOT NULL DEFAULT 0,
    "quizzesPassed" INTEGER NOT NULL DEFAULT 0,
    "quizzesTotal" INTEGER NOT NULL DEFAULT 0,
    "homeworksAccepted" INTEGER NOT NULL DEFAULT 0,
    "homeworksTotal" INTEGER NOT NULL DEFAULT 0,
    "averageQuizScore" DOUBLE PRECISION,
    "totalWatchTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonRecording_lessonId_idx" ON "LessonRecording"("lessonId");

-- CreateIndex
CREATE INDEX "LessonRecording_streamId_idx" ON "LessonRecording"("streamId");

-- CreateIndex
CREATE INDEX "LessonRecording_status_idx" ON "LessonRecording"("status");

-- CreateIndex
CREATE INDEX "LessonProgress_userId_streamId_idx" ON "LessonProgress"("userId", "streamId");

-- CreateIndex
CREATE INDEX "LessonProgress_lessonId_idx" ON "LessonProgress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "StudentProgress_streamId_idx" ON "StudentProgress"("streamId");

-- CreateIndex
CREATE INDEX "StudentProgress_userId_idx" ON "StudentProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProgress_userId_streamId_key" ON "StudentProgress"("userId", "streamId");

-- AddForeignKey
ALTER TABLE "LessonRecording" ADD CONSTRAINT "LessonRecording_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
