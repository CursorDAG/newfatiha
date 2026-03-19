# Deployment Guide

## Overview
This guide covers deployment procedures for the Fatiha.ru LMS platform, including environment setup, database migrations, and production deployment steps.

## Prerequisites

### System Requirements
- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- Redis 6+ (optional, for caching)
- Nginx (for reverse proxy)
- PM2 (for process management)
- SSL certificate (Let's Encrypt recommended)

### Required Services
- SMTP server for email notifications (or Ethereal for testing)
- Jitsi Meet instance (or use public meet.jit.si)
- S3-compatible storage (optional, for file uploads)

---

## Environment Configuration

### 1. Environment Variables

Create `.env` file in project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fatiha_db"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://fatiha.ru"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="noreply@fatiha.ru"
SMTP_PASSWORD="your-smtp-password"
EMAIL_FROM_NAME="Fatiha.ru"
EMAIL_FROM_EMAIL="noreply@fatiha.ru"

# Logging
LOG_LEVEL="info"  # trace, debug, info, warn, error, fatal
NODE_ENV="production"

# Optional: S3 Storage
S3_ENDPOINT="https://s3.amazonaws.com"
S3_BUCKET="fatiha-uploads"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_REGION="us-east-1"

# Optional: Redis Cache
REDIS_URL="redis://localhost:6379"

# Optional: Sentry Error Tracking
SENTRY_DSN="https://your-sentry-dsn"
```

### 2. Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
```

---

## Database Setup

### 1. Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE fatiha_db;
CREATE USER fatiha_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE fatiha_db TO fatiha_user;

# Exit psql
\q
```

### 2. Configure PostgreSQL

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
# Performance tuning
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

Edit `/etc/postgresql/14/main/pg_hba.conf`:

```conf
# Allow local connections
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### 3. Run Migrations

```bash
# Install dependencies
npm ci --production=false

# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Seed database (optional, for testing)
npx prisma db seed
```

---

## Application Deployment

### 1. Clone Repository

```bash
cd /var/www
git clone https://github.com/your-org/fatiha.git
cd fatiha
```

### 2. Install Dependencies

```bash
npm ci --production
```

### 3. Build Application

```bash
npm run build
```

### 4. Setup PM2

Install PM2 globally:

```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'fatiha-app',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
```

Start application:

```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
```

---

## Nginx Configuration

### 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 2. Configure Site

Create `/etc/nginx/sites-available/fatiha.ru`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# Upstream
upstream fatiha_backend {
    least_conn;
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name fatiha.ru www.fatiha.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name fatiha.ru www.fatiha.ru;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/fatiha.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fatiha.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/fatiha-access.log;
    error_log /var/log/nginx/fatiha-error.log;

    # Client body size (for file uploads)
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Static files caching
    location /_next/static {
        proxy_pass http://fatiha_backend;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://fatiha_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Auth endpoints rate limiting
    location /api/auth/ {
        limit_req zone=auth_limit burst=3 nodelay;
        proxy_pass http://fatiha_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # All other requests
    location / {
        proxy_pass http://fatiha_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/fatiha.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d fatiha.ru -d www.fatiha.ru

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

---

## Monitoring & Logging

### 1. PM2 Monitoring

```bash
# View logs
pm2 logs fatiha-app

# Monitor resources
pm2 monit

# View status
pm2 status

# Restart app
pm2 restart fatiha-app

# Reload app (zero-downtime)
pm2 reload fatiha-app
```

### 2. Application Logs

Logs are stored in `logs/` directory:
- `pm2-error.log` - Application errors
- `pm2-out.log` - Application output
- Pino logs (JSON format) - Structured application logs

View logs:

```bash
# Tail error log
tail -f logs/pm2-error.log

# View structured logs
tail -f logs/pm2-out.log | npx pino-pretty
```

### 3. Database Monitoring

```bash
# Check active connections
sudo -u postgres psql -d fatiha_db -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
sudo -u postgres psql -d fatiha_db -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check database size
sudo -u postgres psql -d fatiha_db -c "SELECT pg_size_pretty(pg_database_size('fatiha_db'));"
```

---

## Backup Strategy

### 1. Database Backups

Create backup script `/usr/local/bin/backup-fatiha-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/fatiha"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="fatiha_db_$DATE.dump"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U fatiha_user -d fatiha_db -F c -b -v -f "$BACKUP_DIR/$FILENAME"

# Compress
gzip "$BACKUP_DIR/$FILENAME"

# Keep only last 7 days
find $BACKUP_DIR -name "*.dump.gz" -mtime +7 -delete

echo "Backup completed: $FILENAME.gz"
```

Make executable and schedule:

```bash
chmod +x /usr/local/bin/backup-fatiha-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-fatiha-db.sh >> /var/log/fatiha-backup.log 2>&1
```

### 2. File Backups

If using local file storage, backup uploads directory:

```bash
# Sync to remote storage
rsync -avz /var/www/fatiha/public/uploads/ user@backup-server:/backups/fatiha/uploads/
```

---

## Deployment Workflow

### 1. Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Database migrations reviewed
- [ ] Environment variables configured
- [ ] Backup created
- [ ] Staging deployment successful
- [ ] Rollback plan prepared

### 2. Deployment Steps

```bash
# 1. Pull latest code
cd /var/www/fatiha
git pull origin main

# 2. Install dependencies
npm ci --production

# 3. Run database migrations
npx prisma migrate deploy

# 4. Build application
npm run build

# 5. Reload PM2 (zero-downtime)
pm2 reload fatiha-app

# 6. Verify deployment
curl -I https://fatiha.ru
pm2 logs fatiha-app --lines 50
```

### 3. Post-Deployment Verification

- [ ] Application starts without errors
- [ ] Homepage loads correctly
- [ ] User login works
- [ ] Database queries executing
- [ ] Email notifications sending
- [ ] No errors in logs

### 4. Rollback Procedure

If deployment fails:

```bash
# 1. Revert code
git reset --hard HEAD~1

# 2. Rollback database (if needed)
# See MIGRATION_PLAN.md for rollback SQL

# 3. Rebuild
npm run build

# 4. Restart
pm2 restart fatiha-app
```

---

## Performance Optimization

### 1. Database Connection Pooling

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings
  // ?connection_limit=10&pool_timeout=20
}
```

### 2. Next.js Optimization

In `next.config.js`:

```javascript
module.exports = {
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Image optimization
  images: {
    domains: ['fatiha.ru'],
    formats: ['image/avif', 'image/webp'],
  },

  // Production optimizations
  swcMinify: true,
  reactStrictMode: true,
};
```

### 3. Redis Caching (Optional)

Install Redis:

```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

Configure in application for session storage and caching.

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2. Fail2Ban

```bash
# Install
sudo apt install fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Enable nginx protection
sudo nano /etc/fail2ban/jail.local
# Add:
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/fatiha-error.log

sudo systemctl restart fail2ban
```

### 3. Regular Updates

```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Node.js security updates
npm audit
npm audit fix

# Check for outdated packages
npm outdated
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs fatiha-app --err

# Check environment variables
pm2 env 0

# Restart with fresh environment
pm2 delete fatiha-app
pm2 start ecosystem.config.js
```

### Database Connection Issues

```bash
# Test connection
psql -U fatiha_user -d fatiha_db -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection limits
sudo -u postgres psql -c "SHOW max_connections;"
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### High Memory Usage

```bash
# Check PM2 memory
pm2 list

# Restart if needed
pm2 restart fatiha-app

# Adjust max memory in ecosystem.config.js
max_memory_restart: '1G'
```

### Slow Queries

```bash
# Enable slow query log in PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf
# Add:
log_min_duration_statement = 1000  # Log queries > 1 second

# View slow queries
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## Maintenance Windows

Schedule maintenance during low-traffic periods:
- Database migrations: 2-4 AM local time
- System updates: Weekly, Sunday 3 AM
- Backup verification: Monthly

---

## Support Contacts

- **DevOps:** devops@fatiha.ru
- **Database Admin:** dba@fatiha.ru
- **Security:** security@fatiha.ru
- **Emergency:** +X-XXX-XXX-XXXX

---

## Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Optimization](https://www.nginx.com/blog/tuning-nginx/)
