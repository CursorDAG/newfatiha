#!/bin/bash
# Простое решение через SQL (без Node.js скриптов)
# Дата: 2026-03-20

set -e

cd /var/www/newfatiha

echo "🔧 Шаг 1: Помечаем миграцию как примененную..."
npx prisma migrate resolve --applied 20260320000000_add_teacher_enrollment_system

echo ""
echo "🔨 Шаг 2: Генерируем Prisma Client..."
npx prisma generate

echo ""
echo "👤 Шаг 3: Создаем администратора через SQL..."
sudo -u postgres psql -d fatiha << 'EOF'
-- Удалить старого админа
DELETE FROM "User" WHERE email = 'admin@fatiha.ru';

-- Создать нового админа
-- Пароль: admin123 (bcrypt hash)
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
  '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzKrMa3s83si9GeCAos99JxHm8jqW',
  'Администратор',
  'ADMIN',
  true,
  'ACTIVE',
  'NOT_SPECIFIED',
  NOW(),
  NOW()
);

-- Проверить что создан
SELECT email, name, role, status FROM "User" WHERE email = 'admin@fatiha.ru';
EOF

echo ""
echo "🔄 Шаг 4: Перезапускаем приложение..."
pm2 restart fatiha

echo ""
echo "✅ ГОТОВО!"
echo "=========================================="
echo "🌐 Откройте: https://fatiha.ru"
echo "📧 Email: admin@fatiha.ru"
echo "🔑 Password: admin123"
echo "=========================================="
