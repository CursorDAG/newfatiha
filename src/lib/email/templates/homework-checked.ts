import { baseTemplate } from "./base";

export interface HomeworkCheckedData {
  userName: string;
  assignmentTitle: string;
  status: "ACCEPTED" | "NEEDS_REWORK" | "REJECTED";
  teacherComment?: string;
  grade?: number;
  homeworkUrl: string;
}

export function homeworkCheckedTemplate(data: HomeworkCheckedData): { subject: string; html: string; text: string } {
  const { userName, assignmentTitle, status, teacherComment, grade, homeworkUrl } = data;

  const statusText = status === "ACCEPTED" ? "принято" : status === "NEEDS_REWORK" ? "требует доработки" : "отклонено";
  const statusColor = status === "ACCEPTED" ? "#10b981" : status === "NEEDS_REWORK" ? "#f59e0b" : "#ef4444";
  const statusEmoji = status === "ACCEPTED" ? "✅" : status === "NEEDS_REWORK" ? "⚠️" : "❌";

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      Домашнее задание проверено
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${userName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Ваше домашнее задание проверено учителем:
    </p>
    <div style="background-color: #f1f5f9; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
        ${assignmentTitle}
      </p>
      <p style="margin: 0 0 10px 0; color: ${statusColor}; font-size: 16px; font-weight: 600;">
        ${statusEmoji} Статус: ${statusText}
      </p>
      ${grade !== undefined ? `
      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
        Оценка: ${grade}/100
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
    ${status === "NEEDS_REWORK" ? `
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Пожалуйста, доработайте задание с учетом комментариев учителя и отправьте повторно.
    </p>
    ` : ""}
  `;

  const html = baseTemplate({
    title: "Домашнее задание проверено",
    preheader: `${assignmentTitle} - ${statusText}`,
    content,
    buttonText: "Посмотреть результат",
    buttonUrl: homeworkUrl,
  });

  const text = `
Домашнее задание проверено

Здравствуйте, ${userName}!

Ваше домашнее задание проверено учителем:

${assignmentTitle}
Статус: ${statusText}
${grade !== undefined ? `Оценка: ${grade}/100` : ""}

${teacherComment ? `Комментарий учителя:\n${teacherComment}\n` : ""}
${status === "NEEDS_REWORK" ? "\nПожалуйста, доработайте задание с учетом комментариев учителя и отправьте повторно.\n" : ""}

Посмотреть результат: ${homeworkUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `Домашнее задание "${assignmentTitle}" проверено - ${statusText}`,
    html,
    text,
  };
}
