# Fatiha.ru — описание проекта для Claude Code

Документ для онбординга и работы с кодом. Передайте этот файл вместе с репозиторием для быстрого ознакомления с проектом.

---

## 1. Описание проекта

**Fatiha.ru** — LMS (Learning Management System) для исламского образования. Онлайн-школа с живыми уроками, тестами, домашними заданиями и управлением студентами по потокам.

**Роли:**
- `STUDENT` — студент, видит свои потоки и уроки, сдаёт тесты
- `TEACHER` — учитель, управляет курсами, потоками, уроками, студентами, проверяет сдачи
- `ADMIN` — полный доступ к функциям учителя

**Основные возможности:**
- Live-уроки через Jitsi Meet
- Видео- и текстовые уроки
- Тесты: множественный выбор (MCQ) и голосовые
- Домашние задания
- Инвайты по токенам
- Аналитика и журнал успеваемости
- Heartbeat-трекинг активности

**Стадия:** MVP, основные сценарии учителя и студента реализованы.

---

## 2. Технологический стек

| Категория | Технология |
|-----------|-------------|
| Framework | Next.js 16 (App Router), React 19 |
| Язык | TypeScript |
| Стили | Tailwind CSS 4 (палитра emerald) |
| БД | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth 4 (Credentials, JWT) |
| Видео | Jitsi Meet (external_api.js) |
| UI | @dnd-kit (drag-and-drop), react-markdown |

---

## 3. Структура проекта

```
newfatiha/
├── prisma/
│   ├── schema.prisma       # Модели БД
│   └── seed.ts             # Сид: учитель, курсы, потоки, студенты, уроки
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout, Navbar, Geist fonts
│   │   ├── page.tsx        # Лендинг (главная)
│   │   ├── globals.css
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── activity/heartbeat/route.ts
│   │   │   ├── join/[token]/route.ts
│   │   │   ├── quiz/[quizId]/submit/route.ts
│   │   │   └── teacher/
│   │   │       ├── courses/route.ts
│   │   │       ├── courses/[courseId]/route.ts
│   │   │       ├── streams/route.ts
│   │   │       ├── streams/[streamId]/route.ts
│   │   │       ├── lessons/route.ts
│   │   │       ├── lessons/[lessonId]/route.ts
│   │   │       ├── lessons/import/route.ts
│   │   │       ├── lessons/from-template/route.ts
│   │   │       ├── lessons/library/route.ts
│   │   │       ├── quizzes/route.ts
│   │   │       ├── questions/library/route.ts
│   │   │       ├── quiz-submissions/[submissionId]/check/route.ts
│   │   │       ├── quiz-submissions/[submissionId]/audio/route.ts
│   │   │       ├── analytics/route.ts
│   │   │       ├── gradebook/route.ts
│   │   │       ├── homework/route.ts
│   │   │       ├── homework/[assignmentId]/submit/route.ts
│   │   │       ├── homework/[assignmentId]/submissions/route.ts
│   │   │       ├── homework/submissions/[id]/check/route.ts
│   │   │       ├── schedule/route.ts
│   │   │       ├── manage-student/route.ts
│   │   │       ├── students/[enrollmentId]/progress/route.ts
│   │   │       ├── profile/route.ts
│   │   │       ├── avatar/route.ts
│   │   │       └── change-password/route.ts
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   └── redirect/page.tsx   # Редирект по роли
│   │   ├── join/[token]/page.tsx   # Страница инвайта
│   │   ├── lesson/[lessonId]/
│   │   │   ├── page.tsx            # Сервер: данные урока
│   │   │   └── room-client.tsx     # Клиент: Jitsi, видео, текст, тест
│   │   ├── teacher/
│   │   │   ├── page.tsx            # Кабинет учителя
│   │   │   ├── settings/page.tsx
│   │   │   └── schedule/page.tsx
│   │   ├── student/page.tsx        # Кабинет студента
│   │   └── unauthorized/page.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── CreateCourseModal.tsx
│   │   ├── ScheduleGrid.tsx
│   │   ├── TeacherDashboard.tsx    # Главный компонент кабинета учителя
│   │   ├── StudentDashboard.tsx
│   │   ├── TeacherSchedulePage.tsx
│   │   └── teacher/
│   │       ├── TeacherShell.tsx    # Оболочка с табами и header
│   │       ├── TeacherStudentsTab.tsx
│   │       ├── TeacherStreamsTab.tsx
│   │       ├── TeacherLessonsTab.tsx
│   │       ├── TeacherLiveTab.tsx
│   │       ├── TeacherAnalyticsTab.tsx
│   │       ├── TeacherGradebookTab.tsx
│   │       ├── TeacherHomeworkTab.tsx
│   │       ├── TeacherSettingsPage.tsx
│   │       ├── ImportLessonsModal.tsx
│   │       ├── LessonLibraryModal.tsx
│   │       ├── StudentProgressModal.tsx
│   │       ├── hooks/
│   │       │   ├── useAnalytics.ts
│   │       │   ├── useGradebook.ts
│   │       │   └── useHomework.ts
│   │       └── ui/
│   │           ├── Button.tsx
│   │           ├── ModalShell.tsx
│   │           ├── ConfirmModal.tsx
│   │           ├── EmptyState.tsx
│   │           ├── StatusBadge.tsx
│   │           └── ToastStack.tsx
│   ├── lib/
│   │   └── prisma.ts               # Prisma singleton
│   ├── middleware.ts               # Защита /teacher, /student по роли
│   └── types/
│       ├── index.ts
│       └── next-auth.d.ts          # session.user.id, session.user.role
├── package.json
├── next.config.ts
├── tsconfig.json
├── docker-compose.yml              # Postgres 16
├── CLAUDE.md                      # Краткая справка
├── HANDOFF.md                     # Handoff-документ
└── PROJECT.md                     # Этот файл
```

---

## 4. API Routes

### Auth & Join

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/[...nextauth]` | NextAuth (signin, signout, session) |
| GET | `/api/join/[token]` | Проверка токена инвайта |
| POST | `/api/join/[token]` | Запись студента по токену |

### Teacher — Courses

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/teacher/courses` | Список курсов учителя |
| POST | `/api/teacher/courses` | Создать курс |
| GET | `/api/teacher/courses/[courseId]` | Курс по ID |
| PATCH | `/api/teacher/courses/[courseId]` | Обновить курс |
| DELETE | `/api/teacher/courses/[courseId]` | Удалить курс |

### Teacher — Streams

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/teacher/streams` | Список потоков (по teacherId) |
| POST | `/api/teacher/streams` | Создать поток |
| GET | `/api/teacher/streams/[streamId]` | Поток по ID |
| PATCH | `/api/teacher/streams/[streamId]` | Обновить поток |
| DELETE | `/api/teacher/streams/[streamId]` | Удалить поток |

### Teacher — Lessons

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/teacher/lessons` | Создать урок |
| PATCH | `/api/teacher/lessons` | Изменить порядок (lessonIdsInOrder) |
| DELETE | `/api/teacher/lessons/[lessonId]` | Удалить урок |
| POST | `/api/teacher/lessons/import` | Импорт уроков: `fromStreamId`, `toStreamId`, `lessonIds[]` |
| POST | `/api/teacher/lessons/from-template` | Добавить урок из шаблона: `streamId`, `templateLessonId` |
| GET | `/api/teacher/lessons/library` | Библиотека шаблонов: `?topic=`, `?level=` |

### Teacher — Quizzes & Submissions

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/teacher/quizzes` | Создать тест к уроку |
| GET | `/api/teacher/questions/library` | Библиотека вопросов |
| POST | `/api/teacher/quiz-submissions/[submissionId]/check` | Проверить сдачу: `status` (PASSED/FAILED) |
| GET | `/api/teacher/quiz-submissions/[submissionId]/audio` | Аудио голосовой сдачи |

### Teacher — Analytics & Gradebook

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/teacher/analytics` | Аналитика: `?streamId=` |
| GET | `/api/teacher/gradebook` | Журнал: `?streamId=` |
| GET | `/api/teacher/students/[enrollmentId]/progress` | Прогресс студента |

### Teacher — Homework

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/teacher/homework` | Список ДЗ: `?streamId=` |
| POST | `/api/teacher/homework` | Создать задание |
| POST | `/api/teacher/homework/[assignmentId]/submit` | Студент сдаёт (через enrollmentId) |
| GET | `/api/teacher/homework/[assignmentId]/submissions` | Список сдач |
| POST | `/api/teacher/homework/submissions/[id]/check` | Проверить сдачу |

### Teacher — Schedule & Manage

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/teacher/schedule` | Расписание: `?streamId=` |
| POST | `/api/teacher/schedule` | Сохранить слоты |
| POST | `/api/teacher/manage-student` | `action`: generateInvite, transferStudent, kickStudent, repeatYear |

### Teacher — Profile

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/teacher/profile` | Профиль учителя |
| PATCH | `/api/teacher/profile` | Обновить профиль |
| POST | `/api/teacher/avatar` | Загрузить аватар |
| POST | `/api/teacher/change-password` | Сменить пароль |

### Student & Quiz

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/quiz/[quizId]/submit` | Сдать тест (MCQ или VOICE) |
| POST | `/api/activity/heartbeat` | Heartbeat: `kind` (APP/LESSON/LIVE_ROOM), `streamId`, `lessonId` |

---

## 5. Модели данных (Prisma)

### Основные сущности

| Модель | Описание |
|--------|----------|
| **User** | id, email, password, name, role (STUDENT/TEACHER/ADMIN), avatar, bio, skills |
| **Course** | Курс учителя: title, description, capacity, published |
| **Stream** | Поток в курсе: name, level, schedule, color, courseId, teacherId |
| **StreamScheduleSlot** | Слот расписания: dayOfWeek, startMinutes, durationMinutes |
| **Enrollment** | Студент в потоке: userId, streamId, status (ACTIVE/TRANSFERRED/REPEATING/KICKED) |
| **InviteToken** | Токен инвайта на поток (один на stream) |
| **Lesson** | Урок: title, type (LIVE/VIDEO/TEXT), content, sortOrder, published, isTemplate, topic, level |
| **LessonQuiz** | Тест: lessonId, title, type (MULTIPLE_CHOICE/VOICE) |
| **LessonQuizQuestion** | Вопрос: prompt, options |
| **LessonQuizOption** | Вариант ответа: text, isCorrect |
| **LessonQuizSubmission** | Сдача теста: selectedOptionId или voiceData, status (SUBMITTED/PASSED/FAILED), checkedBy |
| **ActivitySession** | Сессия активности: kind (APP/LESSON/LIVE_ROOM), streamId, lessonId, startedAt, lastSeenAt |
| **Homework** | Шаблон ДЗ к уроку (audioUrl, imageUrl) |
| **HomeworkAssignment** | Задание потоку: streamId, lessonId?, title, type (TEXT/AUDIO), dueAt |
| **HomeworkSubmission** | Сдача ДЗ: status, grade, teacherComment, contentText/contentUrl |

### Связи

```
User --< Course (teacher)
Course --< Stream
Stream --< Lesson, Enrollment, StreamScheduleSlot, HomeworkAssignment, InviteToken
Lesson --< LessonQuiz, Homework, HomeworkAssignment
Enrollment -- User, Stream
LessonQuiz --< LessonQuizQuestion --< LessonQuizOption
LessonQuiz --< LessonQuizSubmission -- User (student, checkedBy)
```

---

## 6. Реализованный функционал

### Учитель (Teacher Dashboard)

- **Студенты:** выбор потока, таблица студентов, генерация инвайт-ссылки, перевод в другой поток, исключение, повтор года
- **Курсы:** CRUD курсов, отображение потоков и заполненности
- **Потоки:** управление потоками внутри курсов
- **Уроки:** создание, редактирование порядка (drag-and-drop), импорт выбранных уроков из другого потока, добавление из библиотеки шаблонов, создание тестов (MCQ, VOICE), удаление
- **Live:** вкладка с Jitsi (комната = stream.id)
- **Успеваемость:** аналитика за 30 дней, журнал, проверка тестов (в т.ч. голосовых), экспорт в TSV
- **Д/З:** создание заданий, просмотр сдач, проверка
- **Расписание:** слоты по дням недели
- **Настройки:** профиль, аватар, смена пароля

### Студент (Student Dashboard)

- Список потоков (enrollments) с курсом, уровнем, расписанием
- Список уроков с кнопками «Войти» (LIVE) / «Смотреть» (VIDEO)
- Heartbeat активности (APP)

### Урок (страница урока)

- Серверная загрузка: урок, поток, квизы
- Проверка доступа (учитель или enrollment в потоке)
- LIVE: Jitsi (roomName = stream.id)
- VIDEO: iframe/ссылка на content
- TEXT: Markdown (react-markdown)
- Тест: MCQ (выбор варианта) или VOICE (запись с микрофона, base64)
- Heartbeat (LESSON или LIVE_ROOM)

### Общее

- Авторизация по email/паролю (Credentials, bcrypt)
- Редирект по роли после входа
- Middleware: защита /teacher и /student
- Инвайты: /join/[token], проверка capacity по курсу
- Язык интерфейса: русский

---

## 7. Конвенции и важные детали

### Path alias
- `@/*` → `src/*` (tsconfig.json)

### Prisma
- Всегда импортировать из `@/lib/prisma` (singleton)
- Не создавать `new PrismaClient()` в API

### Next.js 16
- Динамические `params` — Promise: `const { lessonId } = await context.params`

### Jitsi
- Room name = `stream.id` (UUID)
- Скрипт: `https://meet.jit.si/external_api.js`

### API-паттерн
1. `getServerSession(authOptions)`
2. Проверка роли (TEACHER или ADMIN)
3. Проверка владения (stream.teacherId === session.user.id)
4. `NextResponse.json()` с нужным статусом

### Компоненты
- Server Components по умолчанию
- Client: `"use client"` в начале файла
- UI-компоненты: `src/components/teacher/ui/`

---

## 8. Команды и окружение

### Запуск

```bash
# БД (Docker)
docker-compose up -d

# Приложение
npm run dev          # http://localhost:3000

# Prisma
npx prisma generate  # После изменений schema
npx prisma db push   # Применить схему
npx prisma db seed   # Сид (admin@fatiha.ru / admin123)
npx prisma studio   # GUI
```

### Переменные (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fatiha"
NEXTAUTH_SECRET="openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### Тестовый вход

- Учитель: `admin@fatiha.ru` / `admin123`
- Студенты: из seed (например `ali@student.ru` / `student123`)

---

## 9. Диаграмма потоков (упрощённо)

```mermaid
flowchart TB
    subgraph Auth [Авторизация]
        SignIn[Sign In]
        Redirect[Redirect by Role]
        SignIn --> Redirect
        Redirect --> Teacher[Teacher Dashboard]
        Redirect --> Student[Student Dashboard]
    end

    subgraph TeacherFlow [Учитель]
        Teacher --> Students[Студенты]
        Teacher --> Courses[Курсы]
        Teacher --> Lessons[Уроки]
        Teacher --> Live[Live Jitsi]
        Teacher --> Analytics[Успеваемость]
        Teacher --> Homework[Д/З]
        Lessons --> Import[Импорт уроков]
        Lessons --> Library[Библиотека шаблонов]
    end

    subgraph StudentFlow [Студент]
        Student --> Streams[Мои потоки]
        Student --> LessonPage[Страница урока]
        LessonPage --> Jitsi[Jitsi LIVE]
        LessonPage --> Quiz[Тест MCQ/VOICE]
    end

    subgraph Data [Данные]
        DB[(PostgreSQL)]
        TeacherFlow --> DB
        StudentFlow --> DB
    end
```

---

*Документ создан для Claude Code. При изменениях в проекте обновите соответствующие секции.*
