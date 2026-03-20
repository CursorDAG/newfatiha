#!/bin/bash
# Быстрое исправление - пересборка приложения

cd /var/www/newfatiha

echo "🗑️  Удаляем старый билд..."
rm -rf .next

echo "🔨 Пересобираем приложение..."
npm run build

echo "🔄 Перезапускаем PM2..."
pm2 restart fatiha

echo ""
echo "✅ ГОТОВО!"
echo "Откройте https://fatiha.ru и попробуйте войти"
echo "Email: admin@fatiha.ru"
echo "Password: admin123"
