import { baseTemplate } from "./base";

export interface AdminBroadcastData {
  subject: string;
  message: string;
  isHtml: boolean;
}

export function adminBroadcastTemplate(data: AdminBroadcastData) {
  const { subject, message, isHtml } = data;

  const html = baseTemplate({
    title: subject,
    preheader: subject,
    content: `
      <h2 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; color: #0f172a; line-height: 1.2;">
        ${subject}
      </h2>

      ${isHtml ? message : `
      <div style="font-size: 16px; line-height: 26px; color: #334155; white-space: pre-wrap;">
        ${message}
      </div>
      `}

      <!-- Signature -->
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 14px; line-height: 22px; color: #64748b;">
          С уважением,<br>
          <strong style="color: #059669;">Команда Fatiha.ru</strong>
        </p>
      </div>
    `,
  });

  const text = `
${subject}

${message}

---
С уважением,
Команда Fatiha.ru
  `.trim();

  return { subject, html, text };
}
