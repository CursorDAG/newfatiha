/**
 * Дополняет уже загруженные аяты Корана:
 *  - tajweed-разметкой (text_uthmani_tajweed с тегами <tajweed class=...>)
 *  - номером джуза (для деления по 30 джузам)
 *
 * Не трогает переводы — мёржит в существующий content.verses по номеру аята.
 * Идемпотентный: можно запускать повторно.
 *
 * Запуск: npx tsx prisma/augment-quran.ts
 */
import { PrismaClient } from "@prisma/client";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const prisma = new PrismaClient();
const API = "https://api.quran.com/api/v4";
const BOOK_ID = "quran-arabic";

async function getJson(url: string): Promise<any> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { connection: "close" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 6) throw e;
      await new Promise((r) => setTimeout(r, attempt * 800));
    } finally {
      clearTimeout(timer);
    }
  }
}

// Строим карту "сура:аят" -> номер джуза
async function buildJuzMap(): Promise<Map<string, number>> {
  const data = await getJson(`${API}/juzs`);
  const map = new Map<string, number>();
  const seen = new Set<number>();
  for (const juz of data.juzs) {
    if (seen.has(juz.juz_number)) continue; // API дублирует джузы (id 1..30 и 61..)
    seen.add(juz.juz_number);
    for (const [chapter, range] of Object.entries(juz.verse_mapping as Record<string, string>)) {
      const [from, to] = range.split("-").map(Number);
      for (let v = from; v <= (to ?? from); v++) {
        map.set(`${chapter}:${v}`, juz.juz_number);
      }
    }
  }
  return map;
}

async function fetchTajweed(chapterId: number): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  let page = 1;
  while (true) {
    const url = `${API}/verses/by_chapter/${chapterId}?fields=text_uthmani_tajweed&per_page=50&page=${page}`;
    const data = await getJson(url);
    for (const v of data.verses) out.set(v.verse_number, v.text_uthmani_tajweed);
    const total = data.pagination?.total_pages ?? 1;
    if (page >= total) break;
    page++;
  }
  return out;
}

async function main() {
  console.log("🌱 Дополняю Коран таджвидом и джузами...");

  const juzMap = await buildJuzMap();
  console.log(`✓ Карта джузов построена (${juzMap.size} аятов)`);

  const chapters = await prisma.bookChapter.findMany({
    where: { bookId: BOOK_ID },
    orderBy: { order: "asc" },
  });
  if (chapters.length === 0) throw new Error("Главы Корана не найдены. Сначала запусти fetch-quran.");

  for (const ch of chapters) {
    const content = ch.content as any;
    const verses = content?.verses ?? [];
    if (verses.length === 0) continue;

    const tajweed = await fetchTajweed(ch.number);

    const newVerses = verses.map((v: any) => ({
      ...v,
      tajweed: tajweed.get(v.number) ?? v.tajweed ?? null,
      juz: juzMap.get(`${ch.number}:${v.number}`) ?? v.juz ?? null,
    }));

    await prisma.bookChapter.update({
      where: { id: ch.id },
      data: { content: { ...content, verses: newVerses } },
    });
    console.log(`  ✓ Сура ${ch.number}/114 (${newVerses.length} аятов, джуз ${newVerses[0].juz}–${newVerses[newVerses.length - 1].juz})`);
  }

  console.log("✅ Коран дополнен таджвидом и джузами.");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
