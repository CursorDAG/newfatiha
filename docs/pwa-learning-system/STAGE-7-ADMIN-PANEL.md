# STAGE 7: Admin Panel — Админка для управления

**Статус:** 🟡 Не начато  
**Зависимости:** Все предыдущие стадии  
**Следующая стадия:** Нет (финальная стадия)

## 🎯 Цель стадии

Добавить в админку управление:
- Учебными треками (Learning Paths)
- Упражнениями
- Достижениями
- Библиотекой книг
- Статистикой по обучению

## 📁 Структура файлов

```
src/
  app/
    admin/
      learning/
        page.tsx              # Список треков
        [pathId]/
          page.tsx            # Редактор трека
          [unitId]/
            [lessonId]/
              page.tsx        # Редактор урока
      achievements/
        page.tsx              # Управление достижениями
      library/
        page.tsx              # Управление библиотекой
      analytics/
        learning/
          page.tsx            # Аналитика обучения
```

## 📝 Реализация

### 1. Список учебных треков

```typescript
// src/app/admin/learning/page.tsx

import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default async function AdminLearningPage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== 'ADMIN') {
    redirect('/');
  }

  const paths = await prisma.learningPath.findMany({
    include: {
      units: {
        include: {
          lessons: true,
        },
      },
      _count: {
        select: {
          userProgress: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Учебные треки
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Управление Duolingo-style обучением
            </p>
          </div>

          <Link href="/admin/learning/new">
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus className="w-5 h-5" />
              Создать трек
            </button>
          </Link>
        </div>
      </div>

      {/* Список треков */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paths.map((path) => {
          const totalLessons = path.units.reduce(
            (sum, unit) => sum + unit.lessons.length,
            0
          );

          return (
            <div
              key={path.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{path.icon}</div>
                <div className="flex gap-2">
                  <Link href={`/admin/learning/${path.id}`}>
                    <button className="p-2 text-slate-600 hover:text-emerald-600 transition-colors">
                      <Edit className="w-5 h-5" />
                    </button>
                  </Link>
                  <button className="p-2 text-slate-600 hover:text-red-600 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {path.title}
              </h3>
              
              <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                {path.description}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Юнитов</span>
                  <span className="font-medium">{path.units.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Уроков</span>
                  <span className="font-medium">{totalLessons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Пользователей</span>
                  <span className="font-medium">{path._count.userProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Статус</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      path.isPublished
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {path.isPublished ? 'Опубликован' : 'Черновик'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 2. Редактор трека

```typescript
// src/app/admin/learning/[pathId]/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, GripVertical, Edit, Trash2 } from 'lucide-react';

export default function EditPathPage({ params }: { params: { pathId: string } }) {
  const router = useRouter();
  const [path, setPath] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPath();
  }, []);

  const fetchPath = async () => {
    const res = await fetch(`/api/admin/learning/paths/${params.pathId}`);
    const data = await res.json();
    setPath(data);
    setLoading(false);
  };

  const savePath = async () => {
    await fetch(`/api/admin/learning/paths/${params.pathId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(path),
    });
    
    alert('Сохранено!');
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Основная информация */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Основная информация
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Название
              </label>
              <input
                type="text"
                value={path.title}
                onChange={(e) => setPath({ ...path, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Описание
              </label>
              <textarea
                value={path.description}
                onChange={(e) => setPath({ ...path, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Иконка (emoji)
                </label>
                <input
                  type="text"
                  value={path.icon}
                  onChange={(e) => setPath({ ...path, icon: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Сложность
                </label>
                <select
                  value={path.difficulty}
                  onChange={(e) => setPath({ ...path, difficulty: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="BEGINNER">Начальный</option>
                  <option value="INTERMEDIATE">Средний</option>
                  <option value="ADVANCED">Продвинутый</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={path.isPublished}
                  onChange={(e) => setPath({ ...path, isPublished: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded"
                />
                <span className="text-sm font-medium text-slate-700">
                  Опубликовать трек
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={savePath}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Сохранить
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>

        {/* Юниты */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Юниты</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus className="w-5 h-5" />
              Добавить юнит
            </button>
          </div>

          <div className="space-y-4">
            {path.units?.map((unit: any, index: number) => (
              <div
                key={unit.id}
                className="border border-slate-200 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                  
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">
                      Юнит {index + 1}: {unit.title}
                    </div>
                    <div className="text-sm text-slate-600">
                      {unit.lessons?.length || 0} уроков
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="p-2 text-slate-600 hover:text-emerald-600">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-600 hover:text-red-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Управление достижениями

```typescript
// src/app/admin/achievements/page.tsx

import prisma from '@/lib/prisma';
import { Plus } from 'lucide-react';

export default async function AdminAchievementsPage() {
  const achievements = await prisma.achievement.findMany({
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Достижения
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Управление бейджами и наградами
            </p>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus className="w-5 h-5" />
            Создать достижение
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <div className="text-5xl mb-4">{achievement.icon}</div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {achievement.title}
            </h3>
            
            <p className="text-slate-600 text-sm mb-4">
              {achievement.description}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Награда</span>
                <span className="font-medium text-emerald-600">
                  +{achievement.xpReward} XP
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Получили</span>
                <span className="font-medium">{achievement._count.users} чел.</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Управление библиотекой

```typescript
// src/app/admin/library/page.tsx

import prisma from '@/lib/prisma';
import { Plus, Upload } from 'lucide-react';

export default async function AdminLibraryPage() {
  const books = await prisma.book.findMany({
    include: {
      course: {
        select: {
          title: true,
        },
      },
      _count: {
        select: {
          readProgress: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Библиотека
            </h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">
              Управление книгами и материалами
            </p>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            <Upload className="w-5 h-5" />
            Загрузить книгу
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Название
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Автор
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Тип
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Читателей
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Статус
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {books.map((book) => (
              <tr key={book.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{book.title}</div>
                  {book.course && (
                    <div className="text-sm text-slate-600">
                      Курс: {book.course.title}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600">{book.author || '—'}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      book.type === 'PUBLIC'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {book.type === 'PUBLIC' ? 'Публичная' : 'Курсовая'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {book._count.readProgress}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      book.isPublished
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {book.isPublished ? 'Опубликована' : 'Черновик'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 5. Аналитика обучения

```typescript
// src/app/admin/analytics/learning/page.tsx

import prisma from '@/lib/prisma';

export default async function LearningAnalyticsPage() {
  // Общая статистика
  const stats = {
    totalUsers: await prisma.userGameProfile.count(),
    totalXP: await prisma.userGameProfile.aggregate({
      _sum: { totalXP: true },
    }),
    activeStreaks: await prisma.userGameProfile.count({
      where: { currentStreak: { gt: 0 } },
    }),
    completedLessons: await prisma.lessonCompletion.count(),
  };

  // Топ пользователей
  const topUsers = await prisma.userGameProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { totalXP: 'desc' },
    take: 10,
  });

  // Популярные треки
  const popularPaths = await prisma.learningPath.findMany({
    include: {
      _count: {
        select: {
          userProgress: true,
        },
      },
    },
    orderBy: {
      userProgress: {
        _count: 'desc',
      },
    },
    take: 5,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Аналитика обучения
        </h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">
          Статистика по Duolingo-style обучению
        </p>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-600 mb-2">Всего пользователей</div>
          <div className="text-3xl font-bold text-slate-900">{stats.totalUsers}</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-600 mb-2">Всего XP</div>
          <div className="text-3xl font-bold text-emerald-600">
            {stats.totalXP._sum.totalXP?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-600 mb-2">Активных стриков</div>
          <div className="text-3xl font-bold text-orange-600">{stats.activeStreaks}</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-slate-600 mb-2">Уроков пройдено</div>
          <div className="text-3xl font-bold text-blue-600">{stats.completedLessons}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Топ пользователей */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Топ-10 пользователей
          </h2>
          <div className="space-y-3">
            {topUsers.map((profile, index) => (
              <div key={profile.id} className="flex items-center gap-3">
                <div className="text-2xl font-bold text-slate-400 w-8">
                  #{index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {profile.user.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    Уровень {profile.level} • {profile.totalXP} XP
                  </div>
                </div>
                <div className="text-2xl">{profile.league === 'DIAMOND' ? '💠' : profile.league === 'PLATINUM' ? '💎' : profile.league === 'GOLD' ? '🥇' : profile.league === 'SILVER' ? '🥈' : '🥉'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Популярные треки */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Популярные треки
          </h2>
          <div className="space-y-3">
            {popularPaths.map((path) => (
              <div key={path.id} className="flex items-center gap-3">
                <div className="text-3xl">{path.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{path.title}</div>
                  <div className="text-sm text-slate-600">
                    {path._count.userProgress} пользователей
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## ✅ Чеклист выполнения

- [ ] Создать страницу списка треков
- [ ] Создать редактор трека
- [ ] Создать редактор юнита
- [ ] Создать редактор урока
- [ ] Создать редактор упражнений
- [ ] Создать управление достижениями
- [ ] Создать управление библиотекой
- [ ] Создать загрузку книг (PDF/EPUB)
- [ ] Создать аналитику обучения
- [ ] Протестировать все функции админки

## 🎉 Поздравляем!

Вы завершили все стадии PWA Learning System! Теперь у вас есть:

✅ База данных для обучения  
✅ Service Worker с офлайн-режимом  
✅ Push-уведомления  
✅ Duolingo-style обучение  
✅ Геймификация (XP, стрики, лиги)  
✅ Библиотека книг  
✅ Админка для управления  

## 📚 Дополнительные улучшения

После завершения основных стадий можно добавить:

1. **Социальные функции**
   - Друзья и рейтинги
   - Соревнования между пользователями
   - Общий чат для учеников

2. **Расширенная аналитика**
   - Графики прогресса
   - Тепловые карты активности
   - A/B тестирование упражнений

3. **Больше типов упражнений**
   - Аудио упражнения
   - Распознавание речи
   - Интерактивные истории

4. **Интеграция с AI**
   - Персонализированные рекомендации
   - Адаптивная сложность
   - Автоматическая генерация упражнений
