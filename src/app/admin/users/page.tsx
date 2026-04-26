"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Filter, AlertCircle, Download } from "lucide-react";
import UserDetailModal from "@/components/admin/UserDetailModal";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  gender: string | null;
  isBlocked: boolean;
  emailVerifiedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleSort = (field: 'name' | 'email' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (roleFilter) params.append("role", roleFilter);
      if (blockedFilter) params.append("isBlocked", blockedFilter);
      params.append("limit", pageSize.toString());
      params.append("offset", ((currentPage - 1) * pageSize).toString());
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

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
  }, [searchQuery, roleFilter, blockedFilter, currentPage, pageSize, sortBy, sortOrder]);

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
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Управление пользователями</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Всего пользователей: {usersTotal}</p>
          </div>

          <a
            href="/api/admin/export?type=users"
            download
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Экспорт в CSV
          </a>
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
                    <th
                      onClick={() => handleSort('name')}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Пользователь
                        {sortBy === 'name' && (
                          <span className="text-emerald-600">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Роль
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Статус
                    </th>
                    <th
                      onClick={() => handleSort('createdAt')}
                      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Дата регистрации
                        {sortBy === 'createdAt' && (
                          <span className="text-emerald-600">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{user.name}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'TEACHER' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'STUDENT' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role === 'ADMIN' ? 'Админ' :
                           user.role === 'TEACHER' ? 'Учитель' :
                           user.role === 'STUDENT' ? 'Студент' :
                           user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isBlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            Заблокирован
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {user.isBlocked ? (
                            <button
                              onClick={() => unblockUser(user.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Разблокировать"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => blockUser(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Заблокировать"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => resetPassword(user.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Сбросить пароль"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {!loading && users.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4 border border-slate-200">
              <div className="text-sm text-slate-600">
                Показано {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, usersTotal)} из {usersTotal}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Первая
                </button>

                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Назад
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(usersTotal / pageSize)) }, (_, i) => {
                    const totalPages = Math.ceil(usersTotal / pageSize);
                    let pageNum;

                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(usersTotal / pageSize), prev + 1))}
                  disabled={currentPage >= Math.ceil(usersTotal / pageSize)}
                  className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Вперёд →
                </button>

                <button
                  onClick={() => setCurrentPage(Math.ceil(usersTotal / pageSize))}
                  disabled={currentPage >= Math.ceil(usersTotal / pageSize)}
                  className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Последняя
                </button>
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="10">10 на странице</option>
                <option value="25">25 на странице</option>
                <option value="50">50 на странице</option>
                <option value="100">100 на странице</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

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
