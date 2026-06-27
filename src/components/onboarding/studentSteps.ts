import { OnboardingStep } from "@/contexts/OnboardingContext";

export const studentSteps: OnboardingStep[] = [
  {
    id: "my-streams",
    target: "[data-onboarding='nav-courses']",
    title: "Мои потоки",
    description: "Здесь отображаются все потоки, в которых вы зарегистрированы. Нажмите на поток, чтобы увидеть список уроков.",
    position: "right",
  },
  {
    id: "homework",
    target: "[data-onboarding='nav-homework']",
    title: "Домашние задания",
    description: "Здесь вы найдёте все домашние задания. Обращайте внимание на сроки сдачи и статусы проверки.",
    position: "right",
  },
  {
    id: "progress",
    target: "[data-onboarding='nav-progress']",
    title: "Ваш прогресс",
    description: "Отслеживайте свою успеваемость: пройденные уроки, выполненные задания и результаты тестов.",
    position: "right",
  },
];
