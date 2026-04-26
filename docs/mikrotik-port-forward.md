# Настройка проброса порта 25 на MikroTik для VM 151

## Команды для MikroTik (через SSH)

```bash
# Подключение к MikroTik
ssh batyr@192.168.88.1
# Пароль: Maxa4kala

# Добавить NAT правило для проброса порта 25
/ip firewall nat add chain=dstnat action=dst-nat to-addresses=192.168.88.151 to-ports=25 protocol=tcp dst-port=25 in-interface=pppoe-out1 comment="SMTP to mail-server VM151"

# Проверить правило
/ip firewall nat print where comment~"SMTP"

# Готово!
```

## Что это делает:

1. **Входящие подключения** на белый IP:25 → перенаправляются на 192.168.88.151:25
2. **in-interface=pppoe-out1** — только с внешнего интерфейса (PPPoE)
3. **VM 151** получает все SMTP подключения

## Проверка после настройки:

```bash
# На VM 151 проверить что порт 25 слушает
ss -tlnp | grep :25

# Отправить тестовое письмо
echo "Test from VM 151" | mail -s "Test" bityiq@gmail.com
```

## DNS записи (обновить в REG.RU):

Замените A запись для mail.fatiha.ru:

**Старое:**
```
A mail → 194.58.114.184
```

**Новое:**
```
A mail → ВАШ_БЕЛЫЙ_IP
```

## PTR запись (запросить у провайдера):

Напишите провайдеру:
> "Прошу настроить PTR запись для IP [ваш белый IP]: mail.fatiha.ru"

## SMTP настройки для приложения (.env):

```env
SMTP_HOST=192.168.88.151
SMTP_PORT=25
SMTP_USER=
SMTP_PASS=
SMTP_FROM=info@fatiha.ru
SMTP_FROM_NAME=Fatiha.ru
```

## Готово!

После этих настроек:
- ✅ Письма отправляются с VM 151 через ваш белый IP
- ✅ DKIM подпись работает
- ✅ Нет блокировок портов
- ✅ Полный контроль
