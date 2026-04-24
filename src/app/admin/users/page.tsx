"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, AlertCircle } from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  gender: string;
  isBlocked: boolean;
  createdAt: string;
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [blockedFilter, setBlockedFilter] = useState<string>("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (roleFilter) params.append("role", roleFilter);
      if (blockedFilter) params.append("isBlocked", blockedFilter);
      params.append("limit", "50");

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to fetch users" }));
        throw new Error(errorData.error || "Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data.users || []);
      setUsersTotal(data.total || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Не удалось загрузить пользователей";
      setError(errorMessage);
      showToast("Ошибка загрузки пользователей", "error");
      setUsers([]);
      setUsersTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, blockedFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

      // Show temporary password to admin
      if (data.temporaryPassword) {
        alert(`Пароль успешно сброшен!\n\nВременный пароль: ${data.temporaryPassword}\n\nПароль также отправлен на email пользователя.\n\nСкопируйте пароль и отправьте пользователю, если email не дошел.`);
      }

      showToast(data.message || "Пароль сброшен и отправлен на email", "success");
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
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Управление пользователями</h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Всего пользователей: {usersTotal}</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по email или имени..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
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
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="">Все статусы</option>
              <option value="false">Активные</option>
              <option value="true">Заблокированные</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-600 mt-4">Загрузка...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-red-600 font-medium mb-2">Ошибка загрузки</p>
              <p className="text-slate-600 text-sm mb-4">{error}</p>
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Попробовать снова
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Пользователей не найдено</p>
            </div>
          ) : (
            <>
              {/* Mobile / tablet cards */}
              <div className="lg:hidden divide-y divide-slate-200">
                {users.map((user) => (
                  <div key={user.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      {user.isBlocked ? (
                        <span className="shrink-0 px-2 py-0.5 text-[11px] font-medium bg-red-100 text-red-800 rounded-full">
                          Заблокирован
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 text-[11px] font-medium bg-emerald-100 text-emerald-800 rounded-full">
                          Активен
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full font-medium">{user.role}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {user.isBlocked ? (
                        <button
                          onClick={() => unblockUser(user.id)}
                          className="min-h-9 px-3 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-lg transition-colors"
                        >
                          Разблокировать
                        </button>
                      ) : (
                        <button
                          onClick={() => blockUser(user.id)}
                          className="min-h-9 px-3 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg transition-colors"
                        >
                          Заблокировать
                        </button>
                      )}
                      <button
                        onClick={() => resetPassword(user.id)}
                        className="min-h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition-colors"
                      >
                        Сбросить пароль
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="min-h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
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
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
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
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            Заблокирован
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {user.isBlocked ? (
                          <button
                            onClick={() => unblockUser(user.id)}
                            className="text-green-600 hover:text-green-900 font-medium"
                          >
                            Разблокировать
                          </button>
                        ) : (
                          <button
                            onClick={() => blockUser(user.id)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Заблокировать
                          </button>
                        )}
                        <button
                          onClick={() => resetPassword(user.id)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Сбросить пароль
                        </button>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="text-slate-600 hover:text-slate-900 font-medium"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast notifications */}
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
