# Инструкция для агента: email-specialist

**Роль:** Специалист по email инфраструктуре
**Этап:** 1 - Административная панель и коммуникация
**Зависит от:** Ничего (может начать сразу после db-architect)
**Срок:** 3-5 дней

---

## Твоя задача

Настроить отправку email уведомлений для всех ключевых событий платформы.

---

## Входные данные

**Обязательно прочитай:**
1. `ROADMAP_PART1.md` - секция 1.2.1
2. `src/lib/notification-service.ts` - существующий сервис уведомлений
3. `src/app/api/teacher/lessons/route.ts` - пример интеграции NotificationService

---

## Задачи

### Часть 1: Email инфраструктура

#### 1. Установить зависимости

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

#### 2. Создать модуль email

**Файл:** `src/lib/email.ts`

**Функции:**

```typescript
// Базовая отправка
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void>

// Отправка по шаблону
export async function sendTemplateEmail(params: {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
}): Promise<void>

// Enum шаблонов
export enum EmailTemplate {
  LESSON_STARTING = 'lesson-starting',
  NEW_LESSON = 'new-lesson',
  HOMEWORK_CHECKED = 'homework-checked',
  QUIZ_CHECKED = 'quiz-checked',
  HOMEWORK_DEADLINE = 'homework-deadline',
  NEW_MESSAGE = 'new-message',
  HOMEWORK_SUBMITTED = 'homework-submitted',
  QUIZ_SUBMITTED = 'quiz-submitted',
  STUDENT_JOINED = 'student-joined',
}
```

**Конфигурация:**
- Использовать nodemailer с SMTP
- Для разработки: Ethereal Email (автоматические тестовые аккаунты)
- Для production: настроить через env переменные

**Env переменные (добавить в .env.example):**
```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-email@ethereal.email
SMTP_PASS=your-password
SMTP_FROM=noreply@fatiha.ru
SMTP_FROM_NAME=Fatiha.ru
```

#### 3. Создать шаблоны

**Папка:** `src/lib/email-templates/`

**Файлы (HTML + функции генерации):**

**lesson-starting.html:**
- Тема: "Урок начнется через 15 минут"
- Содержание: название урока, поток, ссылка на урок
- Кнопка: "Присоединиться к уроку"

**new-lesson.html:**
- Тема: "Новый урок опубликован"
- Содержание: название урока, описание, дата
- Кнопка: "Перейти к уроку"

**homework-checked.html:**
- Тема: "Домашнее задание проверено"
- Содержание: название задания, статус (принято/доработка/отклонено), комментарий учителя
- Кнопка: "Посмотреть результат"

**quiz-checked.html:**
- Тема: "Тест проверен"
- Содержание: название теста, статус (пройден/не пройден), балл
- Кнопка: "Посмотреть результат"

**homework-deadline.html:**
- Тема: "Приближается дедлайн домашнего задания"
- Содержание: название задания, осталось времени
- Кнопка: "Сдать задание"

**new-message.html:**
- Тема: "Новое сообщение от [имя]"
- Содержание: превью сообщения (первые 100 символов)
- Кнопка: "Прочитать сообщение"

**homework-submitted.html (для учителя):**
- Тема: "Студент сдал домашнее задание"
- Содержание: имя студента, название задания
- Кнопка: "Проверить работу"

**quiz-submitted.html (для учителя):**
- Тема: "Студент сдал тест"
- Содержание: имя студента, название теста
- Кнопка: "Проверить тест"

**student-joined.html (для учителя):**
- Тема: "Новый студент присоединился к потоку"
- Содержание: имя студента, поток
- Кнопка: "Посмотреть профиль"

**Дизайн шаблонов:**
- Использовать inline CSS (для совместимости с email клиентами)
- Цветовая схема: emerald (#10b981) для кнопок
- Адаптивный дизайн (media queries)
- Логотип Fatiha.ru в header
- Футер с ссылкой "Отписаться от уведомлений" (опционально)

---

### Часть 2: Интеграция с NotificationService

**Расширить существующий NotificationService:**

Для каждого метода добавить отправку email:

```typescript
// Пример для notifyNewLesson
static async notifyNewLesson(streamId: string, lessonId: string) {
  // существующий код создания in-app уведомлений...

  // ДОБАВИТЬ: отправка email
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    const userIds = stream.enrollments.map(e => e.userId);

    for (const userId of userIds) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        await sendTemplateEmail({
          to: user.email,
          template: EmailTemplate.NEW_LESSON,
          data: {
            userName: user.name,
            lessonTitle: lesson.title,
            streamName: stream.name,
            lessonUrl: `${process.env.NEXTAUTH_URL}/lesson/${lessonId}`,
          },
        }).catch(err => {
          logger.error('Failed to send email', { error: err, userId });
        });
      }
    }
  } catch (error) {
    logger.error('Failed to send email notifications', { error });
    // НЕ бросать ошибку - email не должен ломать основной функционал
  }
}
```

**Применить для всех методов:**
- notifyNewLesson
- notifyHomeworkAssigned
- notifyHomeworkChecked
- notifyQuizChecked
- notifyAnnouncement

**Создать новые методы:**
- notifyLessonStarting (за 15 минут до урока)
- notifyHomeworkDeadline (за 24 часа до дедлайна)
- notifyHomeworkSubmitted (для учителя)
- notifyQuizSubmitted (для учителя)
- notifyStudentJoined (для учителя)

---

### Часть 3: Scheduled задачи (опционально)

**Для уведомлений "урок начнется через 15 минут":**

Создать cron job или scheduled task:
- Каждые 5 минут проверять расписание
- Найти уроки которые начнутся через 15 минут
- Отправить email всем студентам потока

**Для уведомлений "приближается дедлайн":**
- Каждый час проверять HomeworkAssignment
- Найти задания с дедлайном через 24 часа
- Найти студентов которые не сдали
- Отправить email напоминание

**Реализация:**
- Использовать node-cron или встроенный scheduler
- Или создать API endpoint который будет вызываться внешним cron

---

### Часть 4: Тесты

**Unit тесты для email модуля:**
- `src/lib/__tests__/email.test.ts`
- Тестировать с mock SMTP (nodemailer-mock)
- Проверять что email формируется корректно
- Проверять обработку ошибок

**Integration тесты:**
- Проверить что email отправляются при реальных событиях
- Использовать Ethereal для проверки содержимого

---

## Критерии приемки

Твоя работа завершена когда:

- ✅ Nodemailer настроен и работает
- ✅ Все 9 email шаблонов созданы
- ✅ Шаблоны выглядят профессионально (проверено в Ethereal)
- ✅ NotificationService расширен для отправки email
- ✅ Email отправляются на все события из списка ROADMAP_PART1.md 1.2.1
- ✅ Ошибки email не ломают основной функционал (try-catch)
- ✅ Env переменные добавлены в .env.example
- ✅ Тесты написаны и проходят
- ✅ Нет TypeScript ошибок

---

## Ограничения

**НЕ делай:**
- ❌ НЕ используй платные сервисы без согласования (SendGrid, AWS SES)
- ❌ НЕ изменяй существующую логику NotificationService (только расширяй)
- ❌ НЕ создавай новые модели БД
- ❌ НЕ блокируй основной функционал при ошибках email

**Делай:**
- ✅ Используй Ethereal для dev/test режима
- ✅ Все email операции в try-catch
- ✅ Логируй ошибки отправки через logger
- ✅ Inline CSS в шаблонах (для совместимости)

---

## Коммуникация

**После завершения:**
- TaskUpdate(status: "completed")
- SendMessage(to: "team-lead", message: "Email инфраструктура готова, все шаблоны работают")

---

## Справочные материалы

- `ROADMAP_PART1.md` - список всех типов уведомлений
- `src/lib/notification-service.ts` - существующий сервис
- Nodemailer docs: https://nodemailer.com/

---

**Email - критичная часть для удержания пользователей!**
