# Архитектура проекта

## Обзор

LMS для исламского образования. Next.js 16 (App Router) + Prisma 6 + PostgreSQL.

**Статус:** MVP завершён (запись уроков, аналитика, PWA).

## Стек

- Next.js 16 (App Router), React 19, Tailwind CSS 4
- Prisma 6 + PostgreSQL
- NextAuth 4 (JWT-сессии)
- Socket.io 4 (чат в реальном времени)
- Jitsi Meet (видеоклассы)
- Zod 4 (валидация), Vitest (тесты)

## Роли

- `STUDENT` — доступ к урокам, тестам, чату
- `TEACHER` — управление курсами, потоками, уроками
- `ADMIN` — полный доступ + модерация заявок учителей

## Ключевые связи моделей

- `Course` → `Stream` (1:N) — курс имеет несколько групп
- `Stream` → `Lesson` (1:N) — у группы своя последовательность уроков
- `User` → `Enrollment` → `Stream` — студенты записываются через invite-токены
- `Lesson` → `LessonQuiz` — уроки могут иметь тесты
- `Stream` → `HomeworkAssignment` — домашка на группу, не на урок

## Пользовательские статусы

`PENDING_VERIFICATION` → `PENDING_APPROVAL` → `ACTIVE` | `REJECTED` | `SUSPENDED`

## Статусы зачисления

`ACTIVE` → `TRANSFERRED` | `KICKED` | `REPEATING`

## Типы уроков

- `LIVE` — Jitsi Meet видеокласс
- `VIDEO` — внешняя ссылка на видео
- `TEXT` — Markdown контент через ReactMarkdown

## Важные файлы

- `server.ts` — кастомный сервер (обязателен для Socket.io)
- `src/lib/prisma.ts` — синглтон PrismaClient (не создавать new PrismaClient())
- `src/middleware.ts` — защита ролей и статусов
- `src/lib/api-handler.ts` — `withErrorHandling` для всех API роутов
- `src/lib/errors.ts` — typed error classes
- `src/lib/validation.ts` — Zod схемы
- `src/lib/validate-request.ts` — `validateRequest()` хелпер
- `src/lib/socket-server.ts` — инициализация Socket.io

## Масштабируемость

- Пул соединений: добавить `connection_limit=10` в DATABASE_URL
- Голосовые записи (7MB в БД) — для продакшена мигрировать на S3
- Jitsi JWT для аутентифицированных комнат (см. `src/lib/jitsi-jwt.ts`)
- Rate limiter: 10K записей max, авто-эвикция (см. `src/lib/rate-limit.ts`)
