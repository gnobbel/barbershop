import { describe, expect, it } from "vitest";
import { generateSlots, isSlotAvailable, parseLocal, type SlotInput } from "@/lib/slots";

const TZ = "Europe/London";
// Wednesday 4 November 2026, 09:00 London (GMT, UTC+0)
const NOW = new Date("2026-11-04T09:00:00Z");

function base(overrides: Partial<SlotInput> = {}): SlotInput {
  return {
    now: NOW,
    timeZone: TZ,
    durationMin: 45,
    bufferMin: 15,
    minNoticeHours: 0,
    windowDays: 14,
    // Saturdays 10:00–13:00
    weeklyHours: [{ weekday: 6, startMin: 600, endMin: 780 }],
    timeOff: [],
    bookings: [],
    ...overrides,
  };
}

const times = (input: SlotInput, date: string) =>
  generateSlots(input)
    .find((d) => d.date === date)
    ?.slots.map((s) =>
      new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(s),
    ) ?? [];

describe("generateSlots", () => {
  it("steps by duration + buffer and keeps the whole cut inside opening hours", () => {
    // 10:00, 11:00, 12:00 (12:00 + 45 = 12:45 <= 13:00); 13:00 would overrun.
    expect(times(base(), "2026-11-07")).toEqual(["10:00", "11:00", "12:00"]);
  });

  it("only lists days that have openings, within the booking window", () => {
    const days = generateSlots(base({ windowDays: 10 })).map((d) => d.date);
    expect(days).toEqual(["2026-11-07", "2026-11-14"]);
    expect(generateSlots(base({ windowDays: 2 }))).toEqual([]);
  });

  it("supports several ranges on one day (e.g. a lunch break)", () => {
    const input = base({
      weeklyHours: [
        { weekday: 6, startMin: 840, endMin: 960 }, // 14:00–16:00
        { weekday: 6, startMin: 600, endMin: 720 }, // 10:00–12:00
      ],
    });
    expect(times(input, "2026-11-07")).toEqual(["10:00", "11:00", "14:00", "15:00"]);
  });

  it("keeps the buffer clear around existing bookings", () => {
    const input = base({
      weeklyHours: [{ weekday: 6, startMin: 600, endMin: 900 }], // 10:00–15:00
      bookings: [
        // 11:30–12:15 booked by hand; blocks 11:15–12:30 including buffer
        { startAt: new Date("2026-11-07T11:30:00Z"), endAt: new Date("2026-11-07T12:15:00Z") },
      ],
    });
    // 10:00 ok (ends 10:45), 11:00 overlaps buffer, 12:00 overlaps, 13:00 ok, 14:00 ok
    expect(times(input, "2026-11-07")).toEqual(["10:00", "13:00", "14:00"]);
  });

  it("excludes time off", () => {
    const input = base({
      timeOff: [
        { startAt: new Date("2026-11-07T10:30:00Z"), endAt: new Date("2026-11-07T11:30:00Z") },
      ],
    });
    expect(times(input, "2026-11-07")).toEqual(["12:00"]);
  });

  it("whole-day time off removes the day", () => {
    const input = base({
      timeOff: [
        {
          startAt: parseLocal("2026-11-07", 0, TZ),
          endAt: parseLocal("2026-11-07", 24 * 60, TZ),
        },
      ],
    });
    expect(generateSlots(input).map((d) => d.date)).not.toContain("2026-11-07");
  });

  it("respects minimum notice", () => {
    // Now is Saturday 10:20; 2 hours notice → earliest 12:20
    const input = base({ now: new Date("2026-11-07T10:20:00Z"), minNoticeHours: 2 });
    expect(times(input, "2026-11-07")).toEqual([]);
    const input2 = base({ now: new Date("2026-11-07T08:00:00Z"), minNoticeHours: 2 });
    expect(times(input2, "2026-11-07")).toEqual(["10:00", "11:00", "12:00"]);
  });

  it("works in local time across a DST change", () => {
    // UK clocks go forward on Sunday 28 March 2027 (GMT → BST).
    const input = base({
      now: new Date("2027-03-25T09:00:00Z"),
      weeklyHours: [
        { weekday: 6, startMin: 600, endMin: 660 }, // Saturday 10:00–11:00
        { weekday: 0, startMin: 600, endMin: 660 }, // Sunday 10:00–11:00
      ],
    });
    const days = generateSlots(input);
    const sat = days.find((d) => d.date === "2027-03-27")!;
    const sun = days.find((d) => d.date === "2027-03-28")!;
    expect(sat.slots[0].toISOString()).toBe("2027-03-27T10:00:00.000Z"); // GMT
    expect(sun.slots[0].toISOString()).toBe("2027-03-28T09:00:00.000Z"); // BST = UTC+1
  });

  it("uses the barber's timezone for 'today', not UTC", () => {
    // 23:30 UTC on Friday is already Saturday 08:30 in Tokyo.
    const input = base({
      now: new Date("2026-11-06T23:30:00Z"),
      timeZone: "Asia/Tokyo",
      windowDays: 0,
    });
    expect(generateSlots(input).map((d) => d.date)).toEqual(["2026-11-07"]);
  });
});

describe("isSlotAvailable", () => {
  it("accepts generated slots and rejects anything else", () => {
    const input = base();
    expect(isSlotAvailable(input, new Date("2026-11-07T10:00:00Z"))).toBe(true);
    expect(isSlotAvailable(input, new Date("2026-11-07T10:15:00Z"))).toBe(false);
    expect(isSlotAvailable(input, new Date("2026-11-06T10:00:00Z"))).toBe(false);
  });
});
