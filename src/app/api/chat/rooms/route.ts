/**
 * GET /api/chat/rooms - List user's chat rooms
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { withErrorHandling } from "@/lib/api-handler";
import { AuthError } from "@/lib/errors";

export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized");
  }

  const userId = session.user.id;
  const userRole = session.user.role;

  let groupChats: any[] = [];

  // For STUDENTS: Get GROUP chats from enrollments
  if (userRole === "STUDENT") {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        stream: {
          include: {
            chatRoom: {
              include: {
                messages: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  include: {
                    sender: {
                      select: {
                        id: true,
                        name: true,
                        avatar: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    groupChats = enrollments
      .filter((e) => e.stream.chatRoom && e.stream.chatEnabled)
      .map((e) => {
        const room = e.stream.chatRoom!;
        return {
          id: room.id,
          type: "GROUP" as const,
          name: e.stream.name,
          streamId: e.stream.id,
          lastMessage: room.messages[0] || null,
          unreadCount: 0, // TODO: implement unread tracking
          createdAt: room.createdAt,
        };
      });
  }

  // For TEACHERS/ADMINS: Get GROUP chats from streams they teach
  if (userRole === "TEACHER" || userRole === "ADMIN") {
    const teacherStreams = await prisma.stream.findMany({
      where: {
        teacherId: userId,
        chatEnabled: true,
      },
      include: {
        chatRoom: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
        course: {
          select: {
            title: true,
          },
        },
      },
    });

    groupChats = teacherStreams
      .filter((s) => s.chatRoom)
      .map((s) => {
        const room = s.chatRoom!;
        return {
          id: room.id,
          type: "GROUP" as const,
          name: `${s.name} (${s.course.title})`,
          streamId: s.id,
          lastMessage: room.messages[0] || null,
          unreadCount: 0, // TODO: implement unread tracking
          createdAt: room.createdAt,
        };
      });
  }

  // Get DIRECT chats
  const directChats = await prisma.chatRoom.findMany({
    where: {
      type: "DIRECT",
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    },
    include: {
      participant1: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
        },
      },
      participant2: {
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  const directChatsList = directChats.map((room) => {
    const otherUser =
      room.participant1Id === userId ? room.participant2 : room.participant1;
    return {
      id: room.id,
      type: "DIRECT" as const,
      name: otherUser?.name || "Unknown",
      otherUser,
      lastMessage: room.messages[0] || null,
      unreadCount: 0, // TODO: implement unread tracking
      createdAt: room.createdAt,
    };
  });

  // Combine and sort by last message time
  const allChats = [...groupChats, ...directChatsList].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt || a.createdAt;
    const bTime = b.lastMessage?.createdAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return NextResponse.json({ rooms: allChats });
});
