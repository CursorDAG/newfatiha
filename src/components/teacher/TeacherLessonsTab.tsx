"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/teacher/ui/Button";
import EmptyState from "@/components/teacher/ui/EmptyState";

type Lesson = {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  sortOrder: number;
  teacherNotes?: string | null;
  published: boolean;
};

// ── Sortable lesson card ─────────────────────────────────────────────────────

function SortableLessonCard({
  lesson,
  index,
  onOpenLesson,
  onEditLesson,
  onCreateQuiz,
  onDeleteLesson,
  onTogglePublish,
}: {
  lesson: Lesson;
  index: number;
  onOpenLesson: (id: string) => void;
  onEditLesson: (id: string) => void;
  onCreateQuiz: (id: string) => void;
  onDeleteLesson: (id: string) => void;
  onTogglePublish: (id: string, published: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors ${
        lesson.published
          ? "border-slate-200 bg-white"
          : "border-slate-200 bg-slate-50 opacity-80"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0 touch-none"
          title="Перетащить для изменения порядка"
          aria-label="Перетащить"
        >
          <svg
            width="16"
            height="20"
            viewBox="0 0 16 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="4" cy="4" r="2" />
            <circle cx="12" cy="4" r="2" />
            <circle cx="4" cy="10" r="2" />
            <circle cx="12" cy="10" r="2" />
            <circle cx="4" cy="16" r="2" />
            <circle cx="12" cy="16" r="2" />
          </svg>
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {lesson.type === "LIVE" ? "LIVE" : lesson.type === "VIDEO" ? "VIDEO" : "TEXT"}
            </span>
            {!lesson.published && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                Скрыт
              </span>
            )}
          </div>
          <p className="font-bold text-slate-800 truncate">{lesson.title}</p>
          <p className="text-xs text-slate-500 mt-1">
            Создан: {new Date(lesson.createdAt).toLocaleDateString("ru-RU")}
          </p>
          {lesson.teacherNotes && (
            <p className="text-xs text-slate-600 mt-2 line-clamp-2">
              <span className="font-semibold text-slate-700">Заметки: </span>
              {lesson.teacherNotes}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {/* Publish toggle */}
        <button
          type="button"
          onClick={() => onTogglePublish(lesson.id, !lesson.published)}
          title={lesson.published ? "Скрыть от студентов" : "Опубликовать для студентов"}
          className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
            lesson.published
              ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
              : "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
          }`}
        >
          {lesson.published ? "👁 Виден" : "🔒 Скрыт"}
        </button>
        <Button
          onClick={() => window.open(`/lesson/${lesson.id}`, "_blank")}
          variant="secondary"
          size="sm"
        >
          Предпросмотр
        </Button>
        <Button onClick={() => onOpenLesson(lesson.id)} variant="secondary" size="sm">
          Открыть
        </Button>
        <Button onClick={() => onEditLesson(lesson.id)} variant="secondary" size="sm">
          Редактировать
        </Button>
        <Button onClick={() => onCreateQuiz(lesson.id)} variant="primary" size="sm">
          + Тест
        </Button>
        <Button onClick={() => onDeleteLesson(lesson.id)} variant="danger" size="sm">
          Удалить
        </Button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

/**
 * Lessons tab with drag-and-drop reordering.
 * `onReorder` is called with the new ordered lesson IDs after a drag ends.
 */
export default function TeacherLessonsTab({
  hasStream,
  streamHasLessons,
  lessons,
  onCreateLesson,
  onImport,
  onLibrary,
  onOpenLesson,
  onEditLesson,
  onCreateQuiz,
  onDeleteLesson,
  onReorder,
  onTogglePublish,
}: {
  hasStream: boolean;
  streamHasLessons: boolean;
  lessons: Lesson[];
  onCreateLesson: () => void;
  onImport: () => void;
  onLibrary: () => void;
  onOpenLesson: (lessonId: string) => void;
  onEditLesson: (lessonId: string) => void;
  onCreateQuiz: (lessonId: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  /** Called with the new ordered lesson ID array after DnD. */
  onReorder: (orderedIds: string[]) => void;
  /** Toggle lesson visibility for students. */
  onTogglePublish: (lessonId: string, published: boolean) => void;
}) {
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>(lessons);

  // Keep local state in sync when the incoming lessons list changes (e.g. after refresh).
  React.useEffect(() => {
    setOrderedLessons(lessons);
  }, [lessons]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedLessons((prev) => {
      const oldIndex = prev.findIndex((l) => l.id === active.id);
      const newIndex = prev.findIndex((l) => l.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      onReorder(next.map((l) => l.id));
      return next;
    });
  }

  return (
    <div className="p-8 flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">Уроки и тесты</h2>
          <p className="text-sm text-slate-500 mt-1">
            План уроков выбранного потока · перетащите карточку для изменения порядка
          </p>
        </div>
        {hasStream && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={onCreateLesson} variant="primary">
              + Создать урок
            </Button>
            <Button onClick={onImport} variant="secondary">
              Импортировать из другого потока
            </Button>
            <Button onClick={onLibrary} variant="secondary">
              Из библиотеки
            </Button>
          </div>
        )}
      </div>

      {!hasStream ? (
        <EmptyState
          icon="📚"
          title="У вас нет потоков"
          description="Создайте поток, чтобы планировать уроки."
        />
      ) : !streamHasLessons ? (
        <EmptyState
          icon="🗂"
          title="В этом потоке ещё нет уроков"
          description="Создайте урок или импортируйте уроки из другого потока."
          action={
            <div className="flex gap-2">
              <Button onClick={onCreateLesson} variant="primary">
                + Создать урок
              </Button>
              <Button onClick={onImport} variant="secondary">
                Импортировать
              </Button>
            </div>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedLessons.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {orderedLessons.map((lesson, idx) => (
                <SortableLessonCard
                  key={lesson.id}
                  lesson={lesson}
                  index={idx}
                  onOpenLesson={onOpenLesson}
                  onEditLesson={onEditLesson}
                  onCreateQuiz={onCreateQuiz}
                  onDeleteLesson={onDeleteLesson}
                  onTogglePublish={onTogglePublish}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
