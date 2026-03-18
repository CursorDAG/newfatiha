import { baseTemplate } from "./base";

export interface NewMessageData {
  userName: string;
  senderName: string;
  messagePreview: string;
  messageUrl: string;
}

export function newMessageTemplate(data: NewMessageData): { subject: string; html: string; text: string } {
  const { userName, senderName, messagePreview, messageUrl } = data;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
      Новое сообщение
    </h2>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Здравствуйте, ${userName}!
    </p>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Вам пришло новое сообщение от <strong>${senderName}</strong>:
    </p>
    <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6; font-style: italic;">
        "${messagePreview}"
      </p>
    </div>
    <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
      Нажмите кнопку ниже, чтобы прочитать полное сообщение и ответить.
    </p>
  `;

  const html = baseTemplate({
    title: "Новое сообщение",
    preheader: `${senderName}: ${messagePreview.substring(0, 50)}...`,
    content,
    buttonText: "Прочитать сообщение",
    buttonUrl: messageUrl,
  });

  const text = `
Новое сообщение

Здравствуйте, ${userName}!

Вам пришло новое сообщение от ${senderName}:

"${messagePreview}"

Прочитать сообщение: ${messageUrl}

© ${new Date().getFullYear()} Fatiha.ru
  `.trim();

  return {
    subject: `Новое сообщение от ${senderName}`,
    html,
    text,
  };
}
