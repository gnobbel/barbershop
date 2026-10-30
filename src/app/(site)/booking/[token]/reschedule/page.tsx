import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingFlow } from "@/components/BookingFlow";
import { clientCanChange, getBookingByToken } from "@/lib/bookings";
import { getSettings, loadSlotInput } from "@/lib/data";
import { toFlowDays } from "@/lib/flow";
import { formatDayShort, formatDuration, formatPrice, formatTime } from "@/lib/format";
import { dateKey, generateSlots, localDateParts } from "@/lib/slots";
import { rescheduleAction } from "../actions";

export const metadata: Metadata = { title: "Reschedule", robots: { index: false } };

export default async function Reschedule({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [b, s] = await Promise.all([getBookingByToken(token), getSettings()]);
  if (!b) notFound();
  if (!clientCanChange(b, s)) redirect(`/booking/${token}`);

  const days = toFlowDays(
    generateSlots(await loadSlotInput(s, new Date(), { excludeBookingId: b.id })),
    s.timezone,
  );
  const p = localDateParts(b.startAt, s.timezone);
  const currentDate = dateKey(p.y, p.m, p.d);
  const currentLabel = `${formatDayShort(b.startAt, s.timezone)} · ${formatTime(b.startAt, s.timezone)}`;
  const meta = [formatDuration(s.durationMin), formatPrice(s.pricePence, s.currency)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fade-in mx-auto max-w-[720px]">
      <Link
        href={`/booking/${token}`}
        className="mb-6 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-muted hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to your booking
      </Link>
      <h1 className="headline text-[34px] sm:text-[44px]">Pick a new time</h1>
      <p className="mt-2 text-muted">
        Currently{" "}
        <span className="tabular font-medium text-ink">
          {formatDayShort(b.startAt, s.timezone)} · {formatTime(b.startAt, s.timezone)}
        </span>
      </p>
      <div className="mt-8 lg:rounded-[24px] lg:border lg:border-line lg:bg-[#f9f7f3] lg:p-8">
        <BookingFlow
          days={days}
          mode="reschedule"
          action={rescheduleAction.bind(null, token)}
          submitLabel="Move booking"
          shortSubmitLabel="Move"
          current={{ iso: b.startAt.toISOString(), date: currentDate, label: currentLabel }}
          summary={{ title: s.serviceName, meta }}
        />
      </div>
    </div>
  );
}
