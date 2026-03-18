# Инструкция для агента: gender-implementer

**Роль:** Разработчик гендерного разделения
**Этап:** 1 - Административная панель и коммуникация
**Зависит от:** db-architect (Gender и StreamGenderType enums)
**Может работать параллельно с:** Фазой 2 (другие агенты)
**Срок:** 3-5 дней

---

## Твоя задача

Реализовать гендерное разделение согласно исламским нормам образования.

---

## Входные данные

**Обязательно прочитай:**
1. `ROADMAP_PART1.md` - секция 1.4 (полное описание правил)
2. `prisma/schema.prisma` - модели User и Stream с новыми полями
3. `src/app/api/teacher/streams/route.ts` - создание потоков
4. `src/app/api/join/[token]/route.ts` - запись студентов

---

## Правила гендерного разделения

**Для учителей:**
- Женщина-учитель может вести любые группы (MALE_ONLY, FEMALE_ONLY, MIXED)
- Мужчина-учитель может вести только MALE_ONLY или MIXED группы
- Мужчина-учитель НЕ может создать FEMALE_ONLY группу

**Для студентов:**
- Студент может записаться только в группу подходящего типа:
  - MALE студент → только MALE_ONLY или MIXED
  - FEMALE студент → только FEMALE_ONLY или MIXED
- Если поток MALE_ONLY → только мужчины
- Если поток FEMALE_ONLY → только женщины
- Если поток MIXED → все

**Для личных сообщений (чата):**
- Мужчина-студент НЕ может писать женщине-учителю напрямую (только через групповой чат)
- Женщина-студент может писать любому учителю
- Учителя могут писать любым студентам (в рамках своих потоков)
- Студенты не могут писать друг другу (независимо от пола)

---

## Задачи

### Часть 1: Бизнес-логика

#### Создать модуль правил

**Файл:** `src/lib/gender-rules.ts`

**Функции:**

```typescript
/**
 * Может ли учитель создать поток данного типа
 */
export function canTeacherCreateStreamType(
  teacherGender: Gender,
  streamGenderType: StreamGenderType
): { allowed: boolean; reason?: string }

/**
 * Может ли студент записаться в поток
 */
export function canStudentJoinStream(
  studentGender: Gender,
  streamGenderType: StreamGenderType
): { allowed: boolean; reason?: string }

/**
 * Может ли отправитель писать получателю напрямую
 */
export function canSendDirectMessage(
  senderGender: Gender,
  senderRole: Role,
  recipientGender: Gender,
  recipientRole: Role
): { allowed: boolean; reason?: string }
```

**Реализация:**
- Следовать правилам из ROADMAP_PART1.md секция 1.4.2
- Возвращать объект с allowed и reason (для UI подсказок)
- Покрыть все edge cases

#### Примеры реализации

```typescript
export function canTeacherCreateStreamType(
  teacherGender: Gender,
  streamGenderType: StreamGenderType
): { allowed: boolean; reason?: string } {
  // Женщина может вести любые группы
  if (teacherGender === 'FEMALE') {
    return { allowed: true };
  }

  // Мужчина не может вести женские группы
  if (teacherGender === 'MALE' && streamGenderType === 'FEMALE_ONLY') {
    return {
      allowed: false,
      reason: 'Мужчина-учитель не может вести женскую группу согласно исламским нормам',
    };
  }

  // Мужчина может вести мужские и смешанные
  return { allowed: true };
}
```

---

### Часть 2: Интеграция в API

#### Обновить создание потока

**Файл:** `src/app/api/teacher/streams/route.ts`

**В POST handler добавить проверку:**

```typescript
// После получения данных из request
const teacher = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { gender: true },
});

const genderCheck = canTeacherCreateStreamType(
  teacher.gender,
  genderType
);

if (!genderCheck.allowed) {
  throw new ValidationError(genderCheck.reason || 'Cannot create this stream type', {
    genderType: genderCheck.reason,
  });
}

// Продолжить создание потока...
```

#### Обновить запись студента

**Файл:** `src/app/api/join/[token]/route.ts`

**В POST handler добавить проверку:**

```typescript
// После получения stream и student
const genderCheck = canStudentJoinStream(
  student.gender,
  stream.genderType
);

if (!genderCheck.allowed) {
  throw new ForbiddenError(genderCheck.reason || 'Cannot join this stream');
}

// Продолжить создание Enrollment...
```

#### Интеграция с чатом

**Координация с chat-developer:**
- Передать функцию canSendDirectMessage для использования в chat API
- Или создать middleware для проверки

**В /api/chat/rooms/direct:**
```typescript
const genderCheck = canSendDirectMessage(
  sender.gender,
  sender.role,
  recipient.gender,
  recipient.role
);

if (!genderCheck.allowed) {
  throw new ForbiddenError(genderCheck.reason || 'Cannot send direct message');
}
```

---

### Часть 3: Frontend UI

#### Форма регистрации

**Файл:** `src/app/auth/register/page.tsx` (если существует) или создать

**Добавить поле "Пол":**
- Radio buttons: Мужской / Женский
- Обязательное поле (required)
- Валидация на клиенте и сервере

**Если регистрация через NextAuth credentials:**
- Обновить форму входа/регистрации
- Добавить gender в создание пользователя

#### Создание потока (учитель)

**Файл:** `src/components/teacher/CreateStreamModal.tsx` или аналогичный

**Добавить выбор типа группы:**
- Radio buttons или Select:
  - "Только мужчины" (MALE_ONLY)
  - "Только женщины" (FEMALE_ONLY)
  - "Смешанная группа" (MIXED)

**Динамическое disabled состояние:**
```typescript
const teacher = // получить из session или API
const isMaleTeacher = teacher.gender === 'MALE';

// Для FEMALE_ONLY опции:
disabled={isMaleTeacher}
title={isMaleTeacher ? "Мужчина-учитель не может вести женскую группу" : ""}
```

**Визуальная индикация:**
- Disabled опция должна быть серой
- Tooltip с объяснением при hover

#### Список потоков

**Файл:** `src/components/teacher/TeacherStreamsTab.tsx` или аналогичный

**Добавить badge с типом группы:**
- Иконки: ♂ (MALE_ONLY), ♀ (FEMALE_ONLY), ⚥ (MIXED)
- Цветовая кодировка:
  - MALE_ONLY: синий
  - FEMALE_ONLY: розовый
  - MIXED: зеленый

**В карточке потока показывать:**
- Иконка + текст типа группы
- Например: "♂ Только мужчины"

#### Страница присоединения к потоку

**Файл:** `src/app/join/[token]/page.tsx`

**Проверка на клиенте:**
- Перед отправкой запроса проверить gender студента и genderType потока
- Если не подходит → показать сообщение: "Этот поток предназначен для [мужчин/женщин]"
- Не показывать кнопку "Присоединиться"

---

### Часть 4: Валидация и тесты

#### Zod схемы

**Файл:** `src/lib/validation.ts`

**Добавить схемы:**
```typescript
export const createStreamSchema = z.object({
  // существующие поля...
  genderType: z.enum(['MALE_ONLY', 'FEMALE_ONLY', 'MIXED']),
});

export const registerUserSchema = z.object({
  // существующие поля...
  gender: z.enum(['MALE', 'FEMALE']),
});
```

#### Unit тесты

**Файл:** `src/lib/__tests__/gender-rules.test.ts`

**Тестировать все правила:**
- Женщина-учитель может создать любой тип потока
- Мужчина-учитель не может создать FEMALE_ONLY
- MALE студент не может записаться в FEMALE_ONLY
- FEMALE студент не может записаться в MALE_ONLY
- Мужчина-студент не может писать женщине-учителю
- Женщина-студент может писать любому учителю

#### Integration тесты

**Тестировать API:**
- Попытка создать недопустимый поток → 400 ошибка
- Попытка записаться в недопустимый поток → 403 ошибка
- Попытка отправить недопустимое сообщение → 403 ошибка

---

## Критерии приемки

Твоя работа завершена когда:

- ✅ Модуль gender-rules.ts создан со всеми функциями
- ✅ Интеграция в API создания потоков работает
- ✅ Интеграция в API записи студентов работает
- ✅ Интеграция в chat API работает (координация с chat-developer)
- ✅ UI: поле "Пол" в регистрации работает
- ✅ UI: выбор типа группы при создании потока работает
- ✅ UI: disabled состояние для недопустимых опций с tooltip
- ✅ UI: badge с типом группы в списках потоков
- ✅ Все правила из ROADMAP_PART1.md 1.4.2 реализованы
- ✅ Тесты написаны и проходят (>70%)
- ✅ Нет TypeScript ошибок

---

## Ограничения

**НЕ делай:**
- ❌ НЕ создавай новые модели БД (используй существующие поля)
- ❌ НЕ изменяй правила без согласования (они основаны на исламских нормах)
- ❌ НЕ делай гендерное разделение опциональным (это обязательная фича)

**Делай:**
- ✅ Следуй правилам из ROADMAP_PART1.md точно
- ✅ Добавляй понятные сообщения об ошибках на русском
- ✅ Используй ValidationError и ForbiddenError
- ✅ Логируй попытки нарушения правил

---

## Коммуникация

**Координация с chat-developer:**
- Передай функцию canSendDirectMessage для использования в чате
- Или согласуй где будет проверка (в твоем модуле или в chat API)

**После завершения:**
- TaskUpdate(status: "completed")
- SendMessage(to: "team-lead", message: "Гендерное разделение реализовано, все правила работают")

---

## Справочные материалы

- `ROADMAP_PART1.md` - секция 1.4 с полным описанием правил
- `src/lib/validation.ts` - существующие Zod схемы

---

**Гендерное разделение - критически важная фича для исламского образования!**
