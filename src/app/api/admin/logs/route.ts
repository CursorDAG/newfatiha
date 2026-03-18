import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

/**
 * GET /api/admin/logs
 * Системные логи (заглушка для development)
 */
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new AuthError("Unauthorized");
  }

  const url = new URL(req.url);
  url.searchParams.get("level"); // TODO: use for filtering when logging system is ready

  // TODO: В production читать из файла логов или БД
  // Сейчас возвращаем заглушку
  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "Логи доступны только в production",
      context: {},
    },
  ];

  return NextResponse.json({ logs });
});
