# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**📋 Для ознакомления с текущим состоянием проекта см. [PROJECT.md](./PROJECT.md)**

## Project Overview

Fatiha.ru is a Learning Management System (LMS) for Islamic education with live video streaming capabilities. Built with Next.js 16 (App Router), it supports role-based access for teachers and students, featuring live classes via Jitsi Meet, homework assignments, quizzes (multiple-choice and voice), real-time activity tracking, lesson recordings, and comprehensive progress analytics.

**Current Status:** MVP complete. All core features implemented including:
- ✅ Lesson recording system (Phase 1)
- ✅ Student progress analytics (Phase 2)
- ✅ Mobile optimization & PWA (Phase 3)

## Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000 (uses custom server.ts with Socket.io)

# Database
docker-compose up -d     # Start PostgreSQL in Docker
npx prisma generate      # Generate Prisma Client after schema changes
npx prisma migrate dev   # Create and apply migration (replaces db push)
npx prisma migrate deploy # Apply migrations in production
npx prisma db seed       # Seed database with test data (creates admin@fatiha.ru / admin123)
npx prisma studio        # Open Prisma Studio GUI

# Testing
npm test                 # Run tests with Vitest
npm run test:ui          # Run tests with Vitest UI
npm run test:coverage    # Generate coverage report

# Production
npm run build            # Build for production
npm start                # Start production server (NODE_ENV=production tsx server.ts)

# Linting
npm run lint             # Run ESLint
```

## Environment Setup

Required environment variables (create `.env` file):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fatiha"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

**Important:** See `.env.example` for complete list of variables with documentation.

**Environment Validation:** The application validates required environment variables at startup via `src/lib/env.ts`. If any required variable is missing or invalid, the app will fail fast with a clear error message. This prevents runtime errors and accidental deployment with insecure defaults.

**Logging:** The application uses Pino for structured logging (`src/lib/logger.ts`). Set `LOG_LEVEL` environment variable to control verbosity (trace, debug, info, warn, error, fatal). Defaults to `debug` in development and `info` in production. All API errors are automatically logged with request context (path, method, query params, error details).

**Memory Monitoring:** The application includes automatic memory monitoring (`src/lib/memory-monitor.ts`) that tracks Node.js process memory usage every 30 seconds. Warnings are logged when RSS exceeds 1GB, critical alerts when exceeding 2GB. The server performs graceful shutdown if memory usage becomes critical. See `docs/PERFORMANCE.md` for optimization recommendations.

**Error Tracking:** Sentry is configured for production error monitoring (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`). Only enabled when `NODE_ENV=production`. Captures 10% of transactions for performance monitoring, 10% of sessions for replay, and 100% of error sessions. Automatically filters sensitive data (passwords) from breadcrumbs.

**Optional Services:**
- **S3 Storage**: Configure `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` for lesson recordings. If not configured, recordings fall back to PostgreSQL storage (not recommended for production).
- **Email**: Configure SMTP settings (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) for notifications. Use Ethereal Email for development testing.
- **Sentry**: Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` for error tracking in production.
- **Jitsi JWT**: Configure `JITSI_DOMAIN`, `JITSI_JWT_APP_ID`, `JITSI_JWT_SECRET` for self-hosted Jitsi with authentication (optional, defaults to public meet.jit.si).

## Architecture

### Custom Server Setup

**Important:** This application uses a **custom Next.js server** (`server.ts`), not the default Next.js server. The custom server is required for Socket.io WebSocket integration.

- Development: `npm run dev` runs `tsx server.ts`
- Production: `npm start` runs `NODE_ENV=production tsx server.ts`
- The server creates an HTTP server, initializes Next.js app handler, and attaches Socket.io
- Socket.io configuration includes CORS settings and WebSocket/polling transports
- Never use `next dev` or `next start` directly - always use the npm scripts

### Authentication & Authorization

- **NextAuth** with credentials provider (email/password + bcrypt)
- JWT-based sessions (not database sessions)
- Three roles: `STUDENT`, `TEACHER`, `ADMIN`
- Middleware (`src/middleware.ts`) protects `/teacher/*` and `/student/*` routes
- Role stored in JWT token via callbacks in `src/app/api/auth/[...nextauth]/route.ts`
- Admin role has full access to all features plus admin-specific endpoints (`/api/admin/*`)

### Rate Limiting

**In-Memory Rate Limiter** (`src/lib/rate-limit.ts`):
- Sliding window rate limiting based on IP address or user ID
- Configurable limits per endpoint (maxRequests, windowMs)
- Stores request counts in memory (resets on server restart)
- **Memory protection**: Maximum 10,000 entries with automatic eviction of oldest 10% when limit reached
- **Adaptive cleanup**: Increases cleanup frequency from 5 minutes to 1 minute when store size exceeds 5,000 entries
- Used to prevent abuse on sensitive endpoints (quiz submissions, profile updates, etc.)
- Example usage: `await rateLimit(req, { maxRequests: 10, windowMs: 60000 })`
- Returns `null` if allowed, `NextResponse` with 429 status if rate limit exceeded
- For production: consider Redis-based rate limiting for multi-instance deployments (see `docs/PERFORMANCE.md`)

### Database Patterns

**Prisma Singleton**: Always import from `src/lib/prisma.ts`, never instantiate `new PrismaClient()` directly. This prevents connection pool exhaustion during Next.js hot-reload in development.

**Connection Pool Optimization**: Add `connection_limit` parameter to DATABASE_URL to prevent pool exhaustion:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=10"
```
Recommended values: 10 for development, 20-50 for production. See `docs/PERFORMANCE.md` for details.

**Key Relationships**:
- `Course` → `Stream` (one-to-many): A course has multiple streams (class groups)
- `Stream` → `Lesson` (one-to-many): Each stream has its own lesson sequence
- `User` → `Enrollment` → `Stream`: Students enroll in streams via invite tokens
- `Lesson` → `LessonQuiz`: Lessons can have quizzes (MULTIPLE_CHOICE or VOICE)
- `Stream` → `HomeworkAssignment`: Homework is assigned per stream, not per lesson

**Enrollment Status Flow**: `ACTIVE` → `TRANSFERRED` (moved to another stream) | `KICKED` (removed) | `REPEATING` (repeating year)

**Quiz vs Homework Systems**:
- **LessonQuiz**: Attached to specific lessons, auto-graded (MULTIPLE_CHOICE) or teacher-graded (VOICE)
  - Submission status: `SUBMITTED` → `PASSED` | `FAILED`
  - One submission per student per quiz (upsert pattern allows resubmission)
  - Voice recordings stored as `Bytes` in database (max 7MB)
- **HomeworkAssignment**: Attached to streams (optionally linked to lesson)
  - Submission status: `SUBMITTED` → `ACCEPTED` | `NEEDS_REWORK` | `REJECTED`
  - Can include text content or URL (e.g., link to uploaded file)
  - Supports optional due dates and grading (0-100 scale)

### Live Streaming Architecture

- **Jitsi Meet SDK** embedded directly in Next.js client components
- Room name = `stream.id` (all lessons in a stream share the same Jitsi room)
- Script loaded from `https://meet.jit.si/external_api.js`
- No JWT tokens currently used (public Jitsi instance) - configure `JITSI_JWT_*` env vars for self-hosted Jitsi with authentication
- Lesson types: `LIVE` (Jitsi), `VIDEO` (external URL), `TEXT` (Markdown content rendered with ReactMarkdown)
- JWT token generation available in `src/lib/jitsi-jwt.ts` for authenticated Jitsi rooms

### Lesson Library System

- Lessons can be marked as templates (`isTemplate: true`) for reuse across streams
- Template lessons include `topic` and `level` fields for categorization
- Teachers can create lessons from templates via "Import from Library" modal
- Importing creates a new lesson instance (not a reference) - changes don't affect the template
- `sortOrder` field controls lesson sequence within a stream (supports drag-and-drop reordering via `@dnd-kit`)

### Activity Tracking

- Heartbeat system (`/api/activity/heartbeat`) tracks user presence
- Client sends heartbeat every 30 seconds while on lesson page
- Three activity kinds: `APP`, `LESSON`, `LIVE_ROOM`
- Sessions auto-expire after 30 days
- Used for analytics and "who's online" features

### Real-Time Chat Architecture

**Socket.io Integration:**
- Custom Next.js server (`server.ts`) required for WebSocket support
- Socket.io server initialized in `src/lib/socket-server.ts`
- Authentication via socket handshake with user ID token
- Middleware validates user exists and is not blocked before accepting connection

**Chat Room Types:**
- `STREAM`: Group chat for all students enrolled in a stream (one room per stream)
- `DIRECT`: Private 1-on-1 chat between two users

**Socket Events:**
- `room:join` / `room:leave`: Join/leave chat rooms
- `message:send`: Send new message (max 5000 chars)
- `message:edit`: Edit own message (time-limited, see `src/lib/chat-permissions.ts`)
- `message:delete`: Soft delete message (teachers can delete any message in their stream)
- `typing:start` / `typing:stop`: Typing indicators
- `user:online` / `user:offline`: Presence notifications

**Permissions:**
- Students can only access chat rooms for streams they're enrolled in
- Teachers can access chat rooms for streams they teach
- Direct messages require being one of the two participants
- Message editing allowed within configurable time window (default: own messages only)
- Teachers can delete any message in their stream's chat room

### Invite Token System

- Teachers generate invite links: `/join/[token]`
- Tokens are UUIDs stored in `InviteToken` table
- One token per stream (upserted on generation)
- Capacity checking: `stream.course.capacity` vs active enrollments
- Students must be authenticated to join via token

### Data Storage & Limits

**Voice Quiz Recordings**:
- Stored directly in PostgreSQL as `Bytes` field (not file storage)
- Max size: 7MB per recording (enforced in `/api/quiz/[quizId]/submit`)
- Client sends base64-encoded audio, server converts to Buffer
- Mime type stored separately (`voiceMimeType` field)
- **Scalability concern**: Large voice submissions will bloat database size; consider moving to S3/blob storage for production

**Schedule System**:
- Uses 30-minute time slots (hardcoded, not configurable)
- Week grid: Sunday (0) through Saturday (6)
- Default hours: 6:00 AM to 10:00 PM
- Conflict detection prevents overlapping slots for same stream
- Stored as `StreamScheduleSlot` with `dayOfWeek`, `startMinutes`, `durationMinutes`

**S3 Storage System** (`src/lib/s3.ts`):
- Supports AWS S3, MinIO, Cloudflare R2, and other S3-compatible services
- Presigned URLs for secure uploads (1 hour expiration) and downloads (4 hour expiration)
- Optional CDN URL configuration via `S3_PUBLIC_URL` for public access
- Recording key format: `recordings/{streamId}/{lessonId}/{timestamp}-{filename}`
- Check `isS3Configured()` before using S3 features
- Falls back to PostgreSQL `Bytes` storage if S3 not configured

**Email Notification System** (`src/lib/email-service.ts`):
- Nodemailer with SMTP configuration
- Templates for: lesson starting, new lesson, homework/quiz checked, homework deadline, new message, student joined
- Cron scheduler (`src/lib/email-scheduler.ts`) for automated notifications
- Ethereal Email support for development (auto-generates test accounts, logs preview URLs)
- Email failures are logged but don't break core functionality (wrapped in try-catch)
- All emails sent from configured `SMTP_FROM` address

**Gender-Based Stream Filtering**:
- Streams have `genderType` field: `MIXED`, `MALE_ONLY`, `FEMALE_ONLY`
- Users have `gender` field: `MALE`, `FEMALE`, `NOT_SPECIFIED`
- Enrollment validation checks gender compatibility (see `src/lib/gender-rules.ts`)
- `MALE_ONLY` streams only accept male students, `FEMALE_ONLY` only female students
- `MIXED` streams accept all genders

## API Route Patterns

**Teacher Routes** (`/api/teacher/*`):
1. Check session with `getServerSession(authOptions)`
2. Verify role is `TEACHER` or `ADMIN`
3. Verify ownership (e.g., `stream.teacherId === session.user.id`)
4. Return `NextResponse.json()` with appropriate status codes

Example: `/api/teacher/manage-student` handles multiple actions via `action` field in request body.

**Admin Routes** (`/api/admin/*`):
1. Check session with `getServerSession(authOptions)`
2. Verify role is `ADMIN` (only admins can access)
3. No ownership checks - admins have full access
4. Endpoints include: user management (block/unblock, reset password), course management, dashboard stats

**Student Routes** (e.g., `/api/quiz/[quizId]/submit`, `/api/teacher/homework/[assignmentId]/submit`):
1. Check session exists
2. Verify enrollment in the relevant stream (via `Enrollment` table)
3. Use `upsert` pattern to allow resubmissions (updates existing submission)
4. Reset grading fields (`status: SUBMITTED`, clear `checkedById`, `checkedAt`) on resubmission

## Important Scalability Considerations

### Jitsi Videobridge Scaling
- Default single JVB setup will bottleneck at ~200 concurrent participants
- Consider Jitsi Octo for multi-bridge cascading
- Enforce "presenter mode" for classes >15 people (teacher broadcasts, students audio-only)
- For production, use self-hosted Jitsi with JWT authentication (see `src/lib/jitsi-jwt.ts`)

### Database Connection Pool
- 500+ students joining simultaneously will saturate database connection pool
- Mitigation: Use Redis/KV for `InviteToken` lookups instead of PostgreSQL
- Consider PgBouncer with read-replicas for session validation
- Prisma connection pool defaults to `num_cpus * 2 + 1` - adjust via `connection_limit` in DATABASE_URL

### Real-Time Access Revocation
- Kicking a student updates database but doesn't terminate active Jitsi connection
- Student remains in video call until browser refresh
- Solution: Implement Jitsi JWT tokens with short expiration + server-side XMPP API to force disconnect

### Voice Recording Storage
- Voice quiz recordings stored in PostgreSQL `Bytes` field (max 7MB each)
- Large voice submissions will bloat database size over time
- For production: migrate to S3-compatible storage (see `src/lib/s3.ts`)
- Consider implementing automatic cleanup of old recordings

## Code Conventions

### Styling
- **Tailwind CSS 4** for all styling (no CSS modules or styled-components)
- Utility-first approach with inline classes
- Custom color palette: emerald for primary actions, slate for backgrounds
- Dark theme for student lesson pages (`bg-slate-950`), light theme for teacher dashboard (`bg-slate-50`)
- Responsive design with `lg:` breakpoints for desktop layouts
- Stream colors: Each stream has a `color` field (hex code, default `#10b981`) used for visual identification in schedules and lists

### Path Aliases
- `@/*` maps to `src/*` (configured in `tsconfig.json`)
- Always use `@/` imports, never relative paths across directories

### Component Organization
- Server Components: `src/app/**/page.tsx` (default in App Router)
  - Handle authentication, database queries, and pass data as props
  - Example: `src/app/lesson/[lessonId]/page.tsx` fetches lesson data server-side
- Client Components: Marked with `"use client"` directive
  - All interactive UI, state management, and browser APIs
  - Example: `src/app/lesson/[lessonId]/room-client.tsx` handles Jitsi embed and quiz interactions
- Shared UI: `src/components/teacher/ui/*` for reusable teacher components
- Hooks: `src/components/teacher/hooks/*` for data fetching logic

**State Management Pattern**:
- No global state library (Redux, Zustand, etc.)
- Teacher dashboard (`TeacherDashboard.tsx`) uses local React state with `useState`
- Data fetching via `fetch()` in `useEffect` or event handlers
- Toast notifications managed via local state array (`ToastStack` component)
- Router refresh pattern: `router.refresh()` after mutations to refetch server data

**Modal Pattern**:
- All modals are conditionally rendered in parent component based on state
- Example: `showCreateCourseModal ? <CreateCourseModal onClose={...} /> : null`
- Modals use `ModalShell` wrapper component for consistent styling
- Close handlers typically reset form state and hide modal
- Confirmation modals (`ConfirmModal`) used for destructive actions

### Type Safety
- Prisma types imported from `@prisma/client`
- Custom types in `src/types/index.ts` and `src/types/next-auth.d.ts`
- API route types often defined inline or in route files
- NextAuth session extended via module augmentation in `src/types/next-auth.d.ts` to include `role` and `id`

### Teacher Dashboard Architecture

The teacher interface (`TeacherDashboard.tsx`) is a single-page app with tab-based navigation:
- **Overview**: Quick stats and recent activity
- **Courses**: Create/edit courses (title, description, capacity)
- **Streams**: Manage class groups within courses (schedule, invite links, student transfers)
- **Lessons**: Create/edit/reorder lessons, import from library
- **Students**: View enrollments, transfer/kick students, view individual progress
- **Analytics**: Activity tracking, attendance metrics
- **Gradebook**: Quiz and homework submissions requiring grading
- **Live**: Real-time view of active lessons and participants
- **Homework**: Create/manage homework assignments
- **Schedule**: Visual weekly grid for scheduling streams (30-min slots)

All tabs share the same component (`TeacherShell`) with content swapped based on `activeTab` state.

### Admin Dashboard Architecture

The admin interface (`/admin`) provides system-wide management capabilities:
- **User Management**: View all users, block/unblock accounts, reset passwords, delete users
- **Course Management**: View all courses across all teachers
- **Stream Management**: View all streams and enrollments
- **System Stats**: Total users, courses, streams, enrollments
- **Logs**: View system logs (if configured)
- Admins have full access to all teacher features plus admin-specific endpoints
- Admin role required for access (checked via middleware and API routes)

## Key Dependencies

- **Next.js 16** (App Router): Server/client components, API routes, middleware
- **Prisma 6**: ORM with PostgreSQL, includes seeding support
- **NextAuth 4**: Authentication with JWT sessions
- **React 19**: Latest React with improved server components
- **Tailwind CSS 4**: Utility-first styling
- **Socket.io 4**: WebSocket server and client for real-time chat
- **@dnd-kit**: Drag-and-drop for lesson reordering in teacher UI
- **react-markdown**: Renders lesson content for TEXT type lessons
- **bcryptjs**: Password hashing (10 rounds)
- **pino**: Structured logging with JSON output in production
- **nodemailer**: Email sending with SMTP support
- **node-cron**: Scheduled tasks for email notifications
- **@aws-sdk/client-s3**: S3-compatible storage for lesson recordings
- **@sentry/nextjs**: Error tracking and performance monitoring
- **zod 4**: Schema validation for API requests
- **Vitest**: Fast unit testing framework
- **Husky**: Git hooks for pre-commit checks

## Error Handling

All API routes use centralized error handling via `withErrorHandling` middleware (`src/lib/api-handler.ts`):
- Typed error classes: `AuthError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ValidationError` (400), `ConflictError` (409)
- Automatic Prisma error handling (P2002 for duplicates, P2025 for not found)
- Structured logging with request context (path, method, query, error details)
- Consistent JSON error format: `{ error: string, code: string, fields?: object }`

When creating new API routes, always wrap handlers with `withErrorHandling` and throw typed errors instead of returning error responses manually.

## Request Validation

Use Zod schemas for type-safe request validation (`src/lib/validation.ts`):

```typescript
import { validateRequest } from "@/lib/validate-request";
import { createCourseSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: Request) => {
  // Validate and parse request body
  const { title, description, capacity } = await validateRequest(req, createCourseSchema);

  // Data is now type-safe and validated
  // ...
});
```

Benefits:
- Automatic validation with clear error messages
- Type safety (TypeScript infers types from schemas)
- Reusable schemas across routes
- Consistent validation logic

Available schemas in `src/lib/validation.ts`: `createCourseSchema`, `createStreamSchema`, `createLessonSchema`, `submitQuizSchema`, `changePasswordSchema`, and more.

## UI Language

All user-facing text is hardcoded in **Russian**. No internationalization library is used. When adding new features:
- Use Russian for all UI labels, buttons, error messages
- Follow existing naming patterns (e.g., "Создать" for Create, "Удалить" for Delete)
- Date/time formatting should match Russian conventions

## Testing

**Test Infrastructure:**
- **Vitest** for unit and integration tests (configured in `vitest.config.ts`)
- **Testing Library** for React component testing
- **jsdom** environment for browser API simulation
- Test files located in `src/__tests__` and `src/lib/__tests__`
- Integration tests in `src/lib/__tests__/integration`

**Running Tests:**
```bash
npm test                 # Run all tests
npm run test:ui          # Open Vitest UI for interactive testing
npm run test:coverage    # Generate coverage report (HTML + JSON)
```

**Test Coverage:**
- Excludes: `node_modules/`, `src/__tests__/`, `**/*.d.ts`, config files, `src/types/`
- Coverage reports generated in `coverage/` directory
- Provider: v8 (faster than Istanbul)

**Existing Test Suites:**
- Unit tests: quiz logic, schedule validation, error handling, rate limiting, storage, Jitsi JWT, chat permissions, email service, gender rules
- Integration tests: homework flow, quiz flow, teacher operations, authentication
- API route tests: admin endpoints (users, courses, dashboard)

**Git Hooks:**
- Husky pre-commit hook runs `lint-staged`
- Lint-staged runs ESLint and TypeScript type checking on staged `.ts`/`.tsx` files
- Prevents commits with linting errors or type errors

## Common Tasks

### Setting Up Development Environment
1. Clone repository and install dependencies: `npm install`
2. Start PostgreSQL: `docker-compose up -d`
3. Copy `.env.example` to `.env` and configure database URL
4. Generate Prisma Client: `npx prisma generate`
5. Run migrations: `npx prisma migrate dev`
6. Seed database: `npx prisma db seed`
7. Start dev server: `npm run dev` (uses custom server with Socket.io)
8. Access at `http://localhost:3000`
9. Login with test accounts: `admin@fatiha.ru` / `admin123` (teacher) or `ali@student.ru` / `student123` (student)

### Adding a New Lesson Type
1. Add enum value to `LessonType` in `prisma/schema.prisma`
2. Run `npx prisma db push` and `npx prisma generate`
3. Update `src/app/lesson/[lessonId]/room-client.tsx` to handle new type
4. Update teacher lesson creation UI in `src/components/teacher/TeacherLessonsTab.tsx`

### Creating a New Teacher API Endpoint
1. Create route file: `src/app/api/teacher/[name]/route.ts`
2. Import required dependencies:
   ```typescript
   import { withErrorHandling } from "@/lib/api-handler";
   import { AuthError, ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
   ```
3. Export handler wrapped with `withErrorHandling`:
   ```typescript
   export const POST = withErrorHandling(async (req: Request) => {
     // Check authentication
     const session = await getServerSession(authOptions);
     if (!session || session.user.role !== "TEACHER") {
       throw new AuthError("Unauthorized");
     }
     // Validate input
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
4. Use typed errors instead of manual error responses
5. Always verify ownership (e.g., `stream.teacherId === session.user.id`)
6. Return `NextResponse.json()` with appropriate data structure

### Modifying Database Schema
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name` to create and apply migration
3. Run `npx prisma generate` to update Prisma Client types
4. Restart dev server to pick up new types

**Important:** Always use migrations (`prisma migrate dev`) instead of `prisma db push` to maintain migration history. Migrations are tracked in `prisma/migrations/` and should be committed to git.

**See:** `MIGRATION_PLAN.md` for detailed migration strategy and rollback procedures.

### Adding a New Email Notification
1. Create email template in `src/lib/email/templates.ts`:
   - Export TypeScript interface for template data
   - Export template function that returns `{ subject, html, text }`
   - Use Russian for all user-facing text
2. Add method to `EmailService` class in `src/lib/email-service.ts`
3. Call the method from relevant API route or cron job
4. Test with Ethereal Email in development (check logs for preview URL)

### Adding a New Socket.io Event
1. Define payload interface in `src/lib/socket-server.ts`
2. Add event handler in `initSocketServer` function
3. Implement permission checks using `canAccessRoom` or custom logic
4. Emit response events to room or individual socket
5. Update client-side Socket.io integration in relevant component
6. Handle event in client with appropriate state updates

### Debugging Common Issues

**"Too many clients already" error**:
- Caused by creating multiple PrismaClient instances during hot-reload
- Solution: Always import from `@/lib/prisma`, never instantiate directly
- Check that API routes don't create `new PrismaClient()`

**Student can't join via invite link**:
- Verify student is authenticated (NextAuth session exists)
- Check stream capacity hasn't been exceeded
- Confirm invite token exists and matches stream ID
- Check enrollment status isn't `KICKED`

**Jitsi not loading**:
- Check browser console for script loading errors
- Verify `https://meet.jit.si/external_api.js` is accessible
- Ensure lesson type is `LIVE` (not `VIDEO` or `TEXT`)
- Check that `jitsiRoomName` equals `stream.id`

**Chat not working**:
- Verify custom server is running (not default Next.js server)
- Check Socket.io connection in browser console
- Ensure user is authenticated (socket handshake requires user ID)
- Verify user has access to the chat room (enrollment or direct message participant)
- Check that `chatEnabled` is `true` for stream-based chat rooms

**Email notifications not sending**:
- Check SMTP configuration in `.env` file
- For development, use Ethereal Email and check logs for preview URLs
- Verify email service doesn't throw errors (check Pino logs)
- Email failures are non-blocking - check logs for error details

**S3 upload failing**:
- Verify S3 credentials are configured (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`)
- Check `isS3Configured()` returns `true`
- For MinIO, ensure `S3_ENDPOINT` is set and `forcePathStyle` is enabled
- Presigned URLs expire after 1 hour (uploads) or 4 hours (downloads)

**Memory usage high**:
- Check memory monitor logs for warnings
- Review `docs/PERFORMANCE.md` for optimization tips
- Consider increasing Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`
- Check for memory leaks using `npm run test:memory` (if available)

# New Features Documentation

## Teacher Registration System

### Overview
Two-step registration process with email verification and admin approval.

### API Endpoints

#### POST /api/auth/register/teacher
**Purpose:** Step 1 - Create teacher account and send verification email

**Auth:** None (public)

**Request:**
```json
{
  "email": "teacher@example.com",
  "password": "securepass123",
  "name": "Иван Иванов"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Регистрация успешна. Проверьте email для подтверждения адреса.",
  "userId": "uuid"
}
```

**Side Effects:**
- User created with status PENDING_VERIFICATION
- Verification email sent
- Verification token generated (UUID)

---

#### POST /api/auth/verify-email
**Purpose:** Verify email address using token from email

**Auth:** None (public)

**Request:**
```json
{
  "token": "uuid-verification-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email успешно подтвержден",
  "requiresProfile": true,
  "userId": "uuid"
}
```

**Side Effects:**
- User.emailVerified set to true
- User.status updated to PENDING_APPROVAL (for teachers)
- Verification token cleared

---

#### POST /api/auth/resend-verification
**Purpose:** Resend verification email

**Auth:** None (public)

**Request:**
```json
{
  "email": "teacher@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Письмо с подтверждением отправлено повторно"
}
```

---

#### POST /api/teacher/profile
**Purpose:** Step 2 - Complete teacher profile after email verification

**Auth:** Required (teacher role, email verified)

**Request:**
```json
{
  "bio": "Преподаватель Корана с 10-летним опытом...",
  "subjects": ["Коран", "Таджвид", "Арабский язык"],
  "experience": "10 лет преподавания в медресе...",
  "qualifications": "Иджаза по чтению Корана, диплом...",
  "whatsappPhone": "+79991234567",
  "documentsUrls": [
    "https://drive.google.com/file/d/...",
    "https://drive.google.com/file/d/..."
  ],
  "videoIntroUrl": "https://youtube.com/watch?v=..."
}
```

**Validation:**
- bio: min 50 chars, max 5000
- subjects: array, min 1 item
- experience: min 20 chars, max 5000
- qualifications: min 20 chars, max 5000
- whatsappPhone: regex `/^\+?\d{10,15}$/`
- documentsUrls: array of valid URLs, min 1
- videoIntroUrl: optional, valid URL

**Response:**
```json
{
  "success": true,
  "message": "Анкета отправлена на рассмотрение администрации"
}
```

**Side Effects:**
- TeacherProfile created
- User.status updated to PENDING_APPROVAL
- Admins notified (in-app notification)

---

#### GET /api/admin/teacher-applications
**Purpose:** List teacher applications for admin review

**Auth:** Required (admin role)

**Query Params:**
- `status`: "pending" | "approved" | "rejected" | (empty for all)

**Response:**
```json
{
  "success": true,
  "applications": [
    {
      "id": "uuid",
      "name": "Иван Иванов",
      "email": "teacher@example.com",
      "status": "PENDING_APPROVAL",
      "createdAt": "2026-03-19T10:00:00Z",
      "emailVerifiedAt": "2026-03-19T10:05:00Z",
      "profile": {
        "bio": "...",
        "subjects": ["Коран", "Таджвид"],
        "experience": "...",
        "qualifications": "...",
        "whatsappPhone": "+79991234567",
        "documentsUrls": ["..."],
        "videoIntroUrl": "...",
        "adminNotes": null,
        "reviewedBy": null,
        "reviewedAt": null,
        "rejectionReason": null
      }
    }
  ]
}
```

---

#### POST /api/admin/teacher-applications/[id]/approve
**Purpose:** Approve teacher application

**Auth:** Required (admin role)

**Request:**
```json
{
  "adminNotes": "Отличная квалификация, одобрено"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Заявка одобрена"
}
```

**Side Effects:**
- User.status → ACTIVE
- TeacherProfile updated with review info
- Teacher notified (in-app + email)
- Teacher can now access /teacher/* routes

---

#### POST /api/admin/teacher-applications/[id]/reject
**Purpose:** Reject teacher application

**Auth:** Required (admin role)

**Request:**
```json
{
  "rejectionReason": "Недостаточно опыта преподавания",
  "adminNotes": "Рекомендовать повторную подачу через год"
}
```

**Validation:**
- rejectionReason: required, min 10 chars, max 2000

**Response:**
```json
{
  "success": true,
  "message": "Заявка отклонена"
}
```

**Side Effects:**
- User.status → REJECTED
- TeacherProfile updated with rejection reason
- Teacher notified (in-app + email with reason)
- Teacher can re-apply after addressing issues

---

#### GET /api/user/me
**Purpose:** Get current user profile with status

**Auth:** Required

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "TEACHER",
    "status": "PENDING_APPROVAL",
    "emailVerified": true,
    "emailVerifiedAt": "2026-03-19T10:00:00Z",
    "teacherProfile": {
      "bio": "...",
      "subjects": ["..."],
      "whatsappPhone": "+79991234567",
      "rejectionReason": null
    }
  }
}
```

---

## Student Enrollment System

### Overview
Students apply to join streams, teachers/admins review applications, payment is verified, and enrollment is created.

### API Endpoints

#### GET /api/catalog/courses
**Purpose:** List published courses with available streams

**Auth:** Optional (public access)

**Query Params:**
- `search`: Filter by course title
- `level`: Filter by level
- `subject`: Filter by subject

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": "uuid",
      "title": "Основы Таджвида",
      "description": "Изучение правил чтения Корана",
      "teacher": {
        "id": "uuid",
        "name": "Устаз Ахмад"
      },
      "streams": [
        {
          "id": "uuid",
          "name": "Группа А",
          "level": "Начинающий",
          "schedule": "Пн, Ср, Пт 18:00-19:30",
          "capacity": 30,
          "enrolledCount": 15,
          "availableSpots": 15,
          "price": 5000,
          "genderType": "MIXED"
        }
      ]
    }
  ]
}
```

---

#### POST /api/enrollment-requests
**Purpose:** Submit enrollment request

**Auth:** Required (student role)

**Request:**
```json
{
  "streamId": "uuid",
  "message": "Хочу изучать Таджвид с нуля"
}
```

**Validation:**
- streamId: required, valid UUID
- message: optional, max 1000 chars

**Response:**
```json
{
  "success": true,
  "message": "Заявка отправлена",
  "requestId": "uuid",
  "paymentInstructions": {
    "bankName": "Сбербанк",
    "accountNumber": "1234567890",
    "amount": 5000,
    "recipient": "ИП Иванов И.И."
  }
}
```

**Business Rules:**
- Checks stream capacity
- Prevents duplicate requests
- Checks gender restrictions
- Notifies teacher

---

#### POST /api/enrollment-requests/[id]/payment-proof
**Purpose:** Upload payment proof

**Auth:** Required (request owner)

**Request:**
```json
{
  "paymentMethod": "BANK_TRANSFER",
  "transactionId": "TXN123456",
  "amount": 5000,
  "paidAt": "2026-03-19T10:00:00Z",
  "proofUrl": "https://drive.google.com/file/d/...",
  "notes": "Оплачено через Сбербанк Онлайн"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Подтверждение оплаты загружено"
}
```

**Side Effects:**
- PaymentProof created
- Request status → PAYMENT_PENDING
- Teacher/admin notified

---

#### GET /api/teacher/enrollment-requests
**Purpose:** List enrollment requests for teacher's streams

**Auth:** Required (teacher role)

**Query Params:**
- `status`: Filter by status
- `streamId`: Filter by stream

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "uuid",
      "status": "PAYMENT_PENDING",
      "student": {
        "id": "uuid",
        "name": "Студент Иван",
        "email": "student@example.com"
      },
      "stream": {
        "id": "uuid",
        "name": "Группа А"
      },
      "message": "Хочу изучать Таджвид",
      "createdAt": "2026-03-19T10:00:00Z",
      "paymentProof": {
        "amount": 5000,
        "paymentMethod": "BANK_TRANSFER",
        "proofUrl": "https://..."
      }
    }
  ]
}
```

---

#### POST /api/teacher/enrollment-requests/[id]/review
**Purpose:** Approve or reject enrollment request

**Auth:** Required (teacher role, stream owner)

**Request (Approve):**
```json
{
  "action": "APPROVE"
}
```

**Request (Reject):**
```json
{
  "action": "REJECT",
  "rejectionReason": "Группа заполнена"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Заявка одобрена"
}
```

**Side Effects:**
- Status updated
- Student notified
- Payment instructions sent (if approved)

---

#### POST /api/teacher/enrollment-requests/[id]/confirm-payment
**Purpose:** Confirm payment and create enrollment

**Auth:** Required (teacher/admin role)

**Request:**
```json
{
  "requestId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Оплата подтверждена, студент зачислен",
  "enrollmentId": "uuid"
}
```

**Side Effects:**
- Request status → PAYMENT_CONFIRMED
- Enrollment created (status: ACTIVE)
- PaymentProof verified
- Student notified (welcome email)
- Teacher notified about new student

---

## Middleware Protection

### Teacher Status Checks

The middleware (`src/middleware.ts`) now checks teacher status:

```typescript
// Allow /teacher/pending-approval for pending teachers
if (pathname === "/teacher/pending-approval") {
  // Allow access for PENDING_APPROVAL teachers
}

// Block other /teacher/* routes for non-active teachers
if (token.role === "TEACHER" && token.status) {
  if (status === "PENDING_APPROVAL" || status === "PENDING_VERIFICATION") {
    return redirect("/teacher/pending-approval");
  }
  if (status === "REJECTED") {
    return redirect("/auth/register/teacher");
  }
}
```

### JWT Token Refresh

The JWT token now includes `status` field and refreshes on each request:

```typescript
async jwt({ token, user }) {
  if (user) {
    token.role = user.role;
    token.id = user.id;
  }
  // Refresh user status on each request
  if (token.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id },
      select: { status: true, role: true },
    });
    if (dbUser) {
      token.status = dbUser.status;
      token.role = dbUser.role;
    }
  }
  return token;
}
```

This ensures real-time access control when admin approves/rejects applications.

---

## Notification Types

### New Notification Types

Added to `NotificationType` enum:

- `TEACHER_APPLICATION_APPROVED` - Teacher application approved by admin
- `TEACHER_APPLICATION_REJECTED` - Teacher application rejected by admin
- `TEACHER_APPLICATION_SUBMITTED` - New teacher application (for admins)
- `STUDENT_REGISTERED` - New student registered
- `ENROLLMENT_REQUEST_SUBMITTED` - Student submitted enrollment request
- `ENROLLMENT_REQUEST_APPROVED` - Enrollment request approved
- `ENROLLMENT_REQUEST_REJECTED` - Enrollment request rejected
- `PAYMENT_CONFIRMED` - Payment verified, student enrolled

---

## Email Templates

### New Email Templates

Located in `src/lib/email/templates/`:

1. **emailVerificationTemplate** - Email confirmation link
2. **teacherApplicationApprovedTemplate** - Approval notification
3. **teacherApplicationRejectedTemplate** - Rejection with reason

All templates follow the same pattern:
- Use `baseTemplate` for consistent styling
- Return `{ subject, html, text }`
- Include CTA buttons
- Provide plain text fallback
- All text in Russian

---

## Database Schema Changes

### New Models

#### TeacherProfile
```prisma
model TeacherProfile {
  id              String    @id @default(uuid())
  userId          String    @unique
  bio             String?   @db.Text
  subjects        String[]
  experience      String?   @db.Text
  qualifications  String?   @db.Text
  whatsappPhone   String?
  documentsUrls   String[]
  videoIntroUrl   String?
  adminNotes      String?   @db.Text
  reviewedById    String?
  reviewedAt      DateTime?
  rejectionReason String?   @db.Text
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### EnrollmentRequest
```prisma
model EnrollmentRequest {
  id              String    @id @default(uuid())
  studentId       String
  streamId        String
  status          EnrollmentRequestStatus
  message         String?
  reviewedById    String?
  reviewedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

#### PaymentProof
```prisma
model PaymentProof {
  id            String        @id @default(uuid())
  requestId     String
  paymentMethod PaymentMethod
  transactionId String?
  amount        Float
  paidAt        DateTime
  proofUrl      String
  notes         String?
  verifiedById  String?
  verifiedAt    DateTime?
  createdAt     DateTime      @default(now())
}
```

### New Enums

```prisma
enum UserStatus {
  PENDING_VERIFICATION
  PENDING_APPROVAL
  ACTIVE
  REJECTED
  SUSPENDED
}

enum EnrollmentRequestStatus {
  PENDING
  APPROVED
  REJECTED
  PAYMENT_PENDING
  PAYMENT_CONFIRMED
}

enum PaymentMethod {
  BANK_TRANSFER
  CARD
  CASH
  OTHER
}
```

### Extended User Model

Added fields:
- `emailVerified: Boolean @default(false)`
- `emailVerifiedAt: DateTime?`
- `verificationToken: String? @unique`
- `status: UserStatus @default(ACTIVE)`

---

## Validation Schemas

### New Zod Schemas

Located in `src/lib/validation.ts`:

```typescript
// Teacher registration
export const registerTeacherStep1Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

export const registerTeacherStep2Schema = z.object({
  bio: z.string().min(50).max(5000),
  subjects: z.array(z.string()).min(1),
  experience: z.string().min(20).max(5000),
  qualifications: z.string().min(20).max(5000),
  whatsappPhone: z.string().regex(/^\+?\d{10,15}$/),
  documentsUrls: z.array(z.string().url()).min(1),
  videoIntroUrl: z.string().url().optional().nullable(),
});

// Email verification
export const verifyEmailSchema = z.object({
  token: z.string().uuid(),
});

// Admin review
export const approveTeacherSchema = z.object({
  adminNotes: z.string().max(2000).optional(),
});

export const rejectTeacherSchema = z.object({
  rejectionReason: z.string().min(10).max(2000),
  adminNotes: z.string().max(2000).optional(),
});

// Enrollment
export const createEnrollmentRequestSchema = z.object({
  streamId: z.string().uuid(),
  message: z.string().max(1000).optional(),
});

export const reviewEnrollmentRequestSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().max(1000).optional(),
});
```

---

## Testing

### Test Accounts

After running `npx prisma db seed`, the following test accounts are available:

**Teachers:**
- Active: `teacher@fatiha.ru` / `admin123`
- Pending: `pending.teacher@example.com` / `admin123`
- Rejected: `rejected.teacher@example.com` / `admin123`

**Students:**
- Enrolled: `ali@student.ru` / `student123`
- With enrollment request: `new.student1@example.com` / `admin123`

**Admin:**
- `admin@fatiha.ru` / `admin123`

### Testing Workflows

**Teacher Registration:**
1. Visit `/auth/register/teacher`
2. Fill Step 1 form (email, password, name)
3. Check logs for verification email preview URL
4. Click verification link
5. Fill Step 2 form (profile details)
6. Login as admin, visit `/admin/teacher-applications`
7. Approve or reject application
8. Check teacher can access `/teacher` (if approved)

**Student Enrollment:**
1. Login as student
2. Visit `/catalog`
3. Click "Подать заявку" on a course
4. Fill enrollment form
5. Upload payment proof
6. Login as teacher
7. Review request in teacher dashboard
8. Approve and confirm payment
9. Verify student can access course

---

## Additional Documentation

For detailed workflow diagrams and business logic, see:
- `docs/workflows/teacher-registration-flow.md` - Complete teacher registration workflow
- `docs/workflows/student-enrollment-flow.md` - Complete enrollment workflow
- `MIGRATION_PLAN.md` - Database migration guide
- `DEPLOYMENT.md` - Production deployment instructions
- `TEACHER_REGISTRATION.md` - Implementation summary

# UI Language

All user-facing text is hardcoded in **Russian**. No internationalization library is used. When adding new features:
- Use Russian for all UI labels, buttons, error messages
- Follow existing naming patterns (e.g., "Создать" for Create, "Удалить" for Delete)
- Date/time formatting should match Russian conventions

# Testing

No test suite currently exists. When adding tests, consider:
- Prisma schema validation
- API route authorization checks
- Enrollment capacity limits
- Activity session cleanup logic
- Teacher application workflow
- Payment verification logic
- Email verification flow
