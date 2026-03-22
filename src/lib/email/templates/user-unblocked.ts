import { baseTemplate } from "./base";

export interface UserUnblockedData {
  userName: string;
  loginUrl: string;
}

export function userUnblockedTemplate(data: UserUnblockedData) {
  const subject = "Ваш аккаунт разблокирован - Fatiha.ru";

  const html = baseTemplate({
    title: "Аккаунт разблокирован",
    preheader: "Ваш аккаунт был разблокирован, вы можете войти в систему",
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Здравствуйте, ${data.userName}!
      </p>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Ваш аккаунт на платформе Fatiha.ru был разблокирован. Теперь вы можете снова войти в систему.
      </p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td style="border-radius: 6px; background: #10b981;">
            <a href="${data.loginUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Войти в систему
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
        Если у вас возникнут вопросы, пожалуйста, свяжитесь с администрацией платформы.
      </p>
    `,
  });

  const text = `
Здравствуйте, ${data.userName}!

Ваш аккаунт на платформе Fatiha.ru был разблокирован. Теперь вы можете снова войти в систему.

Войти: ${data.loginUrl}

Если у вас возникнут вопросы, пожалуйста, свяжитесь с администрацией платформы.

---
Fatiha.ru - Исламское образование онлайн
  `.trim();

  return { subject, html, text };
}
