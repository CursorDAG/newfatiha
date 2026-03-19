# Fatiha.ru — Актуальное состояние проекта

Документ для онбординга нового агента. Описывает текущее состояние проекта и реализованный функционал.

**Дата обновления:** 2026-03-19

---

## 1. Описание проекта

**Fatiha.ru** — LMS (Learning Management System) для исламского образования. Онлайн-школа с живыми уроками, тестами, домашними заданиями и управлением студентами по потокам.

**Роли:**
- `STUDENT` — студент, видит свои потоки и уроки, сдаёт тесты, отслеживает прогресс
- `TEACHER` — учитель, управляет курсами, потоками, уроками, студентами, проверяет сдачи, видит аналитику
- `ADMIN` — полный доступ к функциям учителя

**Стадия:** MVP завершен. Все основные функции реализованы и готовы к тестированию.

---

## 2. Технологический стек

| Категория | Технология |
|-----------|-------------|
| Framework | Next.js 16 (App Router), React 19 |
| Язык | TypeScript |
| Стили | Tailwind CSS 4 (палитра emerald) |
| БД | PostgreSQL |
| ORM | Prisma 6 |
| Auth | NextAuth 4 (Credentials, JWT) |
| Видео | Jitsi Meet (external_api.js) |
| Хранилище | AWS S3 (для записей уроков) |
| UI | @dnd-kit (drag-and-drop), react-markdown, recharts |
| Логирование | Pino |

---

## 3. Реализованные фазы разработки

### ✅ Фаза 1: Система записей уроков

**Компоненты:**
- `src/components/teacher/RecordingUploadModal.tsx` - модальное окно загрузки записей
- `src/lib/s3.ts` - утилиты для работы с S3

**API endpoints:**
- `POST /api/teacher/lessons/[lessonId]/recording` - загрузка записи урока
- `GET /api/teacher/lessons/[lessonId]/recording` - получение URL записи
- `DELETE /api/teacher/lessons/[lessonId]/recording` - удаление записи

**Функционал:**
- Загрузка видеозаписей уроков в S3
- Генерация presigned URLs для просмотра
- Управление записями через интерфейс учителя
- Интеграция с существующей системой уроков

### ✅ Фаза 2: Система прогресса студентов

**Утилиты:**
- `src/lib/progress.ts` - расчет и кэширование прогресса студентов
  - Функция `recalculateStudentProgress(userId, streamId)`
  - Взвешенный расчет: уроки 40%, тесты 30%, ДЗ 30%
  - Сохранение в таблицу `StudentProgress` для быстрого доступа

**API endpoints:**
- `GET /api/student/progress` - общий прогресс студента по всем потокам
- `GET /api/student/progress/[streamId]` - детальный прогресс в конкретном потоке
- `GET /api/teacher/streams/[streamId]/progress` - прогресс всех студентов потока
- `POST /api/progress/video-heartbeat` - обновлен для триггера пересчета

**Компоненты студента:**
- `src/components/student/StudentProgressDashboard.tsx` - главная панель прогресса
- `src/components/student/StreamProgressCard.tsx` - карточка прогресса по потоку
- `src/components/student/ProgressMetricCard.tsx` - метрика с прогресс-баром
- `src/components/student/ActivityTimeline.tsx` - лента активности
- `src/components/student/DetailedProgressView.tsx` - детальный просмотр прогресса

**Компоненты учителя:**
- `src/components/teacher/TeacherProgressAnalytics.tsx` - аналитика прогресса студентов
  - Фильтры: все, отстающие (<50%), средние (50-80%), лидеры (>80%)
  - Сортировка по всем метрикам
  - Экспорт в CSV

**Интеграция:**
- Добавлена вкладка "📊 Прогресс" в `TeacherDashboard.tsx`
- Добавлена вкладка "📊 Мой прогресс" в `StudentDashboard.tsx`
- Автоматический пересчет прогресса при:
  - Завершении просмотра урока (80% порог)
  - Проверке теста учителем
  - Принятии домашнего задания

**База данных:**
- Добавлена таблица `StudentProgress` для кэширования метрик

### ✅ Фаза 3: Мобильная оптимизация

**PWA конфигурация:**
- `public/manifest.json` - манифест приложения
- `public/icon.svg`, `public/icon-192.png`, `public/icon-512.png` - иконки
- `src/app/layout.tsx` - метаданные для PWA (viewport, theme-color, apple-web-app)

**Адаптивная навигация:**
- `src/components/Navbar.tsx` - мобильное меню с гамбургером
- `src/components/teacher/TeacherShell.tsx` - боковое меню скрывается на мобильных
- `src/components/StudentDashboard.tsx` - мобильная навигация

**Responsive компоненты:**
- `TeacherProgressAnalytics` - адаптивные кнопки фильтров
- Все таблицы с горизонтальной прокруткой
- Grid layouts с breakpoints (sm:, md:, lg:)

**Оптимизация производительности:**
- `next.config.ts`:
  - Сжатие (compress: true)
  - Оптимизация изображений (AVIF, WebP)
  - Оптимизация импортов (react-markdown, recharts, date-fns)

---

## 4. Структура проекта

```
newfatiha/
├── prisma/
│   ├── schema.prisma       # Модели БД (включая StudentProgress)
│   ├── migrations/         # История миграций
│   └── seed.ts             # Сид данных
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout с PWA метаданными
│   │   ├── page.tsx        # Лендинг
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── student/
│   │   │   │   └── progress/
│   │   │   │       ├── route.ts              # Общий прогресс
│   │   │   │       └── [streamId]/route.ts   # Детальный прогресс
│   │   │   ├── progress/
│   │   │   │   └── video-heartbeat/route.ts  # С триггером пересчета
│   │   │   └── teacher/
│   │   │       ├── streams/[streamId]/
│   │   │       │   └── progress/route.ts     # Прогресс студентов
│   │   │       ├── lessons/[lessonId]/
│   │   │       │   └── recording/route.ts    # Управление записями
│   │   │       └── ... (остальные endpoints)
│   │   ├── teacher/page.tsx
│   │   ├── student/page.tsx
│   │   └── lesson/[lessonId]/
│   │       ├── page.tsx
│   │       └── room-client.tsx
│   ├── components/
│   │   ├── Navbar.tsx                        # С мобильным меню
│   │   ├── TeacherDashboard.tsx              # С вкладкой прогресса
│   │   ├── StudentDashboard.tsx              # С вкладкой прогресса и мобильным меню
│   │   ├── teacher/
│   │   │   ├── TeacherShell.tsx              # С мобильным меню
│   │   │   ├── TeacherProgressAnalytics.tsx  # Новый компонент
│   │   │   ├── RecordingUploadModal.tsx      # Новый компонент
│   │   │   └── ... (остальные компоненты)
│   │   └── student/
│   │       ├── StudentProgressDashboard.tsx  # Новый компонент
│   │       ├── StreamProgressCard.tsx        # Новый компонент
│   │       ├── ProgressMetricCard.tsx        # Новый компонент
│   │       ├── ActivityTimeline.tsx          # Новый компонент
│   │       ├── DetailedProgressView.tsx      # Новый компонент
│   │       └── LiveJitsiEmbed.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── progress.ts                       # Новая утилита
│   │   ├── s3.ts                             # Новая утилита
│   │   ├── api-handler.ts
│   │   ├── errors.ts
│   │   ├── validation.ts
│   │   ├── logger.ts
│   │   └── env.ts
│   └── types/
├── public/
│   ├── manifest.json                         # Новый файл
│   ├── icon.svg                              # Новый файл
│   ├── icon-192.png                          # Новый файл
│   └── icon-512.png                          # Новый файл
├── scripts/
│   └── generate-icons.js                     # Новый скрипт
├── next.config.ts                            # Обновлен с оптимизациями
├── CLAUDE.md                                 # Справочник для разработки
└── PROJECT.md                                # Этот файл
```

---

## 5. Основные компоненты

### Учитель (Teacher Dashboard)

**Вкладки:**
- 🏠 **Обзор** - статистика и быстрый доступ
- 📚 **Курсы** - CRUD курсов
- 🧩 **Потоки** - управление потоками
- 📖 **Уроки** - создание, редактирование, импорт, библиотека шаблонов, загрузка записей
- 👥 **Студенты** - управление студентами, инвайты, переводы
- 📈 **Аналитика** - активность за 30 дней
- 📊 **Прогресс** - детальная аналитика прогресса студентов (новое)
- 📓 **Журнал** - проверка тестов и ДЗ
- 🔴 **Live** - Jitsi комната
- 📝 **Д/З** - создание и проверка заданий
- 🗓 **Расписание** - сетка расписания

### Студент (Student Dashboard)

**Вкладки:**
- 🏠 **Главная** - обзор потоков и статистика
- 📖 **Мои уроки** - список уроков с доступом
- 📝 **Домашние задания** - сдача ДЗ
- 🧪 **Тесты** - результаты тестов
- 📊 **Мой прогресс** - детальная статистика прогресса (новое)
- 🗓 **Расписание** - расписание занятий

---

## 6. API Routes (полный список)

### Student Progress (новые)
- `GET /api/student/progress` - общий прогресс по всем потокам
- `GET /api/student/progress/[streamId]` - детальный прогресс в потоке
- `POST /api/progress/video-heartbeat` - heartbeat с пересчетом прогресса

### Teacher Progress (новые)
- `GET /api/teacher/streams/[streamId]/progress` - прогресс всех студентов

### Lesson Recordings (новые)
- `POST /api/teacher/lessons/[lessonId]/recording` - загрузка записи
- `GET /api/teacher/lessons/[lessonId]/recording` - получение URL
- `DELETE /api/teacher/lessons/[lessonId]/recording` - удаление записи

### Auth & Join
- `POST /api/auth/[...nextauth]` - NextAuth
- `GET /api/join/[token]` - проверка токена
- `POST /api/join/[token]` - запись студента

### Teacher - Courses
- `GET /api/teacher/courses` - список курсов
- `POST /api/teacher/courses` - создать курс
- `GET /api/teacher/courses/[courseId]` - курс по ID
- `PATCH /api/teacher/courses/[courseId]` - обновить
- `DELETE /api/teacher/courses/[courseId]` - удалить

### Teacher - Streams
- `GET /api/teacher/streams` - список потоков
- `POST /api/teacher/streams` - создать поток
- `GET /api/teacher/streams/[streamId]` - поток по ID
- `PATCH /api/teacher/streams/[streamId]` - обновить
- `DELETE /api/teacher/streams/[streamId]` - удалить

### Teacher - Lessons
- `POST /api/teacher/lessons` - создать урок
- `PATCH /api/teacher/lessons` - изменить порядок
- `DELETE /api/teacher/lessons/[lessonId]` - удалить
- `POST /api/teacher/lessons/import` - импорт уроков
- `POST /api/teacher/lessons/from-template` - из шаблона
- `GET /api/teacher/lessons/library` - библиотека

### Teacher - Quizzes
- `POST /api/teacher/quizzes` - создать тест
- `GET /api/teacher/questions/library` - библиотека вопросов
- `POST /api/teacher/quiz-submissions/[submissionId]/check` - проверить
- `GET /api/teacher/quiz-submissions/[submissionId]/audio` - аудио

### Teacher - Analytics & Gradebook
- `GET /api/teacher/analytics` - аналитика
- `GET /api/teacher/gradebook` - журнал
- `GET /api/teacher/students/[enrollmentId]/progress` - прогресс студента

### Teacher - Homework
- `GET /api/teacher/homework` - список ДЗ
- `POST /api/teacher/homework` - создать
- `POST /api/teacher/homework/[assignmentId]/submit` - сдать
- `GET /api/teacher/homework/[assignmentId]/submissions` - сдачи
- `POST /api/teacher/homework/submissions/[id]/check` - проверить

### Teacher - Schedule & Manage
- `GET /api/teacher/schedule` - расписание
- `POST /api/teacher/schedule` - сохранить
- `POST /api/teacher/manage-student` - управление студентами

### Teacher - Profile
- `GET /api/teacher/profile` - профиль
- `PATCH /api/teacher/profile` - обновить
- `POST /api/teacher/avatar` - аватар
- `POST /api/teacher/change-password` - пароль

### Student & Quiz
- `POST /api/quiz/[quizId]/submit` - сдать тест
- `POST /api/activity/heartbeat` - heartbeat

---

## 7. База данных (Prisma)

### Новые таблицы

**StudentProgress** (добавлена в Фазе 2):
```prisma
model StudentProgress {
  id                    String   @id @default(uuid())
  userId                String
  streamId              String
  lessonsCompleted      Int      @default(0)
  lessonsTotal          Int      @default(0)
  quizzesPassed         Int      @default(0)
  quizzesTotal          Int      @default(0)
  averageQuizScore      Float?
  homeworksAccepted     Int      @default(0)
  homeworksTotal        Int      @default(0)
  totalWatchTimeSeconds Int      @default(0)
  lastActivityAt        DateTime?
  updatedAt             DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  stream Stream @relation(fields: [streamId], references: [id], onDelete: Cascade)

  @@unique([userId, streamId])
}
```

### Обновленные таблицы

**Lesson** (добавлено поле recordingUrl):
- `recordingUrl String?` - URL записи урока в S3

---

## 8. Переменные окружения

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fatiha"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# AWS S3 (для записей уроков)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="fatiha-recordings"

# Logging (optional)
LOG_LEVEL="debug"
```

---

## 9. Команды

```bash
# Разработка
npm run dev              # http://localhost:3000

# База данных
npx prisma generate      # После изменений schema
npx prisma migrate dev   # Создать и применить миграцию
npx prisma db seed       # Сид (admin@fatiha.ru / admin123)
npx prisma studio        # GUI

# Иконки PWA
node scripts/generate-icons.js  # Генерация placeholder иконок

# Production
npm run build
npm start
```

---

## 10. Тестовые данные

После `npx prisma db seed`:

**Учитель:**
- Email: `admin@fatiha.ru`
- Пароль: `admin123`

**Студенты:**
- `ali@student.ru` / `student123`
- `fatima@student.ru` / `student123`
- `omar@student.ru` / `student123`

---

## 11. Что НЕ реализовано (потенциальные задачи)

### Высокий приоритет
- Реальные иконки PWA (сейчас placeholder)
- Service Worker для offline режима
- Push-уведомления
- Оптимизация изображений (sharp для конвертации SVG → PNG)

### Средний приоритет
- Тесты (unit, integration, e2e)
- Миграция voice recordings из PostgreSQL в S3
- Redis для кэширования и rate limiting
- Email уведомления (nodemailer настроен, но не используется)
- Jitsi JWT токены для безопасности

### Низкий приоритет
- Интернационализация (i18n)
- Темная тема для учителя
- Экспорт аналитики в PDF
- Интеграция с платежными системами
- Мобильное приложение (React Native)

---

## 12. Важные замечания для следующего агента

### Архитектурные решения

1. **Прогресс студентов кэшируется** в таблице `StudentProgress`. Не пересчитывайте на каждый запрос - используйте `recalculateStudentProgress()` только при изменениях.

2. **Записи уроков в S3**, не в БД. URL генерируются через presigned URLs с TTL 1 час.

3. **Voice recordings всё ещё в PostgreSQL** (поле `Bytes`). Это временное решение, требует миграции в S3 для production.

4. **PWA иконки - placeholder**. Для production нужно:
   ```bash
   npm install sharp
   npx sharp -i public/icon.svg -o public/icon-192.png resize 192 192
   npx sharp -i public/icon.svg -o public/icon-512.png resize 512 512
   ```

5. **Мобильная навигация реализована**, но требует тестирования на реальных устройствах.

### Конвенции кода

- Всегда используйте `@/lib/prisma` для доступа к БД
- Все API routes оборачивайте в `withErrorHandling`
- Используйте Zod схемы из `@/lib/validation.ts`
- Компоненты учителя: светлая тема (`bg-slate-50`)
- Компоненты студента: тёмная тема (`bg-slate-950`)
- Язык интерфейса: только русский

### Перед началом работы

1. Прочитайте `CLAUDE.md` - там справочник по архитектуре
2. Запустите `npm run dev` и проверьте, что всё работает
3. Проверьте `.env` - все переменные должны быть заполнены
4. Запустите `npx prisma studio` для просмотра данных

---

**Проект готов к тестированию и дальнейшей разработке.**
