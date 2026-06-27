import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId, bookId, isRequired } = await req.json();

  const courseBook = await prisma.courseBook.create({
    data: {
      courseId,
      bookId,
      isRequired: isRequired ?? true,
      addedById: session.user.id,
    },
  });

  return NextResponse.json({ success: true, courseBook });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !["TEACHER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  await prisma.courseBook.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
