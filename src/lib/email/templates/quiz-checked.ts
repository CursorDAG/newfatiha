import { baseTemplate } from "./base";

export interface QuizCheckedData {
  userName: string;
  lessonTitle: string;
  quizTitle: string;
  status: "PASSED" | "FAILED";
  score?: number;
  teacherComment?: string;
  lessonUrl: string;
}

export function quizCheckedTemplate(data: QuizCheckedData): { subject: string; html: string; text: string } {
  const { userName, lessonTitle, quizTitle, status, score, teacherComment, lessonUrl } = data;

  const statusText = status === "PASSED" ? "пройден" : "не пройден";
  const statusColor = status === "PASSED" ? "#10b981" : "#ef4444";
  const statusEmoji = status === "PASSED" ? "✅" : "❌";

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      Тест проверен
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${userName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Ваш тест проверен учителем:
    </p>
    <div style="background-color: #f1f5f9; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
        ${quizTitle}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Урок: ${lessonTitle}
      </p>
      <p style="margin: 0 0 10px 0; color: ${statusColor}; font-size: 16px; font-weight: 600;">
        ${statusEmoji} Результат: ${statusText}
      </p>
      ${score !== undefined ? `
      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
        Балл: ${score}
      </p>
      ` : ""}
      ${teacherComment ? `
      <div style="background-color: #ffffff; padding: 15px; margin-top: 15px; border-radius: 4px;">
        <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          Комментарий учителя:
        </p>
        <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.5;">
          ${teacherComment}
        </p>
      </div>
      ` : ""}
    </div>
    ${status === "FAILED" ? `
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Не расстраивайтесь! Повторите материал урока и попробуйте еще раз.
    </p>
    ` : ""}
  `;

  const html = baseTemplate({
    title: "Тест проверен",
    preheader: `${quizTitle} - ${statusText}`,
    content,
    buttonText: "Посмотреть результат",
    buttonUrl: lessonUrl,
  });

  const text = `
Тест проверен

Здравствуйте, ${userName}!

Ваш тест проверен учителем:

${quizTitle}
Урок: ${lessonTitle}
Результат: ${statusText}
${score !== undefined ? `Балл: ${score}` : ""}

${teacherComment ? `Комментарий учителя:\n${teacherComment}\n` : ""}
${status === "FAILED" ? "\nНе расстраивайтесь! Повторите материал урока и попробуйте еще раз.\n" : ""}

Посмотреть результат: ${lessonUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `Тест "${quizTitle}" проверен - ${statusText}`,
    html,
    text,
  };
}
