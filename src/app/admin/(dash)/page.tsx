import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";
import { ActionForm, Submit } from "@/components/ActionForm";
import { CancelButton } from "@/components/CancelButton";
import { getSettings } from "@/lib/data";
import { formatDayLong, formatTime } from "@/lib/format";
import { dateKey, localDateParts } from "@/lib/slots";
import { adminCancelAction, adminCreateBookingAction } from "../actions";

export const metadata = { title: "Appointments" };

const DAY = 24 * 60 * 60_000;

export default async function Dashboard() {
  const s = await getSettings();
  const now = new Date();
  const [upcoming, recent] = await Promise.all([
    db
      .select()
      .from(bookings)
      .where(and(eq(bookings.status, "confirmed"), gte(bookings.endAt, now)))
      .orderBy(asc(bookings.startAt)),
    db
      .select()
      .from(bookings)
      .where(and(gte(bookings.startAt, new Date(now.getTime() - 14 * DAY)), lt(bookings.endAt, now)))
      .orderBy(desc(bookings.startAt))
      .limit(20),
  ]);

  const keyOf = (d: Date) => {
    const p = localDateParts(d, s.timezone);
    return dateKey(p.y, p.m, p.d);
  };
  const todayKey = keyOf(now);
  const tomorrowKey = keyOf(new Date(now.getTime() + DAY));
  const weekEnd = now.getTime() + 7 * DAY;

  const groups = new Map<string, Booking[]>();
  for (const b of upcoming) {
    const k = keyOf(b.startAt);
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }

  const next = upcoming[0];

  return (
    <div className="fade-in">
      <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-4">Overview</p>
          <h1 className="display text-[44px] sm:text-[52px]">Appointments</h1>
        </div>
        <dl className="grid grid-cols-3 border-y border-line sm:min-w-[440px]">
          <Stat label="Today" value={groups.get(todayKey)?.length ?? 0} />
          <Stat
            label="Next 7 days"
            value={upcoming.filter((b) => b.startAt.getTime() < weekEnd).length}
          />
          <Stat label="Upcoming" value={upcoming.length} />
        </dl>
      </div>

      {next && (
        <p className="mt-8 text-muted">
          Next up: <span className="text-ink">{next.name}</span>,{" "}
          <span className="tabular">
            {formatDayLong(next.startAt, s.timezone)} at {formatTime(next.startAt, s.timezone)}
          </span>
        </p>
      )}

      <details className="group mt-12 border-y border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
          <span className="eyebrow !text-ink">Add a booking by hand</span>
          <span className="text-xl leading-none text-muted transition-transform group-open:rotate-45">+</span>
        </summary>
        <ActionForm
          action={adminCreateBookingAction}
          resetOnSuccess
          successMessage="Booked. If you added an email, a confirmation has gone out."
          className="pb-8"
        >
          <p className="mb-6 max-w-[560px] text-[14px] text-muted">
            For friends who text you. Any time is allowed, even outside your hours, but it
            can&rsquo;t overlap another appointment. Email is optional; without one, no emails are sent.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Name" name="name" required />
            <Input label="Date" name="date" type="date" required />
            <Input label="Time" name="time" type="time" required step={300} />
            <Input label="Phone" name="phone" type="tel" />
            <Input label="Email" name="email" type="email" />
            <Input label="Notes" name="notes" />
          </div>
          <div className="mt-6">
            <Submit pendingLabel="Booking…">Add booking</Submit>
          </div>
        </ActionForm>
      </details>

      <section className="mt-14">
        {groups.size === 0 ? (
          <div className="card px-6 py-14 text-center">
            <p className="display text-3xl">A quiet diary.</p>
            <p className="mt-3 text-muted">No upcoming appointments yet. Share your booking link.</p>
          </div>
        ) : (
          <div className="space-y-14">
            {[...groups.entries()].map(([key, list]) => (
              <div key={key}>
                <div className="mb-2 flex items-baseline gap-4">
                  <h2 className="display text-[28px]">{formatDayLong(list[0].startAt, s.timezone)}</h2>
                  {key === todayKey && <span className="eyebrow !text-clay">Today</span>}
                  {key === tomorrowKey && <span className="eyebrow !text-clay">Tomorrow</span>}
                </div>
                <ul className="border-t border-line">
                  {list.map((b) => (
                    <AppointmentRow key={b.id} b={b} tz={s.timezone} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="mt-20">
          <p className="eyebrow mb-4">Past two weeks</p>
          <ul className="border-t border-line text-[14px]">
            {recent.map((b) => (
              <li
                key={b.id}
                className="tabular flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line py-3 text-muted"
              >
                <span>
                  <span className="text-ink">{b.name}</span>
                  {b.status === "cancelled" && <span className="ml-3 eyebrow !text-danger">Cancelled</span>}
                </span>
                <span>
                  {formatDayLong(b.startAt, s.timezone)}, {formatTime(b.startAt, s.timezone)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AppointmentRow({ b, tz }: { b: Booking; tz: string }) {
  return (
    <li className="grid gap-4 border-b border-line py-6 sm:grid-cols-[110px_1fr_auto] sm:gap-8">
      <div className="tabular">
        <p className="display text-[26px] leading-none">{formatTime(b.startAt, tz)}</p>
        <p className="mt-1.5 text-[12px] text-faint">until {formatTime(b.endAt, tz)}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[16px]">{b.name}</p>
        <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-muted">
          {b.phone && (
            <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="link">
              {b.phone}
            </a>
          )}
          {b.email && (
            <a href={`mailto:${b.email}`} className="link break-all">
              {b.email}
            </a>
          )}
        </p>
        {b.notes && (
          <p className="mt-3 max-w-[560px] border-l border-line-strong pl-3 text-[14px] text-muted">
            {b.notes}
          </p>
        )}
      </div>
      <div className="sm:text-right">
        <CancelButton
          action={adminCancelAction.bind(null, b.id)}
          label="Cancel"
          confirmText={b.email ? "Cancel and let them know by email?" : "Cancel this appointment?"}
        />
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-1 py-4 sm:px-5 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line [&:not(:first-child)]:pl-4">
      <dt className="eyebrow text-[10px]">{label}</dt>
      <dd className="display tabular mt-1 text-[34px] leading-none">{value}</dd>
    </div>
  );
}

function Input({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="eyebrow">{label}</span>
      <input className="input" {...rest} />
    </label>
  );
}
