# План развития Fatiha.ru LMS - Часть 2

## Навигация по документам

- **ROADMAP_PART1.md** - Текущее состояние + Этап 1 (Админ панель, уведомления, чат, гендерное разделение)
- **ROADMAP_PART2.md** (этот файл) - Этапы 2-3 (Контент, монетизация, масштабирование)
- **ROADMAP_PART3.md** - Этапы 4-5 (Исламская специфика, AI)

**ВАЖНО:** Начинайте работу над Этапом 2 только после полного завершения Этапа 1.

---

## ЭТАП 2: Контент и вовлеченность (3-4 недели)

**Цель:** Студенты видят прогресс, могут пересматривать пропущенные уроки, удобно учиться с телефона.

### Приоритет 2.1: Записи уроков

**Проблема:** Студент пропустил урок = потерянный студент. Нет возможности пересмотреть материал.

#### 2.1.1 Запись Jitsi уроков

**Инфраструктура:**

**Вариант А: Jibri (официальный рекордер Jitsi)**
- Развернуть Jibri сервер (требует отдельную VM)
- Настроить интеграцию с Jitsi Meet
- Автоматический старт записи при начале урока
- Сохранение в S3/локальное хранилище

**Вариант Б: Сторонний сервис**
- Использовать Daily.co, Whereby, или аналог с встроенной записью
- Проще в настройке, но платно

**Рекомендация:** Начать с Jibri для контроля над данными.

**Модели данных:**

```prisma
model LessonRecording {
  id          String   @id @default(uuid())
  lessonId    String
  lesson      Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  streamId    String
  stream      Stream   @relation(fields: [streamId], references: [id])

  videoUrl    String   // S3 URL или локальный путь
  duration    Int?     // длительность в секундах
  fileSize    BigInt?  // размер файла в байтах

  recordedAt  DateTime
  processedAt DateTime? // когда обработка завершена

  status      RecordingStatus @default(PROCESSING)

  createdAt   DateTime @default(now())

  @@index([lessonId])
  @@index([streamId])
}

enum RecordingStatus {
  PROCESSING   // идет обработка
  READY        // готово к просмотру
  FAILED       // ошибка обработки
}
```

#### 2.1.2 Обработка видео

**Задачи после записи:**
- Конвертация в web-friendly формат (MP4 H.264)
- Генерация превью (thumbnail)
- Опционально: генерация субтитров через Whisper API
- Опционально: разные качества (360p, 720p, 1080p) для адаптивного стрима

**Инфраструктура:**
- Использовать FFmpeg для обработки
- Запускать в фоновой очереди (BullMQ или аналог)
- Уведомление учителю когда запись готова

#### 2.1.3 UI и доступ

**Страница урока:**
- Если урок завершен и есть запись → показать видеоплеер
- Использовать HTML5 video или video.js для лучшего UX
- Контролы: play/pause, перемотка, скорость воспроизведения, fullscreen

**Архив записей:**
- Новая вкладка в кабинете студента: "Архив уроков"
- Список всех записей потока с датами
- Фильтр по дате, поиск по названию

**Права доступа:**
- Студент видит только записи своих потоков
- Учитель видит все записи своих потоков
- Учитель может удалить запись
- Учитель может скачать запись

**API:**
- `GET /api/recordings` - список записей (с фильтрами по streamId)
- `GET /api/recordings/[recordingId]` - детали записи
- `GET /api/recordings/[recordingId]/stream` - signed URL для просмотра
- `DELETE /api/recordings/[recordingId]` - удалить запись (только учитель)

---

### Приоритет 2.2: Прогресс студента

**Цель:** Студент видит свой прогресс, мотивация не падает.

#### 2.2.1 Визуализация прогресса

**Метрики для отслеживания:**

**Прохождение уроков:**
- Общее количество уроков в потоке
- Количество посещенных уроков (на основе ActivitySession с kind=LIVE_ROOM)
- Процент прохождения

**Выполнение тестов:**
- Количество тестов в потоке
- Количество сданных тестов (status=PASSED)
- Средний балл (если есть баллы)

**Домашние задания:**
- Количество заданий
- Количество сданных (status=SUBMITTED)
- Количество принятых (status=ACCEPTED)
- Процент выполнения

**Активность:**
- Дней подряд заходил на платформу (streak)
- Общее время в системе
- Последняя активность

#### 2.2.2 Модели данных

```prisma
model StudentProgress {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  streamId        String
  stream          Stream   @relation(fields: [streamId], references: [id], onDelete: Cascade)

  // кэшированные метрики (обновляются периодически)
  lessonsTotal    Int      @default(0)
  lessonsAttended Int      @default(0)

  quizzesTotal    Int      @default(0)
  quizzesPassed   Int      @default(0)

  homeworkTotal   Int      @default(0)
  homeworkSubmitted Int    @default(0)
  homeworkAccepted Int     @default(0)

  currentStreak   Int      @default(0)  // дней подряд
  longestStreak   Int      @default(0)
  lastActivityDate DateTime?

  totalMinutesSpent Int    @default(0)

  updatedAt       DateTime @updatedAt

  @@unique([userId, streamId])
}

model Achievement {
  id          String   @id @default(uuid())
  code        String   @unique  // например "first_lesson", "streak_7"
  title       String
  description String
  icon        String   // emoji или URL иконки
  category    AchievementCategory
}

enum AchievementCategory {
  ATTENDANCE
  HOMEWORK
  QUIZ
  STREAK
  SPECIAL
}

model UserAchievement {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievementId String
  achievement   Achievement @relation(fields: [achievementId], references: [id])

  earnedAt      DateTime @default(now())

  @@unique([userId, achievementId])
}
```

#### 2.2.3 UI компоненты

**Dashboard студента:**
- Карточка прогресса для каждого потока:
  - Круговой прогресс-бар (% прохождения)
  - Статистика: уроков посещено, тестов сдано, ДЗ выполнено
  - Текущий streak (🔥 5 дней подряд)
  - Следующий урок (дата, время)

**Страница "Мой прогресс":**
- Детальная статистика по каждому потоку
- График активности (календарь с отметками дней)
- Список достижений (earned + locked)
- Сравнение с другими студентами потока (опционально, если разрешено)

**Достижения (геймификация):**

Примеры достижений:
- 🎓 "Первый урок" - посетил первый урок
- 🔥 "Неделя подряд" - 7 дней активности подряд
- 📚 "Отличник" - сдал все тесты на 100%
- ⚡ "Быстрый старт" - выполнил 5 заданий за первую неделю
- 🏆 "Завершил курс" - прошел все уроки потока

#### 2.2.4 Фоновые задачи

**Обновление прогресса:**
- Запускать пересчет метрик после каждого события:
  - Посещение урока → обновить lessonsAttended
  - Сдача теста → обновить quizzesPassed
  - Сдача ДЗ → обновить homeworkSubmitted
- Использовать очередь задач для async обработки

**Проверка достижений:**
- После обновления прогресса проверять условия достижений
- Если условие выполнено → создать UserAchievement
- Отправить уведомление студенту о новом достижении

**API:**
- `GET /api/student/progress` - прогресс по всем потокам
- `GET /api/student/progress/[streamId]` - детальный прогресс по потоку
- `GET /api/student/achievements` - список достижений
- `GET /api/achievements` - все доступные достижения (для preview)

---

### Приоритет 2.3: Мобильная оптимизация

**Цель:** Удобное использование с телефона, PWA для установки на домашний экран.

#### 2.3.1 Адаптивная верстка

**Проверить и исправить:**
- Все страницы должны корректно отображаться на экранах 320px-768px
- Навигация: hamburger menu на мобильных
- Таблицы: горизонтальный скролл или карточки вместо таблиц
- Формы: большие touch-friendly кнопки (минимум 44x44px)
- Модальные окна: fullscreen на мобильных
- Jitsi: адаптивный размер, кнопки управления доступны

**Тестирование:**
- Chrome DevTools (responsive mode)
- Реальные устройства: iOS Safari, Android Chrome
- Проверить landscape и portrait ориентации

#### 2.3.2 PWA (Progressive Web App)

**Manifest файл (`public/manifest.json`):**

```json
{
  "name": "Fatiha.ru - Исламское образование",
  "short_name": "Fatiha",
  "description": "Онлайн школа исламского образования",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#10b981",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker:**
- Кэширование статических ресурсов (JS, CSS, шрифты)
- Offline fallback страница
- Стратегия: Network First для API, Cache First для статики

**Установка:**
- Показывать prompt "Установить приложение" при повторном визите
- Кнопка "Добавить на главный экран" в настройках

#### 2.3.3 Оптимизация производительности

**Lighthouse цели:**
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >80

**Оптимизации:**
- Использовать Next.js Image component для всех изображений
- Lazy loading для тяжелых компонентов (Jitsi, видеоплеер)
- Code splitting: динамические импорты для модальных окон
- Минимизация bundle size: анализ через `@next/bundle-analyzer`
- Prefetch критических ресурсов

**Мобильный интернет:**
- Показывать индикатор качества соединения
- Предлагать audio-only режим для Jitsi при слабом интернете
- Сжатие изображений (WebP формат)
- Адаптивное качество видео (если реализована транскодировка)

---

## ЭТАП 3: Монетизация и масштабирование (4-6 недель)

**Цель:** Платформа может зарабатывать и выдерживать рост пользователей.

### Приоритет 3.1: Система оплаты

**Цель:** Монетизация через платные курсы и подписки.

#### 3.1.1 Платежный провайдер

**Для российской аудитории:**
- **ЮКасса** (Яндекс) - основной вариант
- **Тинькофф Эквайринг** - альтернатива
- **Сбербанк Эквайринг** - для крупных объемов

**Интеграция:**
- Установить SDK провайдера
- Создать модуль `src/lib/payment.ts` с функциями:
  - `createPayment(amount, description, metadata)`
  - `checkPaymentStatus(paymentId)`
  - `refundPayment(paymentId, amount?)`

#### 3.1.2 Модели данных

```prisma
enum PricingModel {
  FREE
  ONE_TIME      // разовая оплата
  SUBSCRIPTION  // подписка
}

enum SubscriptionPeriod {
  MONTHLY
  QUARTERLY
  YEARLY
}

model Course {
  // существующие поля...
  pricingModel    PricingModel @default(FREE)
  price           Decimal?     @db.Decimal(10, 2)  // в рублях
  subscriptionPeriod SubscriptionPeriod?

  trialDays       Int?         // дней бесплатного пробного периода
}

model Payment {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  courseId        String?
  course          Course?  @relation(fields: [courseId], references: [id])

  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("RUB")

  status          PaymentStatus @default(PENDING)

  providerPaymentId String?  @unique  // ID платежа в ЮКассе
  providerData    Json?    // дополнительные данные от провайдера

  paidAt          DateTime?
  refundedAt      DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

model Subscription {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])

  courseId        String
  course          Course   @relation(fields: [courseId], references: [id])

  status          SubscriptionStatus @default(ACTIVE)

  startDate       DateTime
  endDate         DateTime

  autoRenew       Boolean  @default(true)

  cancelledAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId, status])
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
}
```

#### 3.1.3 Бизнес-логика

**Покупка курса (ONE_TIME):**
1. Студент нажимает "Купить курс"
2. Создается Payment с status=PENDING
3. Редирект на страницу оплаты провайдера
4. Webhook от провайдера → обновление Payment.status
5. Если SUCCEEDED → создать Enrollment для всех потоков курса
6. Отправить email с подтверждением

**Подписка (SUBSCRIPTION):**
1. Студент выбирает период (месяц/квартал/год)
2. Создается Payment + Subscription
3. Оплата через провайдера
4. Если успешно → Subscription.status = ACTIVE
5. За 3 дня до окончания → уведомление о продлении
6. Автоматическое продление (если autoRenew=true)
7. Если оплата не прошла → Subscription.status = EXPIRED, блокировка доступа

**Пробный период:**
- Если Course.trialDays > 0 → студент получает доступ сразу
- Создается Subscription с endDate = now + trialDays
- За 1 день до окончания → уведомление о необходимости оплаты
- Если не оплатил → доступ блокируется

**Возврат средств:**
- Учитель или админ может инициировать возврат
- Частичный или полный возврат
- При возврате → Enrollment.status = KICKED, доступ блокируется

#### 3.1.4 API

- `GET /api/courses/[courseId]/pricing` - информация о цене
- `POST /api/payments/create` - создать платеж
- `GET /api/payments` - история платежей пользователя
- `GET /api/payments/[paymentId]` - статус платежа
- `POST /api/webhooks/payment` - webhook от провайдера
- `GET /api/subscriptions` - мои подписки
- `POST /api/subscriptions/[subscriptionId]/cancel` - отменить подписку
- `POST /api/admin/payments/[paymentId]/refund` - возврат (админ)

#### 3.1.5 UI

**Страница курса (для незаписанных студентов):**
- Описание курса
- Цена и условия
- Кнопка "Купить" или "Подписаться"
- Информация о пробном периоде (если есть)

**Личный кабинет → Платежи:**
- История всех платежей
- Статус, дата, сумма
- Скачать чек (если провайдер предоставляет)

**Личный кабинет → Подписки:**
- Активные подписки
- Дата следующего списания
- Кнопка "Отменить автопродление"

---

### Приоритет 3.2: Сертификаты

**Цель:** Студенты получают сертификат о прохождении курса.

#### 3.2.1 Условия выдачи

**Критерии завершения курса:**
- Посещено минимум X% уроков (настраивается в Course.completionRequirements)
- Сданы все обязательные тесты
- Выполнены все обязательные ДЗ
- Средний балл выше порога (если применимо)

**Модели данных:**

```prisma
model Course {
  // существующие поля...
  certificateEnabled Boolean @default(false)
  completionRequirements Json?  // { "minAttendance": 80, "minQuizScore": 70, ... }
}

model Certificate {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])

  streamId    String?
  stream      Stream?  @relation(fields: [streamId], references: [id])

  certificateNumber String @unique  // уникальный номер для верификации

  issuedAt    DateTime @default(now())

  pdfUrl      String?  // URL сгенерированного PDF

  metadata    Json?    // дополнительные данные (баллы, оценки)

  @@unique([userId, courseId])
}
```

#### 3.2.2 Генерация PDF

**Библиотека:**
- Использовать `pdfkit` или `puppeteer` для генерации PDF
- Создать шаблон сертификата (HTML/CSS или прямо в PDFKit)

**Содержание сертификата:**
- Логотип Fatiha.ru
- "Сертификат о прохождении курса"
- Имя студента
- Название курса
- Дата выдачи
- Уникальный номер сертификата
- QR-код для верификации (ссылка на `/verify/[certificateNumber]`)
- Подпись учителя (опционально - изображение подписи)

**Процесс:**
1. Студент завершает курс (выполнены все требования)
2. Автоматически создается Certificate
3. Фоновая задача генерирует PDF
4. PDF загружается в S3
5. Уведомление студенту: "Ваш сертификат готов!"

#### 3.2.3 Верификация

**Публичная страница `/verify/[certificateNumber]`:**
- Проверка подлинности сертификата
- Показать: имя студента, курс, дата выдачи
- Статус: "Действителен" или "Не найден"

**API:**
- `GET /api/certificates` - мои сертификаты
- `GET /api/certificates/[certificateId]/download` - скачать PDF
- `GET /api/verify/[certificateNumber]` - публичная верификация

---

### Приоритет 3.3: Масштабирование инфраструктуры

**Цель:** Платформа выдерживает сотни одновременных пользователей.

#### 3.3.1 Redis для кэширования

**Установка:**
- Добавить Redis в docker-compose.yml
- Установить `ioredis` клиент

**Что кэшировать:**
- Сессии пользователей (вместо JWT в cookie - опционально)
- Списки курсов/потоков (TTL 5 минут)
- Токены приглашений (InviteToken)
- Счетчики (количество непрочитанных уведомлений, сообщений)
- Rate limiting данные (уже реализовано in-memory, перенести в Redis)

**Модуль `src/lib/cache.ts`:**
```typescript
// Пример API
export async function getCached<T>(key: string): Promise<T | null>
export async function setCached<T>(key: string, value: T, ttl?: number): Promise<void>
export async function deleteCached(key: string): Promise<void>
export async function invalidatePattern(pattern: string): Promise<void>
```

#### 3.3.2 Очереди задач (BullMQ)

**Установка:**
- Установить `bullmq`
- Использует Redis как backend

**Типы задач:**
- Email отправка (не блокировать API запрос)
- Обработка видео записей (транскодирование)
- Генерация сертификатов (PDF)
- Обновление прогресса студентов
- Проверка и продление подписок

**Модуль `src/lib/queue.ts`:**
```typescript
// Пример
export const emailQueue = new Queue('email')
export const videoQueue = new Queue('video')
export const certificateQueue = new Queue('certificate')

// Worker процесс (отдельный от Next.js)
// src/workers/email-worker.ts
```

#### 3.3.3 Database Connection Pooling

**PgBouncer:**
- Установить PgBouncer перед PostgreSQL
- Настроить pool mode: transaction или session
- Ограничить количество соединений

**Prisma настройки:**
```env
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/fatiha_db"
DIRECT_URL="postgresql://user:pass@postgres:5432/fatiha_db"
```

#### 3.3.4 Собственный Jitsi сервер

**Проблема:** meet.jit.si не подходит для production (нет гарантий, ограничения).

**Решение:**
- Развернуть Jitsi Meet на собственном сервере
- Минимальные требования: 4 CPU, 8GB RAM, 100 Mbps
- Настроить JWT аутентификацию (уже реализовано в коде)
- Настроить TURN сервер для NAT traversal

**Масштабирование:**
- Для >200 участников: Jitsi Octo (каскадирование мостов)
- Мониторинг нагрузки JVB через Prometheus

---

## Критерии завершения Этапа 2

- ✅ Jitsi уроки записываются автоматически
- ✅ Записи доступны студентам в архиве
- ✅ Студенты видят свой прогресс (% прохождения, статистика)
- ✅ Работает система достижений (минимум 5 достижений)
- ✅ Все страницы адаптивны для мобильных
- ✅ PWA настроено (можно установить на домашний экран)
- ✅ Lighthouse Performance >85

## Критерии завершения Этапа 3

- ✅ Работает оплата через ЮКассу (тестовый режим)
- ✅ Можно купить курс (разовая оплата)
- ✅ Работают подписки с автопродлением
- ✅ Сертификаты генерируются автоматически при завершении курса
- ✅ Публичная верификация сертификатов работает
- ✅ Redis настроен и используется для кэширования
- ✅ BullMQ обрабатывает фоновые задачи
- ✅ PgBouncer настроен
- ✅ Собственный Jitsi сервер развернут (опционально, можно отложить)

---

## ⚠️ ВАЖНО ДЛЯ АГЕНТОВ

**Работайте последовательно:**
1. Завершите Этап 2 полностью
2. Затем переходите к Этапу 3
3. Не смешивайте задачи из разных этапов

**После завершения Этапов 2-3, читайте следующий файл:**
👉 **ROADMAP_PART3.md** - Этапы 4-5 (Исламская специфика, AI, автоматизация)
