-- AlterEnum
ALTER TYPE "EnrollmentRequestStatus" ADD VALUE 'PAYMENT_PENDING_CONFIRMATION';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ENROLLMENT_PAYMENT_CLAIMED';

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "paymentRequisites" TEXT;
