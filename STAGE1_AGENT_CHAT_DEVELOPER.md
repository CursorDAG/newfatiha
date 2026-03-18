# Инструкция для агента: chat-developer

**Роль:** Разработчик чата и WebSocket
**Этап:** 1 - Административная панель и коммуникация
**Зависит от:** db-architect (ChatRoom и ChatMessage модели)
**Может работать параллельно с:** Фазой 2 (другие агенты)
**Срок:** 1-2 недели

---

## Твоя задача

Создать полноценную систему чата с WebSocket для групповых и личных сообщений.

---

## Входные данные

**Обязательно прочитай:**
1. `ROADMAP_PART1.md` - секция 1.3 (полное описание чата)
2. `prisma/schema.prisma` - модели ChatRoom и ChatMessage
3. `src/lib/prisma.ts` - singleton Prisma клиент

---

## Задачи

### Часть 1: WebSocket сервер

#### 1. Установить зависимости

```bash
npm install socket.io socket.io-client
npm install --save-dev @types/socket.io
```

#### 2. Создать WebSocket сервер

**Файл:** `src/lib/socket-server.ts`

**Функционал:**
- Инициализация Socket.io сервера
- Интеграция с Next.js (custom server или отдельный процесс)
- Аутентификация через NextAuth session
- Управление комнатами (rooms)
- Обработка всех событий из ROADMAP_PART1.md секция 1.3.3

**События для реализации:**

**Client → Server:**
- `message:send` - отправка сообщения
  - Параметры: { roomId, content }
  - Валидация: пользователь является участником комнаты
  - Сохранить в БД
  - Broadcast всем участникам комнаты

- `message:edit` - редактирование сообщения
  - Параметры: { messageId, content }
  - Проверка: сообщение принадлежит пользователю
  - Проверка: не прошло >15 минут
  - Обновить в БД (isEdited = true, editedAt = now)
  - Broadcast обновление

- `message:delete` - удаление сообщения
  - Параметры: { messageId }
  - Проверка: сообщение принадлежит пользователю ИЛИ пользователь - учитель группового чата
  - Soft delete (isDeleted = true, deletedAt = now)
  - Broadcast удаление

- `typing:start` - начал печатать
  - Параметры: { roomId }
  - Broadcast другим участникам (кроме отправителя)

- `typing:stop` - перестал печатать
  - Параметры: { roomId }
  - Broadcast другим участникам

- `room:join` - присоединиться к комнате
  - Параметры: { roomId }
  - Проверка прав доступа
  - Добавить socket в room

- `room:leave` - покинуть комнату
  - Параметры: { roomId }
  - Удалить socket из room

**Server → Client:**
- `message:receive` - получение нового сообщения
  - Данные: полный объект сообщения с sender info

- `message:edited` - сообщение отредактировано
  - Данные: { messageId, content, editedAt }

- `message:deleted` - сообщение удалено
  - Данные: { messageId }

- `typing:user` - пользователь печатает
  - Данные: { userId, userName }

- `user:online` - пользователь онлайн
  - Данные: { userId }

- `user:offline` - пользователь оффлайн
  - Данные: { userId }

**Аутентификация:**
- При подключении проверять NextAuth session
- Если не авторизован → disconnect
- Сохранять userId в socket.data

**Управление комнатами:**
- При `room:join` проверять права доступа:
  - GROUP чат: пользователь записан в поток (Enrollment)
  - DIRECT чат: пользователь является одним из участников
- Использовать socket.join(roomId) для Socket.io rooms

#### 3. Интеграция с Next.js

**Вариант A: Custom Server (рекомендуется)**

Создать `server.js` в корне проекта:
```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { initSocketServer } = require('./src/lib/socket-server');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);
  initSocketServer(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
```

Обновить `package.json`:
```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

**Вариант B: Отдельный процесс**
- Запустить Socket.io на отдельном порту (например 3001)
- Клиент подключается к ws://localhost:3001
- Проще для разработки, но требует CORS настройки

---

### Часть 2: Backend REST API (fallback)

Создать REST API для случаев когда WebSocket недоступен:

**GET /api/chat/rooms**
- Список чатов пользователя
- Возвращать: GROUP чаты (из enrollments) + DIRECT чаты (где participant)
- Включить: последнее сообщение, количество непрочитанных

**GET /api/chat/rooms/[roomId]**
- Детали чата
- Проверка доступа
- Включить: participants info

**GET /api/chat/rooms/[roomId]/messages**
- История сообщений
- Пагинация: limit (default 50), offset
- Сортировка: по createdAt DESC
- Фильтр: не показывать isDeleted = true

**POST /api/chat/rooms/direct**
- Создать или получить direct чат с пользователем
- Параметры: { recipientId }
- Проверка ограничений (студент не может писать другому студенту)
- Если чат существует → вернуть существующий
- Если нет → создать новый ChatRoom

**POST /api/chat/messages**
- Отправить сообщение (fallback если WebSocket недоступен)
- Параметры: { roomId, content }
- Валидация и сохранение
- Возвращать созданное сообщение

**PATCH /api/chat/messages/[messageId]**
- Редактировать сообщение
- Проверки: владелец, не прошло 15 минут
- Обновить в БД

**DELETE /api/chat/messages/[messageId]**
- Удалить сообщение (soft delete)
- Проверки: владелец ИЛИ учитель группового чата

---

### Часть 3: Frontend UI

#### Структура компонентов

**Папка:** `src/components/chat/`

**Компоненты:**

**ChatProvider.tsx** - Context для Socket.io клиента
```typescript
export const ChatContext = createContext<{
  socket: Socket | null;
  isConnected: boolean;
}>({ socket: null, isConnected: false });

export function ChatProvider({ children }) {
  // Инициализация socket.io клиента
  // Подключение при монтировании
  // Обработка reconnect
}
```

**ChatList.tsx** - Список чатов
- Показывать GROUP чаты (из потоков) и DIRECT чаты
- Последнее сообщение
- Badge с количеством непрочитанных
- Клик → открыть ChatWindow

**ChatWindow.tsx** - Окно чата
- Header: название чата, участники, online статус
- MessageList: список сообщений с автоскроллом вниз
- MessageInput: поле ввода с кнопкой отправки
- TypingIndicator: "Печатает..."
- Обработка WebSocket событий (message:receive, typing:user)

**MessageItem.tsx** - Отдельное сообщение
- Аватар и имя отправителя
- Текст сообщения
- Время отправки
- Статус: отправлено, отредактировано, удалено
- Действия: редактировать (свои), удалить (свои или учитель)

**MessageInput.tsx** - Поле ввода
- Textarea с автоувеличением высоты
- Кнопка отправки
- Отправка typing:start при начале печати
- Отправка typing:stop через 3 секунды после остановки
- Enter для отправки, Shift+Enter для новой строки

**TypingIndicator.tsx** - Индикатор печати
- Показывать "Печатает..." когда получен typing:user
- Скрывать через 3 секунды или при typing:stop

#### Интеграция в приложение

**Для студентов:**
- Добавить иконку чата в Navbar
- Клик → открыть ChatList в sidebar или модалке
- Badge с количеством непрочитанных

**Для учителей:**
- Аналогично студентам
- Дополнительно: быстрый доступ к групповым чатам потоков

**Групповой чат потока:**
- Автоматически создавать ChatRoom при создании Stream
- Ссылка на чат в карточке потока
- Учитель может отключить чат (Stream.chatEnabled = false)

---

### Часть 4: Бизнес-логика и ограничения

**Проверка прав доступа:**

Создать `src/lib/chat-permissions.ts`:

```typescript
export async function canAccessRoom(userId: string, roomId: string): Promise<boolean>
export async function canSendDirectMessage(senderId: string, recipientId: string): Promise<boolean>
export async function canDeleteMessage(userId: string, messageId: string): Promise<boolean>
```

**Правила:**
- Студент НЕ может писать другому студенту напрямую
- Студент может писать учителю только если учится у него
- Мужчина-студент НЕ может писать женщине-учителю напрямую (только через групповой чат)
- Женщина-студент может писать любому учителю
- Учителя могут писать друг другу
- Админ/Модератор могут писать всем

**Автоматическое создание чатов:**
- При создании Stream → создать ChatRoom (type: GROUP, streamId)
- При первом direct сообщении → создать ChatRoom (type: DIRECT)

---

### Часть 5: Тесты

**WebSocket тесты:**
- `src/lib/__tests__/socket-server.test.ts`
- Использовать socket.io-client для тестирования
- Тестировать аутентификацию
- Тестировать отправку/получение сообщений
- Тестировать typing events

**API тесты:**
- `src/app/api/chat/__tests__/rooms.test.ts`
- `src/app/api/chat/__tests__/messages.test.ts`
- Тестировать права доступа
- Тестировать ограничения (студент не может писать студенту)

**Integration тесты:**
- Создать чат, отправить сообщение, проверить что получено
- Проверить что typing indicator работает
- Проверить reconnect после disconnect

---

## Критерии приемки

Твоя работа завершена когда:

- ✅ Socket.io сервер работает и интегрирован с Next.js
- ✅ Аутентификация через NextAuth работает
- ✅ Все WebSocket события реализованы
- ✅ Групповой чат потока работает в реальном времени
- ✅ Личные сообщения учитель↔студент работают
- ✅ Typing indicator работает
- ✅ Сообщения сохраняются в БД
- ✅ Можно редактировать свои сообщения (в течение 15 минут)
- ✅ Можно удалять свои сообщения
- ✅ Учитель может удалять любые сообщения в групповом чате
- ✅ Ограничения доступа работают (студент не может писать студенту)
- ✅ REST API fallback работает
- ✅ UI компоненты чата работают
- ✅ Reconnect работает при потере соединения
- ✅ Тесты написаны и проходят (>70%)
- ✅ Нет TypeScript ошибок

---

## Ограничения

**НЕ делай:**
- ❌ НЕ создавай новые модели БД (используй ChatRoom и ChatMessage)
- ❌ НЕ реализуй voice/video звонки (это не в Этапе 1)
- ❌ НЕ реализуй отправку файлов (это не в Этапе 1)
- ❌ НЕ используй сторонние чат библиотеки (Stream, SendBird)

**Делай:**
- ✅ Используй Socket.io (проверенная библиотека)
- ✅ Обрабатывай reconnect gracefully
- ✅ Логируй все WebSocket события через logger
- ✅ Используй try-catch для всех async операций
- ✅ Валидация всех входных данных

---

## Коммуникация

**Перед началом:**
- Проверь что db-architect создал ChatRoom и ChatMessage модели

**Во время работы:**
- Обновляй TaskUpdate при прогрессе
- При блокерах - сообщай Team Lead

**После завершения:**
- TaskUpdate(status: "completed")
- SendMessage(to: "team-lead", message: "Чат система готова, WebSocket работает, все ограничения реализованы")

---

## Справочные материалы

- `ROADMAP_PART1.md` - полное описание функционала чата
- Socket.io docs: https://socket.io/docs/v4/
- Next.js custom server: https://nextjs.org/docs/advanced-features/custom-server

---

**Чат - самая сложная и важная часть для удержания пользователей на платформе!**
