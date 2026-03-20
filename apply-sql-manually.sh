#!/bin/bash
# ФИНАЛЬНОЕ РУЧНОЕ ИСПРАВЛЕНИЕ
# Применяет SQL изменения напрямую в БД

cd /var/www/newfatiha

echo "🔧 Применяем SQL изменения вручную..."

sudo -u postgres psql -d fatiha << 'EOSQL'

-- Создаем enum типы
DO $$ BEGIN
    CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "EnrollmentRequestStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED_PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'ACTIVE', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Добавляем поля в User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- Добавляем поля в Stream
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "isOpenForEnrollment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2);
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'RUB';
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "enrollmentDeadline" TIMESTAMP(3);
ALTER TABLE "Stream" ADD COLUMN IF NOT EXISTS "paymentInstructions" TEXT;

-- Добавляем поля в Notification
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "actionUrl" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "actionText" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "emailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- Создаем таблицы
CREATE TABLE IF NOT EXISTS "TeacherProfile" (
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

CREATE TABLE IF NOT EXISTS "EnrollmentRequest" (
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

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
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

CREATE TABLE IF NOT EXISTS "PageContent" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Broadcast" (
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

-- Создаем индексы
CREATE UNIQUE INDEX IF NOT EXISTS "User_verificationToken_key" ON "User"("verificationToken");
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherProfile_userId_key" ON "TeacherProfile"("userId");
CREATE INDEX IF NOT EXISTS "TeacherProfile_userId_idx" ON "TeacherProfile"("userId");
CREATE INDEX IF NOT EXISTS "TeacherProfile_reviewedById_idx" ON "TeacherProfile"("reviewedById");
CREATE UNIQUE INDEX IF NOT EXISTS "EnrollmentRequest_studentId_streamId_key" ON "EnrollmentRequest"("studentId", "streamId");
CREATE INDEX IF NOT EXISTS "EnrollmentRequest_studentId_idx" ON "EnrollmentRequest"("studentId");
CREATE INDEX IF NOT EXISTS "EnrollmentRequest_streamId_idx" ON "EnrollmentRequest"("streamId");
CREATE INDEX IF NOT EXISTS "EnrollmentRequest_status_idx" ON "EnrollmentRequest"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PageContent_page_key" ON "PageContent"("page");
CREATE INDEX IF NOT EXISTS "PageContent_page_idx" ON "PageContent"("page");
CREATE INDEX IF NOT EXISTS "Broadcast_sentById_idx" ON "Broadcast"("sentById");
CREATE INDEX IF NOT EXISTS "Broadcast_sentAt_idx" ON "Broadcast"("sentAt");
CREATE INDEX IF NOT EXISTS "Notification_priority_createdAt_idx" ON "Notification"("priority", "createdAt");

SELECT '✅ SQL изменения применены!' as result;

EOSQL

echo ""
echo "🔨 Помечаем миграцию как примененную..."
npx prisma migrate resolve --applied 20260320000000_add_teacher_enrollment_system

echo ""
echo "🔨 Генерируем Prisma Client..."
npx prisma generate

echo ""
echo "👤 Создаем администратора..."
sudo -u postgres psql -d fatiha -c "DELETE FROM \"User\" WHERE email = 'admin@fatiha.ru'; INSERT INTO \"User\" (id, email, password, name, role, \"emailVerified\", status, gender, \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), 'admin@fatiha.ru', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye.IjzKrMa3s83si9GeCAos99JxHm8jqW', 'Администратор', 'ADMIN', true, 'ACTIVE', 'NOT_SPECIFIED', NOW(), NOW());"

echo ""
echo "🔄 Перезапускаем приложение..."
pm2 restart fatiha

echo ""
echo "✅ ВСЕ ГОТОВО!"
echo "=========================================="
echo "🌐 Откройте: https://fatiha.ru"
echo "📧 Email: admin@fatiha.ru"
echo "🔑 Password: admin123"
echo "=========================================="
