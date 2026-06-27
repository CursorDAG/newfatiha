/**
 * Hasanat (хасанат) — виртуальная валюта добродетелей для Fatiha.ru.
 * Используется как мотивационная система вместо XP.
 */

export const HASANAT_RATES = {
  VIEW_LESSON: 10,
  HOMEWORK_SUBMITTED: 20,
  HOMEWORK_ACCEPTED: 20,
  QUIZ_SUBMITTED: 30,
  QUIZ_COMPLETED: 30,
  REVIEW_SUBMITTED: 15,
  STREAK_7_DAYS: 50,
  STREAK_30_DAYS: 200,
} as const;

export const HASANAT_LABELS: Record<string, string> = {
  VIEW_LESSON: "Просмотр урока",
  HOMEWORK_SUBMITTED: "Домашнее задание сдано",
  HOMEWORK_ACCEPTED: "Домашнее задание принято",
  QUIZ_SUBMITTED: "Тест пройден",
  QUIZ_COMPLETED: "Тест завершён",
  REVIEW_SUBMITTED: "Отзыв о курсе",
  STREAK_7_DAYS: "Стрик 7 дней",
  STREAK_30_DAYS: "Стрик 30 дней",
};
