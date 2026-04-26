# DNS записи для почты fatiha.ru

## Добавьте в REG.RU:

### 1. MX запись (уже есть от ImprovMX - оставьте)
```
Тип: MX
Имя: @
Значение: mx1.improvmx.com
Приоритет: 10

Тип: MX
Имя: @
Значение: mx2.improvmx.com
Приоритет: 20
```

### 2. A запись для mail.fatiha.ru
```
Тип: A
Имя: mail
Значение: 194.58.114.184
TTL: 3600
```

### 3. SPF запись (обновите существующую)
```
Тип: TXT
Имя: @
Значение: v=spf1 ip4:194.58.114.184 include:spf.improvmx.com ~all
TTL: 3600
```

### 4. DKIM запись
```
Тип: TXT
Имя: mail._domainkey
Значение: v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlsxFq6qBrwDD/+vNMdfwzwD8S2OApWQvG5lnnGOzNS0S1MxinJb7EUjVJ1KuyxKSITSXudWy44nqLOSeF4M4Y3IXTgja2Aj+DWdeKaPbIwu6AWyo4pAJNNIzofWdT/locXu31OzIBFH9bvWwLFcjxB+1xp2xohZhWC0bkyGcfUWmtkr/A56yIG4gnY3elYUmv9g9G9DNsPre4XivgA1kKaSblbUCR9Ywf57JfCRPZc5iIFp8za2QvEtsbcy/rCG1SqhkYw4tYS1G6GKz/lsZNp3m7OoMFjqgr2HreBGflOCq4v9W+OTPzT26lTVhHDbjdmRi1M/77cmkSJUg2IYIDwIDAQAB
TTL: 3600
```

### 5. DMARC запись (обновите существующую если есть)
```
Тип: TXT
Имя: _dmarc
Значение: v=DMARC1; p=none; rua=mailto:admin@fatiha.ru
TTL: 3600
```

### 6. PTR запись (Reverse DNS)
**Важно:** Это настраивается в панели REG.RU для IP адреса, не в DNS зоне домена.

1. Зайдите в панель управления сервером REG.RU
2. Найдите раздел "Reverse DNS" или "PTR запись"
3. Установите: `mail.fatiha.ru` для IP `194.58.114.184`

## Проверка после добавления

Подождите 10-30 минут после добавления записей, затем проверьте:

```bash
# Проверка MX
dig fatiha.ru MX +short

# Проверка A записи
dig mail.fatiha.ru A +short

# Проверка SPF
dig fatiha.ru TXT +short | grep spf

# Проверка DKIM
dig mail._domainkey.fatiha.ru TXT +short

# Проверка DMARC
dig _dmarc.fatiha.ru TXT +short

# Проверка PTR
dig -x 194.58.114.184 +short
```

## Онлайн проверка

После настройки проверьте на:
- https://mxtoolbox.com/SuperTool.aspx
- https://www.mail-tester.com/

## Готово!

После добавления всех записей почтовый сервер будет полностью настроен.
