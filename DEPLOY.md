# Деплой Fatiha.ru на сервер

## Содержание

1. [Требования к серверу](#1-требования-к-серверу)
2. [Подготовка сервера](#2-подготовка-сервера)
3. [Клонирование и настройка](#3-клонирование-и-настройка)
4. [Запуск через Docker Compose](#4-запуск-через-docker-compose)
5. [Настройка SSL (HTTPS)](#5-настройка-ssl-https)
6. [Полезные команды](#6-полезные-команды)
7. [Обновление](#7-обновление)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Требования к серверу

### Минимальные:
- **ОС:** Ubuntu 22.04 / 24.04 LTS
- **CPU:** 2 ядра
- **RAM:** 4 ГБ
- **Диск:** 20 ГБ SSD
- **Доступ:** root или sudo

### Рекомендуемые:
- **CPU:** 4 ядра
- **RAM:** 8 ГБ
- **Диск:** 40+ ГБ SSD
- **Домен:** привязанный к IP сервера

---

## 2. Подготовка сервера

Подключитесь к серверу по SSH:

```bash
ssh root@your-server-ip
```

### 2.1 Обновите систему

```bash
apt update && apt upgrade -y
```

### 2.2 Установите Docker и Docker Compose

```bash
# Установите Docker
curl -fsSL https://get.docker.com | sh

# Запустите Docker
systemctl start docker
systemctl enable docker

# Проверьте установку
docker --version
docker compose version
```

### 2.3 Откройте порты (если есть UFW/firewall)

```bash
# Разрешить SSH, HTTP, HTTPS
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## 3. Клонирование и настройка

### 3.1 Клонируйте репозиторий

```bash
cd /opt
git clone https://github.com/CursorDAG/newfatiha fatiha
cd fatiha
```

> Если нет git-репозитория — скопируйте файлы проекта через SCP:
> ```bash
> # На локальной машине:
> scp -r /путь/к/проекту/newfatiha/* root@your-server-ip:/opt/fatiha/
> ```

### 3.2 Создайте `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
```

**Обязательные поля для заполнения:**

| Переменная | Что указать |
|---|---|
| `POSTGRES_PASSWORD` | Надёжный пароль (сгенерируйте!) |
| `NEXTAUTH_SECRET` | Сгенерируйте: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL вашего сайта: `https://fatiha.ru` |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | SMTP сервер для рассылки |

### 3.3 Сгенерируйте секреты

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# POSTGRES_PASSWORD
openssl rand -base64 24
```

### 3.4 Соберите и запустите

```bash
docker compose up -d --build
```

Это запустит:
- **PostgreSQL** (база данных)
- **Next.js приложение** (порт 3000)
- **Nginx** (прокси, порт 80/443)

### 3.5 Примените миграции базы данных

```bash
# Выполните миграции внутри контейнера приложения
docker compose exec app npx prisma migrate deploy

# Сгенерируйте Prisma Client
docker compose exec app npx prisma generate

# Заполните тестовыми данными (опционально, только для тестов!)
docker compose exec app npx prisma db seed
```

### 3.6 Проверьте что всё работает

```bash
# Посмотрите логи
docker compose logs -f

# Проверьте что приложение отвечает
curl http://localhost:3000
```

Откройте браузер и перейдите по `http://ваш-ip` — сайт должен загрузиться.

---

## 4. Запуск через Docker Compose

### Структура сервисов:

```
internet → [Nginx:80/443] → [Next.js App:3000] → [PostgreSQL:5432]
```

| Сервис | Контейнер | Порт | Описание |
|---|---|---|---|
| `db` | fatiha_postgres | 5432 | PostgreSQL 16 |
| `app` | fatiha_app | 3000 | Next.js + Socket.io |
| `nginx` | fatiha_nginx | 80, 443 | Reverse proxy |

### Команды управления:

```bash
# Запустить всё
docker compose up -d

# Остановить всё
docker compose down

# Перезапустить приложение
docker compose restart app

# Посмотреть логи
docker compose logs -f app

# Посмотреть статус
docker compose ps

# Выполнить команду внутри контейнера
docker compose exec app sh
```

---

## 5. Настройка SSL (HTTPS)

### 5.1 Привяжите домен к IP

В панели вашего DNS-провайдера создайте A-запись:
```
fatiha.ru → A → ваш-server-ip
www.fatiha.ru → CNAME → fatiha.ru
```

Дождитесь распространения DNS (может занять до 24 часов).

### 5.2 Установите Certbot

```bash
apt install certbot -y
```

### 5.3 Получите SSL-сертификат

Сначала остановите nginx (чтобы порт 80 был свободен):

```bash
docker compose down nginx

# Получите сертификат (standalone mode)
certbot certonly --standalone -d fatiha.ru -d www.fatiha.ru

# Запустите обратно
docker compose up -d nginx
```

### 5.4 Включите HTTPS в nginx.conf

В файле `nginx.conf`:
1. Раскомментируйте блок `# HTTPS server` (строки после `# HTTPS server`)
2. Раскомментируйте `HTTP -> HTTPS redirect` в начале
3. Замените `fatiha.ru` на ваш домен

```bash
nano nginx.conf
# Раскомментируйте нужные строки

# Перезапустите nginx
docker compose restart nginx
```

### 5.5 Автоматическое обновление сертификатов

```bash
# Добавьте в crontab
(crontab -l 2>/dev/null; echo "0 3 1 * * docker exec fatiha_nginx nginx -s reload && certbot renew --quiet") | crontab -
```

---

## 6. Полезные команды

```bash
# Мониторинг ресурсов
docker stats

# Очистка старых образов
docker image prune -f

# Резервная копия базы данных
docker compose exec db pg_dump -U fatiha_user fatiha_db > backup_$(date +%F).sql

# Восстановление из бэкапа
cat backup_2024-01-01.sql | docker compose exec -T db psql -U fatiha_user -d fatiha_db

# Открыть Prisma Studio (админка базы данных)
docker compose exec app npx prisma studio --hostname 0.0.0.0 --port 5555
# Откройте http://your-ip:5555 в браузере

# Проверить состояние базы данных
docker compose exec app npx prisma db pull
```

---

## 7. Обновление

```bash
cd /opt/fatiha

# Подтяните последние изменения
git pull origin main

# Соберите и перезапустите
docker compose down
docker compose up -d --build

# Примените миграции (если были изменения схемы)
docker compose exec app npx prisma migrate deploy

# Проверьте логи
docker compose logs -f app
```

---

## 8. Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
docker compose logs app

# Проверьте что PostgreSQL запущен и здоров
docker compose ps
docker compose logs db

# Проверьте .env.production
docker compose exec app env | grep DATABASE_URL
```

### Ошибка "Too many connections"

В `.env.production` уменьшите `connection_limit` в DATABASE_URL (по умолчанию 20):
```
DATABASE_URL=postgresql://...?connection_limit=10
```

### WebSocket / чат не работает

Убедитесь что nginx проксирует `/socket.io/` правильно:
```bash
docker compose logs nginx | grep socket
```

### Ошибка 502 Bad Gateway

```bash
# Проверьте что app запущен
docker compose ps

# Проверьте что app отвечает
docker compose exec app curl http://localhost:3000

# Перезапустите nginx
docker compose restart nginx
```

### Ошибка Prisma "P1001: Can't reach database server"

```bash
# Проверьте что db контейнер запущен
docker compose ps db

# Проверьте подключение из app контейнера
docker compose exec app ping db
docker compose exec app nc -zv db 5432
```

---

## Альтернативный вариант: запуск без Docker

Если не хотите использовать Docker, можно запустить напрямую:

```bash
# Установите Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установите PostgreSQL
apt install -y postgresql
systemctl start postgresql

# Создайте пользователя и базу
sudo -u postgres psql -c "CREATE USER fatiha_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "CREATE DATABASE fatiha_db OWNER fatiha_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fatiha_db TO fatiha_user;"

# Установите зависимости проекта
cd /opt/fatiha
npm ci

# Настройте .env с DATABASE_URL pointing to localhost
# Создайте .env файл с NEXTAUTH_URL=http://localhost:3000

# Сгенерируйте Prisma и примените миграции
npx prisma generate
npx prisma migrate deploy

# Соберите проект
npm run build

# Запустите (рекомендуется через PM2 для production)
npm install -g pm2
pm2 start "npm start" --name fatiha
pm2 save
pm2 startup
```
