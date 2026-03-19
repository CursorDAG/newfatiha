# Student Enrollment Workflow

## Overview
This document describes the student enrollment request system, where students apply to join streams and teachers/admins review and approve applications with payment verification.

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  STUDENT ENROLLMENT FLOW                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Student    │
│ browses      │
│ catalog      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Course Catalog                                                │
│ /catalog                                                      │
│                                                               │
│ Shows:                                                        │
│ • Published courses                                           │
│ • Course descriptions                                         │
│ • Available streams                                           │
│ • Teacher info                                                │
│ • Price (if set)                                              │
│ • Schedule                                                    │
│                                                               │
│ GET /api/catalog/courses                                     │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Student clicks "Подать заявку"
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Enrollment Request Form                                       │
│ /catalog/[courseId]/apply                                     │
│                                                               │
│ Form Fields:                                                  │
│ • Stream selection (dropdown)                                 │
│ • Message to teacher (optional, max 1000 chars)              │
│                                                               │
│ Shows:                                                        │
│ • Course details                                              │
│ • Stream schedule                                             │
│ • Capacity status                                             │
│ • Payment instructions                                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ POST /api/enrollment-requests
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Verify user is authenticated                              │
│ 2. Verify user.role === STUDENT                              │
│ 3. Check stream capacity not exceeded                        │
│ 4. Check no existing active enrollment                       │
│ 5. Check no pending request for same stream                  │
│ 6. Create EnrollmentRequest:                                 │
│    - status: PENDING                                          │
│    - userId, streamId                                         │
│    - message (if provided)                                    │
│ 7. Notify teacher (in-app + email)                           │
│ 8. Return payment instructions                                │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Request Submitted Page                                        │
│ /enrollment-requests/[id]/pending                             │
│                                                               │
│ Shows:                                                        │
│ • "Заявка отправлена" message                                │
│ • Payment instructions                                        │
│ • Bank details / payment methods                             │
│ • Upload payment proof button                                │
│ • Request status                                              │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Student makes payment
       │ Student uploads proof
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Upload Payment Proof                                          │
│                                                               │
│ POST /api/enrollment-requests/[id]/payment-proof             │
│                                                               │
│ Form Fields:                                                  │
│ • Payment method (BANK_TRANSFER, CARD, CASH, OTHER)         │
│ • Transaction ID (optional)                                   │
│ • Amount paid                                                 │
│ • Payment date                                                │
│ • Proof image/document URL                                    │
│ • Notes (optional)                                            │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Verify request belongs to user                            │
│ 2. Verify request status is PENDING or APPROVED              │
│ 3. Create PaymentProof record                                │
│ 4. Update EnrollmentRequest.status to PAYMENT_PENDING        │
│ 5. Notify teacher/admin about payment proof                  │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    TEACHER/ADMIN REVIEW                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Teacher    │
│ receives     │
│ notification │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Teacher Dashboard - Enrollment Requests Tab                   │
│ /teacher (Enrollment Requests section)                        │
│                                                               │
│ Shows list of requests:                                       │
│ • Student name, email                                         │
│ • Stream name                                                 │
│ • Status (PENDING, PAYMENT_PENDING, etc.)                    │
│ • Request date                                                │
│ • Message from student                                        │
│ • Payment proof (if uploaded)                                 │
│                                                               │
│ GET /api/teacher/enrollment-requests                         │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Teacher clicks on request
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Request Details Modal                                         │
│                                                               │
│ Shows:                                                        │
│ • Student profile                                             │
│ • Request message                                             │
│ • Stream details                                              │
│ • Current capacity                                            │
│ • Payment proof (if uploaded):                                │
│   - Payment method                                            │
│   - Amount                                                    │
│   - Transaction ID                                            │
│   - Proof document/image                                      │
│   - Payment date                                              │
│                                                               │
│ Actions:                                                      │
│ • Одобрить (Approve)                                          │
│ • Отклонить (Reject)                                          │
│ • Подтвердить оплату (Confirm Payment)                       │
└──────┬───────────────────────────────────────────────────────┘
       │
       ├─────────────────┬─────────────────┬─────────────────┐
       │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼
   APPROVE           REJECT        CONFIRM PAYMENT    REQUEST MORE INFO

┌──────────────────────────────────────────────────────────────┐
│ APPROVAL PATH (Initial Review)                               │
│                                                               │
│ Teacher clicks "Одобрить"                                     │
│                                                               │
│ POST /api/teacher/enrollment-requests/[id]/review            │
│ Body: {                                                       │
│   action: "APPROVE",                                          │
│   rejectionReason?: null                                      │
│ }                                                             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Verify teacher owns the stream                            │
│ 2. Check stream capacity                                      │
│ 3. Update EnrollmentRequest.status to APPROVED               │
│ 4. Set reviewedById, reviewedAt                              │
│ 5. Notify student (in-app + email)                           │
│ 6. Send payment instructions if not paid                     │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Student receives notification:                                │
│ "Заявка одобрена! Ожидаем подтверждения оплаты"             │
│                                                               │
│ If payment not yet uploaded:                                  │
│ • Email with payment instructions                             │
│ • Link to upload payment proof                                │
│                                                               │
│ If payment already uploaded:                                  │
│ • Waiting for payment confirmation                            │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ PAYMENT CONFIRMATION PATH                                     │
│                                                               │
│ Teacher/Admin clicks "Подтвердить оплату"                    │
│                                                               │
│ POST /api/teacher/enrollment-requests/[id]/confirm-payment   │
│ Body: { requestId: "uuid" }                                   │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Verify teacher/admin role                                 │
│ 2. Verify payment proof exists                               │
│ 3. Update EnrollmentRequest.status to PAYMENT_CONFIRMED      │
│ 4. Create Enrollment record:                                 │
│    - userId, streamId                                         │
│    - status: ACTIVE                                           │
│ 5. Update PaymentProof.verifiedAt, verifiedById              │
│ 6. Notify student (in-app + email)                           │
│ 7. Notify teacher about new student                          │
│ 8. Create welcome notification with course materials         │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Student receives:                                             │
│ • In-app notification: "Добро пожаловать в курс!"           │
│ • Email: "Оплата подтверждена - Fatiha.ru"                  │
│   with course access link                                     │
│                                                               │
│ Student can now:                                              │
│ • Access /student dashboard                                   │
│ • View lessons in the stream                                  │
│ • Join live classes                                           │
│ • Submit homework                                             │
│ • Take quizzes                                                │
└───────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ REJECTION PATH                                                │
│                                                               │
│ Teacher clicks "Отклонить"                                    │
│ Modal opens with required rejection reason field             │
│                                                               │
│ POST /api/teacher/enrollment-requests/[id]/review            │
│ Body: {                                                       │
│   action: "REJECT",                                           │
│   rejectionReason: "Группа заполнена" (required)             │
│ }                                                             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ System Actions:                                               │
│ 1. Verify teacher owns the stream                            │
│ 2. Validate rejection reason provided                        │
│ 3. Update EnrollmentRequest.status to REJECTED               │
│ 4. Set reviewedById, reviewedAt, rejectionReason             │
│ 5. Notify student (in-app + email)                           │
│ 6. Log action                                                 │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Student receives:                                             │
│ • In-app notification: "Заявка отклонена"                    │
│ • Email with rejection reason                                 │
│                                                               │
│ Student can:                                                  │
│ • Apply to different stream                                   │
│ • Contact teacher for clarification                          │
│ • Re-apply later if reason addressed                         │
└───────────────────────────────────────────────────────────────┘
```

## State Transitions

### EnrollmentRequest Status Flow

```
PENDING
    │
    ├─────────────┬─────────────┐
    │             │             │
    │             ▼             ▼
    │         APPROVED      REJECTED
    │             │             │
    │             │             └─> (End state)
    │             │
    │             ▼
    │      PAYMENT_PENDING
    │             │
    │             ├─────────────┐
    │             │             │
    │             ▼             ▼
    │    PAYMENT_CONFIRMED  REJECTED
    │             │             │
    │             │             └─> (End state)
    │             ▼
    │      (Enrollment created)
    │             │
    └─────────────┘
```

### Alternative Flow: Payment First

```
PENDING
    │
    │ (student uploads payment before approval)
    ▼
PAYMENT_PENDING
    │
    ├─────────────┬─────────────┐
    │             │             │
    ▼             ▼             ▼
APPROVED      REJECTED    (stays PAYMENT_PENDING)
    │             │
    │             └─> (End state)
    ▼
PAYMENT_CONFIRMED
    │
    ▼
(Enrollment created)
```

## API Endpoints

### Public/Student Endpoints

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
        "name": "Устаз Ахмад",
        "bio": "..."
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

**Errors:**
- 401: Not authenticated
- 403: Not a student
- 409: Already enrolled or pending request exists
- 400: Stream at capacity

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

---

#### GET /api/enrollment-requests/my
**Purpose:** Get student's own enrollment requests

**Auth:** Required (student role)

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "uuid",
      "status": "PAYMENT_PENDING",
      "stream": {
        "name": "Группа А",
        "course": {
          "title": "Основы Таджвида"
        }
      },
      "createdAt": "2026-03-19T10:00:00Z",
      "reviewedAt": null,
      "rejectionReason": null,
      "paymentProof": {
        "amount": 5000,
        "paymentMethod": "BANK_TRANSFER",
        "verifiedAt": null
      }
    }
  ]
}
```

---

### Teacher Endpoints

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
        "transactionId": "TXN123456",
        "proofUrl": "https://...",
        "paidAt": "2026-03-19T11:00:00Z"
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
  "rejectionReason": "Группа заполнена. Попробуйте Группу Б."
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
- EnrollmentRequest.status → PAYMENT_CONFIRMED
- Enrollment created with status ACTIVE
- PaymentProof verified
- Student notified
- Teacher notified about new student

---

## Business Rules

### Capacity Management
- Stream has `capacity` field (default 30)
- System counts active enrollments
- Blocks new requests when capacity reached
- Teachers can override capacity (manual approval)

### Payment Verification
- Payment proof is optional initially
- Can be uploaded before or after approval
- Teacher/admin must verify payment
- Only verified payments create enrollments

### Request Expiration
- Pending requests don't expire automatically
- Teachers can manually reject old requests
- Students can cancel their own pending requests

### Duplicate Prevention
- One active enrollment per student per stream
- One pending request per student per stream
- Can have multiple requests for different streams

### Gender Restrictions
- Streams have `genderType`: MALE_ONLY, FEMALE_ONLY, MIXED
- System checks student gender against stream type
- Blocks enrollment if gender doesn't match

---

## Notification Types

### Student Notifications

1. **Request Submitted**
   - Type: ENROLLMENT_REQUEST_SUBMITTED
   - Trigger: After creating request
   - Content: "Заявка отправлена на рассмотрение"

2. **Request Approved**
   - Type: ENROLLMENT_REQUEST_APPROVED
   - Trigger: Teacher approves
   - Content: "Заявка одобрена! Загрузите подтверждение оплаты"

3. **Request Rejected**
   - Type: ENROLLMENT_REQUEST_REJECTED
   - Trigger: Teacher rejects
   - Content: Rejection reason

4. **Payment Confirmed**
   - Type: PAYMENT_CONFIRMED
   - Trigger: Payment verified
   - Content: "Добро пожаловать в курс!"

### Teacher Notifications

1. **New Request**
   - Type: ENROLLMENT_REQUEST_SUBMITTED
   - Trigger: Student submits request
   - Content: "Новая заявка от {student}"

2. **Payment Proof Uploaded**
   - Type: PAYMENT_CONFIRMED
   - Trigger: Student uploads proof
   - Content: "Студент загрузил подтверждение оплаты"

3. **Student Enrolled**
   - Type: STUDENT_JOINED
   - Trigger: Payment confirmed
   - Content: "Новый студент зачислен в группу"

---

## Email Templates

### 1. Request Submitted (Student)
**Subject:** Заявка отправлена - Fatiha.ru

**Content:**
- Confirmation of request submission
- Course and stream details
- Payment instructions
- Expected review timeline

---

### 2. Request Approved (Student)
**Subject:** Заявка одобрена - Fatiha.ru

**Content:**
- Approval notification
- Payment instructions (if not paid)
- Upload payment proof link
- Teacher contact info

---

### 3. Payment Confirmed (Student)
**Subject:** Добро пожаловать в курс - Fatiha.ru

**Content:**
- Welcome message
- Course access link
- Schedule details
- First lesson information
- Teacher contact

---

### 4. Request Rejected (Student)
**Subject:** Решение по заявке - Fatiha.ru

**Content:**
- Polite rejection message
- Rejection reason
- Alternative suggestions
- Re-application instructions

---

### 5. New Request (Teacher)
**Subject:** Новая заявка на зачисление - Fatiha.ru

**Content:**
- Student information
- Request message
- Stream details
- Review link

---

## Security Considerations

### Authorization
- Students can only view/edit their own requests
- Teachers can only manage requests for their streams
- Admins can manage all requests

### Payment Security
- Payment proofs stored as URLs (not files)
- No sensitive payment data stored
- Manual verification required

### Capacity Enforcement
- Atomic checks prevent race conditions
- Database constraints ensure integrity
- Teachers notified when capacity reached

### Fraud Prevention
- One request per student per stream
- Payment verification required
- Admin audit trail

---

## Performance Considerations

### Database Queries
- Indexed fields: userId, streamId, status
- Efficient joins for request lists
- Pagination for large result sets

### Notification Batching
- Bulk notifications for multiple requests
- Async email sending
- Queue for high-volume periods

### Caching
- Course catalog cached (5 minutes)
- Stream capacity cached (1 minute)
- Invalidated on enrollment changes

---

## Testing Checklist

- [ ] Student can browse catalog
- [ ] Student can submit request
- [ ] Duplicate requests blocked
- [ ] Capacity limits enforced
- [ ] Gender restrictions work
- [ ] Payment proof uploads
- [ ] Teacher sees requests
- [ ] Teacher can approve/reject
- [ ] Payment confirmation works
- [ ] Enrollment created correctly
- [ ] Notifications sent
- [ ] Emails delivered
- [ ] Request cancellation works
- [ ] Admin can override capacity
- [ ] Audit trail complete

---

## Future Enhancements

1. **Automated Payment Integration**
   - Stripe/PayPal integration
   - Automatic payment verification
   - Refund handling

2. **Waitlist System**
   - Auto-enroll when spot opens
   - Priority queue management

3. **Installment Plans**
   - Multiple payment support
   - Payment schedule tracking

4. **Scholarship System**
   - Discount codes
   - Financial aid applications

5. **Group Discounts**
   - Family/friend discounts
   - Bulk enrollment pricing

6. **Trial Period**
   - Free trial lessons
   - Money-back guarantee

7. **Advanced Filtering**
   - Filter by price range
   - Filter by schedule
   - Filter by teacher rating
