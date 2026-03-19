import { OnboardingStep } from "@/contexts/OnboardingContext";

export const studentSteps: OnboardingStep[] = [
  {
    id: "welcome",
    target: "[data-onboarding='student-dashboard']",
    title: "Добро пожаловать в личный кабинет!",
    description: "Давайте познакомимся с основными возможностями платформы. Это займет всего минуту.",
    position: "bottom",
  },
  {
    id: "my-streams",
    target: "[data-onboarding='my-streams']",
    title: "Мои потоки",
    description: "Здесь отображаются все потоки, в которых вы зарегистрированы. Нажмите на поток, чтобы увидеть список уроков.",
    position: "bottom",
  },
  {
    id: "lessons-list",
    target: "[data-onboarding='lessons-list']",
    title: "Список уроков",
    description: "Все уроки вашего потока. Живые уроки проходят через видеоконференцию, также есть видеозаписи и текстовые материалы.",
    position: "right",
  },
  {
    id: "homework",
    target: "[data-onboarding='homework-section']",
    title: "Домашние задания",
    description: "Здесь вы найдете все домашние задания. Обращайте внимание на сроки сдачи и статусы проверки.",
    position: "top",
  },
  {
    id: "progress",
    target: "[data-onboarding='progress-section']",
    title: "Ваш прогресс",
    description: "Отслеживайте свою успеваемость: пройденные уроки, выполненные задания и результаты тестов.",
    position: "top",
  },
  {
    id: "completion",
    target: "[data-onboarding='student-dashboard']",
    title: "Готово!",
    description: "Теперь вы знаете, как пользоваться платформой. Успехов в обучении! Вы можете вернуться к этому туру через кнопку 'Помощь'.",
    position: "bottom",
  },
];
