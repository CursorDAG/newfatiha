/**
 * Tests for chat permissions
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  canAccessRoom,
  canSendDirectMessage,
  canDeleteMessage,
  canEditMessage,
} from "@/lib/chat-permissions";
import { Role, Gender } from "@prisma/client";

describe("Chat Permissions", () => {
  let teacherId: string;
  let studentId: string;
  let maleStudentId: string;
  let femaleTeacherId: string;
  let streamId: string;
  let courseId: string;
  let groupRoomId: string;
  let directRoomId: string;

  beforeEach(async () => {
    // Clean up first - proper order to avoid foreign key constraints
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
    await prisma.teacherProfile.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const teacher = await prisma.user.create({
      data: {
        email: "teacher-chat@test.com",
        name: "Test Teacher",
        password: "hash",
        role: Role.TEACHER,
        gender: Gender.MALE,
      },
    });
    teacherId = teacher.id;

    const femaleTeacher = await prisma.user.create({
      data: {
        email: "female-teacher@test.com",
        name: "Female Teacher",
        password: "hash",
        role: Role.TEACHER,
        gender: Gender.FEMALE,
      },
    });
    femaleTeacherId = femaleTeacher.id;

    const student = await prisma.user.create({
      data: {
        email: "student-chat@test.com",
        name: "Test Student",
        password: "hash",
        role: Role.STUDENT,
        gender: Gender.FEMALE,
      },
    });
    studentId = student.id;

    const maleStudent = await prisma.user.create({
      data: {
        email: "male-student@test.com",
        name: "Male Student",
        password: "hash",
        role: Role.STUDENT,
        gender: Gender.MALE,
      },
    });
    maleStudentId = maleStudent.id;

    // Create course and stream
    const course = await prisma.course.create({
      data: {
        title: "Test Course",
        teacherId,
      },
    });
    courseId = course.id;

    const stream = await prisma.stream.create({
      data: {
        name: "Test Stream",
        level: "Beginner",
        schedule: "Mon 10:00",
        teacherId,
        courseId,
      },
    });
    streamId = stream.id;

    // Create enrollment
    await prisma.enrollment.create({
      data: {
        userId: studentId,
        streamId,
        status: "ACTIVE",
      },
    });

    // Create group chat room
    const groupRoom = await prisma.chatRoom.create({
      data: {
        type: "GROUP",
        streamId,
      },
    });
    groupRoomId = groupRoom.id;

    // Create direct chat room
    const directRoom = await prisma.chatRoom.create({
      data: {
        type: "DIRECT",
        participant1Id: teacherId,
        participant2Id: studentId,
      },
    });
    directRoomId = directRoom.id;
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

  describe("canAccessRoom", () => {
    it("should allow enrolled student to access group chat", async () => {
      const result = await canAccessRoom(studentId, groupRoomId);
      expect(result).toBe(true);
    });

    it("should allow teacher to access their group chat", async () => {
      const result = await canAccessRoom(teacherId, groupRoomId);
      expect(result).toBe(true);
    });

    it("should deny access to non-enrolled student", async () => {
      const result = await canAccessRoom(maleStudentId, groupRoomId);
      expect(result).toBe(false);
    });

    it("should allow participants to access direct chat", async () => {
      const result1 = await canAccessRoom(teacherId, directRoomId);
      const result2 = await canAccessRoom(studentId, directRoomId);
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it("should deny access to non-participants in direct chat", async () => {
      const result = await canAccessRoom(maleStudentId, directRoomId);
      expect(result).toBe(false);
    });
  });

  describe("canSendDirectMessage", () => {
    it("should allow student to message their teacher", async () => {
      const result = await canSendDirectMessage(studentId, teacherId);
      expect(result).toBe(true);
    });

    it("should deny student messaging another student", async () => {
      const result = await canSendDirectMessage(studentId, maleStudentId);
      expect(result).toBe(false);
    });

    it("should deny male student messaging female teacher", async () => {
      // First enroll male student
      await prisma.enrollment.create({
        data: {
          userId: maleStudentId,
          streamId,
          status: "ACTIVE",
        },
      });

      const result = await canSendDirectMessage(maleStudentId, femaleTeacherId);
      expect(result).toBe(false);
    });

    it("should allow teachers to message each other", async () => {
      const result = await canSendDirectMessage(teacherId, femaleTeacherId);
      expect(result).toBe(true);
    });
  });

  describe("canDeleteMessage", () => {
    it("should allow user to delete their own message", async () => {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: studentId,
          content: "Test message",
        },
      });

      const result = await canDeleteMessage(studentId, message.id);
      expect(result).toBe(true);
    });

    it("should allow teacher to delete any message in their group chat", async () => {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: studentId,
          content: "Test message",
        },
      });

      const result = await canDeleteMessage(teacherId, message.id);
      expect(result).toBe(true);
    });

    it("should deny student deleting another student's message", async () => {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: maleStudentId,
          content: "Test message",
        },
      });

      const result = await canDeleteMessage(studentId, message.id);
      expect(result).toBe(false);
    });
  });

  describe("canEditMessage", () => {
    it("should allow user to edit their recent message", async () => {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: studentId,
          content: "Test message",
        },
      });

      const result = await canEditMessage(studentId, message.id);
      expect(result).toBe(true);
    });

    it("should deny editing message older than 15 minutes", async () => {
      const oldDate = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: studentId,
          content: "Test message",
          createdAt: oldDate,
        },
      });

      const result = await canEditMessage(studentId, message.id);
      expect(result).toBe(false);
    });

    it("should deny editing another user's message", async () => {
      const message = await prisma.chatMessage.create({
        data: {
          roomId: groupRoomId,
          senderId: teacherId,
          content: "Test message",
        },
      });

      const result = await canEditMessage(studentId, message.id);
      expect(result).toBe(false);
    });
  });
});
