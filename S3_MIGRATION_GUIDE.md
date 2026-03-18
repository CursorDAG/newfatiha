# Миграция голосовых записей на S3

## Обзор

Голосовые записи квизов изначально хранились в PostgreSQL как `Bytes` (до 7MB на запись). Это приводит к раздуванию базы данных и снижению производительности. Данное руководство описывает процесс миграции на S3-совместимое хранилище.

## Поддерживаемые хранилища

- **AWS S3** - облачное хранилище Amazon
- **MinIO** - self-hosted S3-совместимое хранилище
- **Cloudflare R2** - S3-совместимое хранилище без платы за трафик
- Любое другое S3-совместимое хранилище

## Настройка

### 1. Установка зависимостей

Зависимости уже установлены:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Переменные окружения

Добавьте в `.env`:

```env
# Обязательные переменные
S3_BUCKET="fatiha-voice-recordings"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"

# Опциональные переменные
S3_ENDPOINT="https://s3.yourdomain.com"  # Только для MinIO/custom S3
S3_PUBLIC_URL="https://cdn.yourdomain.com"  # Для публичного CDN
```

**Для AWS S3:**
- Не указывайте `S3_ENDPOINT`
- Используйте стандартный регион (например, `us-east-1`)

**Для MinIO:**
- Укажите `S3_ENDPOINT` (например, `http://localhost:9000`)
- Регион может быть любым (например, `us-east-1`)

**Для Cloudflare R2:**
- `S3_ENDPOINT`: `https://<account-id>.r2.cloudflarestorage.com`
- `S3_REGION`: `auto`

### 3. Создание S3 bucket

**AWS S3:**
```bash
aws s3 mb s3://fatiha-voice-recordings --region us-east-1
```

**MinIO:**
```bash
mc mb minio/fatiha-voice-recordings
```

### 4. Настройка CORS (опционально)

Если нужен прямой доступ из браузера:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://fatiha.ru"],
      "AllowedMethods": ["GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## Миграция существующих данных

### Проверка данных

Проверьте количество записей для миграции:

```sql
SELECT COUNT(*) FROM "LessonQuizSubmission"
WHERE "voiceData" IS NOT NULL AND "voiceUrl" IS NULL;
```

### Запуск миграции

**Dry run (без изменений):**
```bash
npx tsx src/lib/migrate-voice-to-s3.ts --dry-run
```

**Миграция с сохранением данных в PostgreSQL:**
```bash
npx tsx src/lib/migrate-voice-to-s3.ts
```

**Миграция с очисткой PostgreSQL:**
```bash
npx tsx src/lib/migrate-voice-to-s3.ts --clear-data
```

### Мониторинг миграции

Скрипт выводит прогресс в реальном времени:
```
[INFO] Starting voice recordings migration to S3
[INFO] Found submissions to migrate: 150
[INFO] Batch processed: 1/15, migrated: 10, failed: 0, skipped: 0
...
[INFO] Migration completed: migrated: 150, failed: 0, skipped: 0
```

## Автоматическая загрузка новых записей

После настройки S3 все новые голосовые записи автоматически загружаются в S3:

1. Студент отправляет голосовую запись
2. API проверяет наличие S3 конфигурации (`isStorageConfigured()`)
3. Если S3 настроен - загружает в S3, иначе - сохраняет в PostgreSQL
4. В случае ошибки S3 - fallback на PostgreSQL

## Структура хранения

Записи хранятся по пути:
```
voice-recordings/{quizId}/{studentId}-{timestamp}.{extension}
```

Пример:
```
voice-recordings/quiz-abc123/student-xyz789-1710765432000.webm
```

## Получение записей

### Из API

Записи доступны через поле `voiceUrl`:

```typescript
const submission = await prisma.lessonQuizSubmission.findUnique({
  where: { id: submissionId },
  select: { voiceUrl: true, voiceData: true },
});

// Если voiceUrl существует - используем его
// Если нет - используем voiceData (legacy)
const audioSource = submission.voiceUrl ||
  `data:audio/webm;base64,${submission.voiceData.toString('base64')}`;
```

### Signed URLs

Для приватного доступа используйте signed URLs:

```typescript
import { getSignedDownloadUrl } from "@/lib/storage";

const url = await getSignedDownloadUrl(
  submission.voiceUrl,
  3600 // 1 час
);
```

## Очистка PostgreSQL

После успешной миграции можно очистить `voiceData`:

```sql
-- Проверка: все ли записи имеют voiceUrl
SELECT COUNT(*) FROM "LessonQuizSubmission"
WHERE "voiceData" IS NOT NULL AND "voiceUrl" IS NULL;

-- Если 0, можно очистить
UPDATE "LessonQuizSubmission"
SET "voiceData" = NULL
WHERE "voiceUrl" IS NOT NULL;

-- Освобождение места (VACUUM FULL требует эксклюзивной блокировки)
VACUUM FULL "LessonQuizSubmission";
```

## Откат миграции

Если нужно вернуться к PostgreSQL:

1. Остановите приложение
2. Удалите S3 переменные из `.env`
3. Перезапустите приложение

Записи с `voiceData` будут работать автоматически. Записи только с `voiceUrl` будут недоступны до восстановления S3.

## Мониторинг и обслуживание

### Проверка размера bucket

**AWS S3:**
```bash
aws s3 ls s3://fatiha-voice-recordings --recursive --summarize
```

**MinIO:**
```bash
mc du minio/fatiha-voice-recordings
```

### Backup

Настройте регулярные бэкапы S3:

**AWS S3:**
- Включите versioning
- Настройте lifecycle rules для старых версий
- Используйте S3 Replication для disaster recovery

**MinIO:**
- Используйте `mc mirror` для репликации
- Настройте регулярные snapshots

## Стоимость

### AWS S3 (примерная оценка)

- Хранение: $0.023/GB/месяц
- GET запросы: $0.0004 за 1000 запросов
- PUT запросы: $0.005 за 1000 запросов

Для 1000 студентов × 10 записей × 1MB:
- Хранение: 10GB × $0.023 = $0.23/месяц
- Запросы: ~$0.05/месяц
- **Итого: ~$0.30/месяц**

### Cloudflare R2

- Хранение: $0.015/GB/месяц
- Трафик: **бесплатно** (главное преимущество)
- Операции: $4.50 за миллион запросов

Для того же объема:
- **Итого: ~$0.15/месяц**

### MinIO (self-hosted)

- Стоимость сервера (зависит от провайдера)
- Нет платы за трафик и операции
- Полный контроль над данными

## Troubleshooting

### Ошибка "S3 storage not configured"

Проверьте наличие всех обязательных переменных:
```bash
echo $S3_BUCKET
echo $S3_ACCESS_KEY_ID
echo $S3_SECRET_ACCESS_KEY
```

### Ошибка "Access Denied"

Проверьте права доступа IAM/bucket policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::fatiha-voice-recordings/*"
    }
  ]
}
```

### Миграция прерывается

Скрипт обрабатывает записи батчами по 10. Если миграция прерывается:
1. Запустите снова - уже мигрированные записи будут пропущены
2. Проверьте логи для деталей ошибок
3. Уменьшите размер батча в коде (параметр `batchSize`)

## Дополнительные ресурсы

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [MinIO Documentation](https://min.io/docs/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
