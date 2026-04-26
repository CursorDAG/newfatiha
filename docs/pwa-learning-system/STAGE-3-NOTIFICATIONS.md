# STAGE 3: Push Notifications — Уведомления

**Статус:** 🟡 Не начато  
**Зависимости:** STAGE-1-DATABASE.md, STAGE-2-SERVICE-WORKER.md  
**Следующая стадия:** STAGE-4-LEARNING-PATHS.md

## 🎯 Цель стадии

Реализовать push-уведомления для:
- Напоминаний о живых уроках (за 1 час, за 15 минут)
- Напоминаний о стриках ("Не теряй стрик!")
- Достижений и наград
- Новых сообщений в чате

## 📁 Структура файлов

```
src/
  lib/
    push-notifications.ts     # Клиентская часть
    vapid-keys.ts            # VAPID ключи
  app/api/
    notifications/
      subscribe/route.ts      # Подписка на уведомления
      send/route.ts          # Отправка уведомлений
      unsubscribe/route.ts   # Отписка
public/
  sw.js                      # Обработка push в SW (обновить)
```

## 🔑 Генерация VAPID ключей

```bash
# Установить web-push
npm install web-push

# Сгенерировать ключи
npx web-push generate-vapid-keys

# Добавить в .env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key>
VAPID_PRIVATE_KEY=<private_key>
VAPID_SUBJECT=mailto:admin@fatiha.ru
```

## 📝 Реализация

### 1. Клиентская часть (src/lib/push-notifications.ts)

```typescript
// src/lib/push-notifications.ts

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  return await Notification.requestPermission();
}

export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  const permission = await requestNotificationPermission();
  
  if (permission !== 'granted') {
    console.warn('Notification permission denied');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });

  // Отправить подписку на сервер
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      subscription: subscription.toJSON(),
    }),
  });

  return subscription;
}

export async function unsubscribeFromPush(userId: string) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
```

### 2. API: Подписка (src/app/api/notifications/subscribe/route.ts)

```typescript
// src/app/api/notifications/subscribe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscription } = await req.json();
  
  // Сохранить подписку в БД
  await prisma.pushSubscription.upsert({
    where: {
      endpoint: subscription.endpoint,
    },
    create: {
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return NextResponse.json({ success: true });
}
```

### 3. API: Отправка (src/app/api/notifications/send/route.ts)

```typescript
// src/app/api/notifications/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import prisma from '@/lib/prisma';

// Настроить VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  // Только для админов или cron jobs
  const { userId, type, title, body, data } = await req.json();

  // Получить подписки пользователя
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type,
      ...data,
    },
  });

  // Отправить уведомления
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );

        // Логировать отправку
        await prisma.notificationLog.create({
          data: {
            userId,
            type,
            title,
            body,
            data: JSON.stringify(data),
          },
        });

        return { success: true };
      } catch (error: any) {
        // Если подписка невалидна, удалить
        if (error.statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
        }
        throw error;
      }
    })
  );

  return NextResponse.json({ results });
}
```

### 4. Обновить Service Worker (public/sw.js)

```javascript
// Добавить в public/sw.js

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, icon, badge, data: notificationData } = data;

  const options = {
    body,
    icon: icon || '/icon-192.png',
    badge: badge || '/icon-192.png',
    data: notificationData,
    vibrate: [200, 100, 200],
    tag: notificationData.type,
    requireInteraction: notificationData.type === 'LESSON_REMINDER',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { type, url } = event.notification.data;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если есть открытое окно, фокусируем его
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Иначе открываем новое
      if (clients.openWindow) {
        return clients.openWindow(url || '/');
      }
    })
  );

  // Логировать клик
  fetch('/api/notifications/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
});
```

### 5. Компонент настроек уведомлений

```typescript
// src/components/NotificationSettings.tsx

'use client';

import { useState, useEffect } from 'react';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/push-notifications';

export default function NotificationSettings({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  async function checkSubscription() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setEnabled(!!subscription);
  }

  async function toggleNotifications() {
    setLoading(true);
    
    try {
      if (enabled) {
        await unsubscribeFromPush(userId);
        setEnabled(false);
      } else {
        await subscribeToPush(userId);
        setEnabled(true);
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-4">Уведомления</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Push-уведомления</p>
          <p className="text-sm text-slate-600">
            Получать напоминания о уроках и стриках
          </p>
        </div>
        
        <button
          onClick={toggleNotifications}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            enabled
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {loading ? 'Загрузка...' : enabled ? 'Включено' : 'Выключено'}
        </button>
      </div>
    </div>
  );
}
```

### 6. Cron job для напоминаний о уроках

```typescript
// src/app/api/cron/lesson-reminders/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import webpush from 'web-push';

export async function GET() {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // Найти уроки, которые начнутся через час
  const upcomingLessons = await prisma.lesson.findMany({
    where: {
      type: 'LIVE',
      scheduledAt: {
        gte: now,
        lte: oneHourLater,
      },
    },
    include: {
      stream: {
        include: {
          enrollments: {
            include: {
              student: {
                include: {
                  pushSubscriptions: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Отправить уведомления
  for (const lesson of upcomingLessons) {
    for (const enrollment of lesson.stream.enrollments) {
      const student = enrollment.student;
      
      for (const sub of student.pushSubscriptions) {
        if (!sub.enableLessonReminders) continue;

        const payload = JSON.stringify({
          title: 'Урок скоро начнётся!',
          body: `"${lesson.title}" начнётся через 1 час`,
          icon: '/icon-192.png',
          data: {
            type: 'LESSON_REMINDER',
            lessonId: lesson.id,
            url: `/student/lessons/${lesson.id}`,
          },
        });

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (error) {
          console.error('Failed to send notification:', error);
        }
      }
    }
  }

  return NextResponse.json({ sent: upcomingLessons.length });
}
```

### 7. Cron job для напоминаний о стриках

```typescript
// src/app/api/cron/streak-reminders/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import webpush from 'web-push';

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Найти пользователей, которые не занимались сегодня
  const users = await prisma.userGameProfile.findMany({
    where: {
      currentStreak: { gt: 0 },
      lastActivityDate: { lt: today },
    },
    include: {
      user: {
        include: {
          pushSubscriptions: true,
        },
      },
    },
  });

  for (const profile of users) {
    for (const sub of profile.user.pushSubscriptions) {
      if (!sub.enableStreakReminders) continue;

      const payload = JSON.stringify({
        title: '🔥 Не теряй стрик!',
        body: `Твой стрик ${profile.currentStreak} дней. Пройди урок сегодня!`,
        icon: '/icon-192.png',
        data: {
          type: 'STREAK_REMINDER',
          url: '/student/learn',
        },
      });

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }

  return NextResponse.json({ sent: users.length });
}
```

## ✅ Чеклист выполнения

- [ ] Установить `web-push`: `npm install web-push`
- [ ] Сгенерировать VAPID ключи
- [ ] Добавить ключи в `.env`
- [ ] Создать `src/lib/push-notifications.ts`
- [ ] Создать API endpoints (subscribe, send, unsubscribe)
- [ ] Обновить `public/sw.js` для обработки push
- [ ] Создать компонент настроек уведомлений
- [ ] Создать cron jobs для напоминаний
- [ ] Настроить cron в Vercel/Railway
- [ ] Протестировать уведомления

## 🧪 Тестирование

```bash
# 1. Запустить приложение
npm run dev

# 2. Открыть настройки уведомлений
# Включить push-уведомления

# 3. Проверить в DevTools → Application → Push Messaging
# Отправить тестовое уведомление

# 4. Проверить cron jobs
curl http://localhost:3000/api/cron/lesson-reminders
curl http://localhost:3000/api/cron/streak-reminders
```

## ⚠️ Потенциальные проблемы

1. **VAPID ключи не работают**
   - Проверить формат ключей
   - Убедиться, что они в `.env`

2. **Уведомления не приходят**
   - Проверить разрешения в браузере
   - Проверить, что SW активен

3. **Cron jobs не запускаются**
   - Настроить в Vercel: `vercel.json`
   - Или использовать внешний cron (cron-job.org)

## 🔄 Следующая стадия

После завершения переходите к **[STAGE-4-LEARNING-PATHS.md](./STAGE-4-LEARNING-PATHS.md)**
