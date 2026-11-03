import type { FlowDay } from "@/components/BookingFlow";
import { capitalize, dayKeyParts, formatTime } from "./format";
import type { DaySlots } from "./slots";

/** Serialise slots for the client, with labels pre-formatted in the barber's timezone. */
export function toFlowDays(days: DaySlots[], timeZone: string): FlowDay[] {
  return days.map((d) => {
    const p = dayKeyParts(d.date);
    return {
      date: d.date,
      weekdayShort: p.weekdayShort,
      day: p.day,
      monthShort: p.monthShort,
      label: capitalize(`${p.weekdayLong} ${p.day} ${p.monthLong}`),
      slots: d.slots.map((s) => ({ iso: s.toISOString(), label: formatTime(s, timeZone) })),
    };
  });
}
