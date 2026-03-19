import { baseTemplate } from "./base";

export interface TeacherApplicationApprovedData {
  userName: string;
  loginUrl: string;
}

export function teacherApplicationApprovedTemplate(data: TeacherApplicationApprovedData) {
  const subject = "Ваша заявка одобрена - Fatiha.ru";

  const html = baseTemplate({
    title: "Заявка одобрена",
    preheader: "Поздравляем! Ваша заявка на должность учителя одобрена",
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Здравствуйте, ${data.userName}!
      </p>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Поздравляем! Ваша заявка на должность учителя на платформе Fatiha.ru была одобрена администрацией.
      </p>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Теперь вы можете войти в систему и начать создавать курсы, потоки и уроки для студентов.
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
      <p style="margin: 24px 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
        Если у вас возникнут вопросы, обращайтесь в службу поддержки.
      </p>
    `,
  });

  const text = `
Здравствуйте, ${data.userName}!

Поздравляем! Ваша заявка на должность учителя на платформе Fatiha.ru была одобрена администрацией.

Теперь вы можете войти в систему и начать создавать курсы, потоки и уроки для студентов.

Войти: ${data.loginUrl}

Если у вас возникнут вопросы, обращайтесь в службу поддержки.

---
Fatiha.ru - Исламское образование онлайн
  `.trim();

  return { subject, html, text };
}
