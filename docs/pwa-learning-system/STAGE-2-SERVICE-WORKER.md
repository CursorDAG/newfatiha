# STAGE 2: Service Worker — Офлайн режим и кэширование

**Статус:** 🟡 Не начато  
**Зависимости:** STAGE-1-DATABASE.md  
**Следующая стадия:** STAGE-3-NOTIFICATIONS.md

## 🎯 Цель стадии

Создать Service Worker для:
- Офлайн-доступа к урокам
- Кэширования статики и API
- Background Sync для прогресса
- Предзагрузки следующих уроков

## 📁 Структура файлов

```
public/
  sw.js                    # Service Worker
  sw-config.js             # Конфигурация кэширования
src/
  lib/
    sw-registration.ts     # Регистрация SW
    sw-messaging.ts        # Общение с SW
    offline-storage.ts     # IndexedDB обёртка
```

## 📝 Реализация

### 1. Service Worker (public/sw.js)

```javascript
// public/sw.js
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const LEARNING_CACHE = `learning-${CACHE_VERSION}`;

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Установка SW
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  self.skipWaiting();
});

// Активация SW
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== LEARNING_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  
  self.clients.claim();
});

// Fetch стратегии
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Стратегия для разных типов запросов
  if (url.pathname.startsWith('/api/learning/')) {
    // Learning API: Network First, fallback to Cache
    event.respondWith(networkFirstStrategy(request, LEARNING_CACHE));
  } else if (url.pathname.startsWith('/api/')) {
    // Другие API: Network Only
    event.respondWith(fetch(request));
  } else if (url.pathname.startsWith('/student/learn/')) {
    // Learning страницы: Cache First, fallback to Network
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE));
  } else {
    // Статика: Cache First
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  }
});

// Network First стратегия
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Cache First стратегия
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Background Sync для прогресса
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

async function syncProgress() {
  // Получить несинхронизированный прогресс из IndexedDB
  const db = await openDB();
  const progress = await db.getAll('pending-progress');
  
  for (const item of progress) {
    try {
      await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      
      // Удалить после успешной отправки
      await db.delete('pending-progress', item.id);
    } catch (error) {
      console.error('[SW] Failed to sync progress:', error);
    }
  }
}

// Открыть IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fatiha-learning', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-progress')) {
        db.createObjectStore('pending-progress', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('cached-lessons')) {
        db.createObjectStore('cached-lessons', { keyPath: 'id' });
      }
    };
  });
}
```

### 2. Регистрация SW (src/lib/sw-registration.ts)

```typescript
// src/lib/sw-registration.ts

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Registered:', registration);

    // Проверка обновлений каждые 24 часа
    setInterval(() => {
      registration.update();
    }, 24 * 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (registration) {
    await registration.unregister();
    console.log('[SW] Unregistered');
  }
}

// Проверить, работает ли SW
export function isServiceWorkerActive(): boolean {
  return navigator.serviceWorker?.controller !== null;
}
```

### 3. Общение с SW (src/lib/sw-messaging.ts)

```typescript
// src/lib/sw-messaging.ts

export async function sendMessageToSW(message: any): Promise<any> {
  if (!navigator.serviceWorker?.controller) {
    throw new Error('Service Worker not active');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

// Предзагрузить уроки для офлайн-доступа
export async function prefetchLessons(lessonIds: string[]) {
  try {
    await sendMessageToSW({
      type: 'PREFETCH_LESSONS',
      lessonIds,
    });
    console.log('[SW] Lessons prefetched:', lessonIds);
  } catch (error) {
    console.error('[SW] Prefetch failed:', error);
  }
}

// Синхронизировать прогресс
export async function syncProgress() {
  if ('sync' in navigator.serviceWorker) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-progress');
    console.log('[SW] Progress sync registered');
  }
}
```

### 4. IndexedDB обёртка (src/lib/offline-storage.ts)

```typescript
// src/lib/offline-storage.ts

const DB_NAME = 'fatiha-learning';
const DB_VERSION = 1;

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Хранилище для несинхронизированного прогресса
        if (!db.objectStoreNames.contains('pending-progress')) {
          db.createObjectStore('pending-progress', { keyPath: 'id', autoIncrement: true });
        }

        // Хранилище для кэшированных уроков
        if (!db.objectStoreNames.contains('cached-lessons')) {
          const store = db.createObjectStore('cached-lessons', { keyPath: 'id' });
          store.createIndex('pathId', 'pathId', { unique: false });
        }

        // Хранилище для прогресса (дублирование для офлайн)
        if (!db.objectStoreNames.contains('user-progress')) {
          db.createObjectStore('user-progress', { keyPath: 'id' });
        }
      };
    });
  }

  // Сохранить прогресс для синхронизации
  async savePendingProgress(data: any) {
    if (!this.db) await this.init();

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['pending-progress'], 'readwrite');
      const store = transaction.objectStore('pending-progress');
      const request = store.add({ data, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Получить кэшированный урок
  async getCachedLesson(lessonId: string) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cached-lessons'], 'readonly');
      const store = transaction.objectStore('cached-lessons');
      const request = store.get(lessonId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Сохранить урок в кэш
  async cacheLesson(lesson: any) {
    if (!this.db) await this.init();

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['cached-lessons'], 'readwrite');
      const store = transaction.objectStore('cached-lessons');
      const request = store.put(lesson);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
```

### 5. Интеграция в приложение

```typescript
// src/app/layout.tsx (добавить в Root Layout)

'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw-registration';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Регистрация SW при загрузке
    registerServiceWorker();
  }, []);

  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
```

## ✅ Чеклист выполнения

- [ ] Создать `public/sw.js`
- [ ] Создать `src/lib/sw-registration.ts`
- [ ] Создать `src/lib/sw-messaging.ts`
- [ ] Создать `src/lib/offline-storage.ts`
- [ ] Добавить регистрацию SW в layout
- [ ] Обновить `next.config.js` для поддержки SW
- [ ] Создать страницу `/offline` для офлайн-режима
- [ ] Протестировать кэширование
- [ ] Протестировать Background Sync

## 🧪 Тестирование

```bash
# 1. Запустить dev сервер
npm run dev

# 2. Открыть DevTools → Application → Service Workers
# Проверить, что SW зарегистрирован

# 3. Включить офлайн-режим в DevTools → Network → Offline
# Проверить, что страницы загружаются из кэша

# 4. Пройти урок офлайн
# Проверить, что прогресс сохранился в IndexedDB

# 5. Включить онлайн
# Проверить, что прогресс синхронизировался
```

## ⚠️ Потенциальные проблемы

1. **Конфликт с Socket.io**
   - **Решение:** Socket.io работает через WebSocket, не затрагивает fetch

2. **Кэш не обновляется**
   - **Решение:** Увеличить `CACHE_VERSION` при деплое

3. **IndexedDB не работает в приватном режиме**
   - **Решение:** Добавить fallback на localStorage

## 🔄 Следующая стадия

После завершения переходите к **[STAGE-3-NOTIFICATIONS.md](./STAGE-3-NOTIFICATIONS.md)**
