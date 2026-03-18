import { baseTemplate } from "./base";

export interface HomeworkSubmittedData {
  teacherName: string;
  studentName: string;
  assignmentTitle: string;
  streamName: string;
  submittedAt: string;
  reviewUrl: string;
}

export function homeworkSubmittedTemplate(data: HomeworkSubmittedData): { subject: string; html: string; text: string } {
  const { teacherName, studentName, assignmentTitle, streamName, submittedAt, reviewUrl } = data;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      Студент сдал домашнее задание
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${teacherName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Студент <strong>${studentName}</strong> сдал домашнее задание и ожидает проверки:
    </p>
    <div style="background-color: #f1f5f9; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
        ${assignmentTitle}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Студент: ${studentName}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Поток: ${streamName}
      </p>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Сдано: ${submittedAt}
      </p>
    </div>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Пожалуйста, проверьте работу и оставьте комментарий для студента.
    </p>
  `;

  const html = baseTemplate({
    title: "Студент сдал домашнее задание",
    preheader: `${studentName} - ${assignmentTitle}`,
    content,
    buttonText: "Проверить работу",
    buttonUrl: reviewUrl,
  });

  const text = `
Студент сдал домашнее задание

Здравствуйте, ${teacherName}!

Студент ${studentName} сдал домашнее задание и ожидает проверки:

${assignmentTitle}
Студент: ${studentName}
Поток: ${streamName}
Сдано: ${submittedAt}

Пожалуйста, проверьте работу и оставьте комментарий для студента.

Проверить работу: ${reviewUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `${studentName} сдал "${assignmentTitle}"`,
    html,
    text,
  };
}
