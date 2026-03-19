# Production Deployment Checklist - Fatiha.ru LMS

**Version:** MVP + Teacher Registration & Student Enrollment
**Date:** 2026-03-19
**Status:** ⚠️ NOT READY - 4 Blockers

---

## Pre-Deployment Status

**Overall Readiness: 60%**

| Component | Status | Blocker |
|-----------|--------|---------|
| Database Schema | ✅ Ready | No |
| Authentication | ✅ Ready | No |
| API Endpoints | ❌ Not Ready | **YES** |
| UI Components | ❌ Not Ready | **YES** |
| Security | ❌ Not Ready | **YES** |
| Dependencies | ❌ Not Ready | **YES** |
| Testing | ✅ Complete | No |
| Documentation | ✅ Complete | No |

---

## 🔴 CRITICAL BLOCKERS (Must Fix Before Deploy)

### BLOCKER #1: Missing API Endpoint
- [ ] **Create POST /api/teacher/profile endpoint**
  - File: `src/app/api/teacher/profile/route.ts`
  - Add POST handler for teacher profile creation
  - Validate with `registerTeacherStep2Schema`
  - Update user status to PENDING_APPROVAL
  - Send admin notifications
  - **Estimated Time:** 4 hours
  - **Priority:** CRITICAL
  - **Assigned To:** Backend Developer

### BLOCKER #2: Next.js Security Vulnerabilities
- [ ] **Update Next.js to version 16.2.0 or later**
  - Current: 16.0.0-16.1.6 (has CVEs)
  - Command: `npm install next@16.2.0`
  - Test after update
  - **Estimated Time:** 1 hour
  - **Priority:** CRITICAL
  - **Assigned To:** DevOps

### BLOCKER #3: Password Security Issue
- [ ] **Fix temporary password exposure in API response**
  - File: `src/app/api/admin/users/[userId]/reset-password/route.ts`
  - Remove password from response body
  - Send password via email only
  - **Estimated Time:** 2 hours
  - **Priority:** CRITICAL
  - **Assigned To:** Backend Developer

### BLOCKER #4: Deprecated React API
- [ ] **Replace onKeyPress with onKeyDown**
  - File: `src/app/auth/register/teacher/page.tsx` (lines 242, 326)
  - Replace all `onKeyPress` with `onKeyDown`
  - Test form submission
  - **Estimated Time:** 1 hour
  - **Priority:** CRITICAL
  - **Assigned To:** Frontend Developer

**Total Blocker Fix Time: 8 hours (1 day)**

---

## 🟡 HIGH PRIORITY (Should Fix Before Deploy)

### API Bugs
- [ ] **Fix status transition in email verification**
  - File: `src/app/api/auth/verify-email/route.ts`
  - Change: `user.status` → `"PENDING_APPROVAL"` for TEACHER
  - **Time:** 30 minutes

- [ ] **Fix admin filter in enrollment requests**
  - File: `src/app/api/enrollment-requests/route.ts`
  - Remove teacherId filter for ADMIN role
  - **Time:** 30 minutes

### Security
- [ ] **Add rate limiting to email verification endpoints**
  - Files: `/api/auth/verify-email`, `/api/auth/resend-verification`
  - Use `rateLimit()` helper
  - **Time:** 2 hours

### UI Issues
- [ ] **Fix unsafe type assertions**
  - File: `src/app/admin/teacher-applications/page.tsx` (line 160)
  - Replace `as any` with proper typing
  - **Time:** 1 hour

- [ ] **Add pagination to large lists**
  - Files: courses page, applications, notifications
  - Implement pagination or infinite scroll
  - **Time:** 8 hours

### Logging
- [ ] **Standardize logging (replace console.* with logger.*)**
  - Multiple files (12+ locations)
  - Use structured logging
  - **Time:** 4 hours

**Total High Priority Time: 16 hours (2 days)**

---

## 📋 MEDIUM PRIORITY (Nice to Have)

### Security Headers
- [ ] Add security headers in `next.config.ts`
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection
  - Referrer-Policy
  - **Time:** 2 hours

### Accessibility
- [ ] Add ARIA labels to interactive elements
- [ ] Fix keyboard navigation in modals
- [ ] Test with screen readers
- **Time:** 16 hours

### Code Quality
- [ ] Fix useEffect dependencies (5+ components)
- [ ] Standardize token generation
- [ ] Update Vitest dependencies
- **Time:** 8 hours

**Total Medium Priority Time: 26 hours (3-4 days)**

---

## Environment Configuration

### Required Environment Variables

#### Production
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=50"

# Authentication
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
NEXTAUTH_URL="https://fatiha.ru"

# Email (Required)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@fatiha.ru"
SMTP_PASS="<secure-password>"
SMTP_FROM="Fatiha.ru <noreply@fatiha.ru>"

# S3 Storage (Recommended)
S3_BUCKET="fatiha-recordings"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="<access-key>"
S3_SECRET_ACCESS_KEY="<secret-key>"
S3_PUBLIC_URL="https://cdn.fatiha.ru"

# Sentry (Recommended)
SENTRY_DSN="<sentry-dsn>"
NEXT_PUBLIC_SENTRY_DSN="<public-sentry-dsn>"

# Logging
LOG_LEVEL="info"
NODE_ENV="production"
```

### Optional Variables
```bash
# Jitsi JWT (for authenticated rooms)
JITSI_DOMAIN="meet.jit.si"
JITSI_JWT_APP_ID="<app-id>"
JITSI_JWT_SECRET="<jwt-secret>"
```

---

## Database Checklist

### Pre-Deployment
- [x] All migrations applied
- [x] Schema validated
- [x] Indexes created
- [x] Foreign keys configured
- [ ] Backup strategy configured
- [ ] Connection pooling configured (50 connections recommended)

### Migration Commands
```bash
# Apply migrations
npx prisma migrate deploy

# Verify schema
npx prisma validate

# Generate client
npx prisma generate
```

---

## Security Checklist

### Authentication & Authorization
- [x] JWT secret configured
- [x] Session expiration set
- [x] Role-based access control implemented
- [x] Middleware protection on routes
- [ ] Rate limiting on all auth endpoints

### Data Protection
- [x] Passwords hashed with bcrypt
- [x] Sensitive data filtered from logs
- [x] SQL injection protection (Prisma)
- [ ] XSS protection headers configured
- [ ] CSRF protection verified

### API Security
- [x] Input validation with Zod
- [x] Error handling centralized
- [x] Rate limiting on critical endpoints
- [ ] Rate limiting on all endpoints
- [ ] API documentation updated

### Dependencies
- [ ] Next.js updated to 16.2.0+
- [ ] All npm audit issues resolved
- [ ] Dependency scanning configured
- [ ] Automated security updates enabled

---

## Performance Checklist

### Database
- [ ] Connection pool size configured (50 recommended)
- [ ] Slow query logging enabled
- [ ] Database indexes verified
- [ ] Query optimization reviewed

### API
- [ ] Pagination implemented on large lists
- [ ] Response caching configured where appropriate
- [ ] N+1 queries eliminated
- [ ] API response times < 500ms

### Frontend
- [ ] Images optimized
- [ ] Code splitting configured
- [ ] Bundle size analyzed
- [ ] Lighthouse score > 90

### Monitoring
- [ ] Sentry configured for error tracking
- [ ] Performance monitoring enabled
- [ ] Memory monitoring active
- [ ] Log aggregation configured

---

## Testing Checklist

### Automated Tests
- [x] Unit tests passing
- [x] Integration tests passing
- [ ] E2E tests created and passing
- [ ] Load testing completed
- [ ] Security testing completed

### Manual Testing
- [ ] All user flows tested
- [ ] Cross-browser testing completed
- [ ] Mobile testing completed
- [ ] Accessibility testing completed

### Test Accounts
```
Admin: admin@fatiha.ru / <secure-password>
Teacher: teacher@fatiha.ru / <secure-password>
Student: student@fatiha.ru / <secure-password>
```

---

## Deployment Steps

### 1. Pre-Deployment (Day -1)
- [ ] Fix all BLOCKER issues
- [ ] Run full test suite
- [ ] Update dependencies
- [ ] Review security checklist
- [ ] Backup production database
- [ ] Notify users of maintenance window

### 2. Deployment (Day 0)
- [ ] Enable maintenance mode
- [ ] Pull latest code
- [ ] Install dependencies: `npm ci`
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Build application: `npm run build`
- [ ] Start application: `npm start`
- [ ] Verify health checks
- [ ] Disable maintenance mode

### 3. Post-Deployment (Day 0)
- [ ] Smoke test critical paths
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check log aggregation
- [ ] Verify email delivery
- [ ] Test user registration flows

### 4. Monitoring (Day 1-7)
- [ ] Daily error rate review
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Database performance review
- [ ] Security incident monitoring

---

## Rollback Plan

### Triggers for Rollback
- Critical errors affecting > 10% of users
- Data corruption detected
- Security breach detected
- Performance degradation > 50%

### Rollback Steps
1. Enable maintenance mode
2. Stop application
3. Restore previous version
4. Rollback database migrations (if needed)
5. Start application
6. Verify functionality
7. Disable maintenance mode
8. Investigate root cause

### Rollback Commands
```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Restore database backup
pg_restore -d fatiha_production backup.dump

# Deploy previous version
git checkout <previous-tag>
npm ci
npm run build
npm start
```

---

## Monitoring & Alerts

### Critical Alerts (Immediate Response)
- [ ] Application down
- [ ] Database connection failures
- [ ] Error rate > 5%
- [ ] Memory usage > 90%
- [ ] Disk space < 10%

### Warning Alerts (Review within 1 hour)
- [ ] Error rate > 1%
- [ ] Response time > 1s
- [ ] Memory usage > 70%
- [ ] Failed email deliveries

### Info Alerts (Review daily)
- [ ] New user registrations
- [ ] Failed login attempts
- [ ] Rate limit hits
- [ ] Slow queries

---

## Documentation Checklist

### Technical Documentation
- [x] API documentation updated
- [x] Database schema documented
- [x] Architecture diagrams current
- [x] Deployment guide updated
- [ ] Runbook created

### User Documentation
- [ ] User guide updated
- [ ] FAQ updated
- [ ] Video tutorials created
- [ ] Help center updated

---

## Communication Plan

### Pre-Deployment
- [ ] Notify users 48 hours before
- [ ] Announce maintenance window
- [ ] Prepare status page updates

### During Deployment
- [ ] Update status page
- [ ] Monitor support channels
- [ ] Keep team on standby

### Post-Deployment
- [ ] Announce completion
- [ ] Share release notes
- [ ] Collect user feedback
- [ ] Schedule retrospective

---

## Sign-Off

### Development Team
- [ ] Backend Developer: All API endpoints tested
- [ ] Frontend Developer: All UI components tested
- [ ] QA Engineer: All tests passed
- [ ] Security Engineer: Security audit complete

### Management
- [ ] Tech Lead: Code review complete
- [ ] Product Manager: Features approved
- [ ] DevOps: Infrastructure ready
- [ ] CTO: Final approval

---

## Estimated Timeline

### Minimum Path (Blockers Only)
- **Day 1:** Fix 4 blockers (8 hours)
- **Day 2:** Deploy to production
- **Total:** 2 days

### Recommended Path (Blockers + High Priority)
- **Day 1-2:** Fix blockers (8 hours)
- **Day 3-4:** Fix high priority (16 hours)
- **Day 5:** Final testing and deployment
- **Total:** 5 days

### Ideal Path (All Issues)
- **Week 1:** Fix blockers + high priority (24 hours)
- **Week 2:** Fix medium priority (26 hours)
- **Week 3:** Final testing and deployment
- **Total:** 3 weeks

---

## Current Status Summary

**Blockers:** 4 ❌
**High Priority:** 6 ⚠️
**Medium Priority:** 3 ℹ️

**Recommendation:** DO NOT DEPLOY until all 4 blockers are resolved.

**Minimum Time to Production:** 2 days (blockers only)
**Recommended Time to Production:** 5 days (blockers + high priority)

---

## Contact Information

**On-Call Engineer:** [Name] - [Phone]
**DevOps Lead:** [Name] - [Phone]
**Tech Lead:** [Name] - [Phone]
**Emergency Escalation:** [Name] - [Phone]

---

**Last Updated:** 2026-03-19
**Next Review:** After blocker fixes
**Document Owner:** QA Team
