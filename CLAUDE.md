# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Статус проекта:** MVP завершён (запись уроков, аналитика, PWA).

## Команды

```bash
npm run dev              # Dev сервер (custom server.ts + Socket.io)
npm run build && npm start  # Production
npx prisma generate      # После изменений схемы
npx prisma migrate dev   # Создать и применить миграцию
npx prisma db seed       # Seed тест-данных
docker-compose up -d     # PostgreSQL
npm test                 # Vitest
```

**Тест аккаунты:** `admin@fatiha.ru` / `admin123` (admin/teacher), `ali@student.ru` / `student123` (student)

## Архитектура

- Next.js 16 (App Router), React 19, Tailwind CSS 4
- Prisma 6 + PostgreSQL, NextAuth 4 (JWT)
- Socket.io 4 (real-time chat), Jitsi Meet (видео)
- Роли: `STUDENT`, `TEACHER`, `ADMIN`

## Модульная документация

Для детальной информации читайте соответствующие файлы:

| Файл | Содержание |
|------|-----------|
| [`docs/agent/architecture.md`](./docs/agent/architecture.md) | Архитектура, модели БД, масштабируемость |
| [`docs/agent/conventions.md`](./docs/agent/conventions.md) | Code conventions, компоненты, тесты |
| [`docs/agent/api-patterns.md`](./docs/agent/api-patterns.md) | API паттерны, error handling, валидация |
| [`docs/agent/common-tasks.md`](./docs/agent/common-tasks.md) | Dev setup, частые задачи, troubleshooting |
| [`docs/agent/features.md`](./docs/agent/features.md) | Registration, enrollment, chat, Jitsi |

## Критически важные правила

### Custom Server
**Всегда** используйте `npm run dev` / `npm start` (кастомный `server.ts` с Socket.io).
**НИКОГДА** не запускайте `next dev` или `next start` напрямую.

### Prisma Client
**Всегда** импортируйте из `@/lib/prisma.ts`. **НИКОГДА** не создавайте `new PrismaClient()` напрямую.

### API Routes
**Всегда** оборачивайте handlers в `withErrorHandling` и используйте typed errors (`AuthError`, `ValidationError`, и т.д.).
**НИКОГДА** не возвращайте error response вручную.

### UI Язык
**ВЕСЬ** пользовательский текст на **РУССКОМ**.

### Миграции
**Всегда** `prisma migrate dev`, **НЕ** `prisma db push`.

## Path Aliases

`@/*` → `src/*` — всегда используйте, никогда relative paths между директориями.

## Структура

```
src/
  app/              # Next.js App Router (pages, API routes)
  components/       # Shared UI
    teacher/ui/     # Teacher компоненты
    teacher/hooks/  # Data fetching hooks
  lib/              # Utilities (prisma, auth, validation, email, s3, etc.)
  types/            # TypeScript types
prisma/
  schema.prisma     # Database schema
  migrations/       # Migration history
docs/
  agent/            # Модульная документация для AI agents
  workflows/        # Flow diagrams
```
