"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  X,
  Home,
  BookOpen,
  FileText,
  Calendar,
  BarChart3,
  FlaskConical,
  Video,
  FileVideo,
  LogOut,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
  Info,
  type LucideIcon,
} from "lucide-react";
import LiveJitsiEmbed from "@/components/student/LiveJitsiEmbed";
import StudentProgressDashboard from "@/components/student/StudentProgressDashboard";
import StudentInfoTab from "@/components/student/StudentInfoTab";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { studentSteps } from "@/components/onboarding/studentSteps";
// import { OnboardingTooltip } from "@/components/onboarding/OnboardingTooltip"; // Временно отключено - блокирует экран

// ── Types ─────────────────────────────────────────────────────────────────────

type Lesson = { id: string; title: string; type: string; content: string | null };

type ScheduleSlot = {
  dayOfWeek: number;
  startMinutes: number;
  durationMinutes: number;
};

type StreamData = {
  id: string;
  name: string;
  level: string;
  schedule: string;
  courseName: string;
  teacherName: string;
  scheduleSlots: ScheduleSlot[];
  lessons: Lesson[];
};

type Enrollment = { enrollmentId: string; status: string; stream: StreamData };

type HomeworkSubmission = {
  id: string;
  status: "SUBMITTED" | "ACCEPTED" | "NEEDS_REWORK" | "REJECTED";
  grade: number | null;
  teacherComment: string | null;
  contentText: string | null;
  submittedAt: string;
  checkedAt: string | null;
};

type HomeworkAssignment = {
  id: string;
  title: string;
  description: string | null;
  type: "TEXT" | "AUDIO";
  dueAt: string | null;
  streamId: string;
  streamName: string;
  enrollmentId: string | null;
  lesson: { id: string; title: string } | null;
  submission: HomeworkSubmission | null;
};

type QuizResult = {
  id: string;
  status: "SUBMITTED" | "PASSED" | "FAILED";
  createdAt: string;
  checkedAt: string | null;
  quiz: {
    id: string;
    title: string;
    type: "MULTIPLE_CHOICE" | "VOICE";
    lesson: {
      id: string;
      title: string;
      streamId: string;
    };
  };
};

type TabId = "home" | "lessons" | "homework" | "schedule" | "results" | "progress" | "info";

type ActiveLiveLesson = {
  lessonId: string;
  lessonTitle: string;
  jitsiRoomName: string;
  streamName: string;
} | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getLessonIcon = (type: string) => {
  if (type === "LIVE") return Radio;
  if (type === "VIDEO") return FileVideo;
  return FileText;
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Активен",
  TRANSFERRED: "Переведён",
  REPEATING: "Повтор",
  KICKED: "Отчислен",
};

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  TRANSFERRED: "bg-blue-100 text-blue-800 border-blue-200",
  REPEATING: "bg-amber-100 text-amber-800 border-amber-200",
  KICKED: "bg-red-100 text-red-800 border-red-200",
};

const submissionStatusLabel: Record<HomeworkSubmission["status"], string> = {
  SUBMITTED: "На проверке",
  ACCEPTED: "Принято",
  NEEDS_REWORK: "На доработке",
  REJECTED: "Отклонено",
};

const submissionStatusColor: Record<HomeworkSubmission["status"], string> = {
  SUBMITTED: "bg-slate-100 text-slate-700 border-slate-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NEEDS_REWORK: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

function SubmissionStatusIcon({ status, className }: { status: HomeworkSubmission["status"]; className?: string }) {
  if (status === "ACCEPTED") return <CheckCircle2 className={className} />;
  if (status === "NEEDS_REWORK") return <AlertCircle className={className} />;
  if (status === "REJECTED") return <XCircle className={className} />;
  return <Clock className={className} />;
}

const quizStatusLabel: Record<QuizResult["status"], string> = {
  SUBMITTED: "На проверке",
  PASSED: "Сдано",
  FAILED: "Не сдано",
};

const quizStatusColor: Record<QuizResult["status"], string> = {
  SUBMITTED: "bg-slate-100 text-slate-700 border-slate-200",
  PASSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

function QuizStatusIcon({ status, className }: { status: QuizResult["status"]; className?: string }) {
  if (status === "PASSED") return <CheckCircle2 className={className} />;
  if (status === "FAILED") return <XCircle className={className} />;
  return <Clock className={className} />;
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// ── Homework submit form ──────────────────────────────────────────────────────

function HomeworkSubmitForm({
  assignment,
  onClose,
  onSubmitted,
}: {
  assignment: HomeworkAssignment;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const isAudio = assignment.type === "AUDIO";
  const [text, setText] = useState(assignment.submission?.contentText ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices) {
      setError("Микрофон недоступен в этом браузере");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType });
      mediaRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      startRef.current = Date.now();
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startRef.current) / 1000));
      }, 500);
      setRecording(true);
    } catch {
      setError("Не удалось получить доступ к микрофону");
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  }

  function resetAudio() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAudio) {
      if (!audioBlob) { setError("Запишите голосовой ответ перед отправкой"); return; }
      setLoading(true);
      setError("");
      try {
        const arr = new Uint8Array(await audioBlob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
        const b64 = btoa(binary);
        const res = await fetch(`/api/teacher/homework/${assignment.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voiceBase64: b64,
            voiceMimeType: audioBlob.type,
            voiceDurationMs: duration * 1000,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка отправки");
        onSubmitted();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка отправки");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!text.trim()) { setError("Напишите ответ перед отправкой"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/teacher/homework/${assignment.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentText: text.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка отправки");
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-emerald-600" />
        <p className="text-base font-bold text-slate-800">
          {assignment.submission ? "Исправить и повторно сдать" : "Сдать задание"}
        </p>
      </div>
      {assignment.description && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-700 leading-relaxed">{assignment.description}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isAudio ? (
          <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              {!recording && !audioBlob && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 px-4 rounded-xl transition-all"
                >
                  🎤 Начать запись
                </button>
              )}
              {recording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold py-2 px-4 rounded-xl transition-all"
                >
                  ⏹ Остановить ({duration}s)
                </button>
              )}
              {audioBlob && !recording && (
                <button
                  type="button"
                  onClick={resetAudio}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold py-2 px-4 rounded-xl"
                >
                  ↻ Перезаписать
                </button>
              )}
              <span className="text-sm text-slate-600">
                {recording && `идёт запись: ${duration}s`}
                {!recording && audioBlob && `записано: ${duration}s (${Math.round(audioBlob.size / 1024)} KB)`}
                {!recording && !audioBlob && "Нажмите «Начать запись»"}
              </span>
            </div>
            {audioUrl && (
              <audio controls src={audioUrl} className="w-full" />
            )}
          </div>
        ) : (
          <textarea
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none h-32 bg-white"
            placeholder="Напишите ваш ответ..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition-all shadow-sm hover:shadow"
          >
            {loading ? "Отправка..." : "Отправить"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold py-3 rounded-xl transition-all border border-slate-300"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Homework card ─────────────────────────────────────────────────────────────

function HomeworkCard({
  assignment,
  onRefresh,
}: {
  assignment: HomeworkAssignment;
  onRefresh: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const isOverdue =
    assignment.dueAt && new Date(assignment.dueAt) < new Date() && !assignment.submission;

  const submissionStatus = assignment.submission?.status || "SUBMITTED";

  return (
    <div
      className={`border rounded-xl p-6 bg-white space-y-4 transition-all hover:shadow-md ${
        isOverdue ? "border-red-300 bg-red-50/30" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 leading-tight text-base">{assignment.title}</p>
              {assignment.lesson && (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {assignment.lesson.title}
                </p>
              )}
              {assignment.dueAt && (
                <p
                  className={`text-sm font-semibold mt-2 flex items-center gap-1.5 ${
                    isOverdue ? "text-red-600" : "text-slate-600"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Сдать до:{" "}
                  {new Date(assignment.dueAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isOverdue && " — просрочено"}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Status badge */}
        <div className="shrink-0">
          {assignment.submission ? (
            <span
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                submissionStatusColor[assignment.submission.status]
              }`}
            >
              <SubmissionStatusIcon status={submissionStatus} className="w-3.5 h-3.5" />
              {submissionStatusLabel[assignment.submission.status]}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              Не сдано
            </span>
          )}
        </div>
      </div>

      {/* Submitted answer preview */}
      {assignment.submission?.contentText && !formOpen && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Ваш ответ:</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4 leading-relaxed">
            {assignment.submission.contentText}
          </p>
        </div>
      )}

      {/* Teacher feedback */}
      {assignment.submission &&
        (assignment.submission.grade !== null ||
          assignment.submission.teacherComment) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Проверено учителем
              </p>
              {assignment.submission.checkedAt && (
                <p className="text-xs text-emerald-600">
                  {new Date(assignment.submission.checkedAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              )}
            </div>
            {assignment.submission.grade !== null && (
              <p className="text-sm font-bold text-emerald-800">
                Оценка: {assignment.submission.grade} / 100
              </p>
            )}
            {assignment.submission.teacherComment && (
              <p className="text-sm text-emerald-700 whitespace-pre-wrap">
                {assignment.submission.teacherComment}
              </p>
            )}
          </div>
        )}

      {/* Action buttons */}
      {!formOpen && (
        <div className="flex gap-2">
          {!assignment.submission && (
            <button
              onClick={() => setFormOpen(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 rounded-xl transition-all"
            >
              Сдать задание
            </button>
          )}
          {assignment.submission &&
            (assignment.submission.status === "NEEDS_REWORK" ||
              assignment.submission.status === "REJECTED") && (
              <button
                onClick={() => setFormOpen(true)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2 rounded-xl transition-all"
              >
                Исправить и сдать повторно
              </button>
            )}
        </div>
      )}

      {formOpen && (
        <HomeworkSubmitForm
          assignment={assignment}
          onClose={() => setFormOpen(false)}
          onSubmitted={() => {
            setFormOpen(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StudentDashboard({
  userName,
  userId: _userId,
  userEmail: _userEmail,
  enrollments,
  homeworkAssignments,
  quizResults = [],
  jitsiDomain = "meet.jit.si",
}: {
  userName: string;
  userId: string;
  userEmail: string;
  enrollments: Enrollment[];
  homeworkAssignments: HomeworkAssignment[];
  quizResults?: QuizResult[];
  jitsiDomain?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [activeLiveLesson, setActiveLiveLesson] = useState<ActiveLiveLesson>(null);
  const [jitsiToken, setJitsiToken] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activitySessionIdRef = useRef<string | undefined>(undefined);
  const { startOnboarding, isCompleted } = useOnboarding();

  useEffect(() => {
    if (!isCompleted) {
      const timer = setTimeout(() => {
        startOnboarding(studentSteps);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, startOnboarding]);

  useEffect(() => {
    const handler = () => setMobileMenuOpen((v) => !v);
    window.addEventListener("student-shell-toggle-sidebar", handler);
    return () => window.removeEventListener("student-shell-toggle-sidebar", handler);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileMenuOpen]);

  // Fetch Jitsi JWT token for a stream
  const fetchJitsiToken = async (streamId: string): Promise<string | undefined> => {
    try {
      const res = await fetch("/api/jitsi/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId }),
      });
      if (!res.ok) return undefined;
      const data = await res.json();
      return data.enabled ? data.token : undefined;
    } catch {
      return undefined;
    }
  };

  // Join live lesson with JWT token
  const joinLiveLesson = async (lesson: {
    lessonId: string;
    lessonTitle: string;
    jitsiRoomName: string;
    streamName: string;
  }) => {
    const token = await fetchJitsiToken(lesson.jitsiRoomName);
    setJitsiToken(token);
    setActiveLiveLesson(lesson);
  };

  // Activity heartbeat
  useEffect(() => {
    let cancelled = false;
    let interval: number | undefined;

    async function heartbeat(input: { sessionId?: string; end?: boolean }) {
      const res = await fetch("/api/activity/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: input.sessionId, kind: "APP", end: input.end }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { sessionId: string };
    }

    (async () => {
      const created = await heartbeat({});
      if (!created || cancelled) return;
      activitySessionIdRef.current = created.sessionId;
      interval = window.setInterval(() => {
        heartbeat({ sessionId: created.sessionId });
      }, 30_000);
    })();

    const onVisibility = () => {
      if (document.visibilityState === "hidden" && activitySessionIdRef.current) {
        heartbeat({ sessionId: activitySessionIdRef.current, end: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (interval) window.clearInterval(interval);
      if (activitySessionIdRef.current)
        heartbeat({ sessionId: activitySessionIdRef.current, end: true });
    };
  }, []);

  const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
    { id: "home", label: "Главная", icon: Home },
    { id: "lessons", label: "Мои уроки", icon: BookOpen },
    { id: "homework", label: "Домашние задания", icon: FileText },
    { id: "results", label: "Тесты", icon: FlaskConical },
    { id: "progress", label: "Мой прогресс", icon: BarChart3 },
    { id: "schedule", label: "Расписание", icon: Calendar },
    { id: "info", label: "Информация", icon: Info },
  ];

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Count pending homework for badge
  const pendingHomeworkCount = homeworkAssignments.filter(
    (a) => !a.submission,
  ).length;

  // Count unchecked quiz submissions for badge
  const pendingQuizCount = quizResults.filter((q) => q.status === "SUBMITTED").length;

  // Group quiz results by lesson for display
  const quizResultsByLesson = quizResults.reduce<Record<string, { lessonTitle: string; lessonId: string; results: QuizResult[] }>>(
    (acc, qr) => {
      const lessonId = qr.quiz.lesson.id;
      if (!acc[lessonId]) {
        acc[lessonId] = { lessonTitle: qr.quiz.lesson.title, lessonId, results: [] };
      }
      acc[lessonId].results.push(qr);
      return acc;
    },
    {},
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" data-onboarding="student-dashboard">
      {/* <OnboardingTooltip /> */} {/* Временно отключено - блокирует экран */}

      {/* ── Full-viewport live lesson overlay ──────────────────────── */}
      {activeLiveLesson && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <LiveJitsiEmbed
            lessonId={activeLiveLesson.lessonId}
            lessonTitle={activeLiveLesson.lessonTitle}
            jitsiRoomName={activeLiveLesson.jitsiRoomName}
            streamName={activeLiveLesson.streamName}
            userName={userName}
            jitsiDomain={jitsiDomain}
            jitsiToken={jitsiToken}
            onLeave={() => {
              setActiveLiveLesson(null);
              setJitsiToken(undefined);
            }}
          />
        </div>
      )}

      {/* Mobile menu overlay - затемнение фона */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[59]"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="w-full px-3 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-6 grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* ── Sidebar ────────────────────────────────────────────────── */}
        {/* На мобильных: показывается как модальное меню с кнопкой закрытия */}
        {/* На десктопе: статический sidebar */}
        <nav className={`lg:col-span-1 bg-white lg:rounded-xl lg:shadow-sm lg:border lg:border-slate-200 p-4 sm:p-6 space-y-2 lg:h-fit lg:relative ${
          mobileMenuOpen
            ? "fixed left-0 top-0 bottom-0 w-[82vw] max-w-sm z-[60] overflow-y-auto shadow-2xl pt-16 pb-6"
            : "hidden lg:block"
        }`}>
          {/* Шапка мобильного drawer: заголовок + крестик */}
          <div className="lg:hidden absolute top-0 left-0 right-0 px-4 h-14 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white">
            <span className="text-sm font-bold text-emerald-800">Разделы</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-11 min-w-11 -mr-2 p-2 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center"
              aria-label="Закрыть меню"
            >
              <X className="w-5 h-5 text-emerald-700" />
            </button>
          </div>
          {/* User block */}
          <div className="pb-5 mb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 text-sm leading-tight truncate">
                  {userName}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Студент</p>
              </div>
            </div>
          </div>

          {/* Enrolled streams with teacher info */}
          {enrollments.length > 0 && (
            <div className="pb-4 mb-4 border-b border-slate-200" data-onboarding="my-streams">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Мои потоки</p>
              <div className="space-y-2">
                {enrollments.map((e) => (
                  <div key={e.enrollmentId} className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                    <p className="font-semibold text-slate-800 truncate text-xs">{e.stream.name}</p>
                    <p className="text-slate-500 truncate text-[11px] mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {e.stream.teacherName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                data-onboarding={`student-tab-${t.id}`}
                className={`w-full text-left px-3 min-h-11 py-2 rounded-xl transition-all font-semibold text-sm flex items-center gap-3 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className="flex-1">{t.label}</span>
                {t.id === "homework" && pendingHomeworkCount > 0 && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ${isActive ? "bg-white/25 text-white" : "bg-red-500 text-white"}`}>
                    {pendingHomeworkCount}
                  </span>
                )}
                {t.id === "results" && pendingQuizCount > 0 && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center ${isActive ? "bg-white/25 text-white" : "bg-amber-500 text-white"}`}>
                    {pendingQuizCount}
                  </span>
                )}
              </button>
            );
          })}
          </div>

          <div className="pt-3 border-t border-slate-200 mt-3">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left px-3 min-h-11 py-2 rounded-xl transition-all font-semibold text-sm text-red-600 hover:bg-red-50 active:bg-red-100 flex items-center gap-3"
            >
              <LogOut className="w-5 h-5" />
              <span>Выйти</span>
            </button>
          </div>
        </nav>

        {/* ── Main content ───────────────────────────────────────────── */}
        <section className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[650px] overflow-hidden flex flex-col">
          {/* ── Home Tab ─────────────────────────────────────────────── */}
          {activeTab === "home" && (
            <div className="p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
              {/* Welcome hero */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 sm:p-6 text-white shadow-lg">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
                <div className="absolute -left-6 -bottom-10 w-28 h-28 rounded-full bg-teal-300/20 blur-2xl" aria-hidden />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100/90">
                    {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <h2 className="text-xl sm:text-3xl font-bold mt-1 leading-tight">
                    Ассаламу алейкум, {userName}!
                  </h2>
                  <p className="text-sm text-emerald-50/90 mt-2">
                    {pendingHomeworkCount > 0
                      ? `${pendingHomeworkCount} ${pendingHomeworkCount === 1 ? "задание ждёт выполнения" : "заданий ждут выполнения"}`
                      : enrollments.filter((e) => e.status === "ACTIVE").length > 0
                      ? "Все задания выполнены — так держать!"
                      : "Готов к новым знаниям"}
                  </p>
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4" data-onboarding="home-stats">
                <div className="bg-white border border-emerald-100 rounded-2xl p-3 sm:p-5 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-2 sm:mb-3">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
                    {enrollments.filter((e) => e.status === "ACTIVE").length}
                  </p>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1 leading-tight">Активных потоков</p>
                </div>
                <div className={`rounded-2xl p-3 sm:p-5 border hover:shadow-md transition-shadow ${pendingHomeworkCount > 0 ? "bg-white border-amber-200" : "bg-white border-slate-200"}`}>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3 ${pendingHomeworkCount > 0 ? "bg-amber-50" : "bg-slate-100"}`}>
                    <FileText className={`w-5 h-5 sm:w-6 sm:h-6 ${pendingHomeworkCount > 0 ? "text-amber-600" : "text-slate-400"}`} />
                  </div>
                  <p className={`text-2xl sm:text-3xl font-bold leading-none ${pendingHomeworkCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    {pendingHomeworkCount}
                  </p>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1 leading-tight">К сдаче</p>
                </div>
                <div className={`rounded-2xl p-3 sm:p-5 border hover:shadow-md transition-shadow ${pendingQuizCount > 0 ? "bg-white border-blue-200" : "bg-white border-slate-200"}`}>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3 ${pendingQuizCount > 0 ? "bg-blue-50" : "bg-slate-100"}`}>
                    <FlaskConical className={`w-5 h-5 sm:w-6 sm:h-6 ${pendingQuizCount > 0 ? "text-blue-600" : "text-slate-400"}`} />
                  </div>
                  <p className={`text-2xl sm:text-3xl font-bold leading-none ${pendingQuizCount > 0 ? "text-blue-600" : "text-slate-400"}`}>
                    {pendingQuizCount}
                  </p>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1 leading-tight">На проверке</p>
                </div>
              </div>

              {/* Priority-sorted "what's important now" */}
              <div data-onboarding="upcoming-lessons">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Что делать сейчас
                </h3>
                {(() => {
                  const now = new Date();
                  const todayStart = new Date(now);
                  todayStart.setHours(0, 0, 0, 0);
                  const tomorrowStart = new Date(todayStart);
                  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
                  const weekEnd = new Date(todayStart);
                  weekEnd.setDate(weekEnd.getDate() + 7);
                  const todayDow = (now.getDay() + 6) % 7;
                  const nowMinutes = now.getHours() * 60 + now.getMinutes();

                  const activeEnr = enrollments.filter((e) => e.status === "ACTIVE");

                  const pendingHw = homeworkAssignments.filter(
                    (a) => a.enrollmentId && !a.submission && a.dueAt,
                  );
                  const overdue = pendingHw.filter((a) => new Date(a.dueAt!) < todayStart);
                  const todayHw = pendingHw.filter((a) => {
                    const d = new Date(a.dueAt!);
                    return d >= todayStart && d < tomorrowStart;
                  });
                  const weekHw = pendingHw.filter((a) => {
                    const d = new Date(a.dueAt!);
                    return d >= tomorrowStart && d < weekEnd;
                  });

                  const todayLive = activeEnr.flatMap((e) =>
                    e.stream.scheduleSlots
                      .filter(
                        (s) =>
                          s.dayOfWeek === todayDow &&
                          s.startMinutes + s.durationMinutes > nowMinutes,
                      )
                      .map((s) => ({
                        key: `${e.stream.id}-${s.dayOfWeek}-${s.startMinutes}`,
                        streamId: e.stream.id,
                        streamName: e.stream.name,
                        startMinutes: s.startMinutes,
                        durationMinutes: s.durationMinutes,
                      })),
                  ).sort((a, b) => a.startMinutes - b.startMinutes);

                  const weekLive = activeEnr.flatMap((e) =>
                    e.stream.scheduleSlots
                      .filter((s) => s.dayOfWeek !== todayDow)
                      .map((s) => {
                        const daysAhead = (s.dayOfWeek - todayDow + 7) % 7 || 7;
                        return {
                          key: `${e.stream.id}-${s.dayOfWeek}-${s.startMinutes}`,
                          streamName: e.stream.name,
                          startMinutes: s.startMinutes,
                          durationMinutes: s.durationMinutes,
                          dayOfWeek: s.dayOfWeek,
                          daysAhead,
                        };
                      })
                      .filter((s) => s.daysAhead <= 7),
                  ).sort((a, b) => a.daysAhead - b.daysAhead || a.startMinutes - b.startMinutes);

                  const hasAnything =
                    overdue.length ||
                    todayLive.length ||
                    todayHw.length ||
                    weekLive.length ||
                    weekHw.length;

                  if (!hasAnything) {
                    return (
                      <div className="text-center py-8 bg-emerald-50 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-emerald-700">Всё под контролем</p>
                        <p className="text-xs text-emerald-600 mt-1">
                          На ближайшие 7 дней задач нет
                        </p>
                      </div>
                    );
                  }

                  const HwRow = ({ a, tone }: { a: HomeworkAssignment; tone: "red" | "amber" | "emerald" }) => {
                    const toneClass = {
                      red: "border-red-200 bg-red-50/40",
                      amber: "border-amber-200 bg-amber-50/40",
                      emerald: "border-slate-200 bg-white",
                    }[tone];
                    const due = a.dueAt ? new Date(a.dueAt) : null;
                    const dueLabel = due
                      ? due.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) +
                        " " +
                        due.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
                      : "";
                    return (
                      <button
                        onClick={() => setActiveTab("homework")}
                        className={`w-full flex items-center gap-3 border rounded-xl p-3 text-left hover:shadow-sm transition-all ${toneClass}`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-slate-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 text-sm truncate">{a.title}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {a.streamName}
                            {dueLabel && <> · до {dueLabel}</>}
                          </p>
                        </div>
                      </button>
                    );
                  };

                  const LiveRow = ({
                    slot,
                    subtitle,
                  }: {
                    slot: { streamId?: string; streamName: string; startMinutes: number; durationMinutes: number };
                    subtitle: string;
                  }) => (
                    <div className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 bg-white">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                        <Radio className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {slot.streamName}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {subtitle} · {formatTime(slot.startMinutes)} ({slot.durationMinutes} мин)
                        </p>
                      </div>
                    </div>
                  );

                  return (
                    <div className="space-y-5">
                      {overdue.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                              Просрочено · {overdue.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {overdue.map((a) => (
                              <HwRow key={a.id} a={a} tone="red" />
                            ))}
                          </div>
                        </div>
                      )}

                      {(todayLive.length > 0 || todayHw.length > 0) && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                              Сегодня · {todayLive.length + todayHw.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {todayLive.map((s) => (
                              <LiveRow key={s.key} slot={s} subtitle="Прямой эфир" />
                            ))}
                            {todayHw.map((a) => (
                              <HwRow key={a.id} a={a} tone="amber" />
                            ))}
                          </div>
                        </div>
                      )}

                      {(weekLive.length > 0 || weekHw.length > 0) && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                              На этой неделе · {weekLive.length + weekHw.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {weekLive.slice(0, 5).map((s) => (
                              <LiveRow
                                key={s.key}
                                slot={s}
                                subtitle={DAY_NAMES[s.dayOfWeek]}
                              />
                            ))}
                            {weekHw.map((a) => (
                              <HwRow key={a.id} a={a} tone="emerald" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Recent results */}
              {(quizResults.length > 0 || homeworkAssignments.some((a) => a.submission)) && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Последние результаты
                  </h3>
                  <div className="space-y-3">
                    {quizResults.slice(0, 3).map((qr) => (
                        <div
                          key={qr.id}
                          className="flex items-center justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{qr.quiz.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{qr.quiz.lesson.title}</p>
                          </div>
                          <span className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${quizStatusColor[qr.status]}`}>
                            <QuizStatusIcon status={qr.status} className="w-3.5 h-3.5" />
                            {quizStatusLabel[qr.status]}
                          </span>
                        </div>
                      ))}
                    {homeworkAssignments
                      .filter((a) => a.submission?.status === "ACCEPTED")
                      .slice(0, 3)
                      .map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">{a.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{a.streamName}</p>
                          </div>
                          <span className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Принято
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Lessons Tab ──────────────────────────────────────────── */}
          {activeTab === "lessons" && (
            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="mb-5 pb-4 border-b border-slate-200 sm:mb-8 sm:pb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600" />
                  <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">Мои уроки</h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">
                  Все уроки ваших потоков
                </p>
              </div>

              {enrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-5 shadow-sm">
                    <BookOpen className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">Ещё нет потоков</h3>
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    Попросите преподавателя прислать пригласительную ссылку на курс
                  </p>
                </div>
              ) : (
                <div className="space-y-8" data-onboarding="lessons-list">
                  {enrollments.map((e) => (
                    <div key={e.enrollmentId}>
                      {/* Stream header card */}
                      <div className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 p-4 sm:p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 text-lg sm:text-xl truncate">
                                {e.stream.name}
                              </h3>
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  statusColor[e.status] ?? "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {statusLabel[e.status] ?? e.status}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span>{e.stream.courseName}</span>
                              <span className="text-slate-300">•</span>
                              <span>{e.stream.level}</span>
                              <span className="text-slate-300">•</span>
                              <span>{e.stream.schedule}</span>
                            </p>
                          </div>
                          <div className="shrink-0 hidden sm:flex w-10 h-10 rounded-xl bg-emerald-600 text-white items-center justify-center font-bold text-sm shadow-sm">
                            {e.stream.teacherName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          Учитель: <span className="font-semibold text-slate-700">{e.stream.teacherName}</span>
                        </p>
                      </div>

                      {e.stream.lessons.length === 0 ? (
                        <div className="rounded-2xl p-8 text-center bg-slate-50 border border-dashed border-slate-200">
                          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <BookOpen className="w-7 h-7 text-slate-300" />
                          </div>
                          <p className="text-sm font-semibold text-slate-500">Уроков пока нет</p>
                          <p className="text-xs text-slate-400 mt-1">Учитель ещё не добавил материалы</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {e.stream.lessons.map((lesson, idx) => {
                            const LessonIcon = getLessonIcon(lesson.type);
                            const accent = lesson.type === "LIVE"
                              ? { ring: "border-red-100", iconBg: "bg-red-50", iconClr: "text-red-600", typeClr: "text-red-600" }
                              : lesson.type === "VIDEO"
                              ? { ring: "border-violet-100", iconBg: "bg-violet-50", iconClr: "text-violet-600", typeClr: "text-violet-600" }
                              : { ring: "border-emerald-100", iconBg: "bg-emerald-50", iconClr: "text-emerald-600", typeClr: "text-emerald-600" };
                            return (
                              <div
                                key={lesson.id}
                                className={`border ${accent.ring} rounded-2xl p-3 sm:p-4 bg-white flex items-center justify-between gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className={`w-11 h-11 rounded-xl ${accent.iconBg} flex items-center justify-center shrink-0`}>
                                    <LessonIcon className={`w-5 h-5 ${accent.iconClr}`} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        #{idx + 1}
                                      </span>
                                      <span className={`text-[10px] font-bold uppercase tracking-wider ${accent.typeClr}`}>
                                        {lesson.type}
                                      </span>
                                    </div>
                                    <p className="font-semibold text-slate-900 truncate text-sm sm:text-base">
                                      {lesson.title}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {lesson.type === "LIVE" && (
                                    <button
                                      onClick={() =>
                                        joinLiveLesson({
                                          lessonId: lesson.id,
                                          lessonTitle: lesson.title,
                                          jitsiRoomName: e.stream.id,
                                          streamName: e.stream.name,
                                        })
                                      }
                                      className="flex items-center gap-1.5 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800 text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 min-h-11 rounded-xl transition-all shadow-sm shadow-red-500/30"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                      Войти
                                    </button>
                                  )}
                                  {lesson.type === "TEXT" && (
                                    <button
                                      onClick={() => router.push(`/lesson/${lesson.id}`)}
                                      className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 text-xs sm:text-sm font-bold px-3.5 sm:px-4 min-h-11 rounded-xl transition-all border border-emerald-200"
                                    >
                                      Открыть
                                    </button>
                                  )}
                                  {lesson.type === "VIDEO" && lesson.content && (
                                    <a
                                      href={lesson.content}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 text-violet-700 text-xs sm:text-sm font-bold px-3.5 sm:px-4 min-h-11 rounded-xl transition-all border border-violet-200"
                                    >
                                      Смотреть
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Homework Tab ─────────────────────────────────────────── */}
          {activeTab === "homework" && (
            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="mb-5 pb-4 border-b border-slate-200 sm:mb-8 sm:pb-6">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600" />
                  <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    Домашние задания
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">
                  Задания по всем вашим потокам
                </p>
              </div>

              {homeworkAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-5 shadow-sm">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">Заданий пока нет</h3>
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    Как только преподаватель добавит задание — оно появится здесь
                  </p>
                </div>
              ) : (
                <div className="space-y-8" data-onboarding="homework-section">
                  {/* Group by stream */}
                  {enrollments.map((e) => {
                    const streamAssignments = homeworkAssignments.filter(
                      (a) => a.streamId === e.stream.id,
                    );
                    if (streamAssignments.length === 0) return null;
                    return (
                      <div key={e.enrollmentId}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                            Поток
                          </span>
                          <h3 className="text-base font-bold text-slate-800">
                            {e.stream.name}
                          </h3>
                          <span className="text-xs text-slate-400 font-medium">
                            · {e.stream.courseName}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {streamAssignments.map((a) => (
                            <HomeworkCard
                              key={a.id}
                              assignment={a}
                              onRefresh={() => router.refresh()}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Quiz Results Tab ─────────────────────────────────────── */}
          {activeTab === "results" && (
            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="mb-5 pb-4 border-b border-slate-200 sm:mb-8 sm:pb-6">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600" />
                  <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">Мои тесты</h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">
                  История результатов по квизам и тестам
                </p>
              </div>

              {quizResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-5 shadow-sm">
                    <FlaskConical className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1.5">Тестов пока нет</h3>
                  <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                    Результаты появятся после прохождения тестов на уроках
                  </p>
                </div>
              ) : (
                <div className="space-y-10">
                  {Object.values(quizResultsByLesson).map((group) => (
                    <div key={group.lessonId}>
                      <div className="flex items-center gap-3 mb-5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">
                          Урок
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">{group.lessonTitle}</h3>
                        <span className="text-sm text-slate-500">· {group.results.length} тест(а)</span>
                      </div>
                      <div className="space-y-3">
                        {group.results.map((qr) => (
                            <div
                              key={qr.id}
                              className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:shadow-md transition-all"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-3 mb-2">
                                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                    {qr.quiz.type === "VOICE" ? (
                                      <Video className="w-5 h-5 text-blue-600" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-blue-600" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900 truncate">{qr.quiz.title}</p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                      <span className="text-xs text-slate-500">
                                        {qr.quiz.type === "VOICE" ? "Голосовой" : "Тест с выбором"}
                                      </span>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Сдано{" "}
                                        {new Date(qr.createdAt).toLocaleDateString("ru-RU", {
                                          day: "numeric",
                                          month: "short",
                                        })}
                                      </span>
                                      {qr.checkedAt && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Проверено{" "}
                                            {new Date(qr.checkedAt).toLocaleDateString("ru-RU", {
                                              day: "numeric",
                                              month: "short",
                                            })}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`self-start sm:self-center shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${quizStatusColor[qr.status]}`}
                              >
                                <QuizStatusIcon status={qr.status} className="w-4 h-4" />
                                {quizStatusLabel[qr.status]}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Progress Tab ─────────────────────────────────────────── */}
          {activeTab === "progress" && (
            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="mb-5 pb-4 border-b border-slate-200 sm:mb-8 sm:pb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600" />
                  <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">Мой прогресс</h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">
                  Отслеживайте свою успеваемость и достижения
                </p>
              </div>
              <div data-onboarding="progress-section">
                <StudentProgressDashboard />
              </div>
            </div>
          )}

          {/* ── Schedule Tab ─────────────────────────────────────────── */}
          {activeTab === "schedule" && (
            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="mb-5 pb-4 border-b border-slate-200 sm:mb-8 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600" />
                  <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">Расписание</h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">
                  Расписание занятий по вашим потокам
                </p>
              </div>

              {(() => {
                const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE");
                const todayDow = (new Date().getDay() + 6) % 7; // 0=Пн

                // Build per-day slot list: day → array of {streamName, teacherName, startMinutes, durationMinutes}
                type SlotEntry = { streamName: string; teacherName: string; startMinutes: number; durationMinutes: number };
                const byDay: SlotEntry[][] = Array.from({ length: 7 }, () => []);

                for (const e of activeEnrollments) {
                  for (const s of e.stream.scheduleSlots) {
                    byDay[s.dayOfWeek].push({
                      streamName: e.stream.name,
                      teacherName: e.stream.teacherName,
                      startMinutes: s.startMinutes,
                      durationMinutes: s.durationMinutes,
                    });
                  }
                }
                // Sort slots within each day by start time
                for (const day of byDay) day.sort((a, b) => a.startMinutes - b.startMinutes);

                const hasAnySlots = byDay.some((d) => d.length > 0);

                if (activeEnrollments.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-5 shadow-sm">
                        <Calendar className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1.5">Нет активных записей</h3>
                      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                        Запишитесь на курс, чтобы увидеть расписание занятий
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Weekly grid */}
                    {hasAnySlots ? (
                      <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto">
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 min-w-[560px] sm:min-w-0">
                          {DAY_NAMES.map((day, idx) => (
                            <div key={day} className="flex flex-col gap-1.5">
                              <div className={`text-center text-xs font-bold py-2 rounded-xl ${
                                idx === todayDow
                                  ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20"
                                  : "bg-slate-100 text-slate-500"
                              }`}>
                                {day}
                              </div>
                              {byDay[idx].length === 0 ? (
                                <div className="h-14 rounded-xl border border-dashed border-slate-200" />
                              ) : (
                                byDay[idx].map((slot, si) => (
                                  <div
                                    key={si}
                                    className={`rounded-xl p-1.5 text-center border ${
                                      idx === todayDow
                                        ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300"
                                        : "bg-white border-slate-200"
                                    }`}
                                  >
                                    <p className={`text-xs font-bold leading-tight truncate ${idx === todayDow ? "text-emerald-800" : "text-slate-800"}`}>
                                      {formatTime(slot.startMinutes)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">
                                      {slot.durationMinutes} мин
                                    </p>
                                    <p className="text-[10px] font-semibold text-emerald-700 mt-1 truncate">
                                      {slot.streamName}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-amber-50 border border-amber-200 rounded-2xl">
                        <p className="text-sm text-amber-700 font-semibold">Слоты расписания ещё не заданы</p>
                        <p className="text-xs text-amber-600 mt-1">Учитель ещё не настроил точное расписание занятий</p>
                      </div>
                    )}

                    {/* Stream summary cards */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ваши потоки</p>
                      {activeEnrollments.map((e) => (
                        <div
                          key={e.enrollmentId}
                          className="bg-gradient-to-br from-white to-emerald-50/30 border border-emerald-100 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm"
                        >
                          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg shrink-0 shadow-sm">
                            📅
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{e.stream.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {e.stream.courseName} · {e.stream.schedule}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                              Учитель: <span className="font-semibold text-slate-600">{e.stream.teacherName}</span>
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                            {e.stream.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── Info Tab ─────────────────────────────────────────────── */}
          {activeTab === "info" && (
            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="mb-5 pb-4 border-b border-slate-200 sm:mb-8 sm:pb-6">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600" />
                  <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">Информация</h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">
                  Руководство по работе с платформой
                </p>
              </div>
              <StudentInfoTab />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
