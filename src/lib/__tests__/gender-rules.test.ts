/**
 * Unit tests for gender separation rules
 */

import { describe, it, expect } from 'vitest';
import {
  canTeacherCreateStreamType,
  canStudentJoinStream,
  canSendDirectMessage,
  getStreamGenderTypeLabel,
  getStreamGenderTypeIcon,
  getAvailableStreamTypes,
} from '../gender-rules';
import { Gender, StreamGenderType, Role } from '@prisma/client';

describe('canTeacherCreateStreamType', () => {
  describe('Female teachers', () => {
    it('can create MALE_ONLY streams', () => {
      const result = canTeacherCreateStreamType(Gender.FEMALE, StreamGenderType.MALE_ONLY);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('can create FEMALE_ONLY streams', () => {
      const result = canTeacherCreateStreamType(Gender.FEMALE, StreamGenderType.FEMALE_ONLY);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('can create MIXED streams', () => {
      const result = canTeacherCreateStreamType(Gender.FEMALE, StreamGenderType.MIXED);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Male teachers', () => {
    it('can create MALE_ONLY streams', () => {
      const result = canTeacherCreateStreamType(Gender.MALE, StreamGenderType.MALE_ONLY);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('can create MIXED streams', () => {
      const result = canTeacherCreateStreamType(Gender.MALE, StreamGenderType.MIXED);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('CANNOT create FEMALE_ONLY streams', () => {
      const result = canTeacherCreateStreamType(Gender.MALE, StreamGenderType.FEMALE_ONLY);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Мужчина-учитель не может вести женскую группу согласно исламским нормам');
    });
  });

  describe('NOT_SPECIFIED gender', () => {
    it('cannot create any stream type', () => {
      const result = canTeacherCreateStreamType(Gender.NOT_SPECIFIED, StreamGenderType.MIXED);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Необходимо указать пол в профиле перед созданием группы');
    });
  });
});

describe('canStudentJoinStream', () => {
  describe('MIXED streams', () => {
    it('accept male students', () => {
      const result = canStudentJoinStream(Gender.MALE, StreamGenderType.MIXED);
      expect(result.allowed).toBe(true);
    });

    it('accept female students', () => {
      const result = canStudentJoinStream(Gender.FEMALE, StreamGenderType.MIXED);
      expect(result.allowed).toBe(true);
    });
  });

  describe('MALE_ONLY streams', () => {
    it('accept male students', () => {
      const result = canStudentJoinStream(Gender.MALE, StreamGenderType.MALE_ONLY);
      expect(result.allowed).toBe(true);
    });

    it('reject female students', () => {
      const result = canStudentJoinStream(Gender.FEMALE, StreamGenderType.MALE_ONLY);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Эта группа предназначена только для мужчин');
    });
  });

  describe('FEMALE_ONLY streams', () => {
    it('accept female students', () => {
      const result = canStudentJoinStream(Gender.FEMALE, StreamGenderType.FEMALE_ONLY);
      expect(result.allowed).toBe(true);
    });

    it('reject male students', () => {
      const result = canStudentJoinStream(Gender.MALE, StreamGenderType.FEMALE_ONLY);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Эта группа предназначена только для женщин');
    });
  });

  describe('NOT_SPECIFIED gender', () => {
    it('cannot join any stream', () => {
      const result = canStudentJoinStream(Gender.NOT_SPECIFIED, StreamGenderType.MIXED);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Необходимо указать пол в профиле перед записью в группу');
    });
  });
});

describe('canSendDirectMessage', () => {
  describe('Admin and Moderator privileges', () => {
    it('admins can message anyone', () => {
      const result = canSendDirectMessage(
        Gender.MALE,
        Role.ADMIN,
        Gender.FEMALE,
        Role.STUDENT
      );
      expect(result.allowed).toBe(true);
    });

    it('moderators can message anyone', () => {
      const result = canSendDirectMessage(
        Gender.MALE,
        Role.MODERATOR,
        Gender.FEMALE,
        Role.TEACHER
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('Student to student messaging', () => {
    it('students CANNOT message other students', () => {
      const result = canSendDirectMessage(
        Gender.MALE,
        Role.STUDENT,
        Gender.MALE,
        Role.STUDENT
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Студенты не могут писать друг другу напрямую. Используйте групповой чат');
    });
  });

  describe('Male student to female teacher', () => {
    it('male students CANNOT message female teachers', () => {
      const result = canSendDirectMessage(
        Gender.MALE,
        Role.STUDENT,
        Gender.FEMALE,
        Role.TEACHER
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Мужчина-студент не может писать женщине-учителю напрямую');
    });
  });

  describe('Female student to any teacher', () => {
    it('female students CAN message male teachers', () => {
      const result = canSendDirectMessage(
        Gender.FEMALE,
        Role.STUDENT,
        Gender.MALE,
        Role.TEACHER
      );
      expect(result.allowed).toBe(true);
    });

    it('female students CAN message female teachers', () => {
      const result = canSendDirectMessage(
        Gender.FEMALE,
        Role.STUDENT,
        Gender.FEMALE,
        Role.TEACHER
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('Male student to male teacher', () => {
    it('male students CAN message male teachers', () => {
      const result = canSendDirectMessage(
        Gender.MALE,
        Role.STUDENT,
        Gender.MALE,
        Role.TEACHER
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('Teacher messaging', () => {
    it('teachers can message students', () => {
      const result = canSendDirectMessage(
        Gender.MALE,
        Role.TEACHER,
        Gender.FEMALE,
        Role.STUDENT
      );
      expect(result.allowed).toBe(true);
    });

    it('teachers can message other teachers', () => {
      const result = canSendDirectMessage(
        Gender.MALE,
        Role.TEACHER,
        Gender.FEMALE,
        Role.TEACHER
      );
      expect(result.allowed).toBe(true);
    });
  });
});

describe('getStreamGenderTypeLabel', () => {
  it('returns correct label for MALE_ONLY', () => {
    expect(getStreamGenderTypeLabel(StreamGenderType.MALE_ONLY)).toBe('Только мужчины');
  });

  it('returns correct label for FEMALE_ONLY', () => {
    expect(getStreamGenderTypeLabel(StreamGenderType.FEMALE_ONLY)).toBe('Только женщины');
  });

  it('returns correct label for MIXED', () => {
    expect(getStreamGenderTypeLabel(StreamGenderType.MIXED)).toBe('Смешанная группа');
  });
});

describe('getStreamGenderTypeIcon', () => {
  it('returns correct icon for MALE_ONLY', () => {
    expect(getStreamGenderTypeIcon(StreamGenderType.MALE_ONLY)).toBe('♂');
  });

  it('returns correct icon for FEMALE_ONLY', () => {
    expect(getStreamGenderTypeIcon(StreamGenderType.FEMALE_ONLY)).toBe('♀');
  });

  it('returns correct icon for MIXED', () => {
    expect(getStreamGenderTypeIcon(StreamGenderType.MIXED)).toBe('⚥');
  });
});

describe('getAvailableStreamTypes', () => {
  it('female teachers get all stream types', () => {
    const types = getAvailableStreamTypes(Gender.FEMALE);
    expect(types).toEqual([
      StreamGenderType.MALE_ONLY,
      StreamGenderType.FEMALE_ONLY,
      StreamGenderType.MIXED,
    ]);
  });

  it('male teachers get only MALE_ONLY and MIXED', () => {
    const types = getAvailableStreamTypes(Gender.MALE);
    expect(types).toEqual([StreamGenderType.MALE_ONLY, StreamGenderType.MIXED]);
  });

  it('NOT_SPECIFIED gender gets no stream types', () => {
    const types = getAvailableStreamTypes(Gender.NOT_SPECIFIED);
    expect(types).toEqual([]);
  });
});
