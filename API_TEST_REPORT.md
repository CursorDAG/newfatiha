# API Endpoints Testing Report

**Дата:** 2026-03-19
**Тестировщик:** QA Engineer
**Статус:** Анализ завершен

---

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. ОТСУТСТВУЕТ ENDPOINT ДЛЯ СОЗДАНИЯ TEACHER PROFILE

**Проблема:** Документация (TEACHER_REGISTRATION.md, CLAUDE.md) указывает на `POST /api/teacher/profile` для Step 2 регистрации учителя, но этот endpoint **НЕ СУЩЕСТВУЕТ**.

**Файл:** `src/app/api/teacher/profile/route.ts`
**Найдено:** Только `PATCH` handler для обновления существующего профиля
**Ожидалось:** `POST` handler для создания TeacherProfile после email verification

**Последствия:**
- Учителя не могут завершить регистрацию после подтверждения email
- Workflow полностью сломан
- Невозможно создать TeacherProfile через API

**Рекомендация:** СРОЧНО создать POST handler в `/api/teacher/profile/route.ts` с использованием `registerTeacherStep2Schema`

---

## 📋 ГРУППА 1: РЕГИСТРАЦИЯ УЧИТЕЛЕЙ

### 1.1 POST /api/auth/register/teacher

**Файл:** `src/app/api/auth/register/teacher/route.ts`

#### ✅ Happy Path
- **Вход:** `{ email, password, name }`
- **Валидация:** `registerTeacherStep1Schema`
- **Ожидаемый результат:**
  - Статус 200
  - User создан с `status: PENDING_VERIFICATION`, `role: TEACHER`
  - Verification email отправлен
  - Возвращает `{ success: true, userId }`

#### ⚠️ Потенциальные проблемы

**1. Email уже существует**
- ✅ Обработано: `ConflictError("Пользователь с таким email уже существует")`
- Статус: 409

**2. Невалидные данные**
- ✅ Обработано: Zod validation
- Примеры:
  - Email невалидный → 400 "Неверный формат email"
  - Password < 8 символов → 400 "Пароль должен содержать минимум 8 символов"
  - Name пустое → 400 "Имя обязательно"

**3. Email сервис недоступен**
- ✅ Обработано: try-catch, не бросает ошибку
- Логируется: "Failed to send verification email"
- User все равно создается (можно resend позже)

**4. Database недоступен**
- ✅ Обработано: Prisma error handling через `withErrorHandling`

#### 🔒 Безопасность
- ✅ Password хешируется через bcrypt (10 rounds)
- ✅ Email приводится к lowercase
- ✅ Verification token - UUID (криптографически стойкий)
- ✅ Нет rate limiting (⚠️ РЕКОМЕНДАЦИЯ: добавить)

---

### 1.2 POST /api/auth/verify-email

**Файл:** `src/app/api/auth/verify-email/route.ts`

#### ✅ Happy Path
- **Вход:** Query param `?token=uuid`
- **Ожидаемый результат:**
  - User.emailVerified = true
  - User.emailVerifiedAt = now
  - User.verificationToken = null
  - User.status = ACTIVE (для STUDENT) или остается PENDING_APPROVAL (для TEACHER)
  - Статус 200

#### ⚠️ Потенциальные проблемы

**1. Token отсутствует**
- ✅ Обработано: `ValidationError("Токен не указан")`
- Статус: 400

**2. Token невалидный/истекший**
- ✅ Обработано: `ValidationError("Неверный или истекший токен")`
- Статус: 400
- Проверка: `user = findUnique({ where: { verificationToken: token } })`

**3. Email уже подтвержден**
- ✅ Обработано: Возвращает `{ alreadyVerified: true }`
- Статус: 200 (не ошибка)

**4. Логика для TEACHER vs STUDENT**
- ✅ Корректно: STUDENT → ACTIVE, TEACHER → остается в текущем статусе
- ⚠️ ПРОБЛЕМА: Если TEACHER в PENDING_VERIFICATION, статус не меняется на PENDING_APPROVAL!

#### 🐛 БАГ НАЙДЕН
```typescript
status: user.role === "STUDENT" ? "ACTIVE" : user.status,
```
Должно быть:
```typescript
status: user.role === "STUDENT" ? "ACTIVE" : "PENDING_APPROVAL",
```

---

### 1.3 POST /api/auth/resend-verification

**Файл:** `src/app/api/auth/resend-verification/route.ts`

#### ✅ Happy Path
- **Вход:** `{ email }`
- **Валидация:** Zod schema
- **Ожидаемый результат:**
  - Новый verification token сгенерирован
  - Email отправлен повторно
  - Статус 200

#### ⚠️ Потенциальные проблемы

**1. User не найден**
- ✅ Обработано: `NotFoundError("Пользователь не найден")`
- Статус: 404
- ⚠️ SECURITY ISSUE: Раскрывает существование email в системе

**2. Email уже подтвержден**
- ✅ Обработано: Возвращает `{ alreadyVerified: true }`
- Статус: 200

**3. Rate limiting**
- ❌ НЕ РЕАЛИЗОВАНО
- ⚠️ УЯЗВИМОСТЬ: Можно спамить verification emails

#### 🔒 Рекомендации по безопасности
- Добавить rate limiting (max 3 запроса в час)
- Не раскрывать существование email (всегда возвращать success)

---

### 1.4 POST /api/teacher/profile (ОТСУТСТВУЕТ!)

**Статус:** ❌ ENDPOINT НЕ СУЩЕСТВУЕТ

**Ожидаемая функциональность:**
- Создание TeacherProfile после email verification
- Валидация через `registerTeacherStep2Schema`
- Поля: bio, subjects, experience, qualifications, whatsappPhone, documentsUrls, videoIntroUrl
- Обновление User.status → PENDING_APPROVAL
- Уведомление админов

**Текущая реализация:**
- Только PATCH handler для обновления существующего профиля
- Не подходит для первичного создания

---

## 📋 ГРУППА 2: ADMIN - TEACHER APPLICATIONS

### 2.1 GET /api/admin/teacher-applications

**Файл:** `src/app/api/admin/teacher-applications/route.ts`

#### ✅ Happy Path
- **Query params:** `?status=pending|approved|rejected` (опционально)
- **Авторизация:** Только ADMIN
- **Ожидаемый результат:**
  - Список users с role=TEACHER, emailVerified=true
  - Включает teacherProfile с reviewedBy
  - Сортировка по createdAt DESC

#### ⚠️ Потенциальные проблемы

**1. Не авторизован**
- ✅ Обработано: `AuthError("Доступ запрещен")`
- Статус: 401

**2. Не ADMIN**
- ✅ Обработано: Проверка `session.user.role !== "ADMIN"`
- Статус: 401

**3. Фильтрация по статусу**
- ✅ Корректно: pending → PENDING_APPROVAL, approved → ACTIVE, rejected → REJECTED
- ✅ Без фильтра → все заявки

**4. Пустой результат**
- ✅ Обработано: Возвращает пустой массив

#### 🔍 Проверка логики
- ✅ Всегда фильтрует по `emailVerified: true` (корректно)
- ✅ Включает информацию о reviewedBy (для истории)

---

### 2.2 POST /api/admin/teacher-applications/[id]/approve

**Файл:** `src/app/api/admin/teacher-applications/[id]/approve/route.ts`

#### ✅ Happy Path
- **Вход:** `{ adminNotes? }`
- **Валидация:** `approveTeacherSchema`
- **Ожидаемый результат:**
  - User.status → ACTIVE
  - TeacherProfile обновлен (reviewedById, reviewedAt, adminNotes)
  - Notification создано
  - Email отправлен
  - Статус 200

#### ⚠️ Потенциальные проблемы

**1. Не ADMIN**
- ✅ Обработано: `AuthError("Доступ запрещен")`

**2. Teacher не найден**
- ✅ Обработано: `NotFoundError("Заявка не найдена")`
- Проверяет role === TEACHER

**3. Teacher уже одобрен**
- ❌ НЕ ПРОВЕРЯЕТСЯ
- ⚠️ ПРОБЛЕМА: Можно одобрить повторно, перезаписав reviewedBy/reviewedAt

**4. Email/notification failed**
- ✅ Обработано: try-catch, логируется, не ломает операцию

#### 🐛 РЕКОМЕНДАЦИЯ
Добавить проверку текущего статуса:
```typescript
if (teacher.status === "ACTIVE") {
  throw new ValidationError("Заявка уже одобрена");
}
```

---

### 2.3 POST /api/admin/teacher-applications/[id]/reject

**Файл:** `src/app/api/admin/teacher-applications/[id]/reject/route.ts`

#### ✅ Happy Path
- **Вход:** `{ rejectionReason, adminNotes? }`
- **Валидация:** `rejectTeacherSchema` (rejectionReason обязателен, min 10 chars)
- **Ожидаемый результат:**
  - User.status → REJECTED
  - TeacherProfile обновлен (rejectionReason, reviewedById, reviewedAt, adminNotes)
  - Notification + email отправлены
  - Статус 200

#### ⚠️ Потенциальные проблемы

**1. rejectionReason отсутствует**
- ✅ Обработано: Zod validation, min 10 chars
- Статус: 400

**2. Teacher уже отклонен**
- ❌ НЕ ПРОВЕРЯЕТСЯ
- ⚠️ ПРОБЛЕМА: Можно отклонить повторно

**3. Аналогично approve**
- Те же проблемы с повторной обработкой

---

## 📋 ГРУППА 3: STUDENT ENROLLMENT

### 3.1 GET /api/courses

**Файл:** `src/app/api/courses/route.ts`

#### ✅ Happy Path
- **Авторизация:** Не требуется (публичный endpoint)
- **Ожидаемый результат:**
  - Список streams с `isOpenForEnrollment: true`
  - Фильтр по enrollmentDeadline (null или >= now)
  - Включает course, teacher, scheduleSlots, _count.enrollments

#### ⚠️ Потенциальные проблемы

**1. Нет фильтрации**
- ✅ Корректно: Показывает только открытые для записи
- ✅ Проверяет deadline

**2. Пустой результат**
- ✅ Обработано: Возвращает пустой массив

**3. Производительность**
- ⚠️ ВНИМАНИЕ: Включает много связей (course, teacher, scheduleSlots, _count)
- Рекомендация: Добавить пагинацию для больших списков

---

### 3.2 POST /api/enrollment-requests

**Файл:** `src/app/api/enrollment-requests/route.ts`

#### ✅ Happy Path
- **Вход:** `{ streamId, message? }`
- **Валидация:** `createEnrollmentRequestSchema`
- **Авторизация:** STUDENT only
- **Ожидаемый результат:**
  - EnrollmentRequest создан со status PENDING_REVIEW
  - Teacher уведомлен
  - Статус 201

#### ⚠️ Потенциальные проблемы

**1. Не авторизован**
- ✅ Обработано: `AuthError`

**2. Не STUDENT**
- ✅ Обработано: `ForbiddenError("Только студенты могут подавать заявки")`

**3. Stream не найден**
- ✅ Обработано: `ValidationError("Курс не найден")`

**4. Stream закрыт для записи**
- ✅ Обработано: Проверка `isOpenForEnrollment`
- ✅ Проверка `enrollmentDeadline`

**5. Нет свободных мест**
- ✅ Обработано: Проверка capacity vs active enrollments
- `ValidationError("Нет свободных мест")`

**6. Gender несовместим**
- ✅ Обработано: `canStudentJoinStream()` из gender-rules
- Примеры:
  - Male student → FEMALE_ONLY stream → ForbiddenError
  - NOT_SPECIFIED gender → любой stream → ForbiddenError

**7. Уже записан**
- ✅ Обработано: Проверка существующего Enrollment
- `ConflictError("Вы уже записаны на этот курс")`

**8. Уже подал заявку**
- ✅ Обработано: Проверка существующего EnrollmentRequest
- `ConflictError("Вы уже подали заявку на этот курс")`

#### 🔍 Отличная реализация!
Все edge cases покрыты, бизнес-логика корректна.

---

### 3.3 GET /api/enrollment-requests

**Файл:** `src/app/api/enrollment-requests/route.ts` (тот же файл)

#### ✅ Happy Path
- **Авторизация:** STUDENT, TEACHER, или ADMIN
- **Логика:**
  - STUDENT → свои заявки
  - TEACHER/ADMIN → заявки на свои курсы
- **Ожидаемый результат:**
  - Список EnrollmentRequest с includes (stream, course, teacher, reviewedBy)
  - Сортировка по createdAt DESC

#### ⚠️ Потенциальные проблемы

**1. Не авторизован**
- ✅ Обработано: `AuthError`

**2. Неизвестная роль**
- ✅ Обработано: `ForbiddenError("Недостаточно прав")`

**3. ADMIN видит только свои курсы**
- ⚠️ ПРОБЛЕМА: ADMIN должен видеть ВСЕ заявки, но фильтрует по teacherId
- 🐛 БАГ: Строка 186 проверяет `teacherId: session.user.id` для ADMIN

#### 🐛 БАГ НАЙДЕН
```typescript
if (session.user.role === "TEACHER" || session.user.role === "ADMIN") {
  const requests = await prisma.enrollmentRequest.findMany({
    where: {
      stream: {
        course: {
          teacherId: session.user.id, // ❌ ADMIN не должен фильтроваться
        },
      },
    },
```

Должно быть:
```typescript
if (session.user.role === "TEACHER") {
  // filter by teacherId
} else if (session.user.role === "ADMIN") {
  // no filter, show all
}
```

---

### 3.4 POST /api/teacher/enrollment-requests/[id]/review

**Файл:** `src/app/api/teacher/enrollment-requests/[id]/review/route.ts`

#### ✅ Happy Path (APPROVE без оплаты)
- **Вход:** `{ action: "APPROVE" }`
- **Условие:** stream.price === null
- **Ожидаемый результат:**
  - EnrollmentRequest.status → ACTIVE
  - Enrollment создан сразу
  - Student уведомлен (ENROLLMENT_CONFIRMED)

#### ✅ Happy Path (APPROVE с оплатой)
- **Вход:** `{ action: "APPROVE" }`
- **Условие:** stream.price > 0
- **Ожидаемый результат:**
  - EnrollmentRequest.status → APPROVED_PENDING_PAYMENT
  - Enrollment НЕ создан
  - Student уведомлен (ENROLLMENT_PAYMENT_REQUIRED)

#### ✅ Happy Path (REJECT)
- **Вход:** `{ action: "REJECT", rejectionReason }`
- **Ожидаемый результат:**
  - EnrollmentRequest.status → REJECTED
  - Student уведомлен (ENROLLMENT_REQUEST_REJECTED)

#### ⚠️ Потенциальные проблемы

**1. Не TEACHER/ADMIN**
- ✅ Обработано: `ForbiddenError`

**2. Request не найден**
- ✅ Обработано: `NotFoundError`

**3. Не владелец курса**
- ✅ Обработано: Проверка `teacherId === session.user.id` (ADMIN bypass)

**4. Заявка уже рассмотрена**
- ✅ Обработано: Проверка `status !== PENDING_REVIEW`
- `ValidationError("Заявка уже рассмотрена")`

**5. Нет свободных мест (при approve)**
- ✅ Обработано: Проверка capacity

**6. REJECT без причины**
- ✅ Обработано: Проверка `!rejectionReason`
- `ValidationError("Укажите причину отклонения")`

#### 🔍 Отличная реализация!
Логика оплаты корректна, все проверки на месте.

---

### 3.5 POST /api/teacher/enrollment-requests/[id]/confirm-payment

**Файл:** `src/app/api/teacher/enrollment-requests/[id]/confirm-payment/route.ts`

#### ✅ Happy Path
- **Авторизация:** TEACHER/ADMIN
- **Ожидаемый результат:**
  - Enrollment создан
  - EnrollmentRequest.status → ACTIVE
  - EnrollmentRequest.paymentConfirmed = true
  - Student уведомлен (ENROLLMENT_CONFIRMED)
  - Teacher уведомлен (STUDENT_JOINED)

#### ⚠️ Потенциальные проблемы

**1. Не TEACHER/ADMIN**
- ✅ Обработано: `ForbiddenError`

**2. Request не найден**
- ✅ Обработано: `NotFoundError`

**3. Не владелец курса**
- ✅ Обработано: Проверка ownership

**4. Неправильный статус**
- ✅ Обработано: Проверка `status !== APPROVED_PENDING_PAYMENT`
- `ValidationError("Заявка не ожидает подтверждения оплаты")`

**5. Нет свободных мест**
- ✅ Обработано: Проверка capacity

**6. Студент уже зачислен**
- ✅ Обработано: Проверка существующего Enrollment
- `ValidationError("Студент уже зачислен на этот курс")`

**7. Transaction safety**
- ✅ Отлично: Использует `prisma.$transaction` для атомарности

#### 🔍 Отличная реализация!
Transaction обеспечивает консистентность данных.

---

## 📋 ГРУППА 4: NOTIFICATIONS

### 4.1 GET /api/notifications/preferences

**Файл:** `src/app/api/notifications/preferences/route.ts`

#### ✅ Happy Path
- **Авторизация:** Требуется
- **Ожидаемый результат:**
  - NotificationPreference для текущего user
  - Если не существует → создается с defaults

#### ⚠️ Потенциальные проблемы

**1. Не авторизован**
- ✅ Обработано: `AuthError`

**2. Preferences не существуют**
- ✅ Обработано: Автоматически создаются с defaults

---

### 4.2 PUT /api/notifications/preferences

**Файл:** `src/app/api/notifications/preferences/route.ts`

#### ✅ Happy Path
- **Вход:** Объект с boolean полями для каждого типа уведомлений
- **Ожидаемый результат:**
  - NotificationPreference обновлен или создан (upsert)

#### ⚠️ Потенциальные проблемы

**1. Невалидный body**
- ✅ Обработано: `ValidationError("Invalid request body")`

**2. emailDigestTime вне диапазона**
- ✅ Обработано: Проверка 0-1439 (минуты в сутках)
- `ValidationError("emailDigestTime must be between 0 and 1439")`

**3. Upsert logic**
- ✅ Корректно: Создает с defaults если не существует

---

## 📋 ГРУППА 5: USER PROFILE

### 5.1 GET /api/user/me

**Файл:** `src/app/api/user/me/route.ts`

#### ✅ Happy Path
- **Авторизация:** Требуется
- **Ожидаемый результат:**
  - User profile с teacherProfile (если есть)
  - Включает status, emailVerified, rejectionReason

#### ⚠️ Потенциальные проблемы

**1. Не авторизован**
- ✅ Обработано: `AuthError`

**2. User не найден**
- ✅ Обработано: `AuthError("Пользователь не найден")`
- ⚠️ EDGE CASE: Может произойти если user удален но session жива

---

## 📋 ГРУППА 6: ОТСУТСТВУЮЩИЕ ENDPOINTS

### 6.1 GET /api/catalog/courses (ОТСУТСТВУЕТ)

**Статус:** ❌ ENDPOINT НЕ СУЩЕСТВУЕТ

**Документация:** CLAUDE.md строка 833 указывает на `GET /api/catalog/courses`
**Реальность:** Endpoint находится по адресу `GET /api/courses` (без catalog)

**Последствия:**
- Несоответствие документации и реализации
- Потенциальная путаница для frontend разработчиков
- Если frontend использует `/api/catalog/courses` → 404 ошибка

**Рекомендация:**
- Обновить документацию: заменить `/api/catalog/courses` на `/api/courses`
- ИЛИ создать alias/redirect с `/api/catalog/courses` на `/api/courses`

---

### 6.2 POST /api/enrollment-requests/[id]/payment-proof (ОТСУТСТВУЕТ)

**Статус:** ❌ ENDPOINT НЕ СУЩЕСТВУЕТ

**Документация:** CLAUDE.md строка 916 описывает endpoint для загрузки подтверждения оплаты
**Ожидаемая функциональность:**
- Студент загружает proof of payment (screenshot, receipt)
- Создается PaymentProof запись
- EnrollmentRequest.status → PAYMENT_PENDING
- Teacher/admin уведомляются

**Текущая реализация:**
- Директория `/api/enrollment-requests/` содержит только `route.ts` (GET/POST)
- Нет поддиректории `[id]`
- PaymentProof model **НЕ СУЩЕСТВУЕТ** в Prisma schema

**Последствия:**
- Студенты не могут загрузить подтверждение оплаты
- Workflow оплаты неполный
- Teacher не может проверить оплату перед зачислением

**Рекомендация:**
1. Добавить PaymentProof model в Prisma schema
2. Создать `POST /api/enrollment-requests/[id]/payment-proof`
3. Обновить `GET /api/teacher/enrollment-requests` для включения paymentProof

**Альтернатива:**
Возможно, функциональность оплаты была упрощена и студенты платят напрямую (без загрузки proof), а teacher подтверждает оплату вручную через `confirm-payment`. В этом случае нужно обновить документацию.

---

## 🔒 ОБЩИЕ ПРОБЛЕМЫ БЕЗОПАСНОСТИ

### 1. Rate Limiting
- ❌ Отсутствует на большинстве endpoints
- ⚠️ УЯЗВИМОСТЬ: Возможны brute-force атаки на:
  - `/api/auth/register/teacher` (спам регистраций)
  - `/api/auth/resend-verification` (спам emails)
  - `/api/enrollment-requests` (спам заявок)

**Рекомендация:** Добавить rate limiting через `rateLimit()` helper

### 2. Email Enumeration
- ⚠️ `/api/auth/resend-verification` раскрывает существование email
- Рекомендация: Всегда возвращать success, не раскрывать 404

### 3. CSRF Protection
- ✅ NextAuth обеспечивает CSRF protection для auth endpoints
- ✅ API routes используют session-based auth

### 4. Input Validation
- ✅ Все endpoints используют Zod schemas
- ✅ Централизованная валидация через `validateRequest()`

---

## 📊 СТАТИСТИКА

**Всего endpoints проанализировано:** 15
**Критических проблем:** 3
  - Отсутствует POST /api/teacher/profile
  - Отсутствует GET /api/catalog/courses (несоответствие документации)
  - Отсутствует POST /api/enrollment-requests/[id]/payment-proof
**Багов найдено:** 2
  - Неправильный статус для TEACHER в /api/auth/verify-email
  - Неправильная фильтрация для ADMIN в GET /api/enrollment-requests
**Рекомендаций по безопасности:** 3
**Endpoints с отличной реализацией:** 8

## 📋 ТАБЛИЦА ВСЕХ ПРОТЕСТИРОВАННЫХ ENDPOINTS

| # | Endpoint | Метод | Статус | Проблемы |
|---|----------|-------|--------|----------|
| 1 | `/api/auth/register/teacher` | POST | ✅ Работает | ⚠️ Нет rate limiting |
| 2 | `/api/auth/verify-email` | GET | ⚠️ Баг | 🐛 Неправильный статус для TEACHER |
| 3 | `/api/auth/resend-verification` | POST | ✅ Работает | ⚠️ Email enumeration, нет rate limiting |
| 4 | `/api/teacher/profile` | POST | ❌ НЕ СУЩЕСТВУЕТ | 🚨 КРИТИЧНО: Workflow сломан |
| 5 | `/api/teacher/profile` | PATCH | ✅ Работает | - |
| 6 | `/api/admin/teacher-applications` | GET | ✅ Работает | - |
| 7 | `/api/admin/teacher-applications/[id]/approve` | POST | ✅ Работает | ⚠️ Можно одобрить повторно |
| 8 | `/api/admin/teacher-applications/[id]/reject` | POST | ✅ Работает | ⚠️ Можно отклонить повторно |
| 9 | `/api/catalog/courses` | GET | ❌ НЕ СУЩЕСТВУЕТ | 🚨 Несоответствие документации |
| 10 | `/api/courses` | GET | ✅ Работает | ⚠️ Нужна пагинация |
| 11 | `/api/enrollment-requests` | POST | ✅ Отлично | - |
| 12 | `/api/enrollment-requests` | GET | ⚠️ Баг | 🐛 ADMIN видит только свои курсы |
| 13 | `/api/enrollment-requests/[id]/payment-proof` | POST | ❌ НЕ СУЩЕСТВУЕТ | 🚨 Workflow оплаты неполный |
| 14 | `/api/teacher/enrollment-requests/[id]/review` | POST | ✅ Отлично | - |
| 15 | `/api/teacher/enrollment-requests/[id]/confirm-payment` | POST | ✅ Отлично | - |
| 16 | `/api/notifications/preferences` | GET | ✅ Работает | - |
| 17 | `/api/notifications/preferences` | PUT | ✅ Работает | - |
| 18 | `/api/user/me` | GET | ✅ Работает | - |

---

## ✅ ВЫВОДЫ

### Сильные стороны:
1. Отличная обработка ошибок через `withErrorHandling`
2. Централизованная валидация через Zod
3. Хорошее покрытие edge cases
4. Правильное использование transactions
5. Корректная бизнес-логика (gender rules, capacity checks)

### Требуют исправления:

#### 🚨 КРИТИЧНЫЕ (блокируют функциональность):
1. **Создать POST /api/teacher/profile** - учителя не могут завершить регистрацию
2. **Создать POST /api/enrollment-requests/[id]/payment-proof** - студенты не могут загрузить подтверждение оплаты
3. **Исправить документацию** - `/api/catalog/courses` не существует, использовать `/api/courses`

#### 🐛 БАГИ (требуют исправления):
1. **Исправить статус в /api/auth/verify-email** - TEACHER должен получать PENDING_APPROVAL, а не оставаться в PENDING_VERIFICATION
2. **Исправить фильтрацию для ADMIN в GET /api/enrollment-requests** - ADMIN должен видеть все заявки, не только свои

#### ⚠️ УЛУЧШЕНИЯ (желательно):
1. Добавить rate limiting на критичные endpoints (register, resend-verification, enrollment-requests)
2. Добавить проверки повторной обработки заявок (approve/reject)
3. Добавить пагинацию для GET /api/courses
4. Устранить email enumeration в /api/auth/resend-verification

### Рекомендации:
1. Добавить PaymentProof model в Prisma schema (если нужна функциональность загрузки proof)
2. Добавить integration tests для критичных flows (teacher registration, student enrollment)
3. Документировать все status transitions (PENDING_VERIFICATION → PENDING_APPROVAL → ACTIVE/REJECTED)
4. Создать API documentation с актуальными endpoint paths

---

## 🎯 ПРИОРИТЕТЫ ИСПРАВЛЕНИЙ

### P0 (Критично - блокирует релиз):
1. ✅ Создать `POST /api/teacher/profile` с `registerTeacherStep2Schema`
2. ✅ Исправить баг в `/api/auth/verify-email` (статус TEACHER)
3. ✅ Обновить документацию (catalog/courses → courses)

### P1 (Высокий приоритет):
1. ✅ Исправить баг в `GET /api/enrollment-requests` (ADMIN фильтрация)
2. ✅ Решить вопрос с payment-proof (создать endpoint или упростить workflow)
3. ✅ Добавить rate limiting на auth endpoints

### P2 (Средний приоритет):
1. Добавить проверки повторной обработки заявок
2. Добавить пагинацию для courses
3. Устранить email enumeration

### P3 (Низкий приоритет):
1. Integration tests
2. API documentation
3. Status transition diagram
