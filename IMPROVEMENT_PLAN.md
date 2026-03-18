# План улучшений проекта Fatiha.ru LMS

## Анализ текущего состояния

**Архитектура:** Next.js 16 + PostgreSQL + Prisma + NextAuth + Jitsi Meet
**Размер:** 73 TypeScript файла, 25 React компонентов, ~30 API маршрутов
**Статус:** Рабочий MVP без тестов, CI/CD и production-ready инфраструктуры

---

## 🔴 Критические проблемы (требуют немедленного решения)

### 1. Безопасность ⚠️ В ПРОЦЕССЕ

**Проблема:** Fallback секреты в коде, отсутствие JWT токенов для Jitsi
```typescript
// src/app/api/auth/[...nextauth]/route.ts
secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev"
```

**Решение:**
- [x] Удалить все fallback секреты, приложение должно падать без env переменных
- [x] Создать `.env.example` с документацией всех переменных
- [x] Добавить валидацию env переменных при старте (создан `src/lib/env.ts`)
- [ ] Реализовать JWT токены для Jitsi Meet (защита от несанкционированного доступа)
- [ ] Добавить rate limiting на API маршруты (библиотека `@upstash/ratelimit` или `express-rate-limit`)

**Статус:** Частично исправлено в commit [pending]. Удалены fallback секреты из:
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/middleware.ts`
Создан `.env.example` и модуль валидации `src/lib/env.ts`.

### 2. Дублирование PrismaClient ✅ ИСПРАВЛЕНО

**Проблема:** В `src/app/api/auth/[...nextauth]/route.ts` создается новый `PrismaClient()` вместо использования синглтона
```typescript
const prisma = new PrismaClient() // ❌ Неправильно
```

**Решение:**
- [x] Заменить на `import { prisma } from "@/lib/prisma"` (исправлено в 3 файлах)
- [x] Добавить ESLint правило, запрещающее `new PrismaClient()`

**Статус:** ✅ Полностью исправлено. Добавлено ESLint правило `no-restricted-syntax` в `eslint.config.mjs`. Исключения добавлены для `prisma/seed.ts` и `src/lib/prisma.ts` (где инстанцирование необходимо).
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/activity/heartbeat/route.ts`
- `src/app/join/[token]/page.tsx`

### 3. Хранение голосовых записей в PostgreSQL

**Проблема:** Записи до 7MB хранятся как `Bytes` в БД, что приведет к раздуванию базы

**Решение:**
- [ ] Мигрировать на S3-совместимое хранилище (AWS S3, MinIO, Cloudflare R2)
- [ ] Изменить схему: заменить `voiceData: Bytes?` на `voiceUrl: String?`
- [ ] Реализовать signed URLs для безопасного доступа к аудио
- [ ] Создать миграцию для переноса существующих записей

---

## 🟠 Высокий приоритет (1-2 недели)

### 4. Тестирование ⚙️ В ПРОЦЕССЕ

**Проблема:** Полное отсутствие тестов

**Решение:**
- [x] Установить Vitest + React Testing Library
- [x] Написать unit тесты для критических функций:
  - [x] Валидация слотов расписания (`isValidSlot`, `overlaps`)
  - [x] Логика выбора лучшего статуса квиза (`bestQuizStatusWithTimestamp`)
  - [x] Конвертация слотов в текст (`slotsToScheduleText`)
- [ ] Написать integration тесты для API маршрутов:
  - Аутентификация и авторизация
  - Создание/обновление курсов, потоков, уроков
  - Отправка квизов и домашних заданий
- [ ] Настроить coverage reporting (цель: >70%)

**Статус:** Базовая инфраструктура настроена. Созданы utility модули `src/lib/quiz.ts` и `src/lib/schedule.ts` с полным покрытием тестами (19 тестов, 100% coverage). Vitest настроен с поддержкой coverage reporting.

### 5. Обработка ошибок ⚙️ В ПРОЦЕССЕ

**Проблема:** Только 21 try-catch блок на ~30 API маршрутов, нет централизованной обработки

**Решение:**
- [x] Создать типизированные error классы (`AuthError`, `ValidationError`, `NotFoundError`)
- [x] Создать middleware для обработки ошибок API маршрутов (`withErrorHandling`)
- [ ] Обернуть все API handlers в `withErrorHandling` HOF
- [ ] Добавить структурированное логирование (Winston или Pino)
- [ ] Интегрировать Sentry для отслеживания ошибок в production

**Статус:** Базовая инфраструктура создана. Реализованы типизированные error классы с тестами (10 тестов, 100% coverage) и middleware `withErrorHandling` для централизованной обработки ошибок в API маршрутах.

### 6. CI/CD Pipeline ✅ ИСПРАВЛЕНО

**Проблема:** Нет автоматизации, GitHub Actions workflows отсутствуют

**Решение:**
- [x] Создать `.github/workflows/ci.yml`:
  - Lint (ESLint + TypeScript check)
  - Tests (Vitest)
  - Build verification
  - Prisma schema validation
- [x] Создать отдельный workflow для валидации Prisma схемы
- [ ] Создать `.github/workflows/deploy.yml` для автодеплоя
- [x] Настроить pre-commit hooks (Husky + lint-staged):
  - ESLint на измененных файлах
  - TypeScript проверка

**Статус:** ✅ Полностью настроено. CI pipeline с автоматическими проверками (lint, tests, build), валидация Prisma схемы, pre-commit hooks с ESLint и TypeScript проверкой через lint-staged.

### 7. Database Migrations

**Проблема:** Используется `prisma db push` вместо миграций

**Решение:**
- [ ] Перейти на `prisma migrate dev` для разработки
- [ ] Создать baseline миграцию текущей схемы
- [ ] Документировать процесс миграций в CLAUDE.md
- [ ] Настроить автоматический запуск миграций при деплое

---

## 🟡 Средний приоритет (2-4 недели)

### 8. Масштабируемость Jitsi

**Проблема:** Одиночный JVB упадет при 200+ участниках (из PRE_MORTEM.md)

**Решение:**
- [ ] Развернуть собственный Jitsi сервер (не использовать meet.jit.si)
- [ ] Настроить Jitsi Octo для каскадирования мостов
- [ ] Реализовать "presenter mode" для классов >15 человек
- [ ] Добавить мониторинг нагрузки JVB (Prometheus + Grafana)

### 9. Кэширование и производительность

**Проблема:** Нет кэширования, каждый запрос идет в БД

**Решение:**
- [ ] Добавить Redis для кэширования:
  - Токены приглашений (InviteToken)
  - Сессии пользователей
  - Списки курсов/потоков (с TTL 5 минут)
- [ ] Реализовать ISR (Incremental Static Regeneration) для публичных страниц
- [ ] Добавить database connection pooling (PgBouncer)
- [ ] Оптимизировать N+1 запросы (использовать Prisma `include` вместо отдельных запросов)

### 10. Валидация данных

**Проблема:** Ручная валидация в каждом API маршруте

**Решение:**
- [ ] Установить Zod для валидации схем
- [ ] Создать переиспользуемые схемы валидации:
  - `CreateCourseSchema`, `CreateStreamSchema`, `SubmitQuizSchema`
- [ ] Создать middleware `validateRequest(schema)` для автоматической валидации
- [ ] Добавить валидацию на клиенте (react-hook-form + zod resolver)

### 11. API документация

**Проблема:** Нет документации API для фронтенд разработчиков

**Решение:**
- [ ] Установить `swagger-jsdoc` и `swagger-ui-react`
- [ ] Документировать все API endpoints с примерами
- [ ] Создать `/api/docs` маршрут с Swagger UI
- [ ] Генерировать TypeScript типы из OpenAPI схемы

### 12. Мониторинг и наблюдаемость

**Проблема:** Нет visibility в production

**Решение:**
- [ ] Добавить health check endpoint (`/api/health`)
- [ ] Настроить structured logging (Winston/Pino с JSON форматом)
- [ ] Интегрировать APM (Application Performance Monitoring):
  - New Relic, Datadog, или self-hosted Grafana
- [ ] Добавить метрики:
  - Время ответа API
  - Количество активных пользователей
  - Использование БД connection pool
  - Размер голосовых записей

---

## 🟢 Низкий приоритет (1-2 месяца)

### 13. Рефакторинг больших компонентов

**Проблема:** `TeacherDashboard.tsx` весит 95KB, `StudentDashboard.tsx` 51KB

**Решение:**
- [ ] Разбить на более мелкие компоненты
- [ ] Вынести бизнес-логику в custom hooks
- [ ] Использовать React.lazy для code splitting табов
- [ ] Создать shared state management (Zustand или Jotai) для избежания prop drilling

### 14. Accessibility (A11y)

**Проблема:** Нет ARIA атрибутов, keyboard navigation не тестировалась

**Решение:**
- [ ] Добавить ARIA labels для всех интерактивных элементов
- [ ] Реализовать keyboard navigation для модальных окон
- [ ] Добавить focus management (focus trap в модалках)
- [ ] Тестировать с screen reader (NVDA/JAWS)
- [ ] Добавить `eslint-plugin-jsx-a11y`

### 15. Интернационализация (i18n)

**Проблема:** Весь текст захардкожен на русском

**Решение:**
- [ ] Установить `next-intl` или `react-i18next`
- [ ] Извлечь все строки в translation файлы
- [ ] Добавить поддержку английского языка
- [ ] Создать language switcher в UI

### 16. Offline support & PWA

**Решение:**
- [ ] Добавить Service Worker для кэширования статики
- [ ] Реализовать offline fallback страницы
- [ ] Добавить `manifest.json` для PWA
- [ ] Настроить push notifications для новых уроков/заданий

### 17. Backup и disaster recovery

**Решение:**
- [ ] Настроить автоматические бэкапы PostgreSQL (pg_dump)
- [ ] Создать скрипт восстановления из бэкапа
- [ ] Документировать процедуру disaster recovery
- [ ] Тестировать восстановление раз в месяц

### 18. Developer Experience

**Решение:**
- [ ] Создать Dockerfile для Next.js приложения
- [ ] Обновить docker-compose.yml (добавить app, redis, nginx)
- [ ] Создать `.env.example` с комментариями
- [ ] Добавить VSCode workspace settings и recommended extensions
- [ ] Создать CONTRIBUTING.md с гайдлайнами

---

## 📊 Метрики успеха

После реализации плана проект должен достичь:

- ✅ **Test Coverage:** >70%
- ✅ **API Response Time:** <200ms (p95)
- ✅ **Uptime:** >99.5%
- ✅ **Security Score:** A+ (Mozilla Observatory)
- ✅ **Lighthouse Score:** >90 (Performance, Accessibility, Best Practices)
- ✅ **Zero** критических уязвимостей (npm audit)
- ✅ **Database Size:** Стабильный рост <10GB/год (после миграции на S3)

---

## 🎯 Рекомендуемая последовательность

**Неделя 1-2:**
1. Исправить критические проблемы безопасности (#1, #2)
2. Мигрировать голосовые записи на S3 (#3)
3. Настроить базовое тестирование (#4)

**Неделя 3-4:**
4. Добавить обработку ошибок и логирование (#5)
5. Настроить CI/CD pipeline (#6)
6. Перейти на database migrations (#7)

**Месяц 2:**
7. Развернуть собственный Jitsi (#8)
8. Добавить Redis кэширование (#9)
9. Реализовать валидацию через Zod (#10)

**Месяц 3+:**
10. API документация (#11)
11. Мониторинг и метрики (#12)
12. Остальные улучшения по приоритету

---

## 💡 Дополнительные рекомендации

### Архитектурные улучшения
- Рассмотреть переход на tRPC для type-safe API
- Использовать React Server Components более агрессивно
- Добавить GraphQL слой для сложных запросов (опционально)

### Безопасность
- Регулярный security audit (npm audit, Snyk)
- Настроить Content Security Policy (CSP)
- Добавить CSRF protection для форм
- Реализовать 2FA для учителей

### UX улучшения
- Добавить skeleton loaders вместо спиннеров
- Реализовать optimistic updates для лучшего UX
- Добавить undo/redo для критических действий
- Улучшить error messages (более понятные для пользователей)

### Производительность
- Использовать Next.js Image component для оптимизации изображений
- Добавить CDN для статики (Cloudflare, Vercel Edge)
- Реализовать lazy loading для тяжелых компонентов
- Оптимизировать bundle size (анализ через `@next/bundle-analyzer`)
