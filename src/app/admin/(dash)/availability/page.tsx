import { asc, gt } from "drizzle-orm";
import { db } from "@/db";
import { timeOff } from "@/db/schema";
import { ActionForm, Submit } from "@/components/ActionForm";
import { getSettings, getWeeklyHours, loadSlotInput } from "@/lib/data";
import { formatDayLong, formatDayShort, formatTime, relativeDay, WEEKDAY_ORDER, WEEKDAYS } from "@/lib/format";
import { generateSlots, minutesToTime } from "@/lib/slots";
import {
  addHoursAction,
  addTimeOffAction,
  removeHoursAction,
  removeTimeOffAction,
} from "../../actions";

export const metadata = { title: "Availability" };

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
        <h1 className="headline text-[34px] sm:text-[40px]">Availability</h1>
        <p className="mt-2 max-w-[580px] text-muted">
          Set your regular weekly hours, then block off exceptions. Friends see {s.durationMin}-minute
          slots with {s.bufferMin} minutes between them, from {s.minNoticeHours} hours ahead up to{" "}
          {s.windowDays} days out.
        </p>
        <div className="mt-5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[16px] bg-white px-4 py-3 text-[14px] ring-1 ring-line">
          <span className={`dot ${openSlots ? "" : "!bg-faint !shadow-none"}`} aria-hidden />
          <span className="tabular font-semibold">
            {openSlots} open {openSlots === 1 ? "slot" : "slots"}
          </span>
          <span className="text-muted">
            across {days.length} {days.length === 1 ? "day" : "days"}
            {first && (
              <>
                {" "}· next <span className="tabular font-medium text-ink">{relativeDay(first, s.timezone, now)} {formatTime(first, s.timezone)}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Weekly hours */}
      <section className="grid gap-5 lg:grid-cols-[1fr_340px] lg:gap-8">
        <div>
          <h2 className="title mb-3 text-[18px]">Weekly hours</h2>
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
                            aria-label={`Remove ${WEEKDAYS[wd]} ${minutesToTime(h.startMin)}–${minutesToTime(h.endMin)}`}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-white hover:text-danger"
                          >
                            <XIcon />
                          </button>
                        </form>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[14px] text-faint">Closed</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <ActionForm action={addHoursAction} resetOnSuccess className="card self-start p-5 lg:mt-[40px]">
          <h3 className="title text-[16px]">Add hours</h3>
          <fieldset className="mt-4">
            <legend className="label mb-2">Days</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_ORDER.map((wd) => (
                <label key={wd} className="cursor-pointer">
                  <input type="checkbox" name="weekday" value={wd} className="peer sr-only" />
                  <span className="tile grid h-11 place-items-center text-[13px] font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                    {WEEKDAYS[wd].slice(0, 2)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label mb-1.5">From</span>
              <input type="time" name="start" required defaultValue="10:00" step={300} className="input" />
            </label>
            <label className="block">
              <span className="label mb-1.5">To</span>
              <input type="time" name="end" required defaultValue="18:00" step={300} className="input" />
            </label>
          </div>
          <Submit pendingLabel="Adding…" className="btn btn-primary mt-5 w-full">
            Add hours
          </Submit>
        </ActionForm>
      </section>

      {/* Time off */}
      <section className="grid gap-5 lg:grid-cols-[1fr_340px] lg:gap-8">
        <div>
          <h2 className="title mb-3 text-[18px]">Time off</h2>
          {off.length ? (
            <ul className="card divide-y divide-line px-5">
              {off.map((t) => (
                <li key={t.id} className="flex min-h-[60px] items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="tabular font-medium">{describeRange(t.startAt, t.endAt, s.timezone)}</p>
                    {t.note && <p className="text-[14px] text-muted">{t.note}</p>}
                  </div>
                  <form action={removeTimeOffAction.bind(null, t.id)}>
                    <button className="btn btn-secondary btn-sm">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card px-5 py-8 text-center text-[14px] text-muted">
              Nothing blocked off. Add holidays or evenings you&rsquo;re unavailable.
            </div>
          )}
        </div>

        <ActionForm action={addTimeOffAction} resetOnSuccess className="card self-start p-5 lg:mt-[40px]">
          <h3 className="title text-[16px]">Block off time</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label mb-1.5">From date</span>
              <input type="date" name="from" required className="input" />
            </label>
            <label className="block">
              <span className="label mb-1.5">To date <span className="font-normal text-faint">· opt.</span></span>
              <input type="date" name="to" className="input" />
            </label>
            <label className="block">
              <span className="label mb-1.5">
                Start time <span className="font-normal text-faint">· opt.</span>
              </span>
              <input type="time" name="fromTime" step={300} className="input" />
            </label>
            <label className="block">
              <span className="label mb-1.5">
                End time <span className="font-normal text-faint">· opt.</span>
              </span>
              <input type="time" name="toTime" step={300} className="input" />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="label mb-1.5">Note</span>
            <input name="note" placeholder="Holiday, wedding…" maxLength={120} className="input" />
          </label>
          <p className="mt-3 text-[13px] leading-relaxed text-faint">
            Leave times empty to block whole days. Existing bookings stay as they are.
          </p>
          <Submit pendingLabel="Saving…" className="btn btn-primary mt-5 w-full">
            Block off
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
    return startDay === endDay ? `${formatDayLong(start, tz)}, all day` : `${startDay} – ${endDay}`;
  }
  if (startDay === formatDayShort(end, tz)) return `${startDay}, ${startTime}–${endTime}`;
  return `${startDay} ${startTime} – ${formatDayShort(end, tz)} ${endTime}`;
}
