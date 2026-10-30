import { describe, expect, it } from "vitest";
import { isReminderDue } from "@/lib/reminders";
import { buildIcs } from "@/lib/ics";

const H = 60 * 60_000;
const now = new Date("2026-11-06T10:00:00Z");

const booking = (overrides: Partial<Parameters<typeof isReminderDue>[0]> = {}) => ({
  status: "confirmed",
  email: "friend@example.com",
  startAt: new Date(now.getTime() + 23 * H),
  confirmedAt: new Date(now.getTime() - 5 * 24 * H),
  reminderSentAt: null,
  ...overrides,
});

describe("isReminderDue", () => {
  it("is due within 24 hours of the appointment", () => {
    expect(isReminderDue(booking(), now)).toBe(true);
    expect(isReminderDue(booking({ startAt: new Date(now.getTime() + 24 * H) }), now)).toBe(true);
  });

  it("is not due more than 24 hours ahead, or after the start", () => {
    expect(isReminderDue(booking({ startAt: new Date(now.getTime() + 25 * H) }), now)).toBe(false);
    expect(isReminderDue(booking({ startAt: new Date(now.getTime() - H) }), now)).toBe(false);
  });

  it("is sent only once", () => {
    expect(isReminderDue(booking({ reminderSentAt: new Date() }), now)).toBe(false);
  });

  it("skips bookings confirmed less than ~a day before (the confirmation suffices)", () => {
    const start = new Date(now.getTime() + 20 * H);
    expect(
      isReminderDue(booking({ startAt: start, confirmedAt: new Date(now.getTime() - 2 * H) }), now),
    ).toBe(false);
  });

  it("skips cancelled bookings and bookings without email", () => {
    expect(isReminderDue(booking({ status: "cancelled" }), now)).toBe(false);
    expect(isReminderDue(booking({ email: null }), now)).toBe(false);
  });
});

describe("buildIcs", () => {
  it("produces a valid, escaped VEVENT with CRLF line endings", () => {
    const ics = buildIcs([
      {
        uid: "abc@barbershop",
        start: new Date("2026-11-07T10:00:00Z"),
        end: new Date("2026-11-07T10:45:00Z"),
        summary: "Haircut, with Sam; ok",
      },
    ]);
    expect(ics).toContain("DTSTART:20261107T100000Z\r\n");
    expect(ics).toContain("DTEND:20261107T104500Z\r\n");
    expect(ics).toContain("SUMMARY:Haircut\\, with Sam\\; ok\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
});
