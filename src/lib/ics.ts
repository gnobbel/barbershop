type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  cancelled?: boolean;
  /** Bump when the event changes so calendar apps replace the old copy. */
  sequence?: number;
};

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

/** Lines longer than 75 octets must be folded (RFC 5545 §3.1). */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

function eventLines(e: IcsEvent, now: Date) {
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SEQUENCE:${e.sequence ?? 0}`,
    `SUMMARY:${escape(e.summary)}`,
    e.description ? `DESCRIPTION:${escape(e.description)}` : "",
    e.location ? `LOCATION:${escape(e.location)}` : "",
    e.url ? `URL:${e.url}` : "",
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
  ].filter(Boolean);
}

export function buildIcs(
  events: IcsEvent[],
  opts: { name?: string; method?: "PUBLISH" | "CANCEL" } = {},
) {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barbershop//Bookings//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${opts.method ?? "PUBLISH"}`,
    opts.name ? `X-WR-CALNAME:${escape(opts.name)}` : "",
    ...events.flatMap((e) => eventLines(e, now)),
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: Omit<IcsEvent, "uid">) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.summary,
    dates: `${stamp(e.start)}/${stamp(e.end)}`,
    details: e.description ?? "",
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Monotonic per-change number for SEQUENCE (minutes since 2024). */
export function sequenceFor(date: Date) {
  return Math.max(0, Math.floor((date.getTime() - Date.UTC(2024, 0, 1)) / 60_000));
}
