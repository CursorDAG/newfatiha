# Инструкция для агента: moderator-developer

**Роль:** Разработчик модераторского кабинета
**Этап:** 1 - Административная панель и коммуникация
**Зависит от:** db-architect (Фаза 1)
**Срок:** 1-2 недели

---

## Твоя задача

Создать модераторский кабинет для техподдержки и модерации контента.

---

## Входные данные

**Обязательно прочитай:**
1. `ROADMAP_PART1.md` - секции 1.1.2, 1.1.4
2. `src/app/api/teacher/*` - существующие паттерны API
3. `src/lib/api-handler.ts` - withErrorHandling middleware
4. `src/lib/errors.ts` - типизированные ошибки

---

## Задачи

### Часть 1: Backend API

#### Модератор API (/api/moderator/*)

**GET /api/moderator/tickets**
- Список всех обращений
- Фильтры: status, priority, assignedToId
- Сортировка: по дате создания (новые первые)
- Пагинация: limit, offset
- Включить: user info, replies count
- Проверка роли: MODERATOR или ADMIN

**GET /api/moderator/tickets/[ticketId]**
- Детали обращения
- Включить: все replies с user info
- Проверка роли

**POST /api/moderator/tickets/[ticketId]/reply**
- Создать SupportTicketReply
- Поля: message (обязательно)
- Установить isStaff = true
- Обновить ticket.updatedAt
- Отправить уведомление пользователю (через NotificationService)
- Валидация через Zod

**PATCH /api/moderator/tickets/[ticketId]**
- Изменить status или priority
- Валидация: только разрешенные переходы статусов
- Если status = RESOLVED → установить resolvedAt
- Логировать изменение

**POST /api/moderator/tickets/[ticketId]/assign**
- Назначить тикет на себя
- Установить assignedToId = session.user.id
- Изменить status на IN_PROGRESS (если был OPEN)
- Уведомить пользователя что его обращение взято в работу

**GET /api/moderator/reports**
- Список жалоб на контент
- Фильтры: status, contentType
- Включить: reporter info, content preview
- Проверка роли

**POST /api/moderator/reports/[reportId]/review**
- Рассмотреть жалобу
- Поля: action (APPROVE | REJECT), comment
- Если APPROVE → удалить контент (установить isDeleted или deletedAt)
- Установить reviewedById, reviewedAt, status
- Уведомить reporter о результате

#### Пользовательский API (/api/support/*)

**POST /api/support/tickets**
- Создать обращение
- Поля: subject, description, priority (опционально)
- Валидация через Zod
- Отправить уведомление модераторам
- Возвращать созданный ticket

**GET /api/support/tickets**
- Мои обращения (userId = session.user.id)
- Сортировка: по дате создания
- Включить: replies count, status

**GET /api/support/tickets/[ticketId]**
- Детали моего обращения
- Проверка: ticket.userId === session.user.id
- Включить: все replies

**POST /api/support/tickets/[ticketId]/reply**
- Ответить в своем обращении
- Установить isStaff = false
- Уведомить модератора (если назначен)

---

### Часть 2: Frontend UI

#### Структура файлов

Создать:
- `src/app/moderator/page.tsx` - server component
- `src/app/moderator/moderator-client.tsx` - client component с табами
- `src/components/moderator/` - папка для UI:
  - `ModeratorTicketsTab.tsx` - вкладка Tickets
  - `ModeratorReportsTab.tsx` - вкладка Reports
  - `ModeratorStatsTab.tsx` - вкладка Stats
  - `TicketDetailModal.tsx` - модалка с деталями тикета
  - `TicketChatView.tsx` - чат-интерфейс для общения с пользователем
  - `ReportReviewModal.tsx` - модалка рассмотрения жалобы

#### Модераторский кабинет

**Вкладка Tickets:**
- Таблица обращений
- Фильтры: статус, приоритет, назначенные на меня
- Цветовая кодировка приоритетов (URGENT - красный, HIGH - оранжевый)
- Клик на строку → открыть TicketDetailModal
- Кнопка "Взять в работу" для OPEN тикетов

**TicketDetailModal:**
- Информация о пользователе
- История переписки (replies)
- Поле ввода для ответа
- Кнопки: изменить статус, изменить приоритет
- Real-time обновление при новых ответах (polling каждые 10 сек)

**Вкладка Reports:**
- Таблица жалоб
- Фильтры: статус, тип контента
- Превью контента (первые 100 символов)
- Кнопка "Рассмотреть"

**ReportReviewModal:**
- Полный контент (lesson/quiz/homework/message)
- Информация о reporter
- Причина жалобы
- Действия: Одобрить (удалить контент) или Отклонить
- Поле для комментария

**Вкладка Stats:**
- Статистика модератора:
  - Обращений обработано (всего, за неделю, за месяц)
  - Среднее время ответа
  - Жалоб рассмотрено
- Общая статистика:
  - Открытых обращений
  - Необработанных жалоб

#### Пользовательский UI

**Кнопка "Техподдержка":**
- Добавить в Navbar или в футер
- Модалка создания обращения
- Форма: тема, описание, приоритет (опционально)

**Страница "Мои обращения" (`/support`):**
- Список моих тикетов
- Статус, дата создания
- Клик → детали с историей переписки
- Возможность ответить

---

### Часть 3: Тесты

**API тесты:**
- `src/app/api/moderator/__tests__/tickets.test.ts`
- `src/app/api/moderator/__tests__/reports.test.ts`
- `src/app/api/support/__tests__/tickets.test.ts`

**Что тестировать:**
- Проверка ролей (студент не может получить /api/moderator/*)
- Модератор не может редактировать пользователей (в отличие от админа)
- Валидация входных данных
- Назначение тикетов
- Изменение статусов
- Уведомления отправляются

**Цель:** >70% покрытие

---

## Критерии приемки

Твоя работа завершена когда:

- ✅ Все API endpoints реализованы
- ✅ Пользователь может создать обращение
- ✅ Модератор видит все обращения
- ✅ Модератор может ответить и изменить статус
- ✅ Модератор может назначить тикет на себя
- ✅ Модератор может рассмотреть жалобы на контент
- ✅ UI модераторского кабинета работает (все табы)
- ✅ Уведомления отправляются при создании тикета и ответах
- ✅ Тесты написаны и проходят (>70%)
- ✅ Нет TypeScript ошибок

---

## Ограничения

**НЕ делай:**
- ❌ НЕ давай модератору права админа (редактирование пользователей, удаление)
- ❌ НЕ создавай новые модели БД
- ❌ НЕ изменяй существующие API других ролей
- ❌ НЕ реализуй функционал из других этапов

**Делай:**
- ✅ Используй withErrorHandling для всех роутов
- ✅ Проверяй роли: `['MODERATOR', 'ADMIN'].includes(session.user.role)`
- ✅ Валидация через Zod
- ✅ Логируй важные действия
- ✅ Отправляй уведомления через NotificationService

---

## Коммуникация

**Перед началом:**
- Проверь что db-architect завершил (TaskList)

**После завершения:**
- TaskUpdate(status: "completed")
- SendMessage(to: "team-lead", message: "Модераторский кабинет готов")

---

## Справочные материалы

- `ROADMAP_PART1.md` - полное описание функционала
- `src/lib/notification-service.ts` - как отправлять уведомления
- `src/components/teacher/TeacherDashboard.tsx` - паттерн UI

---

**Модераторский кабинет - важная часть для поддержки пользователей!**
