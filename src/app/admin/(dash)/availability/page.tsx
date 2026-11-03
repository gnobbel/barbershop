import { asc, gt } from "drizzle-orm";
import { db } from "@/db";
import { timeOff } from "@/db/schema";
import { ActionForm, Submit } from "@/components/ActionForm";
import { getSettings, getWeeklyHours, loadSlotInput } from "@/lib/data";
import {
  capitalize,
  formatDayLong,
  formatDayShort,
  formatTime,
  relativeDay,
  WEEKDAY_ORDER,
  WEEKDAYS,
  WEEKDAYS_SHORT,
} from "@/lib/format";
import { generateSlots, minutesToTime } from "@/lib/slots";
import {
  addHoursAction,
  addTimeOffAction,
  removeHoursAction,
  removeTimeOffAction,
} from "../../actions";

export const metadata = { title: "Tijden" };

export default async function Availability() {
  const s = await getSettings();
  const now = new Date();
  const [input, hours, off] = await Promise.all([
    loadSlotInput(s, now),
    getWeeklyHours(),
    db.select().from(timeOff).where(gt(timeOff.endAt, now)).orderBy(asc(timeOff.startAt)),
  ]);
  const days = generateSlots(input);
  const openSlots = days.reduce((n, d) => n + d.slots.length, 0);
  const first = days[0]?.slots[0];

  return (
    <div className="fade-in space-y-12">
      <div>
        <h1 className="headline text-[34px] sm:text-[40px]">Tijden</h1>
        <p className="mt-2 max-w-[580px] text-muted">
          Stel je vaste weektijden in en blokkeer daarna uitzonderingen. Vrienden zien plekken van{" "}
          {s.durationMin} minuten met {s.bufferMin} minuten ertussen, vanaf {s.minNoticeHours} uur van
          tevoren tot {s.windowDays} dagen vooruit.
        </p>
        <div className="mt-5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[16px] bg-white px-4 py-3 text-[14px] ring-1 ring-line">
          <span className={`dot ${openSlots ? "" : "!bg-faint !shadow-none"}`} aria-hidden />
          <span className="tabular font-semibold">
            {openSlots} {openSlots === 1 ? "plek" : "plekken"} vrij
          </span>
          <span className="text-muted">
            verdeeld over {days.length} {days.length === 1 ? "dag" : "dagen"}
            {first && (
              <>
                {" "}· eerstvolgende <span className="tabular font-medium text-ink">{relativeDay(first, s.timezone, now)} {formatTime(first, s.timezone)}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Weekly hours */}
      <section className="grid gap-5 lg:grid-cols-[1fr_340px] lg:gap-8">
        <div>
          <h2 className="title mb-3 text-[18px]">Vaste tijden</h2>
          <ul className="card divide-y divide-line px-5">
            {WEEKDAY_ORDER.map((wd) => {
              const ranges = hours.filter((h) => h.weekday === wd);
              return (
                <li key={wd} className="flex min-h-[60px] flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <span className={`w-[100px] font-medium ${ranges.length ? "" : "text-faint"}`}>{WEEKDAYS[wd]}</span>
                  {ranges.length ? (
                    <div className="flex flex-wrap gap-2">
                      {ranges.map((h) => (
                        <form
                          key={h.id}
                          action={removeHoursAction.bind(null, h.id)}
                          className="tabular inline-flex items-center gap-1 rounded-full bg-chip py-1 pl-3.5 pr-1 text-[14px] font-medium"
                        >
                          {minutesToTime(h.startMin)}–{minutesToTime(h.endMin)}
                          <button
                            aria-label={`${WEEKDAYS[wd]} ${minutesToTime(h.startMin)}–${minutesToTime(h.endMin)} verwijderen`}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-white hover:text-danger"
                          >
                            <XIcon />
                          </button>
                        </form>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[14px] text-faint">Gesloten</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <ActionForm action={addHoursAction} resetOnSuccess className="card self-start p-5 lg:mt-[40px]">
          <h3 className="title text-[16px]">Tijden toevoegen</h3>
          <fieldset className="mt-4">
            <legend className="label mb-2">Dagen</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_ORDER.map((wd) => (
                <label key={wd} className="cursor-pointer">
                  <input type="checkbox" name="weekday" value={wd} className="peer sr-only" />
                  <span className="tile grid h-11 place-items-center text-[13px] font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                    {WEEKDAYS_SHORT[wd]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label mb-1.5">Van</span>
              <input type="time" name="start" required defaultValue="10:00" step={300} className="input" />
            </label>
            <label className="block">
              <span className="label mb-1.5">Tot</span>
              <input type="time" name="end" required defaultValue="18:00" step={300} className="input" />
            </label>
          </div>
          <Submit pendingLabel="Toevoegen…" className="btn btn-primary mt-5 w-full">
            Tijden toevoegen
          </Submit>
        </ActionForm>
      </section>

      {/* Time off */}
      <section className="grid gap-5 lg:grid-cols-[1fr_340px] lg:gap-8">
        <div>
          <h2 className="title mb-3 text-[18px]">Vrij</h2>
          {off.length ? (
            <ul className="card divide-y divide-line px-5">
              {off.map((t) => (
                <li key={t.id} className="flex min-h-[60px] items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="tabular font-medium">{describeRange(t.startAt, t.endAt, s.timezone)}</p>
                    {t.note && <p className="text-[14px] text-muted">{t.note}</p>}
                  </div>
                  <form action={removeTimeOffAction.bind(null, t.id)}>
                    <button className="btn btn-secondary btn-sm">Verwijderen</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card px-5 py-8 text-center text-[14px] text-muted">
              Niets geblokkeerd. Voeg vakanties of avonden toe waarop je niet kunt.
            </div>
          )}
        </div>

        <ActionForm action={addTimeOffAction} resetOnSuccess className="card self-start p-5 lg:mt-[40px]">
          <h3 className="title text-[16px]">Tijd blokkeren</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label mb-1.5">Vanaf datum</span>
              <input type="date" name="from" required className="input" />
            </label>
            <label className="block">
              <span className="label mb-1.5">Tot en met <span className="font-normal text-faint">· opt.</span></span>
              <input type="date" name="to" className="input" />
            </label>
            <label className="block">
              <span className="label mb-1.5">
                Begintijd <span className="font-normal text-faint">· opt.</span>
              </span>
              <input type="time" name="fromTime" step={300} className="input" />
            </label>
            <label className="block">
              <span className="label mb-1.5">
                Eindtijd <span className="font-normal text-faint">· opt.</span>
              </span>
              <input type="time" name="toTime" step={300} className="input" />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="label mb-1.5">Notitie</span>
            <input name="note" placeholder="Vakantie, bruiloft…" maxLength={120} className="input" />
          </label>
          <p className="mt-3 text-[13px] leading-relaxed text-faint">
            Laat de tijden leeg om hele dagen te blokkeren. Bestaande afspraken blijven staan.
          </p>
          <Submit pendingLabel="Opslaan…" className="btn btn-primary mt-5 w-full">
            Blokkeren
          </Submit>
        </ActionForm>
      </section>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function describeRange(start: Date, end: Date, tz: string) {
  const startTime = formatTime(start, tz);
  const endTime = formatTime(end, tz);
  // An end of exactly midnight belongs to the previous day.
  const lastMoment = new Date(end.getTime() - 1);
  const startDay = formatDayShort(start, tz);
  const endDay = formatDayShort(lastMoment, tz);
  const wholeDays = startTime === "00:00" && endTime === "00:00";
  if (wholeDays) {
    return startDay === endDay ? `${capitalize(formatDayLong(start, tz))}, hele dag` : `${startDay} – ${endDay}`;
  }
  if (startDay === formatDayShort(end, tz)) return `${startDay}, ${startTime}–${endTime}`;
  return `${startDay} ${startTime} – ${formatDayShort(end, tz)} ${endTime}`;
}
