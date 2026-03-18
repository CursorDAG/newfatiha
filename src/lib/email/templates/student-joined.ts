import { baseTemplate } from "./base";

export interface StudentJoinedData {
  teacherName: string;
  studentName: string;
  studentEmail: string;
  streamName: string;
  courseName: string;
  joinedAt: string;
  profileUrl: string;
}

export function studentJoinedTemplate(data: StudentJoinedData): { subject: string; html: string; text: string } {
  const { teacherName, studentName, studentEmail, streamName, courseName, joinedAt, profileUrl } = data;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      Новый студент присоединился к потоку
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${teacherName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      К вашему потоку присоединился новый студент:
    </p>
    <div style="background-color: #f1f5f9; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
        ${studentName}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Email: ${studentEmail}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Поток: ${streamName}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Курс: ${courseName}
      </p>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Присоединился: ${joinedAt}
      </p>
    </div>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Вы можете посмотреть профиль студента и отслеживать его прогресс.
    </p>
  `;

  const html = baseTemplate({
    title: "Новый студент присоединился к потоку",
    preheader: `${studentName} - ${streamName}`,
    content,
    buttonText: "Посмотреть профиль",
    buttonUrl: profileUrl,
  });

  const text = `
Новый студент присоединился к потоку

Здравствуйте, ${teacherName}!

К вашему потоку присоединился новый студент:

${studentName}
Email: ${studentEmail}
Поток: ${streamName}
Курс: ${courseName}
Присоединился: ${joinedAt}

Вы можете посмотреть профиль студента и отслеживать его прогресс.

Посмотреть профиль: ${profileUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `Новый студент: ${studentName} присоединился к "${streamName}"`,
    html,
    text,
  };
}
