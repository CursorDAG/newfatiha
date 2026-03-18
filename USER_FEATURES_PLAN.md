# План реализации пользовательских функций

## 🎯 Главная проблема

**Без коммуникации внутри платформы студенты уходят в WhatsApp и Telegram, и платформа становится просто хранилищем контента, а не живым сообществом.**

---

## 🔥 Критический приоритет (1-2 недели)

### 1. Система уведомлений ⚡ САМОЕ ВАЖНОЕ

**Проблема:** Студенты не знают о новых уроках, проверенных работах, сообщениях от учителя.

**Решение:**

#### Фаза 1: In-app уведомления (3-4 дня)
- [ ] Модель `Notification` в Prisma:
  ```prisma
  model Notification {
    id          String   @id @default(uuid())
    userId      String
    user        User     @relation(fields: [userId], references: [id])
    type        NotificationType
    title       String
    message     String
    link        String?
    read        Boolean  @default(false)
    createdAt   DateTime @default(now())
  }

  enum NotificationType {
    NEW_LESSON
    HOMEWORK_ASSIGNED
    HOMEWORK_CHECKED
    QUIZ_CHECKED
    MESSAGE
    ANNOUNCEMENT
  }
  ```

- [ ] API endpoints:
  - `GET /api/notifications` - список уведомлений
  - `POST /api/notifications/[id]/read` - пометить прочитанным
  - `POST /api/notifications/read-all` - пометить все прочитанными

- [ ] UI компонент `NotificationBell`:
  - Иконка колокольчика в Navbar с счетчиком непрочитанных
  - Dropdown с последними 10 уведомлениями
  - Кнопка "Показать все" → страница `/notifications`

- [ ] Автоматическая генерация уведомлений:
  - При создании урока → уведомление всем студентам потока
  - При создании ДЗ → уведомление всем студентам
  - При проверке работы → уведомление студенту
  - При новом сообщении → уведомление получателю

#### Фаза 2: Email уведомления (2-3 дня)
- [ ] Интеграция с email сервисом (Resend, SendGrid, или Nodemailer)
- [ ] Настройки уведомлений в профиле:
  - Включить/выключить email уведомления
  - Выбрать типы уведомлений для email
  - Дайджест (сразу / раз в день / раз в неделю)

#### Фаза 3: Push уведомления (опционально, 3-4 дня)
- [ ] Service Worker для PWA
- [ ] Web Push API
- [ ] Запрос разрешения на уведомления

**Приоритет:** 🔴 Критический
**Время:** 5-7 дней
**Зависимости:** Нет

---

### 2. Внутренний чат/сообщения ⚡ САМОЕ ВАЖНОЕ

**Проблема:** Нет коммуникации внутри платформы, все уходят в мессенджеры.

**Решение:**

#### Фаза 1: Личные сообщения (4-5 дней)
- [ ] Модели в Prisma:
  ```prisma
  model Conversation {
    id            String    @id @default(uuid())
    participants  User[]    @relation("ConversationParticipants")
    messages      Message[]
    lastMessageAt DateTime  @default(now())
    createdAt     DateTime  @default(now())
  }

  model Message {
    id             String       @id @default(uuid())
    conversationId String
    conversation   Conversation @relation(fields: [conversationId], references: [id])
    senderId       String
    sender         User         @relation(fields: [senderId], references: [id])
    content        String       @db.Text
    read           Boolean      @default(false)
    createdAt      DateTime     @default(now())
  }
  ```

- [ ] API endpoints:
  - `GET /api/messages/conversations` - список диалогов
  - `GET /api/messages/conversations/[id]` - сообщения в диалоге
  - `POST /api/messages/conversations/[id]` - отправить сообщение
  - `POST /api/messages/conversations/start` - начать диалог с пользователем

- [ ] UI компонент `MessagesPage`:
  - Список диалогов слева (как в Telegram)
  - Окно чата справа
  - Поиск по пользователям для начала диалога
  - Индикатор непрочитанных сообщений

- [ ] Real-time обновления:
  - Polling каждые 5 секунд (простое решение)
  - Или WebSocket/Server-Sent Events (сложнее, но лучше)

#### Фаза 2: Групповые чаты потоков (3-4 дня)
- [ ] Автоматический групповой чат для каждого потока
- [ ] Учитель + все студенты потока
- [ ] Объявления от учителя (закрепленные сообщения)
- [ ] Возможность отключить чат для студентов (только учитель пишет)

#### Фаза 3: Дополнительные функции (опционально)
- [ ] Прикрепление файлов (изображения, документы)
- [ ] Голосовые сообщения
- [ ] Реакции на сообщения (эмодзи)
- [ ] Упоминания @username

**Приоритет:** 🔴 Критический
**Время:** 7-9 дней
**Зависимости:** Система уведомлений (для уведомлений о новых сообщениях)

---

## 🟠 Высокий приоритет (2-3 недели)

### 3. Многоязычность (i18n) с арабским RTL

**Проблема:** Интерфейс только на русском, для исламского образования критично важен арабский.

**Решение:**

#### Фаза 1: Инфраструктура i18n (2-3 дня)
- [ ] Установить `next-intl`
- [ ] Настроить локали: `ru`, `ar`, `en`
- [ ] Создать структуру переводов:
  ```
  messages/
    ru.json
    ar.json
    en.json
  ```

- [ ] Middleware для определения языка:
  - Из URL (`/ar/teacher`, `/ru/student`)
  - Из cookies
  - Из заголовка Accept-Language

#### Фаза 2: Извлечение строк (5-7 дней)
- [ ] Извлечь все хардкоженные строки в translation файлы
- [ ] Приоритет:
  1. Navbar, auth страницы
  2. Student Dashboard
  3. Teacher Dashboard (основные вкладки)
  4. Модальные окна и формы

#### Фаза 3: RTL поддержка для арабского (2-3 дня)
- [ ] Настроить Tailwind для RTL:
  ```js
  // tailwind.config.js
  plugins: [
    require('tailwindcss-rtl'),
  ]
  ```

- [ ] Использовать логические свойства:
  - `ms-4` вместо `ml-4` (margin-inline-start)
  - `pe-4` вместо `pr-4` (padding-inline-end)

- [ ] Тестировать все компоненты в RTL режиме

#### Фаза 4: Language Switcher (1 день)
- [ ] Dropdown в Navbar для выбора языка
- [ ] Сохранение выбора в cookies
- [ ] Редирект на нужную локаль

**Приоритет:** 🟠 Высокий
**Время:** 10-13 дней
**Зависимости:** Нет

---

### 4. Детский режим / упрощенный интерфейс

**Проблема:** Исламское образование часто детское, текущий интерфейс может быть сложным для детей.

**Решение:**

#### Фаза 1: Анализ и дизайн (1-2 дня)
- [ ] Определить возрастные группы:
  - 6-10 лет (упрощенный интерфейс, крупные кнопки, иконки)
  - 11-14 лет (стандартный интерфейс с упрощениями)
  - 15+ лет (полный интерфейс)

- [ ] Создать макеты детского интерфейса

#### Фаза 2: Детский режим для студентов (4-5 дней)
- [ ] Добавить поле `ageGroup` в модель User
- [ ] Настройка возраста при регистрации/в профиле
- [ ] Условный рендеринг компонентов:
  ```tsx
  {user.ageGroup === 'CHILD' ? (
    <SimpleStudentDashboard />
  ) : (
    <StudentDashboard />
  )}
  ```

- [ ] Упрощенный Student Dashboard:
  - Крупные карточки уроков с иконками
  - Меньше текста, больше визуала
  - Игровые элементы (звездочки за выполненные уроки)
  - Простая навигация (без сложных меню)

#### Фаза 3: Геймификация (опционально, 3-4 дня)
- [ ] Система достижений (badges)
- [ ] Прогресс-бар по урокам
- [ ] Награды за выполнение заданий
- [ ] Таблица лидеров (опционально)

**Приоритет:** 🟠 Высокий
**Время:** 5-7 дней (без геймификации)
**Зависимости:** Нет

---

## 🟡 Средний приоритет (3-4 недели)

### 5. Календарь и расписание для студентов

**Проблема:** Студенты не видят расписание уроков, не знают когда следующий урок.

**Решение:**
- [ ] Страница `/student/schedule` с календарем
- [ ] Интеграция с `StreamScheduleSlot`
- [ ] Показывать ближайшие уроки на главной
- [ ] Напоминания за 15 минут до урока (через уведомления)
- [ ] Экспорт в Google Calendar / iCal

**Приоритет:** 🟡 Средний
**Время:** 3-4 дня

---

### 6. Родительский контроль

**Проблема:** Родители хотят видеть прогресс детей.

**Решение:**
- [ ] Роль `PARENT` в системе
- [ ] Связь Parent → Student (один родитель может видеть нескольких детей)
- [ ] Родительский dashboard:
  - Прогресс по урокам
  - Оценки за тесты и ДЗ
  - Посещаемость
  - Сообщения от учителя
- [ ] Уведомления родителям о важных событиях

**Приоритет:** 🟡 Средний
**Время:** 5-7 дней

---

### 7. Мобильное приложение / PWA

**Проблема:** Многие студенты учатся с телефонов.

**Решение:**
- [ ] Улучшить responsive дизайн
- [ ] Настроить PWA:
  - `manifest.json`
  - Service Worker
  - Offline fallback
- [ ] Оптимизировать для мобильных:
  - Touch-friendly кнопки
  - Свайпы для навигации
  - Адаптивные модальные окна

**Приоритет:** 🟡 Средний
**Время:** 4-5 дней

---

## 📊 Рекомендуемая последовательность реализации

### Неделя 1-2: Коммуникация (критично!)
1. **Дни 1-4:** Система уведомлений (in-app)
2. **Дни 5-9:** Личные сообщения
3. **Дни 10-12:** Групповые чаты потоков

### Неделя 3-4: Локализация
4. **Дни 13-15:** Инфраструктура i18n
5. **Дни 16-22:** Извлечение строк и переводы
6. **Дни 23-25:** RTL поддержка для арабского

### Неделя 5-6: Детский режим и дополнительные функции
7. **Дни 26-32:** Детский режим для студентов
8. **Дни 33-36:** Календарь и расписание
9. **Дни 37-40:** Email уведомления

---

## 🎯 Метрики успеха

После реализации плана:

- ✅ **Engagement:** Студенты проводят >30 минут в день на платформе
- ✅ **Retention:** >80% студентов возвращаются на следующий день
- ✅ **Communication:** >50% коммуникации происходит внутри платформы (не в WhatsApp)
- ✅ **Notifications:** >70% уведомлений открываются в течение 1 часа
- ✅ **Multilingual:** >30% пользователей используют арабский интерфейс
- ✅ **Mobile:** >60% трафика с мобильных устройств

---

## 💡 Технические детали

### Архитектура уведомлений

```typescript
// Сервис для создания уведомлений
class NotificationService {
  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    // Создать запись в БД
    const notification = await prisma.notification.create({...});

    // Отправить email (если включено в настройках)
    if (user.emailNotifications) {
      await emailService.send({...});
    }

    // Отправить push (если есть подписка)
    if (user.pushSubscription) {
      await pushService.send({...});
    }

    return notification;
  }

  // Хелперы для разных типов уведомлений
  async notifyNewLesson(streamId: string, lessonId: string) {...}
  async notifyHomeworkAssigned(streamId: string, assignmentId: string) {...}
  async notifyHomeworkChecked(submissionId: string) {...}
  async notifyQuizChecked(submissionId: string) {...}
  async notifyNewMessage(conversationId: string, messageId: string) {...}
}
```

### Архитектура чата

```typescript
// Real-time через polling (простое решение)
// В будущем можно заменить на WebSocket

// Клиент
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/messages/conversations');
    const conversations = await response.json();
    setConversations(conversations);
  }, 5000); // Каждые 5 секунд

  return () => clearInterval(interval);
}, []);

// Или через Server-Sent Events (лучше)
useEffect(() => {
  const eventSource = new EventSource('/api/messages/stream');

  eventSource.onmessage = (event) => {
    const message = JSON.parse(event.data);
    addMessage(message);
  };

  return () => eventSource.close();
}, []);
```

### i18n структура

```typescript
// messages/ru.json
{
  "nav": {
    "home": "Главная",
    "courses": "Курсы",
    "messages": "Сообщения",
    "notifications": "Уведомления"
  },
  "student": {
    "dashboard": {
      "title": "Мои уроки",
      "noLessons": "У вас пока нет уроков"
    }
  }
}

// messages/ar.json
{
  "nav": {
    "home": "الرئيسية",
    "courses": "الدورات",
    "messages": "الرسائل",
    "notifications": "الإشعارات"
  },
  "student": {
    "dashboard": {
      "title": "دروسي",
      "noLessons": "ليس لديك دروس حتى الآن"
    }
  }
}
```

---

## 🚀 Начинаем с самого важного

**Следующий шаг:** Реализация системы уведомлений (Фаза 1)

Это даст немедленную пользу:
- Студенты будут знать о новых уроках
- Учителя будут видеть, когда студенты сдают работы
- Платформа станет более "живой"

После уведомлений сразу переходим к чату - это создаст эффект "живого сообщества".
