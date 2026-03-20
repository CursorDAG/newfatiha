#!/bin/bash
# Финальное исправление - пометить миграцию как примененную
# Дата: 2026-03-20

cd /var/www/newfatiha

echo "🔧 Помечаем миграцию как примененную..."
npx prisma migrate resolve --applied 20260320000000_add_teacher_enrollment_system

echo "🔨 Генерируем Prisma Client..."
npx prisma generate

echo "👤 Создаем администратора..."
cat > /tmp/create-admin.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.user.deleteMany({ where: { email: 'admin@fatiha.ru' } });
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
    console.error('❌ Ошибка:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
EOF

node /tmp/create-admin.js
rm /tmp/create-admin.js

echo "🔄 Перезапускаем приложение..."
pm2 restart fatiha

echo ""
echo "✅ ГОТОВО!"
echo "🌐 Откройте: https://fatiha.ru"
echo "📧 Email: admin@fatiha.ru"
echo "🔑 Password: admin123"
