#!/bin/bash
# =============================================================
# Настройка UFW файрвола — VPS (194.58.114.184)
# =============================================================
# Запуск: sudo bash ufw-setup.sh
set -euo pipefail

echo "=== Настройка UFW файрвола на VPS ==="

# Сбросить все правила
ufw --force reset

# Политика по умолчанию: блокировать входящие, разрешить исходящие
ufw default deny incoming
ufw default allow outgoing

# SSH (обязательно до включения UFW!)
ufw allow 22/tcp comment 'SSH'

# HTTP и HTTPS (для Nginx и Let's Encrypt)
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# WireGuard
ufw allow 51820/udp comment 'WireGuard'

# Включить файрвол
ufw --force enable

echo "=== UFW настроен. Текущие правила: ==="
ufw status verbose
