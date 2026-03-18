import { baseTemplate } from "./base";

export interface HomeworkDeadlineData {
  userName: string;
  assignmentTitle: string;
  streamName: string;
  deadline: string;
  timeRemaining: string;
  homeworkUrl: string;
}

export function homeworkDeadlineTemplate(data: HomeworkDeadlineData): { subject: string; html: string; text: string } {
  const { userName, assignmentTitle, streamName, deadline, timeRemaining, homeworkUrl } = data;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      ⏰ Приближается дедлайн
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${userName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Напоминаем, что скоро истекает срок сдачи домашнего задания:
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
        ${assignmentTitle}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Поток: ${streamName}
      </p>
      <p style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">
        Дедлайн: ${deadline}
      </p>
      <p style="margin: 0; color: #f59e0b; font-size: 14px; font-weight: 600;">
        Осталось: ${timeRemaining}
      </p>
    </div>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Не забудьте сдать задание вовремя!
    </p>
  `;

  const html = baseTemplate({
    title: "Приближается дедлайн домашнего задания",
    preheader: `${assignmentTitle} - осталось ${timeRemaining}`,
    content,
    buttonText: "Сдать задание",
    buttonUrl: homeworkUrl,
  });

  const text = `
⏰ Приближается дедлайн

Здравствуйте, ${userName}!

Напоминаем, что скоро истекает срок сдачи домашнего задания:

${assignmentTitle}
Поток: ${streamName}
Дедлайн: ${deadline}
Осталось: ${timeRemaining}

Не забудьте сдать задание вовремя!

Сдать задание: ${homeworkUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `⏰ Дедлайн "${assignmentTitle}" через ${timeRemaining}`,
    html,
    text,
  };
}
