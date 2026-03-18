/**
 * Integration tests for chat API
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { Role, Gender } from "@prisma/client";

describe("Chat API Integration", () => {
  let teacherId: string;
  let studentId: string;
  let streamId: string;
  let courseId: string;
  let groupRoomId: string;

  beforeEach(async () => {
    // Clean up first
    await prisma.chatMessage.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.homeworkSubmission.deleteMany();
    await prisma.homeworkAssignment.deleteMany();
    await prisma.homework.deleteMany();
    await prisma.lessonQuizSubmission.deleteMany();
    await prisma.lessonQuizOption.deleteMany();
    await prisma.lessonQuizQuestion.deleteMany();
    await prisma.lessonQuiz.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.streamScheduleSlot.deleteMany();
    await prisma.stream.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();

    // Create test data
    const teacher = await prisma.user.create({
      data: {
        email: "teacher-api@test.com",
        name: "API Teacher",
        password: "hash",
        role: Role.TEACHER,
        gender: Gender.MALE,
      },
    });
    teacherId = teacher.id;

    const student = await prisma.user.create({
      data: {
        email: "student-api@test.com",
        name: "API Student",
        password: "hash",
        role: Role.STUDENT,
        gender: Gender.FEMALE,
      },
    });
    studentId = student.id;

    const course = await prisma.course.create({
      data: {
        title: "API Test Course",
        teacherId,
      },
    });
    courseId = course.id;

    const stream = await prisma.stream.create({
      data: {
        name: "API Test Stream",
        level: "Beginner",
        schedule: "Mon 10:00",
        teacherId,
        courseId,
      },
    });
    streamId = stream.id;

    await prisma.enrollment.create({
      data: {
        userId: studentId,
        streamId,
        status: "ACTIVE",
      },
    });

    const groupRoom = await prisma.chatRoom.create({
      data: {
        type: "GROUP",
        streamId,
      },
    });
    groupRoomId = groupRoom.id;
  });

  afterEach(async () => {
    // Clean up in correct order (respecting foreign keys)
    await prisma.chatMessage.deleteMany();
    await prisma.chatRoom.deleteMany();
    await prisma.homeworkSubmission.deleteMany();
    await prisma.homeworkAssignment.deleteMany();
    await prisma.homework.deleteMany();
    await prisma.lessonQuizSubmission.deleteMany();
    await prisma.lessonQuizOption.deleteMany();
    await prisma.lessonQuizQuestion.deleteMany();
    await prisma.lessonQuiz.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.streamScheduleSlot.deleteMany();
    await prisma.stream.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();
  });

  describe("GET /api/chat/rooms", () => {
    it("should return user's chat rooms", async () => {
      const rooms = await prisma.chatRoom.findMany({
        where: {
          OR: [
            { streamId: { in: [streamId] } },
            { participant1Id: studentId },
            { participant2Id: studentId },
          ],
        },
      });

      expect(rooms.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/chat/rooms/direct", () => {
    it("should create direct chat room", async () => {
      const room = await prisma.chatRoom.create({
        data: {
          type: "DIRECT",
          participant1Id: studentId,
          participant2Id: teacherId,
        },
      });

      expect(room.type).toBe("DIRECT");
      expect(room.participant1Id).toBe(studentId);
      expect(room.participant2Id).toBe(teacherId);
    });

    it("should return existing room if already exists", async () => {
      const room1 = await prisma.chatRoom.create({
        data: {
          type: "DIRECT",
          participant1Id: studentId,
          participant2Id: teacherId,
        },
      });

      const existingRoom = await prisma.chatRoom.findFirst({
        where: {
          type: "DIRECT",
          OR: [
            {
              participant1Id: studentId,
              participant2Id: teacherId,
            },
            {
              participant1Id: teacherId,
              participant2Id: studentId,
            },
          ],
        },
      });

      expect(existingRoom?.id).toBe(room1.id);
    });
  });

  describe("POST /api/chat/messages", () => {
    it("should create message in room", async () => {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: studentId,
          content: "Test message",
        },
      });

      expect(message.content).toBe("Test message");
      expect(message.senderId).toBe(studentId);
      expect(message.roomId).toBe(groupRoomId);
    });
  });

  describe("PATCH /api/chat/messages/[messageId]", () => {
    it("should edit message", async () => {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: studentId,
          content: "Original content",
        },
      });

      const updated = await prisma.chatMessage.update({
        where: { id: message.id },
        data: {
          content: "Updated content",
          isEdited: true,
          editedAt: new Date(),
        },
      });

      expect(updated.content).toBe("Updated content");
      expect(updated.isEdited).toBe(true);
    });
  });

  describe("DELETE /api/chat/messages/[messageId]", () => {
    it("should soft delete message", async () => {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: studentId,
          content: "To be deleted",
        },
      });

      const deleted = await prisma.chatMessage.update({
        where: { id: message.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      expect(deleted.isDeleted).toBe(true);
      expect(deleted.deletedAt).toBeTruthy();
    });
  });
});
