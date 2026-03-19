import { baseTemplate } from "./base";

export interface EnrollmentRequestSubmittedData {
  teacherName: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  streamName: string;
  message?: string;
  submittedAt: string;
  reviewUrl: string;
}

export function enrollmentRequestSubmittedTemplate(data: EnrollmentRequestSubmittedData) {
  const subject = `Новая заявка на курс: ${data.courseName}`;

  const html = baseTemplate({
    title: "Новая заявка на курс",
    previewText: `${data.studentName} подал заявку на ваш курс`,
    content: `
      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 16px;">
        Здравствуйте, ${data.teacherName}!
      </p>

      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 24px;">
        Студент <strong>${data.studentName}</strong> подал заявку на ваш курс.
      </p>

      <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <p style="font-size: 14px; font-weight: 600; color: #64748b; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Информация о заявке
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
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Студент:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${data.studentName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Email:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${data.studentEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Дата подачи:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">${data.submittedAt}</td>
          </tr>
        </table>
      </div>

      ${
        data.message
          ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
        <p style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 8px;">
          Сообщение от студента:
        </p>
        <p style="font-size: 14px; line-height: 20px; color: #78350f; margin: 0; white-space: pre-wrap;">
          ${data.message}
        </p>
      </div>
      `
          : ""
      }

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.reviewUrl}"
           style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
          Рассмотреть заявку
        </a>
      </div>

      <p style="font-size: 14px; line-height: 20px; color: #64748b; margin: 24px 0 0; text-align: center;">
        Вы можете одобрить или отклонить заявку в личном кабинете
      </p>
    `,
  });

  const text = `
Новая заявка на курс

Здравствуйте, ${data.teacherName}!

Студент ${data.studentName} подал заявку на ваш курс.

Информация о заявке:
- Курс: ${data.courseName}
- Группа: ${data.streamName}
- Студент: ${data.studentName}
- Email: ${data.studentEmail}
- Дата подачи: ${data.submittedAt}

${data.message ? `Сообщение от студента:\n${data.message}\n\n` : ""}

Рассмотреть заявку: ${data.reviewUrl}

Вы можете одобрить или отклонить заявку в личном кабинете.
  `.trim();

  return { subject, html, text };
}
