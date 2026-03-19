"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Save, RotateCcw, Eye, EyeOff, GripVertical } from "lucide-react";

type HeroSection = {
  badge: string;
  title: string;
  subtitle: string;
  primaryButton: string;
  primaryButtonLink: string;
};

type AboutSection = {
  title: string;
  description: string[];
};

type PageContent = {
  hero: HeroSection;
  stats: Record<string, unknown>[];
  howItWorks: Record<string, unknown>;
  about: AboutSection;
  cta: Record<string, unknown>;
};

export default function CMSPage() {
  const [content, setContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms/home");
      if (!res.ok) throw new Error("Failed to fetch content");
      const data = await res.json();
      setContent(data.sections);
      setHasChanges(false);
    } catch {
      showToast("Ошибка загрузки контента", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const saveContent = async () => {
    if (!content) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: content }),
      });

      if (!res.ok) throw new Error("Failed to save content");

      showToast("Контент успешно сохранен", "success");
      setHasChanges(false);
    } catch {
      showToast("Ошибка сохранения", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetContent = () => {
    if (confirm("Отменить все изменения?")) {
      fetchContent();
    }
  };

  const updateSection = (section: keyof PageContent, data: PageContent[keyof PageContent]) => {
    if (!content) return;
    setContent({ ...content, [section]: data });
    setHasChanges(true);
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-slate-600">Загрузка...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!content) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-red-600">Ошибка загрузки контента</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Редактор главной страницы</h1>
            <p className="text-slate-600 mt-1">Управление контентом главной страницы сайта</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? "Скрыть превью" : "Показать превью"}
            </button>

            {hasChanges && (
              <button
                onClick={resetContent}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Отменить
              </button>
            )}

            <button
              onClick={saveContent}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <GripVertical className="w-5 h-5 text-slate-400" />
            Hero Section
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Бейдж</label>
              <input
                type="text"
                value={content.hero.badge}
                onChange={(e) => updateSection("hero", { ...content.hero, badge: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Заголовок</label>
              <input
                type="text"
                value={content.hero.title}
                onChange={(e) => updateSection("hero", { ...content.hero, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Подзаголовок</label>
              <textarea
                value={content.hero.subtitle}
                onChange={(e) => updateSection("hero", { ...content.hero, subtitle: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Текст кнопки 1</label>
                <input
                  type="text"
                  value={content.hero.primaryButton}
                  onChange={(e) => updateSection("hero", { ...content.hero, primaryButton: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ссылка кнопки 1</label>
                <input
                  type="text"
                  value={content.hero.primaryButtonLink}
                  onChange={(e) => updateSection("hero", { ...content.hero, primaryButtonLink: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <GripVertical className="w-5 h-5 text-slate-400" />
            О платформе
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Заголовок</label>
              <input
                type="text"
                value={content.about.title}
                onChange={(e) => updateSection("about", { ...content.about, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {content.about.description.map((desc: string, index: number) => (
              <div key={index}>
                <label className="block text-sm font-medium text-slate-700 mb-2">Описание {index + 1}</label>
                <textarea
                  value={desc}
                  onChange={(e) => {
                    const newDesc = [...content.about.description];
                    newDesc[index] = e.target.value;
                    updateSection("about", { ...content.about, description: newDesc });
                  }}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>

        {showPreview && (
          <div className="bg-slate-100 rounded-xl p-6 border-2 border-emerald-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Предпросмотр</h3>
            <p className="text-sm text-slate-600">
              Предпросмотр будет доступен после сохранения. Откройте главную страницу в новой вкладке.
            </p>
          </div>
        )}
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
    </AdminLayout>
  );
}
