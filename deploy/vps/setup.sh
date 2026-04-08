#!/bin/bash
# =============================================================
# Полная настройка VPS — Edge Proxy
# Сервер: Ubuntu 24.04, 194.58.114.184
# =============================================================
#
# Запуск: sudo bash setup.sh
#
# Что делает этот скрипт:
#   1. Обновляет систему
#   2. Устанавливает Nginx, Certbot, WireGuard
#   3. Применяет конфиги Nginx и WireGuard
#   4. Настраивает UFW файрвол
#   5. Запускает WireGuard
#
# ВАЖНО: Перед запуском убедитесь, что:
#   - Ключи WireGuard сгенерированы и подставлены в wg0.conf
#   - DNS-записи для доменов указывают на 194.58.114.184
#   - HOME_STATIC_IP заменён на реальный IP в wg0.conf
#
set -euo pipefail

echo "============================================"
echo "  Настройка VPS Edge Proxy"
echo "============================================"

# --- 1. Обновление системы ---
echo ""
echo ">>> [1/6] Обновление системы..."
apt update && apt upgrade -y

# --- 2. Установка пакетов ---
echo ""
echo ">>> [2/6] Установка Nginx, Certbot, WireGuard..."
apt install -y nginx certbot python3-certbot-nginx wireguard

# --- 3. Настройка Nginx ---
echo ""
echo ">>> [3/6] Настройка Nginx..."

# Удалить дефолтный конфиг
rm -f /etc/nginx/sites-enabled/default

# Скопировать наш конфиг
cp ./nginx/sites-available/multi-proxy.conf /etc/nginx/sites-available/multi-proxy.conf

# Активировать
ln -sf /etc/nginx/sites-available/multi-proxy.conf /etc/nginx/sites-enabled/multi-proxy.conf

# Создать директорию для ACME challenge
mkdir -p /var/www/certbot

# Проверить конфигурацию
nginx -t

# Перезагрузить Nginx
systemctl reload nginx
systemctl enable nginx

echo "    Nginx настроен и запущен."

# --- 4. Настройка WireGuard ---
echo ""
echo ">>> [4/6] Настройка WireGuard..."

# Скопировать конфиг (ключи уже должны быть подставлены!)
cp ./wireguard/wg0.conf /etc/wireguard/wg0.conf
chmod 600 /etc/wireguard/wg0.conf

# Включить IP forwarding
echo "net.ipv4.ip_forward=1" > /etc/sysctl.d/99-wireguard.conf
sysctl -p /etc/sysctl.d/99-wireguard.conf

# Запустить и включить автозапуск
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

echo "    WireGuard запущен. Проверка соединения:"
wg show wg0 || echo "    (Peer пока не подключён — это нормально, если Home ещё не настроен)"

# --- 5. Настройка UFW ---
echo ""
echo ">>> [5/6] Настройка файрвола..."
bash ./ufw-setup.sh

# --- 6. SSL-сертификаты ---
echo ""
echo ">>> [6/6] SSL-сертификаты"
echo ""
echo "    ВАЖНО: SSL-сертификаты нужно получить вручную ПОСЛЕ того, как:"
echo "    1. DNS-записи для доменов указывают на 194.58.114.184"
echo "    2. WireGuard туннель работает"
echo "    3. NPM на домашнем сервере запущен"
echo ""
echo "    Выполните команду:"
echo "    sudo certbot --nginx -d fatiha.ru -d www.fatiha.ru"
echo ""
echo "    Для дополнительных доменов:"
echo "    sudo certbot --nginx -d other-site.ru"
echo ""
echo "    Автообновление сертификатов уже настроено через systemd timer:"
systemctl list-timers | grep certbot || echo "    (certbot timer будет доступен после получения первого сертификата)"

echo ""
echo "============================================"
echo "  VPS настроен!"
echo "============================================"
echo ""
echo "  Следующие шаги:"
echo "  1. Настройте домашний сервер (WireGuard + NPM)"
echo "  2. Проверьте туннель: ping 10.0.0.2"
echo "  3. Получите SSL: sudo certbot --nginx -d fatiha.ru -d www.fatiha.ru"
echo ""
