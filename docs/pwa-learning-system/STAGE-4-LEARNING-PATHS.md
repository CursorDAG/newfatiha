# STAGE 4: Learning Paths — Duolingo-style обучение

**Статус:** 🟡 Не начато  
**Зависимости:** STAGE-1-DATABASE.md  
**Следующая стадия:** STAGE-5-GAMIFICATION.md

## 🎯 Цель стадии

Создать систему самостоятельного обучения:
- Учебные треки (Learning Paths)
- Юниты и уроки
- Упражнения разных типов
- Прогресс пользователя

## 📁 Структура файлов

```
src/
  app/
    student/
      learn/
        page.tsx                    # Главная страница обучения
        [pathId]/
          page.tsx                  # Трек обучения
          [unitId]/
            [lessonId]/
              page.tsx              # Урок
  components/
    learning/
      PathCard.tsx                  # Карточка трека
      UnitProgress.tsx              # Прогресс по юниту
      ExerciseRenderer.tsx          # Рендер упражнений
      LessonComplete.tsx            # Экран завершения урока
  lib/
    learning/
      exercises.ts                  # Логика упражнений
      progress.ts                   # Работа с прогрессом
```

## 📝 Реализация

### 1. Главная страница обучения

```typescript
// src/app/student/learn/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import PathCard from '@/components/learning/PathCard';

export default async function LearnPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Получить все опубликованные треки
  const paths = await prisma.learningPath.findMany({
    where: { isPublished: true },
    include: {
      units: {
        include: {
          lessons: true,
        },
      },
      userProgress: {
        where: { userId: session.user.id },
      },
    },
    orderBy: { order: 'asc' },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Изучай Ислам
          </h1>
          <p className="text-slate-600">
            Выбери трек обучения и начни свой путь
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map((path) => (
            <PathCard
              key={path.id}
              path={path}
              progress={path.userProgress[0]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 2. Карточка трека

```typescript
// src/components/learning/PathCard.tsx

'use client';

import Link from 'next/link';
import { LearningPath, LearningUnit, LearningLesson, UserLearningProgress } from '@prisma/client';

type PathWithUnits = LearningPath & {
  units: (LearningUnit & { lessons: LearningLesson[] })[];
};

interface PathCardProps {
  path: PathWithUnits;
  progress?: UserLearningProgress;
}

export default function PathCard({ path, progress }: PathCardProps) {
  const totalLessons = path.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const completedLessons = progress?.isCompleted ? totalLessons : 0;
  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const difficultyColors = {
    BEGINNER: 'bg-green-100 text-green-700',
    INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
    ADVANCED: 'bg-red-100 text-red-700',
  };

  return (
    <Link href={`/student/learn/${path.id}`}>
      <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{path.icon}</div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[path.difficulty as keyof typeof difficultyColors]}`}>
            {path.difficulty}
          </span>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
          {path.title}
        </h3>
        
        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {path.description}
        </p>

        {/* Прогресс */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Прогресс</span>
            <span className="font-medium text-slate-900">
              {completedLessons}/{totalLessons} уроков
            </span>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Кнопка */}
        <button className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
          {progress ? 'Продолжить' : 'Начать'}
        </button>
      </div>
    </Link>
  );
}
```

### 3. Страница трека с юнитами

```typescript
// src/app/student/learn/[pathId]/page.tsx

import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import UnitProgress from '@/components/learning/UnitProgress';

export default async function PathPage({ params }: { params: { pathId: string } }) {
  const session = await getServerSession(authOptions);
  
  const path = await prisma.learningPath.findUnique({
    where: { id: params.pathId },
    include: {
      units: {
        include: {
          lessons: {
            include: {
              completions: {
                where: { userId: session!.user.id },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!path) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-6xl">{path.icon}</span>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">{path.title}</h1>
              <p className="text-slate-600 mt-1">{path.description}</p>
            </div>
          </div>
        </div>

        {/* Юниты */}
        <div className="space-y-8">
          {path.units.map((unit, index) => (
            <UnitProgress
              key={unit.id}
              unit={unit}
              unitNumber={index + 1}
              pathId={path.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 4. Компонент юнита

```typescript
// src/components/learning/UnitProgress.tsx

'use client';

import Link from 'next/link';
import { LearningUnit, LearningLesson, LessonCompletion } from '@prisma/client';
import { CheckCircle, Lock, Play } from 'lucide-react';

type LessonWithCompletion = LearningLesson & {
  completions: LessonCompletion[];
};

type UnitWithLessons = LearningUnit & {
  lessons: LessonWithCompletion[];
};

interface UnitProgressProps {
  unit: UnitWithLessons;
  unitNumber: number;
  pathId: string;
}

export default function UnitProgress({ unit, unitNumber, pathId }: UnitProgressProps) {
  const completedCount = unit.lessons.filter(l => l.completions.length > 0).length;
  const isUnlocked = unitNumber === 1 || completedCount > 0;

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm ${!isUnlocked && 'opacity-50'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Юнит {unitNumber}: {unit.title}
          </h2>
          <p className="text-slate-600 mt-1">{unit.description}</p>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-600">
            {completedCount}/{unit.lessons.length}
          </div>
          <div className="text-sm text-slate-600">завершено</div>
        </div>
      </div>

      {/* Уроки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {unit.lessons.map((lesson, index) => {
          const isCompleted = lesson.completions.length > 0;
          const isAvailable = index === 0 || unit.lessons[index - 1].completions.length > 0;
          const canStart = isUnlocked && isAvailable;

          return (
            <Link
              key={lesson.id}
              href={canStart ? `/student/learn/${pathId}/${unit.id}/${lesson.id}` : '#'}
              className={`block ${!canStart && 'pointer-events-none'}`}
            >
              <div className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${isCompleted ? 'border-emerald-500 bg-emerald-50' : 
                  canStart ? 'border-slate-200 hover:border-emerald-300 hover:shadow-md' : 
                  'border-slate-200 bg-slate-50'}
              `}>
                {/* Иконка статуса */}
                <div className="absolute top-2 right-2">
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  ) : !canStart ? (
                    <Lock className="w-6 h-6 text-slate-400" />
                  ) : (
                    <Play className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="pr-8">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Урок {index + 1}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-600 font-medium">
                      +{lesson.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

### 5. Страница урока

```typescript
// src/app/student/learn/[pathId]/[unitId]/[lessonId]/page.tsx

import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import ExerciseRenderer from '@/components/learning/ExerciseRenderer';

export default async function LessonPage({
  params,
}: {
  params: { pathId: string; unitId: string; lessonId: string };
}) {
  const session = await getServerSession(authOptions);

  const lesson = await prisma.learningLesson.findUnique({
    where: { id: params.lessonId },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
      },
      unit: {
        include: {
          path: true,
        },
      },
    },
  });

  if (!lesson) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <ExerciseRenderer
        lesson={lesson}
        userId={session!.user.id}
        pathId={params.pathId}
        unitId={params.unitId}
      />
    </div>
  );
}
```

### 6. Рендер упражнений (клиентский компонент)

```typescript
// src/components/learning/ExerciseRenderer.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Exercise, LearningLesson } from '@prisma/client';
import MultipleChoice from './exercises/MultipleChoice';
import TranslateExercise from './exercises/TranslateExercise';
import LessonComplete from './LessonComplete';

type LessonWithExercises = LearningLesson & {
  exercises: Exercise[];
  unit: { path: { title: string } };
};

interface ExerciseRendererProps {
  lesson: LessonWithExercises;
  userId: string;
  pathId: string;
  unitId: string;
}

export default function ExerciseRenderer({
  lesson,
  userId,
  pathId,
  unitId,
}: ExerciseRendererProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);

  const currentExercise = lesson.exercises[currentIndex];
  const progress = ((currentIndex + 1) / lesson.exercises.length) * 100;

  const handleAnswer = async (answer: any) => {
    const newAnswers = { ...answers, [currentExercise.id]: answer };
    setAnswers(newAnswers);

    // Проверить ответ
    const isCorrect = checkAnswer(currentExercise, answer);
    if (isCorrect) {
      setScore(score + 1);
    }

    // Следующее упражнение или завершение
    if (currentIndex < lesson.exercises.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 1000);
    } else {
      // Завершить урок
      await completeLesson();
    }
  };

  const completeLesson = async () => {
    const finalScore = Math.round((score / lesson.exercises.length) * 100);

    await fetch('/api/learning/complete-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: lesson.id,
        score: finalScore,
        xpEarned: lesson.xpReward,
      }),
    });

    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <LessonComplete
        lesson={lesson}
        score={Math.round((score / lesson.exercises.length) * 100)}
        xpEarned={lesson.xpReward}
        onContinue={() => router.push(`/student/learn/${pathId}`)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Прогресс бар */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-600 mb-2">
          <span>{lesson.unit.path.title}</span>
          <span>{currentIndex + 1} / {lesson.exercises.length}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Упражнение */}
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        {currentExercise.type === 'MULTIPLE_CHOICE' && (
          <MultipleChoice exercise={currentExercise} onAnswer={handleAnswer} />
        )}
        {currentExercise.type === 'TRANSLATE' && (
          <TranslateExercise exercise={currentExercise} onAnswer={handleAnswer} />
        )}
        {/* Добавить другие типы упражнений */}
      </div>
    </div>
  );
}

function checkAnswer(exercise: Exercise, answer: any): boolean {
  const correctAnswer = JSON.parse(exercise.correctAnswer);
  
  if (exercise.type === 'MULTIPLE_CHOICE') {
    return answer === correctAnswer;
  }
  
  if (exercise.type === 'TRANSLATE') {
    return answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  }
  
  return false;
}
```

## ✅ Чеклист выполнения

- [ ] Создать страницу `/student/learn`
- [ ] Создать компонент PathCard
- [ ] Создать страницу трека с юнитами
- [ ] Создать компонент UnitProgress
- [ ] Создать страницу урока
- [ ] Создать ExerciseRenderer
- [ ] Создать компоненты упражнений (MultipleChoice, Translate, и т.д.)
- [ ] Создать экран завершения урока
- [ ] Создать API для завершения урока
- [ ] Протестировать прохождение урока

## 🔄 Следующая стадия

После завершения переходите к **[STAGE-5-GAMIFICATION.md](./STAGE-5-GAMIFICATION.md)**
