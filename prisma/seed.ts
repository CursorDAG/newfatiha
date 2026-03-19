import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// eslint-disable-next-line no-restricted-syntax -- Seed scripts run outside Next.js and need their own PrismaClient instance
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create Admin
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fatiha.ru' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@fatiha.ru',
      name: 'Администратор',
      password: hashedPassword,
      role: 'ADMIN',
      gender: 'MALE',
    },
  })
  console.log(`Admin created: ${admin.email}`)

  // 1.1 Create Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@fatiha.ru' },
    update: {},
    create: {
      email: 'teacher@fatiha.ru',
      name: 'Устаз Ахмад',
      password: hashedPassword,
      role: 'TEACHER',
      gender: 'MALE',
    },
  })
  console.log(`Teacher created: ${teacher.email}`)

  // 1.1 Create Moderator
  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@fatiha.ru' },
    update: {},
    create: {
      email: 'moderator@fatiha.ru',
      name: 'Модератор Ибрагим',
      password: hashedPassword,
      role: 'MODERATOR',
      gender: 'MALE',
    },
  })
  console.log(`Moderator created: ${moderator.email}`)

  // 2. Create or reuse Course
  const courseTitle = 'Основы Ислама 101'
  const course =
    (await prisma.course.findFirst({
      where: { teacherId: teacher.id, title: courseTitle },
    })) ??
    (await prisma.course.create({
      data: {
        title: courseTitle,
        description: 'Базовый курс по акыде и фикху',
        teacherId: teacher.id,
      },
    }))

  // 3. Create or reuse Streams
  const morningName = 'Начальный (Утро)'
  const eveningName = 'Продвинутый (Вечер)'
  const morningStream =
    (await prisma.stream.findFirst({
      where: { teacherId: teacher.id, courseId: course.id, name: morningName },
    })) ??
    (await prisma.stream.create({
      data: {
        name: morningName,
        level: 'Beginner',
        schedule: 'Mon/Wed/Fri 10:00 AM',
        teacherId: teacher.id,
        courseId: course.id,
        color: '#22c55e',
        genderType: 'MALE_ONLY',
        chatEnabled: true,
      },
    }))

  const eveningStream =
    (await prisma.stream.findFirst({
      where: { teacherId: teacher.id, courseId: course.id, name: eveningName },
    })) ??
    (await prisma.stream.create({
      data: {
        name: eveningName,
        level: 'Advanced',
        schedule: 'Tue/Thu 19:00 PM',
        teacherId: teacher.id,
        courseId: course.id,
        color: '#6366f1',
        genderType: 'FEMALE_ONLY',
        chatEnabled: true,
      },
    }))
  console.log(`Streams created: ${morningStream.name}, ${eveningStream.name}`)

  // 3.1 Create Stream schedule slots (weekly)
  await prisma.streamScheduleSlot.deleteMany({
    where: { streamId: { in: [morningStream.id, eveningStream.id] } },
  })
  await prisma.streamScheduleSlot.createMany({
    data: [
      // morning: Mon/Wed/Fri 10:00-11:30
      { streamId: morningStream.id, dayOfWeek: 1, startMinutes: 10 * 60, durationMinutes: 90 },
      { streamId: morningStream.id, dayOfWeek: 3, startMinutes: 10 * 60, durationMinutes: 90 },
      { streamId: morningStream.id, dayOfWeek: 5, startMinutes: 10 * 60, durationMinutes: 90 },

      // evening: Tue/Thu 19:00-20:30
      { streamId: eveningStream.id, dayOfWeek: 2, startMinutes: 19 * 60, durationMinutes: 90 },
      { streamId: eveningStream.id, dayOfWeek: 4, startMinutes: 19 * 60, durationMinutes: 90 },
    ],
  })

  // 4. Create Students
  const studentData = [
    { name: 'Али', email: 'ali@student.ru', streamId: morningStream.id, gender: 'MALE' as const },
    { name: 'Умар', email: 'umar@student.ru', streamId: morningStream.id, gender: 'MALE' as const },
    { name: 'Фатима', email: 'fatima@student.ru', streamId: eveningStream.id, gender: 'FEMALE' as const },
    { name: 'Аиша', email: 'aisha@student.ru', streamId: eveningStream.id, gender: 'FEMALE' as const },
  ]

  const students = []
  for (const s of studentData) {
    const pswd = await bcrypt.hash('student123', 10)
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name, gender: s.gender },
      create: {
        email: s.email,
        name: s.name,
        password: pswd,
        role: 'STUDENT',
        gender: s.gender,
      },
    })
    students.push(student)

    await prisma.enrollment.upsert({
      where: { userId_streamId: { userId: student.id, streamId: s.streamId } },
      update: { status: 'ACTIVE' },
      create: { userId: student.id, streamId: s.streamId, status: 'ACTIVE' },
    })
  }
  console.log(`4 Students created and enrolled.`)

  // 5. Create Lessons
  await prisma.lesson.create({
    data: {
      title: 'Введение в Акыду (LIVE)',
      type: 'LIVE',
      streamId: eveningStream.id,
      sortOrder: 1,
      teacherNotes: 'Первый вводный урок, знакомство с группой.',
    }
  })

  await prisma.lesson.create({
    data: {
      title: 'Тахарат (Очищение) - Видеоурок',
      type: 'VIDEO',
      content: 'https://youtube.com/watch?v=sample',
      streamId: morningStream.id,
      sortOrder: 1,
      teacherNotes: 'Просмотр видео по тахарату, задать вопросы на следующем занятии.',
    }
  })

  // 6. Create ChatRooms for streams
  await prisma.chatRoom.upsert({
    where: { streamId: morningStream.id },
    update: {},
    create: {
      type: 'GROUP',
      streamId: morningStream.id,
    },
  })

  await prisma.chatRoom.upsert({
    where: { streamId: eveningStream.id },
    update: {},
    create: {
      type: 'GROUP',
      streamId: eveningStream.id,
    },
  })
  console.log('Chat rooms created for streams.')

  // 7. Create test SupportTickets
  await prisma.supportTicket.create({
    data: {
      userId: students[0].id,
      subject: 'Не могу войти в урок',
      description: 'При попытке войти в live урок показывается ошибка. Помогите пожалуйста.',
      status: 'OPEN',
      priority: 'HIGH',
    },
  })

  const resolvedTicket = await prisma.supportTicket.create({
    data: {
      userId: students[2].id,
      subject: 'Вопрос по домашнему заданию',
      description: 'Не понимаю как выполнить задание по тахарату.',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      assignedToId: moderator.id,
      resolvedAt: new Date(),
    },
  })

  await prisma.supportTicketReply.create({
    data: {
      ticketId: resolvedTicket.id,
      userId: moderator.id,
      message: 'Здравствуйте! Посмотрите видеоурок еще раз, там все подробно объяснено.',
      isStaff: true,
    },
  })

  await prisma.supportTicketReply.create({
    data: {
      ticketId: resolvedTicket.id,
      userId: students[2].id,
      message: 'Спасибо, разобралась!',
      isStaff: false,
    },
  })
  console.log('Test support tickets created.')

  // 8. Create test ContentReport
  await prisma.contentReport.create({
    data: {
      reporterId: students[1].id,
      contentType: 'LESSON',
      contentId: 'sample-lesson-id',
      reason: 'OTHER',
      description: 'Урок содержит устаревшую информацию.',
      status: 'PENDING',
    },
  })
  console.log('Test content report created.')

  // 9. Create TeacherProfile applications
  const pendingTeacher = await prisma.user.upsert({
    where: { email: 'pending.teacher@example.com' },
    update: {},
    create: {
      email: 'pending.teacher@example.com',
      name: 'Ибрагим Хасанов',
      password: hashedPassword,
      role: 'TEACHER',
      gender: 'MALE',
      status: 'PENDING_APPROVAL',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  await prisma.teacherProfile.upsert({
    where: { userId: pendingTeacher.id },
    update: {},
    create: {
      userId: pendingTeacher.id,
      bio: 'Закончил Исламский университет Медины. 10 лет опыта преподавания арабского языка и основ Ислама.',
      subjects: ['Арабский язык', 'Акыда', 'Фикх'],
      experience: 'Преподавал в медресе "Нур" (2014-2020), онлайн-курсы на платформе "Ислам Онлайн" (2020-2024)',
      qualifications: 'Бакалавр исламских наук, Исламский университет Медины (2014)',
      whatsappPhone: '+79991234567',
      documentsUrls: ['https://example.com/diploma.pdf', 'https://example.com/certificate.pdf'],
      videoIntroUrl: 'https://youtube.com/watch?v=intro-video',
    },
  })

  const rejectedTeacher = await prisma.user.upsert({
    where: { email: 'rejected.teacher@example.com' },
    update: {},
    create: {
      email: 'rejected.teacher@example.com',
      name: 'Марат Сидоров',
      password: hashedPassword,
      role: 'TEACHER',
      gender: 'MALE',
      status: 'REJECTED',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  await prisma.teacherProfile.upsert({
    where: { userId: rejectedTeacher.id },
    update: {},
    create: {
      userId: rejectedTeacher.id,
      bio: 'Интересуюсь исламом, хочу преподавать.',
      subjects: ['Основы Ислама'],
      experience: 'Нет опыта преподавания',
      qualifications: 'Самообразование',
      reviewedById: admin.id,
      reviewedAt: new Date(),
      rejectionReason: 'Недостаточная квалификация. Требуется формальное исламское образование.',
      adminNotes: 'Отсутствуют документы об образовании. Рекомендовано пройти обучение.',
    },
  })
  console.log('Test teacher profiles created.')

  // 10. Create NotificationPreferences for test users
  for (const user of [admin, teacher, moderator, ...students, pendingTeacher, rejectedTeacher]) {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        emailNewLesson: true,
        emailHomeworkAssigned: true,
        emailHomeworkChecked: true,
        emailQuizChecked: true,
        emailAnnouncement: true,
        emailHomeworkSubmitted: user.role === 'TEACHER' || user.role === 'ADMIN',
        emailQuizSubmitted: user.role === 'TEACHER' || user.role === 'ADMIN',
        emailStudentJoined: user.role === 'TEACHER' || user.role === 'ADMIN',
        emailDigestEnabled: false,
        emailDigestTime: 540, // 9:00 AM
        soundEnabled: true,
      },
    })
  }
  console.log('Notification preferences created for all users.')

  // 11. Create EnrollmentRequests
  // Open one stream for enrollment
  await prisma.stream.update({
    where: { id: morningStream.id },
    data: {
      isOpenForEnrollment: true,
      price: 5000,
      currency: 'RUB',
      enrollmentDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentInstructions: 'Оплата через Сбербанк или Тинькофф. Реквизиты будут высланы после одобрения заявки.',
    },
  })

  const newStudent1 = await prisma.user.upsert({
    where: { email: 'new.student1@example.com' },
    update: {},
    create: {
      email: 'new.student1@example.com',
      name: 'Зайнаб Ахмедова',
      password: hashedPassword,
      role: 'STUDENT',
      gender: 'FEMALE',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  const newStudent2 = await prisma.user.upsert({
    where: { email: 'new.student2@example.com' },
    update: {},
    create: {
      email: 'new.student2@example.com',
      name: 'Юсуф Магомедов',
      password: hashedPassword,
      role: 'STUDENT',
      gender: 'MALE',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  await prisma.enrollmentRequest.upsert({
    where: { studentId_streamId: { studentId: newStudent1.id, streamId: morningStream.id } },
    update: {},
    create: {
      studentId: newStudent1.id,
      streamId: morningStream.id,
      status: 'PENDING_REVIEW',
      message: 'Здравствуйте! Хочу записаться на курс по основам Ислама. Есть базовые знания.',
    },
  })

  await prisma.enrollmentRequest.upsert({
    where: { studentId_streamId: { studentId: newStudent2.id, streamId: morningStream.id } },
    update: {},
    create: {
      studentId: newStudent2.id,
      streamId: morningStream.id,
      status: 'APPROVED_PENDING_PAYMENT',
      message: 'Хочу изучать Ислам с нуля.',
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  })

  const newStudent3 = await prisma.user.upsert({
    where: { email: 'new.student3@example.com' },
    update: {},
    create: {
      email: 'new.student3@example.com',
      name: 'Амина Исмаилова',
      password: hashedPassword,
      role: 'STUDENT',
      gender: 'FEMALE',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  await prisma.enrollmentRequest.upsert({
    where: { studentId_streamId: { studentId: newStudent3.id, streamId: eveningStream.id } },
    update: {},
    create: {
      studentId: newStudent3.id,
      streamId: eveningStream.id,
      status: 'REJECTED',
      message: 'Хочу записаться на продвинутый курс.',
      reviewedById: admin.id,
      reviewedAt: new Date(),
      rejectionReason: 'Курс предназначен для студентов с базовыми знаниями. Рекомендуем начать с начального уровня.',
    },
  })
  console.log('Test enrollment requests created.')

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
