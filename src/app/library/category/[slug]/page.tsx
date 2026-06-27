import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookMarked, ArrowRight } from "lucide-react";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await prisma.libraryCategory.findUnique({
    where: { slug },
    include: {
      books: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!category) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#031410] text-cream pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Link href="/library" className="text-gold hover:text-gold-light text-sm font-semibold mb-4 inline-block">
            ← Назад в библиотеку
          </Link>
          <h1 className="text-4xl font-extrabold font-serif text-cream mb-2">{category.name}</h1>
          {category.description && <p className="text-cream/60 text-lg">{category.description}</p>}
        </div>

        {category.books.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.books.map((book) => (
              <Link
                key={book.id}
                href={`/library/book/${book.id}`}
                className="group glass-card p-6 flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold/20 transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-4">
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="w-16 h-20 object-cover rounded-lg" />
                  ) : (
                    <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-gold/20 to-[#8C6D1F]/20 flex items-center justify-center border border-gold/20">
                      <BookMarked className="w-8 h-8 text-gold" strokeWidth={2} />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-cream mb-1 group-hover:text-gold transition-colors line-clamp-2">
                      {book.title}
                    </h3>
                    {book.titleArabic && <p className="text-sm text-cream/60 mb-1">{book.titleArabic}</p>}
                    {book.author && <p className="text-sm text-cream/60">{book.author}</p>}
                  </div>
                </div>
                {book.description && (
                  <p className="text-sm text-cream/60 line-clamp-3 mb-4">{book.description}</p>
                )}
                <div className="mt-auto flex items-center justify-end">
                  <ArrowRight className="w-4 h-4 text-gold group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card p-16 text-center">
            <BookMarked className="w-16 h-16 text-gold/50 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-cream/60 text-lg">В этой категории пока нет книг</p>
          </div>
        )}
      </div>
    </div>
  );
}
