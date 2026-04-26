#!/bin/bash
# Установка и настройка Postfix для fatiha.ru

set -e

echo "=== Установка Postfix и необходимых пакетов ==="

# Обновление системы
apt-get update
apt-get upgrade -y

# Установка Postfix, OpenDKIM и утилит
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  postfix \
  opendkim \
  opendkim-tools \
  mailutils \
  libsasl2-modules

echo "=== Настройка Postfix ==="

# Backup оригинальных конфигов
cp /etc/postfix/main.cf /etc/postfix/main.cf.backup
cp /etc/postfix/master.cf /etc/postfix/master.cf.backup

# Основная конфигурация Postfix
cat > /etc/postfix/main.cf << 'EOF'
# Основные настройки
myhostname = mail.fatiha.ru
mydomain = fatiha.ru
myorigin = $mydomain
mydestination = localhost
relayhost =
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
mailbox_size_limit = 0
recipient_delimiter = +
inet_interfaces = all
inet_protocols = ipv4

# SMTP настройки
smtpd_banner = $myhostname ESMTP
biff = no
append_dot_mydomain = no
readme_directory = no
compatibility_level = 3.6

# TLS параметры
smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_tls_security_level=may
smtp_tls_security_level=may
smtpd_tls_session_cache_database = btree:${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache

# SASL аутентификация
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = $myhostname
broken_sasl_auth_clients = yes

# Ограничения
smtpd_recipient_restrictions =
  permit_mynetworks,
  permit_sasl_authenticated,
  reject_unauth_destination

# OpenDKIM
milter_protocol = 6
milter_default_action = accept
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
EOF

echo "=== Настройка OpenDKIM ==="

# Создание директорий
mkdir -p /etc/opendkim/keys/fatiha.ru
chown -R opendkim:opendkim /etc/opendkim
chmod 750 /etc/opendkim

# Конфигурация OpenDKIM
cat > /etc/opendkim.conf << 'EOF'
Syslog yes
SyslogSuccess yes
LogWhy yes
UMask 002
OversignHeaders From
Canonicalization relaxed/simple
Mode sv
SubDomains no
AutoRestart yes
AutoRestartRate 10/1M
Background yes
DNSTimeout 5
SignatureAlgorithm rsa-sha256

# Пути
KeyTable refile:/etc/opendkim/key.table
SigningTable refile:/etc/opendkim/signing.table
ExternalIgnoreList /etc/opendkim/trusted.hosts
InternalHosts /etc/opendkim/trusted.hosts

# Socket
Socket inet:8891@localhost
PidFile /run/opendkim/opendkim.pid
EOF

# Генерация DKIM ключа
opendkim-genkey -b 2048 -d fatiha.ru -D /etc/opendkim/keys/fatiha.ru -s mail -v
chown opendkim:opendkim /etc/opendkim/keys/fatiha.ru/mail.private
chmod 600 /etc/opendkim/keys/fatiha.ru/mail.private

# Key table
cat > /etc/opendkim/key.table << 'EOF'
mail._domainkey.fatiha.ru fatiha.ru:mail:/etc/opendkim/keys/fatiha.ru/mail.private
EOF

# Signing table
cat > /etc/opendkim/signing.table << 'EOF'
*@fatiha.ru mail._domainkey.fatiha.ru
EOF

# Trusted hosts
cat > /etc/opendkim/trusted.hosts << 'EOF'
127.0.0.1
localhost
194.58.114.184
*.fatiha.ru
fatiha.ru
EOF

chown -R opendkim:opendkim /etc/opendkim
chmod -R 750 /etc/opendkim

echo "=== Перезапуск сервисов ==="

systemctl restart opendkim
systemctl restart postfix
systemctl enable opendkim
systemctl enable postfix

echo "=== Проверка статуса ==="

systemctl status postfix --no-pager
systemctl status opendkim --no-pager

echo ""
echo "=== DKIM публичный ключ для DNS ==="
echo "Добавьте эту TXT запись в DNS:"
echo ""
cat /etc/opendkim/keys/fatiha.ru/mail.txt
echo ""

echo "=== SMTP настройки для приложения ==="
echo "SMTP_HOST=194.58.114.184"
echo "SMTP_PORT=25"
echo "SMTP_USER= (оставьте пустым)"
echo "SMTP_PASS= (оставьте пустым)"
echo "SMTP_FROM=info@fatiha.ru"
echo ""

echo "=== Установка завершена! ==="
