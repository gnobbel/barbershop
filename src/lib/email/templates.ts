import type { Booking, Settings } from "@/db/schema";
import { siteUrl } from "@/lib/env";
import { formatDateTime, formatDuration, formatPrice, formatTime } from "@/lib/format";
import { buildIcs, googleCalendarUrl, sequenceFor } from "@/lib/ics";
import type { EmailMessage } from "./send";

const C = {
  bone: "#F4F0E8",
  paper: "#FBF9F5",
  ink: "#1F1C19",
  muted: "#6E665D",
  line: "#E3DCD1",
  accent: "#8B6A4F",
};
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Row = [label: string, value: string];

function layout(opts: {
  settings: Settings;
  eyebrow: string;
  heading: string;
  intro: string;
  rows?: Row[];
  actions?: { label: string; href: string; primary?: boolean }[];
  footnote?: string;
}) {
  const { settings: s } = opts;
  const rows = (opts.rows ?? [])
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:14px 0;border-top:1px solid ${C.line};font:500 11px/1.4 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.muted};width:110px;vertical-align:top;">${esc(label)}</td>
        <td style="padding:14px 0;border-top:1px solid ${C.line};font:400 15px/1.5 ${SANS};color:${C.ink};">${esc(value).replace(/\n/g, "<br>")}</td>
      </tr>`,
    )
    .join("");

  const actions = (opts.actions ?? [])
    .map((a) =>
      a.primary
        ? `<a href="${esc(a.href)}" style="display:inline-block;margin:0 10px 10px 0;padding:12px 22px;background:${C.ink};color:${C.paper};text-decoration:none;font:500 12px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;border-radius:2px;">${esc(a.label)}</a>`
        : `<a href="${esc(a.href)}" style="display:inline-block;margin:0 10px 10px 0;padding:11px 21px;border:1px solid ${C.line};color:${C.ink};text-decoration:none;font:500 12px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;border-radius:2px;">${esc(a.label)}</a>`,
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.bone};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bone};">
    <tr><td align="center" style="padding:48px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:0 0 28px;font:400 22px/1.2 ${SERIF};color:${C.ink};letter-spacing:.02em;">${esc(s.businessName)}</td></tr>
        <tr><td style="background:${C.paper};border:1px solid ${C.line};border-radius:2px;padding:40px 36px;">
          <div style="font:500 11px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.accent};margin-bottom:14px;">${esc(opts.eyebrow)}</div>
          <h1 style="margin:0 0 16px;font:400 32px/1.15 ${SERIF};color:${C.ink};">${esc(opts.heading)}</h1>
          <p style="margin:0 0 28px;font:400 15px/1.65 ${SANS};color:${C.muted};">${esc(opts.intro)}</p>
          ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${C.line};margin-bottom:28px;">${rows}</table>` : ""}
          ${actions ? `<div>${actions}</div>` : ""}
          ${opts.footnote ? `<p style="margin:18px 0 0;font:400 13px/1.6 ${SANS};color:${C.muted};">${esc(opts.footnote)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:24px 0 0;font:400 12px/1.6 ${SANS};color:${C.muted};">${esc(s.tagline)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function text(lines: (string | false | undefined)[]) {
  return lines.filter((l) => l !== false && l !== undefined).join("\n");
}

const manageUrl = (b: Booking) => `${siteUrl()}/booking/${b.manageToken}`;

function appointmentRows(b: Booking, s: Settings): Row[] {
  return [
    ["When", formatDateTime(b.startAt, s.timezone)],
    ["Service", `${s.serviceName} · ${formatDuration(s.durationMin)}`],
    ["Price", formatPrice(s.pricePence, s.currency)],
    ["Where", s.address],
  ];
}

function calendarEvent(b: Booking, s: Settings) {
  return {
    uid: `${b.id}@barbershop`,
    start: b.startAt,
    end: b.endAt,
    summary: `${s.serviceName} · ${s.businessName}`,
    description: `Manage or cancel: ${manageUrl(b)}`,
    location: s.address || undefined,
    url: manageUrl(b),
    sequence: sequenceFor(b.confirmedAt),
  };
}

function cutoffNote(s: Settings) {
  const contact = s.contact ? ` (${s.contact})` : "";
  return `Plans change. You can reschedule or cancel online up to ${s.cancelCutoffHours} hours before; after that, please message me directly${contact}.`;
}

export function confirmationEmail(b: Booking, s: Settings, rescheduled = false): EmailMessage {
  const when = formatDateTime(b.startAt, s.timezone);
  const firstName = b.name.split(" ")[0];
  const heading = rescheduled ? "Your new time is set" : "You're booked in";
  const intro = rescheduled
    ? `Thanks, ${firstName}. Your appointment has moved to ${when}.`
    : `Thanks, ${firstName}. I look forward to seeing you on ${when}.`;
  const event = calendarEvent(b, s);
  return {
    to: b.email!,
    subject: rescheduled
      ? `Rescheduled: ${s.serviceName}, ${when}`
      : `Confirmed: ${s.serviceName}, ${when}`,
    html: layout({
      settings: s,
      eyebrow: rescheduled ? "Rescheduled" : "Confirmed",
      heading,
      intro,
      rows: appointmentRows(b, s),
      actions: [
        { label: "Manage booking", href: manageUrl(b), primary: true },
        { label: "Add to Google Calendar", href: googleCalendarUrl(event) },
      ],
      footnote: cutoffNote(s),
    }),
    text: text([
      heading,
      "",
      intro,
      "",
      `When: ${when}`,
      `Service: ${s.serviceName} (${formatDuration(s.durationMin)})`,
      s.pricePence > 0 && `Price: ${formatPrice(s.pricePence, s.currency)}`,
      s.address && `Where: ${s.address}`,
      "",
      `Manage or cancel: ${manageUrl(b)}`,
      "",
      cutoffNote(s),
    ]),
    attachments: [
      {
        filename: "appointment.ics",
        content: buildIcs([event]),
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
      },
    ],
  };
}

export function reminderEmail(b: Booking, s: Settings): EmailMessage {
  const time = formatTime(b.startAt, s.timezone);
  const when = formatDateTime(b.startAt, s.timezone);
  const firstName = b.name.split(" ")[0];
  const intro = `A gentle reminder, ${firstName}: I'll see you tomorrow at ${time}.`;
  return {
    to: b.email!,
    subject: `Tomorrow at ${time}: ${s.serviceName}`,
    html: layout({
      settings: s,
      eyebrow: "Reminder",
      heading: "See you tomorrow",
      intro,
      rows: appointmentRows(b, s),
      actions: [{ label: "View booking", href: manageUrl(b), primary: true }],
      footnote: s.contact
        ? `Running late or can't make it? Message me at ${s.contact}.`
        : "Running late or can't make it? Just let me know.",
    }),
    text: text([
      "See you tomorrow",
      "",
      intro,
      "",
      `When: ${when}`,
      s.address && `Where: ${s.address}`,
      "",
      `Your booking: ${manageUrl(b)}`,
    ]),
  };
}

export function cancellationEmail(b: Booking, s: Settings, byBarber: boolean): EmailMessage {
  const when = formatDateTime(b.startAt, s.timezone);
  const firstName = b.name.split(" ")[0];
  const intro = byBarber
    ? `Sorry, ${firstName}. I've had to cancel your appointment on ${when}. Please pick another time that suits you.`
    : `Your appointment on ${when} has been cancelled. Whenever you're ready, you're welcome to book again.`;
  return {
    to: b.email!,
    subject: `Cancelled: ${s.serviceName}, ${when}`,
    html: layout({
      settings: s,
      eyebrow: "Cancelled",
      heading: "Appointment cancelled",
      intro,
      actions: [{ label: "Book another time", href: `${siteUrl()}/book`, primary: true }],
    }),
    text: text(["Appointment cancelled", "", intro, "", `Book again: ${siteUrl()}/book`]),
    attachments: [
      {
        filename: "cancelled.ics",
        content: buildIcs(
          [{ ...calendarEvent(b, s), cancelled: true, sequence: sequenceFor(new Date()) }],
          { method: "CANCEL" },
        ),
        contentType: "text/calendar; charset=utf-8; method=CANCEL",
      },
    ],
  };
}

export function adminAlertEmail(
  kind: "new" | "cancelled" | "rescheduled",
  b: Booking,
  s: Settings,
  to: string,
): EmailMessage {
  const when = formatDateTime(b.startAt, s.timezone);
  const verb = { new: "New booking", cancelled: "Cancelled", rescheduled: "Rescheduled" }[kind];
  const rows: Row[] = [
    ["When", when],
    ["Name", b.name],
    ["Email", b.email ?? ""],
    ["Phone", b.phone],
    ["Notes", b.notes],
  ];
  return {
    to,
    subject: `${verb}: ${b.name}, ${when}`,
    html: layout({
      settings: s,
      eyebrow: verb,
      heading: b.name,
      intro:
        kind === "cancelled"
          ? `This appointment has been cancelled, and the slot is open again.`
          : kind === "rescheduled"
            ? `This appointment has moved to a new time.`
            : `A new appointment has been booked.`,
      rows,
      actions: [{ label: "Open dashboard", href: `${siteUrl()}/admin`, primary: true }],
    }),
    text: text([
      `${verb}: ${b.name}`,
      "",
      ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      "",
      `${siteUrl()}/admin`,
    ]),
  };
}
