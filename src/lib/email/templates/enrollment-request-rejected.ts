import { baseTemplate } from "./base";

export interface EnrollmentRequestRejectedData {
  studentName: string;
  courseName: string;
  streamName: string;
  rejectionReason: string;
  catalogUrl: string;
}

export function enrollmentRequestRejectedTemplate(data: EnrollmentRequestRejectedData) {
  const subject = `Заявка отклонена: ${data.courseName}`;

  const html = baseTemplate({
    title: "Заявка отклонена",
    previewText: "К сожалению, ваша заявка на курс была отклонена",
    content: `
      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 16px;">
        Здравствуйте, ${data.studentName}!
      </p>

      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 24px;">
        К сожалению, ваша заявка на курс <strong>${data.courseName}</strong> (${data.streamName}) была отклонена.
      </p>

      <div style="background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
        <p style="font-size: 14px; font-weight: 600; color: #991b1b; margin: 0 0 8px;">
          Причина отклонения:
        </p>
        <p style="font-size: 14px; line-height: 20px; color: #7f1d1d; margin: 0; white-space: pre-wrap;">
          ${data.rejectionReason}
        </p>
      </div>

      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 24px;">
        Не расстраивайтесь! Вы можете подать заявку на другие доступные курсы или попробовать снова позже.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.catalogUrl}"
           style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
          Посмотреть другие курсы
        </a>
      </div>

      <p style="font-size: 14px; line-height: 20px; color: #64748b; margin: 24px 0 0; text-align: center;">
        Если у вас есть вопросы, свяжитесь с учителем или администрацией
      </p>
    `,
  });

  const text = `
Заявка отклонена

Здравствуйте, ${data.studentName}!

К сожалению, ваша заявка на курс ${data.courseName} (${data.streamName}) была отклонена.

Причина отклонения:
${data.rejectionReason}

Не расстраивайтесь! Вы можете подать заявку на другие доступные курсы или попробовать снова позже.

Посмотреть другие курсы: ${data.catalogUrl}

Если у вас есть вопросы, свяжитесь с учителем или администрацией.
  `.trim();

  return { subject, html, text };
}
