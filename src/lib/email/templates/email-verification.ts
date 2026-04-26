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
      <h2 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; color: #0f172a; line-height: 1.2;">
        Добро пожаловать на Fatiha.ru! 🎉
      </h2>

      <p style="margin: 0 0 16px; font-size: 16px; line-height: 26px; color: #334155;">
        Здравствуйте, <strong style="color: #059669;">${data.userName}</strong>!
      </p>

      <p style="margin: 0 0 24px; font-size: 16px; line-height: 26px; color: #334155;">
        Спасибо за регистрацию на платформе исламского образования. Для завершения регистрации и получения доступа к курсам, пожалуйста, подтвердите ваш email адрес.
      </p>

      <!-- Info box -->
      <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px; line-height: 22px; color: #065f46;">
          <strong>💡 Совет:</strong> После подтверждения вы сможете присоединиться к потокам, посещать live-уроки и отслеживать свой прогресс.
        </p>
      </div>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
        <tr>
          <td style="border-radius: 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);">
            <a href="${data.verificationUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">
              ✓ Подтвердить email
            </a>
          </td>
        </tr>
      </table>

      <div style="background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; line-height: 20px; color: #64748b; font-weight: 600;">
          Если кнопка не работает, скопируйте эту ссылку:
        </p>
        <p style="margin: 0; font-size: 12px; line-height: 18px; color: #059669; word-break: break-all; font-family: monospace;">
          ${data.verificationUrl}
        </p>
      </div>

      <p style="margin: 24px 0 0; font-size: 14px; line-height: 22px; color: #64748b;">
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
