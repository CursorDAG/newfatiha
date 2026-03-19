import { baseTemplate } from "./base";

export interface TeacherApplicationRejectedData {
  userName: string;
  reason?: string;
}

export function teacherApplicationRejectedTemplate(data: TeacherApplicationRejectedData) {
  const subject = "Решение по вашей заявке - Fatiha.ru";

  const html = baseTemplate({
    title: "Решение по заявке",
    preheader: "Информация о рассмотрении вашей заявки на должность учителя",
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Здравствуйте, ${data.userName}!
      </p>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Благодарим вас за интерес к преподаванию на платформе Fatiha.ru. К сожалению, на данный момент мы не можем одобрить вашу заявку.
      </p>
      ${data.reason ? `
      <div style="margin: 24px 0; padding: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #92400e;">
          <strong>Причина:</strong><br>
          ${data.reason}
        </p>
      </div>
      ` : ''}
      <p style="margin: 24px 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
        Вы можете подать заявку повторно после устранения указанных замечаний. Если у вас есть вопросы, обращайтесь в службу поддержки.
      </p>
    `,
  });

  const text = `
Здравствуйте, ${data.userName}!

Благодарим вас за интерес к преподаванию на платформе Fatiha.ru. К сожалению, на данный момент мы не можем одобрить вашу заявку.

${data.reason ? `Причина: ${data.reason}` : ''}

Вы можете подать заявку повторно после устранения указанных замечаний. Если у вас есть вопросы, обращайтесь в службу поддержки.

---
Fatiha.ru - Исламское образование онлайн
  `.trim();

  return { subject, html, text };
}
