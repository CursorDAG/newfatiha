import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create Teacher
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const teacher = await prisma.user.upsert({
    where: { email: 'admin@fatiha.ru' },
    update: {},
    create: {
      email: 'admin@fatiha.ru',
      name: 'Устаз Ахмад',
      password: hashedPassword,
      role: 'TEACHER',
    },
  })
  console.log(`Teacher created: ${teacher.email}`)

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
    { name: 'Али', email: 'ali@student.ru', streamId: morningStream.id },
    { name: 'Умар', email: 'umar@student.ru', streamId: morningStream.id },
    { name: 'Фатима', email: 'fatima@student.ru', streamId: eveningStream.id },
    { name: 'Аиша', email: 'aisha@student.ru', streamId: eveningStream.id },
  ]

  for (const s of studentData) {
    const pswd = await bcrypt.hash('student123', 10)
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name },
      create: {
        email: s.email,
        name: s.name,
        password: pswd,
        role: 'STUDENT',
      },
    })

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
