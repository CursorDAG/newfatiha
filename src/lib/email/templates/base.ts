/**
 * Base HTML template for all emails
 * Uses inline CSS for email client compatibility
 */

export interface BaseTemplateParams {
  title: string;
  preheader?: string;
  previewText?: string; // Alias for preheader
  content: string;
  buttonText?: string;
  buttonUrl?: string;
}

export function baseTemplate(params: BaseTemplateParams): string {
  const { title, preheader, previewText, content, buttonText, buttonUrl } = params;
  const preheaderText = preheader || previewText;

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 0 10px !important;
      }
      .content {
        padding: 24px 20px !important;
      }
      .logo-text {
        font-size: 20px !important;
      }
      .logo-icon {
        width: 40px !important;
        height: 40px !important;
        font-size: 22px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  ${preheaderText ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheaderText}</div>` : ""}

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f1f5f9;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 30px; text-align: center; position: relative;">
              <!-- Logo -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 16px;">
                <tr>
                  <td style="text-align: center;">
                    <div class="logo-icon" style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #047857 100%); border-radius: 12px; line-height: 48px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">
                      <span style="color: #ffffff; font-size: 26px; font-weight: 700;">ف</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Brand name -->
              <h1 class="logo-text" style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                Fatiha<span style="color: #d1fae5;">.ru</span>
              </h1>
              <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 13px; font-weight: 500;">Исламское образование онлайн</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 40px 30px;">
              ${content}

              ${buttonText && buttonUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 32px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${buttonUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ""}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-weight: 500;">
                © ${new Date().getFullYear()} Fatiha.ru. Все права защищены.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Это автоматическое уведомление. Пожалуйста, не отвечайте на это письмо.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
