-- CreateEnum
CREATE TYPE "HasanatTransactionType" AS ENUM ('VIEW_LESSON', 'HOMEWORK_SUBMITTED', 'HOMEWORK_ACCEPTED', 'QUIZ_SUBMITTED', 'QUIZ_COMPLETED', 'REVIEW_SUBMITTED', 'STREAK_7_DAYS', 'STREAK_30_DAYS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasanatBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalHasanatEarned" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "HasanatTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "HasanatTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HasanatTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HasanatTransaction_userId_createdAt_idx" ON "HasanatTransaction"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "HasanatTransaction" ADD CONSTRAINT "HasanatTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
