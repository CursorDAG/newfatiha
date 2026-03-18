import { describe, it, expect } from 'vitest';
import { isValidSlot, overlaps, slotsToScheduleText, type SlotInput } from '@/lib/schedule';

describe('isValidSlot', () => {
  it('should accept valid slots', () => {
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: 600, durationMinutes: 90 })).toBe(true);
    expect(isValidSlot({ dayOfWeek: 0, startMinutes: 0, durationMinutes: 30 })).toBe(true);
    expect(isValidSlot({ dayOfWeek: 6, startMinutes: 1380, durationMinutes: 60 })).toBe(true);
  });

  it('should reject invalid day of week', () => {
    expect(isValidSlot({ dayOfWeek: -1, startMinutes: 600, durationMinutes: 90 })).toBe(false);
    expect(isValidSlot({ dayOfWeek: 7, startMinutes: 600, durationMinutes: 90 })).toBe(false);
    expect(isValidSlot({ dayOfWeek: 1.5, startMinutes: 600, durationMinutes: 90 })).toBe(false);
  });

  it('should reject invalid start minutes', () => {
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: -1, durationMinutes: 90 })).toBe(false);
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: 1440, durationMinutes: 90 })).toBe(false);
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: 600.5, durationMinutes: 90 })).toBe(false);
  });

  it('should reject invalid duration', () => {
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: 600, durationMinutes: 0 })).toBe(false);
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: 600, durationMinutes: -30 })).toBe(false);
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: 600, durationMinutes: 45 })).toBe(false); // Not multiple of 30
  });

  it('should reject slots that extend past midnight', () => {
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: 1400, durationMinutes: 60 })).toBe(false);
    expect(isValidSlot({ dayOfWeek: 1, startMinutes: 1410, durationMinutes: 30 })).toBe(true); // 23:30-00:00 is valid
  });
});

describe('overlaps', () => {
  it('should detect overlapping slots on same day', () => {
    const slot1: SlotInput = { dayOfWeek: 1, startMinutes: 600, durationMinutes: 90 };
    const slot2: SlotInput = { dayOfWeek: 1, startMinutes: 630, durationMinutes: 60 };
    expect(overlaps(slot1, slot2)).toBe(true);
    expect(overlaps(slot2, slot1)).toBe(true);
  });

  it('should not detect overlap on different days', () => {
    const slot1: SlotInput = { dayOfWeek: 1, startMinutes: 600, durationMinutes: 90 };
    const slot2: SlotInput = { dayOfWeek: 2, startMinutes: 600, durationMinutes: 90 };
    expect(overlaps(slot1, slot2)).toBe(false);
  });

  it('should not detect overlap for adjacent slots', () => {
    const slot1: SlotInput = { dayOfWeek: 1, startMinutes: 600, durationMinutes: 90 };
    const slot2: SlotInput = { dayOfWeek: 1, startMinutes: 690, durationMinutes: 60 };
    expect(overlaps(slot1, slot2)).toBe(false);
  });

  it('should detect overlap when one slot contains another', () => {
    const slot1: SlotInput = { dayOfWeek: 1, startMinutes: 600, durationMinutes: 120 };
    const slot2: SlotInput = { dayOfWeek: 1, startMinutes: 630, durationMinutes: 30 };
    expect(overlaps(slot1, slot2)).toBe(true);
  });
});

describe('slotsToScheduleText', () => {
  it('should return empty string for empty array', () => {
    expect(slotsToScheduleText([])).toBe('');
  });

  it('should format single slot correctly', () => {
    const slots: SlotInput[] = [{ dayOfWeek: 1, startMinutes: 600, durationMinutes: 90 }];
    expect(slotsToScheduleText(slots)).toBe('Пн 10:00–11:30');
  });

  it('should format multiple slots sorted by day and time', () => {
    const slots: SlotInput[] = [
      { dayOfWeek: 3, startMinutes: 600, durationMinutes: 90 },
      { dayOfWeek: 1, startMinutes: 600, durationMinutes: 90 },
      { dayOfWeek: 5, startMinutes: 600, durationMinutes: 90 },
    ];
    expect(slotsToScheduleText(slots)).toBe('Пн 10:00–11:30, Ср 10:00–11:30, Пт 10:00–11:30');
  });

  it('should handle slots at midnight and end of day', () => {
    const slots: SlotInput[] = [
      { dayOfWeek: 0, startMinutes: 0, durationMinutes: 30 },
      { dayOfWeek: 6, startMinutes: 1410, durationMinutes: 30 },
    ];
    expect(slotsToScheduleText(slots)).toBe('Вс 00:00–00:30, Сб 23:30–24:00');
  });
});
