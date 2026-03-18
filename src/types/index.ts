export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export type EnrollmentStatus = "ACTIVE" | "TRANSFERRED" | "REPEATING" | "KICKED";

export type LessonType = "LIVE" | "VIDEO" | "TEXT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  teacherId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Stream {
  id: string;
  name: string;
  level: string;
  schedule: string;
  teacherId: string;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  userId: string;
  streamId: string;
  status: EnrollmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  content?: string;
  streamId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Homework {
  id: string;
  title: string;
  lessonId: string;
  audioUrl?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
