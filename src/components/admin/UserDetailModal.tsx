'use client';

import { X } from 'lucide-react';

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

interface UserDetailModalProps {
  user: User;
  onClose: () => void;
}

export default function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-500 to-teal-600">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                <p className="text-emerald-100">{user.email}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Основная информация */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Основная информация</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500 mb-1">ID</div>
                  <div className="text-sm font-mono text-slate-900 bg-slate-100 px-3 py-2 rounded">
                    {user.id}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500 mb-1">Роль</div>
                  <div>
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
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500 mb-1">Пол</div>
                  <div className="text-sm text-slate-900">
                    {user.gender === 'MALE' ? 'Мужской' :
                     user.gender === 'FEMALE' ? 'Женский' :
                     'Не указан'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500 mb-1">Статус</div>
                  <div>
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
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500 mb-1">Email подтверждён</div>
                  <div className="text-sm text-slate-900">
                    {user.emailVerifiedAt ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Да
                      </span>
                    ) : (
                      <span className="text-slate-500">Нет</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500 mb-1">Дата регистрации</div>
                  <div className="text-sm text-slate-900">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Статистика */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Статистика</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">0</div>
                  <div className="text-sm text-slate-600">Курсов</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">0</div>
                  <div className="text-sm text-slate-600">Уроков</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">0</div>
                  <div className="text-sm text-slate-600">Сообщений</div>
                </div>
              </div>
            </div>

            {/* Последняя активность */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Последняя активность</h3>
              <div className="text-sm text-slate-600">
                Обновлено: {new Date(user.updatedAt).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
