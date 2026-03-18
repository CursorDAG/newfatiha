import { baseTemplate } from "./base";

export interface QuizSubmittedData {
  teacherName: string;
  studentName: string;
  quizTitle: string;
  lessonTitle: string;
  streamName: string;
  submittedAt: string;
  reviewUrl: string;
  isVoiceQuiz: boolean;
}

export function quizSubmittedTemplate(data: QuizSubmittedData): { subject: string; html: string; text: string } {
  const { teacherName, studentName, quizTitle, lessonTitle, streamName, submittedAt, reviewUrl, isVoiceQuiz } = data;

  const quizType = isVoiceQuiz ? "голосовой тест" : "тест";

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      Студент сдал ${quizType}
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${teacherName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Студент <strong>${studentName}</strong> сдал ${quizType} и ожидает проверки:
    </p>
    <div style="background-color: #f1f5f9; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 18px; font-weight: 600;">
        ${quizTitle}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Урок: ${lessonTitle}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Студент: ${studentName}
      </p>
      <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
        Поток: ${streamName}
      </p>
      <p style="margin: 0; color: #64748b; font-size: 14px;">
        Сдано: ${submittedAt}
      </p>
      ${isVoiceQuiz ? `
      <div style="background-color: #fef3c7; padding: 10px; margin-top: 10px; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          🎤 Голосовой ответ требует прослушивания
        </p>
      </div>
      ` : ""}
    </div>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Пожалуйста, проверьте ${quizType} и поставьте оценку.
    </p>
  `;

  const html = baseTemplate({
    title: `Студент сдал ${quizType}`,
    preheader: `${studentName} - ${quizTitle}`,
    content,
    buttonText: "Проверить тест",
    buttonUrl: reviewUrl,
  });

  const text = `
Студент сдал ${quizType}

Здравствуйте, ${teacherName}!

Студент ${studentName} сдал ${quizType} и ожидает проверки:

${quizTitle}
Урок: ${lessonTitle}
Студент: ${studentName}
Поток: ${streamName}
Сдано: ${submittedAt}
${isVoiceQuiz ? "\n🎤 Голосовой ответ требует прослушивания\n" : ""}

Пожалуйста, проверьте ${quizType} и поставьте оценку.

Проверить тест: ${reviewUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `${studentName} сдал ${quizType} "${quizTitle}"`,
    html,
    text,
  };
}
