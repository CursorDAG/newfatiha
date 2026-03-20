#!/bin/bash
# Скрипт для исправления базы данных на продакшн-сервере
# Дата: 2026-03-20
# ИСПРАВЛЕНО: Сначала применяются миграции, потом создается пользователь

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
sudo -u postgres pg_dump -d fatiha > "/tmp/$BACKUP_FILE" 2>/dev/null || echo "⚠️  Не удалось создать бэкап (возможно БД пустая)"
echo "✅ Бэкап: /tmp/$BACKUP_FILE"
echo ""

echo "🔄 Шаг 3: Применение миграций (КРИТИЧНО!)"
echo "----------------------------------------"
npx prisma migrate deploy
echo ""

echo "🔨 Шаг 4: Генерация Prisma Client"
echo "----------------------------------------"
npx prisma generate
echo ""

echo "📊 Шаг 5: Проверка структуры базы данных"
echo "----------------------------------------"
if sudo -u postgres psql -d fatiha -c "\d \"User\"" | grep -q "emailVerified"; then
    echo "✅ Поле emailVerified найдено!"
else
    echo "❌ ОШИБКА: Поле emailVerified не найдено! Миграции не применились!"
    exit 1
fi
echo ""

echo "🔍 Шаг 6: Проверка новых таблиц"
echo "----------------------------------------"
sudo -u postgres psql -d fatiha -c "SELECT COUNT(*) as teacher_profiles FROM \"TeacherProfile\";" 2>/dev/null && echo "✅ TeacherProfile существует" || echo "⚠️  Таблица TeacherProfile не найдена!"
sudo -u postgres psql -d fatiha -c "SELECT COUNT(*) as enrollment_requests FROM \"EnrollmentRequest\";" 2>/dev/null && echo "✅ EnrollmentRequest существует" || echo "⚠️  Таблица EnrollmentRequest не найдена!"
echo ""

echo "👤 Шаг 7: Создание администратора (ПОСЛЕ миграций!)"
echo "----------------------------------------"

# Используем Node.js скрипт для создания админа (безопаснее чем SQL)
cat > /tmp/create-admin.js << 'EOFJS'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

(async () => {
  try {
    const hash = await bcrypt.hash('admin123', 10);

    // Удалить старого админа если есть
    await prisma.user.deleteMany({ where: { email: 'admin@fatiha.ru' } });

    // Создать нового админа с правильной структурой
    const user = await prisma.user.create({
      data: {
        email: 'admin@fatiha.ru',
        password: hash,
        name: 'Администратор',
        role: 'ADMIN',
        emailVerified: true,
        status: 'ACTIVE',
        gender: 'NOT_SPECIFIED'
      }
    });

    console.log('✅ Администратор создан:', user.email);
  } catch (e) {
    console.error('❌ Ошибка при создании администратора:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
EOFJS

node /tmp/create-admin.js
rm /tmp/create-admin.js
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
echo "   1. Проверьте логи: pm2 logs fatiha --err"
echo "   2. Восстановите бэкап: sudo -u postgres psql -d fatiha < /tmp/$BACKUP_FILE"
echo "   3. Проверьте статус миграций: npx prisma migrate status"
echo ""
