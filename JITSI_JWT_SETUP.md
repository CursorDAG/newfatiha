# Настройка JWT аутентификации для Jitsi Meet

## Обзор

По умолчанию приложение использует публичный сервер `meet.jit.si` без аутентификации. Это означает, что любой, кто знает название комнаты (ID потока), может присоединиться к видеоконференции.

Для защиты видеокомнат от несанкционированного доступа можно настроить JWT (JSON Web Token) аутентификацию с собственным сервером Jitsi.

## Что было реализовано

### 1. Генерация JWT токенов (`src/lib/jitsi-jwt.ts`)

- Функция `generateJitsiToken()` создает подписанные JWT токены для каждого пользователя
- Токены содержат информацию о пользователе (ID, имя, email, роль)
- Учителя получают роль `moderator` с правами на запись и трансляцию
- Студенты получают роль `participant` без дополнительных прав
- Токены действительны 24 часа

### 2. API endpoint для получения токенов (`src/app/api/jitsi/token/route.ts`)

- `POST /api/jitsi/token` - генерирует токен для указанного потока
- Проверяет права доступа (учитель должен быть владельцем потока, студент - зачислен)
- Возвращает токен и домен Jitsi сервера

### 3. Интеграция в клиентские компоненты

- `LessonRoomClient` - страница урока с Jitsi
- `LiveJitsiEmbed` - встроенная комната для студентов
- `LiveJitsiRoom` - встроенная комната для учителей
- Все компоненты поддерживают передачу JWT токена в Jitsi API

### 4. Серверные компоненты

- `src/app/lesson/[lessonId]/page.tsx` - генерирует токен при загрузке страницы урока
- `src/app/teacher/page.tsx` - передает конфигурацию Jitsi в dashboard учителя
- `src/app/student/page.tsx` - передает конфигурацию Jitsi в dashboard студента

### 5. Тесты

- 15 unit тестов в `src/lib/__tests__/jitsi-jwt.test.ts`
- Покрытие: генерация токенов, валидация claims, проверка ролей

## Настройка собственного Jitsi сервера

### Шаг 1: Установка Jitsi Meet

Следуйте официальной документации: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart

```bash
# Пример для Ubuntu/Debian
wget -qO - https://download.jitsi.org/jitsi-key.gpg.key | sudo apt-key add -
sudo sh -c "echo 'deb https://download.jitsi.org stable/' > /etc/apt/sources.list.d/jitsi-stable.list"
sudo apt update
sudo apt install jitsi-meet
```

### Шаг 2: Настройка JWT аутентификации в Prosody

Отредактируйте `/etc/prosody/conf.avail/[your-domain].cfg.lua`:

```lua
VirtualHost "meet.yourdomain.com"
    authentication = "token"
    app_id = "fatiha_lms"
    app_secret = "YOUR_SECRET_KEY_HERE"
    allow_empty_token = false
```

Сгенерируйте секретный ключ:

```bash
openssl rand -base64 32
```

### Шаг 3: Настройка Jicofo

Отредактируйте `/etc/jitsi/jicofo/sip-communicator.properties`:

```properties
org.jitsi.jicofo.auth.URL=XMPP:meet.yourdomain.com
```

### Шаг 4: Настройка переменных окружения в приложении

Добавьте в `.env`:

```env
JITSI_DOMAIN="meet.yourdomain.com"
JITSI_JWT_APP_ID="fatiha_lms"
JITSI_JWT_SECRET="YOUR_SECRET_KEY_HERE"
```

**ВАЖНО:** `JITSI_JWT_APP_ID` и `JITSI_JWT_SECRET` должны совпадать с настройками в Prosody!

### Шаг 5: Перезапуск сервисов

```bash
sudo systemctl restart prosody
sudo systemctl restart jicofo
sudo systemctl restart jitsi-videobridge2
sudo systemctl restart nginx
```

### Шаг 6: Проверка

1. Перезапустите приложение Next.js
2. Войдите как учитель и откройте Live урок
3. Проверьте в консоли браузера, что Jitsi загружается с вашего домена
4. Попробуйте войти как студент - должен быть доступ только к своим потокам

## Режим работы без JWT (по умолчанию)

Если переменные окружения `JITSI_DOMAIN`, `JITSI_JWT_APP_ID` или `JITSI_JWT_SECRET` не установлены:

- Приложение использует публичный `meet.jit.si`
- JWT токены не генерируются
- Любой может присоединиться к комнате, зная ID потока

Это удобно для разработки и тестирования, но **не рекомендуется для production**.

## Безопасность

### Что защищает JWT аутентификация:

✅ Только авторизованные пользователи могут присоединиться к видеокомнате
✅ Учителя получают права модератора (запись, трансляция, управление участниками)
✅ Студенты не могут присоединиться к чужим потокам
✅ Токены имеют ограниченный срок действия (24 часа)

### Что НЕ защищает JWT аутентификация:

❌ Не защищает от перехвата токена (используйте HTTPS!)
❌ Не отзывает токены при исключении студента (токен действителен до истечения срока)
❌ Не защищает от DDoS атак на Jitsi сервер

### Рекомендации:

1. **Всегда используйте HTTPS** для production
2. **Настройте rate limiting** на `/api/jitsi/token`
3. **Мониторьте нагрузку** на Jitsi сервер
4. **Используйте короткий срок действия токенов** (сейчас 24 часа, можно уменьшить до 1-2 часов)
5. **Настройте firewall** для Jitsi сервера (разрешить только UDP 10000, TCP 443, TCP 4443)

## Масштабирование

Для больших классов (>50 участников) рекомендуется:

1. **Jitsi Octo** - каскадирование нескольких видеомостов
2. **Presenter mode** - только учитель транслирует видео, студенты только аудио
3. **Отдельный сервер для каждого региона** - снижает задержки

См. документацию: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-scalable

## Отладка

### Проверка генерации токенов

```bash
# В консоли браузера на странице урока
console.log(localStorage.getItem('jitsi-token'))
```

### Проверка валидности токена

Используйте https://jwt.io для декодирования токена и проверки claims.

### Логи Jitsi

```bash
# Prosody
sudo tail -f /var/log/prosody/prosody.log

# Jicofo
sudo tail -f /var/log/jitsi/jicofo.log

# Jitsi Videobridge
sudo tail -f /var/log/jitsi/jvb.log
```

### Частые проблемы

**"Token verification failed"**
- Проверьте, что `app_id` и `app_secret` совпадают в Prosody и `.env`
- Убедитесь, что токен не истек (проверьте `exp` claim)

**"Room not found"**
- Убедитесь, что `roomName` в токене совпадает с `roomName` в Jitsi API

**Студент не может войти**
- Проверьте, что студент зачислен в поток (`Enrollment.status = ACTIVE`)
- Проверьте логи API endpoint `/api/jitsi/token`

## Дальнейшие улучшения

1. **Автоматическое отключение при исключении** - интеграция с Jitsi XMPP API для принудительного отключения
2. **Обновление токенов** - автоматическое обновление токена перед истечением срока
3. **Аналитика** - отслеживание времени присутствия в видеокомнате
4. **Запись уроков** - автоматическая запись с сохранением в S3
5. **Лимиты участников** - ограничение количества одновременных участников на поток

## Ссылки

- [Jitsi JWT Documentation](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker#authentication)
- [Prosody Token Authentication](https://prosody.im/doc/modules/mod_auth_token)
- [Jitsi External API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)
