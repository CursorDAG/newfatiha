# STAGE 5: Gamification — Геймификация

**Статус:** 🟡 Не начато  
**Зависимости:** STAGE-1-DATABASE.md, STAGE-4-LEARNING-PATHS.md  
**Следующая стадия:** STAGE-6-LIBRARY.md

## 🎯 Цель стадии

Добавить геймификацию:
- XP (опыт) и уровни
- Стрики (дни подряд)
- Лиги (Бронза → Алмаз)
- Достижения/бейджи
- Жизни (hearts)

## 📁 Структура файлов

```
src/
  app/
    student/
      profile/
        page.tsx              # Профиль с XP, стриками, достижениями
  components/
    gamification/
      XPBar.tsx              # Прогресс бар XP
      StreakCounter.tsx      # Счётчик стриков
      LeagueCard.tsx         # Карточка лиги
      AchievementBadge.tsx   # Бейдж достижения
      HeartsDisplay.tsx      # Отображение жизней
  lib/
    gamification/
      xp.ts                  # Логика XP и уровней
      streaks.ts             # Логика стриков
      achievements.ts        # Проверка достижений
      leagues.ts             # Логика лиг
```

## 📝 Реализация

### 1. Логика XP и уровней

```typescript
// src/lib/gamification/xp.ts

export function calculateLevel(totalXP: number): number {
  // Формула: level = floor(sqrt(totalXP / 100))
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

export function getXPForLevel(level: number): number {
  // XP нужно для достижения уровня
  return (level - 1) ** 2 * 100;
}

export function getXPForNextLevel(currentLevel: number): number {
  return getXPForLevel(currentLevel + 1);
}

export function getXPProgress(totalXP: number): {
  currentLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
} {
  const currentLevel = calculateLevel(totalXP);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = totalXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

  return {
    currentLevel,
    currentLevelXP: xpInCurrentLevel,
    nextLevelXP: xpNeededForNextLevel,
    progress,
  };
}

export async function addXP(userId: string, amount: number) {
  const profile = await prisma.userGameProfile.upsert({
    where: { userId },
    create: {
      userId,
      totalXP: amount,
      level: calculateLevel(amount),
    },
    update: {
      totalXP: { increment: amount },
    },
  });

  const newLevel = calculateLevel(profile.totalXP + amount);
  
  if (newLevel > profile.level) {
    await prisma.userGameProfile.update({
      where: { userId },
      data: { level: newLevel },
    });
    
    // Отправить уведомление о новом уровне
    await sendLevelUpNotification(userId, newLevel);
  }

  return profile;
}
```

### 2. Логика стриков

```typescript
// src/lib/gamification/streaks.ts

import prisma from '@/lib/prisma';

export async function updateStreak(userId: string) {
  const profile = await prisma.userGameProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return await prisma.userGameProfile.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: new Date(),
      },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = profile.lastActivityDate
    ? new Date(profile.lastActivityDate)
    : null;

  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
  }

  // Если уже занимался сегодня, ничего не делать
  if (lastActivity && lastActivity.getTime() === today.getTime()) {
    return profile;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = profile.currentStreak;

  // Если занимался вчера, увеличить стрик
  if (lastActivity && lastActivity.getTime() === yesterday.getTime()) {
    newStreak += 1;
  } else {
    // Иначе сбросить стрик
    newStreak = 1;
  }

  const newLongestStreak = Math.max(newStreak, profile.longestStreak);

  const updated = await prisma.userGameProfile.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: new Date(),
    },
  });

  // Проверить достижения за стрики
  await checkStreakAchievements(userId, newStreak);

  return updated;
}

export function getStreakEmoji(streak: number): string {
  if (streak >= 365) return '🔥🔥🔥';
  if (streak >= 100) return '🔥🔥';
  if (streak >= 30) return '🔥';
  if (streak >= 7) return '⚡';
  return '✨';
}
```

### 3. Логика достижений

```typescript
// src/lib/gamification/achievements.ts

import prisma from '@/lib/prisma';

export async function checkAchievements(userId: string) {
  const profile = await prisma.userGameProfile.findUnique({
    where: { userId },
    include: {
      achievements: {
        include: { achievement: true },
      },
    },
  });

  if (!profile) return;

  const allAchievements = await prisma.achievement.findMany();
  const unlockedKeys = new Set(profile.achievements.map(a => a.achievement.key));

  for (const achievement of allAchievements) {
    if (unlockedKeys.has(achievement.key)) continue;

    const requirement = JSON.parse(achievement.requirement);
    const isUnlocked = checkRequirement(profile, requirement);

    if (isUnlocked) {
      await unlockAchievement(userId, achievement.id);
    }
  }
}

function checkRequirement(profile: any, requirement: any): boolean {
  switch (requirement.type) {
    case 'TOTAL_XP':
      return profile.totalXP >= requirement.value;
    
    case 'LEVEL':
      return profile.level >= requirement.value;
    
    case 'STREAK':
      return profile.currentStreak >= requirement.value;
    
    case 'LONGEST_STREAK':
      return profile.longestStreak >= requirement.value;
    
    default:
      return false;
  }
}

async function unlockAchievement(userId: string, achievementId: string) {
  await prisma.userAchievement.create({
    data: { userId, achievementId },
  });

  const achievement = await prisma.achievement.findUnique({
    where: { id: achievementId },
  });

  if (achievement && achievement.xpReward > 0) {
    await addXP(userId, achievement.xpReward);
  }

  // Отправить уведомление
  await sendAchievementNotification(userId, achievement!);
}

// Seed достижений
export const ACHIEVEMENTS = [
  {
    key: 'first_lesson',
    title: 'Первый шаг',
    description: 'Пройди первый урок',
    icon: '🎯',
    xpReward: 10,
    category: 'LESSONS',
    requirement: JSON.stringify({ type: 'LESSONS_COMPLETED', value: 1 }),
  },
  {
    key: 'streak_7',
    title: 'Неделя подряд',
    description: 'Занимайся 7 дней подряд',
    icon: '🔥',
    xpReward: 50,
    category: 'STREAK',
    requirement: JSON.stringify({ type: 'STREAK', value: 7 }),
  },
  {
    key: 'streak_30',
    title: 'Месяц подряд',
    description: 'Занимайся 30 дней подряд',
    icon: '🔥🔥',
    xpReward: 200,
    category: 'STREAK',
    requirement: JSON.stringify({ type: 'STREAK', value: 30 }),
  },
  {
    key: 'xp_1000',
    title: 'Тысяча очков',
    description: 'Набери 1000 XP',
    icon: '⭐',
    xpReward: 100,
    category: 'XP',
    requirement: JSON.stringify({ type: 'TOTAL_XP', value: 1000 }),
  },
  {
    key: 'level_10',
    title: 'Десятый уровень',
    description: 'Достигни 10 уровня',
    icon: '🏆',
    xpReward: 150,
    category: 'XP',
    requirement: JSON.stringify({ type: 'LEVEL', value: 10 }),
  },
];
```

### 4. Логика лиг

```typescript
// src/lib/gamification/leagues.ts

export const LEAGUES = {
  BRONZE: { name: 'Бронза', minXP: 0, color: '#CD7F32', icon: '🥉' },
  SILVER: { name: 'Серебро', minXP: 500, color: '#C0C0C0', icon: '🥈' },
  GOLD: { name: 'Золото', minXP: 1500, color: '#FFD700', icon: '🥇' },
  PLATINUM: { name: 'Платина', minXP: 3000, color: '#E5E4E2', icon: '💎' },
  DIAMOND: { name: 'Алмаз', minXP: 5000, color: '#B9F2FF', icon: '💠' },
};

export function getLeagueByXP(totalXP: number): string {
  if (totalXP >= LEAGUES.DIAMOND.minXP) return 'DIAMOND';
  if (totalXP >= LEAGUES.PLATINUM.minXP) return 'PLATINUM';
  if (totalXP >= LEAGUES.GOLD.minXP) return 'GOLD';
  if (totalXP >= LEAGUES.SILVER.minXP) return 'SILVER';
  return 'BRONZE';
}

export async function updateLeague(userId: string) {
  const profile = await prisma.userGameProfile.findUnique({
    where: { userId },
  });

  if (!profile) return;

  const newLeague = getLeagueByXP(profile.totalXP);

  if (newLeague !== profile.league) {
    await prisma.userGameProfile.update({
      where: { userId },
      data: { league: newLeague },
    });

    // Отправить уведомление о новой лиге
    await sendLeagueUpNotification(userId, newLeague);
  }
}

export async function getLeagueLeaderboard(league: string, limit = 50) {
  return await prisma.userGameProfile.findMany({
    where: { league },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { totalXP: 'desc' },
    take: limit,
  });
}
```

### 5. Компонент XP Bar

```typescript
// src/components/gamification/XPBar.tsx

'use client';

import { getXPProgress } from '@/lib/gamification/xp';

interface XPBarProps {
  totalXP: number;
}

export default function XPBar({ totalXP }: XPBarProps) {
  const { currentLevel, currentLevelXP, nextLevelXP, progress } = getXPProgress(totalXP);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-3xl font-bold text-slate-900">Уровень {currentLevel}</div>
          <div className="text-sm text-slate-600">{totalXP} XP всего</div>
        </div>
        
        <div className="text-5xl">⭐</div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>{currentLevelXP} XP</span>
          <span>{nextLevelXP} XP</span>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-500 flex items-center justify-end pr-2"
            style={{ width: `${progress}%` }}
          >
            {progress > 20 && (
              <span className="text-xs font-bold text-white">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 6. Компонент стриков

```typescript
// src/components/gamification/StreakCounter.tsx

'use client';

import { getStreakEmoji } from '@/lib/gamification/streaks';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
}

export default function StreakCounter({ currentStreak, longestStreak }: StreakCounterProps) {
  return (
    <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 shadow-lg text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium opacity-90">Текущий стрик</div>
          <div className="text-5xl font-bold">{currentStreak}</div>
          <div className="text-sm opacity-90">дней подряд</div>
        </div>
        
        <div className="text-6xl">
          {getStreakEmoji(currentStreak)}
        </div>
      </div>

      <div className="pt-4 border-t border-white/20">
        <div className="flex justify-between text-sm">
          <span className="opacity-90">Лучший стрик</span>
          <span className="font-bold">{longestStreak} дней</span>
        </div>
      </div>
    </div>
  );
}
```

### 7. API для завершения урока (обновить)

```typescript
// src/app/api/learning/complete-lesson/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { addXP } from '@/lib/gamification/xp';
import { updateStreak } from '@/lib/gamification/streaks';
import { updateLeague } from '@/lib/gamification/leagues';
import { checkAchievements } from '@/lib/gamification/achievements';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lessonId, score, xpEarned } = await req.json();

  // Сохранить завершение урока
  await prisma.lessonCompletion.upsert({
    where: {
      userId_lessonId: {
        userId: session.user.id,
        lessonId,
      },
    },
    create: {
      userId: session.user.id,
      lessonId,
      score,
      xpEarned,
    },
    update: {
      score,
      xpEarned,
      completedAt: new Date(),
    },
  });

  // Добавить XP
  await addXP(session.user.id, xpEarned);

  // Обновить стрик
  await updateStreak(session.user.id);

  // Обновить лигу
  await updateLeague(session.user.id);

  // Проверить достижения
  await checkAchievements(session.user.id);

  return NextResponse.json({ success: true });
}
```

## ✅ Чеклист выполнения

- [ ] Создать логику XP и уровней
- [ ] Создать логику стриков
- [ ] Создать логику достижений
- [ ] Создать логику лиг
- [ ] Создать компонент XPBar
- [ ] Создать компонент StreakCounter
- [ ] Создать компонент LeagueCard
- [ ] Создать компонент AchievementBadge
- [ ] Обновить API завершения урока
- [ ] Создать seed для достижений
- [ ] Создать страницу профиля с геймификацией
- [ ] Протестировать начисление XP и стриков

## 🔄 Следующая стадия

После завершения переходите к **[STAGE-6-LIBRARY.md](./STAGE-6-LIBRARY.md)**
