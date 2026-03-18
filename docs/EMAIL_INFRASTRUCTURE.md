# Email Infrastructure Documentation

## Overview

Email notification system for Fatiha.ru LMS. Sends automated emails for all key platform events alongside in-app notifications.

## Architecture

### Components

1. **EmailService** (`src/lib/email-service.ts`)
   - Main service for sending templated emails
   - Wraps all operations in try-catch to prevent failures from breaking core functionality
   - Logs all email operations via Pino logger

2. **Email Templates** (`src/lib/email/templates/`)
   - 9 responsive HTML email templates
   - Inline CSS for email client compatibility
   - Russian language
   - Each template exports `{ subject, html, text }` for multipart emails

3. **Email Configuration** (`src/lib/email/config.ts`)
   - Nodemailer transporter setup
   - Auto-creates Ethereal test accounts if no SMTP credentials provided
   - Supports any SMTP provider

4. **Email Scheduler** (`src/lib/email-scheduler.ts`)
   - Automated reminders using node-cron
   - Lesson starting reminders (15 minutes before)
   - Homework deadline reminders (24 hours before)

5. **NotificationService Integration** (`src/lib/notification-service.ts`)
   - Extended to send emails alongside in-app notifications
   - All existing notification methods now trigger emails

## Email Templates

### For Students

1. **lesson-starting** - Урок начнется через 15 минут
2. **new-lesson** - Новый урок опубликован
3. **homework-checked** - Домашнее задание проверено (ACCEPTED/NEEDS_REWORK/REJECTED)
4. **quiz-checked** - Тест проверен (PASSED/FAILED)
5. **homework-deadline** - Приближается дедлайн (за 24 часа)
6. **new-message** - Новое сообщение от учителя

### For Teachers

7. **homework-submitted** - Студент сдал домашнее задание
8. **quiz-submitted** - Студент сдал тест (включая голосовые)
9. **student-joined** - Новый студент присоединился к потоку

## Configuration

### Environment Variables

Add to `.env`:

```env
# For development (Ethereal auto-generated)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT="587"
SMTP_USER=""  # Leave empty for auto-generation
SMTP_PASS=""  # Leave empty for auto-generation

# For production
SMTP_HOST="smtp.gmail.com"  # or your SMTP provider
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@fatiha.ru"
SMTP_FROM_NAME="Fatiha.ru"
```

### Ethereal Email (Development)

If no SMTP credentials are provided, the system automatically creates an Ethereal test account:
- Check logs for preview URLs: `https://ethereal.email/messages`
- All emails are captured but not actually sent
- Perfect for testing without real SMTP

## Usage

### Sending Emails Directly

```typescript
import { EmailService } from "@/lib/email-service";

await EmailService.sendNewLesson("student@example.com", {
  userName: "Иван Иванов",
  lessonTitle: "Урок 5: Правила чтения",
  lessonDescription: "Изучаем основные правила",
  streamName: "Группа 1",
  lessonUrl: "http://localhost:3000/lesson/123",
  publishedDate: "15 марта 2026",
});
```

### Via NotificationService (Recommended)

```typescript
import { NotificationService } from "@/lib/notification-service";

// Creates in-app notification AND sends email automatically
await NotificationService.notifyNewLesson(streamId, lessonId);
```

### Starting Scheduled Tasks

In your server startup (e.g., `server.ts` or custom Next.js server):

```typescript
import { EmailScheduler } from "@/lib/email-scheduler";

// Start automated reminders
EmailScheduler.start();

// Stop on shutdown
process.on("SIGTERM", () => {
  EmailScheduler.stop();
});
```

## Scheduled Tasks

### Lesson Reminders
- **Frequency:** Every 5 minutes
- **Trigger:** Lessons starting in 10-20 minutes
- **Recipients:** All active students + teacher

### Homework Deadline Reminders
- **Frequency:** Every hour
- **Trigger:** Deadlines in 20-28 hours
- **Recipients:** Students who haven't submitted yet

## Error Handling

All email operations are wrapped in try-catch blocks:
- Email failures are logged but don't throw errors
- Core functionality (notifications, submissions) continues working
- Failed emails are logged with full context for debugging

## Testing

Run tests:
```bash
npm test src/lib/__tests__/email-service.test.ts
```

Tests cover:
- All 9 email templates
- Error handling (graceful failures)
- Template rendering with various data

## Production Recommendations

### SMTP Providers

**For Russian audience:**
- Mail.ru Cloud Solutions
- Unisender
- SendPulse

**International:**
- SendGrid (Twilio)
- AWS SES
- Mailgun
- Postmark

### Best Practices

1. **Use dedicated SMTP service** - Don't use Gmail for production
2. **Monitor bounce rates** - Track failed deliveries
3. **Implement unsubscribe** - Add preference management
4. **Rate limiting** - Respect SMTP provider limits
5. **Queue system** - Consider BullMQ for high-volume sending

## Troubleshooting

### Emails not sending

1. Check environment variables are set
2. Check logs for SMTP errors: `LOG_LEVEL=debug npm run dev`
3. Verify SMTP credentials with provider
4. Check firewall/network allows outbound SMTP (port 587/465)

### Preview URLs not appearing

- Only available with Ethereal Email (development mode)
- Check logs for `previewUrl` field

### Scheduled tasks not running

- Ensure `EmailScheduler.start()` is called on server startup
- Check cron expressions are valid
- Verify database has schedule data

## Future Enhancements

- [ ] Email preferences (per-user notification settings)
- [ ] Unsubscribe links
- [ ] Email queue with retry logic (BullMQ)
- [ ] Email analytics (open rates, click tracking)
- [ ] Digest emails (daily/weekly summaries)
- [ ] Attachment support (for homework files)
