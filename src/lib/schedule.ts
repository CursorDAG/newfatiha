/**
 * Schedule slot validation and formatting utilities
 */

export type SlotInput = {
  dayOfWeek: number;
  startMinutes: number;
  durationMinutes: number;
};

/**
 * Validates a schedule slot
 * @param slot - The slot to validate
 * @returns true if the slot is valid
 */
export function isValidSlot(slot: SlotInput): boolean {
  return (
    Number.isInteger(slot.dayOfWeek) &&
    slot.dayOfWeek >= 0 &&
    slot.dayOfWeek <= 6 &&
    Number.isInteger(slot.startMinutes) &&
    slot.startMinutes >= 0 &&
    slot.startMinutes < 24 * 60 &&
    Number.isInteger(slot.durationMinutes) &&
    slot.durationMinutes > 0 &&
    slot.durationMinutes % 30 === 0 &&
    slot.startMinutes + slot.durationMinutes <= 24 * 60
  );
}

/**
 * Checks if two slots overlap
 * @param a - First slot
 * @param b - Second slot
 * @returns true if slots overlap
 */
export function overlaps(a: SlotInput, b: SlotInput): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  const aEnd = a.startMinutes + a.durationMinutes;
  const bEnd = b.startMinutes + b.durationMinutes;
  return a.startMinutes < bEnd && b.startMinutes < aEnd;
}

/**
 * Converts slots to human-readable schedule text
 * @param slots - Array of schedule slots
 * @returns Formatted schedule string
 */
export function slotsToScheduleText(slots: SlotInput[]): string {
  if (!slots.length) return "";
  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const toTime = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const normalized = [...slots].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinutes - b.startMinutes
  );
  return normalized
    .map(
      (s) =>
        `${dayNames[s.dayOfWeek]} ${toTime(s.startMinutes)}–${toTime(s.startMinutes + s.durationMinutes)}`
    )
    .join(", ");
}
