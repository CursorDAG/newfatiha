"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Save, RotateCcw, Eye, EyeOff, GripVertical } from "lucide-react";

type HeroSection = {
  badge: string;
  title: string;
  subtitle: string;
  primaryButton: string;
  primaryButtonLink: string;
  heroImage?: string;
};

type AboutSection = {
  title: string;
  description: string[];
};

type Feature = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

type Testimonial = {
  id: string;
  name: string;
  role: string;
  text: string;
  avatar?: string;
  rating: number;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category?: string;
};

type Banner = {
  id: string;
  text: string;
  link?: string;
  color: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
};

type SEOSettings = {
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
};

type PageContent = {
  hero: HeroSection;
  stats: Record<string, unknown>[];
  howItWorks: Record<string, unknown>;
  about: AboutSection;
  features?: Feature[];
  testimonials?: Testimonial[];
  faq?: FAQItem[];
  banners?: Banner[];
  seo?: SEOSettings;
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
      <div className="p-8">
        <p className="text-slate-600">Загрузка...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-8">
        <p className="text-red-600">Ошибка загрузки контента</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Редактор главной страницы</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Управление контентом главной страницы сайта</p>
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
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Features Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-slate-400" />
              Преимущества
            </h2>
            <button
              onClick={() => {
                const newFeature: Feature = {
                  id: Date.now().toString(),
                  icon: "⭐",
                  title: "Новое преимущество",
                  description: "Описание преимущества"
                };
                updateSection("features", [...(content.features || []), newFeature]);
              }}
              className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              + Добавить преимущество
            </button>
          </div>

          <div className="space-y-4">
            {(content.features || []).map((feature: Feature, index: number) => (
              <div key={feature.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">Преимущество {index + 1}</span>
                  <button
                    onClick={() => {
                      const newFeatures = content.features?.filter(f => f.id !== feature.id) || [];
                      updateSection("features", newFeatures);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Удалить
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Иконка (emoji)</label>
                    <input
                      type="text"
                      value={feature.icon}
                      onChange={(e) => {
                        const newFeatures = content.features?.map(f =>
                          f.id === feature.id ? { ...f, icon: e.target.value } : f
                        ) || [];
                        updateSection("features", newFeatures);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="⭐"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Заголовок</label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => {
                        const newFeatures = content.features?.map(f =>
                          f.id === feature.id ? { ...f, title: e.target.value } : f
                        ) || [];
                        updateSection("features", newFeatures);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Описание</label>
                    <textarea
                      value={feature.description}
                      onChange={(e) => {
                        const newFeatures = content.features?.map(f =>
                          f.id === feature.id ? { ...f, description: e.target.value } : f
                        ) || [];
                        updateSection("features", newFeatures);
                      }}
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {(!content.features || content.features.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-8">
                Нет преимуществ. Нажмите &quot;Добавить преимущество&quot; чтобы создать первое.
              </p>
            )}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-slate-400" />
              Отзывы студентов
            </h2>
            <button
              onClick={() => {
                const newTestimonial: Testimonial = {
                  id: Date.now().toString(),
                  name: "Имя студента",
                  role: "Студент курса",
                  text: "Текст отзыва",
                  rating: 5
                };
                updateSection("testimonials", [...(content.testimonials || []), newTestimonial]);
              }}
              className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              + Добавить отзыв
            </button>
          </div>

          <div className="space-y-4">
            {(content.testimonials || []).map((testimonial: Testimonial, index: number) => (
              <div key={testimonial.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">Отзыв {index + 1}</span>
                  <button
                    onClick={() => {
                      const newTestimonials = content.testimonials?.filter(t => t.id !== testimonial.id) || [];
                      updateSection("testimonials", newTestimonials);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Удалить
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Имя</label>
                      <input
                        type="text"
                        value={testimonial.name}
                        onChange={(e) => {
                          const newTestimonials = content.testimonials?.map(t =>
                            t.id === testimonial.id ? { ...t, name: e.target.value } : t
                          ) || [];
                          updateSection("testimonials", newTestimonials);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Роль</label>
                      <input
                        type="text"
                        value={testimonial.role}
                        onChange={(e) => {
                          const newTestimonials = content.testimonials?.map(t =>
                            t.id === testimonial.id ? { ...t, role: e.target.value } : t
                          ) || [];
                          updateSection("testimonials", newTestimonials);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Текст отзыва</label>
                    <textarea
                      value={testimonial.text}
                      onChange={(e) => {
                        const newTestimonials = content.testimonials?.map(t =>
                          t.id === testimonial.id ? { ...t, text: e.target.value } : t
                        ) || [];
                        updateSection("testimonials", newTestimonials);
                      }}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Рейтинг (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={testimonial.rating}
                      onChange={(e) => {
                        const newTestimonials = content.testimonials?.map(t =>
                          t.id === testimonial.id ? { ...t, rating: Number(e.target.value) } : t
                        ) || [];
                        updateSection("testimonials", newTestimonials);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {(!content.testimonials || content.testimonials.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-8">
                Нет отзывов. Нажмите &quot;Добавить отзыв&quot; чтобы создать первый.
              </p>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-slate-400" />
              Часто задаваемые вопросы (FAQ)
            </h2>
            <button
              onClick={() => {
                const newFAQ: FAQItem = {
                  id: Date.now().toString(),
                  question: "Вопрос",
                  answer: "Ответ на вопрос",
                  category: "Общие"
                };
                updateSection("faq", [...(content.faq || []), newFAQ]);
              }}
              className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              + Добавить вопрос
            </button>
          </div>

          <div className="space-y-4">
            {(content.faq || []).map((item: FAQItem, index: number) => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">Вопрос {index + 1}</span>
                  <button
                    onClick={() => {
                      const newFAQ = content.faq?.filter(f => f.id !== item.id) || [];
                      updateSection("faq", newFAQ);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Удалить
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Категория</label>
                    <input
                      type="text"
                      value={item.category || ""}
                      onChange={(e) => {
                        const newFAQ = content.faq?.map(f =>
                          f.id === item.id ? { ...f, category: e.target.value } : f
                        ) || [];
                        updateSection("faq", newFAQ);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Общие, Оплата, Курсы..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Вопрос</label>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const newFAQ = content.faq?.map(f =>
                          f.id === item.id ? { ...f, question: e.target.value } : f
                        ) || [];
                        updateSection("faq", newFAQ);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ответ</label>
                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const newFAQ = content.faq?.map(f =>
                          f.id === item.id ? { ...f, answer: e.target.value } : f
                        ) || [];
                        updateSection("faq", newFAQ);
                      }}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            ))}

            {(!content.faq || content.faq.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-8">
                Нет вопросов. Нажмите &quot;Добавить вопрос&quot; чтобы создать первый.
              </p>
            )}
          </div>
        </div>

        {/* Banners Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-slate-400" />
              Баннеры и объявления
            </h2>
            <button
              onClick={() => {
                const newBanner: Banner = {
                  id: Date.now().toString(),
                  text: "Текст объявления",
                  color: "blue",
                  active: true
                };
                updateSection("banners", [...(content.banners || []), newBanner]);
              }}
              className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              + Добавить баннер
            </button>
          </div>

          <div className="space-y-4">
            {(content.banners || []).map((banner: Banner, index: number) => (
              <div key={banner.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-600">Баннер {index + 1}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={banner.active}
                        onChange={(e) => {
                          const newBanners = content.banners?.map(b =>
                            b.id === banner.id ? { ...b, active: e.target.checked } : b
                          ) || [];
                          updateSection("banners", newBanners);
                        }}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-600">Активен</span>
                    </label>
                  </div>
                  <button
                    onClick={() => {
                      const newBanners = content.banners?.filter(b => b.id !== banner.id) || [];
                      updateSection("banners", newBanners);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Удалить
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Текст объявления</label>
                    <input
                      type="text"
                      value={banner.text}
                      onChange={(e) => {
                        const newBanners = content.banners?.map(b =>
                          b.id === banner.id ? { ...b, text: e.target.value } : b
                        ) || [];
                        updateSection("banners", newBanners);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">URL изображения (опционально)</label>
                    <input
                      type="text"
                      value={banner.imageUrl || ""}
                      onChange={(e) => {
                        const newBanners = content.banners?.map(b =>
                          b.id === banner.id ? { ...b, imageUrl: e.target.value } : b
                        ) || [];
                        updateSection("banners", newBanners);
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="/images/banner-icon.png"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Ссылка (опционально)</label>
                      <input
                        type="text"
                        value={banner.link || ""}
                        onChange={(e) => {
                          const newBanners = content.banners?.map(b =>
                            b.id === banner.id ? { ...b, link: e.target.value } : b
                          ) || [];
                          updateSection("banners", newBanners);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="/courses"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Цвет</label>
                      <select
                        value={banner.color}
                        onChange={(e) => {
                          const newBanners = content.banners?.map(b =>
                            b.id === banner.id ? { ...b, color: e.target.value } : b
                          ) || [];
                          updateSection("banners", newBanners);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="blue">Синий</option>
                        <option value="green">Зелёный</option>
                        <option value="yellow">Жёлтый</option>
                        <option value="red">Красный</option>
                        <option value="purple">Фиолетовый</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Дата начала (опционально)</label>
                      <input
                        type="date"
                        value={banner.startDate || ""}
                        onChange={(e) => {
                          const newBanners = content.banners?.map(b =>
                            b.id === banner.id ? { ...b, startDate: e.target.value } : b
                          ) || [];
                          updateSection("banners", newBanners);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Дата окончания (опционально)</label>
                      <input
                        type="date"
                        value={banner.endDate || ""}
                        onChange={(e) => {
                          const newBanners = content.banners?.map(b =>
                            b.id === banner.id ? { ...b, endDate: e.target.value } : b
                          ) || [];
                          updateSection("banners", newBanners);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!content.banners || content.banners.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-8">
                Нет баннеров. Нажмите &quot;Добавить баннер&quot; чтобы создать первый.
              </p>
            )}
          </div>
        </div>

        {/* SEO Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <GripVertical className="w-5 h-5 text-slate-400" />
            SEO настройки
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Meta Title
                <span className="text-slate-500 font-normal ml-2">(рекомендуется до 60 символов)</span>
              </label>
              <input
                type="text"
                value={content.seo?.title || ""}
                onChange={(e) => updateSection("seo", { ...content.seo, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Fatiha.ru — Исламская онлайн-платформа"
                maxLength={60}
              />
              <p className="text-xs text-slate-500 mt-1">
                {(content.seo?.title || "").length} / 60 символов
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Meta Description
                <span className="text-slate-500 font-normal ml-2">(рекомендуется до 160 символов)</span>
              </label>
              <textarea
                value={content.seo?.description || ""}
                onChange={(e) => updateSection("seo", { ...content.seo, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Изучайте Ислам онлайн: акыда, фикх, арабский язык и тасфир. Live-уроки, домашние задания и личный прогресс."
                maxLength={160}
              />
              <p className="text-xs text-slate-500 mt-1">
                {(content.seo?.description || "").length} / 160 символов
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Keywords
                <span className="text-slate-500 font-normal ml-2">(через запятую)</span>
              </label>
              <input
                type="text"
                value={content.seo?.keywords || ""}
                onChange={(e) => updateSection("seo", { ...content.seo, keywords: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="ислам, онлайн обучение, акыда, фикх, арабский язык"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Open Graph Image URL
                <span className="text-slate-500 font-normal ml-2">(для соцсетей)</span>
              </label>
              <input
                type="text"
                value={content.seo?.ogImage || ""}
                onChange={(e) => updateSection("seo", { ...content.seo, ogImage: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="/images/og-image.jpg"
              />
              <p className="text-xs text-slate-500 mt-1">
                Рекомендуемый размер: 1200x630 пикселей
              </p>
            </div>
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
    </>
  );
}
