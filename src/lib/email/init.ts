import { createTransporter } from "@/lib/email/config";
import { logger } from "@/lib/logger";

/**
 * Инициализация email системы при старте сервера
 * Создаёт тестовый Ethereal аккаунт если нет SMTP настроек
 */
export async function initEmailSystem() {
  try {
    const transporter = await createTransporter();

    // Получаем конфиг без verify (может быть медленным)
    const config = transporter.options as { auth?: { user?: string; pass?: string } };

    logger.info("✅ Email система инициализирована");

    // Если используется Ethereal, выводим инструкцию
    if (config.host === "smtp.ethereal.email") {
      console.log("\n" + "=".repeat(80));
      console.log("⚠️  ВНИМАНИЕ: Используется тестовый email сервис Ethereal");
      console.log("=".repeat(80));
      console.log("\n📧 Письма НЕ будут доходить до реальных пользователей!");
      console.log("📧 Все письма можно посмотреть на: https://ethereal.email/messages");
      console.log(`📧 Логин: ${config.auth.user}`);
      console.log(`📧 Пароль: ${config.auth.pass}`);
      console.log("\n💡 Для отправки реальных писем настройте SMTP:");
      console.log("   1. Добавьте в .env:");
      console.log("      SMTP_HOST=smtp.gmail.com");
      console.log("      SMTP_PORT=587");
      console.log("      SMTP_USER=info@fatiha.ru");
      console.log("      SMTP_PASS=your-app-password");
      console.log("      SMTP_FROM=info@fatiha.ru");
      console.log("\n   2. Или через админку: /admin/settings → Email");
      console.log("\n   3. Перезапустите сервер");
      console.log("=".repeat(80) + "\n");
    } else {
      console.log("\n✅ Email система настроена и готова к работе");
      console.log(`📧 Письма отправляются от: ${config.from || "info@fatiha.ru"}\n`);
    }
  } catch (error) {
    logger.error({ error }, "❌ Ошибка инициализации email системы");
    console.error("\n❌ Не удалось инициализировать email систему");
    console.error("   Отправка писем может не работать");
    console.error("   Настройте SMTP в .env или через /admin/settings\n");
  }
}
