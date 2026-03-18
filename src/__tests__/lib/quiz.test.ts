import { describe, it, expect } from 'vitest';
import { bestQuizStatusWithTimestamp } from '@/lib/quiz';
import { QuizSubmissionStatus } from '@prisma/client';

describe('bestQuizStatusWithTimestamp', () => {
  it('should prioritize PASSED status', () => {
    const submissions = [
      { status: QuizSubmissionStatus.SUBMITTED, createdAt: new Date('2024-01-03') },
      { status: QuizSubmissionStatus.FAILED, createdAt: new Date('2024-01-02') },
      { status: QuizSubmissionStatus.PASSED, createdAt: new Date('2024-01-01') },
    ];
    const result = bestQuizStatusWithTimestamp(submissions);
    expect(result.status).toBe(QuizSubmissionStatus.PASSED);
    expect(result.createdAt).toEqual(new Date('2024-01-01'));
  });

  it('should return most recent PASSED when multiple exist', () => {
    const submissions = [
      { status: QuizSubmissionStatus.PASSED, createdAt: new Date('2024-01-01') },
      { status: QuizSubmissionStatus.PASSED, createdAt: new Date('2024-01-03') },
      { status: QuizSubmissionStatus.PASSED, createdAt: new Date('2024-01-02') },
    ];
    const result = bestQuizStatusWithTimestamp(submissions);
    expect(result.status).toBe(QuizSubmissionStatus.PASSED);
    expect(result.createdAt).toEqual(new Date('2024-01-03'));
  });

  it('should prioritize FAILED over SUBMITTED when no PASSED', () => {
    const submissions = [
      { status: QuizSubmissionStatus.SUBMITTED, createdAt: new Date('2024-01-03') },
      { status: QuizSubmissionStatus.FAILED, createdAt: new Date('2024-01-01') },
      { status: QuizSubmissionStatus.SUBMITTED, createdAt: new Date('2024-01-02') },
    ];
    const result = bestQuizStatusWithTimestamp(submissions);
    expect(result.status).toBe(QuizSubmissionStatus.FAILED);
    expect(result.createdAt).toEqual(new Date('2024-01-01'));
  });

  it('should return most recent FAILED when multiple exist and no PASSED', () => {
    const submissions = [
      { status: QuizSubmissionStatus.FAILED, createdAt: new Date('2024-01-01') },
      { status: QuizSubmissionStatus.SUBMITTED, createdAt: new Date('2024-01-04') },
      { status: QuizSubmissionStatus.FAILED, createdAt: new Date('2024-01-03') },
    ];
    const result = bestQuizStatusWithTimestamp(submissions);
    expect(result.status).toBe(QuizSubmissionStatus.FAILED);
    expect(result.createdAt).toEqual(new Date('2024-01-03'));
  });

  it('should return most recent SUBMITTED when only SUBMITTED exist', () => {
    const submissions = [
      { status: QuizSubmissionStatus.SUBMITTED, createdAt: new Date('2024-01-01') },
      { status: QuizSubmissionStatus.SUBMITTED, createdAt: new Date('2024-01-03') },
      { status: QuizSubmissionStatus.SUBMITTED, createdAt: new Date('2024-01-02') },
    ];
    const result = bestQuizStatusWithTimestamp(submissions);
    expect(result.status).toBe(QuizSubmissionStatus.SUBMITTED);
    expect(result.createdAt).toEqual(new Date('2024-01-03'));
  });

  it('should handle single submission', () => {
    const submissions = [
      { status: QuizSubmissionStatus.SUBMITTED, createdAt: new Date('2024-01-01') },
    ];
    const result = bestQuizStatusWithTimestamp(submissions);
    expect(result.status).toBe(QuizSubmissionStatus.SUBMITTED);
    expect(result.createdAt).toEqual(new Date('2024-01-01'));
  });
});
