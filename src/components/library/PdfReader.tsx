"use client";

import { ChevronLeft, Download, ExternalLink } from "lucide-react";

type PdfReaderProps = {
  book: {
    title: string;
    titleArabic?: string;
    author?: string;
  };
  fileUrl: string;
};

export default function PdfReader({ book, fileUrl }: PdfReaderProps) {
  return (
    <div className="min-h-screen bg-[#031410] text-cream flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-gold/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gold/10 rounded-lg transition-colors shrink-0"
              aria-label="Назад"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-serif font-bold text-lg text-cream truncate">{book.title}</h1>
              {book.author && <p className="text-sm text-cream/60 truncate">{book.author}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 text-gold font-semibold hover:bg-gold/20 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Открыть</span>
            </a>
            <a
              href={fileUrl}
              download
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-[#031410] font-semibold hover:bg-gold-light transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Скачать</span>
            </a>
          </div>
        </div>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-6">
        <object
          data={fileUrl}
          type="application/pdf"
          className="w-full h-[calc(100vh-160px)] rounded-xl border border-gold/15 bg-white"
        >
          <div className="glass-card p-16 text-center">
            <p className="text-cream/70 mb-4">
              Ваш браузер не может отобразить PDF прямо здесь.
            </p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold text-[#031410] font-semibold hover:bg-gold-light transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Открыть книгу в новой вкладке
            </a>
          </div>
        </object>
      </div>
    </div>
  );
}
