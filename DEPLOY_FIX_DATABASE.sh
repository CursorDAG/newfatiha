#!/bin/bash
# Скрипт для исправления базы данных на продакшн-сервере
# Дата: 2026-03-20

set -e  # Остановить при ошибке

echo "🔧 Исправление базы данных на сервере..."
echo ""

# Переход в директорию проекта
cd /var/www/newfatiha

echo "📋 Шаг 1: Проверка текущего состояния"
echo "----------------------------------------"
npx prisma migrate status || true
echo ""

echo "📦 Шаг 2: Создание бэкапа базы данных"
echo "----------------------------------------"
BACKUP_FILE="backup_before_fix_$(date +%Y%m%d_%H%M%S).sql"
sudo -u postgres pg_dump -d fatiha > "/tmp/$BACKUP_FILE"
echo "✅ Бэкап создан: /tmp/$BACKUP_FILE"
echo ""

echo "🔄 Шаг 3: Применение миграций"
echo "----------------------------------------"
npx prisma migrate deploy
echo ""

echo "🔨 Шаг 4: Генерация Prisma Client"
echo "----------------------------------------"
npx prisma generate
echo ""

echo "📊 Шаг 5: Проверка структуры базы данных"
echo "----------------------------------------"
sudo -u postgres psql -d fatiha -c "\d \"User\"" | grep -E "emailVerified|status|verificationToken" || echo "⚠️  Поля не найдены!"
echo ""

echo "🔍 Шаг 6: Проверка новых таблиц"
echo "----------------------------------------"
sudo -u postgres psql -d fatiha -c "SELECT COUNT(*) as teacher_profiles FROM \"TeacherProfile\";" || echo "⚠️  Таблица TeacherProfile не найдена!"
sudo -u postgres psql -d fatiha -c "SELECT COUNT(*) as enrollment_requests FROM \"EnrollmentRequest\";" || echo "⚠️  Таблица EnrollmentRequest не найдена!"
echo ""

echo "👤 Шаг 7: Создание тестового администратора"
echo "----------------------------------------"
# Пароль: admin123 (bcrypt hash)
ADMIN_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzKrMa3s83si9GeCAos99JxHm8jqW'

sudo -u postgres psql -d fatiha <<EOF
-- Удалить старого админа если есть
DELETE FROM "User" WHERE email = 'admin@fatiha.ru';

-- Создать нового админа с правильной структурой
INSERT INTO "User" (
  id,
  email,
  password,
  name,
  role,
  "emailVerified",
  status,
  gender,
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@fatiha.ru',
  '$ADMIN_HASH',
  'Администратор',
  'ADMIN',
  true,
  'ACTIVE',
  'NOT_SPECIFIED',
  NOW(),
  NOW()
);
EOF

echo "✅ Администратор создан: admin@fatiha.ru / admin123"
echo ""

echo "🔄 Шаг 8: Перезапуск приложения"
echo "----------------------------------------"
pm2 restart fatiha
echo ""

echo "⏳ Ожидание запуска приложения (5 секунд)..."
sleep 5
echo ""

echo "📝 Шаг 9: Проверка логов"
echo "----------------------------------------"
pm2 logs fatiha --lines 20 --nostream
echo ""

echo "✅ ГОТОВО!"
echo "=========================================="
echo ""
echo "🌐 Откройте браузер: https://fatiha.ru"
echo "📧 Email: admin@fatiha.ru"
echo "🔑 Password: admin123"
echo ""
echo "📋 Если возникли проблемы:"
echo "   1. Проверьте логи: pm2 logs fatiha"
echo "   2. Восстановите бэкап: psql -U postgres -d fatiha < /tmp/$BACKUP_FILE"
echo "   3. Свяжитесь с разработчиком"
echo ""
