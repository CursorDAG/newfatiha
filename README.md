# Fatiha.ru — Islamic Education LMS

Learning Management System для исламского образования с поддержкой live-трансляций, тестов, домашних заданий и аналитики прогресса студентов.

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка базы данных
docker-compose up -d
npx prisma migrate dev
npx prisma db seed

# Запуск dev сервера
npm run dev
```

Откройте [http://localhost:3051](http://localhost:3051) — dev сервер работает на порту 3051

**Тестовый вход:**
- Учитель: `admin@fatiha.ru` / `admin123`
- Студент: `ali@student.ru` / `student123`

## 📚 Документация

- **[PROJECT.md](./PROJECT.md)** — полное описание проекта, реализованный функционал, архитектура
- **[CLAUDE.md](./CLAUDE.md)** — справочник для разработки, конвенции кода, API patterns

## ✨ Основные возможности

### Для учителей
- 📚 Управление курсами и потоками
- 📖 Создание уроков (LIVE, VIDEO, TEXT)
- 🎥 Загрузка записей уроков в S3
- 🧪 Тесты (множественный выбор и голосовые)
- 📝 Домашние задания с проверкой
- 📊 Детальная аналитика прогресса студентов
- 🗓 Расписание занятий
- 🔴 Live-трансляции через Jitsi Meet
- ✅ Рассмотрение заявок студентов на зачисление
- 💳 Подтверждение оплаты

### Для студентов
- 📖 Доступ к урокам и материалам
- 🎬 Просмотр записей и live-трансляций
- 🧪 Прохождение тестов
- 📝 Сдача домашних заданий
- 📊 Отслеживание личного прогресса
- 📈 Детальная статистика по всем метрикам
- 🎓 Просмотр каталога курсов
- 📋 Подача заявок на зачисление
- 💳 Загрузка подтверждений оплаты

### Для администраторов
- 👨‍🏫 Рассмотрение заявок учителей
- ✅ Одобрение/отклонение кандидатов
- 📊 Управление пользователями
- 🎫 Обработка тикетов поддержки
- 📢 Модерация контента

## 🛠 Технологии

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Next.js API Routes, Prisma 6, PostgreSQL
- **Auth:** NextAuth 4 (JWT)
- **Video:** Jitsi Meet
- **Storage:** AWS S3
- **Logging:** Pino

## 📦 Основные команды

```bash
# Разработка
npm run dev              # Dev сервер
npm run build            # Production build
npm start                # Production сервер

# База данных
npx prisma generate      # Генерация Prisma Client
npx prisma migrate dev   # Создать миграцию
npx prisma db seed       # Заполнить тестовыми данными
npx prisma studio        # GUI для БД

# Линтинг
npm run lint             # ESLint
```

## 🌍 Переменные окружения

Создайте `.env` файл:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fatiha"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# AWS S3 (для записей уроков)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_S3_BUCKET="fatiha-recordings"
```

## 📱 PWA Support

Приложение поддерживает установку как PWA:
- Манифест: `public/manifest.json`
- Иконки: `public/icon-*.png`
- Адаптивный дизайн для мобильных устройств

## 🎯 Текущий статус

**Версия 1.0.0** — MVP завершен, активная разработка продолжается:

### Реализованные модули
- ✅ Фаза 1: Система записей уроков и live-трансляции
- ✅ Фаза 2: Аналитика прогресса студентов
- ✅ Фаза 3: Мобильная оптимизация и PWA
- ✅ Фаза 4: Система регистрации учителей
- ✅ Фаза 5: Система заявок студентов
- ✅ Фаза 6: Геймификация (hasanat, leaderboard, streaks)
- ✅ Фаза 7: Библиотека книг с HTML-конвертером
- ✅ Фаза 8: OAuth интеграция (Google, Apple)

### Последние улучшения (октябрь 2026)
- 📊 Графики и визуализация данных (Recharts)
- 📚 Система библиотеки с PDF-конвертером
- 🎮 Геймификация: hasanat rewards, leaderboards, достижения
- 🔐 OAuth регистрация через Google и Apple
- 📧 Расширенная email система с шаблонами
- 🎨 Редизайн дашбордов (темно-золотая тема)
- ⭐ Система отзывов о курсах
- 🌐 Публичный каталог курсов

### Известные проблемы
См. `CHANGELOG.md` раздел Known Issues для актуального списка.

Проект готов к продакшн деплою на fatiha.ru.

## 📖 Документация

### Для разработчиков
- **[CLAUDE.md](./CLAUDE.md)** — главный справочник: команды, архитектура, правила разработки
- **[CHANGELOG.md](./CHANGELOG.md)** — полная история изменений, релизов, известных проблем
- **[docs/agent/features.md](./docs/agent/features.md)** — документация всех фич и API endpoints
- **[docs/agent/architecture.md](./docs/agent/architecture.md)** — архитектура проекта и БД
- **[docs/agent/conventions.md](./docs/agent/conventions.md)** — code style и best practices

### Деплой и миграции
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — инструкции по развертыванию в production
- **[deploy/_deploy_home.py](./deploy/_deploy_home.py)** — скрипт автоматического деплоя

### Workflow диаграммы
- **[docs/workflows/](./docs/workflows/)** — flow диаграммы процессов (регистрация, заявки, оплата)
