import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchSurahs, fetchVerses } from "@/lib/quran-api";

export async function POST() {
  try {
    const book = await prisma.book.findUnique({
      where: { id: "quran-arabic" },
    });

    if (!book) {
      return NextResponse.json({ error: "Quran book not found" }, { status: 404 });
    }

    const surahs = await fetchSurahs();
    let loadedCount = 0;

    for (const surah of surahs) {
      const verses = await fetchVerses(surah.id);

      const arabicText = verses.map((v) => v.textUthmani).join(" ۝ ");
      const translationText = verses.map((v) => v.translations[0]?.text || "").join("\n\n");

      await prisma.bookChapter.upsert({
        where: {
          bookId_number: {
            bookId: book.id,
            number: surah.id,
          },
        },
        update: {
          content: {
            arabic: arabicText,
            translation: translationText,
            verses: verses.length,
          },
        },
        create: {
          bookId: book.id,
          number: surah.id,
          title: surah.translation,
          titleArabic: surah.name,
          order: surah.id,
          content: {
            arabic: arabicText,
            translation: translationText,
            verses: verses.length,
          },
        },
      });

      loadedCount++;

      if (loadedCount % 10 === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Loaded ${loadedCount} surahs`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
