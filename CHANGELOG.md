# Changelog

Все значимые изменения в проекте Fatiha.ru LMS.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
версионирование следует [Semantic Versioning](https://semver.org/lang/ru/).

---

## [Unreleased] - 2026-10-02

### Fixed

#### Critical Fixes
- **CRITICAL:** Исправлен вход в систему — SessionProvider не передавал session prop, блокируя POST-запросы signIn
- **CRITICAL:** Откат на стабильные версии Next.js 15.1.6 + React 18.3.1 для устранения проблемы с event handlers (несовместимость Next.js 16.2.0 + React 19.2.3 + Turbopack полностью блокировала все onClick/onChange handlers)

#### Next.js 16 Migration
- **Breaking Change:** Перенесены viewport и themeColor из metadata в generateViewport() (Next.js 16 requirement)
- Обновлены все страницы с metadata для соответствия новому API

#### Accessibility
- Добавлен autoComplete="current-password" к полям ввода пароля (WCAG compliance)
- Улучшена навигация с клавиатуры в формах авторизации

#### Authentication & Registration
- Исправлен порт по умолчанию для email verification links (3051 вместо 3000)
- Обновлены CORS настройки Socket.io для нового порта разработки
- Улучшена обработка ошибок в процессе регистрации учителей
- Исправлена валидация email при повторной отправке верификации

#### API Routes
- Добавлена обработка edge cases в `/api/admin/teacher-applications/[id]/approve`
- Улучшена логика разблокировки пользователей в `/api/admin/users/[userId]/unblock`
- Исправлены типы в hasanat API endpoints (stats и transactions)

#### UI/UX
- Исправлено отображение компонента AdminHeader
- Улучшена верстка страницы email verification
- Обновлена страница входа с правильными редиректами

### Improvements

#### Database Schema
- Реорганизованы поля модели User для лучшей читаемости
- Добавлена альфабетическая сортировка relations
- Улучшена консистентность именования полей

#### Email System
- Расширены примеры email-шаблонов в `email/examples.ts`
- Улучшена система планирования email-рассылок
- Добавлены новые типы уведомлений

#### Configuration
- Обновлен `.env.example` с актуальными переменными окружения
- Добавлены комментарии для новых конфигурационных опций
- Улучшена документация переменных окружения

### Technical Debt
- Унифицирован порт разработки (3051) во всех конфигах
- Улучшена типизация в notification service
- Оптимизированы импорты в layout компонентах

---

## [1.0.0] - 2026-09-26

### Added - Геймификация и библиотека

#### Gamification System
- Hasanat (rewards) система для студентов
- Leaderboard с ежедневными/еженедельными/месячными рейтингами
- Streak tracking для поддержания мотивации
- Достижения и бейджи за выполнение заданий

#### Library Module
- Загрузка PDF книг учителями
- HTML-конвертер для чтения книг в браузере
- Прогресс чтения с закладками
- Категоризация книг по курсам

#### OAuth Integration
- Google OAuth для быстрой регистрации
- Apple OAuth поддержка
- Связывание социальных аккаунтов с существующими

#### Analytics & Charts
- Графики прогресса студентов (Recharts)
- Визуализация hasanat transactions
- Dashboard widgets для учителей
- Статистика по курсам и потокам

---

## [0.9.0] - 2026-09-15

### Added - Библиотека и отзывы

#### Course Library
- Публичный каталог курсов для незарегистрированных пользователей
- Фильтрация по категориям, уровню, языку
- Превью программы курса
- SEO-оптимизация страниц курсов

#### Review System
- Отзывы студентов о курсах
- Рейтинговая система (1-5 звезд)
- Модерация отзывов администраторами
- Отображение средней оценки курса

#### Dashboard Redesign
- Темно-золотой дизайн в стиле премиум
- Улучшенная навигация для всех ролей
- Адаптивные карточки статистики
- Оптимизация для мобильных устройств

---

## [0.8.0] - 2026-08-30

### Added - Email система и админ-панель

#### Email Integration
- Nodemailer интеграция с SMTP
- Email templates система (верификация, уведомления)
- Scheduled emails для напоминаний
- Batch email отправка для broadcast

#### Admin Panel Improvements
- Dashboard с ключевыми метриками платформы
- User management (блокировка, сброс паролей)
- Teacher applications review workflow
- CMS для редактирования home page контента
- Broadcast система для массовых уведомлений
- Export данных (студенты, курсы) в CSV/JSON

#### Logging System
- Pino logger интеграция
- Структурированные логи для всех API routes
- Error tracking и monitoring
- Request/response logging middleware

---

## [0.7.0] - 2026-08-10

### Added - Система регистрации учителей

#### Teacher Registration Flow
- Двухэтапная регистрация учителей
- Email verification обязателен
- Профиль учителя (bio, qualifications, experience)
- Загрузка документов и видео-представления
- WhatsApp контакт для связи

#### Admin Approval System
- Очередь заявок на рассмотрение
- Одобрение/отклонение с комментариями
- Email уведомления учителям о статусе
- История рассмотрения заявок

---

## [0.6.0] - 2026-07-25

### Added - Система заявок студентов

#### Student Enrollment Requests
- Подача заявок на зачисление в потоки
- Загрузка подтверждений оплаты
- Review workflow для учителей
- Проверка capacity потоков
- Гендерные ограничения (MALE_ONLY, FEMALE_ONLY, MIXED)

#### Payment Confirmation
- Загрузка квитанций в S3
- Подтверждение оплаты учителем
- Автоматическое создание Enrollment после подтверждения
- Email уведомления на каждом этапе

---

## [0.5.0] - 2026-07-05

### Added - MVP Core Features

#### Course Management
- CRUD операции для курсов
- Потоки (streams) с датами начала/конца
- Уроки трех типов: LIVE, VIDEO, TEXT
- Загрузка видео-записей в AWS S3

#### Quiz & Homework System
- Тесты с множественным выбором
- Голосовые вопросы (audio recording)
- Домашние задания с загрузкой файлов
- Проверка и оценивание учителями

#### Analytics
- Прогресс студента по курсу
- Статистика выполнения заданий
- Dashboard для учителей с метриками
- Детальная аналитика по каждому студенту

#### Live Streaming
- Jitsi Meet интеграция
- Групповые live-уроки
- Chat комната для каждого потока
- Запись трансляций (опционально)

#### Real-Time Chat
- Socket.io для instant messaging
- Групповые чаты по потокам
- Прямые сообщения (1-on-1)
- Typing indicators и online presence
- Редактирование и удаление сообщений

---

## [0.4.0] - 2026-06-15

### Added - Notification система

#### Push Notifications
- In-app уведомления
- Email уведомления (опционально)
- Настройки предпочтений пользователя
- Типы уведомлений по событиям платформы

---

## [0.3.0] - 2026-05-20

### Added - Support система

#### Tickets
- Создание тикетов поддержки студентами
- Категории (TECHNICAL, CONTENT, PAYMENT, OTHER)
- Приоритеты (LOW, MEDIUM, HIGH, URGENT)
- Назначение админами/учителями
- Ответы с комментариями
- Статусы (OPEN, IN_PROGRESS, RESOLVED, CLOSED)

#### Content Moderation
- Репорты на контент (SPAM, INAPPROPRIATE, etc.)
- Review workflow для админов
- Действия (REMOVE, WARN, BLOCK_USER, NO_ACTION)

---

## [0.2.0] - 2026-04-30

### Added - PWA Support

#### Progressive Web App
- Manifest.json с иконками
- Service Worker (опционально)
- Установка на мобильные устройства
- Offline fallback страница
- Mobile-first адаптивный дизайн

---

## [0.1.0] - 2026-04-10

### Added - Initial Release

#### Authentication
- NextAuth 4 с JWT стратегией
- Email/password регистрация и вход
- Роли: STUDENT, TEACHER, ADMIN
- Защищенные маршруты по ролям

#### Database
- Prisma 6 ORM
- PostgreSQL через Docker Compose
- Миграции и seed скрипты
- Модели: User, Course, Stream, Lesson, Enrollment

#### Tech Stack
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- TypeScript strict mode
- Custom server с Socket.io

---

## Known Issues

### High Priority (критичные для UX)
- **Empty states отсутствуют** — пустые списки (курсы, рассылки, заявки) не имеют информативных сообщений с CTA
- **Active state в admin sidebar** — не видно текущего активного пункта меню
- **Mobile menu backdrop** — нет backdrop overlay при открытии мобильного меню
- **Breadcrumbs отсутствуют** — в глубоких разделах админки непонятно местоположение

### Medium Priority (улучшают UX)
- **Client-side валидация форм** — валидация происходит только при submit
- **Focus management** — фокус не устанавливается на первое поле при загрузке форм
- **Skip to main content** — отсутствует ссылка для пропуска навигации (accessibility)
- **Focus trap в mobile menu** — фокус не ограничен внутри открытого меню

### Low Priority (полировка)
- **Smooth scroll для anchor links** — требует проверки работы плавной прокрутки
- **Active state у nav links на scroll** — не подсвечиваются при прокрутке landing page
- **Графики в dashboard** — можно добавить визуализацию трендов
- **Пагинация** — нужна для больших списков (users, courses)

### Technical Debt
- PDF библиотека медленная для файлов >50MB — требует оптимизации
- Dynamic imports для модалов — все модалы загружаются сразу
- Проверить использование `next/image` везде вместо `<img>`

**Детальный UI/UX аудит:** см. `UI_IMPROVEMENTS.md` (50+ находок с примерами кода)

---

## Deployment History

- **Production (fatiha.ru):** последний деплой из коммита `fe2534c`
- **Staging:** синхронизируется с веткой `xnjnj`
- **Dev:** локальная разработка на порту 3051

Для деплоя используется: `git push xnjnj && python deploy/_deploy_home.py`

---

## Migration Notes

### Database Migrations
После обновления выполнить:
```bash
npx prisma migrate deploy  # Production
npx prisma generate        # Regenerate client
```

### Breaking Changes
- Порт разработки изменен с 3000 на 3051
- Переменная `NEXTAUTH_URL` должна быть обновлена
- Socket.io CORS настройки требуют актуального origin

---

## Contributors

Разработка ведется с использованием Claude Code (Opus 5.5) для автоматизации рутинных задач.

