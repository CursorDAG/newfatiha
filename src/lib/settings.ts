import { prisma } from "@/lib/prisma";

type SettingsCache = {
  data: Record<string, unknown>;
  timestamp: number;
};

let cache: SettingsCache | null = null;
const CACHE_TTL = 60000; // 1 минута

/**
 * Получить настройку по ключу
 */
export async function getSetting<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
  const settings = await getAllSettings();
  return (settings[key] as T) ?? defaultValue;
}

/**
 * Получить все настройки (с кешированием)
 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  const now = Date.now();

  // Проверяем кеш
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  // Загружаем из БД
  try {
    const settings = await prisma.platformSettings.findMany();

    const data = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, unknown>);

    // Обновляем кеш
    cache = { data, timestamp: now };

    return data;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return cache?.data || {};
  }
}

/**
 * Очистить кеш настроек (вызывать после обновления)
 */
export function clearSettingsCache() {
  cache = null;
}

/**
 * Получить настройки по категории
 */
export async function getSettingsByCategory(category: string): Promise<Record<string, unknown>> {
  const allSettings = await getAllSettings();
  return Object.entries(allSettings)
    .filter(([key]) => key.startsWith(`${category}.`))
    .reduce((acc, [key, value]) => {
      const shortKey = key.replace(`${category}.`, "");
      acc[shortKey] = value;
      return acc;
    }, {} as Record<string, unknown>);
}
