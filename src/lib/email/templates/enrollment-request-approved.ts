import { baseTemplate } from "./base";

export interface EnrollmentRequestApprovedData {
  studentName: string;
  courseName: string;
  streamName: string;
  price?: string;
  paymentInstructions?: string;
  applicationUrl: string;
}

export function enrollmentRequestApprovedTemplate(data: EnrollmentRequestApprovedData) {
  const subject = data.price
    ? `Заявка одобрена: ${data.courseName} - Необходима оплата`
    : `Вы зачислены на курс: ${data.courseName}`;

  const html = baseTemplate({
    title: data.price ? "Заявка одобрена" : "Вы зачислены на курс",
    previewText: data.price
      ? "Ваша заявка одобрена. Необходимо внести оплату."
      : "Поздравляем! Вы зачислены на курс.",
    content: `
      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 16px;">
        Здравствуйте, ${data.studentName}!
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 24px; margin: 0 0 24px; text-align: center;">
        <div style="font-size: 48px; margin: 0 0 12px;">✓</div>
        <h2 style="color: white; font-size: 24px; font-weight: 700; margin: 0 0 8px;">
          ${data.price ? "Заявка одобрена!" : "Поздравляем!"}
        </h2>
        <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">
          ${data.price ? "Необходимо внести оплату" : "Вы зачислены на курс"}
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
          ${
            data.price
              ? `
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Стоимость:</td>
            <td style="padding: 8px 0; font-size: 16px; color: #10b981; font-weight: 700; text-align: right;">${data.price}</td>
          </tr>
          `
              : ""
          }
        </table>
      </div>

      ${
        data.price && data.paymentInstructions
          ? `
      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
        <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 12px;">
          💳 Инструкции по оплате:
        </p>
        <p style="font-size: 14px; line-height: 20px; color: #1e3a8a; margin: 0; white-space: pre-wrap;">
          ${data.paymentInstructions}
        </p>
      </div>
      `
          : ""
      }

      <p style="font-size: 16px; line-height: 24px; color: #334155; margin: 0 0 24px;">
        ${
          data.price
            ? "После внесения оплаты учитель подтвердит её, и вы получите доступ к материалам курса."
            : "Вы можете приступить к обучению прямо сейчас!"
        }
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.applicationUrl}"
           style="display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
          ${data.price ? "Посмотреть детали" : "Перейти к обучению"}
        </a>
      </div>
    `,
  });

  const text = `
${data.price ? "Заявка одобрена" : "Вы зачислены на курс"}

Здравствуйте, ${data.studentName}!

${data.price ? "Ваша заявка одобрена! Необходимо внести оплату." : "Поздравляем! Вы зачислены на курс."}

Информация о курсе:
- Курс: ${data.courseName}
- Группа: ${data.streamName}
${data.price ? `- Стоимость: ${data.price}` : ""}

${
  data.price && data.paymentInstructions
    ? `Инструкции по оплате:\n${data.paymentInstructions}\n\n`
    : ""
}

${
  data.price
    ? "После внесения оплаты учитель подтвердит её, и вы получите доступ к материалам курса."
    : "Вы можете приступить к обучению прямо сейчас!"
}

${data.price ? "Посмотреть детали" : "Перейти к обучению"}: ${data.applicationUrl}
  `.trim();

  return { subject, html, text };
}
