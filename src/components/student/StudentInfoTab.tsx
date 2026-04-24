"use client";

import React from "react";
import { Accordion } from "@/components/ui/Accordion";
import type { AccordionItemProps } from "@/components/ui/Accordion";
import {
  Video,
  FileText,
  CheckSquare,
  Mic,
  HelpCircle,
  GraduationCap,
  Rocket,
  BookOpen,
  ClipboardList,
  BarChart3,
  Calendar,
  Users,
  Monitor,
  Lightbulb,
  AlertCircle,
} from "lucide-react";

export default function StudentInfoTab() {
  const sections: AccordionItemProps[] = [
    {
      id: "getting-started",
      icon: <Rocket className="w-5 h-5 text-emerald-600" />,
      title: "Начало работы",
      content: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-700 leading-relaxed">
            Добро пожаловать на платформу Fatiha.ru! Для начала обучения вам нужно присоединиться к потоку.
          </p>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5">
            <p className="font-semibold text-emerald-900 text-sm mb-2">Как присоединиться к потоку:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900/90">
              <li>Получите пригласительную ссылку от преподавателя</li>
              <li>Перейдите по ссылке (fatiha.ru/join/…)</li>
              <li>Войдите в свой аккаунт или зарегистрируйтесь</li>
              <li>Подтвердите присоединение к потоку</li>
              <li>Начните обучение!</li>
            </ol>
          </div>
          <Tip>Вы можете быть зачислены в несколько потоков одновременно.</Tip>
        </div>
      ),
    },
    {
      id: "lessons",
      icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
      title: "Уроки",
      content: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-700 leading-relaxed">
            Три типа уроков: Live (прямые эфиры), Видео (записи) и Текст (материалы для чтения).
          </p>
          <LessonTypeCard
            color="red"
            icon={<Video className="w-4 h-4" />}
            title="Live-уроки"
            body="Проходят в реальном времени. Вы можете видеть преподавателя, задавать вопросы через микрофон и общаться со студентами."
            warn="Для участия нужно разрешить доступ к микрофону и камере в браузере."
          />
          <LessonTypeCard
            color="violet"
            icon={<Video className="w-4 h-4" />}
            title="Видео-уроки"
            body="Записи, которые можно смотреть в любое удобное время. Ставьте на паузу, перематывайте и пересматривайте."
          />
          <LessonTypeCard
            color="amber"
            icon={<FileText className="w-4 h-4" />}
            title="Текстовые уроки"
            body="Теоретические материалы для изучения. Читайте в своём темпе и возвращайтесь к ним в любое время."
          />
        </div>
      ),
    },
    {
      id: "homework",
      icon: <ClipboardList className="w-5 h-5 text-emerald-600" />,
      title: "Домашние задания",
      content: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-700 leading-relaxed">
            Преподаватели могут давать домашние задания для закрепления материала. Задания бывают текстовыми и аудио.
          </p>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5">
            <p className="font-semibold text-emerald-900 text-sm mb-2">Как сдать задание:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900/90">
              <li>Откройте вкладку «Домашние задания»</li>
              <li>Выберите задание из списка</li>
              <li>Напишите ответ или запишите аудио</li>
              <li>Нажмите «Отправить»</li>
              <li>Дождитесь проверки преподавателем</li>
            </ol>
          </div>
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5">
            <p className="font-semibold text-blue-900 text-sm mb-2">Статусы работ:</p>
            <ul className="space-y-1 text-sm text-blue-900/90">
              <li><strong>На проверке</strong> — ожидает проверки</li>
              <li><strong>Принято</strong> — работа выполнена правильно</li>
              <li><strong>На доработке</strong> — нужно исправить и отправить снова</li>
              <li><strong>Отклонено</strong> — работа не принята</li>
            </ul>
          </div>
          <Tip>Обращайте внимание на сроки сдачи, если они указаны.</Tip>
        </div>
      ),
    },
    {
      id: "quizzes",
      icon: <CheckSquare className="w-5 h-5 text-emerald-600" />,
      title: "Тесты",
      content: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-700 leading-relaxed">
            К некоторым урокам прикреплены тесты для проверки знаний. Есть два типа.
          </p>
          <LessonTypeCard
            color="emerald"
            icon={<CheckSquare className="w-4 h-4" />}
            title="Тесты с выбором ответа"
            body="Выберите правильный вариант из предложенных. Результат виден сразу после отправки."
          />
          <LessonTypeCard
            color="indigo"
            icon={<Mic className="w-4 h-4" />}
            title="Голосовые тесты"
            body="Запишите голосовой ответ на вопрос. Преподаватель проверит и поставит оценку."
            warn="Нужно разрешить доступ к микрофону в браузере."
          />
          <Tip>Тест можно пересдать, если результат не устроил.</Tip>
        </div>
      ),
    },
    {
      id: "progress",
      icon: <BarChart3 className="w-5 h-5 text-emerald-600" />,
      title: "Отслеживание прогресса",
      content: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-700 leading-relaxed">
            На вкладке «Мой прогресс» видна успеваемость и статистика обучения.
          </p>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5">
            <p className="font-semibold text-emerald-900 text-sm mb-2">Что отслеживается:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-emerald-900/90">
              <li>Посещённые уроки</li>
              <li>Выполненные домашние задания</li>
              <li>Результаты тестов</li>
              <li>Общее время обучения</li>
              <li>Процент завершения курса</li>
            </ul>
          </div>
          <Tip>Регулярно проверяйте прогресс, чтобы не отставать от программы.</Tip>
        </div>
      ),
    },
    {
      id: "schedule",
      icon: <Calendar className="w-5 h-5 text-emerald-600" />,
      title: "Расписание",
      content: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-700 leading-relaxed">
            На вкладке «Расписание» вы видите график всех занятий ваших потоков.
          </p>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5">
            <ul className="list-disc list-inside space-y-1 text-sm text-emerald-900/90">
              <li>Расписание показывает все занятия на неделю</li>
              <li>Сегодняшний день выделен цветом</li>
              <li>Занятие можно открыть из списка уроков</li>
            </ul>
          </div>
          <Tip>Добавьте расписание в свой календарь, чтобы не пропускать занятия.</Tip>
        </div>
      ),
    },
    {
      id: "streams",
      icon: <Users className="w-5 h-5 text-emerald-600" />,
      title: "Потоки",
      content: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-700 leading-relaxed">
            Поток — это ваша учебная группа. В одном потоке учатся студенты одного уровня по общей программе.
          </p>
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5">
            <p className="font-semibold text-blue-900 text-sm mb-2">Информация о потоке:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-900/90">
              <li>Название и уровень обучения</li>
              <li>Имя преподавателя</li>
              <li>Расписание занятий</li>
              <li>Список всех уроков</li>
            </ul>
          </div>
          <Tip>Чтобы перейти в другой поток, обратитесь к преподавателю.</Tip>
        </div>
      ),
    },
    {
      id: "technical",
      icon: <Monitor className="w-5 h-5 text-emerald-600" />,
      title: "Технические требования",
      content: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-slate-700 leading-relaxed">
            Для комфортной работы убедитесь, что устройство соответствует требованиям.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <p className="font-semibold text-slate-800 text-sm mb-2">Рекомендуемые браузеры:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>Google Chrome (последняя версия)</li>
              <li>Mozilla Firefox (последняя версия)</li>
              <li>Safari (последняя версия)</li>
              <li>Microsoft Edge (последняя версия)</li>
            </ul>
          </div>
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3.5">
            <p className="font-semibold text-amber-900 text-sm mb-2">Для Live-уроков:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-900/90">
              <li>Стабильное интернет-соединение (мин. 2 Мбит/с)</li>
              <li>Микрофон (встроенный или внешний)</li>
              <li>Веб-камера (опционально)</li>
              <li>Наушники (для лучшего качества звука)</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "faq",
      icon: <HelpCircle className="w-5 h-5 text-emerald-600" />,
      title: "Часто задаваемые вопросы",
      content: (
        <div className="space-y-3.5 pt-1">
          <Faq q="Как присоединиться к уроку?" a="Откройте «Мои уроки» или «Расписание», найдите нужный урок и нажмите на него. Для Live-уроков откроется видеоконференция." />
          <Faq q="Что делать, если я не слышу преподавателя?" a="Проверьте громкость устройства и браузера. Убедитесь, что разрешили доступ к аудио. Попробуйте обновить страницу." />
          <Faq q="Можно ли пересдать тест?" a="Да, вы можете пройти тест повторно. Новый результат заменит предыдущий." />
          <Faq q="Как узнать, проверил ли преподаватель мою работу?" a="Во вкладке «Домашние задания» статус изменится с «На проверке» на «Принято», «На доработке» или «Отклонено». Преподаватель может оставить комментарий." />
          <Faq q="Сохраняются ли записи Live-уроков?" a="Зависит от настроек преподавателя. Если запись доступна — она появится в списке уроков как видео-урок." />
          <Faq q="Что делать, если я пропустил урок?" a="Проверьте, есть ли запись. Если нет — обратитесь к преподавателю или другим студентам за конспектом." />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg tracking-tight">Добро пожаловать на Fatiha.ru!</h3>
            <p className="text-sm text-emerald-50/90 mt-1 leading-relaxed">
              Платформа для исламского образования с live-трансляциями, домашними заданиями и тестами.
            </p>
          </div>
        </div>
      </div>

      <Accordion items={sections} />

      {/* Help footer */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-sm">Нужна помощь?</p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Если возникли вопросы или технические проблемы — обратитесь к преподавателю или администратору платформы.
          </p>
        </div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-slate-500">
      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="font-semibold text-slate-900 text-sm">{q}</p>
      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{a}</p>
    </div>
  );
}

const TYPE_STYLES = {
  red:     { bg: "bg-red-50/60",     border: "border-red-100",     title: "text-red-800",     body: "text-red-900/85",     icon: "text-red-600" },
  violet:  { bg: "bg-violet-50/60",  border: "border-violet-100",  title: "text-violet-800",  body: "text-violet-900/85",  icon: "text-violet-600" },
  amber:   { bg: "bg-amber-50/60",   border: "border-amber-100",   title: "text-amber-800",   body: "text-amber-900/85",   icon: "text-amber-600" },
  emerald: { bg: "bg-emerald-50/60", border: "border-emerald-100", title: "text-emerald-800", body: "text-emerald-900/85", icon: "text-emerald-600" },
  indigo:  { bg: "bg-indigo-50/60",  border: "border-indigo-100",  title: "text-indigo-800",  body: "text-indigo-900/85",  icon: "text-indigo-600" },
};

function LessonTypeCard({
  color,
  icon,
  title,
  body,
  warn,
}: {
  color: keyof typeof TYPE_STYLES;
  icon: React.ReactNode;
  title: string;
  body: string;
  warn?: string;
}) {
  const s = TYPE_STYLES[color];
  return (
    <div className={`${s.bg} ${s.border} border rounded-xl p-3.5`}>
      <p className={`font-semibold text-sm flex items-center gap-2 ${s.title}`}>
        <span className={s.icon}>{icon}</span>
        {title}
      </p>
      <p className={`text-sm mt-1 leading-relaxed ${s.body}`}>{body}</p>
      {warn && (
        <p className={`text-xs mt-2 flex items-start gap-1.5 ${s.body}`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {warn}
        </p>
      )}
    </div>
  );
}
