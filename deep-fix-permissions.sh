#!/bin/bash
# Глубокая проверка и исправление прав доступа

echo "🔍 Глубокая диагностика прав доступа..."
echo ""

# Получаем пользователя из .env
DB_USER=$(grep DATABASE_URL /var/www/newfatiha/.env | sed 's/.*:\/\/\([^:]*\):.*/\1/')
echo "📋 Пользователь БД: $DB_USER"
echo ""

# Проверяем существование таблицы PageContent
echo "1️⃣ Проверка существования таблицы PageContent:"
sudo -u postgres psql -d fatiha -c "\dt PageContent"
echo ""

# Проверяем владельца таблицы
echo "2️⃣ Проверка владельца таблицы:"
sudo -u postgres psql -d fatiha -c "SELECT tablename, tableowner FROM pg_tables WHERE tablename = 'PageContent';"
echo ""

# Проверяем текущие права
echo "3️⃣ Текущие права на PageContent:"
sudo -u postgres psql -d fatiha -c "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='PageContent';"
echo ""

# ИСПРАВЛЕНИЕ: Выдаем права напрямую на конкретную таблицу
echo "4️⃣ Выдаем права напрямую на PageContent:"
sudo -u postgres psql -d fatiha << EOF
GRANT ALL PRIVILEGES ON TABLE "PageContent" TO $DB_USER;
GRANT ALL PRIVILEGES ON TABLE "Broadcast" TO $DB_USER;
GRANT ALL PRIVILEGES ON TABLE "TeacherProfile" TO $DB_USER;
GRANT ALL PRIVILEGES ON TABLE "EnrollmentRequest" TO $DB_USER;
GRANT ALL PRIVILEGES ON TABLE "NotificationPreference" TO $DB_USER;
\echo '✅ Права выданы на конкретные таблицы'
EOF
echo ""

# Проверяем права снова
echo "5️⃣ Проверка прав после выдачи:"
sudo -u postgres psql -d fatiha -c "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='PageContent' AND grantee='$DB_USER';"
echo ""

# Тестируем доступ от имени пользователя
echo "6️⃣ Тестируем SELECT от имени $DB_USER:"
sudo -u postgres psql -d fatiha -c "SET ROLE $DB_USER; SELECT COUNT(*) FROM \"PageContent\";" 2>&1
echo ""

# Останавливаем PM2 полностью
echo "7️⃣ Полная остановка PM2..."
pm2 stop fatiha
sleep 2

# Очищаем кеш PM2
echo "8️⃣ Очистка кеша PM2..."
pm2 flush fatiha

# Запускаем заново
echo "9️⃣ Запуск приложения..."
pm2 start fatiha
sleep 3

# Проверяем статус
echo "🔟 Статус приложения:"
pm2 status fatiha

echo ""
echo "✅ ГОТОВО!"
echo "Откройте https://fatiha.ru и попробуйте войти"
