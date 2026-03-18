"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Course = {
  id: string;
  title: string;
  description: string | null;
  capacity: number;
  published: boolean;
};

type InitialValues = {
  title?: string;
  description?: string;
  capacity?: number;
  published?: boolean;
};

interface CreateCourseModalProps {
  onClose: () => void;
  onCreated: (course: Course) => void;
  /** Pass to enable edit mode instead of create mode */
  courseId?: string;
  initialValues?: InitialValues;
}

export default function CreateCourseModal({
  onClose,
  onCreated,
  courseId,
  initialValues,
}: CreateCourseModalProps) {
  const router = useRouter();
  const isEdit = Boolean(courseId);

  const [form, setForm] = useState({
    title: initialValues?.title ?? "",
    description: initialValues?.description ?? "",
    capacity: String(initialValues?.capacity ?? 30),
    published: initialValues?.published ?? false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Название обязательно");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = isEdit
        ? `/api/teacher/courses/${courseId}`
        : "/api/teacher/courses";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          capacity: Number(form.capacity) || 30,
          published: form.published,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка сохранения");
      onCreated(data.course);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-6 text-white">
          <h2 className="text-2xl font-bold">
            {isEdit ? "Редактировать курс" : "Новый курс"}
          </h2>
          <p className="text-emerald-200 text-sm mt-1">
            {isEdit
              ? "Измените детали курса"
              : "Заполните детали, чтобы создать курс"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Название курса <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none transition-all bg-slate-50 focus:bg-white"
              placeholder="Например: Основы арабского языка"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Описание
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none transition-all bg-slate-50 focus:bg-white resize-none h-24"
              placeholder="Краткое описание программы курса..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Лимит студентов
            </label>
            <input
              type="number"
              min={1}
              max={500}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-400 outline-none transition-all bg-slate-50 focus:bg-white"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
            <p className="text-xs text-slate-400 mt-1">
              Максимальное количество студентов во всех потоках курса
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors ${form.published ? "bg-emerald-500" : "bg-slate-300"}`}
              />
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.published ? "translate-x-5" : ""}`}
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">Опубликован</p>
              <p className="text-xs text-slate-400">Курс будет виден студентам</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all shadow-sm"
            >
              {loading
                ? isEdit
                  ? "Сохранение..."
                  : "Создание..."
                : isEdit
                  ? "Сохранить"
                  : "Создать курс"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
