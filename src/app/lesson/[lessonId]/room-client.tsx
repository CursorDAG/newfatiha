"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { VideoPlayer } from "@/components/lesson/VideoPlayer";

type QuizType = "MULTIPLE_CHOICE" | "VOICE";
type QuestionType = "MULTIPLE_CHOICE" | "TEXT" | "VOICE";

type LessonQuiz = {
  id: string;
  title: string;
  type: QuizType;
  questions: Array<{
    id: string;
    prompt: string;
    type: QuestionType;
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
  hasRecording?: boolean;
};

type JitsiOptions = {
  roomName: string;
  parentNode: HTMLElement;
  userInfo?: { displayName?: string };
  jwt?: string;
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: JitsiOptions
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
  jitsiDomain = "meet.jit.si",
  jitsiToken,
}: {
  lesson: LessonPayload;
  viewerRole: string;
  jitsiDomain?: string;
  jitsiToken?: string;
}) {
  const router = useRouter();
  const [activitySessionId, setActivitySessionId] = useState<string | undefined>(undefined);

  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<{ dispose: () => void } | null>(null);

  // Recording state
  const [lessonRecording, setLessonRecording] = useState<{
    videoUrl: string;
    duration?: number;
    thumbnailUrl?: string;
  } | null>(null);
  const [loadingRecording, setLoadingRecording] = useState(false);

  const quiz = lesson.quizzes[0] ?? null;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, {
    selectedOptionId?: string;
    textAnswer?: string;
    voiceBlob?: Blob;
    voiceUrl?: string;
    voiceDurationMs?: number;
  }>>({});
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const currentAnswer = currentQuestion ? questionAnswers[currentQuestion.id] : undefined;

  const canSubmitCurrentQuestion = useMemo(() => {
    if (!currentQuestion || !currentAnswer) return false;
    if (currentQuestion.type === "MULTIPLE_CHOICE") return !!currentAnswer.selectedOptionId;
    if (currentQuestion.type === "TEXT") return !!currentAnswer.textAnswer?.trim();
    if (currentQuestion.type === "VOICE") return !!currentAnswer.voiceBlob;
    return false;
  }, [currentQuestion, currentAnswer]);

  const allQuestionsAnswered = useMemo(() => {
    if (!quiz) return false;
    return quiz.questions.every((q) => {
      const answer = questionAnswers[q.id];
      if (!answer) return false;
      if (q.type === "MULTIPLE_CHOICE") return !!answer.selectedOptionId;
      if (q.type === "TEXT") return !!answer.textAnswer?.trim();
      if (q.type === "VOICE") return !!answer.voiceBlob;
      return false;
    });
  }, [quiz, questionAnswers]);

  // Load recording if available
  useEffect(() => {
    if (!lesson.hasRecording) return;

    setLoadingRecording(true);
    fetch(`/api/lessons/${lesson.id}/recording`)
      .then((res) => res.json())
      .then((data) => {
        if (data.recording) {
          setLessonRecording(data.recording);
        }
      })
      .catch((err) => console.error("Failed to load recording:", err))
      .finally(() => setLoadingRecording(false));
  }, [lesson.id, lesson.hasRecording]);

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
          script.src = `https://${jitsiDomain}/external_api.js`;
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

        const options: JitsiOptions = {
          roomName: lesson.jitsiRoomName,
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            // Скрыть информацию о телефонных номерах для подключения
            disableInviteFunctions: true,
            // Отключить показ dial-in номеров
            dialInNumbersUrl: '',
            dialInConfCodeUrl: '',
          },
          interfaceConfigOverwrite: {
            // Скрыть кнопку "Пригласить" с телефонными номерами
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
              'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
              'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
              'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
            ],
            // Скрыть информацию о dial-in
            HIDE_INVITE_MORE_HEADER: true,
          },
        };

        // Add JWT token if available (for authenticated Jitsi)
        if (jitsiToken) {
          options.jwt = jitsiToken;
        }

        jitsiApiRef.current = new window.JitsiMeetExternalAPI(jitsiDomain, options);
      } catch (e) {
        console.error("[Jitsi] init error", e);
      }
    })();

    return () => {
      cancelled = true;
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
    };
  }, [lesson.jitsiRoomName, lesson.type, jitsiDomain, jitsiToken]);

  const submitAllQuestions = async () => {
    if (!quiz || !allQuestionsAnswered) return;

    try {
      for (const question of quiz.questions) {
        const answer = questionAnswers[question.id];
        if (!answer) continue;

        let body: Record<string, unknown> = {};

        if (question.type === "MULTIPLE_CHOICE") {
          body = { selectedOptionId: answer.selectedOptionId };
        } else if (question.type === "TEXT") {
          body = { textAnswer: answer.textAnswer };
        } else if (question.type === "VOICE" && answer.voiceBlob) {
          const voicePayload = await buildVoicePayload(answer.voiceBlob);
          body = voicePayload;
        }

        const res = await fetch(`/api/questions/${question.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          alert(`Не удалось отправить ответ на вопрос ${quiz.questions.indexOf(question) + 1}. Попробуйте ещё раз.`);
          return;
        }
      }

      alert("✅ Тест отправлен на проверку.");
      router.refresh();
    } catch (error) {
      alert("Произошла ошибка при отправке теста.");
      console.error(error);
    }
  };

  async function buildVoicePayload(voiceBlob: Blob) {
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
    return { voiceBase64: base64, voiceMimeType: mime, voiceDurationMs: undefined };
  }

  const startRecording = async () => {
    if (recording || !currentQuestion) return;
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
        const url = URL.createObjectURL(blob);

        setQuestionAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            ...prev[currentQuestion.id],
            voiceBlob: blob,
            voiceUrl: url,
          },
        }));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push(viewerRole === "TEACHER" ? "/teacher" : "/student")}
              className="flex-shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 min-h-11 min-w-11 px-2 sm:px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95"
              aria-label="Назад"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Назад</span>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 text-xs">
                <span className="text-emerald-400 font-bold uppercase tracking-wider truncate">
                  {lesson.courseName}
                </span>
                <span className="text-white/30 hidden sm:inline">•</span>
                <span className="text-white/60 font-medium hidden sm:inline truncate">
                  {lesson.streamName}
                </span>
              </div>
              <h1
                className="text-base sm:text-xl lg:text-2xl font-bold text-white leading-tight line-clamp-2"
                title={lesson.title}
              >
                {lesson.title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* Live Stream */}
        {lesson.type === "LIVE" && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl h-[60vh] sm:h-[70vh]">
              <div ref={jitsiContainerRef} className="w-full h-full" />
            </div>
          </div>
        )}

        {/* Video Lesson */}
        {lesson.type === "VIDEO" && lesson.content && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">Видеоурок</h3>
                <p className="text-white/60 text-sm mb-3">Нажмите, чтобы открыть видео в новой вкладке</p>
                <a
                  href={lesson.content}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Открыть видео
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Lesson Recording */}
        {lessonRecording && (
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
              <VideoPlayer
                videoUrl={lessonRecording.videoUrl}
                lessonId={lesson.id}
                streamId={lesson.streamId}
                duration={lessonRecording.duration}
              />
            </div>
          </div>
        )}

        {loadingRecording && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-12 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-4 animate-pulse">
              <svg className="w-8 h-8 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-white/60 font-medium">Загрузка записи урока...</p>
          </div>
        )}

        {/* Text Lesson */}
        {lesson.type === "TEXT" && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/10 px-6 sm:px-8 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">Материалы урока</h3>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              {lesson.content ? (
                <div className="
                  prose prose-invert max-w-none
                  text-white/90 leading-relaxed
                  [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-white [&_h1]:mt-0
                  [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-white [&_h2]:first:mt-0
                  [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-white
                  [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-base
                  [&_ul]:mb-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-2
                  [&_ol]:mb-4 [&_ol]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2
                  [&_li]:text-white/85 [&_li]:leading-relaxed
                  [&_strong]:text-white [&_strong]:font-bold
                  [&_em]:text-emerald-300 [&_em]:italic
                  [&_code]:bg-black/40 [&_code]:text-emerald-300 [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:border [&_code]:border-white/10
                  [&_pre]:bg-black/60 [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:shadow-inner
                  [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:text-white/70 [&_blockquote]:italic [&_blockquote]:mb-4 [&_blockquote]:bg-emerald-500/5 [&_blockquote]:rounded-r-lg
                  [&_hr]:border-white/10 [&_hr]:my-8
                  [&_a]:text-emerald-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-emerald-400/30 hover:[&_a]:text-emerald-300 hover:[&_a]:decoration-emerald-300 [&_a]:transition-colors
                  [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4
                  [&_th]:bg-white/5 [&_th]:border [&_th]:border-white/10 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold
                  [&_td]:border [&_td]:border-white/10 [&_td]:px-4 [&_td]:py-2
                ">
                  <ReactMarkdown>{lesson.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                    <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-white/50 font-medium">Материалы урока пока не добавлены</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quiz Section */}
        {quiz && (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] shadow-xl overflow-hidden">
            {/* Quiz Header */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-white/10 px-6 sm:px-8 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">Тест по уроку</h2>
                    <p className="text-white/60 text-sm">{quiz.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                  <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-emerald-200">
                    {quiz.questions.length} {quiz.questions.length === 1 ? "вопрос" : "вопроса"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">

            {/* Question Navigation */}
            {quiz.questions.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {quiz.questions.map((q, idx) => {
                  const isAnswered = !!questionAnswers[q.id];
                  const isCurrent = currentQuestionIndex === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                        isCurrent
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105"
                          : isAnswered
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                          : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
                      }`}
                    >
                      <span>{idx + 1}</span>
                      <span className="text-base">
                        {q.type === "MULTIPLE_CHOICE" ? "📝" : q.type === "TEXT" ? "✍️" : "🎤"}
                      </span>
                      {isAnswered && !isCurrent && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Current Question */}
            {currentQuestion && (
              <div className="space-y-5">
                {/* Question Prompt */}
                <div className="bg-gradient-to-br from-black/40 to-black/20 border border-white/10 rounded-xl p-5 shadow-inner">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 text-white/70 border border-white/5">
                      Вопрос {currentQuestionIndex + 1} из {quiz.questions.length}
                    </span>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30">
                      {currentQuestion.type === "MULTIPLE_CHOICE" ? "📝 Выбор ответа" : currentQuestion.type === "TEXT" ? "✍️ Текстовый ответ" : "🎤 Голосовой ответ"}
                    </span>
                  </div>
                  <p className="font-semibold text-white text-base sm:text-lg leading-relaxed">{currentQuestion.prompt}</p>
                </div>

                {/* Multiple Choice Question */}
                {currentQuestion.type === "MULTIPLE_CHOICE" && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((o, idx) => {
                      const isSelected = currentAnswer?.selectedOptionId === o.id;
                      return (
                        <label
                          key={o.id}
                          className={`group flex items-center gap-3 w-full min-h-12 rounded-xl border-2 px-4 py-3 text-left cursor-pointer transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/15 text-white shadow-lg"
                              : "border-white/15 bg-black/20 text-white/80 hover:border-white/30 hover:bg-black/30"
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-500"
                                : "border-white/30 group-hover:border-white/50"
                            }`}
                          >
                            {isSelected ? (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <span className="text-xs font-bold text-white/60">{String.fromCharCode(65 + idx)}</span>
                            )}
                          </div>
                          <span className="flex-1 text-base leading-snug">{o.text}</span>
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            value={o.id}
                            checked={isSelected}
                            onChange={() =>
                              setQuestionAnswers((prev) => ({
                                ...prev,
                                [currentQuestion.id]: { selectedOptionId: o.id },
                              }))
                            }
                            className="sr-only"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Text Question */}
                {currentQuestion.type === "TEXT" && (
                  <div>
                    <textarea
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none resize-none h-40 transition-all"
                      placeholder="Введите ваш развернутый ответ..."
                      value={currentAnswer?.textAnswer || ""}
                      onChange={(e) =>
                        setQuestionAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: { textAnswer: e.target.value },
                        }))
                      }
                    />
                    <p className="text-xs text-white/50 mt-2">Постарайтесь ответить максимально подробно</p>
                  </div>
                )}

                {/* Voice Question */}
                {currentQuestion.type === "VOICE" && (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-blue-200 leading-relaxed">
                          Нажмите «Записать», четко произнесите ответ на вопрос, затем остановите запись. Вы сможете прослушать запись перед отправкой.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      {!recording ? (
                        <button
                          onClick={startRecording}
                          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-3 rounded-xl font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Начать запись
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 px-5 py-3 rounded-xl font-bold shadow-lg animate-pulse"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                          </svg>
                          Остановить запись
                        </button>
                      )}
                      {currentAnswer?.voiceUrl && (
                        <div className="flex items-center gap-3 flex-1 min-w-0 bg-black/30 border border-white/10 rounded-xl p-3">
                          <audio
                            controls
                            src={currentAnswer.voiceUrl}
                            className="flex-1 h-10"
                            onLoadedMetadata={(event) => {
                              const el = event.currentTarget;
                              if (Number.isFinite(el.duration)) {
                                setQuestionAnswers((prev) => ({
                                  ...prev,
                                  [currentQuestion.id]: {
                                    ...prev[currentQuestion.id],
                                    voiceDurationMs: Math.round(el.duration * 1000),
                                  },
                                }));
                              }
                            }}
                          />
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-bold text-emerald-200">Готово</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-6 border-t border-white/10">
                  {currentQuestionIndex > 0 && (
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Назад
                    </button>
                  )}
                  {currentQuestionIndex < quiz.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      disabled={!canSubmitCurrentQuestion}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 disabled:scale-100 shadow-lg disabled:shadow-none"
                    >
                      Следующий вопрос
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={submitAllQuestions}
                      disabled={!allQuestionsAnswered}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 disabled:scale-100 shadow-lg disabled:shadow-none"
                    >
                      {allQuestionsAnswered ? (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Отправить тест
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Ответьте на все вопросы
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

