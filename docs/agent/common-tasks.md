# Common Tasks

## Dev Environment

```bash
npm install
docker-compose up -d
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev          # http://localhost:3000
```

**Тест аккаунты:**
- Admin/Teacher: `admin@fatiha.ru` / `admin123`
- Student: `ali@student.ru` / `student123`

## Изменение схемы БД

```bash
# 1. Edit prisma/schema.prisma
npx prisma migrate dev --name descriptive_name
npx prisma generate
# 3. Restart dev server
```

**ВАЖНО:** Всегда `prisma migrate dev`, НЕ `prisma db push`.

## Добавить тип урока

1. Enum `LessonType` в `prisma/schema.prisma`
2. `npx prisma db push` + `npx prisma generate`
3. Update `src/app/lesson/[lessonId]/room-client.tsx`
4. Update `src/components/teacher/TeacherLessonsTab.tsx`

## Email уведомления

1. Шаблон: `src/lib/email/templates.ts` → `{ subject, html, text }`
2. Метод в `EmailService` (`src/lib/email-service.ts`)
3. Вызов из API/cron
4. Test: Ethereal Email (preview URL в логах)

## Socket.io события

1. Payload interface в `src/lib/socket-server.ts`
2. Handler в `initSocketServer()`
3. Permission checks через `canAccessRoom`
4. Emit events в room/socket
5. Client-side update в компоненте

## Частые проблемы

**"Too many clients already":**
- Всегда `import { prisma } from "@/lib/prisma"`, НЕ `new PrismaClient()`

**Invite link не работает:**
- Проверить аутентификацию, capacity, статус enrolment

**Jitsi не загружается:**
- Lesson type должен быть `LIVE`
- `jitsiRoomName === stream.id`
- Проверить `https://meet.jit.si/external_api.js`

**Чат не работает:**
- Кастомный сервер должен быть запущен (не `next dev`)
- Пользователь должен иметь доступ к room

**Email не отправляется:**
- Проверить SMTP в `.env`
- Ethereal Email: preview URL в логах

**S3 upload:**
- Проверить `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`
- `isS3Configured()` должен вернуть `true`
- Presigned URLs: 1h upload, 4h download
