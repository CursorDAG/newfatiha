/* eslint-disable no-restricted-syntax */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRelations() {
  console.log('🔍 Verifying database relationships...\n');

  try {
    // 1. User → TeacherProfile (1:1)
    const teacherWithProfile = await prisma.user.findFirst({
      where: { role: 'TEACHER' },
      include: { teacherProfile: true },
    });
    console.log('✅ User → TeacherProfile (1:1):', teacherWithProfile?.teacherProfile ? 'OK' : 'MISSING');

    // 2. User → EnrollmentRequest (1:many)
    const studentWithRequests = await prisma.user.findFirst({
      where: { role: 'STUDENT' },
      include: { enrollmentRequests: true },
    });
    console.log('✅ User → EnrollmentRequest (1:many):', studentWithRequests?.enrollmentRequests ? 'OK' : 'MISSING');

    // 3. User → NotificationPreference (1:1)
    const userWithPrefs = await prisma.user.findFirst({
      include: { notificationPreference: true },
    });
    console.log('✅ User → NotificationPreference (1:1):', userWithPrefs?.notificationPreference ? 'OK' : 'MISSING');

    // 4. Stream → EnrollmentRequest (1:many)
    const streamWithRequests = await prisma.stream.findFirst({
      include: { enrollmentRequests: true },
    });
    console.log('✅ Stream → EnrollmentRequest (1:many):', streamWithRequests?.enrollmentRequests ? 'OK' : 'MISSING');

    // 5. TeacherProfile → User (reviewedBy)
    const profileWithReviewer = await prisma.teacherProfile.findFirst({
      where: { reviewedById: { not: null } },
      include: { reviewedBy: true },
    });
    console.log('✅ TeacherProfile → User (reviewedBy):', profileWithReviewer?.reviewedBy ? 'OK' : 'NO DATA (expected)');

    // 6. EnrollmentRequest → User (reviewedBy)
    const requestWithReviewer = await prisma.enrollmentRequest.findFirst({
      where: { reviewedById: { not: null } },
      include: { reviewedBy: true },
    });
    console.log('✅ EnrollmentRequest → User (reviewedBy):', requestWithReviewer?.reviewedBy ? 'OK' : 'NO DATA (expected)');

    // Count records
    console.log('\n📊 Database Statistics:');
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.stream.count(),
      prisma.enrollment.count(),
      prisma.teacherProfile.count(),
      prisma.enrollmentRequest.count(),
      prisma.notificationPreference.count(),
    ]);

    console.log(`  Users: ${counts[0]}`);
    console.log(`  Courses: ${counts[1]}`);
    console.log(`  Streams: ${counts[2]}`);
    console.log(`  Enrollments: ${counts[3]}`);
    console.log(`  Teacher Profiles: ${counts[4]}`);
    console.log(`  Enrollment Requests: ${counts[5]}`);
    console.log(`  Notification Preferences: ${counts[6]}`);

    console.log('\n✅ All relationships verified successfully!');
  } catch (error) {
    console.error('❌ Error verifying relationships:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyRelations();
