# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fatiha.ru is a Learning Management System (LMS) for Islamic education with live video streaming capabilities. Built with Next.js 16 (App Router), it supports role-based access for teachers and students, featuring live classes via Jitsi Meet, homework assignments, quizzes (multiple-choice and voice), and real-time activity tracking.

## Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:3000

# Database
npx prisma generate      # Generate Prisma Client after schema changes
npx prisma migrate dev   # Create and apply migration (replaces db push)
npx prisma migrate deploy # Apply migrations in production
npx prisma db seed       # Seed database with test data (creates admin@fatiha.ru / admin123)
npx prisma studio        # Open Prisma Studio GUI

# Production
npm run build            # Build for production
npm start                # Start production server

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

## Architecture

### Authentication & Authorization

- **NextAuth** with credentials provider (email/password + bcrypt)
- JWT-based sessions (not database sessions)
- Three roles: `STUDENT`, `TEACHER`, `ADMIN`
- Middleware (`src/middleware.ts`) protects `/teacher/*` and `/student/*` routes
- Role stored in JWT token via callbacks in `src/app/api/auth/[...nextauth]/route.ts`

### Database Patterns

**Prisma Singleton**: Always import from `src/lib/prisma.ts`, never instantiate `new PrismaClient()` directly. This prevents connection pool exhaustion during Next.js hot-reload in development.

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
- No JWT tokens currently used (public Jitsi instance) - see PRE_MORTEM.md for security concerns
- Lesson types: `LIVE` (Jitsi), `VIDEO` (external URL), `TEXT` (Markdown content rendered with ReactMarkdown)

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

## API Route Patterns

**Teacher Routes** (`/api/teacher/*`):
1. Check session with `getServerSession(authOptions)`
2. Verify role is `TEACHER` or `ADMIN`
3. Verify ownership (e.g., `stream.teacherId === session.user.id`)
4. Return `NextResponse.json()` with appropriate status codes

Example: `/api/teacher/manage-student` handles multiple actions via `action` field in request body.

**Student Routes** (e.g., `/api/quiz/[quizId]/submit`, `/api/teacher/homework/[assignmentId]/submit`):
1. Check session exists
2. Verify enrollment in the relevant stream (via `Enrollment` table)
3. Use `upsert` pattern to allow resubmissions (updates existing submission)
4. Reset grading fields (`status: SUBMITTED`, clear `checkedById`, `checkedAt`) on resubmission

## Important Scalability Considerations (from PRE_MORTEM.md)

### Jitsi Videobridge Scaling
- Default single JVB setup will bottleneck at ~200 concurrent participants
- Consider Jitsi Octo for multi-bridge cascading
- Enforce "presenter mode" for classes >15 people (teacher broadcasts, students audio-only)

### Thundering Herd on Class Start
- 500+ students joining simultaneously will saturate database connection pool
- Mitigation: Use Redis/KV for `InviteToken` lookups instead of PostgreSQL
- Consider PgBouncer with read-replicas for session validation

### Real-Time Access Revocation
- Kicking a student updates database but doesn't terminate active Jitsi connection
- Student remains in video call until browser refresh
- Solution: Implement Jitsi JWT tokens + server-side XMPP API to force disconnect

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

## Key Dependencies

- **Next.js 16** (App Router): Server/client components, API routes, middleware
- **Prisma 6**: ORM with PostgreSQL, includes seeding support
- **NextAuth 4**: Authentication with JWT sessions
- **React 19**: Latest React with improved server components
- **Tailwind CSS 4**: Utility-first styling
- **@dnd-kit**: Drag-and-drop for lesson reordering in teacher UI
- **react-markdown**: Renders lesson content for TEXT type lessons
- **bcryptjs**: Password hashing (10 rounds)
- **pino**: Structured logging with JSON output in production

## Error Handling

All API routes use centralized error handling via `withErrorHandling` middleware (`src/lib/api-handler.ts`):
- Typed error classes: `AuthError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ValidationError` (400), `ConflictError` (409)
- Automatic Prisma error handling (P2002 for duplicates, P2025 for not found)
- Structured logging with request context (path, method, query, error details)
- Consistent JSON error format: `{ error: string, code: string, fields?: object }`

When creating new API routes, always wrap handlers with `withErrorHandling` and throw typed errors instead of returning error responses manually.

## UI Language

All user-facing text is hardcoded in **Russian**. No internationalization library is used. When adding new features:
- Use Russian for all UI labels, buttons, error messages
- Follow existing naming patterns (e.g., "Создать" for Create, "Удалить" for Delete)
- Date/time formatting should match Russian conventions

## Testing

No test suite currently exists. When adding tests, consider:
- Prisma schema validation
- API route authorization checks
- Enrollment capacity limits
- Activity session cleanup logic

## Common Tasks

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
