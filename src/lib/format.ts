const LOCALE = "en-GB";

export function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function dateParts(date: Date, timeZone: string, withYear: boolean) {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Assembled by hand: ICU versions disagree on commas ("Sunday, 1 November").
  return [get("weekday"), get("day"), get("month"), withYear && get("year")]
    .filter(Boolean)
    .join(" ");
}

/** "Saturday 8 November" */
export function formatDayLong(date: Date, timeZone: string) {
  return dateParts(date, timeZone, false);
}

/** "Saturday 8 November 2026 at 14:30" */
export function formatDateTime(date: Date, timeZone: string) {
  return `${dateParts(date, timeZone, true)} at ${formatTime(date, timeZone)}`;
}

/** Parts of a yyyy-MM-dd key for the date picker. The key is a plain calendar date. */
export function dayKeyParts(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", ...opts }).format(date);
  return {
    weekdayShort: fmt({ weekday: "short" }),
    weekdayLong: fmt({ weekday: "long" }),
    day: d,
    monthShort: fmt({ month: "short" }),
    monthLong: fmt({ month: "long" }),
    year: y,
  };
}

export function formatPrice(pence: number, currency: string) {
  if (!pence) return "";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100);
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Monday-first order, as people read a week. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "Thu 15 Oct" */
export function formatDayShort(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")}`;
}

/** "Today", "Tomorrow" or "Thu 15 Oct", judged in the barber's timezone. */
export function relativeDay(date: Date, timeZone: string, now = new Date()) {
  const key = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(d);
  if (key(date) === key(now)) return "Today";
  if (key(date) === key(new Date(now.getTime() + 24 * 60 * 60_000))) return "Tomorrow";
  return formatDayShort(date, timeZone);
}

/** "Atelier Noor" → "AN" */
export function initials(name: string) {
  const words = name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
