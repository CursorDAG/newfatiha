# API Route Patterns

## Общие правила

Все API роуты оборачиваются в `withErrorHandling`:

```typescript
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError, ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { validateRequest } from "@/lib/validate-request";
```

## Teacher Routes (`/api/teacher/*`)

1. `getServerSession(authOptions)` — проверить сессию
2. Проверить роль `TEACHER` или `ADMIN`
3. Проверить владение (`stream.teacherId === session.user.id`)
4. `NextResponse.json()` с кодом

## Admin Routes (`/api/admin/*`)

1. `getServerSession(authOptions)` — проверить сессию
2. Проверить роль `ADMIN`
3. Полного доступа, без проверок владения

## Student Routes

1. Проверить сессию
2. Проверить enrolment в `Enrollment`
3. `upsert` паттерн для повторных отправок
4. Сбросить grading поля при повторной отправке

## Создание нового роута

```typescript
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TEACHER") {
    throw new AuthError("Unauthorized");
  }

  const body = await req.json().catch(() => null);
  if (!body?.requiredField) {
    throw new ValidationError("Missing required field", {
      requiredField: "This field is required"
    });
  }

  // Business logic...
  return NextResponse.json({ success: true, data });
});
```

## Error Handling

- `AuthError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ValidationError` (400)
- `ConflictError` (409)
- Автоматическая обработка Prisma ошибок: P2002 (duplicate), P2025 (not found)
- JSON формат: `{ error: string, code: string, fields?: object }`

## Валидация запросов

```typescript
import { createCourseSchema } from "@/lib/validation";

const { title, description, capacity } = await validateRequest(req, createCourseSchema);
```

Схемы в `src/lib/validation.ts`: `createCourseSchema`, `createStreamSchema`, `createLessonSchema`, `submitQuizSchema`, `changePasswordSchema` и др.

## Rate Limiting

```typescript
const rateLimitResult = await rateLimit(req, { maxRequests: 10, windowMs: 60000 });
if (rateLimitResult) return rateLimitResult; // 429 response
```

- Sliding window по IP/user ID
- Макс 10,000 записей, авто-эвикция 10% при превышении
- Для продакшена: Redis-based rate limiting
