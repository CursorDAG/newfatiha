"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, FileText, ClipboardCheck, MessageSquare, Megaphone, Info, AlertCircle, Bell } from "lucide-react";
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

export default function NotificationsPageClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        filter === "unread"
          ? "/api/notifications?unreadOnly=true&limit=100"
          : "/api/notifications?limit=100";
      const response = await fetch(url);
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
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const formatTime = (dateString: string) => {
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
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "NEW_LESSON":
        return <BookOpen className="w-6 h-6" />;
      case "HOMEWORK_ASSIGNED":
      case "HOMEWORK_CHECKED":
        return <FileText className="w-6 h-6" />;
      case "QUIZ_CHECKED":
        return <ClipboardCheck className="w-6 h-6" />;
      case "MESSAGE":
        return <MessageSquare className="w-6 h-6" />;
      case "ANNOUNCEMENT":
        return <Megaphone className="w-6 h-6" />;
      default:
        return <Info className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full px-8 py-8">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Уведомления</h1>
          <p className="text-slate-600">
            {unreadCount > 0
              ? `У вас ${unreadCount} непрочитанных уведомлений`
              : "Все уведомления прочитаны"}
          </p>
        </div>

        {/* Фильтры и действия */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "unread"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Непрочитанные {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Прочитать все
              </button>
            )}
          </div>
        </div>

        {/* Список уведомлений */}
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
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {filter === "unread" ? "Нет непрочитанных уведомлений" : "Нет уведомлений"}
            </h3>
            <p className="text-slate-600">
              {filter === "unread"
                ? "Все уведомления прочитаны"
                : "Уведомления появятся здесь"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border transition-all ${
                  !notification.read
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {notification.link ? (
                  <Link
                    href={notification.link}
                    onClick={() => markAsRead(notification.id)}
                    className="block p-6"
                  >
                    <NotificationContent
                      notification={notification}
                      formatTime={formatTime}
                      getNotificationIcon={getNotificationIcon}
                    />
                  </Link>
                ) : (
                  <div
                    onClick={() => markAsRead(notification.id)}
                    className="p-6 cursor-pointer"
                  >
                    <NotificationContent
                      notification={notification}
                      formatTime={formatTime}
                      getNotificationIcon={getNotificationIcon}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationContent({
  notification,
  formatTime,
  getNotificationIcon,
}: {
  notification: Notification;
  formatTime: (date: string) => string;
  getNotificationIcon: (type: string) => React.ReactElement;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={`flex-shrink-0 p-3 rounded-full ${
          !notification.read ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
        }`}
      >
        {getNotificationIcon(notification.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="font-semibold text-slate-900">{notification.title}</h3>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-2" />
          )}
        </div>
        <p className="text-slate-700 mb-2">{notification.message}</p>
        <p className="text-sm text-slate-500">{formatTime(notification.createdAt)}</p>
      </div>
    </div>
  );
}
