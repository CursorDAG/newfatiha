"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CreateCourseModal from "@/components/CreateCourseModal";
import ScheduleGrid, { type ScheduleSlot, type SlotInput } from "@/components/ScheduleGrid";
import TeacherShell, { type TeacherTabId } from "@/components/teacher/TeacherShell";
import TeacherHeader from "@/components/dashboard/TeacherHeader";
import { Button } from "@/components/teacher/ui/Button";
import EmptyState from "@/components/teacher/ui/EmptyState";
import TeacherStreamsTab from "@/components/teacher/TeacherStreamsTab";
import TeacherLessonsTab from "@/components/teacher/TeacherLessonsTab";
import TeacherStudentsTab from "@/components/teacher/TeacherStudentsTab";
import TeacherLiveTab from "@/components/teacher/TeacherLiveTab";
import TeacherHomeworkTab from "@/components/teacher/TeacherHomeworkTab";
import TeacherApplicationsTab from "@/components/teacher/TeacherApplicationsTab";
import TeacherGradebookTab from "@/components/teacher/TeacherGradebookTab";
import TeacherAnalyticsTab, { type AnalyticsPayload } from "@/components/teacher/TeacherAnalyticsTab";
import TeacherProgressAnalytics from "@/components/teacher/TeacherProgressAnalytics";
import ToastStack, { type ToastItem } from "@/components/teacher/ui/ToastStack";
import ConfirmModal from "@/components/teacher/ui/ConfirmModal";
import ImportLessonsModal from "@/components/teacher/ImportLessonsModal";
import StudentProgressModal from "@/components/teacher/StudentProgressModal";
import LessonLibraryModal from "@/components/teacher/LessonLibraryModal";
import { RecordingUploadModal } from "@/components/teacher/RecordingUploadModal";
import type { StudentProgressPayload } from "@/app/api/teacher/students/[enrollmentId]/progress/route";
import { useAnalytics } from "@/components/teacher/hooks/useAnalytics";
import { useGradebook } from "@/components/teacher/hooks/useGradebook";
import { useHomework } from "@/components/teacher/hooks/useHomework";
import ReactMarkdown from "react-markdown";
import TeacherInfoTab from "@/components/teacher/TeacherInfoTab";

type Course = {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  published: boolean;
  streamCount: number;
  studentCount: number;
  streams?: Array<{
    id: string;
    name: string;
    level: string;
    schedule: string;
    studentCount: number;
  }>;
};

type Enrollment = {
  id: string;
  userId: string;
  status: string;
  name: string;
};

type Stream = {
  id: string;
  name: string;
  level: string;
  schedule: string;
  color?: string;
  courseId?: string;
  genderType?: "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";
  inviteToken?: { token: string } | null;
  enrollments: Enrollment[];
  lessons: Array<{
    id: string;
    title: string;
    type: string;
    content: string | null;
    createdAt: string;
    sortOrder: number;
    teacherNotes?: string | null;
    published: boolean;
  }>;
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        userInfo?: { displayName?: string };
        jwt?: string;
        configOverwrite?: Record<string, unknown>;
        interfaceConfigOverwrite?: Record<string, unknown>;
      }
    ) => { dispose: () => void; executeCommand: (cmd: string) => void };
  }
}

type JitsiCommands = {
  shareScreen: () => void;
  endLesson: () => void;
};

function LiveJitsiRoom({
  streamId,
  jitsiDomain = "meet.jit.si",
  jitsiToken,
  onReady,
}: {
  streamId: string;
  jitsiDomain?: string;
  jitsiToken?: string;
  onReady?: (commands: JitsiCommands) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{ dispose: () => void; executeCommand: (cmd: string) => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAndInit() {
      if (!containerRef.current || !streamId) return;

      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-jitsi-external-api="true"]'
      );

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

      try {
        await ensureScriptLoaded();
        if (cancelled || !window.JitsiMeetExternalAPI || !containerRef.current) return;

        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }

        const options: {
          roomName: string;
          parentNode: HTMLElement;
          jwt?: string;
          configOverwrite?: Record<string, unknown>;
          interfaceConfigOverwrite?: Record<string, unknown>;
        } = {
          roomName: streamId,
          parentNode: containerRef.current,
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

        if (jitsiToken) {
          options.jwt = jitsiToken;
        }

        apiRef.current = new window.JitsiMeetExternalAPI(jitsiDomain, options) as { dispose: () => void; executeCommand: (cmd: string) => void };

        onReady?.({
          shareScreen: () => apiRef.current?.executeCommand("toggleShareScreen"),
          endLesson: () => {
            apiRef.current?.dispose();
            apiRef.current = null;
          },
        });
      } catch (err) {
        // In MVP we silently fail; UI already shows generic loading state in parent.
        console.error("[Jitsi] init error", err);
      }
    }

    loadAndInit();

    return () => {
      cancelled = true;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onReady is a callback prop that doesn't need to trigger re-initialization
  }, [streamId, jitsiDomain, jitsiToken]);

  return <div ref={containerRef} className="w-full h-full" />;
}

// ── Transfer Modal ──────────────────────────────────────────────────────────
function TransferModal({
  student,
  streams,
  currentStreamId,
  onClose,
  onConfirm,
}: {
  student: Enrollment;
  streams: Stream[];
  currentStreamId: string;
  onClose: () => void;
  onConfirm: (targetStreamId: string) => void;
}) {
  const [targetId, setTargetId] = useState('');
  const available = streams.filter((s) => s.id !== currentStreamId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-slate-800 mb-1">Перевести ученика</h3>
        <p className="text-slate-500 text-sm mb-5">
          Выберите поток для перевода <span className="font-semibold text-slate-700">{student.name}</span>
        </p>

        <label className="block text-sm font-semibold text-slate-600 mb-2">Целевой поток</label>
        <select
          className="w-full border border-slate-200 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none mb-4 bg-slate-50"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">— Выберите поток —</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.level})
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            onClick={() => targetId && onConfirm(targetId)}
            disabled={!targetId}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-2.5 rounded-lg font-bold transition-all"
          >
            Перевести
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-bold transition-all"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kick Confirm Dialog ─────────────────────────────────────────────────────
function KickConfirmDialog({
  student,
  onClose,
  onConfirm,
}: {
  student: Enrollment;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Исключить ученика?</h3>
        <p className="text-slate-500 text-sm mb-6">
          Вы уверены, что хотите исключить{' '}
          <span className="font-semibold text-slate-700">{student.name}</span> из этого потока?
          Доступ будет немедленно отозван.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold transition-all"
          >
            Да, исключить
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-bold transition-all"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function TeacherDashboard({
  initialStreams,
  initialCourses,
  jitsiDomain = "meet.jit.si",
  teacherId: _teacherId,
  teacherName: _teacherName,
  teacherEmail: _teacherEmail,
}: {
  initialStreams: Stream[];
  initialCourses: Course[];
  jitsiDomain?: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
}) {
  const router = useRouter();
  const [selectedStreamId, setSelectedStreamId] = useState<string>(initialStreams[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<TeacherTabId>("overview");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [jitsiToken, setJitsiToken] = useState<string | undefined>(undefined);

  const pushToast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...t }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [studentProgressData, setStudentProgressData] = useState<StudentProgressPayload | null>(null);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [recordingUploadState, setRecordingUploadState] = useState<{
    lessonId: string;
    lessonTitle: string;
  } | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [jitsiCommands, setJitsiCommands] = useState<{ shareScreen: () => void; endLesson: () => void } | null>(null);
  // Stable reference — prevents LiveJitsiRoom from seeing a new onReady prop
  // on every dashboard re-render (which would confuse React reconciliation).
  const handleJitsiReady = useCallback(
    (cmds: { shareScreen: () => void; endLesson: () => void }) => setJitsiCommands(cmds),
    [],
  );

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

  // Fetch token when entering live mode
  useEffect(() => {
    if (activeTab === "live" && selectedStreamId) {
      fetchJitsiToken(selectedStreamId).then(setJitsiToken);
    } else {
      setJitsiToken(undefined);
    }
  }, [activeTab, selectedStreamId]);
  const [showCreateQuizForLessonId, setShowCreateQuizForLessonId] = useState<string | null>(null);
  const [quizForm, setQuizForm] = useState({
    title: "Тест по уроку",
    questions: [
      {
        prompt: "",
        type: "MULTIPLE_CHOICE" as "MULTIPLE_CHOICE" | "TEXT" | "VOICE",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
      },
    ],
  });
  const [questionLibraryOpen, setQuestionLibraryOpen] = useState(false);
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionLibraryLoading, setQuestionLibraryLoading] = useState(false);
  const [questionLibrary, setQuestionLibrary] = useState<
    Array<{
      id: string;
      prompt: string;
      quiz: { id: string; title: string; type: string };
      options: Array<{ id: string; text: string; isCorrect: boolean }>;
    }>
  >([]);

  // Modal state
  const [transferTarget, setTransferTarget] = useState<Enrollment | null>(null);
  const [kickTarget, setKickTarget] = useState<Enrollment | null>(null);

  // Lessons create/edit modal state
  const [lessonModalState, setLessonModalState] = useState<{
    mode: "create" | "edit";
    lessonId?: string;
    title: string;
    type: "LIVE" | "VIDEO" | "TEXT";
    content: string;
    teacherNotes: string;
  } | null>(null);

  const selectedStream = initialStreams.find((s) => s.id === selectedStreamId);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourses[0]?.id ?? "");
  React.useEffect(() => {
    if (!selectedCourseId && initialCourses[0]?.id) setSelectedCourseId(initialCourses[0].id);
  }, [initialCourses, selectedCourseId]);

  const [teacherScheduleSlots, setTeacherScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [hoveredScheduleInfo, setHoveredScheduleInfo] = useState<string | null>(null);

  const fetchTeacherSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/teacher/schedule");
      const data = (await res.json()) as { success?: boolean; slots?: ScheduleSlot[]; error?: string };
      if (!res.ok) throw new Error(data?.error ?? "Не удалось загрузить расписание");
      setTeacherScheduleSlots((data.slots ?? []) as ScheduleSlot[]);
    } catch {
      // silent in MVP
      setTeacherScheduleSlots([]);
    }
  }, []);

  React.useEffect(() => {
    fetchTeacherSchedule();
  }, [fetchTeacherSchedule]);

  const [streamModalState, setStreamModalState] = useState<{
    mode: "create" | "edit";
    streamId?: string;
    courseId: string;
    name: string;
    level: string;
    slots: SlotInput[];
    showSchedulePicker: boolean;
    color: string;
    genderType: "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";
  } | null>(null);

  const slotsToScheduleText = useCallback((slots: SlotInput[]) => {
    if (!slots.length) return "Не настроено";
    const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const toTime = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const normalized = [...slots].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinutes - b.startMinutes
    );
    return normalized
      .map(
        (s) =>
          `${dayNames[s.dayOfWeek]} ${toTime(s.startMinutes)}–${toTime(
            s.startMinutes + s.durationMinutes
          )}`
      )
      .join(", ");
  }, []);

  const { analyticsLoading, analyticsError, analyticsData, fetchAnalytics } = useAnalytics<AnalyticsPayload>(selectedStreamId);
  const { gradebookLoading, gradebookError, gradebookData, fetchGradebook } = useGradebook(selectedStreamId);
  const { homeworkLoading, homeworkAssignments, fetchHomework } = useHomework(
    selectedStreamId,
    (msg: string) => pushToast({ type: "error", title: "Ошибка загрузки заданий", message: msg }),
  );

  const checkSubmission = useCallback(
    async (submissionId: string, status: "PASSED" | "FAILED") => {
      setLoading(true);
      try {
        const res = await fetch(`/api/teacher/quiz-submissions/${submissionId}/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка проверки");
        await fetchAnalytics();
      } finally {
        setLoading(false);
      }
    },
    [fetchAnalytics]
  );

  const playVoice = useCallback(async (submissionId: string) => {
    const res = await fetch(`/api/teacher/quiz-submissions/${submissionId}/audio`);
    if (!res.ok) {
      pushToast({ type: "error", title: "Не удалось загрузить аудио" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);
    await audio.play();
  }, [pushToast]);

  const copyTsvToClipboard = useCallback(async () => {
    if (!analyticsData?.students) return;
    const header = ["Ученик", "Статус", "Последний_вход", "Минут_в_кабинете", "Минут_в_LIVE", "Тесты_ожидают", "Тесты_пройдено", "Тесты_не_пройдено"];
    const rows = analyticsData.students.map((s) => [
      s.name,
      s.status,
      s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString("ru-RU") : "",
      String(s.timeSpentMinutes ?? 0),
      String(s.liveMinutes ?? 0),
      String(s.submissions?.pendingCount ?? 0),
      String(s.submissions?.passedCount ?? 0),
      String(s.submissions?.failedCount ?? 0),
    ]);
    const tsv = [header, ...rows].map((r) => r.join("\t")).join("\n");
    await navigator.clipboard.writeText(tsv);
    pushToast({ type: "success", title: "Скопировано", message: "Вставьте в Google Sheets." });
  }, [analyticsData, pushToast]);

  const createQuizForLesson = useCallback(async () => {
    if (!showCreateQuizForLessonId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: showCreateQuizForLessonId,
          title: quizForm.title,
          questions: quizForm.questions.map((q) => ({
            prompt: q.prompt,
            type: q.type,
            options: q.type === "MULTIPLE_CHOICE" ? q.options : undefined,
            correctOptionIndex: q.type === "MULTIPLE_CHOICE" ? q.correctOptionIndex : undefined,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data?.error ?? "Ошибка создания теста");
      pushToast({ type: "success", title: "Тест создан", message: "Студенты увидят его на странице урока." });
      setShowCreateQuizForLessonId(null);
      setQuizForm({
        title: "Тест по уроку",
        questions: [
          {
            prompt: "",
            type: "MULTIPLE_CHOICE",
            options: ["", "", "", ""],
            correctOptionIndex: 0,
          },
        ],
      });
      router.refresh();
    } catch (e: unknown) {
      pushToast({ type: "error", title: "Ошибка создания теста", message: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [quizForm, showCreateQuizForLessonId, pushToast, router]);

  const fetchQuestionLibrary = useCallback(
    async (search?: string) => {
      setQuestionLibraryLoading(true);
      try {
        const url = new URL("/api/teacher/questions/library", window.location.origin);
        if (search) url.searchParams.set("q", search);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка загрузки банка вопросов");
        setQuestionLibrary(data.questions ?? []);
      } catch (e: unknown) {
        pushToast({
          type: "error",
          title: "Ошибка загрузки банка вопросов",
          message: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setQuestionLibraryLoading(false);
      }
    },
    [pushToast],
  );

  React.useEffect(() => {
    if (activeTab === "analytics") fetchAnalytics();
    if (activeTab === "gradebook") fetchGradebook();
    if (activeTab === "homework") fetchHomework();
  }, [activeTab, fetchAnalytics, fetchGradebook, fetchHomework]);

  const callAPI = useCallback(
    async (action: string, payload: Record<string, string>) => {
      setLoading(true);
      try {
        const res = await fetch('/api/teacher/manage-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? 'Error');
        return data;
      } finally {
        setLoading(false);
        // Refresh server component data
        router.refresh();
      }
    },
    [router]
  );

  const handleGenerateInvite = async () => {
    if (!selectedStreamId) return;
    try {
      const data = await callAPI("generateInvite", { streamId: selectedStreamId });
      if (data?.inviteLink) {
        try {
          await navigator.clipboard.writeText(data.inviteLink);
          pushToast({ type: "success", title: "Ссылка приглашения скопирована" });
        } catch {
          pushToast({ type: "info", title: "Ссылка приглашения", message: data.inviteLink });
        }
      }
    } catch (e: unknown) {
      pushToast({
        type: "error",
        title: "Ошибка генерации ссылки",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  };

  /** Generate (or re-generate) invite for a specific stream and copy link to clipboard. */
  const handleCopyInvite = async (streamId: string) => {
    try {
      const data = await callAPI("generateInvite", { streamId });
      if (data?.inviteLink) {
        try {
          await navigator.clipboard.writeText(data.inviteLink);
          pushToast({ type: "success", title: "Ссылка скопирована в буфер" });
        } catch {
          pushToast({ type: "info", title: "Ссылка приглашения", message: data.inviteLink });
        }
      }
    } catch (e: unknown) {
      pushToast({
        type: "error",
        title: "Ошибка генерации ссылки",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  };

  /** Revoke the invite link for a specific stream. */
  const handleRevokeInvite = async (streamId: string) => {
    try {
      await callAPI("revokeInvite", { streamId });
      pushToast({ type: "success", title: "Ссылка приглашения отозвана" });
    } catch (e: unknown) {
      pushToast({
        type: "error",
        title: "Ошибка отзыва ссылки",
        message: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleTransferConfirm = async (targetStreamId: string) => {
    if (!transferTarget) return;
    await callAPI('transferStudent', { enrollmentId: transferTarget.id, targetStreamId });
    setTransferTarget(null);
  };

  const handleKickConfirm = async () => {
    if (!kickTarget) return;
    await callAPI('kickStudent', { enrollmentId: kickTarget.id });
    setKickTarget(null);
  };

  const handleRepeat = async (enrollment: Enrollment) => {
    await callAPI('repeatYear', { enrollmentId: enrollment.id });
  };

  const openCreateLessonModal = () => {
    if (!selectedStreamId) return;
    setLessonModalState({
      mode: "create",
      title: "",
      type: "LIVE",
      content: "",
      teacherNotes: "",
    });
  };

  const openEditLessonModal = (lesson: Stream["lessons"][number]) => {
    setLessonModalState({
      mode: "edit",
      lessonId: lesson.id,
      title: lesson.title,
      type: (lesson.type as "LIVE" | "VIDEO" | "TEXT") ?? "LIVE",
      content: lesson.content ?? "",
      teacherNotes: lesson.teacherNotes ?? "",
    });
  };

  const submitLessonModal = async () => {
    if (!lessonModalState || !selectedStreamId) return;
    const { mode, lessonId, title, type, content, teacherNotes } = lessonModalState;
    if (!title.trim()) {
      pushToast({ type: "info", title: "Введите название урока" });
      return;
    }
    setLoading(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/teacher/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            streamId: selectedStreamId,
            title: title.trim(),
            type,
            content: content.trim() || null,
            teacherNotes: teacherNotes.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка создания урока");
      } else if (mode === "edit" && lessonId) {
        const res = await fetch(`/api/teacher/lessons/${lessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            type,
            content: content.trim() || null,
            teacherNotes: teacherNotes.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка обновления урока");
      }
      setLessonModalState(null);
      router.refresh();
    } catch (e: unknown) {
      pushToast({
        type: "error",
        title: "Ошибка сохранения урока",
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateStreamModal = (forCourseId?: string) => {
    const courseId = forCourseId ?? selectedCourseId;
    if (!courseId) {
      pushToast({ type: "info", title: "Сначала создайте курс" });
      return;
    }
    if (forCourseId) setSelectedCourseId(forCourseId);
    setStreamModalState({
      mode: "create",
      courseId,
      name: "",
      level: "",
      slots: [],
      showSchedulePicker: true,
      color: "",
      genderType: "MIXED",
    });
  };

  const openEditStreamModal = async (stream: {
    id: string;
    name: string;
    level: string;
    schedule: string;
    color?: string;
    courseId?: string;
    genderType?: "MALE_ONLY" | "FEMALE_ONLY" | "MIXED";
  }) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/schedule?streamId=${encodeURIComponent(stream.id)}`);
      const data = (await res.json()) as {
        success?: boolean;
        slots?: Array<{ dayOfWeek: number; startMinutes: number; durationMinutes: number }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data?.error ?? "Не удалось загрузить слоты потока");
      const slots: SlotInput[] = (data.slots ?? []).map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startMinutes: s.startMinutes,
        durationMinutes: s.durationMinutes,
      }));
      setStreamModalState({
        mode: "edit",
        streamId: stream.id,
        courseId: stream.courseId ?? selectedCourseId,
        name: stream.name,
        level: stream.level,
        slots,
        showSchedulePicker: false,
        color: stream.color ?? "",
        genderType: stream.genderType ?? "MIXED",
      });
    } catch (e: unknown) {
      pushToast({
        type: "error",
        title: "Не удалось загрузить слоты потока",
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const submitStreamModal = async () => {
    if (!streamModalState) return;
    const { mode, streamId, courseId, name, level, slots, color, genderType } = streamModalState;
    if (!courseId) {
      pushToast({ type: "info", title: "Выберите курс" });
      return;
    }
    if (!name.trim() || !level.trim()) {
      pushToast({ type: "info", title: "Заполните название и уровень" });
      return;
    }
    if (!slots.length) {
      pushToast({ type: "info", title: "Настройте расписание", message: "Выберите хотя бы один слот." });
      return;
    }

    setLoading(true);
    try {
      if (mode === "create") {
        const res = await fetch("/api/teacher/streams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            name: name.trim(),
            level: level.trim(),
            scheduleText: "",
            slots,
            color: color.trim() || undefined,
            genderType,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка создания потока");
      } else if (mode === "edit" && streamId) {
        const res = await fetch(`/api/teacher/streams/${streamId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            name: name.trim(),
            level: level.trim(),
            scheduleText: "",
            slots,
            color: color.trim() || undefined,
            genderType,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка обновления потока");
      }
      setStreamModalState(null);
      await fetchTeacherSchedule();
      router.refresh();
    } catch (e: unknown) {
      pushToast({
        type: "error",
        title: "Ошибка сохранения потока",
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = (course: Course) => {
    setConfirmState({
      title: "Удалить курс?",
      message: course.studentCount > 0
        ? `Нельзя удалить курс, пока есть активные студенты (${course.studentCount}). Исключите всех учеников из потоков курса.`
        : `Курс «${course.title}» и все его потоки будут удалены безвозвратно.`,
      danger: true,
      confirmText: "Удалить",
      onConfirm: async () => {
        if (course.studentCount > 0) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/teacher/courses/${course.id}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error ?? "Ошибка удаления курса");
          pushToast({ type: "success", title: "Курс удалён" });
          router.refresh();
        } catch (e: unknown) {
          pushToast({ type: "error", title: "Ошибка удаления курса", message: e instanceof Error ? e.message : undefined });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const deleteStream = async (streamId: string) => {
    setConfirmState({
      title: "Удалить поток?",
      message: "Можно удалить только пустой поток (без учеников и уроков).",
      danger: true,
      confirmText: "Удалить",
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/teacher/streams/${streamId}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error ?? "Ошибка удаления потока");
          pushToast({ type: "success", title: "Поток удалён" });
          router.refresh();
        } catch (e: unknown) {
          pushToast({
            type: "error",
            title: "Ошибка удаления потока",
            message: e instanceof Error ? e.message : undefined,
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className="font-sans">
      <TeacherHeader teacherName={_teacherName} teacherEmail={_teacherEmail} />
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          danger={confirmState.danger}
          confirmText={confirmState.confirmText}
          onClose={() => setConfirmState(null)}
          onConfirm={() => {
            const fn = confirmState.onConfirm;
            setConfirmState(null);
            fn();
          }}
        />
      )}
      {importModalOpen && (
        <ImportLessonsModal
          streams={initialStreams.map((s) => ({
            id: s.id,
            name: s.name,
            level: s.level,
            lessons: s.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              type: l.type,
              sortOrder: l.sortOrder,
            })),
          }))}
          currentStreamId={selectedStreamId}
          onClose={() => setImportModalOpen(false)}
          onConfirm={async (fromStreamId, lessonIds) => {
            setImportModalOpen(false);
            setLoading(true);
            try {
              const res = await fetch("/api/teacher/lessons/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fromStreamId,
                  toStreamId: selectedStreamId,
                  lessonIds,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error ?? "Ошибка импорта");
              pushToast({
                type: "success",
                title: "Импорт завершён",
                message: `Уроков: ${data.createdLessons}, тестов: ${data.createdQuizzes}`,
              });
              router.refresh();
            } catch (e: unknown) {
              pushToast({
                type: "error",
                title: "Ошибка импорта",
                message: e instanceof Error ? e.message : undefined,
              });
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      {studentProgressData && (
        <StudentProgressModal
          data={studentProgressData}
          onClose={() => setStudentProgressData(null)}
        />
      )}

      {recordingUploadState && (
        <RecordingUploadModal
          lessonId={recordingUploadState.lessonId}
          lessonTitle={recordingUploadState.lessonTitle}
          onClose={() => setRecordingUploadState(null)}
          onSuccess={() => {
            setRecordingUploadState(null);
            pushToast({
              type: "success",
              title: "Запись загружена",
              message: "Студенты смогут просмотреть запись урока",
            });
            router.refresh();
          }}
        />
      )}

      {libraryModalOpen && selectedStreamId && (
        <LessonLibraryModal
          streamId={selectedStreamId}
          onClose={() => setLibraryModalOpen(false)}
          onAdded={() => {
            setLibraryModalOpen(false);
            router.refresh();
            pushToast({ type: "success", title: "Урок из библиотеки добавлен" });
          }}
        />
      )}

      {/* Modals */}
      {showCourseModal && (
        <CreateCourseModal
          onClose={() => setShowCourseModal(false)}
          onCreated={() => {
            setShowCourseModal(false);
            router.refresh();
          }}
        />
      )}
      {editingCourse && (
        <CreateCourseModal
          courseId={editingCourse.id}
          initialValues={{
            title: editingCourse.title,
            description: editingCourse.description ?? "",
            capacity: editingCourse.capacity,
            published: editingCourse.published,
          }}
          onClose={() => setEditingCourse(null)}
          onCreated={() => {
            setEditingCourse(null);
            router.refresh();
          }}
        />
      )}
      {transferTarget && (
        <TransferModal
          student={transferTarget}
          streams={initialStreams}
          currentStreamId={selectedStreamId}
          onClose={() => setTransferTarget(null)}
          onConfirm={handleTransferConfirm}
        />
      )}
      {kickTarget && (
        <KickConfirmDialog
          student={kickTarget}
          onClose={() => setKickTarget(null)}
          onConfirm={handleKickConfirm}
        />
      )}
      {lessonModalState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-6 text-white">
              <h2 className="text-2xl font-bold">
                {lessonModalState.mode === "create" ? "Новый урок" : "Редактировать урок"}
              </h2>
              <p className="text-emerald-200 text-sm mt-1">
                {lessonModalState.mode === "create"
                  ? "Урок будет добавлен в выбранный поток"
                  : "Изменения применятся к существующему уроку"}
              </p>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Название урока</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                  placeholder="Введите название"
                  value={lessonModalState.title}
                  onChange={(e) =>
                    setLessonModalState((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Тип урока</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                  value={lessonModalState.type}
                  onChange={(e) =>
                    setLessonModalState((prev) =>
                      prev ? { ...prev, type: e.target.value as "LIVE" | "VIDEO" | "TEXT" } : prev
                    )
                  }
                >
                  <option value="LIVE">LIVE — прямой эфир (Jitsi)</option>
                  <option value="TEXT">TEXT — текстовый урок (Markdown)</option>
                  <option value="VIDEO">VIDEO — видеоурок (ссылка)</option>
                </select>
              </div>
              {lessonModalState.type === "TEXT" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-bold text-slate-700">Содержимое (Markdown)</label>
                    <span className="text-xs text-slate-400 font-medium">Поддерживается Markdown-разметка</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1.5">Редактор</p>
                      <textarea
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white resize-none font-mono text-sm"
                        rows={16}
                        placeholder={"# Заголовок урока\n\nТекст урока с **жирным**, *курсивом*.\n\n- Пункт списка\n- Ещё пункт\n\n> Цитата из источника"}
                        value={lessonModalState.content}
                        onChange={(e) =>
                          setLessonModalState((prev) => (prev ? { ...prev, content: e.target.value } : prev))
                        }
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1.5">Предпросмотр</p>
                      <div className="border border-slate-200 rounded-xl px-4 py-3 bg-white min-h-[300px] overflow-y-auto text-slate-800 text-sm
                        [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-slate-900
                        [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-slate-800
                        [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-3
                        [&_p]:mb-3 [&_p]:leading-relaxed
                        [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1
                        [&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1
                        [&_strong]:font-bold [&_em]:italic
                        [&_code]:bg-slate-100 [&_code]:text-emerald-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                        [&_pre]:bg-slate-100 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:mb-3 [&_pre]:overflow-x-auto
                        [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-400 [&_blockquote]:pl-3 [&_blockquote]:text-slate-600 [&_blockquote]:italic [&_blockquote]:mb-3
                        [&_hr]:border-slate-200 [&_hr]:my-4
                        [&_a]:text-emerald-600 [&_a]:underline
                      ">
                        {lessonModalState.content ? (
                          <ReactMarkdown>{lessonModalState.content}</ReactMarkdown>
                        ) : (
                          <p className="text-slate-400 italic">Введите текст слева для предпросмотра...</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {lessonModalState.type === "VIDEO" && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Ссылка на видео</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                    placeholder="https://youtube.com/..."
                    value={lessonModalState.content}
                    onChange={(e) =>
                      setLessonModalState((prev) => (prev ? { ...prev, content: e.target.value } : prev))
                    }
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Заметки для учителя
                  <span className="text-slate-400 font-normal ml-1">(не видны студентам)</span>
                </label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white resize-none"
                  rows={3}
                  placeholder="Личные заметки по уроку, план занятия..."
                  value={lessonModalState.teacherNotes}
                  onChange={(e) =>
                    setLessonModalState((prev) => (prev ? { ...prev, teacherNotes: e.target.value } : prev))
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={submitLessonModal}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-sm"
                >
                  {loading ? "Сохранение..." : lessonModalState.mode === "create" ? "Создать урок" : "Сохранить"}
                </button>
                <button
                  onClick={() => setLessonModalState(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {streamModalState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-6 text-white">
              <h2 className="text-2xl font-bold">
                {streamModalState.mode === "create" ? "Новый поток" : "Редактирование потока"}
              </h2>
              <p className="text-emerald-200 text-sm mt-1">Поток внутри курса (уровень и расписание)</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Курс</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                  value={streamModalState.courseId}
                  onChange={(e) =>
                    setStreamModalState((prev) => (prev ? { ...prev, courseId: e.target.value } : prev))
                  }
                >
                  {initialCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Название потока</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                  value={streamModalState.name}
                  onChange={(e) =>
                    setStreamModalState((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Уровень</label>
                  <input
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                    value={streamModalState.level}
                    onChange={(e) =>
                      setStreamModalState((prev) => (prev ? { ...prev, level: e.target.value } : prev))
                    }
                    placeholder="Beginner / Intermediate / Advanced"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Цвет группы</label>
                  <div className="flex gap-3 items-center">
                    {/* Круглый цветовой пикер — нативный input скрыт, поверх кружок */}
                    <label className="relative cursor-pointer shrink-0" title="Выберите цвет группы">
                      <span
                        className="block w-11 h-11 rounded-full border-2 border-white shadow-md ring-2 ring-slate-200 hover:ring-emerald-400 transition-all"
                        style={{ backgroundColor: streamModalState.color || "#10b981" }}
                      />
                      <input
                        type="color"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        value={streamModalState.color || "#10b981"}
                        onChange={(e) =>
                          setStreamModalState((prev) => (prev ? { ...prev, color: e.target.value } : prev))
                        }
                      />
                    </label>
                    <input
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white font-mono text-sm"
                      value={streamModalState.color}
                      onChange={(e) =>
                        setStreamModalState((prev) => (prev ? { ...prev, color: e.target.value } : prev))
                      }
                      placeholder="#RRGGBB"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Тип группы</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                    value={streamModalState.genderType}
                    onChange={(e) =>
                      setStreamModalState((prev) => (prev ? { ...prev, genderType: e.target.value as "MALE_ONLY" | "FEMALE_ONLY" | "MIXED" } : prev))
                    }
                  >
                    <option value="MIXED">⚥ Смешанная группа</option>
                    <option value="MALE_ONLY">♂ Только мужчины</option>
                    <option value="FEMALE_ONLY">♀ Только женщины</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Расписание</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setStreamModalState((prev) =>
                          prev ? { ...prev, showSchedulePicker: !prev.showSchedulePicker } : prev
                        )
                      }
                      className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-xl text-xs font-bold w-full text-left"
                    >
                      {slotsToScheduleText(streamModalState.slots)}
                      <span className="block text-[10px] text-slate-500 font-semibold mt-1">
                        Нажмите, чтобы {streamModalState.showSchedulePicker ? "скрыть" : "настроить"} сетку
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {streamModalState.showSchedulePicker && (
                <div className="pt-2">
                  <ScheduleGrid
                    mode="edit"
                    occupiedSlots={teacherScheduleSlots}
                    currentStreamId={streamModalState.streamId ?? ""}
                    selectedSlots={streamModalState.slots}
                    onChangeSelectedSlots={(next) =>
                      setStreamModalState((prev) => (prev ? { ...prev, slots: next } : prev))
                    }
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={submitStreamModal}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all shadow-sm"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setStreamModalState(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TeacherShell
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        loading={loading}
        header={
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-sm font-bold text-slate-700">Поток</div>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-emerald-400 outline-none max-w-[220px]"
                value={selectedStreamId}
                onChange={(e) => setSelectedStreamId(e.target.value)}
              >
                {initialCourses.map((course) => {
                  const courseStreams = initialStreams.filter((s) => s.courseId === course.id);
                  if (!courseStreams.length) return null;
                  return (
                    <optgroup key={course.id} label={course.title}>
                      {courseStreams.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
                {/* Потоки без привязки к курсу */}
                {initialStreams
                  .filter((s) => !s.courseId || !initialCourses.find((c) => c.id === s.courseId))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              {selectedStream && (
                <span className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full inline-flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-slate-200"
                    style={{ backgroundColor: selectedStream.color ?? "#10b981" }}
                  />
                  <span className="text-slate-500 font-semibold">
                    {initialCourses.find((c) => c.id === selectedStream.courseId)?.title ?? ""}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>{selectedStream.level}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">{selectedStream.schedule}</span>
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {selectedStream && (
                <button
                  type="button"
                  onClick={() => setActiveTab("students")}
                  className="text-sm font-semibold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-full transition-colors"
                >
                  {selectedStream.enrollments.filter((e) => e.status === "ACTIVE").length} студентов
                </button>
              )}
              {selectedStream && (
                <Button onClick={openCreateLessonModal} variant="primary">
                  + Урок
                </Button>
              )}
            </div>
          </div>
        }
      >

        {/* ── Overview Tab ─────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="p-8 flex-1">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-emerald-900">Обзор</h2>
                <p className="text-sm text-slate-500 mt-1">Быстрые действия и состояние выбранного потока</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setActiveTab("streams")}>
                  Управлять потоками
                </Button>
              </div>
            </div>

            {!selectedStream ? (
              <EmptyState icon="📚" title="Нет потоков" description="Создайте поток, чтобы начать обучение." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ученики</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{selectedStream.enrollments.length}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Уроки</p>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{selectedStream.lessons.length}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Расписание</p>
                  <p className="text-sm font-bold text-slate-700 mt-3">{selectedStream.schedule || "Не настроено"}</p>
                </div>
              </div>
            )}
          </div>
        )}


          {/* ── Courses Tab ──────────────────────────────────────────────── */}
          {activeTab === 'courses' && (
            <div className="p-8 flex-1">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-emerald-900">Мои курсы</h2>
                <button
                  onClick={() => setShowCourseModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm"
                >
                  + Создать курс
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {initialCourses.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center h-52 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <span className="text-4xl mb-3">📚</span>
                    <p className="font-semibold">Нет курсов</p>
                    <p className="text-sm mt-1">Нажмите «+ Создать курс», чтобы начать</p>
                  </div>
                ) : (
                  initialCourses.map((course) => (
                    <div key={course.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${course.published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {course.published ? 'Опубликован' : 'Черновик'}
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                          {course.streamCount} {course.streamCount === 1 ? 'поток' : 'потоков'}
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-xl leading-tight mb-2">{course.title}</h3>
                      
                      {course.description && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                          {course.description}
                        </p>
                      )}
                      
                      <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 border border-blue-100">👥</span>
                            {course.studentCount} / {course.capacity}
                          </div>
                          <div className="w-full max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden ml-3">
                            <div
                              className={`h-full ${course.studentCount >= course.capacity ? "bg-red-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(100, Math.max(0, (course.studentCount / course.capacity) * 100))}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingCourse(course)}
                            className="flex-1 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-1.5 transition-all"
                          >
                            ✏️ Редактировать
                          </button>
                          <button
                            onClick={() => deleteCourse(course)}
                            className="flex-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg py-1.5 transition-all"
                          >
                            🗑 Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        {/* ── Streams Tab ──────────────────────────────────────────────── */}
        {activeTab === "streams" && (
          <TeacherStreamsTab
            courses={initialCourses.map((c) => ({ id: c.id, title: c.title }))}
            streams={initialStreams}
            onCreate={() => openCreateStreamModal()}
            onCreateForCourse={(courseId) => openCreateStreamModal(courseId)}
            onEdit={(s) => openEditStreamModal(s)}
            onDelete={deleteStream}
            onCopyInvite={handleCopyInvite}
            onRevokeInvite={handleRevokeInvite}
          />
        )}

          {/* ── Schedule Tab ─────────────────────────────────────────────── */}
          {activeTab === "schedule" && (
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-6 border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-900">Органайзер</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Недельное расписание по всем потокам. Занятые слоты подсвечены.
                  </p>
                  <p className="text-sm font-semibold text-slate-700 mt-2 min-h-[20px]">
                    {hoveredScheduleInfo ? (
                      <span className="text-emerald-700">{hoveredScheduleInfo}</span>
                    ) : (
                      <span className="opacity-0">—</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={fetchTeacherSchedule}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm"
                >
                  Обновить
                </button>
              </div>

              {teacherScheduleSlots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-slate-400 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                  <span className="text-5xl mb-4">🗓</span>
                  <p className="text-lg font-medium">Пока нет занятий в расписании</p>
                  <p className="text-sm mt-1">Откройте «Потоки» → создайте/отредактируйте поток и добавьте слоты</p>
                </div>
              ) : (
                <ScheduleGrid
                  mode="view"
                  occupiedSlots={teacherScheduleSlots}
                  onHoverStream={setHoveredScheduleInfo}
                />
              )}
            </div>
          )}

        {/* ── Students Tab ─────────────────────────────────────────────── */}
        {activeTab === "students" && (
          <TeacherStudentsTab
            stream={selectedStream ? { id: selectedStream.id, name: selectedStream.name, enrollments: selectedStream.enrollments } : null}
            onInvite={handleGenerateInvite}
            onTransfer={(e) => setTransferTarget(e)}
            onRepeat={handleRepeat}
            onKick={(e) => setKickTarget(e)}
          />
        )}

        {/* ── Lessons Tab ──────────────────────────────────────────────── */}
        {activeTab === "lessons" && (
          <TeacherLessonsTab
            hasStream={!!selectedStream}
            streamHasLessons={!!selectedStream && selectedStream.lessons.length > 0}
            lessons={(selectedStream?.lessons ?? [])
              .slice()
              .sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              })}
            onCreateLesson={openCreateLessonModal}
            onImport={() => {
              const other = initialStreams.filter((s) => s.id !== selectedStreamId);
              if (!other.length) {
                pushToast({ type: "info", title: "Нет других потоков для импорта" });
                return;
              }
              setImportModalOpen(true);
            }}
            onLibrary={() => setLibraryModalOpen(true)}
            onOpenLesson={(lessonId) => router.push(`/lesson/${lessonId}`)}
            onEditLesson={(lessonId) => {
              const lesson = selectedStream?.lessons.find((l) => l.id === lessonId);
              if (lesson) openEditLessonModal(lesson);
            }}
            onCreateQuiz={(lessonId) => setShowCreateQuizForLessonId(lessonId)}
            onDeleteLesson={(lessonId) => {
              setConfirmState({
                title: "Удалить урок?",
                message: "Будут удалены связанные тесты. Действие нельзя отменить.",
                danger: true,
                confirmText: "Удалить",
                onConfirm: async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/teacher/lessons/${lessonId}`, { method: "DELETE" });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.error ?? "Ошибка удаления урока");
                    pushToast({ type: "success", title: "Урок удалён" });
                    router.refresh();
                  } catch (e: unknown) {
                    pushToast({
                      type: "error",
                      title: "Ошибка удаления урока",
                      message: e instanceof Error ? e.message : undefined,
                    });
                  } finally {
                    setLoading(false);
                  }
                },
              });
            }}
            onReorder={async (orderedIds) => {
              try {
                const res = await fetch("/api/teacher/lessons", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ streamId: selectedStreamId, lessonIdsInOrder: orderedIds }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error ?? "Ошибка сохранения порядка");
                router.refresh();
              } catch (e: unknown) {
                pushToast({
                  type: "error",
                  title: "Ошибка сохранения порядка уроков",
                  message: e instanceof Error ? e.message : undefined,
                });
              }
            }}
            onTogglePublish={async (lessonId, published) => {
              try {
                const res = await fetch(`/api/teacher/lessons/${lessonId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ published }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error ?? "Ошибка обновления урока");
                pushToast({
                  type: "success",
                  title: published ? "Урок опубликован" : "Урок скрыт от студентов",
                });
                router.refresh();
              } catch (e: unknown) {
                pushToast({
                  type: "error",
                  title: "Ошибка обновления видимости урока",
                  message: e instanceof Error ? e.message : undefined,
                });
              }
            }}
            onUploadRecording={(lessonId) => {
              const lesson = selectedStream?.lessons.find((l) => l.id === lessonId);
              if (lesson) {
                setRecordingUploadState({
                  lessonId: lesson.id,
                  lessonTitle: lesson.title,
                });
              }
            }}
          />
        )}

        {/* ── Analytics Tab ────────────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <TeacherAnalyticsTab
            hasStream={!!selectedStreamId}
            loading={analyticsLoading}
            error={analyticsError}
            data={analyticsData}
            onRefresh={fetchAnalytics}
            onCopyTsv={copyTsvToClipboard}
            onPlayVoice={playVoice}
            onCheckSubmission={checkSubmission}
          />
        )}

        {/* ── Progress Tab ──────────────────────────────────────────────── */}
        {activeTab === "progress" && selectedStreamId && (
          <div className="p-8 flex-1">
            <TeacherProgressAnalytics streamId={selectedStreamId} />
          </div>
        )}

        {/* ── Gradebook Tab ────────────────────────────────────────────── */}
        {activeTab === "gradebook" && (
          <TeacherGradebookTab
            hasStream={!!selectedStreamId}
            loading={gradebookLoading}
            error={gradebookError}
            data={gradebookData}
            onRefresh={fetchGradebook}
            onOpenStudent={(enrollmentId) => {
              void (async () => {
                try {
                  const res = await fetch(`/api/teacher/students/${encodeURIComponent(enrollmentId)}/progress`);
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error ?? "Не удалось загрузить профиль ученика");
                  setStudentProgressData(data as StudentProgressPayload);
                } catch (e) {
                  pushToast({
                    type: "error",
                    title: "Ошибка загрузки профиля ученика",
                    message: e instanceof Error ? e.message : undefined,
                  });
                }
              })();
            }}
          />
        )}

          {showCreateQuizForLessonId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
                <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-6 text-white">
                  <h2 className="text-2xl font-bold">Новый тест</h2>
                  <p className="text-emerald-200 text-sm mt-1">Тест будет виден ученику на странице урока</p>
                </div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Название</label>
                    <input
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                      value={quizForm.title}
                      onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))}
                    />
                  </div>

                  {quizForm.questions.map((question, qIdx) => (
                    <div key={qIdx} className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Вопрос {qIdx + 1}</h3>
                        {quizForm.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuizForm((f) => ({
                                ...f,
                                questions: f.questions.filter((_, i) => i !== qIdx),
                              }));
                            }}
                            className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200"
                          >
                            🗑 Удалить
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">Тип вопроса</label>
                          <select
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-white"
                            value={question.type}
                            onChange={(e) => {
                              const newType = e.target.value as "MULTIPLE_CHOICE" | "TEXT" | "VOICE";
                              setQuizForm((f) => ({
                                ...f,
                                questions: f.questions.map((q, i) =>
                                  i === qIdx ? { ...q, type: newType } : q
                                ),
                              }));
                            }}
                          >
                            <option value="MULTIPLE_CHOICE">Выбор из вариантов</option>
                            <option value="TEXT">Текстовый ответ</option>
                            <option value="VOICE">Голосовой ответ</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">Вопрос/задание</label>
                          <textarea
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-white resize-none h-24"
                            value={question.prompt}
                            onChange={(e) =>
                              setQuizForm((f) => ({
                                ...f,
                                questions: f.questions.map((q, i) =>
                                  i === qIdx ? { ...q, prompt: e.target.value } : q
                                ),
                              }))
                            }
                            placeholder="Введите текст вопроса..."
                          />
                        </div>

                        {question.type === "MULTIPLE_CHOICE" && (
                          <div className="space-y-3">
                            <p className="text-sm font-bold text-slate-700">Варианты ответа</p>
                            {question.options.map((opt, optIdx) => (
                              <div key={optIdx} className="flex gap-2 items-center">
                                <input
                                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-white"
                                  placeholder={`Вариант ${optIdx + 1}`}
                                  value={opt}
                                  onChange={(e) =>
                                    setQuizForm((f) => ({
                                      ...f,
                                      questions: f.questions.map((q, i) =>
                                        i === qIdx
                                          ? {
                                              ...q,
                                              options: q.options.map((v, j) =>
                                                j === optIdx ? e.target.value : v
                                              ),
                                            }
                                          : q
                                      ),
                                    }))
                                  }
                                />
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                  <input
                                    type="radio"
                                    name={`correctOption-${qIdx}`}
                                    checked={question.correctOptionIndex === optIdx}
                                    onChange={() =>
                                      setQuizForm((f) => ({
                                        ...f,
                                        questions: f.questions.map((q, i) =>
                                          i === qIdx ? { ...q, correctOptionIndex: optIdx } : q
                                        ),
                                      }))
                                    }
                                  />
                                  Верный
                                </label>
                              </div>
                            ))}
                            <p className="text-xs text-slate-500">
                              Минимум 2 непустых варианта. Отметьте правильный ответ.
                            </p>
                          </div>
                        )}

                        {question.type === "TEXT" && (
                          <p className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            ℹ️ Студент введёт текстовый ответ. Проверка вручную учителем.
                          </p>
                        )}

                        {question.type === "VOICE" && (
                          <p className="text-sm text-slate-600 bg-purple-50 border border-purple-200 rounded-lg p-3">
                            🎤 Студент запишет голосовой ответ. Проверка вручную учителем.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setQuizForm((f) => ({
                        ...f,
                        questions: [
                          ...f.questions,
                          {
                            prompt: "",
                            type: "MULTIPLE_CHOICE",
                            options: ["", "", "", ""],
                            correctOptionIndex: 0,
                          },
                        ],
                      }));
                    }}
                    className="w-full border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold transition-all"
                  >
                    + Добавить вопрос
                  </button>
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
                  <button
                    onClick={createQuizForLesson}
                    disabled={loading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-sm"
                  >
                    {loading ? "Создание..." : "Создать"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateQuizForLessonId(null);
                      setQuizForm({
                        title: "Тест по уроку",
                        questions: [
                          {
                            prompt: "",
                            type: "MULTIPLE_CHOICE",
                            options: ["", "", "", ""],
                            correctOptionIndex: 0,
                          },
                        ],
                      });
                    }}
                    disabled={loading}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 py-3 rounded-xl font-bold transition-all"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          {questionLibraryOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-6 text-white flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Банк вопросов</h2>
                    <p className="text-emerald-200 text-sm mt-1">
                      Выберите существующий вопрос, чтобы переиспользовать формулировку и варианты.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuestionLibraryOpen(false)}
                    className="text-sm font-bold text-emerald-50 hover:text-white"
                  >
                    Закрыть
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex gap-2 items-center">
                    <input
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50 focus:bg-white"
                      placeholder="Поиск по тексту вопроса"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => fetchQuestionLibrary(questionSearch.trim() || undefined)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                    >
                      Найти
                    </button>
                  </div>

                  {questionLibraryLoading ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
                      Загрузка...
                    </div>
                  ) : questionLibrary.length === 0 ? (
                    <EmptyState
                      icon="🔍"
                      title="Пока нет сохранённых вопросов"
                      description="Создавайте тесты — вопросы будут появляться здесь для переиспользования."
                    />
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto space-y-3">
                      {questionLibrary.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            setQuizForm((prev) => ({
                              ...prev,
                              questions: [
                                {
                                  prompt: q.prompt,
                                  type: "MULTIPLE_CHOICE" as "MULTIPLE_CHOICE" | "TEXT" | "VOICE",
                                  options:
                                    q.options.length >= 2
                                      ? q.options.map((o) => o.text).slice(0, 4)
                                      : ["", "", "", ""],
                                  correctOptionIndex: Math.max(
                                    0,
                                    q.options.findIndex((o) => o.isCorrect),
                                  ),
                                },
                              ],
                            }));
                            setQuestionLibraryOpen(false);
                          }}
                          className="w-full text-left border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-xs font-bold text-slate-500 mb-1">
                            {q.quiz.title} • {q.quiz.type === "VOICE" ? "Голосом" : "Тест"}
                          </p>
                          <p className="font-semibold text-slate-800 mb-2">{q.prompt}</p>
                          {q.options.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {q.options.map((o) => (
                                <span
                                  key={o.id}
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                    o.isCorrect
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {o.text}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


        {/* ── Homework Tab ──────────────────────────────────────────────── */}
        {activeTab === "homework" && (
          <TeacherHomeworkTab
            streamId={selectedStreamId || null}
            loading={homeworkLoading}
            assignments={homeworkAssignments}
            lessons={(selectedStream?.lessons ?? []).map((l) => ({ id: l.id, title: l.title }))}
            onRefresh={fetchHomework}
            onCreateAssignment={async (formData) => {
              const res = await fetch("/api/teacher/homework", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ streamId: selectedStreamId, ...formData }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data?.error ?? "Ошибка создания задания");
              pushToast({ type: "success", title: "Задание создано" });
              fetchHomework();
            }}
            onCheckSubmission={(submissionId, status, teacherComment, grade) => {
              void (async () => {
                setLoading(true);
                try {
                  const res = await fetch(`/api/teacher/homework/submissions/${submissionId}/check`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status, teacherComment: teacherComment || null, grade }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error ?? "Ошибка проверки работы");
                  pushToast({
                    type: "success",
                    title: status === "ACCEPTED" ? "Работа принята" : "Запрошена доработка",
                  });
                  fetchHomework();
                } catch (e: unknown) {
                  pushToast({
                    type: "error",
                    title: "Ошибка проверки работы",
                    message: e instanceof Error ? e.message : undefined,
                  });
                } finally {
                  setLoading(false);
                }
              })();
            }}
          />
        )}

        {/* ── Applications Tab ──────────────────────────────────────────────── */}
        {activeTab === "applications" && <TeacherApplicationsTab />}

        {/* ── Info Tab ──────────────────────────────────────────────── */}
        {activeTab === "info" && <TeacherInfoTab />}
      </TeacherShell>

      {/* ── Live overlay (full-screen, outside shell — same pattern as StudentDashboard) */}
      {activeTab === "live" && (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
          <TeacherLiveTab
            streamName={selectedStream?.name}
            streamId={selectedStream?.id}
            room={
              selectedStream ? (
                <LiveJitsiRoom
                  streamId={selectedStream.id}
                  jitsiDomain={jitsiDomain}
                  jitsiToken={jitsiToken}
                  onReady={handleJitsiReady}
                />
              ) : null
            }
            onShareScreen={jitsiCommands?.shareScreen}
            onEndLesson={jitsiCommands?.endLesson}
            liveLessons={
              selectedStream?.lessons
                ?.filter((l) => l.type === "LIVE")
                .map((l) => ({
                  id: l.id,
                  title: l.title,
                  teacherNotes: l.teacherNotes ?? null,
                })) ?? []
            }
            onExit={() => setActiveTab("overview")}
          />
        </div>
      )}
    </div>
  );
}
