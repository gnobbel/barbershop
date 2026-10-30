import "server-only";
import { and, asc, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { bookings, settings, timeOff, weeklyHours, type Settings } from "@/db/schema";
import type { SlotInput } from "./slots";

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  const [created] = await db
    .insert(settings)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(settings).where(eq(settings.id, 1)))[0];
}

export async function getWeeklyHours() {
  return db
    .select()
    .from(weeklyHours)
    .orderBy(asc(weeklyHours.weekday), asc(weeklyHours.startMin));
}

/** Everything needed to compute open slots from `now`. */
export async function loadSlotInput(
  s: Settings,
  now: Date,
  opts: { excludeBookingId?: string } = {},
): Promise<SlotInput> {
  const from = new Date(now.getTime() - 24 * 60 * 60_000);
  const to = new Date(now.getTime() + (s.windowDays + 2) * 24 * 60 * 60_000);

  const bookingFilters = [
    eq(bookings.status, "confirmed"),
    lt(bookings.startAt, to),
    gt(bookings.endAt, from),
  ];
  if (opts.excludeBookingId) bookingFilters.push(ne(bookings.id, opts.excludeBookingId));

  const [hours, off, booked] = await Promise.all([
    getWeeklyHours(),
    db
      .select({ startAt: timeOff.startAt, endAt: timeOff.endAt })
      .from(timeOff)
      .where(and(lt(timeOff.startAt, to), gt(timeOff.endAt, from))),
    db
      .select({ startAt: bookings.startAt, endAt: bookings.endAt })
      .from(bookings)
      .where(and(...bookingFilters)),
  ]);

  return {
    now,
    timeZone: s.timezone,
    durationMin: s.durationMin,
    bufferMin: s.bufferMin,
    minNoticeHours: s.minNoticeHours,
    windowDays: s.windowDays,
    weeklyHours: hours,
    timeOff: off,
    bookings: booked,
  };
}
