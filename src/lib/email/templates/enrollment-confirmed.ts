import { baseTemplate } from "./base";

export interface EnrollmentConfirmedData {
  studentName: string;
  courseName: string;
  streamName: string;
  teacherName: string;
  dashboardUrl: string;
}

export function enrollmentConfirmedTemplate(data: EnrollmentConfirmedData) {
  const subject = `Добро пожаловать на курс: ${data.courseName}`;

  const html = baseTemplate({
    title: "Добро пожаловать!",
    previewText: "Оплата подтверждена. Вы зачислены на курс.",
    content: `
      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 16px;">
        Здравствуйте, ${data.studentName}!
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 24px; margin: 0 0 24px; text-align: center;">
        <div style="font-size: 48px; margin: 0 0 12px;">🎉</div>
        <h2 style="color: white; font-size: 24px; font-weight: 700; margin: 0 0 8px;">
          Добро пожаловать!
        </h2>
        <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">
          Оплата подтверждена. Вы зачислены на курс.
        </p>
      </div>

      <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <p style="font-size: 14px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Информация о курсе
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Курс:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${data.courseName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Группа:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${data.streamName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Учитель:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${data.teacherName}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 24px;">
        Теперь у вас есть полный доступ к материалам курса, урокам и домашним заданиям. Желаем успехов в обучении!
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.dashboardUrl}"
           style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
          Перейти к обучению
        </a>
      </div>

      <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin: 24px 0 0;">
        <p style="font-size: 14px; line-height: 20px; color: #78350f; margin: 0; text-align: center;">
          💡 <strong>Совет:</strong> Проверяйте расписание занятий и не забывайте выполнять домашние задания
        </p>
      </div>
    `,
  });

  const text = `
Добро пожаловать на курс!

Здравствуйте, ${data.studentName}!

Оплата подтверждена. Вы зачислены на курс.

Информация о курсе:
- Курс: ${data.courseName}
- Группа: ${data.streamName}
- Учитель: ${data.teacherName}

Теперь у вас есть полный доступ к материалам курса, урокам и домашним заданиям. Желаем успехов в обучении!

Перейти к обучению: ${data.dashboardUrl}

💡 Совет: Проверяйте расписание занятий и не забывайте выполнять домашние задания.
  `.trim();

  return { subject, html, text };
}
