# Features Documentation

Полная документация всех реализованных функций платформы Fatiha.ru LMS.

---

## Authentication & User Management

### Email/Password Auth
- Регистрация с валидацией email
- Email verification обязателен для учителей
- JWT tokens через NextAuth 4
- Password hashing с bcrypt

### OAuth Integration (v1.0.0)
- Google OAuth для быстрой регистрации
- Apple OAuth поддержка
- Связывание социальных аккаунтов с существующими

### Roles & Permissions
- `STUDENT` — доступ к курсам, заявки на зачисление
- `TEACHER` — управление курсами, проверка заданий
- `ADMIN` — полный доступ, модерация, управление пользователями

### User Status Flow
- `PENDING_VERIFICATION` → email verified → `PENDING_APPROVAL` (только teachers)
- Admin approve → `ACTIVE`
- `BLOCKED` — временная блокировка админом

---

## Teacher Registration

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register/teacher` | Step 1: создание аккаунта + verification email |
| POST | `/api/auth/verify-email` | Подтверждение email |
| POST | `/api/auth/resend-verification` | Повторная отправка verification |
| POST | `/api/teacher/profile` | Step 2: заполнение профиля |
| GET | `/api/admin/teacher-applications` | Список заявок (admin) |
| POST | `/api/admin/teacher-applications/[id]/approve` | Одобрить |
| POST | `/api/admin/teacher-applications/[id]/reject` | Отклонить |
| GET | `/api/user/me` | Текущий пользователь + статус |

### Flow

`PENDING_VERIFICATION` → (email verified) → `PENDING_APPROVAL` → (admin approve) → `ACTIVE`

### Step 2 Schema

```typescript
{
  bio: string (50-5000),
  subjects: string[] (min 1),
  experience: string (20-5000),
  qualifications: string (20-5000),
  whatsappPhone: /^\+?\d{10,15}$/,
  documentsUrls: url[] (min 1),
  videoIntroUrl?: url
}
```

---

## Student Enrollment

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/catalog/courses` | Опубликованные курсы (public) |
| POST | `/api/enrollment-requests` | Подать заявку |
| POST | `/api/enrollment-requests/[id]/payment-proof` | Загрузить подтверждение оплаты |
| GET | `/api/teacher/enrollment-requests` | Заявки учителя |
| POST | `/api/teacher/enrollment-requests/[id]/review` | Approve/Reject |
| POST | `/api/teacher/enrollment-requests/[id]/confirm-payment` | Подтвердить оплату |

### Flow

Заявка → APPROVED → PAYMENT_PENDING → PAYMENT_CONFIRMED → Enrolment created

### Business Rules

- Проверка capacity потока
- Гендерные ограничения (`genderType`)
- Предотвращение дубликатов
- Уведомление учителя

---

## Course Management

### Course Structure
- Course → Streams → Lessons
- Stream: группа студентов с датами начала/конца
- Lesson types: `LIVE`, `VIDEO`, `TEXT`

### Endpoints
- `GET /api/courses` — список курсов (учитель видит свои, студент — enrolled)
- `POST /api/courses` — создать курс (teacher/admin)
- `GET /api/courses/[id]` — детали курса
- `PUT /api/courses/[id]` — обновить
- `DELETE /api/courses/[id]` — удалить (soft delete)

### Stream Management
- `POST /api/courses/[id]/streams` — создать поток
- Capacity tracking (max students)
- Gender restrictions: `MALE_ONLY`, `FEMALE_ONLY`, `MIXED`

---

## Lessons & Content

### Lesson Types

#### LIVE
- Jitsi Meet интеграция
- Real-time видео конференция
- Room name = `stream.id`
- Все уроки потока в одной комнате

#### VIDEO
- Загрузка в AWS S3
- Signed URLs для защищенного доступа
- Progress tracking по времени просмотра

#### TEXT
- Rich text контент
- Markdown support
- Embedded media

### Quiz System
- Multiple choice вопросы
- Голосовые вопросы (audio recording)
- Автоматическая проверка multiple choice
- Ручная проверка голосовых учителем
- Попытки tracking (attempts, scores)

### Homework System
- Текстовые задания
- Загрузка файлов (PDF, images, etc.)
- Проверка учителем с оценкой и комментарием
- Статусы: PENDING, GRADED, NEEDS_REVISION

---

## Gamification System (v1.0.0)

### Hasanat Rewards
- Виртуальная валюта для мотивации студентов
- Начисление за:
  - Выполнение уроков (10-50 hasanat)
  - Прохождение тестов (20-100 hasanat)
  - Сдача ДЗ (30-150 hasanat)
  - Streak maintenance (5-25 hasanat/день)
- Отображение баланса в профиле

### Endpoints
- `GET /api/hasanat/[userId]/stats` — статистика пользователя
- `GET /api/hasanat/[userId]/transactions` — история транзакций
- `POST /api/hasanat/award` — начислить hasanat (teacher/admin)

### Leaderboard
- Daily/Weekly/Monthly рейтинги
- Сортировка по hasanat earned за период
- Анонимность опциональна
- Отображение топ-10 в dashboard

### Streaks
- Подсчет последовательных дней активности
- Break на пропуск дня
- Бонусы за длинные streaks (7, 30, 100 дней)
- Visual indicators в UI

---

## Library Module (v1.0.0)

### Book Management
- Загрузка PDF книг учителями
- Метаданные: title, author, description, language
- Привязка к курсам
- Публикация/черновик статус

### PDF to HTML Converter
- Автоматическая конвертация при загрузке
- Чтение в браузере без скачивания
- Сохранение оригинального PDF для скачивания

### Reading Progress
- Закладки по страницам
- Процент прочитанного
- Last read tracking
- Синхронизация между устройствами

### Endpoints
- `GET /api/library/books` — список книг курса
- `POST /api/library/books` — загрузить книгу (teacher)
- `GET /api/library/books/[id]` — читать книгу
- `POST /api/library/books/[id]/progress` — обновить прогресс

---

## Real-Time Chat

### Room Types

- `STREAM` — групповой чат (1 room per stream)
- `DIRECT` — приватный 1-on-1

### Socket Events

| Event | Описание |
|-------|----------|
| `room:join` / `room:leave` | Join/leave chat |
| `message:send` | Отправить (max 5000 chars) |
| `message:edit` | Редактировать (time-limited) |
| `message:delete` | Soft delete |
| `typing:start` / `typing:stop` | Typing indicators |
| `user:online` / `user:offline` | Presence |

### Permissions

- Студенты: только свои stream-чаты
- Учителя: чаты своих потоков + любые сообщения
- Direct messages: только участники

---

## Analytics & Charts (v1.0.0)

### Teacher Dashboard
- Студентов enrolled (по курсам/потокам)
- Completion rate (%)
- Средний балл по тестам
- Активность по дням (Recharts line chart)
- Top performers list

### Student Dashboard
- Прогресс по курсам (%)
- Hasanat balance и transactions chart
- Streak calendar
- Upcoming deadlines

### Charts Library
- Recharts интеграция
- Адаптивные графики
- Темная тема support
- Export в PNG (опционально)

---

## Review System (v0.9.0)

### Course Reviews
- Рейтинг 1-5 звезд
- Текстовый отзыв (50-2000 chars)
- Только enrolled студенты могут оставлять
- Один отзыв на курс от студента

### Moderation
- Админ может скрыть неприемлемые отзывы
- Учитель может ответить на отзыв
- Средний рейтинг отображается в каталоге

### Endpoints
- `GET /api/courses/[id]/reviews` — отзывы курса
- `POST /api/courses/[id]/reviews` — оставить отзыв (student)
- `PUT /api/reviews/[id]` — редактировать свой отзыв
- `DELETE /api/reviews/[id]` — удалить (admin/author)

---

## Live Streaming (Jitsi)

### Configuration
- Room name = `stream.id`
- Все уроки в потоке делят одну Jitsi комнату
- JWT auth доступен (`src/lib/jitsi-jwt.ts`)
- Для продакшена: self-hosted Jitsi с JWT

### Features
- Screen sharing
- Chat (встроенный в Jitsi)
- Recording (опционально, сохранение в S3)
- Participant list

---

## Notification System

### Notification Types

- `TEACHER_APPLICATION_APPROVED` / `REJECTED` / `SUBMITTED`
- `STUDENT_REGISTERED`
- `ENROLLMENT_REQUEST_SUBMITTED` / `APPROVED` / `REJECTED`
- `PAYMENT_CONFIRMED`
- `LESSON_PUBLISHED`
- `QUIZ_GRADED`
- `HOMEWORK_GRADED`
- `NEW_MESSAGE` (chat)
- `HASANAT_AWARDED`
- `ACHIEVEMENT_UNLOCKED`

### Delivery Channels
- In-app notifications (UI bell icon)
- Email notifications (опционально)
- Push notifications (future: PWA)

### User Preferences
- Включить/выключить по типам
- Email digest (daily/weekly/instant)
- Quiet hours

### Endpoints
- `GET /api/notifications` — список уведомлений
- `PUT /api/notifications/[id]/read` — пометить прочитанным
- `PUT /api/notifications/read-all` — пометить все
- `GET /api/notifications/preferences` — настройки
- `PUT /api/notifications/preferences` — обновить настройки

---

## Email System

### Templates

`src/lib/email/templates/`:

- `emailVerificationTemplate` — подтверждение email
- `teacherApplicationApprovedTemplate` — одобрение учителя
- `teacherApplicationRejectedTemplate` — отклонение
- `enrollmentApprovedTemplate` — зачисление одобрено
- `paymentConfirmedTemplate` — оплата подтверждена
- `lessonPublishedTemplate` — новый урок
- `quizGradedTemplate` — тест проверен
- `homeworkGradedTemplate` — ДЗ проверено

### Email Scheduler
- Batch отправка для broadcast
- Retry механизм при ошибках
- Queue для не-critical emails
- Pino logging всех отправок

### Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@fatiha.ru
SMTP_PASSWORD=***
EMAIL_FROM="Fatiha.ru <noreply@fatiha.ru>"
```

---

## Admin Panel

### Dashboard
- Total users (students/teachers/admin)
- Active courses и streams
- Pending applications (teachers, enrollments)
- Recent activity log

### User Management
- Список пользователей с фильтрами
- Блокировка/разблокировка
- Сброс пароля
- Просмотр профиля и активности
- Soft delete пользователей

### Teacher Applications Review
- Очередь заявок
- Просмотр документов и видео
- Одобрение с автоматическим email
- Отклонение с комментарием

### Content Moderation
- Репорты на контент (spam, inappropriate, etc.)
- Review workflow
- Действия: REMOVE, WARN, BLOCK_USER, NO_ACTION

### Broadcast System
- Массовые уведомления
- Фильтрация по ролям
- Email + in-app доставка
- Scheduled отправка

### CMS
- Редактирование home page контента
- Hero section, features, testimonials
- Markdown support
- Preview перед публикацией

### Data Export
- Экспорт студентов в CSV/JSON
- Экспорт курсов и статистики
- Фильтрация по датам

---

## Support System

### Tickets
- Создание тикетов студентами
- Категории: TECHNICAL, CONTENT, PAYMENT, OTHER
- Приоритеты: LOW, MEDIUM, HIGH, URGENT
- Назначение админами/учителями
- Ответы с комментариями
- Статусы: OPEN, IN_PROGRESS, RESOLVED, CLOSED

### Endpoints
- `POST /api/support/tickets` — создать тикет
- `GET /api/support/tickets` — список (фильтры по статусу)
- `POST /api/support/tickets/[id]/reply` — ответить
- `PUT /api/support/tickets/[id]/assign` — назначить (admin)
- `PUT /api/support/tickets/[id]/status` — изменить статус

---

## PWA Support

### Configuration
- Manifest: `public/manifest.json`
- Icons: 192x192, 512x512 PNG
- Theme color: темно-золотой (#1a1410)
- Display: standalone
- Start URL: `/`

### Features
- Установка на home screen (iOS/Android)
- Offline fallback страница
- Responsive design (mobile-first)
- Touch-friendly UI (min 44x44px targets)

---

## Development Configuration

### Default Port
Dev сервер работает на порту **3051** (не 3000) для предотвращения конфликтов при параллельной разработке.

### Environment Variables
См. `.env.example` для полного списка.

Критические переменные:
- `DATABASE_URL` — PostgreSQL connection
- `NEXTAUTH_URL` — base URL (http://localhost:3051 для dev)
- `NEXTAUTH_SECRET` — JWT secret
- `AWS_*` — S3 для загрузки файлов
- `SMTP_*` — email отправка

### Custom Server
**Всегда** используй `npm run dev`, **не** `next dev` напрямую.
Причина: Socket.io требует custom server (`server.ts`).

---

## Known Limitations & Future Work

### Current Issues (см. CHANGELOG.md Known Issues)
- Двойная навигация в дашбордах требует рефакторинга
- PDF библиотека медленная для файлов >50MB
- Нужна пагинация для больших списков

### Planned Features
- WebRTC для peer-to-peer видео вместо Jitsi
- Mobile apps (React Native)
- i18n для поддержки арабского языка
- Advanced analytics (cohort analysis, retention)
- Certificates при завершении курса
- Marketplace для платных курсов

---

## Testing

### Test Accounts
- Admin/Teacher: `admin@fatiha.ru` / `admin123`
- Student: `ali@student.ru` / `student123`

### Testing Checklist
1. Регистрация учителя → email verification → admin approval
2. Создание курса → поток → урок
3. Регистрация студента → заявка на зачисление → оплата → подтверждение
4. Прохождение урока → тест → ДЗ → проверка учителем
5. Hasanat начисление → leaderboard обновление
6. Загрузка книги → чтение → прогресс tracking
7. Live урок через Jitsi → chat → запись
8. Notifications → email → in-app

---

## Deployment

### Production URL
https://fatiha.ru

### Deployment Command
```bash
git push xnjnj
python deploy/_deploy_home.py
```

### Post-Deploy Checklist
- `npx prisma migrate deploy`
- Проверить env variables
- Smoke test: регистрация, логин, создание курса
- Мониторинг логов первые 30 минут

---

**Версия документации:** 1.0.0 (октябрь 2026)
**Последнее обновление:** автоматическое обновление после multi-agent fix session
