"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";

type TabId = "dashboard" | "users" | "courses" | "streams" | "logs" | "applications";

type DashboardMetrics = {
  users: {
    total: number;
    byRole: Record<string, number>;
    active7days: number;
    active30days: number;
    blocked: number;
  };
  courses: {
    total: number;
    archived: number;
  };
  streams: {
    total: number;
    active: number;
  };
  lessons: {
    total: number;
    byType: Record<string, number>;
  };
  storage: {
    dbSize: string;
    s3Size: string;
  };
  jitsi: {
    activeSessions: number;
  };
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  gender: string;
  isBlocked: boolean;
  createdAt: string;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  published: boolean;
  createdAt: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    streams: number;
  };
};

type Stream = {
  id: string;
  name: string;
  level: string;
  genderType: string;
  createdAt: string;
  course: {
    id: string;
    title: string;
    teacher: {
      id: string;
      name: string;
      email: string;
    };
  };
  _count: {
    enrollments: number;
  };
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

export default function AdminClient() {
  const [activeTab] = useState<TabId>("dashboard");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [blockedFilter, setBlockedFilter] = useState<string>("");

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to fetch metrics");
      const data = await res.json();
      setMetrics(data);
    } catch {
      showToast("Ошибка загрузки метрик", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (roleFilter) params.append("role", roleFilter);
      if (blockedFilter) params.append("isBlocked", blockedFilter);
      params.append("limit", "50");

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users);
      setUsersTotal(data.total);
    } catch {
      showToast("Ошибка загрузки пользователей", "error");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, blockedFilter]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      setCourses(data.courses);
    } catch {
      showToast("Ошибка загрузки курсов", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/streams");
      if (!res.ok) throw new Error("Failed to fetch streams");
      const data = await res.json();
      setStreams(data.streams);
    } catch {
      showToast("Ошибка загрузки потоков", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchMetrics();
    } else if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "courses") {
      fetchCourses();
    } else if (activeTab === "streams") {
      fetchStreams();
    }
  }, [activeTab, fetchMetrics, fetchUsers, fetchCourses, fetchStreams]);

  const blockUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to block user");
      showToast("Пользователь заблокирован", "success");
      fetchUsers();
    } catch {
      showToast("Ошибка блокировки", "error");
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/unblock`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to unblock user");
      showToast("Пользователь разблокирован", "success");
      fetchUsers();
    } catch {
      showToast("Ошибка разблокировки", "error");
    }
  };

  const resetPassword = async (userId: string) => {
    if (!confirm("Сгенерировать новый временный пароль?")) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reset password");
      const data = await res.json();
      alert(`Временный пароль: ${data.temporaryPassword}\n\nОтправьте его пользователю.`);
      showToast("Пароль сброшен", "success");
    } catch {
      showToast("Ошибка сброса пароля", "error");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Удалить пользователя? Это действие нельзя отменить.")) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      showToast("Пользователь удален", "success");
      fetchUsers();
    } catch {
      showToast("Ошибка удаления", "error");
    }
  };

  const showToast = (message: string, type: Toast["type"]) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {activeTab === "dashboard" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Метрики системы</h2>
            {loading ? (
              <p className="text-slate-600">Загрузка...</p>
            ) : metrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Пользователи</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-emerald-600">{metrics.users.total}</p>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Студенты: {metrics.users.byRole.STUDENT || 0}</p>
                      <p>Учителя: {metrics.users.byRole.TEACHER || 0}</p>
                      <p>Админы: {metrics.users.byRole.ADMIN || 0}</p>
                      <p>Активных (7 дней): {metrics.users.active7days}</p>
                      <p className="text-red-600">Заблокировано: {metrics.users.blocked}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Курсы</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-blue-600">{metrics.courses.total}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Потоки</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-purple-600">{metrics.streams.total}</p>
                    <p className="text-sm text-slate-600">Активных: {metrics.streams.active}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Уроки</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-orange-600">{metrics.lessons.total}</p>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Live: {metrics.lessons.byType.LIVE || 0}</p>
                      <p>Video: {metrics.lessons.byType.VIDEO || 0}</p>
                      <p>Text: {metrics.lessons.byType.TEXT || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Jitsi</h3>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-green-600">{metrics.jitsi.activeSessions}</p>
                    <p className="text-sm text-slate-600">Активных сессий</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Пользователи ({usersTotal})
              </h2>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
              <input
                type="text"
                placeholder="Поиск по email или имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Все роли</option>
                <option value="STUDENT">Студент</option>
                <option value="TEACHER">Учитель</option>
                <option value="ADMIN">Админ</option>
                <option value="MODERATOR">Модератор</option>
              </select>
              <select
                value={blockedFilter}
                onChange={(e) => setBlockedFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="">Все статусы</option>
                <option value="false">Активные</option>
                <option value="true">Заблокированные</option>
              </select>
            </div>

            {loading ? (
              <p className="text-slate-600">Загрузка...</p>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Имя
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Роль
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {user.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isBlocked ? (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                              Заблокирован
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Активен
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          {user.isBlocked ? (
                            <button
                              onClick={() => unblockUser(user.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Разблокировать
                            </button>
                          ) : (
                            <button
                              onClick={() => blockUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Заблокировать
                            </button>
                          )}
                          <button
                            onClick={() => resetPassword(user.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Сбросить пароль
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "courses" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Курсы ({courses.length})</h2>
            {loading ? (
              <p className="text-slate-600">Загрузка...</p>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Название
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Учитель
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Потоков
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Вместимость
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {courses.map((course) => (
                      <tr key={course.id}>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {course.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {course.teacher.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {course._count.streams}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {course.capacity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {course.published ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                              Опубликован
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded">
                              Черновик
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "streams" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Потоки ({streams.length})</h2>
            {loading ? (
              <p className="text-slate-600">Загрузка...</p>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Название
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Курс
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Учитель
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Уровень
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Тип группы
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        Студентов
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {streams.map((stream) => (
                      <tr key={stream.id}>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {stream.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {stream.course.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {stream.course.teacher.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {stream.level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {stream.genderType === "MALE_ONLY" && "♂ Только мужчины"}
                          {stream.genderType === "FEMALE_ONLY" && "♀ Только женщины"}
                          {stream.genderType === "MIXED" && "⚥ Смешанная"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {stream._count.enrollments}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Системные логи</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Логи доступны только в production окружении. В development режиме используйте консоль браузера и терминал сервера.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg ${
              toast.type === "success"
                ? "bg-green-500 text-white"
                : toast.type === "error"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
