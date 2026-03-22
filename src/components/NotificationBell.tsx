"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { Bell, Volume2, VolumeX } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  priority: string;
  createdAt: string;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Create audio element with fallback
      audioRef.current = new Audio();

      // Try to load notification sound, fallback to system beep if not available
      audioRef.current.src = "/notification-sound.mp3";
      audioRef.current.volume = 0.5;

      // Handle load error silently
      audioRef.current.addEventListener("error", () => {
        console.warn("Notification sound file not found, sound notifications disabled");
        audioRef.current = null;
      });
    }

    // Load sound preference from localStorage
    const savedSoundPref = localStorage.getItem("notificationSound");
    if (savedSoundPref !== null) {
      setSoundEnabled(savedSoundPref === "true");
    }
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Failed to play notification sound:", error);
      });
    }
  }, [soundEnabled]);

  // Загрузить уведомления
  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=10");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  // Загружать при монтировании и каждые 30 секунд
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Socket.io connection for real-time notifications
  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = io({
      auth: {
        token: session.user.id,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected for notifications");
    });

    // Listen for new notifications
    socket.on("notification:receive", (notification: Notification) => {
      console.log("New notification received:", notification);

      // Add to notifications list
      setNotifications((prev) => [notification, ...prev.slice(0, 9)]);

      // Play sound for high priority notifications
      if (notification.priority === "HIGH" || notification.priority === "URGENT") {
        playSound();
      }
    });

    // Listen for unread count updates
    socket.on("notification:unread_count", ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.user?.id, soundEnabled, playSound]);

  // Пометить уведомление как прочитанное
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

        // Also notify via Socket.io for instant update
        if (socketRef.current) {
          socketRef.current.emit("notification:mark_read", { notificationId: id });
        }
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Toggle sound preference
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem("notificationSound", String(newValue));
  };

  // Пометить все как прочитанные
  const markAllAsRead = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Форматировать время
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
    return date.toLocaleDateString("ru-RU");
  };

  return (
    <div className="relative">
      {/* Кнопка колокольчика */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:text-emerald-100 transition-colors"
        aria-label="Уведомления"
      >
        <Bell className="w-6 h-6" />

        {/* Счетчик непрочитанных */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown с уведомлениями */}
      {isOpen && (
        <>
          {/* Overlay для закрытия */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-[600px] flex flex-col">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Уведомления
              </h3>
              <div className="flex items-center gap-2">
                {/* Sound toggle */}
                <button
                  onClick={toggleSound}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  title={soundEnabled ? "Отключить звук" : "Включить звук"}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-slate-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                  >
                    Прочитать все
                  </button>
                )}
              </div>
            </div>

            {/* Список уведомлений */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Нет уведомлений</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      !notification.read ? "bg-emerald-50" : ""
                    }`}
                  >
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => {
                          markAsRead(notification.id);
                          setIsOpen(false);
                        }}
                        className="block"
                      >
                        <NotificationContent
                          notification={notification}
                          formatTime={formatTime}
                        />
                      </Link>
                    ) : (
                      <div
                        onClick={() => markAsRead(notification.id)}
                        className="cursor-pointer"
                      >
                        <NotificationContent
                          notification={notification}
                          formatTime={formatTime}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Футер */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-200 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Показать все уведомления
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Компонент содержимого уведомления
function NotificationContent({
  notification,
  formatTime,
}: {
  notification: Notification;
  formatTime: (date: string) => string;
}) {
  return (
    <>
      <div className="flex items-start justify-between mb-1">
        <h4 className="font-medium text-slate-900 text-sm">
          {notification.title}
        </h4>
        {!notification.read && (
          <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5 ms-2" />
        )}
      </div>
      <p className="text-sm text-slate-600 mb-2">{notification.message}</p>
      <p className="text-xs text-slate-400">
        {formatTime(notification.createdAt)}
      </p>
    </>
  );
}
