#!/bin/bash
# =============================================================
# Настройка файрвола для домашних LXC-контейнеров
# =============================================================
#
# Этот скрипт содержит правила для ТРЁХ уровней:
#   1. Proxmox хост — только WireGuard из интернета
#   2. LXC 1 (NPM)  — принимает HTTP только из WireGuard туннеля
#   3. LXC 2+ (Apps) — принимают трафик только от NPM
#
# ВАЖНО: Замените плейсхолдеры перед запуском:
#   NPM_LXC_IP       — IP-адрес LXC с NPM (например, 192.168.1.10)
#   FATIHA_LXC_IP     — IP-адрес LXC с Fatiha.ru (например, 192.168.1.20)
#
# Каждую секцию нужно выполнять на соответствующем сервере/контейнере.
set -euo pipefail

echo "============================================"
echo "  Правила файрвола для домашней инфраструктуры"
echo "============================================"
echo ""
echo "Ниже приведены команды для каждого компонента."
echo "Выполняйте их на соответствующих серверах."
echo ""

cat << 'RULES'
# =============================================================
# СЕКЦИЯ 1: Proxmox хост
# =============================================================
# Выполнить на хосте Proxmox (НЕ внутри LXC)
#
# Разрешаем только:
#   - SSH (22) для управления
#   - WireGuard (51820/udp) из интернета
#   - Локальную сеть (для общения с LXC)

# UFW вариант:
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 51820/udp comment 'WireGuard'
# Разрешить трафик из локальной сети Proxmox
sudo ufw allow from 192.168.0.0/16 comment 'LAN'
sudo ufw allow from 10.0.0.0/24 comment 'WireGuard subnet'
sudo ufw --force enable

# ВАЖНО: Порты 80 и 443 НЕ открываются на роутере!
# Весь веб-трафик приходит через WireGuard туннель.


# =============================================================
# СЕКЦИЯ 2: LXC 1 — Nginx Proxy Manager
# =============================================================
# Выполнить ВНУТРИ LXC контейнера с NPM
#
# NPM принимает HTTP только из WireGuard подсети (10.0.0.0/24).
# Admin UI (порт 81) доступен только из локальной сети.

sudo apt install -y iptables-persistent

# Очистить правила
sudo iptables -F INPUT

# Разрешить loopback и established-соединения
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# HTTP (80) — только из WireGuard туннеля
sudo iptables -A INPUT -p tcp --dport 80 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j DROP

# Admin UI (81) — только из локальной сети
sudo iptables -A INPUT -p tcp --dport 81 -s 192.168.0.0/16 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 81 -j DROP

# SSH для управления
sudo iptables -A INPUT -p tcp --dport 22 -s 192.168.0.0/16 -j ACCEPT

# Запретить всё остальное
sudo iptables -A INPUT -j DROP

# Сохранить правила
sudo netfilter-persistent save


# =============================================================
# СЕКЦИЯ 3: LXC 2 — Fatiha.ru (и другие приложения)
# =============================================================
# Выполнить ВНУТРИ LXC контейнера с приложением
#
# Замените NPM_LXC_IP на реальный IP вашего NPM LXC.

NPM_LXC_IP="192.168.1.10"  # <-- ЗАМЕНИТЕ на реальный IP

sudo apt install -y iptables-persistent

# Очистить правила
sudo iptables -F INPUT

# Разрешить loopback и established-соединения
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Порт 3000 (Next.js) — только от NPM LXC
sudo iptables -A INPUT -p tcp --dport 3000 -s ${NPM_LXC_IP} -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j DROP

# SSH для управления — только из локальной сети
sudo iptables -A INPUT -p tcp --dport 22 -s 192.168.0.0/16 -j ACCEPT

# Запретить всё остальное
sudo iptables -A INPUT -j DROP

# Сохранить правила
sudo netfilter-persistent save


# =============================================================
# Шаблон для НОВЫХ LXC (другие сайты)
# =============================================================
# Скопируйте секцию 3 и измените:
#   - Порт (3000 → порт вашего приложения)
#   - NPM_LXC_IP (обычно тот же)
RULES

echo ""
echo "Скопируйте нужную секцию и выполните на соответствующем сервере."
