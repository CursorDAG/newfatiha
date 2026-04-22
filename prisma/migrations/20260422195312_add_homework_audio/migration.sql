-- AlterTable
ALTER TABLE "HomeworkSubmission" ADD COLUMN     "voiceData" BYTEA,
ADD COLUMN     "voiceDurationMs" INTEGER,
ADD COLUMN     "voiceMimeType" TEXT,
ADD COLUMN     "voiceUrl" TEXT;
