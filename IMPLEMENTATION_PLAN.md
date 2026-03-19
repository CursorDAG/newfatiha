# План реализации: Система регистрации и оптимизация

**Дата:** 19 марта 2026
**Команда:** fatiha-optimization-team
**Тимлид:** Claude (Opus 4.6)

---

## Обзор проекта

Комплексное обновление платформы Fatiha.ru включает три основных направления:
1. **Оптимизация производительности** - решение проблемы утечки памяти (4.5GB)
2. **Система регистрации** - регистрация учителей и студентов с модерацией
3. **Расширение функционала** - улучшение админ-панели и системы уведомлений

---

## Приоритеты выполнения

### Фаза 1: Критические исправления (1-2 дня)
**Задача #4: Мониторинг памяти и защита от утечек**
- Агент: memory-optimizer (Sonnet 4.6)
- Блокирует: нет
- Критично для стабильности системы

### Фаза 2: Регистрация учителей (3-4 дня)
**Задача #5: Система регистрации учителей**
- Агент: teacher-registration-dev (Opus 4.6)
- Блокирует: Задачу #3 (нужна общая логика email verification)
- Включает: анкета, проверка админом, WhatsApp интеграция

### Фаза 3: Регистрация студентов (3-4 дня)
**Задача #3: Система регистрации студентов**
- Агент: student-registration-dev (Opus 4.6)
- Зависит от: Задачи #5 (email verification)
- Включает: каталог курсов, заявки, workflow оплаты

### Фаза 4: Расширение функционала (2-3 дня)
**Задача #1: Расширение системы уведомлений**
- Агент: notification-enhancer (Sonnet 4.6)
- Зависит от: Задач #3 и #5 (новые типы уведомлений)

**Задача #2: Админ-панель: CMS и рассылки**
- Агент: admin-panel-dev (Opus 4.6)
- Зависит от: Задачи #1 (система рассылок)

### Фаза 5: Документация (1 день)
**Задача #6: Документация и миграции**
- Агент: documentation-writer (Sonnet 4.6)
- Зависит от: всех предыдущих задач

---

## Архитектурные решения

### 1. База данных

#### Новые модели:
```prisma
model TeacherProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  bio             String?  @db.Text
  subjects        String[]
  experience      String?  @db.Text
  qualifications  String?  @db.Text
  whatsappPhone   String
  documentsUrls   String[]
  videoIntroUrl   String?
  adminNotes      String?  @db.Text
  reviewedBy      String?
  reviewedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model EnrollmentRequest {
  id                String                   @id @default(uuid())
  studentId         String
  streamId          String
  status            EnrollmentRequestStatus  @default(PENDING_REVIEW)
  message           String?                  @db.Text
  reviewedBy        String?
  reviewedAt        DateTime?
  rejectionReason   String?
  paymentConfirmed  Boolean                  @default(false)
  paymentConfirmedAt DateTime?
  createdAt         DateTime                 @default(now())
  updatedAt         DateTime                 @updatedAt

  @@unique([studentId, streamId])
}

model PageContent {
  id        String   @id @default(uuid())
  page      String   @unique
  sections  Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model NotificationPreference {
  id              String             @id @default(uuid())
  userId          String             @unique
  emailTypes      NotificationType[]
  emailEnabled    Boolean            @default(true)
  emailDigest     Boolean            @default(false)
  emailDigestTime String             @default("18:00")
  pushEnabled     Boolean            @default(true)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}
```

#### Расширение существующих моделей:
```prisma
model User {
  emailVerified      Boolean           @default(false)
  emailVerifiedAt    DateTime?
  verificationToken  String?           @unique
  status             UserStatus        @default(PENDING_VERIFICATION)
  teacherProfile     TeacherProfile?
}

model Stream {
  isOpenForEnrollment Boolean   @default(false)
  price               Decimal?  @db.Decimal(10, 2)
  currency            String    @default("RUB")
  enrollmentDeadline  DateTime?
  paymentInstructions String?   @db.Text
}

model Notification {
  priority   NotificationPriority @default(NORMAL)
  metadata   Json?
  actionUrl  String?
  actionText String?
  emailSent  Boolean              @default(false)
  emailSentAt DateTime?
  readAt     DateTime?
}
```

#### Новые enum'ы:
```prisma
enum UserStatus {
  PENDING_VERIFICATION
  PENDING_APPROVAL
  ACTIVE
  REJECTED
  SUSPENDED
}

enum EnrollmentRequestStatus {
  PENDING_REVIEW
  APPROVED_PENDING_PAYMENT
  PAYMENT_CONFIRMED
  ACTIVE
  REJECTED
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### 2. API Endpoints

#### Регистрация и аутентификация:
- `POST /api/auth/register/student` - регистрация студента
- `POST /api/auth/register/teacher` - регистрация учителя
- `GET /api/auth/verify-email?token=...` - подтверждение email
- `POST /api/auth/resend-verification` - повторная отправка письма

#### Заявки студентов:
- `GET /api/courses` - публичный каталог курсов
- `POST /api/enrollment-requests` - подать заявку на курс
- `GET /api/enrollment-requests` - мои заявки (студент)
- `GET /api/teacher/enrollment-requests` - заявки на мои курсы (учитель)
- `POST /api/teacher/enrollment-requests/[id]/approve` - одобрить заявку
- `POST /api/teacher/enrollment-requests/[id]/reject` - отклонить заявку
- `POST /api/teacher/enrollment-requests/[id]/confirm-payment` - подтвердить оплату

#### Заявки учителей:
- `GET /api/admin/teacher-applications` - список заявок (админ)
- `POST /api/admin/teacher-applications/[id]/approve` - одобрить учителя
- `POST /api/admin/teacher-applications/[id]/reject` - отклонить учителя

#### CMS и рассылки:
- `GET /api/admin/cms/[page]` - получить контент страницы
- `PUT /api/admin/cms/[page]` - обновить контент страницы
- `POST /api/admin/broadcasts` - создать массовую рассылку
- `GET /api/admin/broadcasts` - история рассылок

#### Уведомления:
- `GET /api/notifications` - список уведомлений (уже есть)
- `POST /api/notifications/[id]/read` - прочитать (уже есть)
- `POST /api/notifications/read-all` - прочитать все (уже есть)
- `GET /api/notifications/preferences` - настройки (новое)
- `PUT /api/notifications/preferences` - обновить настройки (новое)

### 3. Workflow'ы

#### Регистрация учителя:
```
1. Заполнение формы (email, пароль, имя)
   ↓
2. Отправка письма с подтверждением
   ↓
3. Подтверждение email (клик по ссылке)
   ↓
4. Заполнение анкеты (био, предметы, опыт, WhatsApp, документы)
   ↓
5. Статус: PENDING_APPROVAL
   ↓
6. Админ проверяет заявку
   ↓
7a. Одобрено → статус ACTIVE, доступ к кабинету
7b. Отклонено → email с причиной, возможность подать заново
```

#### Регистрация студента:
```
1. Заполнение формы (email, пароль, имя)
   ↓
2. Отправка письма с подтверждением
   ↓
3. Подтверждение email
   ↓
4. Статус: ACTIVE, доступ к каталогу курсов
```

#### Заявка на курс:
```
1. Студент выбирает курс в каталоге
   ↓
2. Подает заявку (опционально: сообщение учителю)
   ↓
3. Статус: PENDING_REVIEW
   ↓
4. Учитель получает уведомление
   ↓
5. Учитель одобряет заявку
   ↓
6. Статус: APPROVED_PENDING_PAYMENT
   ↓
7. Студент видит инструкции по оплате
   ↓
8. Студент оплачивает напрямую учителю
   ↓
9. Учитель подтверждает получение оплаты
   ↓
10. Статус: ACTIVE, создается Enrollment
```

---

## Технические детали

### Оптимизация памяти

**Проблема:** Node.js процесс занимает 4.5GB в dev режиме

**Причины:**
1. In-memory rate limiter накапливает записи
2. Socket.io соединения не очищаются при hot reload
3. Next.js dev mode не освобождает старые модули
4. Множественные инстансы PrismaClient

**Решения:**
1. Добавить лимит на размер Map в rate limiter (max 10000 записей)
2. Добавить таймаут для неактивных Socket.io соединений (30 мин)
3. Логировать использование памяти каждые 30 сек
4. Добавить `connection_limit=10` в DATABASE_URL
5. Рекомендовать PM2 с `max_memory_restart: "1G"` для production

### Email Verification

**Библиотека:** nodemailer (уже есть)

**Процесс:**
1. Генерация UUID токена при регистрации
2. Сохранение в поле `verificationToken`
3. Отправка письма с ссылкой: `/auth/verify-email?token=...`
4. При переходе: проверка токена, установка `emailVerified = true`
5. Токен удаляется после использования

**Срок действия:** 24 часа (проверка по `createdAt`)

### Загрузка документов

**Вариант 1 (рекомендуемый):** S3
- Использовать существующую интеграцию S3
- Путь: `teacher-documents/{userId}/{filename}`
- Presigned URLs для загрузки

**Вариант 2 (fallback):** Base64 в БД
- Хранить как JSON массив: `[{ name, data, mimeType }]`
- Лимит: 5MB на документ

### Real-time уведомления

**Расширение Socket.io:**
```typescript
// При подключении
socket.join(`user:${userId}`);

// Отправка уведомления
io.to(`user:${userId}`).emit('notification:receive', notification);

// В клиенте
socket.on('notification:receive', (notification) => {
  // Обновить UI, показать toast
});
```

---

## Тестирование

### Unit тесты (Vitest):
- Email verification логика
- Enrollment request workflow
- Notification service методы
- Memory monitor

### Integration тесты:
- Полный flow регистрации учителя
- Полный flow заявки студента
- Массовая рассылка уведомлений

### Manual тесты:
- UI регистрации (оба типа)
- Админ-панель (проверка заявок)
- CMS редактор
- Real-time уведомления

---

## Риски и митигация

### Риск 1: Утечка памяти в production
**Митигация:**
- Мониторинг памяти с алертами
- PM2 с автоматическим рестартом
- Регулярный cleanup старых данных

### Риск 2: Спам регистраций
**Митигация:**
- Rate limiting на регистрацию (5 попыток / 15 мин)
- Email verification обязателен
- Для учителей: проверка админом

### Риск 3: Перегрузка админа заявками
**Митигация:**
- Фильтры и поиск в админ-панели
- Email уведомления о новых заявках
- Возможность делегировать проверку (роль MODERATOR)

### Риск 4: Проблемы с email доставкой
**Митигация:**
- Логирование всех отправок
- Кнопка "Отправить повторно"
- Fallback на Ethereal в dev режиме

---

## Метрики успеха

1. **Производительность:**
   - Использование памяти < 1GB в production
   - Нет утечек памяти за 24 часа работы

2. **Регистрация:**
   - 90%+ успешных регистраций (с подтверждением email)
   - Среднее время проверки заявки учителя < 24 часа

3. **Заявки на курсы:**
   - 80%+ заявок обрабатываются учителем за 48 часов
   - Конверсия заявка → зачисление > 70%

4. **Уведомления:**
   - 95%+ уведомлений доставляются в течение 1 минуты
   - Email доставка > 98%

---

## Следующие шаги

1. ✅ Создать команду и задачи
2. ⏳ Запустить агентов для параллельной работы
3. ⏳ Начать с оптимизации памяти (критично)
4. ⏳ Параллельно разработать регистрацию учителей
5. ⏳ После email verification - регистрация студентов
6. ⏳ Расширить уведомления и админ-панель
7. ⏳ Написать документацию и миграции
8. ⏳ Тестирование и деплой

---

**Общая оценка времени:** 10-14 дней
**Команда:** 4-5 агентов параллельно
**Модели:** Opus 4.6 для сложных задач, Sonnet 4.6 для простых
