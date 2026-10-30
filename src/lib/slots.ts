import { TZDate } from "@date-fns/tz";

export type Interval = { startAt: Date; endAt: Date };
export type HoursRange = { weekday: number; startMin: number; endMin: number };

export type SlotInput = {
  now: Date;
  timeZone: string;
  durationMin: number;
  bufferMin: number;
  minNoticeHours: number;
  windowDays: number;
  weeklyHours: HoursRange[];
  timeOff: Interval[];
  /** Confirmed bookings only. */
  bookings: Interval[];
};

export type DaySlots = {
  /** Local calendar date in the barber's timezone, yyyy-MM-dd */
  date: string;
  slots: Date[];
};

const MINUTE = 60_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** The wall-clock date (y, m, d) of `date` in `timeZone`. */
export function localDateParts(date: Date, timeZone: string) {
  const local = new TZDate(date, timeZone);
  return { y: local.getFullYear(), m: local.getMonth(), d: local.getDate() };
}

/** A local wall-clock time in `timeZone` as an absolute instant. */
export function zonedTime(
  y: number,
  m: number,
  d: number,
  minutes: number,
  timeZone: string,
): Date {
  return new Date(
    new TZDate(y, m, d, Math.floor(minutes / 60), minutes % 60, timeZone).getTime(),
  );
}

/** Parse "yyyy-MM-dd" + minutes-from-midnight in `timeZone`. */
export function parseLocal(dateStr: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return zonedTime(y, m - 1, d, minutes, timeZone);
}

export function dateKey(y: number, m: number, d: number) {
  // Normalise overflow (e.g. d = 32) through a UTC date, which has no DST quirks.
  const n = new Date(Date.UTC(y, m, d));
  return `${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}-${pad(n.getUTCDate())}`;
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd;

/**
 * Every bookable start time, grouped by local day, from today until the end
 * of the booking window. Days without openings are omitted.
 *
 * Start times step by (duration + buffer) from the start of each opening
 * range, so a day packs neatly. A slot is offered when:
 *  - the whole cut fits inside the opening range,
 *  - it is at least `minNoticeHours` from now,
 *  - it doesn't touch any time off,
 *  - it keeps `bufferMin` clear on both sides of every existing booking.
 */
export function generateSlots(input: SlotInput): DaySlots[] {
  const {
    now,
    timeZone,
    durationMin,
    bufferMin,
    minNoticeHours,
    windowDays,
    weeklyHours,
    timeOff,
    bookings,
  } = input;

  const step = Math.max(durationMin + bufferMin, 5);
  const earliest = now.getTime() + minNoticeHours * 60 * MINUTE;
  const durationMs = durationMin * MINUTE;
  const bufferMs = bufferMin * MINUTE;

  const blocked = [
    ...timeOff.map((t) => [t.startAt.getTime(), t.endAt.getTime()] as const),
    ...bookings.map(
      (b) => [b.startAt.getTime() - bufferMs, b.endAt.getTime() + bufferMs] as const,
    ),
  ];

  const today = localDateParts(now, timeZone);
  const days: DaySlots[] = [];

  for (let i = 0; i <= windowDays; i++) {
    const key = dateKey(today.y, today.m, today.d + i);
    const [y, m, d] = key.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

    const ranges = weeklyHours
      .filter((r) => r.weekday === weekday)
      .sort((a, b) => a.startMin - b.startMin);

    const slots: Date[] = [];
    const seen = new Set<number>();

    for (const range of ranges) {
      const rangeEnd = zonedTime(y, m - 1, d, range.endMin, timeZone).getTime();
      for (let min = range.startMin; min + durationMin <= range.endMin; min += step) {
        const start = zonedTime(y, m - 1, d, min, timeZone).getTime();
        const end = start + durationMs;
        if (end > rangeEnd) break;
        if (start < earliest || seen.has(start)) continue;
        if (blocked.some(([bs, be]) => overlaps(start, end, bs, be))) continue;
        seen.add(start);
        slots.push(new Date(start));
      }
    }

    if (slots.length) {
      slots.sort((a, b) => a.getTime() - b.getTime());
      days.push({ date: key, slots });
    }
  }

  return days;
}

/** True when `start` is one of the slots `generateSlots` would offer. */
export function isSlotAvailable(input: SlotInput, start: Date): boolean {
  const t = start.getTime();
  return generateSlots(input).some((day) => day.slots.some((s) => s.getTime() === t));
}

export function minutesToTime(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null;
  return h * 60 + m;
}
