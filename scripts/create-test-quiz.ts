import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line no-restricted-syntax
const prisma = new PrismaClient();

async function main() {
  console.log('Creating test quiz with multiple question types...');

  // Find a lesson to attach the quiz to
  const lesson = await prisma.lesson.findFirst({
    include: { stream: true },
  });

  if (!lesson) {
    throw new Error('No lesson found. Run seed script first.');
  }

  console.log(`Using lesson: ${lesson.title} (${lesson.id})`);

  // Create a quiz with mixed question types
  const quiz = await prisma.lessonQuiz.create({
    data: {
      lessonId: lesson.id,
      title: 'Тест: Основы Ислама',
      type: 'MULTIPLE_CHOICE', // Overall quiz type
    },
  });

  console.log(`Quiz created: ${quiz.title} (${quiz.id})`);

  // Create multiple choice question
  const mcQuestion = await prisma.lessonQuizQuestion.create({
    data: {
      quizId: quiz.id,
      prompt: 'Сколько столпов Ислама?',
      type: 'MULTIPLE_CHOICE',
      sortOrder: 1,
      options: {
        create: [
          { text: '3', isCorrect: false, sortOrder: 1 },
          { text: '5', isCorrect: true, sortOrder: 2 },
          { text: '7', isCorrect: false, sortOrder: 3 },
          { text: '10', isCorrect: false, sortOrder: 4 },
        ],
      },
    },
  });

  console.log(`MC Question created: ${mcQuestion.prompt}`);

  // Create text question
  const textQuestion = await prisma.lessonQuizQuestion.create({
    data: {
      quizId: quiz.id,
      prompt: 'Перечислите пять столпов Ислама',
      type: 'TEXT',
      sortOrder: 2,
    },
  });

  console.log(`Text Question created: ${textQuestion.prompt}`);

  // Create voice question
  const voiceQuestion = await prisma.lessonQuizQuestion.create({
    data: {
      quizId: quiz.id,
      prompt: 'Прочитайте суру Аль-Фатиха',
      type: 'VOICE',
      sortOrder: 3,
    },
  });

  console.log(`Voice Question created: ${voiceQuestion.prompt}`);

  // Create another MC question
  const mcQuestion2 = await prisma.lessonQuizQuestion.create({
    data: {
      quizId: quiz.id,
      prompt: 'Какой месяц является месяцем поста?',
      type: 'MULTIPLE_CHOICE',
      sortOrder: 4,
      options: {
        create: [
          { text: 'Шавваль', isCorrect: false, sortOrder: 1 },
          { text: 'Рамадан', isCorrect: true, sortOrder: 2 },
          { text: 'Зуль-Хиджа', isCorrect: false, sortOrder: 3 },
          { text: 'Мухаррам', isCorrect: false, sortOrder: 4 },
        ],
      },
    },
  });

  console.log(`MC Question 2 created: ${mcQuestion2.prompt}`);

  console.log('\n=== Test Quiz Setup Complete ===');
  console.log(`Quiz ID: ${quiz.id}`);
  console.log(`Lesson ID: ${lesson.id}`);
  console.log(`Stream ID: ${lesson.streamId}`);
  console.log(`Questions: 4 (2 MC, 1 TEXT, 1 VOICE)`);
  console.log('\nTo test as student:');
  console.log('1. Login as ali@student.ru / student123');
  console.log(`2. Navigate to lesson: /lesson/${lesson.id}`);
  console.log('3. Submit answers to all questions');
  console.log('4. Check aggregation creates LessonQuizSubmission');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
