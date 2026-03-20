#!/bin/bash
# Полная чистая переустановка БД

set -e

echo "🔥 ЧИСТАЯ ПЕРЕУСТАНОВКА БД"
echo "=========================================="
echo ""

cd /var/www/newfatiha

# Получаем пользователя БД
DB_USER=$(grep DATABASE_URL .env | sed 's/.*:\/\/\([^:]*\):.*/\1/')
echo "📋 Пользователь БД: $DB_USER"
echo ""

# Останавливаем приложение
echo "⏸️  Останавливаем приложение..."
pm2 stop fatiha || true
echo ""

# Удаляем БД
echo "🗑️  Удаляем старую БД..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS fatiha;"
echo ""

# Создаем БД заново
echo "🆕 Создаем новую БД..."
sudo -u postgres psql -c "CREATE DATABASE fatiha;"
echo ""

# Выдаем права
echo "🔐 Выдаем права пользователю $DB_USER..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fatiha TO $DB_USER;"
sudo -u postgres psql -d fatiha -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d fatiha -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO $DB_USER;"
sudo -u postgres psql -d fatiha -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO $DB_USER;"
echo ""

# Применяем миграции
echo "📦 Применяем миграции..."
npx prisma migrate deploy
echo ""

# Генерируем Prisma Client
echo "🔨 Генерируем Prisma Client..."
npx prisma generate
echo ""

# Заполняем БД тестовыми данными
echo "🌱 Заполняем БД тестовыми данными..."
npx prisma db seed
echo ""

# Удаляем старый билд
echo "🗑️  Удаляем старый билд..."
rm -rf .next
echo ""

# Пересобираем приложение
echo "🔨 Пересобираем приложение..."
npm run build
echo ""

# Запускаем приложение
echo "🚀 Запускаем приложение..."
pm2 start fatiha
sleep 3
echo ""

# Проверяем статус
echo "✅ Статус приложения:"
pm2 status fatiha
echo ""

echo "=========================================="
echo "✅ ЧИСТАЯ УСТАНОВКА ЗАВЕРШЕНА!"
echo "=========================================="
echo ""
echo "🌐 Откройте: https://fatiha.ru"
echo "📧 Email: admin@fatiha.ru"
echo "🔑 Password: admin123"
echo ""
echo "Тестовые аккаунты:"
echo "  Учитель: teacher@fatiha.ru / admin123"
echo "  Студент: ali@student.ru / student123"
echo ""
