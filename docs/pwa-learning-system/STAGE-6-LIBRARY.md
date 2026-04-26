# STAGE 6: Library — Библиотека книг

**Статус:** 🟡 Не начато  
**Зависимости:** STAGE-1-DATABASE.md, STAGE-2-SERVICE-WORKER.md  
**Следующая стадия:** STAGE-7-ADMIN-PANEL.md

## 🎯 Цель стадии

Создать библиотеку с двумя типами книг:
- **Публичные книги** — доступны всем (Коран, Хадисы, Фикх)
- **Курсовые материалы** — только для учеников курса

Функции:
- Читалка с закладками и заметками
- Офлайн-доступ (кэширование в IndexedDB)
- Прогресс чтения
- Поиск по тексту

## 📁 Структура файлов

```
src/
  app/
    student/
      library/
        page.tsx              # Список книг
        [bookId]/
          page.tsx            # Читалка
  components/
    library/
      BookCard.tsx           # Карточка книги
      BookReader.tsx         # Читалка
      BookmarksList.tsx      # Список закладок
      NoteEditor.tsx         # Редактор заметок
  lib/
    library/
      reader.ts              # Логика читалки
      bookmarks.ts           # Работа с закладками
      offline-books.ts       # Кэширование книг
```

## 📝 Реализация

### 1. Страница библиотеки

```typescript
// src/app/student/library/page.tsx

import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import BookCard from '@/components/library/BookCard';

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Получить публичные книги
  const publicBooks = await prisma.book.findMany({
    where: {
      type: 'PUBLIC',
      isPublished: true,
    },
    include: {
      readProgress: {
        where: { userId: session.user.id },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Получить книги из курсов пользователя
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: session.user.id },
    include: {
      stream: {
        include: {
          course: {
            include: {
              books: {
                where: { isPublished: true },
                include: {
                  readProgress: {
                    where: { userId: session.user.id },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const courseBooks = enrollments.flatMap(e => e.stream.course.books);

  const categories = [
    { key: 'QURAN', label: 'Коран', icon: '📖' },
    { key: 'HADITH', label: 'Хадисы', icon: '📜' },
    { key: 'FIQH', label: 'Фикх', icon: '⚖️' },
    { key: 'AQEEDAH', label: 'Акыда', icon: '📿' },
    { key: 'ARABIC', label: 'Арабский', icon: '🔤' },
    { key: 'HISTORY', label: 'История', icon: '🏛️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Библиотека</h1>
          <p className="text-slate-600">Исламские книги и материалы курсов</p>
        </div>

        {/* Книги из курсов */}
        {courseBooks.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              📚 Материалы твоих курсов
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courseBooks.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}

        {/* Публичные книги по категориям */}
        {categories.map(category => {
          const books = publicBooks.filter(b => b.category === category.key);
          if (books.length === 0) return null;

          return (
            <div key={category.key} className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {category.icon} {category.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {books.map(book => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 2. Карточка книги

```typescript
// src/components/library/BookCard.tsx

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Book, BookReadProgress } from '@prisma/client';
import { BookOpen, Download } from 'lucide-react';

type BookWithProgress = Book & {
  readProgress: BookReadProgress[];
};

interface BookCardProps {
  book: BookWithProgress;
}

export default function BookCard({ book }: BookCardProps) {
  const progress = book.readProgress[0];
  const progressPercent = progress?.progress || 0;

  return (
    <Link href={`/student/library/${book.id}`}>
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer">
        {/* Обложка */}
        <div className="relative h-64 bg-gradient-to-br from-emerald-500 to-teal-600">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={book.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-20 h-20 text-white opacity-50" />
            </div>
          )}
          
          {/* Прогресс */}
          {progressPercent > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Информация */}
        <div className="p-4">
          <h3 className="font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {book.title}
          </h3>
          
          {book.author && (
            <p className="text-sm text-slate-600 mb-2">{book.author}</p>
          )}

          {progress && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Страница {progress.currentPage} из {progress.totalPages}</span>
            </div>
          )}

          {!progress && (
            <button className="w-full mt-2 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
              Начать читать
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
```

### 3. Читалка

```typescript
// src/app/student/library/[bookId]/page.tsx

import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import BookReader from '@/components/library/BookReader';

export default async function BookReaderPage({
  params,
}: {
  params: { bookId: string };
}) {
  const session = await getServerSession(authOptions);

  const book = await prisma.book.findUnique({
    where: { id: params.bookId },
    include: {
      readProgress: {
        where: { userId: session!.user.id },
      },
    },
  });

  if (!book) {
    notFound();
  }

  // Проверить доступ
  if (book.type === 'COURSE' && book.courseId) {
    const hasAccess = await prisma.enrollment.findFirst({
      where: {
        studentId: session!.user.id,
        stream: {
          courseId: book.courseId,
        },
      },
    });

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Нет доступа
            </h1>
            <p className="text-slate-600">
              Эта книга доступна только ученикам курса
            </p>
          </div>
        </div>
      );
    }
  }

  return <BookReader book={book} userId={session!.user.id} />;
}
```

### 4. Компонент читалки

```typescript
// src/components/library/BookReader.tsx

'use client';

import { useState, useEffect } from 'react';
import { Book, BookReadProgress } from '@prisma/client';
import { ChevronLeft, ChevronRight, Bookmark, MessageSquare, Settings } from 'lucide-react';

type BookWithProgress = Book & {
  readProgress: BookReadProgress[];
};

interface BookReaderProps {
  book: BookWithProgress;
  userId: string;
}

export default function BookReader({ book, userId }: BookReaderProps) {
  const [currentPage, setCurrentPage] = useState(
    book.readProgress[0]?.currentPage || 1
  );
  const [fontSize, setFontSize] = useState(16);
  const [showSettings, setShowSettings] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    // Загрузить закладки и заметки
    if (book.readProgress[0]) {
      const progress = book.readProgress[0];
      setBookmarks(progress.bookmarks ? JSON.parse(progress.bookmarks) : []);
      setNotes(progress.notes ? JSON.parse(progress.notes) : {});
    }
  }, [book]);

  useEffect(() => {
    // Сохранять прогресс каждые 10 секунд
    const interval = setInterval(() => {
      saveProgress();
    }, 10000);

    return () => clearInterval(interval);
  }, [currentPage, bookmarks, notes]);

  const saveProgress = async () => {
    await fetch('/api/library/save-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: book.id,
        currentPage,
        bookmarks: JSON.stringify(bookmarks),
        notes: JSON.stringify(notes),
      }),
    });
  };

  const toggleBookmark = () => {
    if (bookmarks.includes(currentPage)) {
      setBookmarks(bookmarks.filter(p => p !== currentPage));
    } else {
      setBookmarks([...bookmarks, currentPage]);
    }
  };

  const addNote = (text: string) => {
    setNotes({ ...notes, [currentPage]: text });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Верхняя панель */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{book.title}</h1>
            {book.author && (
              <p className="text-sm text-slate-600">{book.author}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-lg transition-colors ${
                bookmarks.includes(currentPage)
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bookmark className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Настройки */}
      {showSettings && (
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">
                Размер шрифта:
              </span>
              <button
                onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                className="px-3 py-1 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                A-
              </button>
              <span className="text-sm text-slate-600">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                className="px-3 py-1 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Контент книги */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div
          className="bg-white rounded-xl p-12 shadow-sm min-h-[600px]"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
        >
          {/* Здесь рендерится содержимое страницы */}
          <div className="prose prose-slate max-w-none">
            {/* TODO: Загрузить и отобразить содержимое из PDF/EPUB */}
            <p>Содержимое страницы {currentPage}</p>
          </div>
        </div>

        {/* Заметка на странице */}
        {notes[currentPage] && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-sm text-slate-700">{notes[currentPage]}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Нижняя панель навигации */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Назад
          </button>

          <div className="text-center">
            <div className="text-sm text-slate-600">Страница</div>
            <div className="text-lg font-bold text-slate-900">
              {currentPage} / {book.readProgress[0]?.totalPages || '?'}
            </div>
          </div>

          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Вперёд
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5. API для сохранения прогресса

```typescript
// src/app/api/library/save-progress/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bookId, currentPage, bookmarks, notes } = await req.json();

  const book = await prisma.book.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  // Получить общее количество страниц (TODO: из PDF metadata)
  const totalPages = 100; // Placeholder

  const progress = Math.round((currentPage / totalPages) * 100);

  await prisma.bookReadProgress.upsert({
    where: {
      userId_bookId: {
        userId: session.user.id,
        bookId,
      },
    },
    create: {
      userId: session.user.id,
      bookId,
      currentPage,
      totalPages,
      progress,
      bookmarks,
      notes,
    },
    update: {
      currentPage,
      progress,
      bookmarks,
      notes,
      lastReadAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
```

### 6. Офлайн кэширование книг

```typescript
// src/lib/library/offline-books.ts

import { offlineStorage } from '@/lib/offline-storage';

export async function downloadBookForOffline(bookId: string, fileUrl: string) {
  try {
    // Скачать файл
    const response = await fetch(fileUrl);
    const blob = await response.blob();

    // Сохранить в IndexedDB
    await offlineStorage.cacheBook(bookId, blob);

    return true;
  } catch (error) {
    console.error('Failed to download book:', error);
    return false;
  }
}

export async function getOfflineBook(bookId: string): Promise<Blob | null> {
  return await offlineStorage.getCachedBook(bookId);
}

export async function removeOfflineBook(bookId: string) {
  await offlineStorage.removeCachedBook(bookId);
}
```

## ✅ Чеклист выполнения

- [ ] Создать страницу библиотеки
- [ ] Создать компонент BookCard
- [ ] Создать читалку BookReader
- [ ] Создать API для сохранения прогресса
- [ ] Добавить поддержку PDF (pdf.js)
- [ ] Добавить поддержку EPUB (epub.js)
- [ ] Реализовать закладки
- [ ] Реализовать заметки
- [ ] Добавить офлайн-кэширование
- [ ] Протестировать чтение книг

## 🔄 Следующая стадия

После завершения переходите к **[STAGE-7-ADMIN-PANEL.md](./STAGE-7-ADMIN-PANEL.md)**
