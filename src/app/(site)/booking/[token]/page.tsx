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
  const canChange = clientCanChange(b, s, now);
  const price = formatPrice(s.pricePence, s.currency);

  const eyebrow = cancelled
    ? "Cancelled"
    : past
      ? "Past appointment"
      : isNew
        ? "Confirmed"
        : moved
          ? "Rescheduled"
          : "Your appointment";
  const heading = cancelled
    ? "This appointment was cancelled."
    : past
      ? "Thanks for coming in."
      : isNew
        ? "You're booked in."
        : moved
          ? "Your new time is set."
          : `See you soon, ${b.name.split(" ")[0]}.`;

  return (
    <div className="fade-in mx-auto max-w-[640px]">
      <p className="eyebrow mb-5 !text-clay">{eyebrow}</p>
      <h1 className="display text-[44px] sm:text-[56px]">{heading}</h1>
      {(isNew || moved) && !cancelled && b.email && (
        <p className="mt-5 text-muted">
          A confirmation is on its way to <span className="text-ink">{b.email}</span>. You&rsquo;ll
          also get a reminder the day before.
        </p>
      )}

      <dl className={`mt-12 border-t border-line ${cancelled ? "opacity-50" : ""}`}>
        <Row label="Date">{formatDayLong(b.startAt, s.timezone)}</Row>
        <Row label="Time">
          <span className="tabular">
            {formatTime(b.startAt, s.timezone)} – {formatTime(b.endAt, s.timezone)}
          </span>
        </Row>
        <Row label="Service">
          {s.serviceName}{" "}
          <span className="text-muted">
            · {formatDuration(s.durationMin)}
            {price && ` · ${price}`}
          </span>
        </Row>
        {s.address && (
          <Row label="Where">
            <span className="whitespace-pre-line">{s.address}</span>
          </Row>
        )}
        <Row label="Name">{b.name}</Row>
      </dl>

      {!cancelled && !past && (
        <div className="mt-10 space-y-10">
          <div className="flex flex-wrap gap-3">
            <a href={`/booking/${token}/ics`} className="btn btn-ghost">
              Add to calendar
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
              className="btn btn-ghost"
            >
              Google Calendar
            </a>
          </div>

          <div className="border-t border-line pt-10">
            <p className="eyebrow mb-4">Need to change something?</p>
            {canChange ? (
              <div className="flex flex-wrap items-start gap-3">
                <Link href={`/booking/${token}/reschedule`} className="btn btn-primary">
                  Reschedule
                </Link>
                <CancelButton action={cancelAction.bind(null, token)} />
              </div>
            ) : (
              <p className="max-w-[460px] text-muted">
                It&rsquo;s within {s.cancelCutoffHours} hours of your appointment, so changes need to
                go through me directly{s.contact ? <>: <span className="text-ink">{s.contact}</span></> : "."}
              </p>
            )}
            {canChange && (
              <p className="mt-5 text-[13px] text-faint">
                You can change or cancel online up to {s.cancelCutoffHours} hours before.
              </p>
            )}
          </div>
        </div>
      )}

      {(cancelled || past) && (
        <div className="mt-10">
          <Link href="/book" className="btn btn-primary">
            Book another time
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-4 border-b border-line py-4 sm:grid-cols-[140px_1fr]">
      <dt className="eyebrow pt-[3px]">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
