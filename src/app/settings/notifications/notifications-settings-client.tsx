"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface NotificationPreferences {
  emailNewLesson: boolean;
  emailHomeworkAssigned: boolean;
  emailHomeworkChecked: boolean;
  emailQuizChecked: boolean;
  emailAnnouncement: boolean;
  emailHomeworkSubmitted: boolean;
  emailQuizSubmitted: boolean;
  emailStudentJoined: boolean;
  emailDigestEnabled: boolean;
  emailDigestTime: number;
  soundEnabled: boolean;
}

export default function NotificationSettingsClient() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load preferences
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/notifications/preferences");
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
      setMessage({ type: "error", text: "Не удалось загрузить настройки" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Настройки сохранены" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Ошибка сохранения" });
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
      setMessage({ type: "error", text: "Не удалось сохранить настройки" });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | number) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  // Convert minutes to HH:MM format
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Convert HH:MM to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, mins] = time.split(":").map(Number);
    return hours * 60 + mins;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Загрузка...</div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-600">Не удалось загрузить настройки</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-emerald-600 hover:text-emerald-700 mb-4 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Настройки уведомлений</h1>
          <p className="text-slate-600 mt-2">Управляйте способами получения уведомлений</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Email Notifications Section */}
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Email уведомления</h2>
            <p className="text-sm text-slate-600 mb-6">
              Выберите, о каких событиях вы хотите получать уведомления на email
            </p>

            <div className="space-y-4">
              <ToggleRow
                label="Новый урок"
                description="Когда преподаватель публикует новый урок"
                checked={preferences.emailNewLesson}
                onChange={(checked) => updatePreference("emailNewLesson", checked)}
              />
              <ToggleRow
                label="Домашнее задание назначено"
                description="Когда вам назначают новое домашнее задание"
                checked={preferences.emailHomeworkAssigned}
                onChange={(checked) => updatePreference("emailHomeworkAssigned", checked)}
              />
              <ToggleRow
                label="Домашнее задание проверено"
                description="Когда преподаватель проверяет ваше домашнее задание"
                checked={preferences.emailHomeworkChecked}
                onChange={(checked) => updatePreference("emailHomeworkChecked", checked)}
              />
              <ToggleRow
                label="Тест проверен"
                description="Когда преподаватель проверяет ваш тест"
                checked={preferences.emailQuizChecked}
                onChange={(checked) => updatePreference("emailQuizChecked", checked)}
              />
              <ToggleRow
                label="Объявления"
                description="Важные объявления от преподавателей"
                checked={preferences.emailAnnouncement}
                onChange={(checked) => updatePreference("emailAnnouncement", checked)}
              />
              <ToggleRow
                label="Студент сдал домашнее задание"
                description="Для преподавателей: когда студент сдает работу"
                checked={preferences.emailHomeworkSubmitted}
                onChange={(checked) => updatePreference("emailHomeworkSubmitted", checked)}
              />
              <ToggleRow
                label="Студент сдал тест"
                description="Для преподавателей: когда студент проходит тест"
                checked={preferences.emailQuizSubmitted}
                onChange={(checked) => updatePreference("emailQuizSubmitted", checked)}
              />
              <ToggleRow
                label="Новый студент присоединился"
                description="Для преподавателей: когда студент присоединяется к потоку"
                checked={preferences.emailStudentJoined}
                onChange={(checked) => updatePreference("emailStudentJoined", checked)}
              />
            </div>
          </div>

          {/* Digest Section */}
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Дайджест уведомлений</h2>
            <p className="text-sm text-slate-600 mb-6">
              Получайте сводку всех уведомлений один раз в день вместо отдельных писем
            </p>

            <div className="space-y-4">
              <ToggleRow
                label="Включить ежедневный дайджест"
                description="Все уведомления будут отправлены одним письмом"
                checked={preferences.emailDigestEnabled}
                onChange={(checked) => updatePreference("emailDigestEnabled", checked)}
              />

              {preferences.emailDigestEnabled && (
                <div className="ml-8 mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Время отправки дайджеста
                  </label>
                  <input
                    type="time"
                    value={minutesToTime(preferences.emailDigestTime)}
                    onChange={(e) => updatePreference("emailDigestTime", timeToMinutes(e.target.value))}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Дайджест будет отправлен в указанное время по вашему часовому поясу
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sound Section */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Звуковые уведомления</h2>
            <p className="text-sm text-slate-600 mb-6">
              Воспроизводить звук при получении важных уведомлений
            </p>

            <ToggleRow
              label="Включить звуковые уведомления"
              description="Звук будет воспроизводиться для срочных и важных уведомлений"
              checked={preferences.soundEnabled}
              onChange={(checked) => updatePreference("soundEnabled", checked)}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Сохранение..." : "Сохранить настройки"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Toggle Row Component
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-slate-900">{label}</h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
          checked ? "bg-emerald-600" : "bg-slate-200"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
