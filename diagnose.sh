#!/bin/bash
# Диагностика проблемы входа

echo "═══════════════════════════════════════════════════════════════"
echo "  🔍 ДИАГНОСТИКА ПРОБЛЕМЫ ВХОДА"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "1️⃣ Проверка структуры таблицы User:"
echo "──────────────────────────────────────────────────────────────"
sudo -u postgres psql -d fatiha -c "\d \"User\"" | grep -E "status|emailVerified|verificationToken|Column"
echo ""

echo "2️⃣ Проверка администратора в БД:"
echo "──────────────────────────────────────────────────────────────"
sudo -u postgres psql -d fatiha -c "SELECT email, name, role, status, \"emailVerified\" FROM \"User\" WHERE email = 'admin@fatiha.ru';" 2>&1
echo ""

echo "3️⃣ Проверка всех пользователей:"
echo "──────────────────────────────────────────────────────────────"
sudo -u postgres psql -d fatiha -c "SELECT email, role FROM \"User\" LIMIT 5;"
echo ""

echo "4️⃣ Статус миграций:"
echo "──────────────────────────────────────────────────────────────"
cd /var/www/newfatiha
npx prisma migrate status 2>&1 | grep -E "migrations found|Database schema|pending|applied"
echo ""

echo "5️⃣ Последние ошибки в логах приложения:"
echo "──────────────────────────────────────────────────────────────"
pm2 logs fatiha --lines 30 --nostream --err 2>&1 | tail -20
echo ""

echo "6️⃣ Проверка переменных окружения:"
echo "──────────────────────────────────────────────────────────────"
cd /var/www/newfatiha
if [ -f .env ]; then
    echo "✅ Файл .env существует"
    grep -E "DATABASE_URL|NEXTAUTH" .env | sed 's/=.*/=***/'
else
    echo "❌ Файл .env НЕ НАЙДЕН!"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  РЕЗУЛЬТАТЫ ДИАГНОСТИКИ"
echo "═══════════════════════════════════════════════════════════════"
