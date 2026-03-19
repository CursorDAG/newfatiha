"use client";

import React from "react";
import { Accordion } from "@/components/ui/Accordion";
import type { AccordionItemProps } from "@/components/ui/Accordion";
import { Card } from "@/components/ui/Card";
import {
  BookOpen,
  Video,
  FileText,
  CheckSquare,
  BarChart3,
  Calendar,
  Link as LinkIcon,
  Mic,
  HelpCircle,
  GraduationCap,
} from "lucide-react";

export default function StudentInfoTab() {
  const sections: AccordionItemProps[] = [
    {
      id: "getting-started",
      title: "🚀 Начало работы",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Добро пожаловать на платформу Fatiha.ru! Для начала обучения вам нужно присоединиться к потоку.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Как присоединиться к потоку:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900">
              <li>Получите пригласительную ссылку от преподавателя</li>
              <li>Перейдите по ссылке (она выглядит как fatiha.ru/join/...)</li>
              <li>Войдите в свой аккаунт или зарегистрируйтесь</li>
              <li>Подтвердите присоединение к потоку</li>
              <li>Начните обучение!</li>
            </ol>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Вы можете быть зачислены в несколько потоков одновременно.
          </p>
        </div>
      ),
    },
    {
      id: "lessons",
      title: "📖 Уроки",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            На платформе доступны три типа уроков: Live (прямые эфиры), Видео (записи) и Текст (материалы для чтения).
          </p>
          <div className="space-y-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="font-semibold text-red-800 text-sm flex items-center gap-2">
                <Video className="w-4 h-4" />
                Live-уроки
              </p>
              <p className="text-sm text-red-900 mt-1">
                Проходят в реальном времени. Вы можете видеть преподавателя, задавать вопросы через микрофон и общаться с другими студентами.
              </p>
              <p className="text-xs text-red-700 mt-2">
                ⚠️ Для участия нужно разрешить доступ к микрофону и камере в браузере.
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="font-semibold text-purple-800 text-sm flex items-center gap-2">
                <Video className="w-4 h-4" />
                Видео-уроки
              </p>
              <p className="text-sm text-purple-900 mt-1">
                Записанные видео, которые можно смотреть в любое удобное время. Ставьте на паузу, перематывайте и пересматривайте сколько угодно.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Текстовые уроки
              </p>
              <p className="text-sm text-amber-900 mt-1">
                Теоретические материалы для изучения. Читайте в своём темпе и возвращайтесь к ним в любое время.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "homework",
      title: "📝 Домашние задания",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Преподаватели могут давать домашние задания для закрепления материала. Задания бывают текстовыми и аудио.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Как сдать домашнее задание:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-emerald-900">
              <li>Откройте вкладку "📝 Д/З"</li>
              <li>Выберите задание из списка</li>
              <li>Напишите ответ или прикрепите ссылку на файл</li>
              <li>Нажмите "Отправить"</li>
              <li>Дождитесь проверки преподавателем</li>
            </ol>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="font-semibold text-blue-800 text-sm mb-2">Статусы работ:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-900">
              <li><strong>Отправлено</strong> — работа ожидает проверки</li>
              <li><strong>Принято</strong> — работа выполнена правильно</li>
              <li><strong>На доработку</strong> — нужно исправить и отправить снова</li>
              <li><strong>Отклонено</strong> — работа не принята</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Обращайте внимание на сроки сдачи заданий, если они указаны.
          </p>
        </div>
      ),
    },
    {
      id: "quizzes",
      title: "✅ Тесты",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            К некоторым урокам прикреплены тесты для проверки знаний. Есть два типа тестов.
          </p>
          <div className="space-y-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="font-semibold text-green-800 text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Тесты с выбором ответа
              </p>
              <p className="text-sm text-green-900 mt-1">
                Выберите правильный вариант ответа из предложенных. Результат вы увидите сразу после отправки.
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="font-semibold text-indigo-800 text-sm flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Голосовые тесты
              </p>
              <p className="text-sm text-indigo-900 mt-1">
                Запишите голосовой ответ на вопрос. Преподаватель проверит его и поставит оценку.
              </p>
              <p className="text-xs text-indigo-700 mt-2">
                ⚠️ Для записи голоса нужно разрешить доступ к микрофону в браузере.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Вы можете пересдать тест, если результат вас не устроил.
          </p>
        </div>
      ),
    },
    {
      id: "progress",
      title: "📊 Отслеживание прогресса",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            На вкладке "Прогресс" вы можете видеть свою успеваемость и статистику обучения.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Что отслеживается:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-emerald-900">
              <li>Посещённые уроки</li>
              <li>Выполненные домашние задания</li>
              <li>Результаты тестов</li>
              <li>Общее время обучения</li>
              <li>Процент завершения курса</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Регулярно проверяйте свой прогресс, чтобы не отставать от программы.
          </p>
        </div>
      ),
    },
    {
      id: "schedule",
      title: "🗓 Расписание",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            На вкладке "Расписание" вы видите график всех занятий ваших потоков.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="font-semibold text-emerald-800 text-sm mb-2">Как пользоваться расписанием:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-emerald-900">
              <li>Расписание показывает все занятия на неделю</li>
              <li>Каждый поток имеет свой цвет для удобства</li>
              <li>Кликните на занятие, чтобы перейти к уроку</li>
              <li>Live-уроки отмечены специальным значком 🔴</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            💡 Совет: Добавьте расписание в свой календарь, чтобы не пропускать занятия.
          </p>
        </div>
      ),
    },
    {
      id: "streams",
      title: "🧩 Потоки",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Поток — это ваша учебная группа. В одном потоке учатся студенты одного уровня по одной программе.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="font-semibold text-blue-800 text-sm mb-2">Информация о потоке:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-900">
              <li>Название и уровень обучения</li>
              <li>Имя преподавателя</li>
              <li>Расписание занятий</li>
              <li>Список всех уроков</li>
              <li>Количество студентов</li>
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            ℹ️ Если вам нужно перейти в другой поток, обратитесь к преподавателю.
          </p>
        </div>
      ),
    },
    {
      id: "technical",
      title: "💻 Технические требования",
      content: (
        <div className="space-y-3">
          <p className="text-sm">
            Для комфортной работы с платформой убедитесь, что ваше устройство соответствует требованиям.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="font-semibold text-slate-800 text-sm mb-2">Рекомендуемые браузеры:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
              <li>Google Chrome (последняя версия)</li>
              <li>Mozilla Firefox (последняя версия)</li>
              <li>Safari (последняя версия)</li>
              <li>Microsoft Edge (последняя версия)</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
            <p className="font-semibold text-amber-800 text-sm mb-2">Для Live-уроков необходимо:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-900">
              <li>Стабильное интернет-соединение (минимум 2 Мбит/с)</li>
              <li>Микрофон (встроенный или внешний)</li>
              <li>Веб-камера (опционально)</li>
              <li>Наушники (рекомендуется для лучшего качества звука)</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "faq",
      title: "❓ Часто задаваемые вопросы",
      content: (
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Как мне присоединиться к уроку?</p>
            <p className="text-sm text-slate-600 mt-1">
              Перейдите на вкладку "Уроки" или "Расписание", найдите нужный урок и нажмите на него. Для Live-уроков откроется видеоконференция.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Что делать, если я не слышу преподавателя?</p>
            <p className="text-sm text-slate-600 mt-1">
              Проверьте громкость на вашем устройстве и в браузере. Убедитесь, что вы разрешили доступ к аудио. Попробуйте обновить страницу.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Можно ли пересдать тест?</p>
            <p className="text-sm text-slate-600 mt-1">
              Да, вы можете пройти тест повторно. Новый результат заменит предыдущий.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Как узнать, проверил ли преподаватель мою работу?</p>
            <p className="text-sm text-slate-600 mt-1">
              Проверьте вкладку "Д/З". Статус работы изменится с "Отправлено" на "Принято", "На доработку" или "Отклонено". Преподаватель может оставить комментарий.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Сохраняются ли записи Live-уроков?</p>
            <p className="text-sm text-slate-600 mt-1">
              Это зависит от настроек преподавателя. Если запись доступна, она появится в списке уроков как видео-урок.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Что делать, если я пропустил урок?</p>
            <p className="text-sm text-slate-600 mt-1">
              Проверьте, есть ли запись урока. Если нет, обратитесь к преподавателю или другим студентам за конспектом. Выполните все домашние задания по теме.
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
          ℹ️ Информация для студентов
        </h1>
        <p className="text-slate-600">
          Полное руководство по использованию платформы Fatiha.ru для студентов
        </p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 rounded-full p-3">
            <GraduationCap className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-900 mb-1">Добро пожаловать на Fatiha.ru!</h3>
            <p className="text-sm text-emerald-800">
              Платформа для исламского образования с live-трансляциями, домашними заданиями и тестами.
              Учитесь в удобном темпе и отслеживайте свой прогресс.
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
              Если у вас возникли вопросы или технические проблемы, обратитесь к преподавателю или администратору платформы.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
