"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Languages,
  ChevronLeft,
  ChevronRight,
  Type,
  Palette,
  BookOpen,
} from "lucide-react";

type Translation = {
  id: string;
  language: string;
  translatorName: string;
  type: string;
  resourceId?: string | null;
};

type Verse = {
  number: number;
  arabic: string;
  tajweed?: string | null;
  juz?: number | null;
  translations?: Record<string, string>;
};

export type ChapterContent = {
  verses?: Verse[];
  bismillah?: boolean;
  // legacy
  arabic?: string;
  translation?: string;
};

type Chapter = {
  id: string;
  number: number;
  title: string;
  titleArabic?: string;
  content: ChapterContent;
};

type BookReaderProps = {
  book: {
    id: string;
    title: string;
    titleArabic?: string;
    author?: string;
    categorySlug?: string;
    categoryName?: string;
  };
  chapters: Chapter[];
  translations: Translation[];
  currentChapter: number;
};

const FONTS = [
  { id: "amiri", label: "Amiri", className: "font-arabic-amiri" },
  { id: "scheherazade", label: "Scheherazade", className: "font-arabic-scheherazade" },
  { id: "naskh", label: "Naskh", className: "font-arabic-naskh" },
];

const SIZES = [
  { id: "sm", label: "А", className: "text-xl leading-loose" },
  { id: "md", label: "А", className: "text-2xl leading-loose" },
  { id: "lg", label: "А", className: "text-4xl leading-[2.4]" },
];

const TAJWEED_LEGEND = [
  { color: "#f97316", label: "Мадд (протяжение)" },
  { color: "#34d399", label: "Гунна / идгам" },
  { color: "#22d3ee", label: "Идгам без гунны" },
  { color: "#c084fc", label: "Ихфа" },
  { color: "#f472b6", label: "Икляб" },
  { color: "#f87171", label: "Калькаля" },
  { color: "#9aa0a6", label: "Немые буквы" },
];

// безопасно рендерим tajweed-разметку: экранируем весь HTML, затем возвращаем
// только разрешённые теги <tajweed class="..."> и <span class="end">.
function sanitizeTajweed(html: string): string {
  const escaped = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // tajweed с классом из латиницы/подчёркиваний
  return escaped
    .replace(/&lt;tajweed class=([a-z_]+)&gt;/g, '<tajweed class="$1">')
    .replace(/&lt;\/tajweed&gt;/g, "</tajweed>")
    .replace(/&lt;span class=end&gt;/g, '<span class="end">')
    .replace(/&lt;\/span&gt;/g, "</span>");
}

export default function BookReader({ book, chapters, translations, currentChapter }: BookReaderProps) {
  const [selectedTranslation, setSelectedTranslation] = useState<string>(translations[0]?.id || "");
  const [showTranslation, setShowTranslation] = useState(true);
  const [chapterIndex, setChapterIndex] = useState(currentChapter || 0);
  const [fontId, setFontId] = useState("amiri");
  const [sizeId, setSizeId] = useState("md");
  const [showTajweed, setShowTajweed] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // восстановление настроек
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("quranReaderPrefs") || "{}");
      if (saved.fontId) setFontId(saved.fontId);
      if (saved.sizeId) setSizeId(saved.sizeId);
      if (typeof saved.showTajweed === "boolean") setShowTajweed(saved.showTajweed);
      if (typeof saved.showTranslation === "boolean") setShowTranslation(saved.showTranslation);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "quranReaderPrefs",
        JSON.stringify({ fontId, sizeId, showTajweed, showTranslation })
      );
    } catch {}
  }, [fontId, sizeId, showTajweed, showTranslation]);

  const chapter = chapters[chapterIndex];
  const canGoPrev = chapterIndex > 0;
  const canGoNext = chapterIndex < chapters.length - 1;

  const activeTranslation = translations.find((t) => t.id === selectedTranslation);
  const verses = chapter?.content?.verses ?? [];
  const hasVerses = verses.length > 0;
  const hasTajweed = verses.some((v) => v.tajweed);

  const fontClass = FONTS.find((f) => f.id === fontId)?.className || "font-arabic";
  const sizeClass = SIZES.find((s) => s.id === sizeId)?.className || SIZES[1].className;

  const backHref = book.categorySlug ? `/library/category/${book.categorySlug}` : "/library";

  // группы джузов в текущей суре (для меток)
  const juzBoundaries = useMemo(() => {
    const set = new Map<number, number>(); // juz -> первый аят
    for (const v of verses) {
      if (v.juz != null && !set.has(v.juz)) set.set(v.juz, v.number);
    }
    return set;
  }, [verses]);

  const goPrev = () => {
    setChapterIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0 });
  };
  const goNext = () => {
    setChapterIndex((i) => Math.min(chapters.length - 1, i + 1));
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-[#031410] text-cream">
      {/* ── Шапка сайта ── */}
      <header className="sticky top-0 z-50 bg-[#031410]/80 backdrop-blur-xl border-b border-gold/15">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 bg-gradient-to-br from-gold to-[#8C6D1F] rounded-xl flex items-center justify-center text-[#031410] text-lg font-bold shadow-md shadow-gold/20">
              ف
            </span>
            <span className="text-xl font-extrabold text-cream tracking-tight font-serif">
              Fatiha<span className="text-gold">.ru</span>
            </span>
          </Link>
          <Link
            href="/library"
            className="text-sm font-semibold text-cream/60 hover:text-gold transition-colors"
          >
            Библиотека
          </Link>
        </nav>
      </header>

      {/* ── Панель книги ── */}
      <div className="sticky top-16 z-40 glass-card border-b border-gold/10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={backHref}
              className="p-2 hover:bg-gold/10 rounded-lg transition-colors shrink-0"
              aria-label="Назад"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif font-bold text-base text-cream truncate">{book.title}</h1>
              {book.titleArabic && (
                <p className="text-xs text-cream/60 truncate">{book.titleArabic}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Настройки шрифта */}
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                showSettings ? "bg-gold text-[#031410]" : "bg-gold/10 text-gold hover:bg-gold/20"
              }`}
              aria-label="Настройки чтения"
            >
              <Type className="w-4 h-4" />
            </button>

            {translations.length > 0 && (
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                  showTranslation ? "bg-gold text-[#031410]" : "bg-gold/10 text-gold hover:bg-gold/20"
                }`}
              >
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">Перевод</span>
              </button>
            )}
          </div>
        </div>

        {/* Выпадающая панель настроек */}
        {showSettings && (
          <div className="border-t border-gold/10 bg-[#021109]">
            <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-6">
              {/* Шрифт */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-cream/50 font-semibold">Шрифт:</span>
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontId(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      fontId === f.id
                        ? "bg-gold text-[#031410] font-bold"
                        : "bg-gold/10 text-cream/70 hover:bg-gold/20"
                    } ${f.className}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Размер */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-cream/50 font-semibold">Размер:</span>
                {SIZES.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setSizeId(s.id)}
                    className={`rounded-lg transition-all flex items-center justify-center w-9 h-9 ${
                      sizeId === s.id
                        ? "bg-gold text-[#031410] font-bold"
                        : "bg-gold/10 text-cream/70 hover:bg-gold/20"
                    }`}
                    style={{ fontSize: `${0.8 + idx * 0.25}rem` }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Таджвид */}
              {hasTajweed && (
                <button
                  onClick={() => setShowTajweed((t) => !t)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    showTajweed ? "bg-gold text-[#031410]" : "bg-gold/10 text-cream/70 hover:bg-gold/20"
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  Таджвид
                </button>
              )}

              {/* Перевод-селектор */}
              {showTranslation && translations.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cream/50 font-semibold">Перевод:</span>
                  <select
                    value={selectedTranslation}
                    onChange={(e) => setSelectedTranslation(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-gold/20 text-cream text-sm"
                  >
                    {translations.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#031410]">
                        {t.translatorName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Легенда таджвида */}
            {hasTajweed && showTajweed && (
              <div className="max-w-5xl mx-auto px-6 pb-4 flex flex-wrap gap-x-4 gap-y-1.5">
                {TAJWEED_LEGEND.map((l) => (
                  <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-cream/60">
                    <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Контент ── */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Заголовок главы */}
        <div className="mb-8 text-center">
          <h2 className="font-serif text-3xl font-bold text-cream mb-2">{chapter?.title}</h2>
          {chapter?.titleArabic && (
            <p className={`text-2xl text-gold ${fontClass}`}>{chapter.titleArabic}</p>
          )}
        </div>

        {chapter?.content?.bismillah && (
          <div className={`text-center text-gold/90 mb-8 ${fontClass} ${sizeClass}`}>
            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
          </div>
        )}

        {hasVerses ? (
          <div className="space-y-4">
            {verses.map((v) => {
              const translationText =
                activeTranslation?.resourceId && v.translations
                  ? v.translations[activeTranslation.resourceId]
                  : undefined;
              const showJuzLabel = v.juz != null && juzBoundaries.get(v.juz) === v.number;
              const useTajweed = showTajweed && v.tajweed;
              return (
                <div key={v.number}>
                  {showJuzLabel && (
                    <div className="flex items-center gap-3 my-6">
                      <div className="flex-1 h-px bg-gold/15" />
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold/70">
                        <BookOpen className="w-3.5 h-3.5" />
                        Джуз {v.juz}
                      </span>
                      <div className="flex-1 h-px bg-gold/15" />
                    </div>
                  )}
                  <div className="glass-card p-6">
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 mt-1 w-8 h-8 rounded-full bg-gold/15 text-gold text-sm font-bold flex items-center justify-center">
                        {v.number}
                      </span>
                      <div className="flex-1">
                        {useTajweed ? (
                          <p
                            dir="rtl"
                            className={`text-right text-cream ${fontClass} ${sizeClass} tajweed-text`}
                            dangerouslySetInnerHTML={{ __html: sanitizeTajweed(v.tajweed!) }}
                          />
                        ) : (
                          <p dir="rtl" className={`text-right text-cream ${fontClass} ${sizeClass}`}>
                            {v.arabic}
                          </p>
                        )}
                        {showTranslation && translationText && (
                          <p className="mt-4 pt-4 border-t border-gold/10 text-base leading-relaxed text-cream/85">
                            {translationText}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="glass-card p-8 mb-6">
              <div className={`text-right text-cream ${fontClass} ${sizeClass}`}>
                {chapter?.content?.arabic || "Текст этой книги ещё не загружен."}
              </div>
            </div>
            {showTranslation && chapter?.content?.translation && (
              <div className="glass-card p-8 border-l-4 border-gold/40">
                <div className="text-lg leading-relaxed text-cream/90">
                  {chapter.content.translation}
                </div>
              </div>
            )}
          </>
        )}

        {showTranslation && activeTranslation && hasVerses && (
          <div className="mt-6 text-center text-sm text-cream/50">
            Перевод: {activeTranslation.translatorName}
          </div>
        )}

        {/* Навигация */}
        <div className="flex items-center justify-between mt-12">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold/10 text-gold font-semibold hover:bg-gold/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Предыдущая</span>
          </button>

          <span className="text-cream/60 font-semibold">
            {chapterIndex + 1} / {chapters.length}
          </span>

          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold/10 text-gold font-semibold hover:bg-gold/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="hidden sm:inline">Следующая</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
