/**
 * Gender separation rules for Islamic education compliance
 *
 * Rules:
 * - Female teachers can teach any group type (MALE_ONLY, FEMALE_ONLY, MIXED)
 * - Male teachers can only teach MALE_ONLY or MIXED groups
 * - Male teachers CANNOT create FEMALE_ONLY groups
 * - Students can only join streams matching their gender type
 * - Male students CANNOT send direct messages to female teachers
 * - Female students CAN send direct messages to any teacher
 */

import { Gender, StreamGenderType, Role } from "@prisma/client";

export interface GenderCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a teacher can create a stream of the given gender type
 */
export function canTeacherCreateStreamType(
  teacherGender: Gender,
  streamGenderType: StreamGenderType
): GenderCheckResult {
  // NOT_SPECIFIED gender cannot create streams
  if (teacherGender === Gender.NOT_SPECIFIED) {
    return {
      allowed: false,
      reason: "Необходимо указать пол в профиле перед созданием группы",
    };
  }

  // Female teachers can teach any group type
  if (teacherGender === Gender.FEMALE) {
    return { allowed: true };
  }

  // Male teachers cannot teach FEMALE_ONLY groups
  if (teacherGender === Gender.MALE && streamGenderType === StreamGenderType.FEMALE_ONLY) {
    return {
      allowed: false,
      reason: "Мужчина-учитель не может вести женскую группу согласно исламским нормам",
    };
  }

  // Male teachers can teach MALE_ONLY and MIXED groups
  return { allowed: true };
}

/**
 * Check if a student can join a stream based on gender compatibility
 */
export function canStudentJoinStream(
  studentGender: Gender,
  streamGenderType: StreamGenderType
): GenderCheckResult {
  // NOT_SPECIFIED gender cannot join streams
  if (studentGender === Gender.NOT_SPECIFIED) {
    return {
      allowed: false,
      reason: "Необходимо указать пол в профиле перед записью в группу",
    };
  }

  // MIXED streams accept everyone
  if (streamGenderType === StreamGenderType.MIXED) {
    return { allowed: true };
  }

  // MALE_ONLY streams only accept male students
  if (streamGenderType === StreamGenderType.MALE_ONLY) {
    if (studentGender === Gender.MALE) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Эта группа предназначена только для мужчин",
    };
  }

  // FEMALE_ONLY streams only accept female students
  if (streamGenderType === StreamGenderType.FEMALE_ONLY) {
    if (studentGender === Gender.FEMALE) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Эта группа предназначена только для женщин",
    };
  }

  return { allowed: false, reason: "Неизвестный тип группы" };
}

/**
 * Check if a user can send a direct message to another user
 *
 * Rules:
 * - Students CANNOT message other students (regardless of gender)
 * - Male students CANNOT message female teachers directly
 * - Female students CAN message any teacher
 * - Teachers CAN message any student in their streams
 * - Teachers CAN message other teachers
 * - Admins and moderators CAN message anyone
 */
export function canSendDirectMessage(
  senderGender: Gender,
  senderRole: Role,
  recipientGender: Gender,
  recipientRole: Role
): GenderCheckResult {
  // Admins and moderators can message anyone
  if (senderRole === Role.ADMIN || senderRole === Role.MODERATOR) {
    return { allowed: true };
  }

  // Students cannot message other students
  if (senderRole === Role.STUDENT && recipientRole === Role.STUDENT) {
    return {
      allowed: false,
      reason: "Студенты не могут писать друг другу напрямую. Используйте групповой чат",
    };
  }

  // Male students cannot message female teachers
  if (
    senderRole === Role.STUDENT &&
    senderGender === Gender.MALE &&
    recipientRole === Role.TEACHER &&
    recipientGender === Gender.FEMALE
  ) {
    return {
      allowed: false,
      reason: "Мужчина-студент не может писать женщине-учителю напрямую согласно исламским нормам. Используйте групповой чат",
    };
  }

  // Female students can message any teacher
  if (senderRole === Role.STUDENT && recipientRole === Role.TEACHER) {
    return { allowed: true };
  }

  // Teachers can message students and other teachers
  if (senderRole === Role.TEACHER) {
    return { allowed: true };
  }

  return { allowed: false, reason: "Недостаточно прав для отправки сообщения" };
}

/**
 * Get a human-readable label for stream gender type
 */
export function getStreamGenderTypeLabel(genderType: StreamGenderType): string {
  switch (genderType) {
    case StreamGenderType.MALE_ONLY:
      return "Только мужчины";
    case StreamGenderType.FEMALE_ONLY:
      return "Только женщины";
    case StreamGenderType.MIXED:
      return "Смешанная группа";
    default:
      return "Неизвестно";
  }
}

/**
 * Get an icon/emoji for stream gender type
 */
export function getStreamGenderTypeIcon(genderType: StreamGenderType): string {
  switch (genderType) {
    case StreamGenderType.MALE_ONLY:
      return "♂";
    case StreamGenderType.FEMALE_ONLY:
      return "♀";
    case StreamGenderType.MIXED:
      return "⚥";
    default:
      return "";
  }
}

/**
 * Get available stream gender types for a teacher
 */
export function getAvailableStreamTypes(teacherGender: Gender): StreamGenderType[] {
  if (teacherGender === Gender.FEMALE) {
    return [StreamGenderType.MALE_ONLY, StreamGenderType.FEMALE_ONLY, StreamGenderType.MIXED];
  }

  if (teacherGender === Gender.MALE) {
    return [StreamGenderType.MALE_ONLY, StreamGenderType.MIXED];
  }

  // NOT_SPECIFIED cannot create streams
  return [];
}
