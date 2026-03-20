#!/bin/bash
# Исправление прав доступа к таблицам БД

echo "🔧 Исправляем права доступа к таблицам..."

# Определяем имя пользователя БД из DATABASE_URL
DB_USER=$(grep DATABASE_URL /var/www/newfatiha/.env | sed 's/.*:\/\/\([^:]*\):.*/\1/')

if [ -z "$DB_USER" ]; then
    echo "⚠️  Не удалось определить пользователя БД из .env"
    echo "Используем стандартное имя: postgres"
    DB_USER="postgres"
fi

echo "📋 Пользователь БД: $DB_USER"
echo ""

# Выдаем права на все таблицы
sudo -u postgres psql -d fatiha << EOF

-- Выдать права на все существующие таблицы
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;

-- Выдать права на все последовательности (sequences)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Выдать права на схему
GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;

-- Установить права по умолчанию для будущих таблиц
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO $DB_USER;

-- Проверить права
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name='PageContent' AND grantee='$DB_USER';

\echo '✅ Права доступа обновлены!'

EOF

echo ""
echo "🔄 Перезапускаем приложение..."
pm2 restart fatiha

echo ""
echo "✅ ГОТОВО!"
echo "=========================================="
echo "🌐 Откройте: https://fatiha.ru"
echo "📧 Email: admin@fatiha.ru"
echo "🔑 Password: admin123"
echo "=========================================="
