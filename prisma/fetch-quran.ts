/**
 * Выгрузка полного текста Корана с api.quran.com (v4) в нашу БД.
 * - Арабский текст (Uthmani) всех 114 сур
 * - Русские переводы: Кулиев (45) и Абу Адель (79)
 *
 * 1 сура = 1 BookChapter. content = { verses: [{ number, arabic, translations: { "45": "...", "79": "..." } }], bismillah }
 * После выгрузки sourceType книги меняется API -> TEXT.
 *
 * Запуск: npx tsx prisma/fetch-quran.ts
 */
import { PrismaClient } from "@prisma/client";
import dns from "node:dns";

// На Windows Node по умолчанию резолвит IPv6 первым (happy-eyeballs),
// из-за чего первое соединение к api.quran.com зависает до таймаута.
// Принудительно используем IPv4 — первая попытка проходит сразу.
dns.setDefaultResultOrder("ipv4first");

const prisma = new PrismaClient();

const API = "https://api.quran.com/api/v4";
const BOOK_ID = "quran-arabic";

const TRANSLATIONS = [
  { resourceId: 45, language: "ru", translatorName: "Эльмир Кулиев" },
  { resourceId: 79, language: "ru", translatorName: "Абу Адель" },
];
const TRANSLATION_IDS = TRANSLATIONS.map((t) => t.resourceId).join(",");

type Verse = {
  verse_number: number;
  text_uthmani: string;
  translations: { resource_id: number; text: string }[];
};

async function getJson(url: string): Promise<any> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { connection: "close" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 5) throw e;
      const wait = attempt * 1000;
      console.log(`  ⚠ ${url} — ${(e as Error).message}, retry ${attempt} через ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    } finally {
      clearTimeout(timer);
    }
  }
}

async function fetchChapterVerses(chapterId: number): Promise<Verse[]> {
  const verses: Verse[] = [];
  let page = 1;
  while (true) {
    const url = `${API}/verses/by_chapter/${chapterId}?language=ru&fields=text_uthmani&translations=${TRANSLATION_IDS}&per_page=50&page=${page}`;
    const data = await getJson(url);
    verses.push(...data.verses);
    const total = data.pagination?.total_pages ?? 1;
    if (page >= total) break;
    page++;
  }
  return verses;
}

async function main() {
  console.log("🌱 Выгрузка Корана с api.quran.com...");

  const book = await prisma.book.findUnique({ where: { id: BOOK_ID } });
  if (!book) throw new Error(`Книга ${BOOK_ID} не найдена. Сначала запусти seed-library.`);

  // Список сур (с русскими названиями)
  const chaptersData = await getJson(`${API}/chapters?language=ru`);
  const chapters: any[] = chaptersData.chapters;
  console.log(`✓ Получен список из ${chapters.length} сур`);

  // Чистим старые главы/переводы книги для идемпотентности
  await prisma.bookChapter.deleteMany({ where: { bookId: BOOK_ID } });
  await prisma.bookTranslation.deleteMany({ where: { bookId: BOOK_ID } });

  for (const ch of chapters) {
    const verses = await fetchChapterVerses(ch.id);
    const content = {
      bismillah: ch.bismillah_pre ?? false,
      verses: verses.map((v) => ({
        number: v.verse_number,
        arabic: v.text_uthmani,
        translations: Object.fromEntries(
          v.translations.map((t) => [String(t.resource_id), t.text])
        ),
      })),
    };

    await prisma.bookChapter.create({
      data: {
        bookId: BOOK_ID,
        number: ch.id,
        order: ch.id,
        title: `${ch.id}. ${ch.translated_name?.name || ch.name_simple}`,
        titleArabic: ch.name_arabic,
        content,
      },
    });
    console.log(`  ✓ Сура ${ch.id}/${chapters.length} — ${ch.name_simple} (${verses.length} аятов)`);
  }

  // Метаданные переводов на уровне книги
  for (const t of TRANSLATIONS) {
    await prisma.bookTranslation.create({
      data: {
        bookId: BOOK_ID,
        language: t.language,
        translatorName: t.translatorName,
        type: "TRANSLATION",
        content: { resourceId: t.resourceId, source: "quran.com" },
      },
    });
  }

  await prisma.book.update({
    where: { id: BOOK_ID },
    data: { sourceType: "TEXT", sourceUrl: null },
  });

  console.log("✅ Коран полностью выгружен в нашу БД.");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка выгрузки Корана:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
