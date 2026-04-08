#!/bin/bash
# =============================================================
# Автодобавление домена и SSL-сертификата на VPS
# =============================================================
# Использование: sudo bash add-domain.sh mysite.ru
# =============================================================

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Использование: $0 <domain> [forward_ip]"
  echo "Пример: $0 mysite.ru 192.168.88.70"
  echo ""
  echo "Инструкция:"
  echo "  1. Убедись что DNS-запись для домена указывает на 194.58.114.184"
  echo "  2. Запусти скрипт: bash add-domain.sh mysite.ru"
  exit 1
fi

DOMAIN="$1"
FORWARD_IP="${2:-192.168.88.50}"
NGINX_CONF="/etc/nginx/sites-enabled/multi-proxy.conf"
CERT_DOMAINS=""

echo "============================================"
echo "  Добавление домена: $DOMAIN"
echo "============================================"

# Собираем все домены из текущего конфига
CERT_DOMAINS=$(grep -oP 'server_name\s+\K[^;]+' "$NGINX_CONF" | head -1 | tr ' ' '\n' | grep -v '\*' | tr '\n' ' ')

# Добавляем новый домен
ALL_DOMAINS="$CERT_DOMAINS $DOMAIN"
WWW_DOMAIN="$(echo $DOMAIN | sed 's/\(.*\)/www.\1/')"
ALL_DOMAINS="$ALL_DOMAINS $WWW_DOMAIN"

echo "Все домены: $ALL_DOMAINS"
echo ""

# --- Шаг 1: Обновляем Nginx конфиг ---
echo ">>> Обновляю Nginx конфиг..."

# Убираем старые server_name строки, добавляем новую
sed -i "/server_name .*;/c\\    server_name $ALL_DOMAINS;" "$NGINX_CONF"

# Проверяем конфиг
nginx -t
if [ $? -eq 0 ]; then
  systemctl reload nginx
  echo "    Nginx обновлён и перезапущен."
else
  echo "    ОШИБКА: Nginx конфиг не прошёл проверку!"
  echo "    Откат изменений вручную."
  exit 1
fi

# --- Шаг 2: Получаем SSL ---
echo ""
echo ">>> Запрашиваю SSL-сертификат..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@fatiha.ru

if [ $? -eq 0 ]; then
  echo "    SSL-сертификат получен!"
else
  echo "    ВНИМАНИЕ: Не удалось получить SSL."
  echo "    Возможные причины:"
  echo "    - DNS-запись ещё не обновилась (подожди 15-30 мин)"
  echo "    - Домен не указывает на 194.58.114.184"
  echo "    - Порт 80 закрыт файрволом"
  echo ""
  echo "    После исправления запусти: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo ""
echo "============================================"
echo "  Готово!"
echo "============================================"
echo ""
echo "  Теперь добавь маршрут в NPM на домашнем сервере:"
echo "  http://192.168.88.50:81 -> Proxy Hosts -> Add"
echo "  Domain: $DOMAIN, www.$DOMAIN"
echo "  Forward IP: $FORWARD_IP"
echo "  WebSockets: если нужно"
echo ""
