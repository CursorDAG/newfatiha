# Инструкция для агента: db-architect

**Роль:** Архитектор базы данных
**Этап:** 1 - Административная панель и коммуникация
**Приоритет:** КРИТИЧЕСКИЙ (блокирует всех остальных агентов)
**Срок:** 2-3 дня

---

## Твоя задача

Подготовить все модели данных для Этапа 1, создать миграции, обновить seed скрипт.

---

## Входные данные

**Обязательно прочитай:**
1. `ROADMAP_PART1.md` - секции 1.1.3, 1.2.2, 1.3.1, 1.4.1
2. `prisma/schema.prisma` - текущая схема БД
3. `prisma/seed.ts` - текущий seed скрипт

---

## Задачи

### 1. Обновить Enum типы

Добавить в `prisma/schema.prisma`:

**Role enum:**
```prisma
enum Role {
  STUDENT
  TEACHER
  ADMIN
  MODERATOR  // НОВЫЙ
}
```

**Новые enums:**
- `Gender` (MALE, FEMALE, NOT_SPECIFIED)
- `StreamGenderType` (MALE_ONLY, FEMALE_ONLY, MIXED)
- `SupportTicketStatus` (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- `SupportTicketPriority` (LOW, MEDIUM, HIGH, URGENT)
- `ContentReportType` (LESSON, QUIZ, HOMEWORK, CHAT_MESSAGE)
- `ContentReportReason` (INAPPROPRIATE, SPAM, COPYRIGHT, OTHER)
- `ContentReportStatus` (PENDING, APPROVED, REJECTED)
- `ChatRoomType` (GROUP, DIRECT)

### 2. Обновить существующие модели

**User:**
- Добавить: `isBlocked Boolean @default(false)`
- Добавить: `deletedAt DateTime?`
- Добавить: `gender Gender @default(NOT_SPECIFIED)`
- Добавить relations для новых моделей

**Stream:**
- Добавить: `genderType StreamGenderType @default(MIXED)`
- Добавить: `chatEnabled Boolean @default(true)`
- Добавить relation: `chatRoom ChatRoom?`

**Notification (проверить что уже есть):**
- Модель уже создана, проверь что поле называется `read` (не `isRead`)
- Если нужно - переименуй поля для консистентности

### 3. Создать новые модели

**SupportTicket** - обращения в техподдержку
- Все поля из ROADMAP_PART1.md секция 1.1.3
- Relations: user, assignedTo, replies

**SupportTicketReply** - ответы в обращениях
- Все поля из ROADMAP_PART1.md
- Relation: ticket, user

**ContentReport** - жалобы на контент
- Все поля из ROADMAP_PART1.md
- Relations: reporter, reviewedBy

**ChatRoom** - комнаты чата
- Все поля из ROADMAP_PART1.md секция 1.3.1
- Relations: stream, participant1, participant2, messages
- @@unique([participant1Id, participant2Id])

**ChatMessage** - сообщения в чате
- Все поля из ROADMAP_PART1.md
- Relations: room, sender
- @@index([roomId, createdAt])

### 4. Создать миграцию

```bash
npx prisma migrate dev --name stage1_admin_chat_gender
```

**ВАЖНО:**
- Используй `migrate dev`, НЕ `db push`
- Миграция должна применяться без ошибок
- После миграции запусти `npx prisma generate`

### 5. Обновить seed.ts

Добавить в `prisma/seed.ts`:

**Модератор:**
```typescript
const moderator = await prisma.user.upsert({
  where: { email: 'moderator@fatiha.ru' },
  update: {},
  create: {
    email: 'moderator@fatiha.ru',
    name: 'Модератор Ибрагим',
    password: hashedPassword, // 'admin123'
    role: 'MODERATOR',
    gender: 'MALE',
  },
})
```

**Обновить существующих пользователей:**
- Установить gender для teacher (MALE)
- Установить gender для всех студентов (2 MALE, 2 FEMALE)

**Обновить потоки:**
- Установить genderType для существующих потоков
- Утренний поток: MALE_ONLY
- Вечерний поток: FEMALE_ONLY

**Создать тестовые данные:**
- 1-2 SupportTicket (один OPEN, один RESOLVED)
- 1 ContentReport (PENDING)
- ChatRoom для каждого потока (type: GROUP)

### 6. Проверить результат

Запустить:
```bash
npx prisma db seed
```

Проверить что:
- Все пользователи созданы с gender
- Потоки имеют genderType
- ChatRoom созданы для потоков
- Нет ошибок при seed

---

## Критерии приемки

Твоя работа завершена когда:

- ✅ Все новые enum добавлены
- ✅ Все новые модели созданы
- ✅ Все поля добавлены в существующие модели
- ✅ Миграция создана и применена успешно
- ✅ `npx prisma generate` работает без ошибок
- ✅ `npx prisma db seed` работает без ошибок
- ✅ Нет TypeScript ошибок в schema.prisma
- ✅ Все relations корректны (нет ошибок о несуществующих полях)

---

## Ограничения

**НЕ делай:**
- ❌ НЕ удаляй существующие модели или поля
- ❌ НЕ изменяй типы существующих полей (breaking changes)
- ❌ НЕ начинай реализацию API или UI (это задача других агентов)
- ❌ НЕ используй `db push` (только `migrate dev`)

**Делай:**
- ✅ Только добавляй новые поля и модели
- ✅ Используй миграции для всех изменений
- ✅ Следуй существующим паттернам именования
- ✅ Добавляй indexes где нужно для производительности

---

## Коммуникация

**После завершения:**
1. Обнови статус задачи: `TaskUpdate(taskId: "твой-task-id", status: "completed")`
2. Отправь сообщение Team Lead: `SendMessage(to: "team-lead", message: "БД готова, миграция применена, seed работает")`

**При проблемах:**
- Немедленно сообщи Team Lead через SendMessage
- Опиши проблему и предложи решение

---

## Справочные материалы

- **ROADMAP_PART1.md** - полное описание всех моделей
- **CLAUDE.md** - правила работы с проектом
- **prisma/schema.prisma** - текущая схема для reference

---

**Успехов! Вся команда ждет твоей работы.**
