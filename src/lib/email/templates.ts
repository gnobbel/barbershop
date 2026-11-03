import type { Booking, Settings } from "@/db/schema";
import { siteUrl } from "@/lib/env";
import {
  capitalize,
  formatDateTime,
  formatDuration,
  formatPrice,
  formatTime,
  relativeDay,
} from "@/lib/format";
import { buildIcs, googleCalendarUrl, sequenceFor } from "@/lib/ics";
import { whatsappNumber, whatsappUrl } from "@/lib/whatsapp";
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
    .replace(/^(the|de|het)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
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
    ["Wanneer", formatDateTime(b.startAt, s.timezone)],
    ["Wat", `${s.serviceName} · ${formatDuration(s.durationMin)}`],
    ["Prijs", formatPrice(s.pricePence, s.currency)],
    ["Waar", s.address],
  ];
}

function calendarEvent(b: Booking, s: Settings) {
  return {
    uid: `${b.id}@barbershop`,
    start: b.startAt,
    end: b.endAt,
    summary: `${s.serviceName} · ${s.businessName}`,
    description: `Wijzigen of annuleren: ${manageUrl(b)}`,
    location: s.address || undefined,
    url: manageUrl(b),
    sequence: sequenceFor(b.confirmedAt),
  };
}

/** How to reach the barber directly: WhatsApp if set, else the contact line. */
function directContact(s: Settings) {
  return s.whatsapp ? `WhatsApp ${s.whatsapp}` : s.contact;
}

function whatsappAction(s: Settings, b: Booking) {
  const wa = s.whatsapp ? whatsappNumber(s.whatsapp, s.timezone) : null;
  if (!wa) return [];
  const text = `Hoi! Met ${b.name.split(" ")[0]}, over mijn afspraak op ${formatDateTime(b.startAt, s.timezone)}: `;
  return [{ label: "Stuur een WhatsApp", href: whatsappUrl(wa, text) }];
}

function cutoffNote(s: Settings) {
  const contact = directContact(s) ? ` (${directContact(s)})` : "";
  return `Plannen veranderen. Tot ${s.cancelCutoffHours} uur van tevoren kun je zelf online verzetten of annuleren; daarna stuur je me even een berichtje${contact}.`;
}

export function confirmationEmail(b: Booking, s: Settings, rescheduled = false): EmailMessage {
  const when = formatDateTime(b.startAt, s.timezone);
  const firstName = b.name.split(" ")[0];
  const heading = rescheduled ? "Je nieuwe tijd staat vast" : "Je staat erin";
  const intro = rescheduled
    ? `Dank je, ${firstName}. Je afspraak is verzet naar ${when}.`
    : `Dank je, ${firstName}. Tot ${when}!`;
  const event = calendarEvent(b, s);
  return {
    to: b.email!,
    subject: rescheduled
      ? `Verzet: ${s.serviceName}, ${when}`
      : `Bevestigd: ${s.serviceName}, ${when}`,
    html: layout({
      settings: s,
      eyebrow: rescheduled ? "Verzet" : "Bevestigd",
      heading,
      intro,
      rows: appointmentRows(b, s),
      actions: [
        { label: "Afspraak bekijken", href: manageUrl(b), primary: true },
        { label: "Zet in Google Agenda", href: googleCalendarUrl(event) },
      ],
      footnote: cutoffNote(s),
    }),
    text: text([
      heading,
      "",
      intro,
      "",
      `Wanneer: ${when}`,
      `Wat: ${s.serviceName} (${formatDuration(s.durationMin)})`,
      s.pricePence > 0 && `Prijs: ${formatPrice(s.pricePence, s.currency)}`,
      s.address && `Waar: ${s.address}`,
      "",
      `Wijzigen of annuleren: ${manageUrl(b)}`,
      "",
      cutoffNote(s),
    ]),
    attachments: [
      {
        filename: "afspraak.ics",
        content: buildIcs([event]),
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
      },
    ],
  };
}

export function reminderEmail(b: Booking, s: Settings, now = new Date()): EmailMessage {
  const time = formatTime(b.startAt, s.timezone);
  const when = formatDateTime(b.startAt, s.timezone);
  const firstName = b.name.split(" ")[0];
  // Usually "morgen", but a late reminder run can land on the day itself.
  const day = relativeDay(b.startAt, s.timezone, now);
  const heading = `Tot ${day}`;
  const intro = `Even een herinnering, ${firstName}: tot ${day} om ${time}.`;
  return {
    to: b.email!,
    subject: `${capitalize(day)} om ${time}: ${s.serviceName}`,
    html: layout({
      settings: s,
      eyebrow: "Herinnering",
      heading,
      intro,
      rows: appointmentRows(b, s),
      actions: [{ label: "Afspraak bekijken", href: manageUrl(b), primary: true }, ...whatsappAction(s, b)],
      footnote: directContact(s)
        ? `Later of lukt het niet? Laat het me weten: ${directContact(s)}.`
        : "Later of lukt het niet? Laat het me even weten.",
    }),
    text: text([
      heading,
      "",
      intro,
      "",
      `Wanneer: ${when}`,
      s.address && `Waar: ${s.address}`,
      "",
      `Je afspraak: ${manageUrl(b)}`,
    ]),
  };
}

export function cancellationEmail(b: Booking, s: Settings, byBarber: boolean): EmailMessage {
  const when = formatDateTime(b.startAt, s.timezone);
  const firstName = b.name.split(" ")[0];
  const intro = byBarber
    ? `Sorry, ${firstName}. Ik moest je afspraak op ${when} annuleren. Kies gerust een andere tijd die je uitkomt.`
    : `Je afspraak op ${when} is geannuleerd. Je bent welkom om een nieuwe afspraak te maken wanneer het je uitkomt.`;
  return {
    to: b.email!,
    subject: `Geannuleerd: ${s.serviceName}, ${when}`,
    html: layout({
      settings: s,
      eyebrow: "Geannuleerd",
      heading: "Afspraak geannuleerd",
      intro,
      actions: [{ label: "Nieuwe afspraak maken", href: `${siteUrl()}/#book`, primary: true }],
    }),
    text: text(["Afspraak geannuleerd", "", intro, "", `Nieuwe afspraak maken: ${siteUrl()}/`]),
    attachments: [
      {
        filename: "geannuleerd.ics",
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
  const verb = { new: "Nieuwe afspraak", cancelled: "Geannuleerd", rescheduled: "Verzet" }[kind];
  const rows: Row[] = [
    ["Wanneer", when],
    ["Naam", b.name],
    ["E-mail", b.email ?? ""],
    ["Telefoon", b.phone],
    ["Opmerkingen", b.notes],
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
          ? `Deze afspraak is geannuleerd; de plek is weer vrij.`
          : kind === "rescheduled"
            ? `Deze afspraak is naar een nieuwe tijd verzet.`
            : `Er is een nieuwe afspraak gemaakt.`,
      rows,
      actions: [{ label: "Naar je afspraken", href: `${siteUrl()}/admin`, primary: true }],
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
