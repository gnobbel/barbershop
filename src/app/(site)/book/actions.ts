"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/BookingFlow";
import { createBooking } from "@/lib/bookings";

const schema = z.object({
  name: z.string().trim().min(2, "Vul je naam in.").max(80),
  email: z.string().trim().toLowerCase().pipe(z.email("Controleer je e-mailadres.")),
  phone: z
    .string()
    .trim()
    .min(6, "Vul je telefoonnummer in.")
    .max(30)
    .regex(/^[+()\d\s-]+$/, "Controleer je telefoonnummer."),
  notes: z.string().trim().max(500).default(""),
  start: z.iso.datetime({ message: "Kies een tijd." }),
});

export async function bookAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(
    ["name", "email", "phone", "notes", "start"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const values = { name: raw.name, email: raw.email, phone: raw.phone, notes: raw.notes };

  // Bots fill every field; people never see this one.
  if (String(formData.get("company") ?? "")) return { error: null, values };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return {
      error: fieldErrors.start ?? "Controleer de gemarkeerde velden.",
      fieldErrors,
      values,
    };
  }

  const { start, ...rest } = parsed.data;
  const result = await createBooking({ ...rest, startAt: new Date(start) });
  if (!result.ok) return { error: result.error, values };

  redirect(`/booking/${result.booking.manageToken}?new=1`);
}
