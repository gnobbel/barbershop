"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { settings, timeOff, weeklyHours } from "@/db/schema";
import type { ActionState } from "@/components/BookingFlow";
import { endSession, passwordMatches, requireAdmin, startSession } from "@/lib/auth";
import { cancelBooking, createBooking } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import { parseLocal, timeToMinutes } from "@/lib/slots";

// ── Session ────────────────────────────────────────────────────────────────

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  // A small fixed delay makes password guessing slow.
  await new Promise((r) => setTimeout(r, 400));
  if (!passwordMatches(String(formData.get("password") ?? ""))) {
    return { error: "That password isn't right." };
  }
  await startSession();
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

// ── Appointments ───────────────────────────────────────────────────────────

export async function adminCancelAction(
  id: string,
  _: ActionState,
  formData?: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const notify = formData ? formData.get("notify") !== "off" : true;
  const result = await cancelBooking({ id }, { byBarber: true, notify });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin");
  return { error: null };
}

const manualSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v || null)
    .pipe(z.email("Check the email.").nullable()),
  phone: z.string().trim().max(30).default(""),
  notes: z.string().trim().max(500).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time."),
});

export async function adminCreateBookingAction(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const raw = Object.fromEntries(
    ["name", "email", "phone", "notes", "date", "time"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  const parsed = manualSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form.", values: raw };
  }
  const s = await getSettings();
  const { date, time, ...rest } = parsed.data;
  const startAt = parseLocal(date, timeToMinutes(time)!, s.timezone);
  const result = await createBooking({ ...rest, startAt }, { byAdmin: true });
  if (!result.ok) return { error: result.error, values: raw };
  revalidatePath("/admin");
  return { error: null, values: {} };
}

// ── Availability ───────────────────────────────────────────────────────────

export async function addHoursAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const weekdays = formData.getAll("weekday").map(Number).filter((d) => d >= 0 && d <= 6);
  const start = timeToMinutes(String(formData.get("start") ?? ""));
  const end = timeToMinutes(String(formData.get("end") ?? ""));
  if (!weekdays.length) return { error: "Choose at least one day." };
  if (start === null || end === null) return { error: "Enter a start and end time." };
  if (end <= start) return { error: "The end time must be after the start time." };

  const existing = await db.select().from(weeklyHours);
  const clash = weekdays.find((wd) =>
    existing.some((h) => h.weekday === wd && start < h.endMin && h.startMin < end),
  );
  if (clash !== undefined) return { error: "That overlaps hours you already have on one of those days." };

  await db.insert(weeklyHours).values(weekdays.map((weekday) => ({ weekday, startMin: start, endMin: end })));
  revalidatePath("/admin/availability");
  return { error: null };
}

export async function removeHoursAction(id: number) {
  await requireAdmin();
  await db.delete(weeklyHours).where(eq(weeklyHours.id, id));
  revalidatePath("/admin/availability");
}

export async function addTimeOffAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const s = await getSettings();
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "") || from;
  const fromTime = String(formData.get("fromTime") ?? "");
  const toTime = String(formData.get("toTime") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 120);
  const values = { from, to, fromTime, toTime, note };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return { error: "Choose the dates.", values };
  }
  const startMin = fromTime ? timeToMinutes(fromTime) : 0;
  const endMin = toTime ? timeToMinutes(toTime) : null;
  if (startMin === null || (toTime && endMin === null)) return { error: "Check the times.", values };

  const startAt = parseLocal(from, startMin, s.timezone);
  // No end time means "through the end of that day".
  const endAt =
    endMin === null
      ? parseLocal(to, 24 * 60, s.timezone)
      : parseLocal(to, endMin, s.timezone);
  if (endAt <= startAt) return { error: "The end must be after the start.", values };

  await db.insert(timeOff).values({ startAt, endAt, note });
  revalidatePath("/admin/availability");
  return { error: null };
}

export async function removeTimeOffAction(id: number) {
  await requireAdmin();
  await db.delete(timeOff).where(eq(timeOff.id, id));
  revalidatePath("/admin/availability");
}

// ── Settings ───────────────────────────────────────────────────────────────

const int = (min: number, max: number, label: string) =>
  z.coerce
    .number({ message: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(min, `${label} must be at least ${min}.`)
    .max(max, `${label} must be at most ${max}.`);

const settingsSchema = z.object({
  businessName: z.string().trim().min(1, "Add a name.").max(60),
  tagline: z.string().trim().max(140),
  serviceName: z.string().trim().min(1, "Name the service.").max(60),
  serviceDescription: z.string().trim().max(300),
  durationMin: int(10, 240, "Duration"),
  bufferMin: int(0, 120, "Buffer"),
  price: z
    .string()
    .trim()
    .regex(/^\d*(\.\d{1,2})?$/, "Price should look like 20 or 22.50.")
    .transform((v) => Math.round(Number(v || 0) * 100)),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency is a 3-letter code, e.g. GBP."),
  minNoticeHours: int(0, 168, "Minimum notice"),
  windowDays: int(1, 180, "Booking window"),
  cancelCutoffHours: int(0, 168, "Cancellation cutoff"),
  timezone: z
    .string()
    .trim()
    .refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", "Unknown timezone."),
  address: z.string().trim().max(300),
  contact: z.string().trim().max(120),
  bookingOpen: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { price, ...rest } = parsed.data;
  await db
    .update(settings)
    .set({ ...rest, pricePence: price })
    .where(eq(settings.id, 1));
  revalidatePath("/", "layout");
  return { error: null, values: { saved: "1" } };
}
