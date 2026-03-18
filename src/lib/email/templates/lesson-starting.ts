import { baseTemplate } from "./base";

export interface LessonStartingData {
  userName: string;
  lessonTitle: string;
  streamName: string;
  lessonUrl: string;
  startTime: string;
}

export function lessonStartingTemplate(data: LessonStartingData): { subject: string; html: string; text: string } {
  const { userName, lessonTitle, streamName, lessonUrl, startTime } = data;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      Урок начнется через 15 минут
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${userName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Напоминаем, что скоро начнется урок:
    </p>
    <div style="background-color: #f1f5f9; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
        ${lessonTitle}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Поток: ${streamName}
      </p>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Время начала: ${startTime}
      </p>
    </div>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Подготовьтесь к уроку и присоединяйтесь вовремя.
    </p>
  `;

  const html = baseTemplate({
    title: "Урок начнется через 15 минут",
    preheader: `${lessonTitle} - ${streamName}`,
    content,
    buttonText: "Присоединиться к уроку",
    buttonUrl: lessonUrl,
  });

  const text = `
Урок начнется через 15 минут

Здравствуйте, ${userName}!

Напоминаем, что скоро начнется урок:

${lessonTitle}
Поток: ${streamName}
Время начала: ${startTime}

Подготовьтесь к уроку и присоединяйтесь вовремя.

Присоединиться: ${lessonUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `Урок "${lessonTitle}" начнется через 15 минут`,
    html,
    text,
  };
}
