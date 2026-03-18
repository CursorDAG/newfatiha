"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import LiveJitsiEmbed from "@/components/student/LiveJitsiEmbed";

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

type TabId = "home" | "lessons" | "homework" | "schedule" | "results";

type ActiveLiveLesson = {
  lessonId: string;
  lessonTitle: string;
  jitsiRoomName: string;
  streamName: string;
} | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

const lessonTypeIcon = (type: string) => {
  if (type === "LIVE") return "🔴";
  if (type === "VIDEO") return "🎬";
  return "📄";
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
  const [text, setText] = useState(assignment.submission?.contentText ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Напишите ответ перед отправкой");
      return;
    }
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
    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-slate-700">
        {assignment.submission ? "Исправить и повторно сдать" : "Сдать задание"}
      </p>
      {assignment.description && (
        <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
          {assignment.description}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-600 font-semibold">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:ring-2 focus:ring-emerald-400 outline-none resize-none h-28 bg-white"
          placeholder="Напишите ваш ответ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
          >
            {loading ? "Отправка..." : "Отправить"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-2.5 rounded-xl transition-all"
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

  return (
    <div
      className={`border rounded-2xl p-4 bg-white space-y-3 ${
        isOverdue ? "border-red-200" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 leading-tight">{assignment.title}</p>
          {assignment.lesson && (
            <p className="text-xs text-slate-500 mt-0.5">
              Урок: {assignment.lesson.title}
            </p>
          )}
          {assignment.dueAt && (
            <p
              className={`text-xs font-semibold mt-1 ${
                isOverdue ? "text-red-600" : "text-slate-500"
              }`}
            >
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
        {/* Status or submit button */}
        {assignment.submission ? (
          <span
            className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${
              submissionStatusColor[assignment.submission.status]
            }`}
          >
            {submissionStatusLabel[assignment.submission.status]}
          </span>
        ) : (
          <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Не сдано
          </span>
        )}
      </div>

      {/* Submitted answer preview */}
      {assignment.submission?.contentText && !formOpen && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs font-bold text-slate-500 mb-1">Ваш ответ:</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">
            {assignment.submission.contentText}
          </p>
        </div>
      )}

      {/* Teacher feedback */}
      {assignment.submission &&
        (assignment.submission.grade !== null ||
          assignment.submission.teacherComment) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-emerald-700">Проверено учителем:</p>
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
  const activitySessionIdRef = useRef<string | undefined>(undefined);

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

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "home", label: "🏠 Главная" },
    { id: "lessons", label: "📖 Мои уроки" },
    { id: "homework", label: "📝 Домашние задания" },
    { id: "results", label: "🧪 Тесты" },
    { id: "schedule", label: "🗓 Расписание" },
  ];

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
    <div className="min-h-screen bg-slate-50 text-slate-800">
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

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <nav className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-1 h-fit">
          {/* User block */}
          <div className="px-4 pb-4 mb-2 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg mb-2">
              {userName.charAt(0).toUpperCase()}
            </div>
            <p className="font-bold text-slate-800 text-sm leading-tight truncate">
              {userName}
            </p>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Студент</p>
          </div>

          {/* Enrolled streams with teacher info */}
          {enrollments.length > 0 && (
            <div className="px-4 py-3 mb-1 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Мои потоки</p>
              <div className="space-y-2">
                {enrollments.map((e) => (
                  <div key={e.enrollmentId} className="text-xs">
                    <p className="font-semibold text-slate-700 truncate">{e.stream.name}</p>
                    <p className="text-slate-400 truncate">👨‍🏫 {e.stream.teacherName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full text-left p-3 px-4 rounded-xl transition-colors font-semibold text-sm flex items-center justify-between ${
                activeTab === t.id
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                  : "text-slate-600 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <span>{t.label}</span>
              {t.id === "homework" && pendingHomeworkCount > 0 && (
                <span className="text-[11px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingHomeworkCount}
                </span>
              )}
              {t.id === "results" && pendingQuizCount > 0 && (
                <span className="text-[11px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingQuizCount}
                </span>
              )}
            </button>
          ))}

          <div className="pt-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left p-3 px-4 rounded-xl transition-colors font-semibold text-sm text-red-500 hover:bg-red-50 border border-transparent"
            >
              → Выйти
            </button>
          </div>
        </nav>

        {/* ── Main content ───────────────────────────────────────────── */}
        <section className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[650px] overflow-hidden flex flex-col">
          {/* ── Home Tab ─────────────────────────────────────────────── */}
          {activeTab === "home" && (
            <div className="p-6 flex-1 space-y-6">
              {/* Welcome */}
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  Добро пожаловать, {userName}!
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date().toLocaleDateString("ru-RU", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-700">
                    {enrollments.filter((e) => e.status === "ACTIVE").length}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 mt-1">Активных потоков</p>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${pendingHomeworkCount > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-3xl font-bold ${pendingHomeworkCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    {pendingHomeworkCount}
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${pendingHomeworkCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    Заданий к сдаче
                  </p>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${pendingQuizCount > 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"}`}>
                  <p className={`text-3xl font-bold ${pendingQuizCount > 0 ? "text-blue-600" : "text-slate-400"}`}>
                    {pendingQuizCount}
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${pendingQuizCount > 0 ? "text-blue-600" : "text-slate-400"}`}>
                    Тестов на проверке
                  </p>
                </div>
              </div>

              {/* Upcoming lessons */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Ближайшие уроки
                </h3>
                {(() => {
                  const upcoming = enrollments
                    .filter((e) => e.status === "ACTIVE")
                    .flatMap((e) =>
                      e.stream.lessons.slice(0, 2).map((l) => ({
                        ...l,
                        streamName: e.stream.name,
                        streamId: e.stream.id,
                      }))
                    )
                    .slice(0, 5);
                  return upcoming.length === 0 ? (
                    <p className="text-sm text-slate-400">Уроков пока нет</p>
                  ) : (
                    <div className="space-y-2">
                      {upcoming.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 bg-white hover:shadow-sm transition-shadow"
                        >
                          <span className="text-xl shrink-0">{lessonTypeIcon(l.type)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 truncate text-sm">{l.title}</p>
                            <p className="text-xs text-slate-400 truncate">{l.streamName}</p>
                          </div>
                          {l.type === "LIVE" && (
                            <button
                              onClick={() =>
                                joinLiveLesson({
                                  lessonId: l.id,
                                  lessonTitle: l.title,
                                  jitsiRoomName: l.streamId,
                                  streamName: l.streamName,
                                })
                              }
                              className="shrink-0 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Войти
                            </button>
                          )}
                          {l.type !== "LIVE" && (
                            <button
                              onClick={() => router.push(`/lesson/${l.id}`)}
                              className="shrink-0 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Открыть
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Recent results */}
              {(quizResults.length > 0 || homeworkAssignments.some((a) => a.submission)) && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Последние результаты
                  </h3>
                  <div className="space-y-2">
                    {quizResults.slice(0, 3).map((qr) => (
                      <div
                        key={qr.id}
                        className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl p-3 bg-white"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{qr.quiz.title}</p>
                          <p className="text-xs text-slate-400">{qr.quiz.lesson.title}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${quizStatusColor[qr.status]}`}>
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
                          className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl p-3 bg-white"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">{a.title}</p>
                            <p className="text-xs text-slate-400">{a.streamName}</p>
                          </div>
                          <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
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
            <div className="p-6 flex-1">
              <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-emerald-900">Мои уроки</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Все уроки ваших потоков
                </p>
              </div>

              {enrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <span className="text-5xl mb-4">📭</span>
                  <p className="font-semibold text-lg">Вы ещё не зачислены ни в один поток</p>
                  <p className="text-sm mt-1">Попросите преподавателя прислать пригласительную ссылку</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {enrollments.map((e) => (
                    <div key={e.enrollmentId}>
                      {/* Stream header */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-lg">
                              {e.stream.name}
                            </h3>
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                statusColor[e.status] ?? "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {statusLabel[e.status] ?? e.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {e.stream.courseName} · {e.stream.level} · {e.stream.schedule}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Учитель: <span className="font-semibold text-slate-600">{e.stream.teacherName}</span>
                          </p>
                        </div>
                      </div>

                      {e.stream.lessons.length === 0 ? (
                        <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center text-slate-400 text-sm">
                          Уроков пока нет
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {e.stream.lessons.map((lesson, idx) => (
                            <div
                              key={lesson.id}
                              className="border border-slate-200 rounded-xl p-4 bg-white flex items-center justify-between gap-4 hover:shadow-sm transition-shadow"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-xl shrink-0">
                                  {lessonTypeIcon(lesson.type)}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-400 mb-0.5">
                                    #{idx + 1} · {lesson.type}
                                  </p>
                                  <p className="font-semibold text-slate-800 truncate">
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
                                    className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    Войти
                                  </button>
                                )}
                                {lesson.type === "TEXT" && (
                                  <button
                                    onClick={() => router.push(`/lesson/${lesson.id}`)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                                  >
                                    Открыть
                                  </button>
                                )}
                                {lesson.type === "VIDEO" && lesson.content && (
                                  <a
                                    href={lesson.content}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors inline-block"
                                  >
                                    Смотреть
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
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
            <div className="p-6 flex-1">
              <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-emerald-900">
                  Домашние задания
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Задания по всем вашим потокам
                </p>
              </div>

              {homeworkAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <span className="text-5xl mb-4">✅</span>
                  <p className="font-semibold text-lg">Заданий пока нет</p>
                  <p className="text-sm mt-1">Преподаватель ещё не добавил домашние задания</p>
                </div>
              ) : (
                <div className="space-y-8">
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
            <div className="p-6 flex-1">
              <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-emerald-900">Мои тесты</h2>
                <p className="text-sm text-slate-500 mt-1">
                  История результатов по квизам и тестам
                </p>
              </div>

              {quizResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <span className="text-5xl mb-4">🧪</span>
                  <p className="font-semibold text-lg">Тестов пока нет</p>
                  <p className="text-sm mt-1">Результаты появятся после прохождения тестов на уроках</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.values(quizResultsByLesson).map((group) => (
                    <div key={group.lessonId}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Урок</span>
                        <h3 className="text-base font-bold text-slate-800">{group.lessonTitle}</h3>
                        <span className="text-xs text-slate-400">· {group.results.length} тест(а)</span>
                      </div>
                      <div className="space-y-2">
                        {group.results.map((qr) => (
                          <div
                            key={qr.id}
                            className="border border-slate-200 rounded-xl p-4 bg-white flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">
                                  {qr.quiz.type === "VOICE" ? "🎤" : "📋"}
                                </span>
                                <p className="font-semibold text-slate-800 truncate">{qr.quiz.title}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400">
                                  {qr.quiz.type === "VOICE" ? "Голосовой" : "Тест с выбором"}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="text-xs text-slate-400">
                                  Сдано{" "}
                                  {new Date(qr.createdAt).toLocaleDateString("ru-RU", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                                {qr.checkedAt && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-xs text-slate-400">
                                      Проверено{" "}
                                      {new Date(qr.checkedAt).toLocaleDateString("ru-RU", {
                                        day: "numeric",
                                        month: "long",
                                      })}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ${quizStatusColor[qr.status]}`}
                            >
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

          {/* ── Schedule Tab ─────────────────────────────────────────── */}
          {activeTab === "schedule" && (
            <div className="p-6 flex-1">
              <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-emerald-900">Расписание</h2>
                <p className="text-sm text-slate-500 mt-1">
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
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <span className="text-5xl mb-4">🗓</span>
                      <p className="font-semibold">Нет активных записей</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Weekly grid */}
                    {hasAnySlots ? (
                      <div className="grid grid-cols-7 gap-2">
                        {DAY_NAMES.map((day, idx) => (
                          <div key={day} className="flex flex-col gap-1.5">
                            <div className={`text-center text-xs font-bold py-1.5 rounded-lg ${
                              idx === todayDow
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {day}
                            </div>
                            {byDay[idx].length === 0 ? (
                              <div className="h-12 rounded-lg border border-dashed border-slate-200" />
                            ) : (
                              byDay[idx].map((slot, si) => (
                                <div
                                  key={si}
                                  className={`rounded-lg p-2 text-center border ${
                                    idx === todayDow
                                      ? "bg-emerald-50 border-emerald-300"
                                      : "bg-white border-slate-200"
                                  }`}
                                >
                                  <p className="text-xs font-bold text-slate-800 leading-tight truncate">
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
                    ) : (
                      <div className="text-center py-6 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm text-amber-700 font-semibold">Слоты расписания ещё не заданы</p>
                        <p className="text-xs text-amber-600 mt-1">Учитель ещё не настроил точное расписание занятий</p>
                      </div>
                    )}

                    {/* Stream summary cards */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ваши потоки</p>
                      {activeEnrollments.map((e) => (
                        <div
                          key={e.enrollmentId}
                          className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4"
                        >
                          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 text-base font-bold border border-emerald-200 shrink-0">
                            📅
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm">{e.stream.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {e.stream.courseName} · {e.stream.schedule}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Учитель: <span className="font-semibold text-slate-600">{e.stream.teacherName}</span>
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
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
        </section>
      </div>
    </div>
  );
}
