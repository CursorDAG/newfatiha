import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { clearSettingsCache } from "@/lib/settings";

// GET /api/admin/settings - получить все настройки
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.platformSettings.findMany({
      orderBy: { category: "asc" },
    });

    // Группируем по категориям
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = setting.value;
      return acc;
    }, {} as Record<string, Record<string, unknown>>);

    return NextResponse.json(grouped);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - обновить настройки
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category, key, value } = body;

    if (!category || !key) {
      return NextResponse.json(
        { error: "Category and key are required" },
        { status: 400 }
      );
    }

    // Upsert настройку
    const setting = await prisma.platformSettings.upsert({
      where: { key },
      update: { value, category },
      create: { key, value, category },
    });

    // Очистить кеш
    clearSettingsCache();

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Failed to update setting:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
