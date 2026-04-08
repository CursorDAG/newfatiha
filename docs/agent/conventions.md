# Code Conventions

## Стилизация

- Tailwind CSS 4 (utility-first)
- Цвета: emerald — primary, slate — backgrounds
- Тёмная тема для студенцев (`bg-slate-950`), светлая для учителей (`bg-slate-50`)
- Цвет потока: `color` field (hex, default `#10b981`)
- Адаптив через `lg:` breakpoints

## Импорты

- `@/*` → `src/*` (всегда использовать, никогда relative paths)

## Компоненты

**Server Components** (`src/app/**/page.tsx`):
- Аутентификация, запросы к БД, передача данных в props

**Client Components** (`"use client"`):
- Интерактивность, state management, browser API
- Пример: `src/app/lesson/[lessonId]/room-client.tsx`

**Shared UI**: `src/components/teacher/ui/*`
**Hooks**: `src/components/teacher/hooks/*`

## State Management

- Нет глобального state (Redux/Zustand)
- Local `useState`, `fetch()` в `useEffect` или handlers
- `router.refresh()` после мутаций

## Модалы

- Условный рендер в родителе: `showModal ? <Modal onClose={...} /> : null`
- Обёртка `ModalShell`
- `ConfirmModal` для деструктивных действий

## Типизация

- `@prisma/client` для Prisma типов
- `src/types/index.ts`, `src/types/next-auth.d.ts`
- NextAuth session extended: `role`, `id`

## UI язык

**ВСЕГО пользовательский текст на РУССКОМ.**

- Нет i18n библиотеки
- Следовать существующим паттернам: "Создать", "Удалить"
- Русский формат дат

## Тесты

- Vitest + Testing Library + jsdom
- `src/__tests__/`, `src/lib/__tests__/`, `src/lib/__tests__/integration`
- `npm test` — запуск, `npm run test:ui` — UI, `npm run test:coverage` — покрытие
