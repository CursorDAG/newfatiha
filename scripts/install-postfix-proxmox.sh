#!/bin/bash
# Установка Postfix на VM 151 (Proxmox) для fatiha.ru
# Этот сервер будет принимать письма с локалки и отправлять через белый IP

set -e

echo "=== Установка Postfix + OpenDKIM ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y postfix opendkim opendkim-tools mailutils

echo "=== Настройка Postfix ==="
cat > /etc/postfix/main.cf << 'EOF'
# Основные настройки
myhostname = mail.fatiha.ru
mydomain = fatiha.ru
myorigin = $mydomain
mydestination = localhost
mynetworks = 192.168.88.0/24, 127.0.0.0/8
inet_interfaces = all
inet_protocols = ipv4

# Relay настройки
relayhost =
smtpd_recipient_restrictions = permit_mynetworks, reject_unauth_destination

# DKIM
milter_protocol = 6
milter_default_action = accept
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
EOF

echo "=== Настройка OpenDKIM ==="
mkdir -p /etc/opendkim/keys/fatiha.ru

cat > /etc/opendkim.conf << 'EOF'
Syslog yes
Canonicalization relaxed/simple
Mode sv
KeyTable refile:/etc/opendkim/key.table
SigningTable refile:/etc/opendkim/signing.table
Socket inet:8891@localhost
EOF

# Генерация DKIM ключа
opendkim-genkey -b 2048 -d fatiha.ru -D /etc/opendkim/keys/fatiha.ru -s mail
chown -R opendkim:opendkim /etc/opendkim
chmod 600 /etc/opendkim/keys/fatiha.ru/mail.private

echo "mail._domainkey.fatiha.ru fatiha.ru:mail:/etc/opendkim/keys/fatiha.ru/mail.private" > /etc/opendkim/key.table
echo "*@fatiha.ru mail._domainkey.fatiha.ru" > /etc/opendkim/signing.table

# Перезапуск сервисов
systemctl restart opendkim postfix
systemctl enable opendkim postfix

echo ""
echo "=== DKIM ключ для DNS ==="
cat /etc/opendkim/keys/fatiha.ru/mail.txt

echo ""
echo "=== Установка завершена! ==="
echo "SMTP настройки для приложения:"
echo "SMTP_HOST=192.168.88.151"
echo "SMTP_PORT=25"
echo "SMTP_USER="
echo "SMTP_PASS="
echo "SMTP_FROM=info@fatiha.ru"
