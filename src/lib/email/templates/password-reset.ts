import { baseTemplate } from "./base";

export interface PasswordResetData {
  userName: string;
  temporaryPassword: string;
}

export function passwordResetTemplate(data: PasswordResetData) {
  const subject = "Временный пароль - Fatiha.ru";

  const html = baseTemplate({
    title: "Сброс пароля",
    preheader: "Ваш пароль был сброшен администратором",
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Здравствуйте, ${data.userName}!
      </p>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Администратор сбросил ваш пароль. Ваш новый временный пароль:
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
        <code style="font-size: 24px; font-weight: 700; color: #10b981; font-family: 'Courier New', monospace; letter-spacing: 2px;">
          ${data.temporaryPassword}
        </code>
      </div>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">
        Пожалуйста, войдите в систему с этим паролем и измените его на новый в настройках профиля.
      </p>
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td style="border-radius: 6px; background: #10b981;">
            <a href="${process.env.NEXTAUTH_URL || 'https://fatiha.ru'}/api/auth/signin" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Войти в систему
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; font-size: 14px; line-height: 20px; color: #dc2626; font-weight: 600;">
        ⚠️ Важно: Обязательно смените этот временный пароль после входа в систему!
      </p>
      <p style="margin: 16px 0 0; font-size: 14px; line-height: 20px; color: #6b7280;">
        Если вы не запрашивали сброс пароля, немедленно свяжитесь с администрацией.
      </p>
    `,
  });

  const text = `
Здравствуйте, ${data.userName}!

Администратор сбросил ваш пароль. Ваш новый временный пароль:

${data.temporaryPassword}

Пожалуйста, войдите в систему с этим паролем и измените его на новый в настройках профиля.

Войти: ${process.env.NEXTAUTH_URL || 'https://fatiha.ru'}/api/auth/signin

⚠️ Важно: Обязательно смените этот временный пароль после входа в систему!

Если вы не запрашивали сброс пароля, немедленно свяжитесь с администрацией.

---
Fatiha.ru - Исламское образование онлайн
  `.trim();

  return { subject, html, text };
}
