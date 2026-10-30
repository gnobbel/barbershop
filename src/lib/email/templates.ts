import type { Booking, Settings } from "@/db/schema";
import { siteUrl } from "@/lib/env";
import { formatDateTime, formatDuration, formatPrice, formatTime } from "@/lib/format";
import { buildIcs, googleCalendarUrl, sequenceFor } from "@/lib/ics";
import type { EmailMessage } from "./send";

const C = {
  bone: "#F5F2ED",
  paper: "#FBFAF7",
  white: "#FFFFFF",
  chip: "#ECE8E1",
  ink: "#1F1F1F",
  muted: "#6B665F",
  line: "#E6E1D9",
  go: "#3E9B5F",
};
const SANS =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

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
      ([label, value], i) => `
      <tr>
        <td style="padding:13px 0;${i ? `border-top:1px solid ${C.line};` : ""}font:500 14px/1.4 ${SANS};color:${C.muted};width:96px;vertical-align:top;">${esc(label)}</td>
        <td style="padding:13px 0;${i ? `border-top:1px solid ${C.line};` : ""}font:600 15px/1.45 ${SANS};color:${C.ink};text-align:right;">${esc(value).replace(/\n/g, "<br>")}</td>
      </tr>`,
    )
    .join("");

  const button = (a: { label: string; href: string; primary?: boolean }) =>
    a.primary
      ? `<a href="${esc(a.href)}" style="display:inline-block;margin:0 8px 10px 0;padding:14px 24px;background:${C.ink};color:#ffffff;text-decoration:none;font:600 15px/1 ${SANS};border-radius:999px;">${esc(a.label)}</a>`
      : `<a href="${esc(a.href)}" style="display:inline-block;margin:0 8px 10px 0;padding:13px 23px;background:${C.paper};border:1px solid ${C.line};color:${C.ink};text-decoration:none;font:600 15px/1 ${SANS};border-radius:999px;">${esc(a.label)}</a>`;
  const actions = (opts.actions ?? []).map(button).join("");

  const initials = s.businessName
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${C.bone};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bone};">
    <tr><td align="center" style="padding:36px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:0 4px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:36px;height:36px;border-radius:999px;background:${C.ink};color:#ffffff;font:700 13px/36px ${SANS};text-align:center;">${esc(initials)}</td>
            <td style="padding-left:10px;font:700 16px/1 ${SANS};color:${C.ink};letter-spacing:-0.01em;">${esc(s.businessName)}</td>
          </tr></table>
        </td></tr>
        <tr><td style="background:${C.paper};border:1px solid ${C.line};border-radius:20px;padding:32px 28px;">
          <span style="display:inline-block;margin-bottom:16px;padding:5px 12px;border-radius:999px;background:${C.chip};font:600 13px/1.2 ${SANS};color:${C.ink};">${esc(opts.eyebrow)}</span>
          <h1 style="margin:0 0 10px;font:800 28px/1.15 ${SANS};letter-spacing:-0.03em;color:${C.ink};">${esc(opts.heading)}</h1>
          <p style="margin:0 0 24px;font:400 15px/1.6 ${SANS};color:${C.muted};">${esc(opts.intro)}</p>
          ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.white};border:1px solid ${C.line};border-radius:14px;margin-bottom:24px;"><tr><td style="padding:2px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr></table>` : ""}
          ${actions ? `<div>${actions}</div>` : ""}
          ${opts.footnote ? `<p style="margin:14px 0 0;font:400 13px/1.6 ${SANS};color:${C.muted};">${esc(opts.footnote)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:18px 4px 0;font:400 12px/1.6 ${SANS};color:${C.muted};">${esc(s.businessName)}${s.address ? ` · ${esc(s.address.split("\n")[0])}` : ""}</td></tr>
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
      actions: [{ label: "Book another time", href: `${siteUrl()}/#book`, primary: true }],
    }),
    text: text(["Appointment cancelled", "", intro, "", `Book again: ${siteUrl()}/`]),
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
