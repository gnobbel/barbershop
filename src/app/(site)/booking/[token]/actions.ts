"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/BookingFlow";
import { cancelBooking, rescheduleBooking } from "@/lib/bookings";

export async function cancelAction(token: string, _: ActionState): Promise<ActionState> {
  const result = await cancelBooking({ token }, { byBarber: false });
  if (!result.ok) return { error: result.error };
  redirect(`/booking/${token}`);
}

export async function rescheduleAction(
  token: string,
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const start = new Date(String(formData.get("start") ?? ""));
  if (Number.isNaN(start.getTime())) return { error: "Please pick a time." };
  const result = await rescheduleBooking(token, start);
  if (!result.ok) return { error: result.error };
  redirect(`/booking/${token}?moved=1`);
}
