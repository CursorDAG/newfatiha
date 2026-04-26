"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, BookOpen, Layers, Video, Activity, TrendingUp, TrendingDown } from "lucide-react";
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
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {activeTab === "dashboard" && (
          <div>
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Метрики системы</h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base">Общая статистика платформы</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
            ) : metrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Пользователи */}
                <div className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-200 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <Users className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-600">Пользователи</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.users.total}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>+12%</span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Студенты</span>
                      <span className="font-medium text-slate-900">{metrics.users.byRole.STUDENT || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Учителя</span>
                      <span className="font-medium text-slate-900">{metrics.users.byRole.TEACHER || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Активных (7д)</span>
                      <span className="font-medium text-emerald-600">{metrics.users.active7days}</span>
                    </div>
                    {metrics.users.blocked > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Заблокировано</span>
                        <span className="font-medium text-red-600">{metrics.users.blocked}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Курсы */}
                <div className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-600">Курсы</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.courses.total}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>+5%</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Активных</span>
                      <span className="font-medium text-blue-600">{metrics.courses.total - metrics.courses.archived}</span>
                    </div>
                  </div>
                </div>

                {/* Потоки */}
                <div className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-purple-200 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Layers className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-600">Потоки</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.streams.total}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-purple-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>+8%</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Активных</span>
                      <span className="font-medium text-purple-600">{metrics.streams.active}</span>
                    </div>
                  </div>
                </div>

                {/* Уроки */}
                <div className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-orange-200 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <Video className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-600">Уроки</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.lessons.total}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-orange-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4" />
                      <span>+15%</span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Live</span>
                      <span className="font-medium text-slate-900">{metrics.lessons.byType.LIVE || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Video</span>
                      <span className="font-medium text-slate-900">{metrics.lessons.byType.VIDEO || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Text</span>
                      <span className="font-medium text-slate-900">{metrics.lessons.byType.TEXT || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Jitsi */}
                <div className="group bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-green-200 transition-all duration-200 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <Activity className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-600">Jitsi сессии</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.jitsi.activeSessions}</p>
                      </div>
                    </div>
                    {metrics.jitsi.activeSessions > 0 && (
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-sm text-slate-600">
                      {metrics.jitsi.activeSessions > 0 ? 'Активных сейчас' : 'Нет активных'}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Пользователи ({usersTotal})
              </h2>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex gap-4">
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
                            <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded">
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
            <h2 className="text-xl font-bold text-slate-900 mb-6">Курсы ({courses.length})</h2>
            {loading ? (
              <p className="text-slate-600">Загрузка...</p>
            ) : (
              <div className="bg-white shadow-sm rounded-xl overflow-hidden">
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
                            <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded">
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
            <h2 className="text-xl font-bold text-slate-900 mb-6">Потоки ({streams.length})</h2>
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
            <h2 className="text-xl font-bold text-slate-900 mb-6">Системные логи</h2>
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
    </>
  );
}
