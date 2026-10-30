import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Booking, type Settings } from "@/db/schema";
import { getSettings, loadSlotInput } from "./data";
import { sendEmail } from "./email/send";
import {
  adminAlertEmail,
  cancellationEmail,
  confirmationEmail,
  reminderEmail,
} from "./email/templates";
import { REMINDER_LEAD_MS, REMINDER_MIN_CONFIRM_GAP_MS } from "./reminders";
import { isSlotAvailable } from "./slots";

export const MAX_UPCOMING_PER_EMAIL = 2;

export type BookingResult = { ok: true; booking: Booking } | { ok: false; error: string };

const SLOT_TAKEN =
  "Sorry, that time was just taken. Please choose another.";

function isOverlapError(err: unknown): boolean {
  const codes = [err, (err as { cause?: unknown })?.cause].map(
    (e) => (e as { code?: string } | undefined)?.code,
  );
  return codes.includes("23P01");
}

const newToken = () => randomBytes(24).toString("base64url");

async function alertAdmin(kind: "new" | "cancelled" | "rescheduled", b: Booking, s: Settings) {
  const to = process.env.ADMIN_EMAIL;
  if (to) await sendEmail(adminAlertEmail(kind, b, s, to));
}

/** Whether the client may still change or cancel this booking online. */
export function clientCanChange(b: Booking, s: Settings, now = new Date()) {
  return (
    b.status === "confirmed" &&
    b.startAt.getTime() - now.getTime() >= s.cancelCutoffHours * 60 * 60_000
  );
}

export async function getBookingByToken(token: string) {
  if (!token || token.length > 64) return null;
  const [b] = await db.select().from(bookings).where(eq(bookings.manageToken, token));
  return b ?? null;
}

export async function createBooking(
  input: { name: string; email: string | null; phone: string; notes: string; startAt: Date },
  opts: { byAdmin?: boolean } = {},
): Promise<BookingResult> {
  const s = await getSettings();
  const now = new Date();

  if (!opts.byAdmin) {
    if (!s.bookingOpen) return { ok: false, error: "Bookings are paused at the moment." };
    if (!isSlotAvailable(await loadSlotInput(s, now), input.startAt)) {
      return { ok: false, error: SLOT_TAKEN };
    }
    if (input.email) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(
          and(
            eq(bookings.email, input.email),
            eq(bookings.status, "confirmed"),
            gt(bookings.startAt, now),
          ),
        );
      if (count >= MAX_UPCOMING_PER_EMAIL) {
        return {
          ok: false,
          error: `You already have ${count} upcoming appointments. Please keep those or change one from the link in your confirmation email.`,
        };
      }
    }
  }

  let booking: Booking;
  try {
    [booking] = await db
      .insert(bookings)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
        startAt: input.startAt,
        endAt: new Date(input.startAt.getTime() + s.durationMin * 60_000),
        manageToken: newToken(),
      })
      .returning();
  } catch (err) {
    if (isOverlapError(err)) {
      return {
        ok: false,
        error: opts.byAdmin ? "That time overlaps an existing appointment." : SLOT_TAKEN,
      };
    }
    throw err;
  }

  await Promise.all([
    booking.email ? sendEmail(confirmationEmail(booking, s)) : null,
    opts.byAdmin ? null : alertAdmin("new", booking, s),
  ]);
  return { ok: true, booking };
}

export async function rescheduleBooking(token: string, startAt: Date): Promise<BookingResult> {
  const s = await getSettings();
  const now = new Date();
  const current = await getBookingByToken(token);
  if (!current) return { ok: false, error: "Booking not found." };
  if (!clientCanChange(current, s, now)) {
    return { ok: false, error: "This appointment can no longer be changed online." };
  }
  const input = await loadSlotInput(s, now, { excludeBookingId: current.id });
  if (!isSlotAvailable(input, startAt)) return { ok: false, error: SLOT_TAKEN };

  let booking: Booking | undefined;
  try {
    [booking] = await db
      .update(bookings)
      .set({
        startAt,
        endAt: new Date(startAt.getTime() + s.durationMin * 60_000),
        confirmedAt: now,
        reminderSentAt: null,
      })
      .where(and(eq(bookings.id, current.id), eq(bookings.status, "confirmed")))
      .returning();
  } catch (err) {
    if (isOverlapError(err)) return { ok: false, error: SLOT_TAKEN };
    throw err;
  }
  if (!booking) return { ok: false, error: "This appointment is no longer active." };

  await Promise.all([
    booking.email ? sendEmail(confirmationEmail(booking, s, true)) : null,
    alertAdmin("rescheduled", booking, s),
  ]);
  return { ok: true, booking };
}

export async function cancelBooking(
  where: { token: string } | { id: string },
  opts: { byBarber: boolean; notify?: boolean },
): Promise<BookingResult> {
  const s = await getSettings();
  const filter = "token" in where ? eq(bookings.manageToken, where.token) : eq(bookings.id, where.id);

  if (!opts.byBarber) {
    const current = "token" in where ? await getBookingByToken(where.token) : null;
    if (!current) return { ok: false, error: "Booking not found." };
    if (!clientCanChange(current, s)) {
      return { ok: false, error: "This appointment can no longer be cancelled online." };
    }
  }

  const [booking] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(filter, eq(bookings.status, "confirmed")))
    .returning();
  if (!booking) return { ok: false, error: "This appointment is already cancelled." };

  const notifyClient = opts.notify ?? true;
  await Promise.all([
    booking.email && notifyClient ? sendEmail(cancellationEmail(booking, s, opts.byBarber)) : null,
    opts.byBarber ? null : alertAdmin("cancelled", booking, s),
  ]);
  return { ok: true, booking };
}

/**
 * Claims every booking whose 24-hour reminder is due by stamping
 * reminder_sent_at in one UPDATE, so overlapping cron runs can't double-send.
 * Rule mirrored in `isReminderDue` (src/lib/reminders.ts).
 */
export async function sendDueReminders(now = new Date()) {
  const due = await db
    .update(bookings)
    .set({ reminderSentAt: now })
    .where(
      and(
        eq(bookings.status, "confirmed"),
        isNull(bookings.reminderSentAt),
        sql`${bookings.email} is not null`,
        gt(bookings.startAt, now),
        sql`${bookings.startAt} <= ${new Date(now.getTime() + REMINDER_LEAD_MS)}`,
        sql`${bookings.startAt} - ${bookings.confirmedAt} >= make_interval(secs => ${REMINDER_MIN_CONFIRM_GAP_MS / 1000})`,
      ),
    )
    .returning();

  if (!due.length) return { sent: 0, failed: 0 };
  const s = await getSettings();
  let sent = 0;
  let failed = 0;
  for (const b of due) {
    if (await sendEmail(reminderEmail(b, s))) {
      sent++;
    } else {
      failed++;
      // Release the claim so the next run retries.
      await db.update(bookings).set({ reminderSentAt: null }).where(eq(bookings.id, b.id));
    }
  }
  return { sent, failed };
}
