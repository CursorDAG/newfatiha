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
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  GripVertical,
  Eye,
  EyeOff,
  ExternalLink,
  Edit,
  Plus,
  Trash2,
  Video,
  FileText,
  BookOpen,
} from "lucide-react";

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
  onUploadRecording,
}: {
  lesson: Lesson;
  index: number;
  onOpenLesson: (id: string) => void;
  onEditLesson: (id: string) => void;
  onCreateQuiz: (id: string) => void;
  onDeleteLesson: (id: string) => void;
  onTogglePublish: (id: string, published: boolean) => void;
  onUploadRecording: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeConfig = {
    LIVE: { label: "LIVE", icon: <Video className="w-4 h-4" />, variant: "error" as const },
    VIDEO: { label: "VIDEO", icon: <Video className="w-4 h-4" />, variant: "info" as const },
    TEXT: { label: "TEXT", icon: <FileText className="w-4 h-4" />, variant: "neutral" as const },
  };

  const config = typeConfig[lesson.type as keyof typeof typeConfig] || typeConfig.TEXT;

  return (
    <div ref={setNodeRef} style={style}>
      <Card hoverable padding="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 shrink-0 touch-none self-start"
            title="Перетащить для изменения порядка"
            aria-label="Перетащить"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="neutral" size="sm">#{index + 1}</Badge>
              <Badge variant={config.variant} size="sm" icon={config.icon}>
                {config.label}
              </Badge>
              {!lesson.published && (
                <Badge variant="warning" size="sm" icon={<EyeOff className="w-3 h-3" />}>
                  Скрыт
                </Badge>
              )}
            </div>
            <h4 className="font-bold text-base text-slate-900 mb-1">{lesson.title}</h4>
            <p className="text-sm text-slate-600 mb-2">
              Создан: {new Date(lesson.createdAt).toLocaleDateString("ru-RU")}
            </p>
            {lesson.teacherNotes && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-900 mb-1">Заметки преподавателя:</p>
                <p className="text-sm text-amber-800 line-clamp-2">{lesson.teacherNotes}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              onClick={() => onTogglePublish(lesson.id, !lesson.published)}
              variant={lesson.published ? "success" : "secondary"}
              size="sm"
              icon={lesson.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            >
              {lesson.published ? "Виден" : "Скрыт"}
            </Button>
            <Button
              onClick={() => window.open(`/lesson/${lesson.id}`, "_blank")}
              variant="ghost"
              size="sm"
              icon={<ExternalLink className="w-4 h-4" />}
            >
              Предпросмотр
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-slate-200">
          <Button onClick={() => onOpenLesson(lesson.id)} variant="secondary" size="sm">
            Открыть
          </Button>
          <Button
            onClick={() => onEditLesson(lesson.id)}
            variant="secondary"
            size="sm"
            icon={<Edit className="w-4 h-4" />}
          >
            Редактировать
          </Button>
          <Button
            onClick={() => onCreateQuiz(lesson.id)}
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
          >
            Тест
          </Button>
          <Button
            onClick={() => onUploadRecording(lesson.id)}
            variant="secondary"
            size="sm"
            icon={<Video className="w-4 h-4" />}
          >
            Запись
          </Button>
          <Button
            onClick={() => onDeleteLesson(lesson.id)}
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Удалить
          </Button>
        </div>
      </Card>
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
  onUploadRecording,
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
  /** Upload recording for a lesson. */
  onUploadRecording: (lessonId: string) => void;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Уроки и тесты</h2>
          <p className="text-sm text-slate-600 mt-2">
            План уроков выбранного потока · перетащите карточку для изменения порядка
          </p>
        </div>
        {hasStream && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={onCreateLesson} variant="primary" size="lg" icon={<Plus className="w-5 h-5" />}>
              Создать урок
            </Button>
            <Button onClick={onImport} variant="secondary" size="lg">
              Импортировать
            </Button>
            <Button onClick={onLibrary} variant="secondary" size="lg" icon={<BookOpen className="w-5 h-5" />}>
              Библиотека
            </Button>
          </div>
        )}
      </div>

      {!hasStream ? (
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">У вас нет потоков</h3>
            <p className="text-slate-600">Создайте поток, чтобы планировать уроки</p>
          </div>
        </Card>
      ) : !streamHasLessons ? (
        <Card padding="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">В этом потоке ещё нет уроков</h3>
            <p className="text-slate-600 mb-6">Создайте урок или импортируйте уроки из другого потока</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={onCreateLesson} variant="primary" icon={<Plus className="w-5 h-5" />}>
                Создать урок
              </Button>
              <Button onClick={onImport} variant="secondary">
                Импортировать
              </Button>
            </div>
          </div>
        </Card>
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
                  onUploadRecording={onUploadRecording}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
