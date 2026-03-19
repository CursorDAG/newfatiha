import { baseTemplate } from "./base";

export interface EmailVerificationData {
  userName: string;
  verificationUrl: string;
}

export function emailVerificationTemplate(data: EmailVerificationData) {
  const subject = "Подтвердите ваш email - Fatiha.ru";

  const html = baseTemplate({
    title: "Подтверждение email",
    preheader: "Подтвердите ваш email адрес для завершения регистрации",
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Здравствуйте, ${data.userName}!
      </p>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Спасибо за регистрацию на платформе Fatiha.ru. Для завершения регистрации, пожалуйста, подтвердите ваш email адрес.
      </p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td style="border-radius: 6px; background: #10b981;">
            <a href="${data.verificationUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Подтвердить email
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
        Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:
      </p>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280; word-break: break-all;">
        ${data.verificationUrl}
      </p>
      <p style="margin: 24px 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
        Если вы не регистрировались на Fatiha.ru, просто проигнорируйте это письмо.
      </p>
    `,
  });

  const text = `
Здравствуйте, ${data.userName}!

Спасибо за регистрацию на платформе Fatiha.ru. Для завершения регистрации, пожалуйста, подтвердите ваш email адрес.

Перейдите по ссылке: ${data.verificationUrl}

Если вы не регистрировались на Fatiha.ru, просто проигнорируйте это письмо.

---
Fatiha.ru - Исламское образование онлайн
  `.trim();

  return { subject, html, text };
}
