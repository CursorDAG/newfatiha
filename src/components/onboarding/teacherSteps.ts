import { OnboardingStep } from "@/contexts/OnboardingContext";

export const teacherSteps: OnboardingStep[] = [
  {
    id: "welcome",
    target: "[data-onboarding='teacher-dashboard']",
    title: "Добро пожаловать в панель преподавателя!",
    description: "Давайте познакомимся с основными возможностями системы. Этот тур займет всего пару минут.",
    position: "bottom",
  },
  {
    id: "courses-tab",
    target: "[data-onboarding='tab-courses']",
    title: "Курсы",
    description: "Здесь вы можете создавать и управлять курсами. Курс — это основная образовательная программа с определенной вместимостью студентов.",
    position: "bottom",
  },
  {
    id: "streams-tab",
    target: "[data-onboarding='tab-streams']",
    title: "Потоки",
    description: "Потоки — это группы студентов внутри курса. Вы можете создавать расписание, генерировать пригласительные ссылки и управлять составом группы.",
    position: "bottom",
  },
  {
    id: "lessons-tab",
    target: "[data-onboarding='tab-lessons']",
    title: "Уроки",
    description: "Создавайте уроки для ваших потоков: живые трансляции через Jitsi, видеоуроки или текстовые материалы. Можно импортировать уроки из библиотеки шаблонов.",
    position: "bottom",
  },
  {
    id: "students-tab",
    target: "[data-onboarding='tab-students']",
    title: "Студенты",
    description: "Просматривайте список всех студентов, переводите их между потоками, отслеживайте прогресс и управляйте доступом.",
    position: "bottom",
  },
  {
    id: "gradebook-tab",
    target: "[data-onboarding='tab-gradebook']",
    title: "Журнал оценок",
    description: "Проверяйте домашние задания и голосовые ответы студентов. Все непроверенные работы отображаются здесь.",
    position: "bottom",
  },
  {
    id: "homework-tab",
    target: "[data-onboarding='tab-homework']",
    title: "Домашние задания",
    description: "Создавайте и управляйте домашними заданиями для ваших потоков. Можно указать срок сдачи и привязать задание к конкретному уроку.",
    position: "bottom",
  },
  {
    id: "schedule-tab",
    target: "[data-onboarding='tab-schedule']",
    title: "Расписание",
    description: "Визуальная сетка расписания на неделю. Создавайте временные слоты для ваших потоков с интервалом 30 минут.",
    position: "bottom",
  },
  {
    id: "analytics-tab",
    target: "[data-onboarding='tab-analytics']",
    title: "Аналитика",
    description: "Отслеживайте активность студентов, посещаемость уроков и общую статистику по вашим курсам.",
    position: "bottom",
  },
  {
    id: "completion",
    target: "[data-onboarding='teacher-dashboard']",
    title: "Готово!",
    description: "Теперь вы знаете основные возможности системы. Вы всегда можете вернуться к этому туру через кнопку 'Помощь' в правом верхнем углу.",
    position: "bottom",
  },
];
