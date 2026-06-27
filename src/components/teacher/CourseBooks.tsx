"use client";

import { useState } from "react";
import { BookOpen, Plus, X, Check } from "lucide-react";

type Book = {
  id: string;
  title: string;
  titleArabic?: string;
  author?: string;
  categoryName: string;
};

type CourseBook = {
  id: string;
  book: Book;
  isRequired: boolean;
};

type Props = {
  courseId: string;
  courseBooks: CourseBook[];
  availableBooks: Book[];
};

export default function CourseBooks({ courseId, courseBooks, availableBooks }: Props) {
  const [books, setBooks] = useState(courseBooks);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (bookId: string) => {
    setLoading(true);
    const res = await fetch("/api/teacher/course-books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, bookId, isRequired: true }),
    });
    const data = await res.json();
    if (data.success) {
      const book = availableBooks.find((b) => b.id === bookId);
      if (book) {
        setBooks([...books, { id: data.courseBook.id, book, isRequired: true }]);
      }
      setShowAdd(false);
    }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    setLoading(true);
    const res = await fetch("/api/teacher/course-books", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setBooks(books.filter((b) => b.id !== id));
    }
    setLoading(false);
  };

  const attachedIds = books.map((b) => b.book.id);
  const available = availableBooks.filter((b) => !attachedIds.includes(b.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-cream">Учебники курса</h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-[#031410] font-semibold hover:bg-gold-light transition-all"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {books.length > 0 ? (
        <div className="space-y-3">
          {books.map((cb) => (
            <div key={cb.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-gold" />
                <div>
                  <p className="font-semibold text-cream">{cb.book.title}</p>
                  {cb.book.titleArabic && (
                    <p className="text-sm text-cream/60">{cb.book.titleArabic}</p>
                  )}
                  <p className="text-xs text-cream/50">{cb.book.categoryName}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemove(cb.id)}
                disabled={loading}
                className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 text-center text-cream/50">
          К курсу пока не прикреплены учебники
        </div>
      )}

      {showAdd && available.length > 0 && (
        <div className="glass-card p-4 space-y-2 border-l-4 border-gold/40">
          <p className="text-sm font-semibold text-cream/80 mb-3">Выберите учебник:</p>
          {available.map((book) => (
            <button
              key={book.id}
              onClick={() => handleAdd(book.id)}
              disabled={loading}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gold/10 text-left transition-all group"
            >
              <div>
                <p className="font-semibold text-cream group-hover:text-gold transition-colors">
                  {book.title}
                </p>
                {book.titleArabic && <p className="text-sm text-cream/60">{book.titleArabic}</p>}
                <p className="text-xs text-cream/50">{book.categoryName}</p>
              </div>
              <Check className="w-5 h-5 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
