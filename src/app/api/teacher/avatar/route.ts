import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * POST /api/teacher/avatar
 * Accepts multipart/form-data with a "file" field.
 * Saves to public/uploads/avatars/{userId}.{ext} and updates user.avatar.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Невалидный multipart запрос" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Файл не найден в запросе" }, { status: 400 });
  }

  const mimeType = file.type;
  if (!ALLOWED_MIME.includes(mimeType)) {
    return NextResponse.json(
      { error: "Допустимые форматы: JPEG, PNG, WebP, GIF" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Размер файла не должен превышать 2 МБ" },
      { status: 400 },
    );
  }

  const ext = EXT_MAP[mimeType] ?? "jpg";
  const fileName = `${session.user.id}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
  const filePath = path.join(uploadsDir, fileName);

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(filePath, buffer);

  const avatarUrl = `/uploads/avatars/${fileName}`;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar: avatarUrl },
  });

  return NextResponse.json({ success: true, url: avatarUrl });
}
