# STAGE 1: Database Schema — Схема базы данных

**Статус:** 🟡 Не начато  
**Зависимости:** Нет  
**Следующая стадия:** STAGE-2-SERVICE-WORKER.md

## 🎯 Цель стадии

Создать схему БД для:
- Учебных треков (Duolingo-style)
- Геймификации (XP, стрики, лиги)
- Библиотеки книг
- Push-уведомлений

## 📊 Новые таблицы

### 1. Learning Paths (Учебные треки)

```prisma
// Учебный трек (например: "Арабский алфавит", "Основы акыды")
model LearningPath {
  id          String   @id @default(cuid())
  title       String   // "Арабский алфавит"
  description String?
  icon        String?  // emoji или URL иконки
  difficulty  String   // BEGINNER, INTERMEDIATE, ADVANCED
  category    String   // ARABIC, AQEEDAH, FIQH, QURAN, HADITH
  order       Int      @default(0)
  isPublished Boolean  @default(false)
  
  units       LearningUnit[]
  userProgress UserLearningProgress[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([category, isPublished])
}

// Юнит внутри трека (как в Duolingo)
model LearningUnit {
  id          String   @id @default(cuid())
  pathId      String
  path        LearningPath @relation(fields: [pathId], references: [id], onDelete: Cascade)
  
  title       String   // "Буквы Алиф-Ба"
  description String?
  order       Int
  
  lessons     LearningLesson[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([pathId, order])
}

// Урок внутри юнита
model LearningLesson {
  id          String   @id @default(cuid())
  unitId      String
  unit        LearningUnit @relation(fields: [unitId], references: [id], onDelete: Cascade)
  
  title       String
  type        String   // LESSON, PRACTICE, STORY, TEST
  order       Int
  xpReward    Int      @default(10)
  
  exercises   Exercise[]
  completions LessonCompletion[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([unitId, order])
}

// Упражнение внутри урока
model Exercise {
  id          String   @id @default(cuid())
  lessonId    String
  lesson      LearningLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  
  type        String   // MULTIPLE_CHOICE, TRANSLATE, MATCH, FILL_BLANK, AUDIO, SPEAKING
  question    String   // JSON с вопросом
  correctAnswer String // JSON с правильным ответом
  options     String?  // JSON с вариантами (для multiple choice)
  audioUrl    String?
  imageUrl    String?
  order       Int
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([lessonId, order])
}
```

### 2. User Progress (Прогресс пользователя)

```prisma
// Прогресс по треку
model UserLearningProgress {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  pathId      String
  path        LearningPath @relation(fields: [pathId], references: [id], onDelete: Cascade)
  
  currentUnitId String?
  isCompleted   Boolean @default(false)
  completedAt   DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, pathId])
  @@index([userId])
}

// Завершение урока
model LessonCompletion {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId    String
  lesson      LearningLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  
  score       Int      // процент правильных ответов
  xpEarned    Int
  completedAt DateTime @default(now())
  
  @@unique([userId, lessonId])
  @@index([userId, completedAt])
}
```

### 3. Gamification (Геймификация)

```prisma
// Профиль геймификации пользователя
model UserGameProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  totalXP     Int      @default(0)
  level       Int      @default(1)
  currentStreak Int    @default(0)
  longestStreak Int    @default(0)
  lastActivityDate DateTime?
  
  // Лиги
  league      String   @default("BRONZE") // BRONZE, SILVER, GOLD, PLATINUM, DIAMOND
  leagueRank  Int      @default(0)
  
  // Жизни (как в Duolingo)
  hearts      Int      @default(5)
  heartsRefillAt DateTime?
  
  achievements UserAchievement[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([league, leagueRank])
}

// Достижения
model Achievement {
  id          String   @id @default(cuid())
  key         String   @unique // "first_lesson", "7_day_streak", "100_xp"
  title       String
  description String
  icon        String   // emoji или URL
  xpReward    Int      @default(0)
  
  category    String   // STREAK, XP, LESSONS, SPECIAL
  requirement String   // JSON с условиями
  
  users       UserAchievement[]
  
  createdAt   DateTime @default(now())
}

// Достижения пользователя
model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievementId String
  achievement   Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)
  
  unlockedAt    DateTime @default(now())
  
  @@unique([userId, achievementId])
  @@index([userId])
}
```

### 4. Library (Библиотека)

```prisma
// Книга в библиотеке
model Book {
  id          String   @id @default(cuid())
  title       String
  author      String?
  description String?
  coverUrl    String?
  fileUrl     String   // URL к PDF/EPUB
  fileSize    Int      // в байтах
  
  type        String   // PUBLIC (для всех) или COURSE (только для учеников курса)
  category    String   // QURAN, HADITH, FIQH, AQEEDAH, ARABIC, HISTORY
  
  // Если type = COURSE, привязка к курсу
  courseId    String?
  course      Course?  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  isPublished Boolean  @default(false)
  
  readProgress BookReadProgress[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([type, category, isPublished])
  @@index([courseId])
}

// Прогресс чтения
model BookReadProgress {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookId      String
  book        Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  
  currentPage Int      @default(0)
  totalPages  Int
  progress    Int      @default(0) // процент
  
  bookmarks   String?  // JSON массив закладок
  notes       String?  // JSON массив заметок
  
  lastReadAt  DateTime @default(now())
  
  @@unique([userId, bookId])
  @@index([userId])
}
```

### 5. Push Notifications (Уведомления)

```prisma
// Подписка на push-уведомления
model PushSubscription {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  endpoint    String   @unique
  p256dh      String
  auth        String
  
  // Настройки уведомлений
  enableLessonReminders Boolean @default(true)
  enableStreakReminders Boolean @default(true)
  enableAchievements    Boolean @default(true)
  enableChatMessages    Boolean @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId])
}

// История отправленных уведомлений
model NotificationLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type        String   // LESSON_REMINDER, STREAK_REMINDER, ACHIEVEMENT, CHAT_MESSAGE
  title       String
  body        String
  data        String?  // JSON с дополнительными данными
  
  sentAt      DateTime @default(now())
  clickedAt   DateTime?
  
  @@index([userId, sentAt])
}
```

## 🔗 Связи с существующими таблицами

### Обновление модели User

```prisma
model User {
  // ... существующие поля ...
  
  // Новые связи
  learningProgress    UserLearningProgress[]
  lessonCompletions   LessonCompletion[]
  gameProfile         UserGameProfile?
  achievements        UserAchievement[]
  bookProgress        BookReadProgress[]
  pushSubscriptions   PushSubscription[]
  notificationLogs    NotificationLog[]
}
```

### Обновление модели Course

```prisma
model Course {
  // ... существующие поля ...
  
  // Новая связь
  books               Book[]
}
```

## ✅ Чеклист выполнения

- [ ] Создать файл `prisma/schema-learning.prisma` с новыми моделями
- [ ] Добавить связи в существующие модели User и Course
- [ ] Создать миграцию: `npx prisma migrate dev --name add_learning_system`
- [ ] Запустить миграцию
- [ ] Создать seed данные для тестирования
- [ ] Проверить, что существующие таблицы не затронуты

## 🧪 Тестирование

После применения миграции проверить:

```bash
# 1. Проверить схему
npx prisma db pull

# 2. Проверить, что старые данные на месте
npm run dev
# Зайти в админку, проверить курсы, пользователей

# 3. Создать тестовый learning path
# (через Prisma Studio или API)
```

## ⚠️ Потенциальные проблемы

1. **Конфликт имён** — `Lesson` уже есть в существующей схеме
   - **Решение:** Используем `LearningLesson` для нового функционала

2. **Большой размер миграции**
   - **Решение:** Можно разбить на 2 миграции (сначала learning, потом gamification)

3. **Производительность индексов**
   - **Решение:** Все частые запросы покрыты индексами

## 📝 Примеры seed данных

```typescript
// prisma/seed-learning.ts
const learningPaths = [
  {
    title: "Арабский алфавит",
    description: "Изучи арабские буквы с нуля",
    icon: "🔤",
    difficulty: "BEGINNER",
    category: "ARABIC",
    order: 1,
    isPublished: true,
  },
  {
    title: "Основы акыды",
    description: "Фундаментальные знания о вере",
    icon: "📿",
    difficulty: "BEGINNER",
    category: "AQEEDAH",
    order: 2,
    isPublished: true,
  },
];
```

## 🔄 Следующая стадия

После завершения переходите к **[STAGE-2-SERVICE-WORKER.md](./STAGE-2-SERVICE-WORKER.md)**
