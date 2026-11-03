import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";
import { ActionForm, Submit } from "@/components/ActionForm";
import { CancelButton } from "@/components/CancelButton";
import { MoveButton } from "@/components/MoveButton";
import { getSettings } from "@/lib/data";
import { capitalize, formatDayLong, formatDayShort, formatTime } from "@/lib/format";
import { dateKey, localDateParts } from "@/lib/slots";
import { whatsappNumber, whatsappUrl } from "@/lib/whatsapp";
import {
  adminCancelAction,
  adminCreateBookingAction,
  adminMoveAction,
  quickBlockAction,
} from "../actions";

export const metadata = { title: "Afspraken" };

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
      <h1 className="headline text-[34px] sm:text-[40px]">Afspraken</h1>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Vandaag" value={groups.get(todayKey)?.length ?? 0} />
        <Stat label="7 dagen" value={upcoming.filter((b) => b.startAt.getTime() < weekEnd).length} />
        <Stat label="Gepland" value={upcoming.length} />
      </dl>

      {next && (
        <div className="mt-3 flex items-center gap-3 rounded-[16px] bg-white px-4 py-3.5 text-[14px] ring-1 ring-line">
          <span className="dot shrink-0" aria-hidden />
          <p className="min-w-0">
            <span className="text-muted">Hierna </span>
            <span className="font-semibold">{next.name}</span>
            <span className="tabular text-muted">
              {" "}
              · {formatDayShort(next.startAt, s.timezone)}, {formatTime(next.startAt, s.timezone)}
            </span>
          </p>
        </div>
      )}

      <ActionForm
        action={quickBlockAction}
        successMessage="Geblokkeerd. Geboekte afspraken blijven staan; terugdraaien kan bij Tijden."
        className="card mt-3 px-4 py-3.5 sm:px-5"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <p className="mr-auto text-[14px] font-semibold">Even niet knippen?</p>
          <div className="flex gap-2">
            <Submit name="which" value="today" pendingLabel="Bezig…" className="btn btn-secondary btn-sm">
              Rest van vandaag vrij
            </Submit>
            <Submit name="which" value="tomorrow" pendingLabel="Bezig…" className="btn btn-secondary btn-sm">
              Morgen vrij
            </Submit>
          </div>
        </div>
      </ActionForm>

      <details className="card group mt-6 overflow-hidden">
        <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 px-5 [&::-webkit-details-marker]:hidden">
          <span className="title text-[16px]">Zelf een afspraak toevoegen</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-chip text-[18px] leading-none transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <ActionForm
          action={adminCreateBookingAction}
          resetOnSuccess
          successMessage="Ingepland. Met een e-mailadres erbij is er een bevestiging verstuurd."
          className="border-t border-line px-5 pb-6 pt-5"
        >
          <p className="mb-5 max-w-[560px] text-[14px] text-muted">
            Voor vrienden die je appen. Elke tijd kan, ook buiten je openingstijden, zolang het niet overlapt
            met een andere afspraak. E-mail is optioneel; zonder e-mailadres worden er geen mails verstuurd.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Naam" name="name" required />
            <Input label="Datum" name="date" type="date" required />
            <Input label="Tijd" name="time" type="time" required step={300} />
            <Input label="Telefoon" name="phone" type="tel" />
            <Input label="E-mail" name="email" type="email" />
            <Input label="Opmerkingen" name="notes" />
          </div>
          <div className="mt-5">
            <Submit pendingLabel="Inplannen…">Afspraak toevoegen</Submit>
          </div>
        </ActionForm>
      </details>

      <section className="mt-10">
        {groups.size === 0 ? (
          <div className="card px-6 py-14 text-center">
            <p className="title text-[20px]">Je agenda is leeg</p>
            <p className="mt-1.5 text-muted">Nog geen afspraken gepland. Deel je link.</p>
          </div>
        ) : (
          <div className="space-y-9">
            {[...groups.entries()].map(([key, list]) => (
              <div key={key}>
                <div className="mb-3 flex items-center gap-2.5">
                  <h2 className="title text-[18px]">{capitalize(formatDayLong(list[0].startAt, s.timezone))}</h2>
                  {key === todayKey && <span className="pill !bg-ink !text-white">Vandaag</span>}
                  {key === tomorrowKey && <span className="pill">Morgen</span>}
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
          <h2 className="title mb-3 text-[18px]">Afgelopen twee weken</h2>
          <ul className="card divide-y divide-line px-5 text-[14px]">
            {recent.map((b) => (
              <li key={b.id} className="tabular flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3.5">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{b.name}</span>
                  {b.status === "cancelled" && (
                    <span className="pill !bg-danger-soft !py-0.5 !text-[12px] !text-danger">Geannuleerd</span>
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
  const local = localDateParts(b.startAt, tz);
  const wa = b.phone ? whatsappNumber(b.phone, tz) : null;
  const firstName = b.name.split(" ")[0];
  const waText = `Hoi ${firstName}! Over je afspraak op ${formatDayLong(b.startAt, tz)} om ${formatTime(b.startAt, tz)}: `;
  return (
    <li className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <div className="flex min-w-0 flex-1 gap-4">
        <div className="tabular w-[64px] shrink-0 self-start rounded-[12px] bg-chip px-2 py-2.5 text-center">
          <p className="text-[17px] font-bold leading-none">{formatTime(b.startAt, tz)}</p>
          <p className="mt-1 text-[11px] text-muted">tot {formatTime(b.endAt, tz)}</p>
        </div>
        <div className="min-w-0">
          <p className="title text-[16px]">{b.name}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[14px] text-muted">
            {b.phone && (
              <a href={`tel:${b.phone.replace(/\s/g, "")}`} className="link">
                {b.phone}
              </a>
            )}
            {wa && (
              <a href={whatsappUrl(wa, waText)} target="_blank" rel="noreferrer" className="link font-medium text-go">
                WhatsApp
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
      <div className="-mb-1 -mt-2 flex flex-wrap justify-end gap-1 sm:m-0 sm:shrink-0">
        <MoveButton
          action={adminMoveAction.bind(null, b.id)}
          date={dateKey(local.y, local.m, local.d)}
          time={formatTime(b.startAt, tz)}
          hasEmail={!!b.email}
        />
        <CancelButton
          action={adminCancelAction.bind(null, b.id)}
          label="Annuleren"
          variant="quiet"
          confirmText={b.email ? "Annuleren en een mail sturen?" : "Deze afspraak annuleren?"}
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
