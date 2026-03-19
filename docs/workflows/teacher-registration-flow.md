# Teacher Registration Workflow

## Overview
This document describes the complete teacher registration and approval workflow, including all user interactions, system processes, and state transitions.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEACHER REGISTRATION FLOW                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Teacher    │
│ visits site  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Account Creation                                      │
│ /auth/register/teacher                                        │
│                                                               │
│ Form Fields:                                                  │
│ • Email                                                       │
│ • Password (min 8 chars)                                      │
│ • Full Name                                                   │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ POST /api/auth/register/teacher
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Validate input (Zod schema)                               │
│ 2. Check email uniqueness                                     │
│ 3. Hash password (bcrypt, 10 rounds)                         │
│ 4. Generate verification token (UUID)                         │
│ 5. Create User record:                                        │
│    - role: TEACHER                                            │
│    - status: PENDING_VERIFICATION                             │
│    - emailVerified: false                                     │
│ 6. Send verification email                                    │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Email sent with verification link
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Teacher receives email:                                       │
│ "Подтвердите ваш email - Fatiha.ru"                         │
│                                                               │
│ Link: /auth/verify-email?token={uuid}                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Teacher clicks link
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Email Verification                                            │
│ /auth/verify-email?token={uuid}                              │
│                                                               │
│ POST /api/auth/verify-email                                  │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Find user by verificationToken                            │
│ 2. Validate token exists and not expired                     │
│ 3. Update User:                                               │
│    - emailVerified: true                                      │
│    - emailVerifiedAt: now()                                   │
│    - verificationToken: null                                  │
│    - status: PENDING_APPROVAL                                 │
│ 4. Redirect to Step 2                                         │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Auto-redirect after 3 seconds
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Teacher Profile                                       │
│ /auth/register/teacher (same page, step 2)                   │
│                                                               │
│ Form Fields:                                                  │
│ • Bio (min 50 chars, max 5000)                               │
│ • Subjects (array, min 1)                                     │
│ • Experience (min 20 chars, max 5000)                        │
│ • Qualifications (min 20 chars, max 5000)                    │
│ • WhatsApp Phone (regex: +?\d{10,15})                        │
│ • Documents URLs (array, min 1)                              │
│ • Video Intro URL (optional)                                  │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ POST /api/teacher/profile
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Verify user is authenticated                              │
│ 2. Verify user.role === TEACHER                              │
│ 3. Verify user.emailVerified === true                        │
│ 4. Validate input (Zod schema)                               │
│ 5. Create TeacherProfile record                              │
│ 6. Update User.status to PENDING_APPROVAL                    │
│ 7. Notify all admins (in-app notification)                   │
│ 8. Redirect to /teacher/pending-approval                     │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Waiting Page                                                  │
│ /teacher/pending-approval                                     │
│                                                               │
│ Shows:                                                        │
│ • "Заявка на рассмотрении" message                          │
│ • Expected timeline (2-3 business days)                      │
│ • Next steps explanation                                      │
│ • WhatsApp contact info                                       │
│ • Refresh button                                              │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Middleware blocks access to /teacher/* routes
       │ (except /teacher/pending-approval)
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    ADMIN REVIEW PROCESS                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────┐
│    Admin     │
│ receives     │
│ notification │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Admin Panel                                                   │
│ /admin/teacher-applications                                   │
│                                                               │
│ Filters:                                                      │
│ • На рассмотрении (PENDING_APPROVAL)                         │
│ • Одобренные (ACTIVE)                                         │
│ • Отклоненные (REJECTED)                                      │
│ • Все                                                         │
│                                                               │
│ GET /api/admin/teacher-applications?status=pending           │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Admin clicks "Подробнее"
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Application Details Modal                                     │
│                                                               │
│ Shows:                                                        │
│ • Full name, email                                            │
│ • Bio                                                         │
│ • Subjects (tags)                                             │
│ • Experience                                                  │
│ • Qualifications                                              │
│ • WhatsApp (clickable link to wa.me)                         │
│ • Documents (links to view)                                   │
│ • Video intro (link if provided)                              │
│                                                               │
│ Actions:                                                      │
│ • Одобрить (Approve)                                          │
│ • Отклонить (Reject)                                          │
└──────┬───────────────────────────────────────────────────────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
   APPROVE           REJECT          CONTACT VIA
                                     WHATSAPP

┌──────────────────────────────────────────────────────────────┐
│ APPROVAL PATH                                                 │
│                                                               │
│ Admin clicks "Одобрить"                                       │
│ Modal opens with optional admin notes field                  │
│                                                               │
│ POST /api/admin/teacher-applications/{id}/approve            │
│ Body: { adminNotes?: string }                                │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Verify admin role                                          │
│ 2. Find teacher by ID                                         │
│ 3. Update User.status to ACTIVE                              │
│ 4. Update TeacherProfile:                                     │
│    - reviewedById: admin.id                                   │
│    - reviewedAt: now()                                        │
│    - adminNotes: (if provided)                                │
│ 5. Create in-app notification for teacher                    │
│ 6. Send approval email                                        │
│ 7. Log action                                                 │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Teacher receives:                                             │
│ • In-app notification: "Заявка одобрена"                     │
│ • Email: "Ваша заявка одобрена - Fatiha.ru"                 │
│   with login link                                             │
│                                                               │
│ Next login:                                                   │
│ • JWT token includes status: ACTIVE                           │
│ • Middleware allows access to /teacher/*                     │
│ • Teacher can create courses, streams, lessons               │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ REJECTION PATH                                                │
│                                                               │
│ Admin clicks "Отклонить"                                      │
│ Modal opens with required rejection reason field             │
│                                                               │
│ POST /api/admin/teacher-applications/{id}/reject             │
│ Body: {                                                       │
│   rejectionReason: string (required, min 10 chars)           │
│   adminNotes?: string                                         │
│ }                                                             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Verify admin role                                          │
│ 2. Validate rejection reason provided                        │
│ 3. Find teacher by ID                                         │
│ 4. Update User.status to REJECTED                            │
│ 5. Update TeacherProfile:                                     │
│    - reviewedById: admin.id                                   │
│    - reviewedAt: now()                                        │
│    - rejectionReason: (visible to teacher)                    │
│    - adminNotes: (internal only)                              │
│ 6. Create in-app notification for teacher                    │
│ 7. Send rejection email with reason                          │
│ 8. Log action                                                 │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Teacher receives:                                             │
│ • In-app notification: "Заявка отклонена"                    │
│ • Email: "Решение по вашей заявке - Fatiha.ru"              │
│   with rejection reason                                       │
│                                                               │
│ Next login:                                                   │
│ • JWT token includes status: REJECTED                         │
│ • Middleware redirects to /auth/register/teacher             │
│ • Teacher can re-apply after addressing issues               │
└───────────────────────────────────────────────────────────────┘
```

## State Transitions

### User Status Flow

```
PENDING_VERIFICATION
    │
    │ (email verified)
    ▼
PENDING_APPROVAL
    │
    ├─────────────┬─────────────┐
    │             │             │
    ▼             ▼             ▼
  ACTIVE      REJECTED      SUSPENDED
    │             │             │
    │             │             │
    │             └─────────────┘
    │                   │
    │                   │ (can re-apply)
    │                   ▼
    │           PENDING_VERIFICATION
    │                   │
    └───────────────────┘
```

### Middleware Behavior by Status

| Status | /teacher/* Access | Redirect To |
|--------|------------------|-------------|
| PENDING_VERIFICATION | ❌ Blocked | /api/auth/signin |
| PENDING_APPROVAL | ⚠️ Only /teacher/pending-approval | /teacher/pending-approval |
| ACTIVE | ✅ Full Access | - |
| REJECTED | ❌ Blocked | /auth/register/teacher |
| SUSPENDED | ❌ Blocked | /unauthorized |

## API Endpoints

### Public Endpoints

#### POST /api/auth/register/teacher
**Purpose:** Create teacher account (Step 1)

**Request:**
```json
{
  "email": "teacher@example.com",
  "password": "securepass123",
  "name": "Иван Иванов"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Регистрация успешна. Проверьте email для подтверждения адреса.",
  "userId": "uuid"
}
```

**Errors:**
- 409: Email already exists
- 400: Validation error

---

#### POST /api/auth/verify-email
**Purpose:** Verify email address

**Request:**
```json
{
  "token": "uuid-verification-token"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email успешно подтвержден",
  "requiresProfile": true,
  "userId": "uuid"
}
```

**Errors:**
- 404: Invalid or expired token
- 400: Validation error

---

#### POST /api/auth/resend-verification
**Purpose:** Resend verification email

**Request:**
```json
{
  "email": "teacher@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Письмо с подтверждением отправлено повторно"
}
```

---

### Authenticated Endpoints

#### POST /api/teacher/profile
**Purpose:** Complete teacher profile (Step 2)

**Auth:** Required (session)

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

**Response (Success):**
```json
{
  "success": true,
  "message": "Анкета отправлена на рассмотрение администрации"
}
```

**Errors:**
- 401: Not authenticated
- 403: Not a teacher or email not verified
- 400: Validation error (min/max lengths, required fields)

---

### Admin Endpoints

#### GET /api/admin/teacher-applications
**Purpose:** List teacher applications

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
- In-app notification created
- Email sent to teacher

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
- In-app notification created
- Email sent to teacher with reason

---

## Email Templates

### 1. Email Verification
**Subject:** Подтвердите ваш email - Fatiha.ru

**Content:**
- Greeting with user name
- Explanation of verification requirement
- CTA button: "Подтвердить email"
- Plain text link as fallback
- Note about ignoring if not registered

---

### 2. Application Approved
**Subject:** Ваша заявка одобрена - Fatiha.ru

**Content:**
- Congratulations message
- Explanation of next steps
- CTA button: "Войти в систему"
- Support contact info

---

### 3. Application Rejected
**Subject:** Решение по вашей заявке - Fatiha.ru

**Content:**
- Polite rejection message
- Rejection reason (highlighted)
- Encouragement to re-apply after addressing issues
- Support contact info

---

## Security Considerations

### Password Security
- Minimum 8 characters required
- Hashed with bcrypt (10 rounds)
- Never stored or transmitted in plain text

### Email Verification
- UUID tokens (cryptographically secure)
- Single-use tokens (cleared after verification)
- No expiration (user can request resend)

### Authorization
- Middleware checks JWT token on every request
- Token includes user status (refreshed on each request)
- Role-based access control (RBAC)

### Rate Limiting
- Registration: 5 attempts per 15 minutes per IP
- Email verification: 10 attempts per hour per IP
- Resend verification: 3 attempts per hour per email

### Data Validation
- All inputs validated with Zod schemas
- SQL injection prevented by Prisma ORM
- XSS prevented by React's automatic escaping

---

## Error Handling

### User-Facing Errors
- Clear, actionable error messages in Russian
- No technical details exposed
- Suggestions for resolution

### System Errors
- Logged with full context (Pino logger)
- Includes request details, user ID, timestamp
- Alerts sent for critical errors

---

## Performance Considerations

### Database Queries
- Indexed fields: userId, reviewedById, verificationToken
- Efficient joins with Prisma includes
- Connection pooling configured

### Email Sending
- Async processing (doesn't block response)
- Retry logic for failed sends
- Fallback to console in development

### Caching
- JWT tokens cached in session
- Static assets cached by Next.js
- No database caching needed (low traffic)

---

## Testing Checklist

- [ ] Teacher can register with valid email/password
- [ ] Duplicate email is rejected
- [ ] Verification email is sent
- [ ] Verification link works
- [ ] Expired/invalid tokens are rejected
- [ ] Profile form validates all fields
- [ ] Documents must be valid URLs
- [ ] WhatsApp phone validates format
- [ ] Admin can see pending applications
- [ ] Admin can approve application
- [ ] Admin can reject with reason
- [ ] Approved teacher can access /teacher
- [ ] Pending teacher is blocked from /teacher
- [ ] Rejected teacher can re-register
- [ ] Email notifications are sent
- [ ] In-app notifications are created
- [ ] WhatsApp link works in admin panel
- [ ] Middleware redirects work correctly
- [ ] JWT token includes status
- [ ] Status refreshes on each request

---

## Future Enhancements

1. **File Upload System**
   - Direct upload instead of URL links
   - S3 or similar storage integration
   - Automatic virus scanning

2. **Video Recording**
   - In-browser video recording for intro
   - Automatic upload and transcoding

3. **Interview Scheduling**
   - Calendar integration for admin interviews
   - Automated reminder emails

4. **Background Checks**
   - Integration with verification services
   - Automated document verification

5. **Teacher Onboarding**
   - Step-by-step onboarding checklist
   - Tutorial videos
   - Sample course templates

6. **Analytics Dashboard**
   - Application metrics
   - Approval/rejection rates
   - Time-to-approval tracking
