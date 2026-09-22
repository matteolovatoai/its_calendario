import test from 'node:test';
import assert from 'node:assert';
import {
  ROME_TIMEZONE,
  getRomeParts,
  getRomeDateString,
  formatRomeTime,
  formatRomeTimeRange,
  formatRomeDate,
  formatRomeMonthYear,
  romeToUtcIso,
  addDaysToDateStr,
  getMondayOfRomeWeek,
  getWeekBoundsUtc,
  getLessonGridPosition,
} from './timezone';

test('ROME_TIMEZONE constant is Europe/Rome', () => {
  assert.strictEqual(ROME_TIMEZONE, 'Europe/Rome');
});

test('getRomeParts handles CEST (summer time UTC+2)', () => {
  // 07:30 UTC in June is 09:30 in Rome
  const parts = getRomeParts('2026-06-15T07:30:00.000Z');
  assert.strictEqual(parts.year, 2026);
  assert.strictEqual(parts.month, 6);
  assert.strictEqual(parts.day, 15);
  assert.strictEqual(parts.hour, 9);
  assert.strictEqual(parts.minute, 30);
  assert.strictEqual(parts.dayOfWeek, 1); // Monday
});

test('getRomeParts handles CET (winter time UTC+1)', () => {
  // 08:00 UTC in January is 09:00 in Rome
  const parts = getRomeParts('2026-01-15T08:00:00.000Z');
  assert.strictEqual(parts.year, 2026);
  assert.strictEqual(parts.month, 1);
  assert.strictEqual(parts.day, 15);
  assert.strictEqual(parts.hour, 9);
  assert.strictEqual(parts.minute, 0);
  assert.strictEqual(parts.dayOfWeek, 4); // Thursday
});

test('getRomeParts handles day rollover across UTC and Rome', () => {
  // Sunday 22:30 UTC in summer is Monday 00:30 in Rome
  const parts = getRomeParts('2026-06-14T22:30:00.000Z');
  assert.strictEqual(parts.year, 2026);
  assert.strictEqual(parts.month, 6);
  assert.strictEqual(parts.day, 15);
  assert.strictEqual(parts.hour, 0);
  assert.strictEqual(parts.minute, 30);
  assert.strictEqual(parts.dayOfWeek, 1); // Monday in Rome
});

test('formatRomeTime and formatRomeTimeRange', () => {
  const start = '2026-09-22T07:00:00.000Z'; // 09:00 Rome
  const end = '2026-09-22T11:00:00.000Z'; // 13:00 Rome
  assert.strictEqual(formatRomeTime(start), '09:00');
  assert.strictEqual(formatRomeTime(end), '13:00');
  assert.strictEqual(formatRomeTimeRange(start, end), '09:00 - 13:00');
});

test('formatRomeDate formats in Italian with Rome timezone', () => {
  const date = '2026-09-22T07:00:00.000Z';
  const formatted = formatRomeDate(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  assert.strictEqual(formatted, 'martedì 22 settembre 2026');
});

test('formatRomeMonthYear formats month and year', () => {
  assert.strictEqual(formatRomeMonthYear('2026-09-22T07:00:00.000Z'), 'settembre 2026');
});

test('romeToUtcIso converts summer date accurately', () => {
  const iso = romeToUtcIso('2026-09-22', '09:00');
  assert.strictEqual(iso, '2026-09-22T07:00:00.000Z');
});

test('romeToUtcIso converts winter date accurately', () => {
  const iso = romeToUtcIso('2026-01-15', '09:00');
  assert.strictEqual(iso, '2026-01-15T08:00:00.000Z');
});

test('romeToUtcIso and getRomeParts roundtrip', () => {
  const dateStr = '2026-05-18';
  const timeStr = '14:45';
  const iso = romeToUtcIso(dateStr, timeStr);
  assert.strictEqual(getRomeDateString(iso), dateStr);
  assert.strictEqual(formatRomeTime(iso), timeStr);
});

test('getMondayOfRomeWeek returns correct Monday', () => {
  // 2026-09-22 is Tuesday
  assert.strictEqual(getMondayOfRomeWeek('2026-09-22T08:00:00.000Z'), '2026-09-21');
  // 2026-09-27 is Sunday
  assert.strictEqual(getMondayOfRomeWeek('2026-09-27T08:00:00.000Z'), '2026-09-21');
  // 2026-09-21 is Monday
  assert.strictEqual(getMondayOfRomeWeek('2026-09-21T08:00:00.000Z'), '2026-09-21');
  // 2026-03-01 is Sunday
  assert.strictEqual(getMondayOfRomeWeek('2026-03-01T12:00:00.000Z'), '2026-02-23');
});

test('addDaysToDateStr works across months and years', () => {
  assert.strictEqual(addDaysToDateStr('2026-09-21', 7), '2026-09-28');
  assert.strictEqual(addDaysToDateStr('2026-09-21', -7), '2026-09-14');
  assert.strictEqual(addDaysToDateStr('2026-02-28', 1), '2026-03-01');
  assert.strictEqual(addDaysToDateStr('2026-12-31', 1), '2027-01-01');
});

test('getWeekBoundsUtc covers Monday 00:00 to Sunday 23:59:59.999 in Rome', () => {
  const bounds = getWeekBoundsUtc('2026-09-21');
  // Monday 00:00 in Rome (UTC+2 in Sep) is Sunday 22:00 UTC
  assert.strictEqual(bounds.startUtc, '2026-09-20T22:00:00.000Z');
  // Sunday 23:59:59.999 in Rome is Sunday 21:59:59.999 UTC
  assert.strictEqual(bounds.endUtc, '2026-09-27T21:59:59.999Z');
});

test('getLessonGridPosition positions on Monday 09:00 to 13:00 (15-min slots)', () => {
  // Monday 09:00-13:00 Rome is 07:00-11:00 UTC
  const pos = getLessonGridPosition({
    start_time: '2026-09-21T07:00:00.000Z',
    end_time: '2026-09-21T11:00:00.000Z',
  });
  assert.notStrictEqual(pos, null);
  assert.strictEqual(pos?.gridColumn, 1);
  assert.strictEqual(pos?.gridRowStart, 5); // 09:00 is (9 - 8) * 4 + 1 = 5
  assert.strictEqual(pos?.gridRowEnd, 21); // 13:00 is (13 - 8) * 4 + 1 = 21
});

test('getLessonGridPosition positions 15-minute non-hour event (08:15 to 10:45)', () => {
  // 08:15-10:45 Rome is 06:15-08:45 UTC
  const pos = getLessonGridPosition({
    start_time: '2026-09-21T06:15:00.000Z',
    end_time: '2026-09-21T08:45:00.000Z',
  });
  assert.notStrictEqual(pos, null);
  assert.strictEqual(pos?.gridColumn, 1);
  assert.strictEqual(pos?.gridRowStart, 2); // 08:15 is slot 1 -> row 2
  assert.strictEqual(pos?.gridRowEnd, 12); // 10:45 is slot 11 -> row 12
});

test('getLessonGridPosition handles single 15-minute slot (08:00 to 08:15)', () => {
  const pos = getLessonGridPosition({
    start_time: '2026-09-21T06:00:00.000Z',
    end_time: '2026-09-21T06:15:00.000Z',
  });
  assert.notStrictEqual(pos, null);
  assert.strictEqual(pos?.gridRowStart, 1);
  assert.strictEqual(pos?.gridRowEnd, 2);
});

test('getLessonGridPosition ignores weekend lessons', () => {
  // Saturday
  const pos = getLessonGridPosition({
    start_time: '2026-09-26T07:00:00.000Z',
    end_time: '2026-09-26T11:00:00.000Z',
  });
  assert.strictEqual(pos, null);
});

