-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EnrollmentRequestStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED_PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'ACTIVE', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TEACHER_APPLICATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'TEACHER_APPLICATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'STUDENT_REGISTERED';
ALTER TYPE "NotificationType" ADD VALUE 'TEACHER_APPLICATION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_REQUEST_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_REQUEST_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_REQUEST_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_PAYMENT_REQUIRED';
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_CONFIRMED';

-- AlterTable User - Add new fields
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable Stream - Add enrollment fields
ALTER TABLE "Stream" ADD COLUMN "isOpenForEnrollment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Stream" ADD COLUMN "price" DECIMAL(10,2);
ALTER TABLE "Stream" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'RUB';
ALTER TABLE "Stream" ADD COLUMN "enrollmentDeadline" TIMESTAMP(3);
ALTER TABLE "Stream" ADD COLUMN "paymentInstructions" TEXT;

-- AlterTable Notification - Add new fields
ALTER TABLE "Notification" ADD COLUMN "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Notification" ADD COLUMN "metadata" JSONB;
ALTER TABLE "Notification" ADD COLUMN "actionUrl" TEXT;
ALTER TABLE "Notification" ADD COLUMN "actionText" TEXT;
ALTER TABLE "Notification" ADD COLUMN "emailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "emailSentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN "readAt" TIMESTAMP(3);

-- CreateTable TeacherProfile
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "subjects" TEXT[],
    "experience" TEXT,
    "qualifications" TEXT,
    "whatsappPhone" TEXT,
    "documentsUrls" TEXT[],
    "videoIntroUrl" TEXT,
    "adminNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable EnrollmentRequest
CREATE TABLE "EnrollmentRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "status" "EnrollmentRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "message" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paymentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "paymentConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable NotificationPreference
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNewLesson" BOOLEAN NOT NULL DEFAULT true,
    "emailHomeworkAssigned" BOOLEAN NOT NULL DEFAULT true,
    "emailHomeworkChecked" BOOLEAN NOT NULL DEFAULT true,
    "emailQuizChecked" BOOLEAN NOT NULL DEFAULT true,
    "emailAnnouncement" BOOLEAN NOT NULL DEFAULT true,
    "emailHomeworkSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "emailQuizSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "emailStudentJoined" BOOLEAN NOT NULL DEFAULT true,
    "emailDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailDigestTime" INTEGER NOT NULL DEFAULT 540,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable PageContent
CREATE TABLE "PageContent" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable Broadcast
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetAudience" JSONB NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationToken_key" ON "User"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_userId_idx" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_reviewedById_idx" ON "TeacherProfile"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentRequest_studentId_streamId_key" ON "EnrollmentRequest"("studentId", "streamId");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_studentId_idx" ON "EnrollmentRequest"("studentId");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_streamId_idx" ON "EnrollmentRequest"("streamId");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_status_idx" ON "EnrollmentRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_page_key" ON "PageContent"("page");

-- CreateIndex
CREATE INDEX "PageContent_page_idx" ON "PageContent"("page");

-- CreateIndex
CREATE INDEX "Broadcast_sentById_idx" ON "Broadcast"("sentById");

-- CreateIndex
CREATE INDEX "Broadcast_sentAt_idx" ON "Broadcast"("sentAt");

-- CreateIndex
CREATE INDEX "Notification_priority_createdAt_idx" ON "Notification"("priority", "createdAt");

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
