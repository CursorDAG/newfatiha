import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, BookMarked, GraduationCap, ArrowRight } from "lucide-react";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Учебники от курсов студента (приоритет - вверху)
  const courseBooks = userId
    ? await prisma.book.findMany({
        where: {
          courseBooks: {
            some: {
              course: {
                streams: {
                  some: {
                    enrollments: {
                      some: {
                        userId,
                        status: "ACTIVE",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        include: {
          category: true,
          courseBooks: {
            include: {
              course: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Общая библиотека
  const categories = await prisma.libraryCategory.findMany({
    where: { parentId: null },
    include: {
      books: {
        take: 6,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { order: "asc" },
  });

  return (
    <div className="min-h-screen bg-[#031410] text-cream pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold to-[#8C6D1F] flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#031410]" strokeWidth={2} />
            </div>
            <h1 className="text-4xl font-extrabold font-serif text-cream">Библиотека</h1>
          </div>
          <p className="text-cream/60 text-lg">
            Коран, хадисы, исламские учебники и самообучающиеся курсы — всё в одном месте
          </p>
        </div>

        {/* Учебники от курсов студента */}
        {courseBooks.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="w-5 h-5 text-gold" strokeWidth={2} />
              <h2 className="text-2xl font-bold font-serif text-cream">Учебники ваших курсов</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseBooks.map((book) => (
                <Link
                  key={book.id}
                  href={`/library/book/${book.id}`}
                  className="group glass-card p-6 flex flex-col hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold/20 transition-all duration-300"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} className="w-16 h-20 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-gold to-[#8C6D1F] flex items-center justify-center">
                        <BookMarked className="w-8 h-8 text-[#031410]" strokeWidth={2} />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-cream mb-1 group-hover:text-gold transition-colors line-clamp-2">
                        {book.title}
                      </h3>
                      {book.author && <p className="text-sm text-cream/60">{book.author}</p>}
                    </div>
                  </div>
                  <div className="mt-auto pt-4 border-t border-gold/12 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gold/80">
                      {book.courseBooks[0]?.course.title}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gold group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Категории общей библиотеки */}
        {categories.map((category) => (
          <section key={category.id} className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold font-serif text-cream">{category.name}</h2>
              {category.books.length > 0 && (
                <Link
                  href={`/library/category/${category.slug}`}
                  className="text-sm font-semibold text-gold hover:text-gold-light transition-colors flex items-center gap-1"
                >
                  Смотреть все
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
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
                        {book.titleArabic && (
                          <p className="text-sm text-cream/60 font-arabic mb-1">{book.titleArabic}</p>
                        )}
                        {book.author && <p className="text-sm text-cream/60">{book.author}</p>}
                      </div>
                    </div>
                    {book.description && (
                      <p className="text-sm text-cream/60 line-clamp-2 mb-4">{book.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-end">
                      <ArrowRight className="w-4 h-4 text-gold group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <p className="text-cream/50">Книги в этой категории скоро появятся</p>
              </div>
            )}
          </section>
        ))}

        {categories.length === 0 && courseBooks.length === 0 && (
          <div className="glass-card p-16 text-center">
            <BookOpen className="w-16 h-16 text-gold/50 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-cream/60 text-lg">Библиотека пока пуста</p>
          </div>
        )}
      </div>
    </div>
  );
}
