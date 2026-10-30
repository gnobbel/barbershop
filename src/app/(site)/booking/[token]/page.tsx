import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CancelButton } from "@/components/CancelButton";
import { clientCanChange, getBookingByToken } from "@/lib/bookings";
import { getSettings } from "@/lib/data";
import { formatDayLong, formatDuration, formatPrice, formatTime } from "@/lib/format";
import { googleCalendarUrl } from "@/lib/ics";
import { cancelAction } from "./actions";

export const metadata: Metadata = { title: "Your appointment", robots: { index: false } };

export default async function ManageBooking({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string; moved?: string }>;
}) {
  const { token } = await params;
  const { new: isNew, moved } = await searchParams;
  const [b, s] = await Promise.all([getBookingByToken(token), getSettings()]);
  if (!b) notFound();

  const now = new Date();
  const cancelled = b.status === "cancelled";
  const past = !cancelled && b.endAt < now;
  const active = !cancelled && !past;
  const canChange = clientCanChange(b, s, now);
  const price = formatPrice(s.pricePence, s.currency);
  const firstName = b.name.split(" ")[0];

  const heading = cancelled
    ? "Appointment cancelled"
    : past
      ? "Thanks for coming in"
      : isNew
        ? `You're booked, ${firstName}`
        : moved
          ? "Your new time is set"
          : `See you soon, ${firstName}`;

  return (
    <div className="fade-in mx-auto max-w-[560px]">
      <div className="flex flex-col items-center text-center">
        {(isNew || moved) && active ? (
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-go text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : (
          <span className={`pill mb-5 ${cancelled ? "!bg-danger-soft !text-danger" : ""}`}>
            {cancelled ? "Cancelled" : past ? "Past appointment" : "Upcoming"}
          </span>
        )}
        <h1 className="headline text-[34px] sm:text-[44px]">{heading}</h1>
        {(isNew || moved) && active && b.email && (
          <p className="mt-3 max-w-[420px] text-muted">
            A confirmation is on its way to <span className="font-medium text-ink">{b.email}</span>.
            You&rsquo;ll get a reminder the day before.
          </p>
        )}
      </div>

      <div className={`card mt-8 overflow-hidden ${cancelled ? "opacity-60" : ""}`}>
        <div className="border-b border-line bg-white px-5 py-5 sm:px-6">
          <p className="title tabular text-[22px]">{formatDayLong(b.startAt, s.timezone)}</p>
          <p className="tabular mt-1 flex flex-wrap items-center gap-2 text-muted">
            {formatTime(b.startAt, s.timezone)} – {formatTime(b.endAt, s.timezone)}
            <span className="pill tabular !py-0.5">{formatDuration(s.durationMin)}</span>
          </p>
        </div>
        <dl className="divide-y divide-line px-5 sm:px-6">
          <Row label="Service">{s.serviceName}</Row>
          {price && <Row label="Price">{price}</Row>}
          {s.address && <Row label="Where">{s.address}</Row>}
          <Row label="Name">{b.name}</Row>
        </dl>
      </div>

      {active && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a href={`/booking/${token}/ics`} className="btn btn-secondary">
              <CalendarIcon /> Apple / Outlook
            </a>
            <a
              href={googleCalendarUrl({
                start: b.startAt,
                end: b.endAt,
                summary: `${s.serviceName} · ${s.businessName}`,
                location: s.address,
              })}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              Google
            </a>
          </div>

          <div className="card mt-8 p-5 sm:p-6">
            <p className="title text-[17px]">Need to change something?</p>
            {canChange ? (
              <>
                <p className="mt-1 text-[14px] text-muted">
                  You can reschedule or cancel online up to {s.cancelCutoffHours} hours before.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link href={`/booking/${token}/reschedule`} className="btn btn-primary">
                    Reschedule
                  </Link>
                  <CancelButton action={cancelAction.bind(null, token)} />
                </div>
              </>
            ) : (
              <p className="mt-1 text-[14px] text-muted">
                It&rsquo;s within {s.cancelCutoffHours} hours of your appointment, so please message me
                directly{s.contact ? <>: <span className="font-medium text-ink">{s.contact}</span></> : "."}
              </p>
            )}
          </div>
        </>
      )}

      {!active && (
        <div className="mt-8 flex justify-center">
          <Link href="/#book" className="btn btn-primary btn-lg">
            Book another time
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 py-3.5 text-[15px]">
      <dt className="text-muted">{label}</dt>
      <dd className="whitespace-pre-line text-right font-medium">{children}</dd>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
