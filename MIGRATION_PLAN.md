# План миграции базы данных

**Дата:** 2026-03-19
**Версия:** 1.0.0

## Обзор изменений

Этот документ описывает все изменения в структуре базы данных, добавленные в рамках расширения функционала LMS Fatiha.ru.

### Новые модели

1. **TeacherProfile** - профили заявок учителей для регистрации
2. **EnrollmentRequest** - заявки студентов на запись в потоки
3. **NotificationPreference** - настройки уведомлений пользователей

### Новые enum типы

1. **UserStatus** - статусы пользователей:
   - `PENDING_VERIFICATION` - ожидает подтверждения email
   - `PENDING_APPROVAL` - ожидает одобрения админом
   - `ACTIVE` - активный
   - `REJECTED` - отклонен
   - `SUSPENDED` - заблокирован

2. **EnrollmentRequestStatus** - статусы заявок на запись:
   - `PENDING_REVIEW` - ожидает проверки
   - `APPROVED_PENDING_PAYMENT` - одобрена, ожидает оплаты
   - `PAYMENT_CONFIRMED` - оплата подтверждена
   - `ACTIVE` - активна (студент зачислен)
   - `REJECTED` - отклонена

### Обновленные модели

1. **User**:
   - `emailVerified: Boolean` - флаг подтверждения email
   - `emailVerifiedAt: DateTime?` - дата подтверждения
   - `verificationToken: String?` - токен для верификации email
   - `status: UserStatus` - статус пользователя

2. **Stream**:
   - `isOpenForEnrollment: Boolean` - открыт ли поток для записи
   - `price: Decimal?` - стоимость обучения
   - `currency: String` - валюта (по умолчанию "RUB")
   - `enrollmentDeadline: DateTime?` - дедлайн для записи
   - `paymentInstructions: String?` - инструкции по оплате

3. **NotificationType** (enum) - добавлены новые типы:
   - `TEACHER_APPLICATION_APPROVED`
   - `TEACHER_APPLICATION_REJECTED`
   - `STUDENT_REGISTERED`
   - `TEACHER_APPLICATION_SUBMITTED`
   - `ENROLLMENT_REQUEST_SUBMITTED`
   - `ENROLLMENT_REQUEST_APPROVED`
   - `ENROLLMENT_REQUEST_REJECTED`
   - `ENROLLMENT_PAYMENT_REQUIRED`
   - `ENROLLMENT_CONFIRMED`

## История миграций

### Существующие миграции

```
20260318000000_baseline                      - Базовая схема
20260318102857_add_voice_url_field          - Добавлено поле voiceUrl
20260318115511_add_notifications            - Система уведомлений
20260318151943_stage1_admin_chat_gender     - Админ, чат, гендер, регистрация
20260318200845_add_recording_status_enum    - Статусы записей уроков
20260319110708_add_multiple_questions_support - Множественные вопросы
20260319134753_add_question_details         - Детали вопросов в JSON
```

**Статус:** Все миграции применены. Новые миграции не требуются.

## Команды для применения миграций

### Development

```bash
# 1. Проверить статус миграций
npx prisma migrate status

# 2. Применить все pending миграции
npx prisma migrate dev

# 3. Сгенерировать Prisma Client
npx prisma generate

# 4. Заполнить БД тестовыми данными
npx prisma db seed
```

### Production

```bash
# 1. Создать бэкап БД перед миграцией
pg_dump -U fatiha_user -d fatiha_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Применить миграции (без интерактивного режима)
npx prisma migrate deploy

# 3. Сгенерировать Prisma Client
npx prisma generate

# 4. Проверить статус
npx prisma migrate status

# 5. Перезапустить приложение
pm2 restart fatiha-lms
```

## Rollback стратегия

### Откат последней миграции (Development)

```bash
# 1. Откатить последнюю миграцию
npx prisma migrate resolve --rolled-back <migration_name>

# 2. Удалить файл миграции
rm -rf prisma/migrations/<migration_name>

# 3. Пересоздать миграцию
npx prisma migrate dev --name <new_migration_name>
```

### Откат в Production

**ВАЖНО:** Prisma не поддерживает автоматический rollback. Необходимо:

1. **Восстановить из бэкапа:**
   ```bash
   psql -U fatiha_user -d fatiha_db < backup_20260319_120000.sql
   ```

2. **Или написать обратную миграцию вручную:**
   ```sql
   -- Пример: откат добавления поля
   ALTER TABLE "User" DROP COLUMN "emailVerified";
   ALTER TABLE "User" DROP COLUMN "emailVerifiedAt";
   ALTER TABLE "User" DROP COLUMN "verificationToken";
   ```

3. **Применить обратную миграцию:**
   ```bash
   psql -U fatiha_user -d fatiha_db < rollback.sql
   ```

## Breaking Changes

### ⚠️ Критические изменения

1. **User.status** - новое обязательное поле с дефолтным значением `ACTIVE`
   - Все существующие пользователи автоматически получат статус `ACTIVE`
   - Не требует ручной миграции данных

2. **Stream.isOpenForEnrollment** - новое поле с дефолтом `false`
   - Все существующие потоки будут закрыты для записи по умолчанию
   - **Действие:** После миграции вручную откройте нужные потоки через админ-панель

3. **NotificationType enum** - добавлены новые значения
   - Обратно совместимо, не требует изменений в коде

### ✅ Безопасные изменения

- Все новые поля nullable или имеют дефолтные значения
- Новые таблицы не влияют на существующие данные
- Индексы добавлены для оптимизации запросов

## Проверка после миграции

### Checklist

```bash
# 1. Проверить, что все миграции применены
npx prisma migrate status

# 2. Проверить подключение к БД
npx prisma studio

# 3. Проверить новые таблицы
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"TeacherProfile\";"
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"EnrollmentRequest\";"

# 4. Проверить новые поля
npx prisma db execute --stdin <<< "SELECT status FROM \"User\" LIMIT 1;"

# 5. Запустить seed для тестовых данных
npx prisma db seed
```

### SQL запросы для проверки

```sql
-- Проверить статусы пользователей
SELECT role, status, COUNT(*)
FROM "User"
GROUP BY role, status;

-- Проверить заявки учителей
SELECT COUNT(*) FROM "TeacherProfile";

-- Проверить заявки на запись
SELECT status, COUNT(*)
FROM "EnrollmentRequest"
GROUP BY status;

-- Проверить настройки уведомлений
SELECT COUNT(*) FROM "NotificationPreference";

-- Проверить открытые потоки
SELECT name, "isOpenForEnrollment", price
FROM "Stream"
WHERE "isOpenForEnrollment" = true;
```

## Оптимизация после миграции

### Рекомендуемые индексы (уже добавлены)

```sql
-- Индексы для TeacherProfile
CREATE INDEX IF NOT EXISTS "TeacherProfile_userId_idx" ON "TeacherProfile"("userId");
CREATE INDEX IF NOT EXISTS "TeacherProfile_reviewedById_idx" ON "TeacherProfile"("reviewedById");

-- Индексы для EnrollmentRequest
CREATE INDEX IF NOT EXISTS "EnrollmentRequest_studentId_idx" ON "EnrollmentRequest"("studentId");
CREATE INDEX IF NOT EXISTS "EnrollmentRequest_streamId_idx" ON "EnrollmentRequest"("streamId");
CREATE INDEX IF NOT EXISTS "EnrollmentRequest_status_idx" ON "EnrollmentRequest"("status");

-- Индексы для NotificationPreference
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
```

### Vacuum и Analyze

После миграции рекомендуется выполнить:

```sql
-- Очистить и проанализировать таблицы
VACUUM ANALYZE "User";
VACUUM ANALYZE "TeacherProfile";
VACUUM ANALYZE "EnrollmentRequest";
VACUUM ANALYZE "Stream";
```

## Мониторинг после деплоя

### Метрики для отслеживания

1. **Производительность запросов:**
   - Время выполнения запросов к новым таблицам
   - Использование индексов

2. **Размер БД:**
   ```sql
   SELECT pg_size_pretty(pg_database_size('fatiha_db'));
   ```

3. **Активные подключения:**
   ```sql
   SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'fatiha_db';
   ```

4. **Медленные запросы:**
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

## Поддержка

При возникновении проблем:

1. Проверьте логи приложения: `pm2 logs fatiha-lms`
2. Проверьте логи PostgreSQL: `/var/log/postgresql/postgresql-*.log`
3. Откатитесь к бэкапу если необходимо
4. Свяжитесь с командой разработки

## Дополнительные ресурсы

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)
- [CLAUDE.md](./CLAUDE.md) - справочник по архитектуре проекта
