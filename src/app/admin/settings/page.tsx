"use client";

import React, { useState, useEffect } from "react";
import { Save, Globe, Mail, Key, Bell, Link as LinkIcon } from "lucide-react";

type Settings = {
  general?: {
    siteName?: string;
    siteDescription?: string;
    contactEmail?: string;
    contactPhone?: string;
    whatsappNumber?: string;
  };
  integrations?: {
    jitsiServer?: string;
    googleAnalyticsId?: string;
    yandexMetrikaId?: string;
  };
  registration?: {
    allowStudentRegistration?: boolean;
    moderateTeacherApplications?: boolean;
    minAge?: number;
  };
  email?: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    fromEmail?: string;
    fromName?: string;
  };
};

type Tab = "general" | "integrations" | "registration" | "email";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      showToast("Ошибка загрузки настроек", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveSetting = async (category: string, key: string, value: unknown) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, key, value }),
      });

      if (!res.ok) throw new Error("Failed to save setting");
      showToast("Настройка сохранена", "success");
    } catch (error) {
      showToast("Ошибка сохранения", "error");
    }
  };

  const updateSetting = (category: Tab, key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const saveCategory = async (category: Tab) => {
    setSaving(true);
    try {
      const categorySettings = settings[category] || {};
      for (const [key, value] of Object.entries(categorySettings)) {
        await saveSetting(category, key, value);
      }
      showToast("Настройки сохранены", "success");
    } catch (error) {
      showToast("Ошибка сохранения", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: "general" as Tab, label: "Общие", icon: Globe },
    { id: "integrations" as Tab, label: "Интеграции", icon: LinkIcon },
    { id: "registration" as Tab, label: "Регистрация", icon: Key },
    { id: "email" as Tab, label: "Email", icon: Mail },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Настройки</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">Конфигурация платформы</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="border-b border-slate-200 px-6">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-emerald-600 text-emerald-600 font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Название сайта</label>
                <input
                  type="text"
                  value={settings.general?.siteName || ""}
                  onChange={(e) => updateSetting("general", "siteName", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Fatiha.ru"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Описание сайта</label>
                <textarea
                  value={settings.general?.siteDescription || ""}
                  onChange={(e) => updateSetting("general", "siteDescription", e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Исламская онлайн-платформа для изучения акыды, фикха, арабского языка и тасфира"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email для связи</label>
                  <input
                    type="email"
                    value={settings.general?.contactEmail || ""}
                    onChange={(e) => updateSetting("general", "contactEmail", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="info@fatiha.ru"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Телефон</label>
                  <input
                    type="tel"
                    value={settings.general?.contactPhone || ""}
                    onChange={(e) => updateSetting("general", "contactPhone", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp номер</label>
                <input
                  type="tel"
                  value={settings.general?.whatsappNumber || ""}
                  onChange={(e) => updateSetting("general", "whatsappNumber", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="+79991234567"
                />
                <p className="text-xs text-slate-500 mt-1">Формат: +79991234567 (без пробелов)</p>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Jitsi Server URL</label>
                <input
                  type="url"
                  value={settings.integrations?.jitsiServer || ""}
                  onChange={(e) => updateSetting("integrations", "jitsiServer", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="https://meet.jit.si"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Google Analytics ID</label>
                <input
                  type="text"
                  value={settings.integrations?.googleAnalyticsId || ""}
                  onChange={(e) => updateSetting("integrations", "googleAnalyticsId", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="G-XXXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Yandex Metrika ID</label>
                <input
                  type="text"
                  value={settings.integrations?.yandexMetrikaId || ""}
                  onChange={(e) => updateSetting("integrations", "yandexMetrikaId", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="12345678"
                />
              </div>
            </div>
          )}

          {/* Registration */}
          {activeTab === "registration" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Разрешить регистрацию студентов</p>
                  <p className="text-sm text-slate-600">Студенты могут самостоятельно создавать аккаунты</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.registration?.allowStudentRegistration ?? true}
                    onChange={(e) => updateSetting("registration", "allowStudentRegistration", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">Модерация заявок учителей</p>
                  <p className="text-sm text-slate-600">Заявки учителей требуют одобрения администратора</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.registration?.moderateTeacherApplications ?? true}
                    onChange={(e) => updateSetting("registration", "moderateTeacherApplications", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Минимальный возраст</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.registration?.minAge || 13}
                  onChange={(e) => updateSetting("registration", "minAge", Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Email */}
          {activeTab === "email" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.email?.smtpHost || ""}
                    onChange={(e) => updateSetting("email", "smtpHost", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SMTP Port</label>
                  <input
                    type="number"
                    value={settings.email?.smtpPort || 587}
                    onChange={(e) => updateSetting("email", "smtpPort", Number(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">SMTP User</label>
                <input
                  type="text"
                  value={settings.email?.smtpUser || ""}
                  onChange={(e) => updateSetting("email", "smtpUser", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="noreply@fatiha.ru"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">From Email</label>
                  <input
                    type="email"
                    value={settings.email?.fromEmail || ""}
                    onChange={(e) => updateSetting("email", "fromEmail", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="noreply@fatiha.ru"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">From Name</label>
                  <input
                    type="text"
                    value={settings.email?.fromName || ""}
                    onChange={(e) => updateSetting("email", "fromName", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Fatiha.ru"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={() => saveCategory(activeTab)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg ${
              toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
