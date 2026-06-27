/**
 * Выгрузка Сахих аль-Бухари с открытого hadith-api (fawazahmed0, jsdelivr CDN) в нашу БД.
 * Источник: https://github.com/fawazahmed0/hadith-api  (без API-ключа)
 * - Арабский текст (ara-bukhari) + русский перевод (rus-bukhari, Абдулла Нирша)
 *
 * 1 раздел Бухари (kitab) = 1 BookChapter. content = { verses: [{ number, arabic, translations: { ru: "..." } }] }
 * где "верс" = хадис. После выгрузки sourceType книги меняется API -> TEXT.
 *
 * Запуск: npx tsx prisma/fetch-bukhari.ts
 */
import { PrismaClient } from "@prisma/client";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const prisma = new PrismaClient();

const BOOK_ID = "sahih-bukhari";
const CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const RU_RESOURCE = "rus-nirsha"; // ключ перевода в content верса

type Hadith = {
  hadithnumber: number;
  text: string;
  reference: { book: number; hadith: number };
};

type Edition = {
  metadata: {
    sections: Record<string, string>;
    section_details: Record<
      string,
      { hadithnumber_first: number; hadithnumber_last: number }
    >;
  };
  hadiths: Hadith[];
};

async function getJson(url: string): Promise<any> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
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

async function main() {
  console.log("🌱 Выгрузка Сахих аль-Бухари (hadith-api)...");

  const book = await prisma.book.findUnique({ where: { id: BOOK_ID } });
  if (!book) throw new Error(`Книга ${BOOK_ID} не найдена. Сначала запусти seed-library.`);

  console.log("  ↓ арабское издание...");
  const arData: Edition = await getJson(`${CDN}/ara-bukhari.min.json`);
  console.log("  ↓ русское издание...");
  const ruData: Edition = await getJson(`${CDN}/rus-bukhari.min.json`);

  // карта русских переводов по номеру хадиса
  const ruByNum = new Map<number, string>();
  for (const h of ruData.hadiths) ruByNum.set(h.hadithnumber, h.text);

  // Назначаем хадис разделу по диапазону hadithnumber в section_details
  // (reference.book у части хадисов = 0, поэтому ему не доверяем).
  const ranges = Object.entries(arData.metadata.section_details)
    .filter(([id]) => id !== "0")
    .map(([id, d]) => ({
      section: Number(id),
      first: d.hadithnumber_first,
      last: d.hadithnumber_last,
    }))
    .filter((r) => r.first && r.last)
    .sort((a, b) => a.first - b.first);

  const sectionForHadith = (num: number): number => {
    for (const r of ranges) {
      if (num >= r.first && num <= r.last) return r.section;
    }
    return ranges[ranges.length - 1].section; // fallback: последний раздел
  };

  // группируем хадисы по разделу
  const bySection = new Map<number, Hadith[]>();
  for (const h of arData.hadiths) {
    const sec = sectionForHadith(h.hadithnumber);
    if (!bySection.has(sec)) bySection.set(sec, []);
    bySection.get(sec)!.push(h);
  }
  // сортируем хадисы внутри раздела по номеру
  for (const list of bySection.values()) {
    list.sort((a, b) => a.hadithnumber - b.hadithnumber);
  }

  await prisma.bookChapter.deleteMany({ where: { bookId: BOOK_ID } });
  await prisma.bookTranslation.deleteMany({ where: { bookId: BOOK_ID } });

  const sections = arData.metadata.sections;
  const sortedSecIds = [...bySection.keys()].sort((a, b) => a - b);

  for (const secId of sortedSecIds) {
    const hadiths = bySection.get(secId)!;
    const sectionName = sections[String(secId)] || `Раздел ${secId}`;
    const content = {
      verses: hadiths.map((h) => ({
        number: h.hadithnumber,
        arabic: h.text,
        translations: { [RU_RESOURCE]: ruByNum.get(h.hadithnumber) || "" },
      })),
    };

    await prisma.bookChapter.create({
      data: {
        bookId: BOOK_ID,
        number: secId,
        order: secId,
        title: `${secId}. ${sectionName}`,
        content,
      },
    });
    console.log(`  ✓ Раздел ${secId} — ${sectionName} (${hadiths.length} хадисов)`);
  }

  await prisma.bookTranslation.create({
    data: {
      bookId: BOOK_ID,
      language: "ru",
      translatorName: "Абдулла Нирша",
      type: "TRANSLATION",
      content: { resourceId: RU_RESOURCE, source: "hadith-api (fawazahmed0)" },
    },
  });

  await prisma.book.update({
    where: { id: BOOK_ID },
    data: { sourceType: "TEXT", sourceUrl: null },
  });

  const totalHadiths = arData.hadiths.length;
  console.log(`✅ Сахих аль-Бухари выгружен: ${sortedSecIds.length} разделов, ${totalHadiths} хадисов.`);
}

main()
  .catch((e) => {
    console.error("❌ Ошибка выгрузки Бухари:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
