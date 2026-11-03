import type { Settings } from "@/db/schema";
import { BookingFlow } from "@/components/BookingFlow";
import { getCurrentSlotInput, getSettings } from "@/lib/data";
import { toFlowDays } from "@/lib/flow";
import { formatDuration, formatPrice, WEEKDAY_ORDER, WEEKDAYS } from "@/lib/format";
import { generateSlots, minutesToTime } from "@/lib/slots";
import { whatsappNumber, whatsappUrl } from "@/lib/whatsapp";
import { bookAction } from "./book/actions";

type Hours = { day: string; ranges: string[] }[];

export default async function Home() {
  const s = await getSettings();
  const input = await getCurrentSlotInput();
  const days = s.bookingOpen ? toFlowDays(generateSlots(input), s.timezone) : [];
  const price = formatPrice(s.pricePence, s.currency);
  const meta = [formatDuration(s.durationMin), price].filter(Boolean).join(" · ");

  const hours: Hours = WEEKDAY_ORDER.map((wd) => ({
    day: WEEKDAYS[wd].slice(0, 3),
    ranges: input.weeklyHours
      .filter((h) => h.weekday === wd)
      .map((h) => `${minutesToTime(h.startMin)}–${minutesToTime(h.endMin)}`),
  }));

  return (
    <div className="fade-in grid grid-cols-[minmax(0,1fr)] gap-7 sm:gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 xl:gap-20">
      {/* Intro: kept short on phones so the dates and times show without scrolling. */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <h1 className="headline text-balance text-[32px] sm:text-[52px] lg:text-[60px]">{s.tagline}</h1>
        {s.serviceDescription && (
          <p className="mt-2.5 max-w-[440px] text-[15px] text-muted sm:mt-4 sm:text-[17px]">
            {s.serviceDescription}
          </p>
        )}

        <div className="card mt-5 flex items-center justify-between gap-4 px-5 py-4 sm:mt-6 sm:p-5">
          <p className="title min-w-0 text-[17px]">{s.serviceName}</p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="pill tabular">{formatDuration(s.durationMin)}</span>
            {price && <span className="title tabular text-[20px]">{price}</span>}
          </div>
        </div>

        <div className="mt-6 hidden lg:block">
          <Details s={s} hours={hours} />
        </div>
      </aside>

      {/* Booking */}
      <section
        id="book"
        aria-label="Book an appointment"
        className="scroll-mt-6 lg:rounded-[24px] lg:border lg:border-line lg:bg-[#f9f7f3] lg:p-8 xl:p-10"
      >
        {s.bookingOpen ? (
          <BookingFlow
            days={days}
            mode="new"
            action={bookAction}
            submitLabel="Confirm booking"
            shortSubmitLabel="Confirm"
            summary={{ title: s.serviceName, meta }}
          />
        ) : (
          <div className="card px-6 py-14 text-center">
            <p className="title text-[22px]">Bookings are paused</p>
            <p className="mt-2 text-muted">Please check back soon.</p>
          </div>
        )}
      </section>

      {/* On phones, where and when come after the booking steps. */}
      <div className="border-t border-line pt-7 lg:hidden">
        <Details s={s} hours={hours} collapsible />
      </div>
    </div>
  );
}

function Details({ s, hours, collapsible = false }: { s: Settings; hours: Hours; collapsible?: boolean }) {
  const wa = s.whatsapp ? whatsappNumber(s.whatsapp, s.timezone) : null;
  return (
    <dl className="grid gap-5 text-[14px] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {(s.address || s.contact || wa) && (
        <div className="flex gap-3">
          <PinIcon />
          <div>
            <dt className="sr-only">Where</dt>
            {s.address && (
              <dd className="whitespace-pre-line font-medium">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(s.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="link"
                >
                  {s.address}
                </a>
              </dd>
            )}
            {s.contact && <dd className="text-muted">{s.contact}</dd>}
            {wa && (
              <dd className="mt-1.5">
                <a href={whatsappUrl(wa)} target="_blank" rel="noreferrer" className="link font-medium">
                  WhatsApp {s.whatsapp}
                </a>
              </dd>
            )}
          </div>
        </div>
      )}
      {hours.some((h) => h.ranges.length) && (
        <div className="flex gap-3">
          <ClockIcon />
          <div className="min-w-0 flex-1">
            <dt className="sr-only">Opening hours</dt>
            {collapsible ? (
              <dd>
                <details className="group">
                  <summary className="flex min-h-[24px] cursor-pointer list-none items-center gap-1.5 font-medium [&::-webkit-details-marker]:hidden">
                    Opening hours
                    <svg className="text-muted transition-transform group-open:rotate-180" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <HoursList hours={hours} />
                </details>
              </dd>
            ) : (
              <dd>
                <p className="font-medium">Opening hours</p>
                <HoursList hours={hours} />
              </dd>
            )}
          </div>
        </div>
      )}
    </dl>
  );
}

function HoursList({ hours }: { hours: Hours }) {
  return (
    <ul className="tabular mt-1.5 max-w-[240px] space-y-0.5 text-muted">
      {hours.map((h) => (
        <li key={h.day} className="flex justify-between gap-4">
          <span>{h.day}</span>
          <span className={h.ranges.length ? "" : "text-faint"}>{h.ranges.join(", ") || "Closed"}</span>
        </li>
      ))}
    </ul>
  );
}

function PinIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
