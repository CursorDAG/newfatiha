"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  BookOpen,
  FileText,
  ClipboardCheck,
  MessageSquare,
  Megaphone,
  Info,
  AlertCircle,
  Bell,
  UserPlus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

type FilterKey = "all" | "unread" | "applications" | "homework" | "chat" | "quiz" | "lessons";

const FILTER_CHIPS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Все" },
  { key: "unread", label: "Непрочитанные" },
  { key: "applications", label: "Заявки" },
  { key: "homework", label: "Домашка" },
  { key: "chat", label: "Чат" },
  { key: "quiz", label: "Тесты" },
  { key: "lessons", label: "Уроки" },
];

const TYPE_TO_FILTER: Record<string, FilterKey> = {
  ENROLLMENT_REQUEST: "applications",
  ENROLLMENT_APPROVED: "applications",
  ENROLLMENT_REJECTED: "applications",
  HOMEWORK_ASSIGNED: "homework",
  HOMEWORK_CHECKED: "homework",
  HOMEWORK_SUBMITTED: "homework",
  MESSAGE: "chat",
  QUIZ_CHECKED: "quiz",
  QUIZ_SUBMITTED: "quiz",
  NEW_LESSON: "lessons",
};

export default function NotificationsPageClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications?limit=100");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch notifications" }));
        throw new Error(errorData.error || "Failed to fetch notifications");
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setError(error instanceof Error ? error.message : "Не удалось загрузить уведомления");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Filter notifications by active chip
  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => TYPE_TO_FILTER[n.type] === filter);
  }, [notifications, filter]);

  // Group consecutive notifications with same type + link, then split by day
  type DayGroup = { label: string; items: Array<Notification | NotificationGroup> };
  type NotificationGroup = {
    kind: "group";
    key: string;
    type: string;
    link?: string;
    items: Notification[];
  };

  const grouped: DayGroup[] = useMemo(() => {
    if (!filtered.length) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86_400_000;

    const dayLabel = (iso: string) => {
      const d = new Date(iso);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      if (dayStart === today) return "Сегодня";
      if (dayStart === yesterday) return "Вчера";
      return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    };

    const days: DayGroup[] = [];
    let currentDay: DayGroup | null = null;
    let currentGroup: NotificationGroup | null = null;

    for (const n of filtered) {
      const label = dayLabel(n.createdAt);
      if (!currentDay || currentDay.label !== label) {
        currentDay = { label, items: [] };
        days.push(currentDay);
        currentGroup = null;
      }

      const groupKey = `${n.type}|${n.link || ""}`;
      if (currentGroup && currentGroup.key === groupKey) {
        currentGroup.items.push(n);
      } else {
        if (currentGroup && currentGroup.items.length >= 3) {
          // keep as group in items
        } else if (currentGroup) {
          // Flatten small groups back to individual items
          const groupIdx = currentDay.items.indexOf(currentGroup);
          if (groupIdx !== -1) {
            currentDay.items.splice(groupIdx, 1, ...currentGroup.items);
          }
        }
        currentGroup = { kind: "group", key: groupKey, type: n.type, link: n.link, items: [n] };
        currentDay.items.push(currentGroup);
      }
    }

    // Final pass: flatten small groups (<3) in the last day
    for (const day of days) {
      const result: Array<Notification | NotificationGroup> = [];
      for (const item of day.items) {
        if ((item as NotificationGroup).kind === "group") {
          const g = item as NotificationGroup;
          if (g.items.length < 3) {
            result.push(...g.items);
          } else {
            result.push(g);
          }
        } else {
          result.push(item);
        }
      }
      day.items = result;
    }

    return days;
  }, [filtered]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredUnreadCount = useMemo(
    () => filtered.filter((n) => !n.read).length,
    [filtered],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-4 sm:px-8 py-4 sm:py-8">
        {/* Фильтры */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap flex-1">
              {FILTER_CHIPS.map((chip) => {
                const isActive = filter === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setFilter(chip.key)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-emerald-50 border-emerald-600 text-emerald-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    {chip.label}
                    {chip.key === "unread" && unreadCount > 0 && (
                      <span className="ml-1.5 text-xs">({unreadCount})</span>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredUnreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="shrink-0 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Прочитать все
              </button>
            )}
          </div>
        </div>

        {/* Список */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-slate-600">Загрузка...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Ошибка загрузки</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={fetchNotifications}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Попробовать снова
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {filter === "unread" ? "Нет непрочитанных уведомлений" : "Нет уведомлений"}
            </h3>
            <p className="text-slate-600">
              {filter === "unread" ? "Все уведомления прочитаны" : "Уведомления появятся здесь"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((day) => (
              <div key={day.label}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {day.label}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="space-y-3">
                  {day.items.map((item) => {
                    if ((item as NotificationGroup).kind === "group") {
                      const g = item as NotificationGroup;
                      const isExpanded = expandedGroups.has(g.key);
                      const unreadInGroup = g.items.filter((x) => !x.read).length;
                      return (
                        <div
                          key={g.key}
                          className="bg-white rounded-lg shadow-sm border border-slate-200"
                        >
                          <button
                            onClick={() => toggleGroup(g.key)}
                            className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-slate-50 transition-colors rounded-lg"
                          >
                            <div
                              className={`flex-shrink-0 p-3 rounded-full ${
                                unreadInGroup > 0
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {getNotificationIcon(g.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900">
                                {groupTitle(g.type, g.items.length)}
                              </p>
                              <p className="text-sm text-slate-500 mt-0.5 truncate">
                                {g.items[0].message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {unreadInGroup > 0 && (
                                <span className="text-xs font-bold bg-emerald-600 text-white rounded-full px-2 py-0.5">
                                  {unreadInGroup}
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="border-t border-slate-100 divide-y divide-slate-100">
                              {g.items.map((n) => (
                                <NotificationRow
                                  key={n.id}
                                  notification={n}
                                  onRead={markAsRead}
                                  compact
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    const n = item as Notification;
                    return (
                      <div
                        key={n.id}
                        className={`bg-white rounded-lg shadow-sm border transition-all ${
                          !n.read
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <NotificationRow notification={n} onRead={markAsRead} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function groupTitle(type: string, count: number): string {
  const word = (n: number, one: string, few: string, many: string) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  };
  switch (type) {
    case "ENROLLMENT_REQUEST":
      return `${count} ${word(count, "новая заявка", "новых заявки", "новых заявок")}`;
    case "HOMEWORK_SUBMITTED":
      return `${count} ${word(count, "сданная работа", "сданных работы", "сданных работ")}`;
    case "HOMEWORK_CHECKED":
      return `${count} ${word(count, "проверенная работа", "проверенных работы", "проверенных работ")}`;
    case "HOMEWORK_ASSIGNED":
      return `${count} ${word(count, "новое задание", "новых задания", "новых заданий")}`;
    case "MESSAGE":
      return `${count} ${word(count, "новое сообщение", "новых сообщения", "новых сообщений")}`;
    case "QUIZ_CHECKED":
      return `${count} ${word(count, "проверенный тест", "проверенных теста", "проверенных тестов")}`;
    case "NEW_LESSON":
      return `${count} ${word(count, "новый урок", "новых урока", "новых уроков")}`;
    default:
      return `${count} уведомлений`;
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "NEW_LESSON":
      return <BookOpen className="w-6 h-6" />;
    case "HOMEWORK_ASSIGNED":
    case "HOMEWORK_CHECKED":
    case "HOMEWORK_SUBMITTED":
      return <FileText className="w-6 h-6" />;
    case "QUIZ_CHECKED":
    case "QUIZ_SUBMITTED":
      return <ClipboardCheck className="w-6 h-6" />;
    case "MESSAGE":
      return <MessageSquare className="w-6 h-6" />;
    case "ANNOUNCEMENT":
      return <Megaphone className="w-6 h-6" />;
    case "ENROLLMENT_REQUEST":
    case "ENROLLMENT_APPROVED":
    case "ENROLLMENT_REJECTED":
      return <UserPlus className="w-6 h-6" />;
    default:
      return <Info className="w-6 h-6" />;
  }
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "только что";
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} д назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function NotificationRow({
  notification,
  onRead,
  compact,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  compact?: boolean;
}) {
  const content = (
    <div className="flex items-start gap-3 sm:gap-4">
      {!compact && (
        <div
          className={`flex-shrink-0 p-3 rounded-full ${
            !notification.read ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
          }`}
        >
          {getNotificationIcon(notification.type)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className={`font-semibold text-slate-900 ${compact ? "text-sm" : ""}`}>
            {notification.title}
          </h3>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2" />
          )}
        </div>
        <p className={`text-slate-700 mb-1 ${compact ? "text-sm" : ""}`}>{notification.message}</p>
        <p className="text-xs text-slate-500">{formatTime(notification.createdAt)}</p>
      </div>
    </div>
  );

  const padding = compact ? "p-4" : "p-4 sm:p-6";

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={() => onRead(notification.id)} className={`block ${padding}`}>
        {content}
      </Link>
    );
  }
  return (
    <div onClick={() => onRead(notification.id)} className={`cursor-pointer ${padding}`}>
      {content}
    </div>
  );
}
