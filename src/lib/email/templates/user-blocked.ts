import { baseTemplate } from "./base";

export interface UserBlockedData {
  userName: string;
  reason?: string;
}

export function userBlockedTemplate(data: UserBlockedData) {
  const subject = "Ваш аккаунт заблокирован - Fatiha.ru";

  const html = baseTemplate({
    title: "Аккаунт заблокирован",
    preheader: "Ваш аккаунт был заблокирован администратором",
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Здравствуйте, ${data.userName}!
      </p>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Ваш аккаунт на платформе Fatiha.ru был заблокирован администратором.
      </p>
      ${data.reason ? `
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #991b1b; font-weight: 600;">
          Причина блокировки:
        </p>
        <p style="margin: 8px 0 0; font-size: 14px; line-height: 20px; color: #991b1b;">
          ${data.reason}
        </p>
      </div>
      ` : ''}
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Вы не сможете войти в систему до снятия блокировки.
      </p>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
        Если вы считаете, что это ошибка, пожалуйста, свяжитесь с администрацией платформы.
      </p>
    `,
  });

  const text = `
Здравствуйте, ${data.userName}!

Ваш аккаунт на платформе Fatiha.ru был заблокирован администратором.

${data.reason ? `Причина блокировки: ${data.reason}\n\n` : ''}Вы не сможете войти в систему до снятия блокировки.

Если вы считаете, что это ошибка, пожалуйста, свяжитесь с администрацией платформы.

---
Fatiha.ru - Исламское образование онлайн
  `.trim();

  return { subject, html, text };
}
