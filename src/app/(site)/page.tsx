import Link from "next/link";
import { getSettings, loadSlotInput } from "@/lib/data";
import {
  formatDayLong,
  formatDuration,
  formatPrice,
  formatTime,
  WEEKDAY_ORDER,
  WEEKDAYS,
} from "@/lib/format";
import { generateSlots, minutesToTime } from "@/lib/slots";

export default async function Home() {
  const s = await getSettings();
  const input = await loadSlotInput(s, new Date());
  const next = generateSlots(input)[0]?.slots[0];
  const price = formatPrice(s.pricePence, s.currency);

  const hours = WEEKDAY_ORDER.map((wd) => ({
    day: WEEKDAYS[wd],
    ranges: input.weeklyHours
      .filter((h) => h.weekday === wd)
      .map((h) => `${minutesToTime(h.startMin)}–${minutesToTime(h.endMin)}`),
  })).filter((d) => d.ranges.length);

  return (
    <div className="fade-in">
      <section className="max-w-[640px]">
        <p className="eyebrow mb-6">By appointment</p>
        <h1 className="display text-[44px] sm:text-[68px]">{s.tagline}</h1>
        <p className="mt-8 max-w-[460px] text-[16px] leading-relaxed text-muted">
          {s.serviceDescription}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          {s.bookingOpen ? (
            <Link href="/book" className="btn btn-primary">
              Book an appointment
            </Link>
          ) : (
            <p className="text-muted">Bookings are paused for now. Check back soon.</p>
          )}
          {s.bookingOpen && next && (
            <p className="text-[13px] text-muted">
              Next opening{" "}
              <span className="tabular text-ink">
                {formatDayLong(next, s.timezone)}, {formatTime(next, s.timezone)}
              </span>
            </p>
          )}
        </div>
      </section>

      <dl className="mt-20 grid border-t border-line sm:mt-28 sm:grid-cols-3">
        <Detail label="The cut">
          <p>{s.serviceName}</p>
          <p className="text-muted">
            {formatDuration(s.durationMin)}
            {price && ` · ${price}`}
          </p>
        </Detail>
        <Detail label="Hours">
          {hours.length ? (
            <ul className="tabular space-y-0.5">
              {hours.map((h) => (
                <li key={h.day} className="flex justify-between gap-4">
                  <span>{h.day.slice(0, 3)}</span>
                  <span className="text-muted">{h.ranges.join(", ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">To be announced</p>
          )}
        </Detail>
        <Detail label="Where">
          <p className="whitespace-pre-line">{s.address || "Shared on booking"}</p>
          {s.contact && <p className="text-muted">{s.contact}</p>}
        </Detail>
      </dl>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-7 sm:border-b-0 sm:py-9 sm:pr-10 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:pl-10">
      <dt className="eyebrow mb-4">{label}</dt>
      <dd className="space-y-1 text-[15px]">{children}</dd>
    </div>
  );
}
