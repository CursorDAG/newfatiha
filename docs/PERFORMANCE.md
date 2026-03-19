# Performance & Scalability Guide

Рекомендации по оптимизации производительности и масштабированию Fatiha.ru LMS.

## Мониторинг памяти

### Автоматический мониторинг

Приложение включает встроенный мониторинг памяти (`src/lib/memory-monitor.ts`):

- **Интервал проверки:** каждые 30 секунд
- **Предупреждение:** при превышении 1GB RSS
- **Критический уровень:** при превышении 2GB RSS
- **Автоматическое завершение:** при критическом уровне сервер завершает работу gracefully

### Логи мониторинга

```json
{
  "msg": "Статистика памяти",
  "rss": "188.45 MB",
  "heapUsed": "120.32 MB",
  "heapTotal": "150.00 MB",
  "external": "5.12 MB"
}
```

**Расшифровка метрик:**
- `rss` (Resident Set Size) - общая память процесса
- `heapUsed` - используемая heap память
- `heapTotal` - выделенная heap память
- `external` - память C++ объектов

## Оптимизация базы данных

### Connection Pool

**Проблема:** В dev режиме Next.js hot-reload создает множественные Prisma инстансы, что приводит к исчерпанию connection pool.

**Решение:**

1. Всегда используйте singleton из `src/lib/prisma.ts`
2. Добавьте `connection_limit` в DATABASE_URL:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=10"
```

**Рекомендуемые значения:**
- Development: `connection_limit=10`
- Production (малая нагрузка): `connection_limit=20`
- Production (средняя нагрузка): `connection_limit=50`
- Production (высокая нагрузка): используйте PgBouncer

### PgBouncer для Production

Для production с высокой нагрузкой рекомендуется использовать PgBouncer:

```ini
[databases]
fatiha_db = host=localhost port=5432 dbname=fatiha_db

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

Затем подключайтесь через PgBouncer:
```env
DATABASE_URL="postgresql://user:pass@localhost:6432/fatiha_db"
```

## Rate Limiting

### In-Memory Store

Текущая реализация использует in-memory Map для rate limiting (`src/lib/rate-limit.ts`).

**Защита от утечек памяти:**
- Максимальный размер: 10,000 записей
- При превышении: автоматическое удаление 10% самых старых записей
- Адаптивная очистка: при размере >5000 записей cleanup запускается каждую минуту вместо 5 минут

**Для production рекомендуется Redis:**

```typescript
// Пример с Redis (требует установки ioredis)
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function rateLimit(key: string, maxRequests: number, windowMs: number) {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }
  return current <= maxRequests;
}
```

## Socket.io Оптимизация

### Автоматическая очистка неактивных соединений

Socket.io сервер автоматически отключает неактивные соединения:

- **Timeout:** 30 минут без активности
- **Проверка:** каждые 5 минут
- **Логирование:** количество активных соединений и отключенных

### Мониторинг соединений

Логи включают информацию о количестве активных соединений:

```json
{
  "msg": "Socket connected",
  "userId": "user-123",
  "totalConnections": 45
}
```

### Очистка комнат

При отключении сокета автоматически очищаются все комнаты, в которых он состоял.

## Рекомендации для Production

### 1. Масштабирование Jitsi

**Проблема:** Один Jitsi Videobridge (JVB) не справится с >200 одновременными участниками.

**Решения:**
- Используйте Jitsi Octo для multi-bridge cascading
- Включите "presenter mode" для больших классов (>15 человек)
- Рассмотрите использование JWT токенов для контроля доступа

### 2. Thundering Herd при начале занятий

**Проблема:** 500+ студентов одновременно заходят на урок → перегрузка БД.

**Решения:**
- Переместите `InviteToken` lookup в Redis/KV store
- Используйте read-replicas для session validation
- Добавьте CDN для статических ресурсов
- Рассмотрите использование edge functions для auth

### 3. Real-Time Access Revocation

**Проблема:** Исключенный студент остается в Jitsi до перезагрузки страницы.

**Решения:**
- Внедрите Jitsi JWT токены с коротким TTL
- Используйте XMPP API для принудительного отключения
- Добавьте WebSocket уведомления о блокировке

### 4. Voice Quiz Recordings

**Проблема:** Хранение аудио в PostgreSQL (Bytes) приводит к раздуванию БД.

**Решения:**
- Переместите в S3/MinIO/Cloudflare R2
- Используйте CDN для раздачи записей
- Добавьте автоматическое удаление старых записей (>1 год)

Пример конфигурации в `.env`:
```env
S3_BUCKET="fatiha-voice-recordings"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="your-key"
S3_SECRET_ACCESS_KEY="your-secret"
```

### 5. Логирование и мониторинг

**Production setup:**

```env
LOG_LEVEL="info"  # Не используйте debug в production
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project"
```

**Рекомендуемые инструменты:**
- **Sentry** - error tracking
- **Grafana + Prometheus** - метрики и дашборды
- **Loki** - централизованное логирование
- **Uptime Kuma** - мониторинг доступности

### 6. Кэширование

**Рекомендуется добавить Redis для:**
- Session storage (вместо JWT)
- Rate limiting
- Кэширование частых запросов (список курсов, расписание)
- Pub/Sub для real-time уведомлений

```env
REDIS_URL="redis://localhost:6379"
```

### 7. CDN и статические ресурсы

**Для production:**
- Используйте CDN (Cloudflare, AWS CloudFront)
- Включите HTTP/2 и Brotli compression
- Настройте aggressive caching для статики
- Используйте Image Optimization (Next.js Image component)

### 8. Database Optimization

**Индексы:**
Убедитесь, что созданы индексы для частых запросов:

```sql
-- Enrollment lookups
CREATE INDEX idx_enrollment_user_stream ON "Enrollment"("userId", "streamId");

-- Activity tracking
CREATE INDEX idx_activity_user_kind ON "ActivitySession"("userId", "kind");

-- Quiz submissions
CREATE INDEX idx_quiz_submission_student ON "QuizSubmission"("studentId", "quizId");
```

**Vacuum и Analyze:**
Регулярно запускайте для поддержания производительности:

```sql
VACUUM ANALYZE;
```

### 9. Horizontal Scaling

Для масштабирования на несколько серверов:

1. **Sticky sessions** для Socket.io (или используйте Redis adapter)
2. **Shared session storage** (Redis)
3. **Load balancer** (nginx, HAProxy)
4. **Database read replicas** для чтения

Пример nginx config:
```nginx
upstream fatiha_backend {
    ip_hash;  # Sticky sessions
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}
```

## Мониторинг производительности

### Ключевые метрики для отслеживания

1. **Memory Usage** (RSS) - должно быть <1GB в production
2. **Database Connection Pool** - не должен исчерпываться
3. **Socket.io Connections** - количество активных соединений
4. **Rate Limit Store Size** - не должен превышать 10,000
5. **API Response Time** - p95 должен быть <500ms
6. **Jitsi Room Count** - количество активных комнат

### Алерты

Настройте алерты для:
- Memory usage >1.5GB
- Database connection errors
- API error rate >1%
- Socket.io disconnections >10/min
- Disk space <20%

## Troubleshooting

### Высокое потребление памяти

1. Проверьте логи memory monitor
2. Проверьте размер rate limit store: `store.size()`
3. Проверьте количество Socket.io соединений
4. Проверьте количество Prisma инстансов (должен быть 1)
5. Перезапустите сервер если память >2GB

### Медленные запросы к БД

1. Включите Prisma query logging: `LOG_LEVEL=debug`
2. Проверьте наличие индексов
3. Используйте `EXPLAIN ANALYZE` для медленных запросов
4. Рассмотрите добавление read-replicas

### Socket.io проблемы

1. Проверьте количество активных соединений в логах
2. Проверьте наличие неактивных соединений (>30 мин)
3. Убедитесь что cleanup interval работает
4. Проверьте CORS настройки

## Заключение

Текущая реализация оптимизирована для development и небольших production нагрузок (до 100 одновременных пользователей). Для масштабирования на 500+ пользователей потребуется:

1. Redis для rate limiting и sessions
2. PgBouncer для database connection pooling
3. S3 для voice recordings
4. Jitsi Octo для video scaling
5. CDN для статических ресурсов
6. Horizontal scaling с load balancer

