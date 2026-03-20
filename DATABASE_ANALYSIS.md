# Анализ проблемы с базой данных

**Дата:** 2026-03-20
**Статус:** Обнаружена критическая проблема

---

## 🚨 Обнаруженные проблемы

### 1. **Несоответствие имени базы данных**

**Проблема:** В командах деплоя используется имя БД `fatiha`, но в `.env.example` указано `fatiha_db`

```bash
# В командах деплоя:
psql -d fatiha

# В .env.example:
DATABASE_URL="postgresql://fatiha_user:fatiha_pass@localhost:5432/fatiha_db"
```

**Вывод:** Возможно, на сервере база данных называется `fatiha_db`, а команды пытались работать с `fatiha`.

---

### 2. **Миграции могли не примениться**

**Текущая схема требует 8 миграций:**
1. `20260318000000_baseline` - базовая схема (старая версия без новых полей)
2. `20260318102857_add_voice_url_field` - добавлено поле voiceUrl
3. `20260318102915_add_voice_url_field` - дубликат (?)
4. `20260318115511_add_notifications` - система уведомлений
5. `20260318151943_stage1_admin_chat_gender` - **КРИТИЧЕСКАЯ**: добавляет поля `emailVerified`, `status`, `verificationToken`, таблицы `TeacherProfile`, `EnrollmentRequest`
6. `20260318200845_add_recording_status_enum` - статусы записей
7. `20260319110708_add_multiple_questions_support` - множественные вопросы
8. `20260319134753_add_question_details` - детали вопросов

**Если миграции не применились**, в БД отсутствуют:
- ❌ `User.emailVerified` (Boolean)
- ❌ `User.emailVerifiedAt` (DateTime)
- ❌ `User.verificationToken` (String)
- ❌ `User.status` (UserStatus enum)
- ❌ `User.gender` (Gender enum)
- ❌ Таблица `TeacherProfile`
- ❌ Таблица `EnrollmentRequest`
- ❌ Таблица `NotificationPreference`
- ❌ Enum `UserStatus`
- ❌ Enum `EnrollmentRequestStatus`
- ❌ И другие новые поля...

---

### 3. **Проблема с аутентификацией**

**NextAuth пытается прочитать поля, которых нет в БД:**

```typescript
// src/app/api/auth/[...nextauth]/route.ts (строки 69-77)
if (token.id) {
  const dbUser = await prisma.user.findUnique({
    where: { id: token.id as string },
    select: { status: true, role: true }, // ❌ Поле 'status' не существует!
  });
  if (dbUser) {
    token.status = dbUser.status;
    token.role = dbUser.role;
  }
}
```

**Результат:** При попытке входа возникает ошибка SQL:
```
ERROR: column "status" does not exist
```

---

### 4. **Middleware проверяет несуществующие поля**

```typescript
// src/middleware.ts
if (token.role === "TEACHER" && token.status) {
  if (status === "PENDING_APPROVAL" || status === "PENDING_VERIFICATION") {
    // ❌ Поле 'status' не существует в JWT токене
  }
}
```

---

## 📊 Сравнение схем

### Базовая миграция (20260318000000_baseline)
```sql
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "avatar" TEXT,
    "bio" TEXT,
    "skills" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    -- ❌ НЕТ полей: emailVerified, status, gender, verificationToken
);
```

### Текущая схема (schema.prisma)
```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  password          String?
  name              String
  role              Role      @default(STUDENT)
  // ... старые поля ...
  gender            Gender    @default(NOT_SPECIFIED)      // ✅ НОВОЕ
  emailVerified     Boolean   @default(false)              // ✅ НОВОЕ
  emailVerifiedAt   DateTime?                              // ✅ НОВОЕ
  verificationToken String?   @unique                      // ✅ НОВОЕ
  status            UserStatus @default(ACTIVE)            // ✅ НОВОЕ
  // ... связи ...
}
```

---

## 🎯 Причина проблемы

**Вывод:** На продакшн-сервере база данных осталась в состоянии **baseline** (первая миграция), а код приложения ожидает **полную схему** со всеми 8 миграциями.

**Почему это произошло:**
1. При деплое команда `npx prisma migrate deploy` либо не выполнилась, либо выполнилась на неправильной БД
2. Возможно, использовалось неправильное имя БД (`fatiha` вместо `fatiha_db`)
3. Возможно, переменная `DATABASE_URL` на сервере указывает на другую БД

---

## 🔧 Решение

### Вариант 1: Применить все миграции (РЕКОМЕНДУЕТСЯ)

```bash
# На сервере:
cd /var/www/newfatiha

# Проверить DATABASE_URL
cat .env | grep DATABASE_URL

# Проверить статус миграций
npx prisma migrate status

# Применить все pending миграции
npx prisma migrate deploy

# Сгенерировать Prisma Client
npx prisma generate

# Перезапустить приложение
pm2 restart fatiha
```

### Вариант 2: Пересоздать БД с нуля (если данных нет)

```bash
# На сервере:
cd /var/www/newfatiha

# Удалить старую БД и создать новую
sudo -u postgres psql -c "DROP DATABASE IF EXISTS fatiha_db;"
sudo -u postgres psql -c "CREATE DATABASE fatiha_db;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fatiha_db TO fatiha_user;"

# Применить миграции
npx prisma migrate deploy

# Заполнить тестовыми данными
npx prisma db seed

# Перезапустить
pm2 restart fatiha
```

### Вариант 3: Проверить имя БД и исправить

```bash
# Проверить, какая БД существует
sudo -u postgres psql -c "\l" | grep fatiha

# Если БД называется 'fatiha', а не 'fatiha_db':
# Исправить .env на сервере:
nano /var/www/newfatiha/.env
# Изменить DATABASE_URL на правильное имя БД
```

---

## ✅ Проверка после исправления

```bash
# 1. Проверить статус миграций
npx prisma migrate status
# Должно быть: "Database schema is up to date!"

# 2. Проверить структуру таблицы User
sudo -u postgres psql -d fatiha_db -c "\d \"User\""
# Должны быть поля: emailVerified, status, gender, verificationToken

# 3. Проверить наличие новых таблиц
sudo -u postgres psql -d fatiha_db -c "\dt" | grep -E "TeacherProfile|EnrollmentRequest"

# 4. Попробовать войти
# Email: admin@fatiha.ru
# Password: admin123
```

---

## 📝 Рекомендации

1. **Всегда проверяйте статус миграций** перед деплоем: `npx prisma migrate status`
2. **Используйте одинаковые имена БД** в .env и командах
3. **Делайте бэкап** перед применением миграций: `pg_dump -U user -d db > backup.sql`
4. **Проверяйте логи** после деплоя: `pm2 logs fatiha`

---

## 🆘 Если ничего не помогло

Проверьте логи приложения на сервере:
```bash
pm2 logs fatiha --lines 100 --err
```

Ищите ошибки типа:
- `column "status" does not exist`
- `relation "TeacherProfile" does not exist`
- `type "UserStatus" does not exist`

Это подтвердит, что миграции не применились.
