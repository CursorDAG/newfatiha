/**
 * Example usage of EmailService
 * This file demonstrates how to use the email infrastructure
 */

import { EmailService } from "@/lib/email-service";
import { NotificationService } from "@/lib/notification-service";
import { EmailScheduler } from "@/lib/email-scheduler";

// Example 1: Send email directly
async function sendLessonReminderExample() {
  await EmailService.sendLessonStarting("student@example.com", {
    userName: "Иван Иванов",
    lessonTitle: "Введение в таджвид",
    streamName: "Группа 1",
    lessonUrl: "http://localhost:3000/lesson/123",
    startTime: "10:00",
  });
}

// Example 2: Send email via NotificationService (recommended)
// This creates both in-app notification AND sends email
async function notifyNewLessonExample() {
  const streamId = "stream-id";
  const lessonId = "lesson-id";

  // This will:
  // 1. Create in-app notifications for all students
  // 2. Send email to all students
  await NotificationService.notifyNewLesson(streamId, lessonId);
}

// Example 3: Notify homework checked
async function notifyHomeworkCheckedExample() {
  const submissionId = "submission-id";

  // This will:
  // 1. Create in-app notification for student
  // 2. Send email to student with grade and comments
  await NotificationService.notifyHomeworkChecked(submissionId);
}

// Example 4: Notify teacher about student submission
async function notifyTeacherExample() {
  const submissionId = "submission-id";
  const teacherId = "teacher-id";

  // This will:
  // 1. Create in-app notification for teacher
  // 2. Send email to teacher
  await NotificationService.notifyHomeworkSubmitted(submissionId, teacherId);
}

// Example 5: Start automated email reminders
function startScheduledEmailsExample() {
  // Start cron jobs for:
  // - Lesson reminders (15 minutes before)
  // - Homework deadline reminders (24 hours before)
  EmailScheduler.start();

  // Stop on shutdown
  process.on("SIGTERM", () => {
    EmailScheduler.stop();
  });
}

// Example 6: Send all types of emails
async function sendAllEmailTypesExample() {
  const baseUrl = "http://localhost:3000";

  // Student emails
  await EmailService.sendNewLesson("student@example.com", {
    userName: "Иван Иванов",
    lessonTitle: "Урок 5: Правила чтения",
    lessonDescription: "Изучаем основные правила чтения Корана",
    streamName: "Группа 1",
    lessonUrl: `${baseUrl}/lesson/123`,
    publishedDate: "15 марта 2026",
  });

  await EmailService.sendHomeworkChecked("student@example.com", {
    userName: "Иван Иванов",
    assignmentTitle: "Домашнее задание 1",
    status: "ACCEPTED",
    teacherComment: "Отличная работа!",
    grade: 95,
    homeworkUrl: `${baseUrl}/student`,
  });

  await EmailService.sendQuizChecked("student@example.com", {
    userName: "Иван Иванов",
    lessonTitle: "Урок 5: Правила чтения",
    quizTitle: "Тест по таджвиду",
    status: "PASSED",
    score: 85,
    lessonUrl: `${baseUrl}/lesson/123`,
  });

  await EmailService.sendHomeworkDeadline("student@example.com", {
    userName: "Иван Иванов",
    assignmentTitle: "Домашнее задание 2",
    streamName: "Группа 1",
    deadline: "20 марта 2026, 23:59",
    timeRemaining: "24 часа",
    homeworkUrl: `${baseUrl}/student`,
  });

  await EmailService.sendNewMessage("student@example.com", {
    userName: "Иван Иванов",
    senderName: "Учитель Ахмед",
    messagePreview: "Здравствуйте! Напоминаю о завтрашнем уроке...",
    messageUrl: `${baseUrl}/chat/123`,
  });

  // Teacher emails
  await EmailService.sendHomeworkSubmitted("teacher@example.com", {
    teacherName: "Учитель Ахмед",
    studentName: "Иван Иванов",
    assignmentTitle: "Домашнее задание 1",
    streamName: "Группа 1",
    submittedAt: "18 марта 2026, 14:30",
    reviewUrl: `${baseUrl}/teacher`,
  });

  await EmailService.sendQuizSubmitted("teacher@example.com", {
    teacherName: "Учитель Ахмед",
    studentName: "Иван Иванов",
    quizTitle: "Тест по таджвиду",
    lessonTitle: "Урок 5: Правила чтения",
    streamName: "Группа 1",
    submittedAt: "18 марта 2026, 14:30",
    reviewUrl: `${baseUrl}/teacher`,
    isVoiceQuiz: false,
  });

  await EmailService.sendStudentJoined("teacher@example.com", {
    teacherName: "Учитель Ахмед",
    studentName: "Иван Иванов",
    studentEmail: "student@example.com",
    streamName: "Группа 1",
    courseName: "Основы таджвида",
    joinedAt: "18 марта 2026, 10:00",
    profileUrl: `${baseUrl}/teacher`,
  });
}

export {
  sendLessonReminderExample,
  notifyNewLessonExample,
  notifyHomeworkCheckedExample,
  notifyTeacherExample,
  startScheduledEmailsExample,
  sendAllEmailTypesExample,
};
