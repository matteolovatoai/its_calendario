export const ROME_TIMEZONE = 'Europe/Rome';

export interface RomeDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
}

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Extracts date and time components formatted in Europe/Rome timezone.
 */
export function getRomeParts(date: Date | string | number): RomeDateParts {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ROME_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(d).map((p) => [p.type, p.value]));
  const year = parseInt(parts.year, 10);
  const month = parseInt(parts.month, 10);
  const day = parseInt(parts.day, 10);
  const hour = parseInt(parts.hour, 10) % 24;
  const minute = parseInt(parts.minute, 10);
  const second = parseInt(parts.second, 10);
  const millisecond = d.getUTCMilliseconds();
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return { year, month, day, hour, minute, second, millisecond, dayOfWeek };
}

/**
 * Returns date in Rome as "YYYY-MM-DD".
 */
export function getRomeDateString(date: Date | string | number): string {
  const p = getRomeParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/**
 * Returns today's date in Rome as "YYYY-MM-DD".
 */
export function getRomeTodayString(): string {
  return getRomeDateString(new Date());
}

/**
 * Returns time in Rome as "HH:mm".
 */
export function formatRomeTime(date: Date | string | number): string {
  const p = getRomeParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Returns time range in Rome as "HH:mm - HH:mm".
 */
export function formatRomeTimeRange(
  start: Date | string | number,
  end: Date | string | number
): string {
  return `${formatRomeTime(start)} - ${formatRomeTime(end)}`;
}

/**
 * Formats date in Rome using Intl.DateTimeFormat with locale.
 */
export function formatRomeDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale = 'it-IT'
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: ROME_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Formats month and year in Rome (e.g. "settembre 2026").
 */
export function formatRomeMonthYear(date: Date | string | number, locale = 'it-IT'): string {
  return formatRomeDate(date, { month: 'long', year: 'numeric' }, locale);
}

/**
 * Converts a date string ("YYYY-MM-DD") and time string ("HH:mm" or "HH:mm:ss")
 * specified in Europe/Rome into a UTC ISO 8601 string.
 */
export function romeToUtcIso(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const timeParts = timeStr.split(':');
  const hour = parseInt(timeParts[0], 10);
  const minute = parseInt(timeParts[1], 10);
  const second = timeParts[2] ? parseFloat(timeParts[2]) : 0;
  const secInt = Math.floor(second);
  const ms = Math.round((second - secInt) * 1000);

  // Initial estimate assuming UTC
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, secInt, ms));
  let rome = getRomeParts(utcGuess);
  let romeTimeAsUtc = Date.UTC(rome.year, rome.month - 1, rome.day, rome.hour, rome.minute, rome.second, ms);
  let diff = romeTimeAsUtc - utcGuess.getTime();
  let targetUtc = new Date(utcGuess.getTime() - diff);

  // Refinement pass for DST boundaries
  rome = getRomeParts(targetUtc);
  romeTimeAsUtc = Date.UTC(rome.year, rome.month - 1, rome.day, rome.hour, rome.minute, rome.second, ms);
  diff = romeTimeAsUtc - targetUtc.getTime();
  targetUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, secInt, ms) - diff);

  return targetUtc.toISOString();
}

/**
 * Adds or subtracts days from a "YYYY-MM-DD" date string without timezone skew.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  return `${utcDate.getUTCFullYear()}-${pad(utcDate.getUTCMonth() + 1)}-${pad(utcDate.getUTCDate())}`;
}

/**
 * Returns the "YYYY-MM-DD" string of the Monday of the week containing the given date in Rome.
 */
export function getMondayOfRomeWeek(date: Date | string | number = new Date()): string {
  const parts = getRomeParts(date);
  const diffDays = parts.dayOfWeek === 0 ? 6 : parts.dayOfWeek - 1;
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - diffDays));
  return `${utcDate.getUTCFullYear()}-${pad(utcDate.getUTCMonth() + 1)}-${pad(utcDate.getUTCDate())}`;
}

/**
 * Returns the UTC ISO strings bounding the entire Monday-to-Sunday week in Rome.
 */
export function getWeekBoundsUtc(mondayDateStr: string): { startUtc: string; endUtc: string } {
  const startUtc = romeToUtcIso(mondayDateStr, '00:00:00');
  const sundayDateStr = addDaysToDateStr(mondayDateStr, 6);
  const endUtc = romeToUtcIso(sundayDateStr, '23:59:59.999');
  return { startUtc, endUtc };
}

export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 18;
export const DEFAULT_SLOTS_PER_HOUR = 4;
export const DEFAULT_SLOT_MINUTES = 15;

export interface LessonGridPosition {
  gridRowStart: number;
  gridRowEnd: number;
  gridColumn: number;
}

/**
 * Calculates CSS grid positions based on Rome local time.
 * Column: 1 (Mon) to 5 (Fri).
 * Rows: 15-minute logical slot offset from startHour (4 slots per hour).
 */
export function getLessonGridPosition(
  lesson: { start_time: string; end_time: string },
  startHour: number = DEFAULT_START_HOUR,
  slotMinutes: number = DEFAULT_SLOT_MINUTES
): LessonGridPosition | null {
  const startParts = getRomeParts(lesson.start_time);
  const endParts = getRomeParts(lesson.end_time);

  const dayOfWeek = startParts.dayOfWeek;
  if (dayOfWeek < 1 || dayOfWeek > 5) return null;

  const startMinutes = (startParts.hour - startHour) * 60 + startParts.minute;
  const endMinutes = (endParts.hour - startHour) * 60 + endParts.minute;

  const startSlot = Math.round(startMinutes / slotMinutes);
  const endSlot = Math.round(endMinutes / slotMinutes);

  const gridRowStart = startSlot + 1;
  const gridRowEnd = Math.max(gridRowStart + 1, endSlot + 1);
  const gridColumn = dayOfWeek;

  return { gridRowStart, gridRowEnd, gridColumn };
}
