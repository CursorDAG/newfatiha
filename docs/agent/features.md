# Features Documentation

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

## Live Streaming (Jitsi)

- Room name = `stream.id`
- Все уроки в потоке делят одну Jitsi комнату
- JWT auth доступен (`src/lib/jitsi-jwt.ts`)
- Для продакшена: self-hosted Jitsi с JWT

---

## Notification Types

- `TEACHER_APPLICATION_APPROVED` / `REJECTED` / `SUBMITTED`
- `STUDENT_REGISTERED`
- `ENROLLMENT_REQUEST_SUBMITTED` / `APPROVED` / `REJECTED`
- `PAYMENT_CONFIRMED`

---

## Email Templates

`src/lib/email/templates/`:

- `emailVerificationTemplate`
- `teacherApplicationApprovedTemplate`
- `teacherApplicationRejectedTemplate`

Паттерн: `baseTemplate` → `{ subject, html, text }`, CTA buttons, fallback text.
