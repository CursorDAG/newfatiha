# План развития Fatiha.ru LMS - Часть 1

## О документе

Этот документ описывает пошаговый план развития платформы Fatiha.ru. Разбит на 3 файла для удобства работы агентов:
- **ROADMAP_PART1.md** (этот файл) - Текущее состояние + Этап 1
- **ROADMAP_PART2.md** - Этапы 2-3
- **ROADMAP_PART3.md** - Этапы 4-5

**ВАЖНО ДЛЯ АГЕНТОВ:** Работайте только над задачами из текущего активного этапа. Не начинайте следующий этап, пока не завершен предыдущий.

---

## Текущее состояние проекта

**Что уже работает:**
- ✅ Базовая аутентификация (NextAuth + JWT)
- ✅ Роли: STUDENT, TEACHER, ADMIN
- ✅ CRUD курсов, потоков, уроков
- ✅ Live уроки через Jitsi Meet (с JWT токенами)
- ✅ Квизы (множественный выбор + голосовые)
- ✅ Домашние задания
- ✅ Система инвайтов
- ✅ Расписание (30-минутные слоты)
- ✅ Heartbeat трекинг активности
- ✅ S3 хранилище для голосовых записей
- ✅ Rate limiting на API
- ✅ Централизованная обработка ошибок
- ✅ 185 тестов (58% покрытие)
- ✅ CI/CD pipeline

**Критические пробелы:**
- ❌ Нет админ панели для управления платформой
- ❌ Нет модераторского кабинета для техподдержки
- ❌ Нет системы уведомлений
- ❌ Нет чата/мессенджера
- ❌ Нет гендерного разделения (критично для исламского образования)
- ❌ Нет записей уроков
- ❌ Нет визуализации прогресса студента
- ❌ Нет системы оплаты
- ❌ Нет сертификатов

---

## ЭТАП 1: Административная панель и коммуникация (3-4 недели)

### Приоритет 1.1: Админ панель и модерация (КРИТИЧНО)

**Проблема:** Сейчас нет инструментов для управления платформой, мониторинга пользователей, решения технических проблем.

**Что нужно реализовать:**

#### 1.1.1 Админ панель (`/admin`)

**Доступ:** Только роль `ADMIN`

**Функционал:**

**Управление пользователями:**
- Список всех пользователей (таблица с фильтрами: роль, статус, дата регистрации)
- Поиск по email, имени
- Просмотр профиля пользователя (все данные, история активности)
- Редактирование профиля (имя, email, роль)
- Блокировка/разблокировка пользователя (новое поле `User.isBlocked: Boolean`)
- Удаление пользователя (soft delete - новое поле `User.deletedAt: DateTime?`)
- Сброс пароля пользователя (генерация временного пароля)

**Управление курсами и потоками:**
- Список всех курсов (независимо от учителя)
- Просмотр/редактирование любого курса
- Архивация курса (новое поле `Course.archivedAt: DateTime?`)
- Список всех потоков с фильтрами
- Перенос потока к другому учителю
- Просмотр статистики: количество студентов, активность

**Управление контентом:**
- Модерация уроков (одобрение перед публикацией - опционально)
- Просмотр всех квизов и домашних заданий
- Удаление неподходящего контента

**Системная информация:**
- Dashboard с метриками:
  - Общее количество пользователей (по ролям)
  - Активные пользователи (за последние 7/30 дней)
  - Количество курсов, потоков, уроков
  - Использование хранилища (размер БД, S3)
  - Количество активных Jitsi сессий
- Логи системы (последние ошибки из Pino)
- Health check статус (БД, S3, Redis если есть)

**Технические инструменты:**
- Запуск миграций БД (кнопка с подтверждением)
- Очистка кэша (если будет Redis)
- Просмотр очередей задач (если будет BullMQ)
- Экспорт данных (CSV/JSON)

#### 1.1.2 Модераторский кабинет (`/moderator`)

**Новая роль:** `MODERATOR` (добавить в enum `Role`)

**Доступ:** Роли `MODERATOR` и `ADMIN`

**Функционал (ограниченный по сравнению с админом):**

**Техподдержка:**
- Список обращений пользователей (новая модель `SupportTicket`)
- Чат с пользователем для решения проблемы
- Статусы обращения: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- Приоритеты: LOW, MEDIUM, HIGH, URGENT
- Назначение обращения на себя

**Модерация контента:**
- Просмотр жалоб на контент (новая модель `ContentReport`)
- Типы жалоб: INAPPROPRIATE, SPAM, COPYRIGHT, OTHER
- Действия: одобрить, удалить контент, предупредить автора

**Просмотр пользователей (read-only):**
- Поиск пользователя
- Просмотр профиля и активности
- НЕТ прав на редактирование, блокировку, удаление

**Статистика (read-only):**
- Количество обращений (открытых, решенных)
- Среднее время ответа
- Личная статистика модератора

#### 1.1.3 Модели данных

**Новые модели в `prisma/schema.prisma`:**

```prisma
enum Role {
  STUDENT
  TEACHER
  ADMIN
  MODERATOR  // новая роль
}

model User {
  // существующие поля...
  isBlocked   Boolean   @default(false)
  deletedAt   DateTime?

  // связи
  supportTickets      SupportTicket[]
  supportTicketReplies SupportTicketReply[]
  contentReports      ContentReport[]
}

model SupportTicket {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  subject     String
  description String   @db.Text
  status      SupportTicketStatus @default(OPEN)
  priority    SupportTicketPriority @default(MEDIUM)

  assignedToId String?
  assignedTo   User?    @relation("AssignedTickets", fields: [assignedToId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  resolvedAt  DateTime?

  replies     SupportTicketReply[]
}

enum SupportTicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum SupportTicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model SupportTicketReply {
  id        String   @id @default(uuid())
  ticketId  String
  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation(fields: [userId], references: [id])

  message   String   @db.Text
  isStaff   Boolean  @default(false)

  createdAt DateTime @default(now())
}

model ContentReport {
  id          String   @id @default(uuid())
  reporterId  String
  reporter    User     @relation(fields: [reporterId], references: [id])

  contentType ContentReportType
  contentId   String   // ID урока, квиза, или комментария
  reason      ContentReportReason
  description String?  @db.Text

  status      ContentReportStatus @default(PENDING)
  reviewedById String?
  reviewedBy   User?    @relation("ReviewedReports", fields: [reviewedById], references: [id])
  reviewedAt   DateTime?

  createdAt   DateTime @default(now())
}

enum ContentReportType {
  LESSON
  QUIZ
  HOMEWORK
  CHAT_MESSAGE
}

enum ContentReportReason {
  INAPPROPRIATE
  SPAM
  COPYRIGHT
  OTHER
}

enum ContentReportStatus {
  PENDING
  APPROVED
  REJECTED
}
```

#### 1.1.4 API маршруты

**Админ API (`/api/admin/*`):**
- `GET /api/admin/users` - список пользователей с фильтрами
- `GET /api/admin/users/[userId]` - профиль пользователя
- `PATCH /api/admin/users/[userId]` - редактирование пользователя
- `POST /api/admin/users/[userId]/block` - блокировка
- `POST /api/admin/users/[userId]/unblock` - разблокировка
- `DELETE /api/admin/users/[userId]` - удаление (soft delete)
- `POST /api/admin/users/[userId]/reset-password` - сброс пароля
- `GET /api/admin/dashboard` - метрики для dashboard
- `GET /api/admin/courses` - все курсы
- `GET /api/admin/streams` - все потоки
- `GET /api/admin/logs` - системные логи

**Модератор API (`/api/moderator/*`):**
- `GET /api/moderator/tickets` - список обращений
- `GET /api/moderator/tickets/[ticketId]` - детали обращения
- `POST /api/moderator/tickets/[ticketId]/reply` - ответ на обращение
- `PATCH /api/moderator/tickets/[ticketId]` - изменение статуса/приоритета
- `POST /api/moderator/tickets/[ticketId]/assign` - назначить на себя
- `GET /api/moderator/reports` - список жалоб на контент
- `POST /api/moderator/reports/[reportId]/review` - рассмотреть жалобу

**Пользовательский API (для создания обращений):**
- `POST /api/support/tickets` - создать обращение
- `GET /api/support/tickets` - мои обращения
- `GET /api/support/tickets/[ticketId]` - детали моего обращения
- `POST /api/support/tickets/[ticketId]/reply` - ответить в обращении

---

### Приоритет 1.2: Система уведомлений

**Цель:** Студенты и учителя получают уведомления о важных событиях.

#### 1.2.1 Email уведомления

**Инфраструктура:**
- Установить `nodemailer` или использовать сервис (SendGrid, AWS SES, или российский аналог)
- Для РФ аудитории: рассмотреть Mail.ru Cloud Solutions или Unisender
- Создать модуль `src/lib/email.ts` с функциями отправки
- Шаблоны писем в `src/lib/email-templates/` (HTML + plain text)

**Типы уведомлений:**

**Для студентов:**
- Урок начнется через 15 минут
- Новый урок опубликован в потоке
- Домашнее задание проверено (оценка, комментарий)
- Квиз проверен (PASSED/FAILED)
- Новое сообщение от учителя
- Приближается дедлайн домашнего задания (за 24 часа)

**Для учителей:**
- Студент сдал домашнее задание (требует проверки)
- Студент сдал голосовой квиз (требует проверки)
- Новый студент присоединился к потоку
- Урок начнется через 15 минут (напоминание)

**Для модераторов:**
- Новое обращение в техподдержку
- Новая жалоба на контент

#### 1.2.2 In-app уведомления

**Модель данных:**

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type      NotificationType
  title     String
  message   String   @db.Text
  link      String?  // ссылка на связанный контент

  isRead    Boolean  @default(false)
  readAt    DateTime?

  createdAt DateTime @default(now())
}

enum NotificationType {
  LESSON_STARTING
  LESSON_PUBLISHED
  HOMEWORK_CHECKED
  QUIZ_CHECKED
  NEW_MESSAGE
  HOMEWORK_DEADLINE
  HOMEWORK_SUBMITTED
  QUIZ_SUBMITTED
  STUDENT_JOINED
  SUPPORT_TICKET_REPLY
}
```

**API:**
- `GET /api/notifications` - список уведомлений (пагинация)
- `GET /api/notifications/unread-count` - количество непрочитанных
- `PATCH /api/notifications/[id]/read` - отметить как прочитанное
- `POST /api/notifications/mark-all-read` - отметить все как прочитанные

**UI компонент:**
- Иконка колокольчика в Navbar с badge (количество непрочитанных)
- Dropdown с последними уведомлениями
- Страница `/notifications` со всеми уведомлениями

---

### Приоритет 1.3: Чат и мессенджер

**Цель:** Коммуникация внутри платформы, студенты не уходят в Telegram/WhatsApp.

#### 1.3.1 Инфраструктура

**WebSockets:**
- Установить `socket.io` (клиент + сервер)
- Создать WebSocket сервер в `src/lib/socket-server.ts`
- Интеграция с Next.js (custom server или отдельный процесс)

**Модели данных:**

```prisma
model ChatRoom {
  id        String   @id @default(uuid())
  type      ChatRoomType

  // для GROUP чата
  streamId  String?  @unique
  stream    Stream?  @relation(fields: [streamId], references: [id], onDelete: Cascade)

  // для DIRECT чата
  participant1Id String?
  participant1   User?   @relation("ChatParticipant1", fields: [participant1Id], references: [id])
  participant2Id String?
  participant2   User?   @relation("ChatParticipant2", fields: [participant2Id], references: [id])

  createdAt DateTime @default(now())

  messages  ChatMessage[]

  @@unique([participant1Id, participant2Id])
}

enum ChatRoomType {
  GROUP    // групповой чат потока
  DIRECT   // личные сообщения
}

model ChatMessage {
  id        String   @id @default(uuid())
  roomId    String
  room      ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)

  senderId  String
  sender    User     @relation(fields: [senderId], references: [id])

  content   String   @db.Text

  isEdited  Boolean  @default(false)
  editedAt  DateTime?

  isDeleted Boolean  @default(false)
  deletedAt DateTime?

  createdAt DateTime @default(now())

  @@index([roomId, createdAt])
}
```

#### 1.3.2 Функционал

**Групповой чат потока:**
- Автоматически создается при создании потока
- Участники: все студенты потока + учитель
- Учитель может отключить чат (новое поле `Stream.chatEnabled: Boolean @default(true)`)
- История сообщений сохраняется

**Личные сообщения:**
- Студент ↔ Учитель (только в рамках потока, где студент записан)
- Учитель ↔ Учитель
- Админ/Модератор ↔ Любой пользователь

**Ограничения:**
- Студент НЕ может писать другому студенту напрямую (только через групповой чат)
- Студент НЕ может писать учителю, у которого не учится

**Функции:**
- Отправка текстовых сообщений
- Редактирование своих сообщений (в течение 15 минут)
- Удаление своих сообщений
- Учитель может удалять любые сообщения в групповом чате потока
- Typing indicator ("печатает...")
- Online/offline статус
- Непрочитанные сообщения (badge)

#### 1.3.3 API

**REST API:**
- `GET /api/chat/rooms` - список чатов пользователя
- `GET /api/chat/rooms/[roomId]` - детали чата
- `GET /api/chat/rooms/[roomId]/messages` - история сообщений (пагинация)
- `POST /api/chat/rooms/direct` - создать/получить direct чат с пользователем
- `POST /api/chat/messages` - отправить сообщение (fallback если WebSocket недоступен)
- `PATCH /api/chat/messages/[messageId]` - редактировать сообщение
- `DELETE /api/chat/messages/[messageId]` - удалить сообщение

**WebSocket события:**
- `message:send` - отправка сообщения
- `message:receive` - получение сообщения
- `message:edit` - редактирование
- `message:delete` - удаление
- `typing:start` - начал печатать
- `typing:stop` - перестал печатать
- `user:online` - пользователь онлайн
- `user:offline` - пользователь оффлайн

---

### Приоритет 1.4: Гендерное разделение

**Цель:** Соблюдение исламских норм в образовании.

**Правила:**
- Женщина-учитель может вести любые группы (мужские, женские, смешанные)
- Мужчина-учитель может вести только мужские группы
- Девушка может учиться в женской группе у мужчины-учителя
- Мужчина НЕ может учиться в женской группе

#### 1.4.1 Модели данных

```prisma
enum Gender {
  MALE
  FEMALE
  NOT_SPECIFIED
}

enum StreamGenderType {
  MALE_ONLY      // только мужчины
  FEMALE_ONLY    // только женщины
  MIXED          // смешанная группа
}

model User {
  // существующие поля...
  gender  Gender @default(NOT_SPECIFIED)
}

model Stream {
  // существующие поля...
  genderType StreamGenderType @default(MIXED)
}
```

#### 1.4.2 Бизнес-логика

**При создании потока:**
- Если учитель мужчина → можно создать только MALE_ONLY или MIXED
- Если учитель женщина → можно создать любой тип

**При записи студента (через инвайт):**
- Если поток MALE_ONLY → принимаются только студенты с gender = MALE
- Если поток FEMALE_ONLY → принимаются только студенты с gender = FEMALE
- Если поток MIXED → принимаются все

**В личных сообщениях:**
- Мужчина-студент НЕ может писать женщине-учителю напрямую (только через групповой чат)
- Женщина-студент может писать любому учителю
- Учителя могут писать любым студентам (в рамках своих потоков)

#### 1.4.3 UI

**При регистрации:**
- Обязательное поле "Пол" (мужской/женский)

**При создании потока (учитель):**
- Выбор типа группы: "Только мужчины", "Только женщины", "Смешанная"
- Если учитель мужчина → опция "Только женщины" недоступна (disabled + tooltip с объяснением)

**В списке потоков:**
- Иконка или badge с типом группы (♂ / ♀ / ⚥)

---

## Критерии завершения Этапа 1

Этап 1 считается завершенным, когда:

- ✅ Админ панель работает: можно управлять пользователями, курсами, видеть метрики
- ✅ Модераторский кабинет работает: можно принимать обращения, модерировать контент
- ✅ Email уведомления отправляются на все ключевые события
- ✅ In-app уведомления работают (колокольчик в navbar)
- ✅ Групповой чат потока работает в реальном времени
- ✅ Личные сообщения учитель ↔ студент работают
- ✅ Гендерное разделение работает: правильные ограничения при создании потоков и записи студентов
- ✅ Все новые API маршруты покрыты тестами (минимум 70%)
- ✅ Миграции БД созданы и применены

---

## ⚠️ ВАЖНО ДЛЯ АГЕНТОВ

**Работайте только над Этапом 1, пока он не завершен.**

Не начинайте задачи из следующих этапов. Если вам кажется, что нужно что-то из Этапа 2 или 3 - сначала завершите текущий этап.

**После завершения Этапа 1, читайте следующий файл:**
👉 **ROADMAP_PART2.md** - Этапы 2-3 (Контент, монетизация, масштабирование)
