# Серверная инфраструктура

## Продакшн сервер (REG.RU)

**IP:** 194.58.114.184
**Hostname:** 194-58-114-184.cloudvps.regruhosting.ru
**ОС:** Ubuntu 24.04 LTS
**Название:** Beige Hydrargyrum

**SSH доступ:**
```bash
ssh root@194.58.114.184
# Пароль: 2ew7IOH3Uu7XhCVA
```

**Назначение:**
- Внешний шлюз для Proxmox (WireGuard туннель)
- Почтовый сервер (Postfix + OpenDKIM)
- Можно размещать дополнительные сайты

**Установленные сервисы:**
- Postfix (SMTP сервер)
- OpenDKIM (подпись писем)
- WireGuard (туннель к Proxmox)

## Локальная инфраструктура

**Proxmox:**
- За NAT
- Подключён к REG.RU серверу через WireGuard
- Основное приложение Fatiha.ru

## Почтовый сервер

**SMTP настройки для приложения:**
```env
SMTP_HOST=194.58.114.184
SMTP_PORT=25
SMTP_USER=
SMTP_PASS=
SMTP_FROM=info@fatiha.ru
SMTP_FROM_NAME=Fatiha.ru
```

**Получение писем:**
- ImprovMX пересылка: info@fatiha.ru → bilyiq@gmail.com
- admin@fatiha.ru → bilyiq@gmail.com

**DNS записи (REG.RU):**
- MX: mx1.improvmx.com, mx2.improvmx.com
- SPF: v=spf1 include:spf.improvmx.com ~all
- DKIM: mail._domainkey → (см. /etc/opendkim/keys/fatiha.ru/mail.txt на сервере)
- DMARC: v=DMARC1; p=none

## Подключение через Python

```python
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('194.58.114.184', username='root', password='2ew7IOH3Uu7XhCVA')

stdin, stdout, stderr = client.exec_command('команда')
print(stdout.read().decode())
client.close()
```

## Полезные команды

**Проверка статуса почты:**
```bash
systemctl status postfix
systemctl status opendkim
journalctl -u postfix -f
mailq  # Очередь писем
```

**Тест отправки:**
```bash
echo "Test" | mail -s "Subject" test@example.com
```

**Логи:**
```bash
tail -f /var/log/mail.log
```
