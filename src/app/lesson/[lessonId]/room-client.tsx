"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

type QuizType = "MULTIPLE_CHOICE" | "VOICE";

type LessonQuiz = {
  id: string;
  title: string;
  type: QuizType;
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; text: string }>;
  }>;
};

type LessonPayload = {
  id: string;
  title: string;
  type: "LIVE" | "VIDEO" | "TEXT";
  content: string | null;
  streamId: string;
  streamName: string;
  courseName: string;
  jitsiRoomName: string;
  quizzes: LessonQuiz[];
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        userInfo?: { displayName?: string };
      }
    ) => { dispose: () => void; executeCommand: (cmd: string) => void };
  }
}

async function heartbeat(input: {
  sessionId?: string;
  kind: "APP" | "LESSON" | "LIVE_ROOM";
  streamId?: string;
  lessonId?: string;
  end?: boolean;
}) {
  const res = await fetch("/api/activity/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  return (await res.json()) as { sessionId: string };
}

export default function LessonRoomClient({
  lesson,
  viewerRole,
}: {
  lesson: LessonPayload;
  viewerRole: string;
}) {
  const router = useRouter();
  const [activitySessionId, setActivitySessionId] = useState<string | undefined>(undefined);

  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<{ dispose: () => void } | null>(null);

  const quiz = lesson.quizzes[0] ?? null;
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceDurationMs, setVoiceDurationMs] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const quizSubmitDisabled = useMemo(() => {
    if (!quiz) return true;
    if (quiz.type === "MULTIPLE_CHOICE") return !selectedOptionId;
    if (quiz.type === "VOICE") return !voiceBlob;
    return true;
  }, [quiz, selectedOptionId, voiceBlob]);

  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;

    (async () => {
      const kind = lesson.type === "LIVE" ? "LIVE_ROOM" : "LESSON";
      const created = await heartbeat({
        kind,
        streamId: lesson.streamId,
        lessonId: lesson.id,
      });
      if (!created || cancelled) return;
      setActivitySessionId(created.sessionId);

      interval = window.setInterval(() => {
        heartbeat({
          sessionId: created.sessionId,
          kind,
          streamId: lesson.streamId,
          lessonId: lesson.id,
        });
      }, 30_000);
    })();

    const onVisibility = () => {
      if (document.visibilityState === "hidden" && activitySessionId) {
        const kind = lesson.type === "LIVE" ? "LIVE_ROOM" : "LESSON";
        heartbeat({
          sessionId: activitySessionId,
          kind,
          streamId: lesson.streamId,
          lessonId: lesson.id,
          end: true,
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (interval) window.clearInterval(interval);
      if (activitySessionId) {
        const kind = lesson.type === "LIVE" ? "LIVE_ROOM" : "LESSON";
        heartbeat({
          sessionId: activitySessionId,
          kind,
          streamId: lesson.streamId,
          lessonId: lesson.id,
          end: true,
        });
      }
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lesson.type !== "LIVE") return;
    if (!jitsiContainerRef.current) return;

    let cancelled = false;

    const existing = document.querySelector<HTMLScriptElement>('script[data-jitsi-external-api="true"]');
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
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Jitsi external_api.js"));
          document.body.appendChild(script);
        } else {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Jitsi external_api.js"));
        }
      });

    (async () => {
      try {
        await ensureScriptLoaded();
        if (cancelled || !window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;
        jitsiApiRef.current?.dispose();
        jitsiApiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName: lesson.jitsiRoomName,
          parentNode: jitsiContainerRef.current,
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
  }, [lesson.jitsiRoomName, lesson.type]);

  const submitQuiz = async () => {
    if (!quiz) return;
    const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:
        quiz.type === "MULTIPLE_CHOICE"
          ? JSON.stringify({ selectedOptionId })
          : JSON.stringify(await buildVoicePayload()),
    });
    if (!res.ok) {
      alert("Не удалось отправить тест. Попробуйте ещё раз.");
      return;
    }
    alert("✅ Тест отправлен на проверку.");
    router.refresh();
  };

  async function buildVoicePayload() {
    if (!voiceBlob) return {};
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Failed to read audio"));
      r.readAsDataURL(voiceBlob);
    });
    const parts = dataUrl.split(",");
    const meta = parts[0] ?? "";
    const base64 = parts[1] ?? "";
    const mimeMatch = meta.match(/^data:(.+);base64$/);
    const mime = mimeMatch?.[1] ?? voiceBlob.type ?? "audio/webm";
    return { voiceBase64: base64, voiceMimeType: mime, voiceDurationMs: voiceDurationMs ?? undefined };
  }

  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;
      const recorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setVoiceBlob(blob);
        if (voiceUrl) URL.revokeObjectURL(voiceUrl);
        const url = URL.createObjectURL(blob);
        setVoiceUrl(url);
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
    } catch {
      alert("Не удалось получить доступ к микрофону.");
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") return;
    rec.stop();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              {lesson.courseName} • {lesson.streamName}
            </p>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
          </div>
          <button
            onClick={() => router.push(viewerRole === "TEACHER" ? "/teacher" : "/student")}
            className="bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 rounded-xl font-semibold text-sm"
          >
            ← Назад
          </button>
        </div>

        {lesson.type === "LIVE" && (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black h-[70vh]">
            <div ref={jitsiContainerRef} className="w-full h-full" />
          </div>
        )}

        {lesson.type === "VIDEO" && lesson.content && (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-6">
            <a className="text-emerald-300 underline font-semibold" href={lesson.content} target="_blank" rel="noreferrer">
              Открыть видео
            </a>
          </div>
        )}

        {lesson.type === "TEXT" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            {lesson.content ? (
              <div className="
                text-white/90 leading-relaxed
                [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-white
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-white
                [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-white
                [&_p]:mb-4 [&_p]:leading-relaxed
                [&_ul]:mb-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1
                [&_ol]:mb-4 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1
                [&_li]:text-white/85
                [&_strong]:text-white [&_strong]:font-bold
                [&_em]:text-emerald-300 [&_em]:italic
                [&_code]:bg-white/10 [&_code]:text-emerald-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                [&_pre]:bg-black/40 [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto
                [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-4 [&_blockquote]:text-white/70 [&_blockquote]:italic [&_blockquote]:mb-4
                [&_hr]:border-white/10 [&_hr]:my-6
                [&_a]:text-emerald-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-emerald-300
              ">
                <ReactMarkdown>{lesson.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-white/50 text-center py-8">Материалы урока пока не добавлены.</p>
            )}
          </div>
        )}

        {quiz && (
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Тест по уроку</h2>
                <p className="text-white/60 text-sm">{quiz.title}</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
                {quiz.type === "MULTIPLE_CHOICE" ? "Выбор ответа" : "Голосом"}
              </span>
            </div>

            {quiz.type === "MULTIPLE_CHOICE" && quiz.questions[0] && (
              <div className="mt-5">
                <p className="font-semibold mb-3">{quiz.questions[0].prompt}</p>
                <div className="grid gap-2">
                  {quiz.questions[0].options.map((o) => (
                    <label
                      key={o.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedOptionId === o.id ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-black/20 hover:bg-black/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mcq"
                        value={o.id}
                        checked={selectedOptionId === o.id}
                        onChange={() => setSelectedOptionId(o.id)}
                      />
                      <span className="text-sm">{o.text}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={submitQuiz}
                  disabled={quizSubmitDisabled}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-5 py-2.5 rounded-xl font-bold"
                >
                  Отправить
                </button>
              </div>
            )}

            {quiz.type === "VOICE" && (
              <div className="mt-5">
                <p className="text-sm text-white/70">
                  Нажмите «Записать», прочитайте задание голосом, затем отправьте на проверку.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  {!recording ? (
                    <button
                      onClick={startRecording}
                      className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl font-bold"
                    >
                      ⏺ Записать
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl font-bold"
                    >
                      ⏹ Стоп
                    </button>
                  )}
                  {voiceUrl && (
                    <audio
                      controls
                      src={voiceUrl}
                      className="h-10"
                      onLoadedMetadata={(event) => {
                        const el = event.currentTarget;
                        if (Number.isFinite(el.duration)) setVoiceDurationMs(Math.round(el.duration * 1000));
                      }}
                    />
                  )}
                  {voiceBlob && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/80">
                      Готово к отправке
                    </span>
                  )}
                </div>
                <button
                  onClick={submitQuiz}
                  disabled={quizSubmitDisabled}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-5 py-2.5 rounded-xl font-bold"
                >
                  Отправить
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

