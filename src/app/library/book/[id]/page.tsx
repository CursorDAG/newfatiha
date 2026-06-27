import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookReader, { type ChapterContent } from "@/components/library/BookReader";
import PdfReader from "@/components/library/PdfReader";

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      category: true,
      chapters: {
        orderBy: { order: "asc" },
      },
      translations: {
        where: { chapterId: null },
      },
    },
  });

  if (!book) {
    notFound();
  }

  // PDF-книги — отдельный вьюер (файл лежит в public/library/)
  if (book.sourceType === "PDF" && book.sourceUrl) {
    return (
      <PdfReader
        book={{
          title: book.title,
          titleArabic: book.titleArabic || undefined,
          author: book.author || undefined,
        }}
        fileUrl={book.sourceUrl}
      />
    );
  }

  return (
    <BookReader
      book={{
        id: book.id,
        title: book.title,
        titleArabic: book.titleArabic || undefined,
        author: book.author || undefined,
        categorySlug: book.category?.slug,
        categoryName: book.category?.name,
      }}
      chapters={book.chapters.map((ch) => ({
        id: ch.id,
        number: ch.number,
        title: ch.title,
        titleArabic: ch.titleArabic || undefined,
        content: (ch.content ?? {}) as ChapterContent,
      }))}
      translations={book.translations.map((t) => ({
        id: t.id,
        language: t.language,
        translatorName: t.translatorName || "Неизвестный",
        type: t.type,
        resourceId:
          t.content && typeof t.content === "object" && "resourceId" in t.content
            ? String((t.content as { resourceId: number }).resourceId)
            : null,
      }))}
      currentChapter={0}
    />
  );
}
