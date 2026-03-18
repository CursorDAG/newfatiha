"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import EmptyState from "@/components/teacher/ui/EmptyState";

type LiveLesson = {
  id: string;
  title: string;
  teacherNotes: string | null;
};

/**
 * Live lesson tab for the teacher.
 * Rendered by the parent inside a fixed inset-0 z-50 overlay (same pattern as
 * StudentDashboard / LiveJitsiEmbed), so this component fills h-full without
 * any position logic of its own.
 * Includes a collapsible hints panel (teacherNotes per lesson, Markdown) and
 * a personal notes panel (localStorage-backed with debounced auto-save).
 */
export default function TeacherLiveTab({
  streamName,
  streamId,
  room,
  onShareScreen,
  onEndLesson,
  liveLessons = [],
  onExit,
}: {
  streamName?: string;
  streamId?: string;
  room: React.ReactNode;
  onShareScreen?: () => void;
  onEndLesson?: () => void;
  liveLessons?: LiveLesson[];
  onExit?: () => void;
}) {
  const [hintsOpen, setHintsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(liveLessons[0]?.id ?? "");

  const notesKey = streamId ? `teacher-live-note-${streamId}` : null;
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialise selectedLessonId when liveLessons arrives
  useEffect(() => {
    if (liveLessons.length > 0 && !selectedLessonId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time initialization of default selection
      setSelectedLessonId(liveLessons[0].id);
    }
  }, [liveLessons, selectedLessonId]);

  // Load teacher's personal notes for this stream from localStorage
  useEffect(() => {
    if (!notesKey) return;
    try {
      const saved = localStorage.getItem(notesKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time initialization from localStorage on mount
      if (saved) setNotes(saved);
    } catch {
      // ignore
    }
  }, [notesKey]);

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      setNotesSaved(false);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (!notesKey) return;
        try {
          localStorage.setItem(notesKey, value);
          setNotesSaved(true);
        } catch {
          // ignore
        }
      }, 600);
    },
    [notesKey],
  );

  const selectedLesson = liveLessons.find((l) => l.id === selectedLessonId);

  if (!streamId || !streamName) {
    return (
      <EmptyState
        icon="🔴"
        title="Выберите поток"
        description="Чтобы начать live-урок, выберите поток."
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 py-3 bg-slate-800 border-b border-slate-700 flex items-center gap-3 shadow-md z-10 shrink-0">
        {/* Exit button */}
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors shrink-0"
          title="Вернуться в кабинет"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Выйти из Live
        </button>

        <h2 className="font-bold text-base flex items-center gap-2.5 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"
            style={{ boxShadow: "0 0 8px #ef4444" }}
          />
          <span className="truncate">Live: {streamName}</span>
        </h2>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Hints toggle */}
          <button
            type="button"
            onClick={() => { setHintsOpen((v) => !v); setNotesOpen(false); }}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              hintsOpen
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-slate-700 text-slate-200 border-slate-600 hover:border-amber-400 hover:text-amber-300"
            }`}
            title="Подсказки урока"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Подсказки
          </button>

          {/* Notes toggle */}
          <button
            type="button"
            onClick={() => { setNotesOpen((v) => !v); setHintsOpen(false); }}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              notesOpen
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-slate-700 text-slate-200 border-slate-600 hover:border-emerald-400 hover:text-emerald-300"
            }`}
            title="Личные заметки"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Заметки
          </button>

          <div className="w-px h-5 bg-slate-600" />

          {/* Share screen */}
          <button
            type="button"
            onClick={onShareScreen}
            className="bg-emerald-600 px-3 py-1.5 rounded-full hover:bg-emerald-500 transition-colors text-xs font-bold disabled:opacity-40"
          >
            Демонстрация
          </button>

          {/* End lesson */}
          <button
            type="button"
            onClick={onEndLesson}
            className="bg-red-600 px-3 py-1.5 rounded-full hover:bg-red-500 transition-colors text-xs font-bold disabled:opacity-40"
          >
            Завершить
          </button>
        </div>
      </div>

      {/* ── Body: Jitsi + optional side panel ──────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Jitsi container — always flex-1 full width */}
        <div className="flex-1 min-w-0 bg-slate-950">{room}</div>

        {/* ── Hints panel ──────────────────────────────────────────── */}
        {hintsOpen && (
          <div className="w-80 shrink-0 flex flex-col border-l border-slate-700 bg-slate-800">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between shrink-0">
              <p className="text-sm font-bold text-amber-300">Подсказки урока</p>
              <button
                onClick={() => setHintsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {liveLessons.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-sm text-slate-400 text-center">
                  В этом потоке нет LIVE-уроков с заметками
                </p>
              </div>
            ) : (
              <>
                {liveLessons.length > 1 && (
                  <div className="px-4 py-3 border-b border-slate-700 shrink-0">
                    <select
                      className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                      value={selectedLessonId}
                      onChange={(e) => setSelectedLessonId(e.target.value)}
                    >
                      {liveLessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {selectedLesson?.teacherNotes ? (
                    <div className="
                      text-slate-200 text-sm leading-relaxed
                      [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-white
                      [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-white
                      [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-white
                      [&_p]:mb-3 [&_p]:leading-relaxed
                      [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1
                      [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1
                      [&_li]:text-slate-300
                      [&_strong]:text-white [&_strong]:font-bold
                      [&_em]:text-amber-300 [&_em]:italic
                      [&_code]:bg-slate-700 [&_code]:text-amber-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
                      [&_blockquote]:border-l-4 [&_blockquote]:border-amber-500 [&_blockquote]:pl-3 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_blockquote]:mb-3
                      [&_hr]:border-slate-600 [&_hr]:my-4
                    ">
                      <ReactMarkdown>{selectedLesson.teacherNotes}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                      <p className="text-slate-400 text-sm">
                        Для урока <span className="font-semibold text-slate-300">{selectedLesson?.title}</span> нет заметок
                      </p>
                      <p className="text-xs text-slate-500">
                        Добавьте заметки к уроку в разделе «Уроки»
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Personal notes panel ─────────────────────────────────── */}
        {notesOpen && (
          <div className="w-80 shrink-0 flex flex-col border-l border-slate-700 bg-slate-800">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between shrink-0">
              <p className="text-sm font-bold text-emerald-300">Мои заметки</p>
              <div className="flex items-center gap-2">
                {notesSaved && (
                  <span className="text-[10px] font-semibold text-emerald-400">Сохранено</span>
                )}
                <button
                  onClick={() => setNotesOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 w-full px-4 py-3 text-sm text-slate-200 bg-slate-800 resize-none outline-none transition-colors placeholder:text-slate-500"
              placeholder={"Записывайте важное здесь...\n\nЗаметки сохраняются автоматически."}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
