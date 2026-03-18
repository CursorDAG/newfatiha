"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type JitsiAPI = new (
  domain: string,
  options: {
    roomName: string;
    parentNode: HTMLElement;
    userInfo?: { displayName?: string };
  }
) => { dispose: () => void };

type Props = {
  lessonId: string;
  lessonTitle: string;
  streamName: string;
  jitsiRoomName: string;
  userName?: string;
  onLeave: () => void;
};

const NOTES_KEY_PREFIX = "lesson-note-";

/**
 * Embeds a Jitsi live room alongside a local-storage-backed notes panel.
 * Used in StudentDashboard to keep the student on their cabinet page during LIVE lessons.
 */
export default function LiveJitsiEmbed({
  lessonId,
  lessonTitle,
  streamName,
  jitsiRoomName,
  userName,
  onLeave,
}: Props) {
  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<{ dispose: () => void } | null>(null);

  const storageKey = `${NOTES_KEY_PREFIX}${lessonId}`;
  const [notes, setNotes] = useState<string>("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved notes from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time initialization from localStorage on mount
      if (saved) setNotes(saved);
    } catch {
      // localStorage not available (e.g., SSR) — ignore
    }
  }, [storageKey]);

  // Debounced auto-save to localStorage when notes change
  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      setNotesSaved(false);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, value);
          setNotesSaved(true);
        } catch {
          // ignore storage errors
        }
      }, 600);
    },
    [storageKey],
  );

  // Initialize Jitsi
  useEffect(() => {
    if (!jitsiContainerRef.current) return;

    let cancelled = false;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-jitsi-external-api="true"]',
    );

    const ensureScriptLoaded = () =>
      new Promise<void>((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }
        const script = existing ?? document.createElement("script");
        if (!existing) {
          script.src = "https://meet.jit.si/external_api.js";
          script.async = true;
          script.dataset.jitsiExternalApi = "true";
          document.head.appendChild(script);
        }
        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener("error", () => reject(new Error("Jitsi script load failed")), {
          once: true,
        });
      });

    (async () => {
      try {
        await ensureScriptLoaded();
        const JitsiAPI = (window as { JitsiMeetExternalAPI?: JitsiAPI }).JitsiMeetExternalAPI;
        if (cancelled || !JitsiAPI || !jitsiContainerRef.current) return;
        jitsiApiRef.current?.dispose();
        jitsiApiRef.current = new JitsiAPI("meet.jit.si", {
          roomName: jitsiRoomName,
          parentNode: jitsiContainerRef.current,
          userInfo: userName ? { displayName: userName } : undefined,
        });
      } catch (e) {
        console.error("[Jitsi] init error", e);
      }
    })();

    return () => {
      cancelled = true;
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
    };
  }, [jitsiRoomName, userName]);

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Выйти из урока
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="min-w-0">
          <p className="font-bold text-slate-800 truncate leading-tight">{lessonTitle}</p>
          <p className="text-xs text-slate-400 truncate">{streamName}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Notes toggle button */}
          <button
            onClick={() => setNotesOpen((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              notesOpen
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-700"
            }`}
            title={notesOpen ? "Скрыть заметки" : "Открыть заметки"}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Заметки
          </button>

          <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Main area: Jitsi + collapsible Notes */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Jitsi iframe — takes full width when notes are closed */}
        <div className="flex-1 min-w-0 bg-black">
          <div ref={jitsiContainerRef} className="w-full h-full" />
        </div>

        {/* Notes sidebar — only rendered when open, slides in from right */}
        {notesOpen && (
          <div className="w-80 shrink-0 flex flex-col border-l border-slate-200 bg-slate-50 transition-all">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <p className="text-sm font-bold text-slate-700">Мои заметки</p>
              <div className="flex items-center gap-2">
                {notesSaved && (
                  <span className="text-[10px] font-semibold text-emerald-600">Сохранено</span>
                )}
                <button
                  onClick={() => setNotesOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title="Скрыть заметки"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 w-full px-4 py-3 text-sm text-slate-800 bg-slate-50 resize-none outline-none focus:bg-white transition-colors placeholder:text-slate-400"
              placeholder={"Записывайте важное здесь...\n\nЗаметки сохраняются автоматически и остаются после закрытия урока."}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
