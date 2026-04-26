'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, BookOpen, GraduationCap, X } from 'lucide-react';

type SearchResult = {
  id: string;
  type: 'user' | 'course' | 'application';
  title: string;
  subtitle: string;
  url: string;
};

export default function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Открыть/закрыть по Cmd+K / Ctrl+K или по событию
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleOpenSearch = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleOpenSearch);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleOpenSearch);
    };
  }, []);

  // Поиск с debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Навигация стрелками
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="w-5 h-5" />;
      case 'course':
        return <BookOpen className="w-5 h-5" />;
      case 'application':
        return <GraduationCap className="w-5 h-5" />;
      default:
        return <Search className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'user':
        return 'Пользователь';
      case 'course':
        return 'Курс';
      case 'application':
        return 'Заявка';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск пользователей, курсов, заявок..."
              className="flex-1 outline-none text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
              </div>
            ) : results.length === 0 && query ? (
              <div className="p-8 text-center text-slate-500">
                Ничего не найдено
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Начните вводить для поиска</p>
                <p className="mt-2 text-xs">
                  Поиск по пользователям, курсам и заявкам
                </p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                      index === selectedIndex ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      result.type === 'user' ? 'bg-emerald-100 text-emerald-600' :
                      result.type === 'course' ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {getIcon(result.type)}
                    </div>

                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-900">{result.title}</div>
                      <div className="text-sm text-slate-500">{result.subtitle}</div>
                    </div>

                    <div className="text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded">
                      {getTypeLabel(result.type)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs">↑↓</kbd>
                Навигация
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs">Enter</kbd>
                Выбрать
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded text-xs">Esc</kbd>
                Закрыть
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
