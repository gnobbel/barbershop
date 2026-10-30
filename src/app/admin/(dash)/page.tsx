import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";
import { ActionForm, Submit } from "@/components/ActionForm";
import { CancelButton } from "@/components/CancelButton";
import { getSettings } from "@/lib/data";
import { formatDayLong, formatDayShort, formatTime } from "@/lib/format";
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
      <h1 className="headline text-[34px] sm:text-[40px]">Appointments</h1>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Today" value={groups.get(todayKey)?.length ?? 0} />
        <Stat label="Next 7 days" value={upcoming.filter((b) => b.startAt.getTime() < weekEnd).length} />
        <Stat label="Upcoming" value={upcoming.length} />
      </dl>

      {next && (
        <div className="mt-3 flex items-center gap-3 rounded-[16px] bg-white px-4 py-3.5 text-[14px] ring-1 ring-line">
          <span className="dot shrink-0" aria-hidden />
          <p className="min-w-0">
            <span className="text-muted">Next up </span>
            <span className="font-semibold">{next.name}</span>
            <span className="tabular text-muted">
              {" "}
              · {formatDayShort(next.startAt, s.timezone)}, {formatTime(next.startAt, s.timezone)}
            </span>
          </p>
        </div>
      )}

      <details className="card group mt-6 overflow-hidden">
        <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 px-5 [&::-webkit-details-marker]:hidden">
          <span className="title text-[16px]">Add a booking by hand</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-chip text-[18px] leading-none transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <ActionForm
          action={adminCreateBookingAction}
          resetOnSuccess
          successMessage="Booked. If you added an email, a confirmation has gone out."
          className="border-t border-line px-5 pb-6 pt-5"
        >
          <p className="mb-5 max-w-[560px] text-[14px] text-muted">
            For friends who text you. Any time works, even outside your hours, as long as it doesn&rsquo;t
            overlap another appointment. Email is optional; without one, no emails are sent.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Name" name="name" required />
            <Input label="Date" name="date" type="date" required />
            <Input label="Time" name="time" type="time" required step={300} />
            <Input label="Phone" name="phone" type="tel" />
            <Input label="Email" name="email" type="email" />
            <Input label="Notes" name="notes" />
          </div>
          <div className="mt-5">
            <Submit pendingLabel="Booking…">Add booking</Submit>
          </div>
        </ActionForm>
      </details>

      <section className="mt-10">
        {groups.size === 0 ? (
          <div className="card px-6 py-14 text-center">
            <p className="title text-[20px]">Your diary is clear</p>
            <p className="mt-1.5 text-muted">No upcoming appointments yet. Share your booking link.</p>
          </div>
        ) : (
          <div className="space-y-9">
            {[...groups.entries()].map(([key, list]) => (
              <div key={key}>
                <div className="mb-3 flex items-center gap-2.5">
                  <h2 className="title text-[18px]">{formatDayLong(list[0].startAt, s.timezone)}</h2>
                  {key === todayKey && <span className="pill !bg-ink !text-white">Today</span>}
                  {key === tomorrowKey && <span className="pill">Tomorrow</span>}
                </div>
                <ul className="space-y-2.5">
                  {list.map((b) => (
                    <AppointmentCard key={b.id} b={b} tz={s.timezone} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="mt-14">
          <h2 className="title mb-3 text-[18px]">Past two weeks</h2>
          <ul className="card divide-y divide-line px-5 text-[14px]">
            {recent.map((b) => (
              <li key={b.id} className="tabular flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3.5">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{b.name}</span>
                  {b.status === "cancelled" && (
                    <span className="pill !bg-danger-soft !py-0.5 !text-[12px] !text-danger">Cancelled</span>
                  )}
                </span>
                <span className="text-muted">
                  {formatDayShort(b.startAt, s.timezone)}, {formatTime(b.startAt, s.timezone)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AppointmentCard({ b, tz }: { b: Booking; tz: string }) {
  return (
    <li className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <div className="flex min-w-0 flex-1 gap-4">
        <div className="tabular w-[64px] shrink-0 self-start rounded-[12px] bg-chip px-2 py-2.5 text-center">
          <p className="text-[17px] font-bold leading-none">{formatTime(b.startAt, tz)}</p>
          <p className="mt-1 text-[11px] text-muted">to {formatTime(b.endAt, tz)}</p>
        </div>
        <div className="min-w-0">
          <p className="title text-[16px]">{b.name}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[14px] text-muted">
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
            <p className="mt-2 rounded-[10px] bg-bone px-3 py-2 text-[14px] text-ink-soft">{b.notes}</p>
          )}
        </div>
      </div>
      <div className="-mb-1 -mt-2 flex justify-end sm:m-0 sm:shrink-0">
        <CancelButton
          action={adminCancelAction.bind(null, b.id)}
          label="Cancel"
          variant="quiet"
          confirmText={b.email ? "Cancel & email them?" : "Cancel this?"}
        />
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-4 py-3.5 sm:px-5 sm:py-4">
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className="tabular mt-1 text-[28px] font-bold leading-none tracking-[-0.02em] sm:text-[32px]">
        {value}
      </dd>
    </div>
  );
}

function Input({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label mb-1.5">{label}</span>
      <input className="input" {...rest} />
    </label>
  );
}
