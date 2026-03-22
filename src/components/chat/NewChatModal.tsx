"use client";

import React, { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

interface NewChatModalProps {
  onClose: () => void;
  onSelectUser: (userId: string, userName: string) => void;
}

function UserListItem({
  user,
  onSelect,
  getRoleBadge
}: {
  user: User;
  onSelect: () => void;
  getRoleBadge: (role: string) => React.ReactNode;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onSelect}
      className="w-full px-6 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100"
    >
      <div className="flex items-center gap-3">
        {user.avatar && !imageError ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-10 h-10 rounded-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-900 truncate">{user.name}</h3>
            {getRoleBadge(user.role)}
          </div>
          <p className="text-sm text-slate-500 truncate">{user.email}</p>
        </div>
      </div>
    </button>
  );
}

export function NewChatModal({ onClose, onSelectUser }: NewChatModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch(`/api/chat/users?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
        }
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectUser = async (userId: string, userName: string) => {
    try {
      const res = await fetch("/api/chat/create-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: userId }),
      });

      if (res.ok) {
        const data = await res.json();
        onSelectUser(data.roomId, userName);
        onClose();
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      ADMIN: "bg-red-100 text-red-700",
      TEACHER: "bg-blue-100 text-blue-700",
      MODERATOR: "bg-purple-100 text-purple-700",
      STUDENT: "bg-emerald-100 text-emerald-700",
    };
    const labels = {
      ADMIN: "Админ",
      TEACHER: "Учитель",
      MODERATOR: "Модератор",
      STUDENT: "Студент",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${colors[role as keyof typeof colors] || "bg-slate-100 text-slate-700"}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[600px] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Новое сообщение</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-200">
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500">Загрузка...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-slate-500 text-center">
                {search ? "Пользователи не найдены" : "Нет доступных пользователей"}
              </div>
            </div>
          ) : (
            <div>
              {users.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  onSelect={() => handleSelectUser(user.id, user.name)}
                  getRoleBadge={getRoleBadge}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
