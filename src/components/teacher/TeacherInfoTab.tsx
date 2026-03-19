"use client";

import React from "react";
import { Accordion } from "@/components/ui/Accordion";
import type { AccordionItemProps } from "@/components/ui/Accordion";
import { Card } from "@/components/ui/Card";
import {
  GraduationCap,
  Video,
  FileText,
  HelpCircle,
} from "lucide-react";

export default function TeacherInfoTab() {
  const sections: AccordionItemProps[] = [
    {
      id: "courses",
      title: "📚 Управление курсами",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Курсы — это основа вашей образовательной программы. Каждый курс содержит потоки (группы студентов) и уроки.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Как создать курс:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900">
              <li>Перейдите на вкладку &quot;📚 Курсы&quot;</li>
              <li>Нажмите кнопку &quot;Создать курс&quot;</li>
              <li>Укажите название, описание и вместимость</li>
              <li>Сохраните курс</li>
            </ol>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Вместимость курса определяет максимальное количество студентов во всех потоках курса.
          </p>
        </div>
      ),
    },
    {
      id: "streams",
      title: "🧩 Работа с потоками",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Потоки — это группы студентов внутри курса. Каждый поток имеет свое расписание и набор уроков.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Создание потока:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900">
              <li>Откройте вкладку &quot;🧩 Потоки&quot;</li>
              <li>Выберите курс и нажмите &quot;Создать поток&quot;</li>
              <li>Укажите название, уровень и цвет</li>
              <li>Настройте расписание занятий</li>
            </ol>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="font-semibold text-blue-800 text-sm mb-2">Пригласительные ссылки:</p>
            <p className="text-sm text-blue-900">
              Для каждого потока можно сгенерировать уникальную ссылку-приглашение. Отправьте её студентам, чтобы они могли присоединиться к потоку.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "lessons",
      title: "📖 Создание уроков",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Уроки могут быть трёх типов: Live (видеоконференция), Видео (ссылка на запись) и Текст (материалы для чтения).
          </p>
          <div className="space-y-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="font-semibold text-red-800 text-sm flex items-center gap-2">
                <Video className="w-4 h-4" />
                Live-уроки
              </p>
              <p className="text-sm text-red-900 mt-1">
                Проводятся в реальном времени через встроенную видеоконференцию Jitsi Meet. Студенты могут присоединиться во время урока.
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="font-semibold text-purple-800 text-sm flex items-center gap-2">
                <Video className="w-4 h-4" />
                Видео-уроки
              </p>
              <p className="text-sm text-purple-900 mt-1">
                Укажите ссылку на видеозапись (YouTube, Vimeo и т.д.). Студенты смогут просмотреть её в любое время.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Текстовые уроки
              </p>
              <p className="text-sm text-amber-900 mt-1">
                Добавьте текстовые материалы в формате Markdown. Подходит для теоретических материалов и инструкций.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Используйте библиотеку уроков для создания шаблонов, которые можно переиспользовать в разных потоках.
          </p>
        </div>
      ),
    },
    {
      id: "students",
      title: "👥 Управление студентами",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            На вкладке &quot;Студенты&quot; вы можете просматривать всех зачисленных студентов, переводить их между потоками и отслеживать их прогресс.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Доступные действия:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-emerald-900">
              <li>Перевод студента в другой поток</li>
              <li>Отчисление студента из потока</li>
              <li>Перевод на повторное обучение</li>
              <li>Просмотр детального прогресса</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            ⚠️ Внимание: Отчисленные студенты теряют доступ к материалам потока.
          </p>
        </div>
      ),
    },
    {
      id: "homework",
      title: "📝 Домашние задания",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Создавайте домашние задания для потоков. Задания могут быть текстовыми или аудио.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Создание задания:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900">
              <li>Перейдите на вкладку &quot;📝 Д/З&quot;</li>
              <li>Нажмите &quot;Создать задание&quot;</li>
              <li>Выберите поток и тип задания</li>
              <li>Укажите описание и срок сдачи (опционально)</li>
              <li>Опубликуйте задание</li>
            </ol>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="font-semibold text-blue-800 text-sm mb-2">Проверка работ:</p>
            <p className="text-sm text-blue-900">
              Все отправленные работы появятся в журнале. Вы можете принять работу, отправить на доработку или отклонить с комментарием.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "quizzes",
      title: "✅ Тесты и опросы",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            К урокам можно прикреплять тесты двух типов: с выбором ответа и голосовые.
          </p>
          <div className="space-y-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="font-semibold text-green-800 text-sm">Тесты с выбором ответа</p>
              <p className="text-sm text-green-900 mt-1">
                Автоматически проверяются системой. Студент сразу видит результат.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="font-semibold text-indigo-800 text-sm">Голосовые тесты</p>
              <p className="text-sm text-indigo-900 mt-1">
                Студент записывает голосовой ответ. Требуют ручной проверки преподавателем в журнале.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "gradebook",
      title: "📓 Журнал оценок",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            В журнале собраны все работы студентов, требующие проверки: голосовые тесты и домашние задания.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Процесс проверки:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900">
              <li>Откройте вкладку &quot;📓 Журнал&quot;</li>
              <li>Выберите работу для проверки</li>
              <li>Прослушайте/прочитайте ответ студента</li>
              <li>Поставьте оценку и оставьте комментарий</li>
              <li>Отметьте как &quot;Принято&quot; или &quot;Не принято&quot;</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "analytics",
      title: "📈 Аналитика и прогресс",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Отслеживайте активность студентов и их прогресс в обучении.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Доступная аналитика:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-emerald-900">
              <li>Посещаемость уроков</li>
              <li>Время, проведённое в системе</li>
              <li>Выполнение домашних заданий</li>
              <li>Результаты тестов</li>
              <li>Общий прогресс по курсу</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Используйте вкладку &quot;📊 Прогресс&quot; для детального анализа успеваемости каждого студента.
          </p>
        </div>
      ),
    },
    {
      id: "schedule",
      title: "🗓 Расписание занятий",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Создавайте расписание для потоков с помощью визуального календаря.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Настройка расписания:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900">
              <li>Перейдите на вкладку &quot;🗓 Расписание&quot;</li>
              <li>Выберите поток</li>
              <li>Кликните на нужный день и время</li>
              <li>Укажите длительность занятия (30-минутные слоты)</li>
              <li>Сохраните расписание</li>
            </ol>
          </div>
          <p className="text-sm text-slate-500">
            ⚠️ Система автоматически проверяет конфликты расписания для одного потока.
          </p>
        </div>
      ),
    },
    {
      id: "live",
      title: "🔴 Live-трансляции",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            На вкладке &quot;Live&quot; вы видите все активные уроки в реальном времени.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="font-semibold text-red-800 text-sm mb-2">Возможности:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-900">
              <li>Просмотр списка студентов онлайн</li>
              <li>Быстрый переход к активному уроку</li>
              <li>Мониторинг посещаемости</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Система автоматически отслеживает присутствие студентов на уроке.
          </p>
        </div>
      ),
    },
    {
      id: "faq",
      title: "❓ Часто задаваемые вопросы",
      content: (
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Как удалить курс или поток?</p>
            <p className="text-sm text-slate-600 mt-1">
              Используйте кнопку удаления на соответствующей вкладке. Удаление курса удалит все связанные потоки и уроки.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Можно ли изменить порядок уроков?</p>
            <p className="text-sm text-slate-600 mt-1">
              Да, на вкладке &quot;Уроки&quot; используйте drag-and-drop для изменения порядка уроков в потоке.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Как студенты получают доступ к урокам?</p>
            <p className="text-sm text-slate-600 mt-1">
              После регистрации и присоединения к потоку через пригласительную ссылку, студенты автоматически получают доступ ко всем урокам потока.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Что делать, если студент не может присоединиться к Live-уроку?</p>
            <p className="text-sm text-slate-600 mt-1">
              Проверьте, что студент зачислен в поток и урок имеет тип &quot;Live&quot;. Также убедитесь, что у студента есть доступ к микрофону и камере в браузере.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          ℹ️ Информация для преподавателей
        </h1>
        <p className="text-slate-600">
          Полное руководство по использованию платформы Fatiha.ru для преподавателей
        </p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 rounded-full p-3">
            <GraduationCap className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900 mb-1">Добро пожаловать!</h3>
            <p className="text-sm text-emerald-800">
              Fatiha.ru — это современная платформа для исламского образования с поддержкой live-трансляций,
              домашних заданий, тестов и детальной аналитики прогресса студентов.
            </p>
          </div>
        </div>
      </Card>

      <Accordion items={sections} />

      <Card className="p-6 bg-slate-50 border-slate-200">
        <div className="flex items-start gap-4">
          <HelpCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">Нужна помощь?</h3>
            <p className="text-sm text-slate-600">
              Если у вас возникли вопросы или проблемы, обратитесь к администратору платформы.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
