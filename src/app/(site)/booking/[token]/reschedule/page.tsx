import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingFlow } from "@/components/BookingFlow";
import { clientCanChange, getBookingByToken } from "@/lib/bookings";
import { getSettings, loadSlotInput } from "@/lib/data";
import { toFlowDays } from "@/lib/flow";
import { formatDayLong, formatTime } from "@/lib/format";
import { generateSlots } from "@/lib/slots";
import { rescheduleAction } from "../actions";

export const metadata: Metadata = { title: "Reschedule", robots: { index: false } };

export default async function Reschedule({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [b, s] = await Promise.all([getBookingByToken(token), getSettings()]);
  if (!b) notFound();
  if (!clientCanChange(b, s)) redirect(`/booking/${token}`);

  const now = new Date();
  const days = toFlowDays(
    generateSlots(await loadSlotInput(s, now, { excludeBookingId: b.id })),
    s.timezone,
  );

  return (
    <div className="fade-in mx-auto max-w-[720px]">
      <header className="mb-14">
        <Link href={`/booking/${token}`} className="eyebrow link mb-8 inline-block">
          ← Back
        </Link>
        <p className="eyebrow mb-5">Reschedule</p>
        <h1 className="display text-[44px] sm:text-[56px]">Pick a new time</h1>
        <p className="mt-4 text-muted">
          Currently{" "}
          <span className="tabular text-ink">
            {formatDayLong(b.startAt, s.timezone)}, {formatTime(b.startAt, s.timezone)}
          </span>
        </p>
      </header>
      <BookingFlow
        days={days}
        mode="reschedule"
        action={rescheduleAction.bind(null, token)}
        submitLabel="Move my appointment"
      />
    </div>
  );
}
