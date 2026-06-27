import { OnboardingStep } from "@/contexts/OnboardingContext";

export const teacherSteps: OnboardingStep[] = [
  {
    id: "courses",
    target: "[data-onboarding='nav-courses']",
    title: "Курсы",
    description: "Создавайте и управляйте курсами. Курс — это основная образовательная программа с определённой вместимостью студентов.",
    position: "right",
  },
  {
    id: "analytics",
    target: "[data-onboarding='nav-analytics']",
    title: "Аналитика",
    description: "Отслеживайте активность студентов, посещаемость уроков и общую статистику по вашим курсам.",
    position: "right",
  },
  {
    id: "gradebook",
    target: "[data-onboarding='nav-gradebook']",
    title: "Журнал оценок",
    description: "Проверяйте домашние задания и голосовые ответы студентов. Все непроверенные работы отображаются здесь.",
    position: "right",
  },
];
