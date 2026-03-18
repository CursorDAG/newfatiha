import { baseTemplate } from "./base";

export interface NewLessonData {
  userName: string;
  lessonTitle: string;
  lessonDescription?: string;
  streamName: string;
  lessonUrl: string;
  publishedDate: string;
}

export function newLessonTemplate(data: NewLessonData): { subject: string; html: string; text: string } {
  const { userName, lessonTitle, lessonDescription, streamName, lessonUrl, publishedDate } = data;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      Новый урок опубликован
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${userName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      В вашем потоке <strong>${streamName}</strong> опубликован новый урок:
    </p>
    <div style="background-color: #f1f5f9; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
        ${lessonTitle}
      </p>
      ${lessonDescription ? `
      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.5;">
        ${lessonDescription}
      </p>
      ` : ""}
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Опубликовано: ${publishedDate}
      </p>
    </div>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Переходите к уроку и начинайте обучение!
    </p>
  `;

  const html = baseTemplate({
    title: "Новый урок опубликован",
    preheader: `${lessonTitle} - ${streamName}`,
    content,
    buttonText: "Перейти к уроку",
    buttonUrl: lessonUrl,
  });

  const text = `
Новый урок опубликован

Здравствуйте, ${userName}!

В вашем потоке ${streamName} опубликован новый урок:

${lessonTitle}
${lessonDescription ? `\n${lessonDescription}\n` : ""}
Опубликовано: ${publishedDate}

Переходите к уроку и начинайте обучение!

Перейти к уроку: ${lessonUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `Новый урок: ${lessonTitle}`,
    html,
    text,
  };
}
