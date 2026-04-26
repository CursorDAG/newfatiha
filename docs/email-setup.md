# Настройка Email для регистрации

## Проблема

При регистрации письма **отправляются**, но попадают в тестовый сервис Ethereal.email, а не на реальную почту пользователя.

## Решение

Нужно настроить реальный SMTP сервер. Есть 2 способа:

### Способ 1: Через .env файл (быстро)

Добавьте в `.env`:

```env
# SMTP настройки
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@fatiha.ru
SMTP_FROM_NAME=Fatiha.ru
```

**Для Gmail:**
1. Включите 2FA в аккаунте Google
2. Создайте App Password: https://myaccount.google.com/apppasswords
3. Используйте этот пароль в `SMTP_PASS`

**Для Yandex:**
```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=your-email@yandex.ru
SMTP_PASS=your-password
```

**Для Mail.ru:**
```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=your-email@mail.ru
SMTP_PASS=your-password
```

### Способ 2: Через админ-панель (удобно)

1. Зайдите в админку: http://localhost:3000/admin/settings
2. Вкладка **Email**
3. Заполните:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP User: `your-email@gmail.com`
   - SMTP Password: `your-app-password`
   - From Email: `noreply@fatiha.ru`
   - From Name: `Fatiha.ru`
4. Нажмите **Сохранить**

## Проверка

1. Перезапустите сервер: `npm run dev`
2. Зарегистрируйте нового пользователя
3. Проверьте логи сервера — должно быть:
   ```
   INFO: Email sent successfully
   ```
4. Проверьте почту пользователя — должно прийти письмо с подтверждением

## Что происходит сейчас

Без настроек SMTP система автоматически создаёт тестовый аккаунт на Ethereal.email:

```
WARN: No SMTP credentials found, creating Ethereal test account
INFO: Ethereal test account created
  user: "random@ethereal.email"
  previewUrl: "https://ethereal.email/messages"
```

Письма **отправляются**, но попадают в Ethereal, а не к пользователю.

## Валидация email

Email **проверяется** при регистрации через Zod schema:

```typescript
email: z.string().email("Invalid email address")
```

Если формат неверный — регистрация не пройдёт.

## Что отправляется

При регистрации отправляется письмо с:
- Приветствием
- Ссылкой для подтверждения email
- Инструкциями

Шаблон: `src/lib/email/templates/email-verification.ts`

## Troubleshooting

**Письма не приходят:**
1. Проверьте SMTP настройки в .env или админке
2. Проверьте логи сервера на ошибки
3. Проверьте папку "Спам"
4. Для Gmail — убедитесь что используете App Password, а не обычный пароль

**Ошибка "Invalid login":**
- Gmail: нужен App Password (не обычный пароль)
- Yandex/Mail.ru: разрешите доступ для почтовых клиентов в настройках

**Ошибка "Connection timeout":**
- Проверьте порт (587 для TLS, 465 для SSL)
- Проверьте firewall
