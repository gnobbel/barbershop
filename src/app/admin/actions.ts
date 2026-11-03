"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { settings, timeOff, weeklyHours } from "@/db/schema";
import type { ActionState } from "@/components/BookingFlow";
import { endSession, passwordMatches, requireAdmin, startSession } from "@/lib/auth";
import { cancelBooking, createBooking, moveBookingByBarber } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import { dateKey, localDateParts, parseLocal, timeToMinutes } from "@/lib/slots";
import { whatsappNumber } from "@/lib/whatsapp";

// ── Session ────────────────────────────────────────────────────────────────

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  // A small fixed delay makes password guessing slow.
  await new Promise((r) => setTimeout(r, 400));
  if (!passwordMatches(String(formData.get("password") ?? ""))) {
    return { error: "Dat wachtwoord klopt niet." };
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

export async function adminMoveAction(
  id: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  const time = timeToMinutes(String(formData.get("time") ?? ""));
  const values = { date, time: String(formData.get("time") ?? "") };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || time === null) {
    return { error: "Kies een datum en tijd.", values };
  }
  const s = await getSettings();
  const startAt = parseLocal(date, time, s.timezone);
  if (startAt.getTime() < Date.now()) return { error: "Die tijd is al voorbij.", values };

  const result = await moveBookingByBarber(id, startAt, { notify: formData.get("notify") === "on" });
  if (!result.ok) return { error: result.error, values };
  revalidatePath("/admin");
  return { error: null };
}

const manualSchema = z.object({
  name: z.string().trim().min(1, "Vul een naam in.").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v || null)
    .pipe(z.email("Controleer het e-mailadres.").nullable()),
  phone: z.string().trim().max(30).default(""),
  notes: z.string().trim().max(500).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kies een datum."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Kies een tijd."),
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
    return { error: parsed.error.issues[0]?.message ?? "Controleer het formulier.", values: raw };
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
  if (!weekdays.length) return { error: "Kies minstens één dag." };
  if (start === null || end === null) return { error: "Vul een begin- en eindtijd in." };
  if (end <= start) return { error: "De eindtijd moet na de begintijd liggen." };

  const existing = await db.select().from(weeklyHours);
  const clash = weekdays.find((wd) =>
    existing.some((h) => h.weekday === wd && start < h.endMin && h.startMin < end),
  );
  if (clash !== undefined) return { error: "Dat overlapt met tijden die je op een van die dagen al hebt." };

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
    return { error: "Kies de datums.", values };
  }
  const startMin = fromTime ? timeToMinutes(fromTime) : 0;
  const endMin = toTime ? timeToMinutes(toTime) : null;
  if (startMin === null || (toTime && endMin === null)) return { error: "Controleer de tijden.", values };

  const startAt = parseLocal(from, startMin, s.timezone);
  // No end time means "through the end of that day".
  const endAt =
    endMin === null
      ? parseLocal(to, 24 * 60, s.timezone)
      : parseLocal(to, endMin, s.timezone);
  if (endAt <= startAt) return { error: "Het einde moet na het begin liggen.", values };

  await db.insert(timeOff).values({ startAt, endAt, note });
  revalidatePath("/admin/availability");
  return { error: null };
}

/** One-tap time off from the dashboard: the rest of today, or all of tomorrow. */
export async function quickBlockAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const which = formData.get("which") === "tomorrow" ? "tomorrow" : "today";
  const s = await getSettings();
  const now = new Date();
  const today = localDateParts(now, s.timezone);
  const todayKey = dateKey(today.y, today.m, today.d);
  const tomorrowKey = dateKey(today.y, today.m, today.d + 1);

  const startAt = which === "today" ? now : parseLocal(tomorrowKey, 0, s.timezone);
  const endAt = parseLocal(which === "today" ? todayKey : tomorrowKey, 24 * 60, s.timezone);
  await db.insert(timeOff).values({ startAt, endAt, note: which === "today" ? "Vrij vanavond" : "Vrije dag" });
  revalidatePath("/admin");
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
    .number({ message: `${label} moet een getal zijn.` })
    .int(`${label} moet een heel getal zijn.`)
    .min(min, `${label} moet minstens ${min} zijn.`)
    .max(max, `${label} mag hoogstens ${max} zijn.`);

const settingsSchema = z.object({
  businessName: z.string().trim().min(1, "Vul een naam in.").max(60),
  tagline: z.string().trim().max(140),
  serviceName: z.string().trim().min(1, "Geef de behandeling een naam.").max(60),
  serviceDescription: z.string().trim().max(300),
  durationMin: int(10, 240, "Duur"),
  bufferMin: int(0, 120, "Pauze"),
  price: z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .pipe(z.string().regex(/^\d*(\.\d{1,2})?$/, "Schrijf de prijs als 20 of 22,50."))
    .transform((v) => Math.round(Number(v || 0) * 100)),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "De valuta is een code van 3 letters, bijv. EUR."),
  minNoticeHours: int(0, 168, "Minimale voorbereidingstijd"),
  windowDays: int(1, 180, "Boekingsperiode"),
  cancelCutoffHours: int(0, 168, "Wijzigingsgrens"),
  timezone: z
    .string()
    .trim()
    .refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", "Onbekende tijdzone."),
  address: z.string().trim().max(300),
  contact: z.string().trim().max(120),
  whatsapp: z.string().trim().max(30),
  bookingOpen: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const raw = Object.fromEntries(formData.entries());
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Controleer het formulier." };
  const { price, ...rest } = parsed.data;
  if (rest.whatsapp && !whatsappNumber(rest.whatsapp, rest.timezone)) {
    return { error: "Schrijf het WhatsApp-nummer helemaal uit, bijv. 06 12345678 of +31 6 12345678." };
  }
  await db
    .update(settings)
    .set({ ...rest, pricePence: price })
    .where(eq(settings.id, 1));
  revalidatePath("/", "layout");
  return { error: null, values: { saved: "1" } };
}
