# 🚀 Инструкция по исправлению базы данных на сервере

**Дата:** 2026-03-20
**Проблема:** База данных на сервере не содержит новые таблицы и поля
**Решение:** Применить недостающую миграцию

---

## 📋 Что будет сделано

Миграция `20260320000000_add_teacher_enrollment_system` добавит:

### Новые enum типы:
- ✅ `UserStatus` (PENDING_VERIFICATION, PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED)
- ✅ `EnrollmentRequestStatus` (PENDING_REVIEW, APPROVED_PENDING_PAYMENT, PAYMENT_CONFIRMED, ACTIVE, REJECTED)
- ✅ `NotificationPriority` (LOW, NORMAL, HIGH, URGENT)

### Новые поля в таблице User:
- ✅ `emailVerified` (Boolean, default: false)
- ✅ `emailVerifiedAt` (DateTime, nullable)
- ✅ `verificationToken` (String, nullable, unique)
- ✅ `status` (UserStatus, default: ACTIVE)

### Новые поля в таблице Stream:
- ✅ `isOpenForEnrollment` (Boolean, default: false)
- ✅ `price` (Decimal, nullable)
- ✅ `currency` (String, default: 'RUB')
- ✅ `enrollmentDeadline` (DateTime, nullable)
- ✅ `paymentInstructions` (Text, nullable)

### Новые поля в таблице Notification:
- ✅ `priority` (NotificationPriority, default: NORMAL)
- ✅ `metadata` (JSON, nullable)
- ✅ `actionUrl` (String, nullable)
- ✅ `actionText` (String, nullable)
- ✅ `emailSent` (Boolean, default: false)
- ✅ `emailSentAt` (DateTime, nullable)
- ✅ `readAt` (DateTime, nullable)

### Новые таблицы:
- ✅ `TeacherProfile` - профили заявок учителей
- ✅ `EnrollmentRequest` - заявки студентов на запись
- ✅ `NotificationPreference` - настройки уведомлений
- ✅ `PageContent` - контент страниц
- ✅ `Broadcast` - массовые рассылки

---

## 🎯 Шаги для деплоя

### Вариант 1: Автоматический (РЕКОМЕНДУЕТСЯ)

```bash
# 1. Загрузить файлы на сервер
scp prisma/migrations/20260320000000_add_teacher_enrollment_system/migration.sql root@your-server:/var/www/newfatiha/prisma/migrations/20260320000000_add_teacher_enrollment_system/
scp DEPLOY_FIX_DATABASE.sh root@your-server:/var/www/newfatiha/

# 2. Подключиться к серверу
ssh root@your-server

# 3. Запустить скрипт
cd /var/www/newfatiha
chmod +x DEPLOY_FIX_DATABASE.sh
./DEPLOY_FIX_DATABASE.sh
```

### Вариант 2: Ручной

```bash
# 1. Подключиться к серверу
ssh root@your-server

# 2. Перейти в директорию проекта
cd /var/www/newfatiha

# 3. Создать бэкап
sudo -u postgres pg_dump -d fatiha > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Проверить статус миграций
npx prisma migrate status

# 5. Применить миграции
npx prisma migrate deploy

# 6. Сгенерировать Prisma Client
npx prisma generate

# 7. Проверить структуру User
sudo -u postgres psql -d fatiha -c "\d \"User\""

# 8. Создать администратора
sudo -u postgres psql -d fatiha <<EOF
DELETE FROM "User" WHERE email = 'admin@fatiha.ru';
INSERT INTO "User" (id, email, password, name, role, "emailVerified", status, gender, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@fatiha.ru',
  '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye.IjzKrMa3s83si9GeCAos99JxHm8jqW',
  'Администратор',
  'ADMIN',
  true,
  'ACTIVE',
  'NOT_SPECIFIED',
  NOW(),
  NOW()
);
EOF

# 9. Перезапустить приложение
pm2 restart fatiha

# 10. Проверить логи
pm2 logs fatiha --lines 50
```

---

## ✅ Проверка после деплоя

### 1. Проверить статус миграций
```bash
npx prisma migrate status
# Должно быть: "Database schema is up to date!"
```

### 2. Проверить структуру таблицы User
```bash
sudo -u postgres psql -d fatiha -c "\d \"User\"" | grep -E "emailVerified|status|verificationToken"
```

Должны быть строки:
```
 emailVerified        | boolean                  |           | not null | false
 emailVerifiedAt      | timestamp(3) without time zone |           |          |
 verificationToken    | text                     |           |          |
 status               | "UserStatus"             |           | not null | 'ACTIVE'::
```

### 3. Проверить новые таблицы
```bash
sudo -u postgres psql -d fatiha -c "\dt" | grep -E "TeacherProfile|EnrollmentRequest|NotificationPreference"
```

Должны быть:
```
 public | TeacherProfile         | table | postgres
 public | EnrollmentRequest      | table | postgres
 public | NotificationPreference | table | postgres
```

### 4. Проверить авторизацию
1. Откройте браузер: `https://fatiha.ru`
2. Войдите с учетными данными:
   - Email: `admin@fatiha.ru`
   - Password: `admin123`
3. Должна открыться админ-панель без ошибок

### 5. Проверить логи приложения
```bash
pm2 logs fatiha --lines 100 --err
```

Не должно быть ошибок типа:
- ❌ `column "status" does not exist`
- ❌ `relation "TeacherProfile" does not exist`
- ❌ `type "UserStatus" does not exist`

---

## 🆘 Откат в случае проблем

### Если что-то пошло не так:

```bash
# 1. Остановить приложение
pm2 stop fatiha

# 2. Восстановить бэкап
sudo -u postgres psql -d fatiha < /tmp/backup_YYYYMMDD_HHMMSS.sql

# 3. Откатить миграцию (пометить как rolled back)
npx prisma migrate resolve --rolled-back 20260320000000_add_teacher_enrollment_system

# 4. Запустить приложение
pm2 start fatiha

# 5. Связаться с разработчиком
```

---

## 📊 Ожидаемый результат

После успешного деплоя:

✅ Все 9 миграций применены
✅ Таблица User содержит поля: emailVerified, status, verificationToken
✅ Таблицы TeacherProfile, EnrollmentRequest, NotificationPreference созданы
✅ Администратор может войти в систему
✅ Нет ошибок в логах приложения
✅ Все API endpoints работают корректно

---

## 📝 Дополнительная информация

### Тестовые аккаунты (после seed)

Если нужно заполнить БД тестовыми данными:
```bash
npx prisma db seed
```

Будут созданы:
- **Админ:** admin@fatiha.ru / admin123
- **Учитель:** teacher@fatiha.ru / admin123
- **Студенты:** ali@student.ru, umar@student.ru, fatima@student.ru, aisha@student.ru / student123

### Полезные команды

```bash
# Проверить подключение к БД
sudo -u postgres psql -d fatiha -c "SELECT version();"

# Посмотреть все таблицы
sudo -u postgres psql -d fatiha -c "\dt"

# Посмотреть все enum типы
sudo -u postgres psql -d fatiha -c "\dT"

# Посмотреть количество пользователей
sudo -u postgres psql -d fatiha -c "SELECT role, status, COUNT(*) FROM \"User\" GROUP BY role, status;"

# Перезапустить PostgreSQL
sudo systemctl restart postgresql

# Перезапустить приложение
pm2 restart fatiha

# Посмотреть статус PM2
pm2 status

# Посмотреть использование памяти
pm2 monit
```

---

## 🎉 Готово!

После выполнения всех шагов ваше приложение должно работать корректно.

Если возникли вопросы или проблемы, проверьте:
1. Логи приложения: `pm2 logs fatiha`
2. Логи PostgreSQL: `/var/log/postgresql/postgresql-*.log`
3. Статус миграций: `npx prisma migrate status`
