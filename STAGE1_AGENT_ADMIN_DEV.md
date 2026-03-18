# Инструкция для агента: admin-developer

**Роль:** Разработчик админ панели
**Этап:** 1 - Административная панель и коммуникация
**Зависит от:** db-architect (Фаза 1)
**Срок:** 1-2 недели

---

## Твоя задача

Создать полную админ панель с UI и API для управления платформой.

---

## Входные данные

**Обязательно прочитай:**
1. `ROADMAP_PART1.md` - секции 1.1.1, 1.1.4
2. `src/app/api/teacher/*` - существующие паттерны API
3. `src/components/teacher/TeacherDashboard.tsx` - паттерн для UI с табами
4. `src/lib/api-handler.ts` - withErrorHandling middleware
5. `src/lib/errors.ts` - типизированные ошибки

---

## Задачи

### Часть 1: Backend API (ПРИОРИТЕТ)

Создать все маршруты из списка в ROADMAP_PART1.md секция 1.1.4:

#### Управление пользователями

**GET /api/admin/users**
- Список всех пользователей
- Фильтры: role, isBlocked, search (по email/имени)
- Пагинация: limit, offset
- Сортировка: по дате регистрации, имени
- Возвращать: id, email, name, role, gender, isBlocked, createdAt

**GET /api/admin/users/[userId]**
- Полный профиль пользователя
- Включить: enrollments, courses (если учитель), activity stats
- Проверка: только ADMIN

**PATCH /api/admin/users/[userId]**
- Редактирование: name, email, role
- Валидация через Zod
- НЕ позволять изменять пароль (отдельный endpoint)

**POST /api/admin/users/[userId]/block**
- Установить isBlocked = true
- Логировать действие
- Отправить уведомление пользователю

**POST /api/admin/users/[userId]/unblock**
- Установить isBlocked = false

**DELETE /api/admin/users/[userId]**
- Soft delete: установить deletedAt = now()
- НЕ удалять из БД физически
- Каскадно скрыть все связанные данные

**POST /api/admin/users/[userId]/reset-password**
- Сгенерировать временный пароль (8 символов)
- Хэшировать через bcrypt
- Отправить на email пользователя
- Возвращать: { temporaryPassword: "..." }

#### Dashboard метрики

**GET /api/admin/dashboard**
- Возвращать JSON с метриками:
```typescript
{
  users: {
    total: number,
    byRole: { STUDENT: number, TEACHER: number, ADMIN: number, MODERATOR: number },
    active7days: number,
    active30days: number,
    blocked: number,
  },
  courses: {
    total: number,
    archived: number,
  },
  streams: {
    total: number,
    active: number,
  },
  lessons: {
    total: number,
    byType: { LIVE: number, VIDEO: number, TEXT: number },
  },
  storage: {
    dbSize: string,  // размер БД в MB
    s3Size: string,  // размер S3 в MB (если доступно)
  },
  jitsi: {
    activeSessions: number,  // из ActivitySession где kind=LIVE_ROOM
  }
}
```

#### Управление курсами и потоками

**GET /api/admin/courses**
- Все курсы независимо от учителя
- Фильтры: teacherId, archived
- Включить: teacher info, streams count

**GET /api/admin/streams**
- Все потоки
- Фильтры: courseId, teacherId, genderType
- Включить: course info, teacher info, enrollments count

#### Логи

**GET /api/admin/logs**
- Последние 100 записей из Pino логов
- Фильтр по уровню: error, warn, info
- Возвращать: timestamp, level, message, context

**Реализация:**
- Читать из файла логов (если настроено file transport)
- Или из БД (если логи пишутся в БД)
- Или заглушка: "Логи доступны только в production"

---

### Часть 2: Frontend UI

#### Структура файлов

Создать:
- `src/app/admin/page.tsx` - server component (проверка роли, редирект)
- `src/app/admin/admin-client.tsx` - client component с табами
- `src/components/admin/` - папка для UI компонентов:
  - `AdminDashboard.tsx` - вкладка Dashboard
  - `AdminUsersTab.tsx` - вкладка Users
  - `AdminCoursesTab.tsx` - вкладка Courses
  - `AdminStreamsTab.tsx` - вкладка Streams
  - `AdminLogsTab.tsx` - вкладка Logs
  - `UserEditModal.tsx` - модалка редактирования пользователя
  - `ConfirmBlockModal.tsx` - подтверждение блокировки

#### Паттерн UI

Следуй паттерну `TeacherDashboard.tsx`:
- Один client component с state для activeTab
- Условный рендеринг контента по activeTab
- Модалки управляются через state (showModal)
- Fetch данных в useEffect
- Toast уведомления для успеха/ошибок

#### Табы

**Dashboard:**
- Карточки с метриками (grid layout)
- Графики (опционально, можно использовать recharts)
- Быстрые действия (кнопки к частым задачам)

**Users:**
- Таблица пользователей
- Фильтры: роль, статус блокировки, поиск
- Действия: редактировать, блокировать, удалить, сбросить пароль
- Клик на строку → модалка с деталями

**Courses:**
- Таблица курсов
- Фильтры: учитель, архивные
- Действия: просмотр, архивация
- Статистика: количество потоков, студентов

**Streams:**
- Таблица потоков
- Фильтры: курс, учитель, тип группы
- Действия: просмотр, перенос к другому учителю
- Статистика: количество студентов, активность

**Logs:**
- Список логов с цветовой кодировкой по уровню
- Фильтр по уровню (error, warn, info)
- Автообновление каждые 10 секунд (опционально)

---

### Часть 3: Тесты

Создать тесты для всех API endpoints:

**Структура:**
- `src/app/api/admin/__tests__/users.test.ts`
- `src/app/api/admin/__tests__/dashboard.test.ts`
- и т.д.

**Что тестировать:**
- Проверка роли (не-ADMIN получает 403)
- Валидация входных данных
- Успешные сценарии
- Edge cases (пользователь не найден, уже заблокирован, и т.д.)

**Цель:** Минимум 70% покрытие кода

---

## Критерии приемки

Твоя работа завершена когда:

- ✅ Все API endpoints из списка реализованы
- ✅ Все endpoints используют withErrorHandling
- ✅ Все endpoints проверяют роль ADMIN
- ✅ Валидация через Zod для всех POST/PATCH
- ✅ UI админ панели работает (все табы)
- ✅ Можно заблокировать/разблокировать пользователя
- ✅ Можно сбросить пароль
- ✅ Dashboard показывает корректные метрики
- ✅ Тесты написаны и проходят (>70% покрытие)
- ✅ Нет TypeScript ошибок
- ✅ Следуешь паттернам из CLAUDE.md

---

## Ограничения

**НЕ делай:**
- ❌ НЕ изменяй существующие API teacher или student
- ❌ НЕ создавай новые модели БД (это задача db-architect)
- ❌ НЕ реализуй функционал из других этапов
- ❌ НЕ используй сторонние UI библиотеки (только Tailwind)

**Делай:**
- ✅ Используй существующие паттерны (withErrorHandling, Zod validation)
- ✅ Следуй стилю кода проекта
- ✅ Пиши понятные комментарии на русском
- ✅ Логируй важные действия через logger

---

## Коммуникация

**Перед началом:**
- Проверь что db-architect завершил работу (TaskList)
- Если нет - жди

**Во время работы:**
- Обновляй статус задачи: TaskUpdate(status: "in_progress")
- При блокерах - сообщай Team Lead

**После завершения:**
- TaskUpdate(status: "completed")
- SendMessage(to: "team-lead", message: "Админ панель готова, все API и UI работают, тесты проходят")

---

## Справочные материалы

- `ROADMAP_PART1.md` - полное описание функционала
- `src/app/api/teacher/manage-student/route.ts` - пример сложного API
- `src/components/teacher/TeacherDashboard.tsx` - паттерн UI с табами
- `src/lib/validation.ts` - существующие Zod схемы

---

**Удачи! Админ панель - критически важная часть проекта.**
